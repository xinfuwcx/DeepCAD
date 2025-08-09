/**
 * 地质建模服务 - 2号专家的地质建模核心算法接口
 * 0号架构师实现
 */

import {
  Point3D,
  GeometryModel,
  RBFConfig,
  InterpolationResult,
  BoreholeData,
  QualityReport,
  InterpolationStats,
  BoreholeInfo,
  SoilLayer,
  QualityIssue
} from './GeometryArchitectureService';
import { geologyApiConfig } from '@/config/networkConfig';
import { GEO_REQ_CLASS_COLORS, AttemptDetail } from '@/config/geologyLogging';

// 构建请求哈希（与前端缓存/面板一致化）
function buildGeoRequestHash(payload: any): string {
  try {
    const stable = JSON.stringify(payload, Object.keys(payload).sort());
    let hash = 0, i, chr; for (i = 0; i < stable.length; i++){ chr = stable.charCodeAt(i); hash = ((hash << 5) - hash) + chr; hash |= 0; }
    return 'GEO'+Math.abs(hash).toString(36);
  } catch { return 'GEO000'; }
}

export class GeologyModelingService {
  private initialized = false;
  private rbfWorker?: Worker;
  private interpolationCache = new Map<string, InterpolationResult>();
  private apiBaseUrl = '/api/geology'; // API基础URL
  private activeControllers = new Set<AbortController>();
  public lastRequestMeta: { endpoint: string; attempts: number; timeoutMs: number; retries: number } | null = null;
  public requestLog: Array<{
    id: string;
    endpoint: string;
    method: string;
    status?: number;
    ok?: boolean;
    attempts: number;
    durationMs: number;
    error?: string;
    hash?: string;
    ts: number;
  classification?: string;
  attemptDetails?: AttemptDetail[];
  }> = [];

