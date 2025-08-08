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

export class GeologyModelingService {
  private initialized = false;
  private rbfWorker?: Worker;
  private interpolationCache = new Map<string, InterpolationResult>();
  private apiBaseUrl = '/api/geology'; // API基础URL

  constructor() {}

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
        suggestedFix: '增加插值网格分辨率'
      });
      score -= 20;
    }
    
    // 检查三角形质量
    if (model.quality.triangleCount === 0) {
      issues.push({
        severity: 'critical',
        type: 'no_geometry',
        description: '模型不包含任何几何体',
        suggestedFix: '检查插值参数和数据质量'
      });
      score -= 50;
    }
    
    // 检查体积合理性
    if (model.quality.volume <= 0) {
      issues.push({
        severity: 'critical',
        type: 'invalid_volume',
        description: '模型体积为零或负值',
        suggestedFix: '检查边界条件和插值算法'
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

  // ============== 新增：GemPy完整显示链路API调用 ==============
  public async createGemPyModel(
    boreholeData: BoreholeData,
    options: {
      resolutionX: number;
      resolutionY: number;
      interpolationMethod: string;
      faultSmoothing: number;
    }
  ): Promise<{
    success: boolean;
    method: string;
    display_chain: any;
    threejs_data: any;
    native_visualization: any;
    model_stats: any;
    model_id: string;
  }> {
    console.log('🚀 调用GemPy完整显示链路API...');
    
    try {
      // 转换数据格式为API期望的格式
      const requestPayload = {
        borehole_data: boreholeData.holes.map(hole => ({
          x: hole.location.x,
          y: hole.location.y,  
          z: hole.location.z,
          formation: hole.layers[0]?.soilType || 'unknown',
          properties: hole.layers[0]?.properties || {}
        })),
        domain: {
          // 兼容后端参数名，发送 domain(bounds/resolution)
          bounds: this.inferBoundsFromHoles(boreholeData),
          resolution: [options.resolutionX, options.resolutionY, Math.max(10, Math.round(options.resolutionY/2))]
        },
        formations: {
          // 从钻孔数据中提取地层映射
          ...boreholeData.holes.reduce((acc, hole) => {
            hole.layers.forEach(layer => {
              if (layer.soilType) {
                acc[layer.soilType] = layer.soilType;
              }
            });
            return acc;
          }, {} as Record<string, string>)
        },
        options: {
          resolution_x: options.resolutionX,
          resolution_y: options.resolutionY,
          alpha: options.faultSmoothing
        }
      };

      console.log('📦 请求数据:', requestPayload);

      // 调用后端GemPy API
      const response = await fetch(`${this.apiBaseUrl}/gempy-modeling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API调用失败: ${response.status} ${response.statusText} - ${errorData.detail || ''}`);
      }

      const result = await response.json();
      console.log('✅ GemPy API响应:', result);

      return result;

    } catch (error) {
      console.error('❌ GemPy API调用失败:', error);
      throw error;
    }
  }

  // ============== GemPy直接到Three.js显示链路 ==============
  public async createGemPyDirectModel(
    boreholeData: BoreholeData,
    options: {
      resolutionX: number;
      resolutionY: number;
      interpolationMethod: string;
      faultSmoothing: number;
    }
  ): Promise<{
    success: boolean;
    method: string;
    conversion_method: string;
    performance_metrics: any;
    threejs_data: any;
    model_stats: any;
    model_id: string;
  }> {
    console.log('⚡ 调用GemPy → Three.js 直接显示链路API...');
    
    try {
      // 转换数据格式为API期望的格式
      const requestPayload = {
        borehole_data: boreholeData.holes.map(hole => ({
          x: hole.location.x,
          y: hole.location.y,  
          z: hole.location.z,
          formation: hole.layers[0]?.soilType || 'unknown',
          properties: hole.layers[0]?.properties || {}
        })),
        formations: {
          // 从钻孔数据中提取地层映射
          ...boreholeData.holes.reduce((acc, hole) => {
            hole.layers.forEach(layer => {
              if (layer.soilType) {
                acc[layer.soilType] = layer.soilType;
              }
            });
            return acc;
          }, {} as Record<string, string>)
        },
        options: {
          resolution_x: options.resolutionX,
          resolution_y: options.resolutionY,
          alpha: options.faultSmoothing
        }
      };

      console.log('📦 直接显示链路请求数据:', requestPayload);

      // 调用GemPy直接显示链路API
      const response = await fetch(`${this.apiBaseUrl}/gempy-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`直接显示链路API调用失败: ${response.status} ${response.statusText} - ${errorData.detail || ''}`);
      }

      const result = await response.json();
      console.log('⚡ GemPy直接显示链路API响应:', result);

      return result;

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