  constructor() {
    // 加载会话持久化日志（如果开启）
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('geoReqLogPersist') === '1') {
        const raw = sessionStorage.getItem('geoReqLogData');
        if (raw) {
          const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) this.requestLog = parsed;
        }
      }
    } catch {}
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🏔️ 地质建模服务初始化中...');
    
    // 初始化RBF插值Web Worker
    try {
      this.rbfWorker = new Worker(new URL('../workers/RBFInterpolationWorker.ts', import.meta.url));
      this.rbfWorker.onmessage = this.handleWorkerMessage.bind(this);
      this.rbfWorker.onerror = this.handleWorkerError.bind(this);
    } catch (error) {
      console.warn('RBF Worker初始化失败，使用主线程计算:', error);
    }

    this.initialized = true;
    console.log('✅ 地质建模服务初始化完成');
  }

  // ============== 核心RBF插值算法 ==============
  public async rbfInterpolation(
    points: Point3D[],
    values: number[],
    config: RBFConfig
  ): Promise<InterpolationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = this.generateCacheKey(points, values, config);
    const cached = this.interpolationCache.get(cacheKey);
    if (cached) {
      console.log('📦 使用缓存的RBF插值结果');
      return cached;
    }

    console.log(`🧮 开始RBF插值计算: ${points.length}个数据点`);

    if (this.rbfWorker) {
      return await this.performRBFWithWorker(points, values, config);
    } else {
      return await this.performRBFMainThread(points, values, config);
    }
  }

  private async performRBFWithWorker(
    points: Point3D[],
    values: number[],
    config: RBFConfig
  ): Promise<InterpolationResult> {
    return new Promise((resolve, reject) => {
      const taskId = `rbf_${Date.now()}`;
      
      const messageHandler = (event: MessageEvent) => {
        const { id, result, error } = event.data;
        if (id === taskId) {
          this.rbfWorker!.removeEventListener('message', messageHandler);
          if (error) {
            reject(new Error(error));
          } else {
            this.interpolationCache.set(this.generateCacheKey(points, values, config), result);
            resolve(result);
          }
        }
      };

      this.rbfWorker!.addEventListener('message', messageHandler);
      this.rbfWorker!.postMessage({
        id: taskId,
        task: 'rbf_interpolation',
        data: { points, values, config }
      });
    });
  }

  private async performRBFMainThread(
    points: Point3D[],
    values: number[],
    config: RBFConfig
  ): Promise<InterpolationResult> {
    // 主线程RBF插值实现
    const startTime = performance.now();
    
    // 1. 计算距离矩阵
    const n = points.length;
    const distanceMatrix = new Float32Array(n * n);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dz = points[i].z - points[j].z;
        distanceMatrix[i * n + j] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }

    // 2. 构建RBF核矩阵
    const kernelMatrix = this.buildKernelMatrix(distanceMatrix, config);
    
    // 3. 求解RBF系数
    const coefficients = await this.solveRBFSystem(kernelMatrix, values, config);
    
    // 4. 生成插值网格
    const gridResult = this.generateInterpolationGrid(points, coefficients, config);
    
    // 5. 计算统计信息
    const statistics = this.calculateInterpolationStats(gridResult.values);
    
    const endTime = performance.now();
    console.log(`⏱️ RBF插值计算完成: ${(endTime - startTime).toFixed(2)}ms`);

    const result: InterpolationResult = {
      gridPoints: gridResult.points,
      values: gridResult.values,
      confidence: gridResult.confidence,
      statistics
    };

    return result;
  }

  private buildKernelMatrix(distanceMatrix: Float32Array, config: RBFConfig): Float32Array {
    const n = Math.sqrt(distanceMatrix.length);
    const kernelMatrix = new Float32Array(n * n);
    
    for (let i = 0; i < n * n; i++) {
      const distance = distanceMatrix[i];
      kernelMatrix[i] = this.rbfKernel(distance, config.kernelType, config.kernelParameter);
    }
    
    // 添加平滑项到对角线
    for (let i = 0; i < n; i++) {
      kernelMatrix[i * n + i] += config.smoothingFactor;
    }
    
    return kernelMatrix;
  }

  private rbfKernel(distance: number, kernelType: RBFConfig['kernelType'], parameter: number): number {
    switch (kernelType) {
      case 'gaussian':
        return Math.exp(-((parameter * distance) ** 2));
      case 'multiquadric':
        return Math.sqrt(1 + (parameter * distance) ** 2);
      case 'thinPlateSpline':
        return distance === 0 ? 0 : distance * distance * Math.log(distance);
      case 'cubic':
        return distance ** 3;
      default:
        throw new Error(`Unsupported RBF kernel: ${kernelType}`);
    }
  }

  private async solveRBFSystem(
    kernelMatrix: Float32Array,
    values: number[],
    config: RBFConfig
  ): Promise<Float32Array> {
    // 使用高斯消元法求解线性系统 Ax = b
    const n = values.length;
    const matrix = new Float32Array(kernelMatrix);
    const b = new Float32Array(values);
    
    // 前向消元
    for (let i = 0; i < n; i++) {
      // 寻找主元
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(matrix[k * n + i]) > Math.abs(matrix[maxRow * n + i])) {
          maxRow = k;
        }
      }
      
      // 交换行
      if (maxRow !== i) {
        for (let k = 0; k < n; k++) {
          [matrix[i * n + k], matrix[maxRow * n + k]] = [matrix[maxRow * n + k], matrix[i * n + k]];
        }
        [b[i], b[maxRow]] = [b[maxRow], b[i]];
      }
      
      // 消元
      for (let k = i + 1; k < n; k++) {
        const factor = matrix[k * n + i] / matrix[i * n + i];
        for (let j = i; j < n; j++) {
          matrix[k * n + j] -= factor * matrix[i * n + j];
        }
        b[k] -= factor * b[i];
      }
    }
    
    // 回代
    const x = new Float32Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = b[i];
      for (let j = i + 1; j < n; j++) {
        x[i] -= matrix[i * n + j] * x[j];
      }
      x[i] /= matrix[i * n + i];
    }
    
    return x;
  }

  private generateInterpolationGrid(
    originalPoints: Point3D[],
    coefficients: Float32Array,
    config: RBFConfig
  ): { points: Point3D[], values: Float32Array, confidence: Float32Array } {
    // 计算边界框
    const bounds = this.calculateBounds(originalPoints);
    const resolution = config.gridResolution;
    
    const xStep = (bounds.max.x - bounds.min.x) / resolution;
    const yStep = (bounds.max.y - bounds.min.y) / resolution;
    const zStep = (bounds.max.z - bounds.min.z) / resolution;
    
    const gridPoints: Point3D[] = [];
    const values: number[] = [];
    const confidence: number[] = [];
    
    // 生成网格点并计算插值
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        for (let k = 0; k <= resolution; k++) {
          const point: Point3D = {
            x: bounds.min.x + i * xStep,
            y: bounds.min.y + j * yStep,
            z: bounds.min.z + k * zStep
          };
          
          let interpolatedValue = 0;
          let totalWeight = 0;
          
          // 计算插值值
          for (let p = 0; p < originalPoints.length; p++) {
            const distance = this.calculateDistance(point, originalPoints[p]);
            const weight = this.rbfKernel(distance, config.kernelType, config.kernelParameter);
            interpolatedValue += coefficients[p] * weight;
            totalWeight += weight;
          }
          
          // 计算置信度（基于到最近数据点的距离）
          const minDistance = Math.min(...originalPoints.map(p => this.calculateDistance(point, p)));
          const confidenceValue = Math.exp(-minDistance / (xStep + yStep + zStep));
          
          gridPoints.push(point);
          values.push(interpolatedValue);
          confidence.push(confidenceValue);
        }
      }
    }
    
    return {
      points: gridPoints,
      values: new Float32Array(values),
      confidence: new Float32Array(confidence)
    };
  }

  private calculateDistance(p1: Point3D, p2: Point3D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateBounds(points: Point3D[]): { min: Point3D, max: Point3D } {
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    
    for (const point of points) {
      min.x = Math.min(min.x, point.x);
      min.y = Math.min(min.y, point.y);
      min.z = Math.min(min.z, point.z);
      max.x = Math.max(max.x, point.x);
      max.y = Math.max(max.y, point.y);
      max.z = Math.max(max.z, point.z);
    }
    
    return { min, max };
  }

  private calculateInterpolationStats(values: Float32Array): InterpolationStats {
    const n = values.length;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < n; i++) {
      sum += values[i];
      min = Math.min(min, values[i]);
      max = Math.max(max, values[i]);
    }
    
    const mean = sum / n;
    
    let variance = 0;
    for (let i = 0; i < n; i++) {
      variance += (values[i] - mean) ** 2;
    }
    const stdDev = Math.sqrt(variance / n);
    
    // 简化的RMSE计算
    const rmse = stdDev; // 在没有验证数据时，使用标准差作为RMSE的近似
    
    return {
      meanValue: mean,
      stdDev,
      minValue: min,
      maxValue: max,
      rmse
    };
  }

  // ============== 钻孔数据解析 ==============
  public async parseBoreholeData(file: File): Promise<BoreholeData> {
    console.log(`📖 解析钻孔数据文件: ${file.name}`);
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'json':
        return await this.parseJSONBoreholeData(file);
      case 'csv':
        return await this.parseCSVBoreholeData(file);
      case 'xlsx':
      case 'xls':
        return await this.parseExcelBoreholeData(file);
      default:
        throw new Error(`不支持的钻孔数据格式: ${extension}`);
    }
  }

  private async parseJSONBoreholeData(file: File): Promise<BoreholeData> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // 验证数据格式
    this.validateBoreholeDataFormat(data);
    
    return data as BoreholeData;
  }

  private async parseCSVBoreholeData(file: File): Promise<BoreholeData> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV文件格式错误：至少需要标题行和一行数据');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const holes: BoreholeInfo[] = [];
    
    // 按钻孔分组解析数据
    const holeGroups = new Map<string, any[]>();
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      if (!holeGroups.has(row.holeId)) {
        holeGroups.set(row.holeId, []);
      }
      holeGroups.get(row.holeId)!.push(row);
    }
    
    // 转换为BoreholeInfo格式
    for (const [holeId, rows] of holeGroups) {
      const firstRow = rows[0];
      const layers: SoilLayer[] = rows.map(row => ({
        topDepth: parseFloat(row.topDepth),
        bottomDepth: parseFloat(row.bottomDepth),
        soilType: row.soilType,
        properties: {
          density: parseFloat(row.density) || 1800,
          cohesion: parseFloat(row.cohesion) || 10,
          frictionAngle: parseFloat(row.frictionAngle) || 20,
          elasticModulus: parseFloat(row.elasticModulus) || 20000,
          poissonRatio: parseFloat(row.poissonRatio) || 0.3,
          permeability: parseFloat(row.permeability) || 1e-6
        }
      }));
      
      holes.push({
        id: holeId,
        name: firstRow.holeName || holeId,
        location: {
          x: parseFloat(firstRow.x),
          y: parseFloat(firstRow.y),
          z: parseFloat(firstRow.z) || 0
        },
        depth: Math.max(...layers.map(l => l.bottomDepth)),
        layers,
        waterLevel: firstRow.waterLevel ? parseFloat(firstRow.waterLevel) : undefined
      });
    }
    
    return {
      holes,
      metadata: {
        project: 'CSV导入项目',
        coordinate: 'WGS84',
        elevation: 'relative'
      }
    };
  }

  private async parseExcelBoreholeData(file: File): Promise<BoreholeData> {
    // Excel解析需要引入xlsx库
    throw new Error('Excel格式解析需要安装xlsx库，请使用CSV或JSON格式');
  }

  private validateBoreholeDataFormat(data: any): void {
    if (!data.holes || !Array.isArray(data.holes)) {
      throw new Error('钻孔数据格式错误：缺少holes数组');
    }
    
    for (const hole of data.holes) {
      if (!hole.id || !hole.location || !hole.layers) {
        throw new Error(`钻孔数据格式错误：钻孔 ${hole.id || '未知'} 缺少必要字段`);
      }
    }
  }

  // ============== 地质体积重建 ==============
  public async reconstructGeologyVolume(interpolationResult: InterpolationResult): Promise<GeometryModel> {
    console.log('🏗️ 重建地质体积模型...');
    
    const startTime = performance.now();
    
    // 使用Marching Cubes算法生成网格
    const meshData = await this.marchingCubes(interpolationResult);
    
    // 计算质量指标
    const quality = this.calculateGeometryQuality(meshData);
    
    const endTime = performance.now();
    console.log(`⏱️ 地质体积重建完成: ${(endTime - startTime).toFixed(2)}ms`);
    
    const model: GeometryModel = {
      id: '', // 将由架构服务分配
      type: 'geology',
      vertices: meshData.vertices,
      faces: meshData.faces,
      metadata: {
        createdAt: new Date(),
        createdBy: 'GeologyModelingService',
        version: '1.0.0',
        source: 'rbf_interpolation',
        parameters: {
          interpolationPoints: interpolationResult.gridPoints.length,
          triangles: meshData.faces.length / 3
        }
      },
      quality
    };
    
    return model;
  }

  private async marchingCubes(interpolationResult: InterpolationResult): Promise<{
    vertices: Float32Array,
    faces: Uint32Array
  }> {
    // 简化的Marching Cubes实现
    // 实际项目中应该使用专业的Marching Cubes库
    
    const vertices: number[] = [];
    const faces: number[] = [];
    let vertexIndex = 0;
    
    // 基于插值结果生成三角面片
    for (let i = 0; i < interpolationResult.gridPoints.length - 1; i++) {
      const point = interpolationResult.gridPoints[i];
      const value = interpolationResult.values[i];
      
      // 简单的等值面提取（实际应该使用专业算法）
      if (value > 0.5) { // 阈值
        // 添加顶点
        vertices.push(point.x, point.y, point.z);
        
        // 每4个顶点构成两个三角形
        if (vertexIndex >= 3 && vertexIndex % 4 === 3) {
          const base = vertexIndex - 3;
          // 第一个三角形
          faces.push(base, base + 1, base + 2);
          // 第二个三角形
          faces.push(base, base + 2, base + 3);
        }
        
        vertexIndex++;
      }
    }
    
    return {
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces)
    };
  }

  private calculateGeometryQuality(meshData: {
    vertices: Float32Array,
    faces: Uint32Array
  }): any {
    const triangleCount = meshData.faces.length / 3;
    const vertexCount = meshData.vertices.length / 3;
    
    // 计算边界框
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < meshData.vertices.length; i += 3) {
      minX = Math.min(minX, meshData.vertices[i]);
      minY = Math.min(minY, meshData.vertices[i + 1]);
      minZ = Math.min(minZ, meshData.vertices[i + 2]);
      maxX = Math.max(maxX, meshData.vertices[i]);
      maxY = Math.max(maxY, meshData.vertices[i + 1]);
      maxZ = Math.max(maxZ, meshData.vertices[i + 2]);
    }
    
    const boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
    
    const volume = (maxX - minX) * (maxY - minY) * (maxZ - minZ);
    const surfaceArea = triangleCount * 0.5; // 简化计算
    
    return {
      triangleCount,
      vertexCount,
      boundingBox,
      volume,
      surfaceArea,
      meshReadiness: 0.8 // 初始评分
    };
  }

  // ============== 质量验证 ==============
  public async validateGeologyQuality(model: GeometryModel): Promise<QualityReport> {
    console.log('🔍 验证地质模型质量...');
    
    const issues: QualityIssue[] = [];
    let score = 100;
    
    // 检查顶点数量
    if (model.quality.vertexCount < 100) {
      issues.push({
        severity: 'major',
        type: 'low_resolution',
        description: '模型分辨率过低，顶点数量不足',
        suggestedFix: '增加插值网格分辨率',
        affectedElements: []
      });
      score -= 20;
    }
    
    // 检查三角形质量
    if (model.quality.triangleCount === 0) {
      issues.push({
        severity: 'critical',
        type: 'no_geometry',
        description: '模型不包含任何几何体',
        suggestedFix: '检查插值参数和数据质量',
        affectedElements: []
      });
      score -= 50;
    }
    
    // 检查体积合理性
    if (model.quality.volume <= 0) {
      issues.push({
        severity: 'critical',
        type: 'invalid_volume',
        description: '模型体积为零或负值',
        suggestedFix: '检查边界条件和插值算法',
        affectedElements: []
      });
      score -= 30;
    }
    
    const overall = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'acceptable' : 'poor';
    
    return {
      overall,
      score,
      issues,
      recommendations: [
        '建议使用更多钻孔数据提高模型精度',
        '考虑调整RBF插值参数优化结果',
        '添加地质约束条件改善模型合理性'
      ]
    };
  }

  // ============== 公共创建接口 ==============
  public async createGeologyModel(boreholeData: BoreholeData, config: RBFConfig): Promise<GeometryModel> {
    // 提取插值点和值
    const points: Point3D[] = [];
    const values: number[] = [];
    
    for (const hole of boreholeData.holes) {
      for (const layer of hole.layers) {
        // 在层的中点进行插值
        const midDepth = (layer.topDepth + layer.bottomDepth) / 2;
        points.push({
          x: hole.location.x,
          y: hole.location.y,
          z: hole.location.z - midDepth // 深度为负值
        });
        
        // 使用土体密度作为插值值
        values.push(layer.properties.density);
      }
    }
    
    // 执行RBF插值
    const interpolationResult = await this.rbfInterpolation(points, values, config);
    
    // 重建几何体
    return await this.reconstructGeologyVolume(interpolationResult);
  }

  // ============== 工具方法 ==============
  private generateCacheKey(points: Point3D[], values: number[], config: RBFConfig): string {
    const pointsHash = points.map(p => `${p.x},${p.y},${p.z}`).join('|');
    const valuesHash = values.join(',');
    const configHash = JSON.stringify(config);
    return btoa(`${pointsHash}:${valuesHash}:${configHash}`);
  }

  private handleWorkerMessage(event: MessageEvent): void {
    console.log('📨 收到RBF Worker消息:', event.data);
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('❌ RBF Worker错误:', error);
  }

  private inferBoundsFromHoles(boreholeData: BoreholeData){
    const xs: number[] = []; const ys: number[] = []; const zs: number[] = [];
    boreholeData.holes.forEach(h=>{ xs.push(h.location.x); ys.push(h.location.y); zs.push(h.location.z - (h.depth||0)); zs.push(h.location.z); });
    const min = (arr:number[])=> arr.length? Math.min(...arr): -50;
    const max = (arr:number[])=> arr.length? Math.max(...arr): 50;
    const pad = 0.1;
    const expand = (lo:number, hi:number)=>{ const r=hi-lo; return { lo: lo - r*pad, hi: hi + r*pad }; };
    const xr=expand(min(xs), max(xs)); const yr=expand(min(ys), max(ys)); const zr=expand(min(zs), max(zs));
    return { x_min: xr.lo, x_max: xr.hi, y_min: yr.lo, y_max: yr.hi, z_min: zr.lo, z_max: zr.hi };
  }

  private normalizeGemPyResponse(raw: any){
    if(!raw || typeof raw !== 'object') return { raw, stats:null };
    const stats = {
      vertexCount: raw?.model_stats?.vertex_count ?? raw?.model_stats?.vertices ?? 0,
      triangleCount: raw?.model_stats?.triangle_count ?? raw?.model_stats?.triangles ?? 0,
      processingTime: raw?.processing_time ?? raw?.performance_metrics?.processing_time ?? 0,
      objects: raw?.threejs_data ? Object.keys(raw.threejs_data).length : (raw?.display_chain?.threejs_objects_count ?? 0),
      bounds: raw?.model_stats?.bounds || raw?.bounds || null,
      method: raw?.method,
      success: !!raw?.success
    };
    return { raw, stats };
  }

  // 带超时与重试的封装
  private async fetchWithTimeoutRetry(url: string, init: RequestInit, meta?: { hash?: string }): Promise<Response> {
    const timeoutMs = geologyApiConfig.timeoutMs;
    const retries = geologyApiConfig.retries;
    const retryDelayMs = geologyApiConfig.retryDelayMs;
    let attempt = 0; let lastErr: any=null;
    const start = performance.now();
    const id = 'REQ_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const attemptDetails: AttemptDetail[] = [];
    while (attempt <= retries) {
      const controller = new AbortController();
      this.activeControllers.add(controller);
      const timer = setTimeout(()=> controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timer); this.activeControllers.delete(controller);
        if (!resp.ok && (resp.status >=500 || resp.status===429)) throw new Error(`Retryable HTTP ${resp.status}`);
        this.lastRequestMeta = { endpoint: url, attempts: attempt+1, timeoutMs, retries };
  this.requestLog.unshift({ id, endpoint: url, method: init.method||'GET', status: resp.status, ok: resp.ok, attempts: attempt+1, durationMs: performance.now()-start, hash: meta?.hash, ts: Date.now(), classification: 'success', attemptDetails });
  try { if (typeof sessionStorage!=='undefined' && sessionStorage.getItem('geoReqLogPersist')==='1') sessionStorage.setItem('geoReqLogData', JSON.stringify(this.requestLog)); } catch {}
        if (this.requestLog.length > 200) this.requestLog.length = 200; // cap size
        return resp;
      } catch(err:any){
        clearTimeout(timer); this.activeControllers.delete(controller);
        lastErr = err;
        const msg = String(err?.message||err);
    attemptDetails.push({ attempt: attempt+1, error: msg, attemptAt: Date.now() });
        const retryable = err?.name==='AbortError' || /Retryable HTTP/.test(msg) || msg.includes('NetworkError') || msg.includes('Failed to fetch');
        if (attempt === retries || !retryable) break;
    const backoff = retryDelayMs * Math.pow(2, attempt);
    attemptDetails[attemptDetails.length-1].backoffMs = backoff;
        await new Promise(r=>setTimeout(r, backoff));
        attempt++;
      }
    }
    this.lastRequestMeta = { endpoint: url, attempts: retries+1, timeoutMs, retries };
    const classification = this.classifyError(lastErr);
  this.requestLog.unshift({ id, endpoint: url, method: init.method||'GET', attempts: retries+1, durationMs: performance.now()-start, error: String(lastErr?.message||lastErr), hash: meta?.hash, ts: Date.now(), classification, attemptDetails });
  try { if (typeof sessionStorage!=='undefined' && sessionStorage.getItem('geoReqLogPersist')==='1') sessionStorage.setItem('geoReqLogData', JSON.stringify(this.requestLog)); } catch {}
    if (this.requestLog.length > 200) this.requestLog.length = 200;
    throw lastErr || new Error('Unknown fetch error');
  }

  private classifyError(err:any): string {
    if (!err) return 'unknown';
    const msg = String(err.message||err).toLowerCase();
    if (msg.includes('abort') || msg.includes('timeout')) return 'timeout';
    if (msg.includes('429')) return 'throttle';
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) return 'server';
    if (msg.includes('network') || msg.includes('failed to fetch')) return 'network';
    if (msg.includes('422') || msg.includes('validation')) return 'validation';
    if (msg.includes('401') || msg.includes('403')) return 'auth';
    return 'other';
  }

  public cancelActiveRequests(){
    this.activeControllers.forEach(c=> c.abort());
    this.activeControllers.clear();
  }

  // ============== 新增：GemPy完整显示链路API调用（扩展参数） ==============
  public async createGemPyModel(
    boreholeData: BoreholeData,
    options: {
      resolutionX: number; resolutionY: number; resolutionZ: number;
      interpolationMethod: string; faultSmoothing: number; enableFaults?: boolean;
      gravityModel?: boolean; magneticModel?: boolean;
      unevenDataConfig?: { denseRegionRadius: number; sparseRegionThreshold: number; adaptiveBlending: boolean };
      manualDomain?: { xMin:number; xMax:number; yMin:number; yMax:number; zMin:number; zMax:number } | null;
      topBoundary?: string; bottomBoundary?: string; groundwater?: boolean;
    }
  ): Promise<{ raw:any; stats:any; requestHash:string; success:boolean }> {
    console.log('🚀 调用GemPy完整显示链路API...');
    
    try {
      const bounds = options.manualDomain ? {
        x_min: options.manualDomain.xMin, x_max: options.manualDomain.xMax,
        y_min: options.manualDomain.yMin, y_max: options.manualDomain.yMax,
        z_min: options.manualDomain.zMin, z_max: options.manualDomain.zMax
      }: this.inferBoundsFromHoles(boreholeData);

      // 完整层级数据
      const borehole_data = boreholeData.holes.map(hole => ({
        id: hole.id,
        x: hole.location.x,
        y: hole.location.y,
        z: hole.location.z,
        depth: hole.depth,
        waterLevel: hole.waterLevel,
        layers: hole.layers.map((layer:any)=>({
          top: layer.topDepth ?? layer.top ?? 0,
          bottom: layer.bottomDepth ?? layer.bottom ?? 0,
            soil_type: layer.soilType || layer.name || 'unknown',
            properties: layer.properties || {}
        }))
      }));

      const formations = boreholeData.holes.reduce((acc, hole) => {
        hole.layers.forEach(layer => { if(layer.soilType) acc[layer.soilType]=layer.soilType; });
        return acc;
      }, {} as Record<string,string>);

      const requestPayload = {
        borehole_data,
        domain: {
          mode: options.manualDomain ? 'manual':'auto',
          bounds,
          resolution: [options.resolutionX, options.resolutionY, options.resolutionZ]
        },
        formations,
        options: {
          method: options.interpolationMethod,
          resolution_x: options.resolutionX,
          resolution_y: options.resolutionY,
          resolution_z: options.resolutionZ,
          alpha: options.faultSmoothing,
          enable_faults: options.enableFaults ?? false,
          physics: { gravity: !!options.gravityModel, magnetic: !!options.magneticModel },
          uneven: options.unevenDataConfig ? {
            dense_radius: options.unevenDataConfig.denseRegionRadius,
            sparse_threshold: options.unevenDataConfig.sparseRegionThreshold,
            adaptive_blending: options.unevenDataConfig.adaptiveBlending
          }: undefined,
          boundary: {
            top: options.topBoundary || 'free',
            bottom: options.bottomBoundary || 'fixed',
            groundwater: !!options.groundwater
          }
        }
      };
      const requestHash = buildGeoRequestHash(requestPayload);
      (requestPayload as any).request_hash = requestHash;

      console.log('📦 请求数据:', requestPayload);

      // 调用后端GemPy API
      const response = await this.fetchWithTimeoutRetry(`${this.apiBaseUrl}/gempy-modeling`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload)
      }, { hash: requestHash });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData.detail || ''}`);
      }

  const result = await response.json();
  console.log('✅ GemPy API响应:', result);
  const normalized = this.normalizeGemPyResponse(result);
  return { ...normalized, requestHash, success: normalized.stats?.success };

    } catch (error) {
      console.error('❌ GemPy API调用失败:', error);
      throw error;
    }
  }

  // ============== GemPy直接到Three.js显示链路 ==============
  public async createGemPyDirectModel(
    boreholeData: BoreholeData,
    options: {
      resolutionX: number; resolutionY: number; resolutionZ: number;
      interpolationMethod: string; faultSmoothing: number; enableFaults?: boolean;
      gravityModel?: boolean; magneticModel?: boolean;
      unevenDataConfig?: { denseRegionRadius: number; sparseRegionThreshold: number; adaptiveBlending: boolean };
      manualDomain?: { xMin:number; xMax:number; yMin:number; yMax:number; zMin:number; zMax:number } | null;
      topBoundary?: string; bottomBoundary?: string; groundwater?: boolean;
    }
  ): Promise<{ raw:any; stats:any; requestHash:string; success:boolean }> {
    console.log('⚡ 调用GemPy → Three.js 直接显示链路API...');
    
    try {
      const bounds = options.manualDomain ? {
        x_min: options.manualDomain.xMin, x_max: options.manualDomain.xMax,
        y_min: options.manualDomain.yMin, y_max: options.manualDomain.yMax,
        z_min: options.manualDomain.zMin, z_max: options.manualDomain.zMax
      }: this.inferBoundsFromHoles(boreholeData);
      const borehole_data = boreholeData.holes.map(hole => ({
        id: hole.id,
        x: hole.location.x,
        y: hole.location.y,
        z: hole.location.z,
        depth: hole.depth,
        waterLevel: hole.waterLevel,
        layers: hole.layers.map((layer:any)=>({
          top: layer.topDepth ?? layer.top ?? 0,
          bottom: layer.bottomDepth ?? layer.bottom ?? 0,
          soil_type: layer.soilType || layer.name || 'unknown',
          properties: layer.properties || {}
        }))
      }));
      const formations = boreholeData.holes.reduce((acc, hole) => { hole.layers.forEach(layer => { if(layer.soilType) acc[layer.soilType]=layer.soilType; }); return acc; }, {} as Record<string,string>);
      const requestPayload = {
        borehole_data,
        domain: { mode: options.manualDomain? 'manual':'auto', bounds, resolution:[options.resolutionX, options.resolutionY, options.resolutionZ] },
        formations,
        options: {
          method: options.interpolationMethod,
          resolution_x: options.resolutionX, resolution_y: options.resolutionY, resolution_z: options.resolutionZ,
          alpha: options.faultSmoothing,
          enable_faults: options.enableFaults ?? false,
          physics: { gravity: !!options.gravityModel, magnetic: !!options.magneticModel },
          uneven: options.unevenDataConfig ? {
            dense_radius: options.unevenDataConfig.denseRegionRadius,
            sparse_threshold: options.unevenDataConfig.sparseRegionThreshold,
            adaptive_blending: options.unevenDataConfig.adaptiveBlending
          }: undefined,
          boundary: {
            top: options.topBoundary || 'free',
            bottom: options.bottomBoundary || 'fixed',
            groundwater: !!options.groundwater
          }
        }
      };
      const requestHash = buildGeoRequestHash(requestPayload);
      (requestPayload as any).request_hash = requestHash;

      console.log('📦 直接显示链路请求数据:', requestPayload);

      // 调用GemPy直接显示链路API
      const response = await this.fetchWithTimeoutRetry(`${this.apiBaseUrl}/gempy-direct`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload)
      }, { hash: requestHash });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`直接显示链路API调用失败: ${response.status} ${response.statusText} - ${errorData.detail || ''}`);
      }

  const result = await response.json();
  console.log('⚡ GemPy直接显示链路API响应:', result);
  const normalized = this.normalizeGemPyResponse(result);
  return { ...normalized, requestHash, success: normalized.stats?.success };

    } catch (error) {
      console.error('❌ GemPy直接显示链路API调用失败:', error);
      throw error;
    }
  }

  // ============== 工具方法 ==============
  public async dispose(): Promise<void> {
    if (this.rbfWorker) {
      this.rbfWorker.terminate();
      this.rbfWorker = undefined;
    }
    this.interpolationCache.clear();
    this.initialized = false;
  }
}

export default GeologyModelingService;