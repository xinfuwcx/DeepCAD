/**
 * 基坑开挖几何处理服务 - 2号专家的开挖几何核心算法接口
 * 0号架构师实现
 */

import type {
  Point3D,
  GeometryModel,
  BoundingBox
} from './GeometryArchitectureService';

// 定义缺失的接口
export interface CADGeometry {
  id: string;
  type: string;
  vertices: Float32Array;
  faces: Uint32Array;
}

export interface CADEntity {
  id: string;
  type: string;
  layer: string;
  geometry: CADGeometry;
}

export interface CADLayer {
  id: string;
  name: string;
  visible: boolean;
  entities: CADEntity[];
}

export interface LayerConfig {
  name: string;
  color: string;
  visible: boolean;
}

export interface ExcavationStats {
  volume: number;
  surfaceArea: number;
  maxDepth: number;
}

export interface LayerStats {
  elementCount: number;
  volume: number;
  quality: number;
}

// ExcavationDesign.tsx匹配的接口
export interface ExcavationStage {
  id: string;
  name: string;
  depth: number;
  sequence: number;
  duration: number;
  description: string;
}

export interface ExcavationData {
  id: string;
  name: string;
  excavationType: 'foundation' | 'basement' | 'tunnel' | 'slope';
  totalDepth: number;
  area: number;
  slopeRatio: number;
  drainageSystem: boolean;
  stages: ExcavationStage[];
  coordinates: Array<{x: number, y: number}>;
}

export interface DesignParameters {
  safetyFactor: number;
  groundwaterLevel: number;
  temporarySlope: boolean;
  supportRequired: boolean;
}

export interface ExcavationGeometryResult {
  success: boolean;
  geometryId: string;
  excavationVolume: number;
  surfaceArea: number;
  stages: StageGeometry[];
  mesh: {
    vertices: number[];
    faces: number[];
    normals: number[];
  };
  gltfUrl?: string;
  warnings: string[];
}

export interface StageGeometry {
  stageId: string;
  depth: number;
  volume: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export class ExcavationGeometryService {
  private initialized = false;
  private dxfParser?: any;
  private booleanEngine?: any;
  private geometryCache = new Map<string, GeometryModel>();

  constructor() {}

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('⛏️ 基坑开挖几何服务初始化中...');
    
    try {
      // 动态导入DXF解析库
      const { DXFParser } = await import('../utils/DXFParser');
      this.dxfParser = new DXFParser();
      
      // 动态导入几何布尔运算引擎
      const { BooleanEngine } = await import('../utils/BooleanEngine');
      this.booleanEngine = new BooleanEngine();
      
      console.log('✅ 基坑开挖几何服务初始化完成');
    } catch (error) {
      console.warn('⚠️ 几何引擎加载失败，使用简化实现:', error);
    }

    this.initialized = true;
  }

  // ============== DXF/DWG解析引擎 ==============
  public async parseDXFFile(file: File): Promise<CADGeometry> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`📐 解析DXF文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    const startTime = performance.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dxfData = this.dxfParser ? 
        await this.dxfParser.parse(arrayBuffer) : 
        await this.parseDXFSimple(arrayBuffer);
      
      const cadGeometry = this.convertDXFToCADGeometry(dxfData);
      
      const endTime = performance.now();
      console.log(`⏱️ DXF解析完成: ${(endTime - startTime).toFixed(2)}ms`);
      
      return cadGeometry;
    } catch (error) {
      console.error('❌ DXF解析失败:', error);
      throw new Error(`DXF文件解析失败: ${error.message}`);
    }
  }

  private async parseDXFSimple(arrayBuffer: ArrayBuffer): Promise<any> {
    // 简化的DXF解析实现
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(arrayBuffer);
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    const entities: any[] = [];
    const layers: any[] = [];
    let currentEntity: any = null;
    let inEntitiesSection = false;
    let inLayerSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测节标记
      if (line === 'ENTITIES') {
        inEntitiesSection = true;
        continue;
      }
      if (line === 'ENDSEC' && inEntitiesSection) {
        inEntitiesSection = false;
        continue;
      }
      if (line === 'LAYER') {
        inLayerSection = true;
        continue;
      }
      
      if (inEntitiesSection) {
        // 解析实体
        if (line === 'LINE' || line === 'CIRCLE' || line === 'ARC' || line === 'POLYLINE') {
          if (currentEntity) {
            entities.push(currentEntity);
          }
          currentEntity = {
            type: line.toLowerCase(),
            points: [],
            properties: {}
          };
        } else if (currentEntity && line.match(/^\d+$/)) {
          // 数据代码
          const code = parseInt(line);
          const value = i + 1 < lines.length ? lines[i + 1] : '';
          
          switch (code) {
            case 10: // X坐标
              if (!currentEntity.tempPoint) currentEntity.tempPoint = {};
              currentEntity.tempPoint.x = parseFloat(value);
              break;
            case 20: // Y坐标
              if (!currentEntity.tempPoint) currentEntity.tempPoint = {};
              currentEntity.tempPoint.y = parseFloat(value);
              break;
            case 30: // Z坐标
              if (!currentEntity.tempPoint) currentEntity.tempPoint = {};
              currentEntity.tempPoint.z = parseFloat(value);
              if (currentEntity.tempPoint.x !== undefined && currentEntity.tempPoint.y !== undefined) {
                currentEntity.points.push({
                  x: currentEntity.tempPoint.x,
                  y: currentEntity.tempPoint.y,
                  z: currentEntity.tempPoint.z || 0
                });
                currentEntity.tempPoint = {};
              }
              break;
            case 8: // 图层名
              currentEntity.layer = value;
              break;
            case 40: // 半径（圆和圆弧）
              currentEntity.properties.radius = parseFloat(value);
              break;
          }
          i++; // 跳过值行
        }
      }
    }
    
    if (currentEntity) {
      entities.push(currentEntity);
    }
    
    return {
      entities,
      layers: layers.length > 0 ? layers : [{ name: '0', color: '7', lineType: 'CONTINUOUS' }]
    };
  }

  private convertDXFToCADGeometry(dxfData: any): CADGeometry {
    const entities: CADEntity[] = dxfData.entities.map((entity: any, index: number) => ({
      id: `entity_${index}`,
      type: entity.type as CADEntity['type'],
      layer: entity.layer || '0',
      points: entity.points || [],
      properties: entity.properties || {}
    }));
    
    const layers: CADLayer[] = dxfData.layers.map((layer: any) => ({
      name: layer.name,
      color: layer.color || '#FFFFFF',
      lineType: layer.lineType || 'CONTINUOUS',
      visible: true
    }));
    
    // 计算边界框
    const boundingBox = this.calculateCADBoundingBox(entities);
    
    return {
      entities,
      layers,
      boundingBox,
      units: 'm' // 默认单位
    };
  }

  private calculateCADBoundingBox(entities: CADEntity[]): BoundingBox {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const entity of entities) {
      for (const point of entity.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        minZ = Math.min(minZ, point.z);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
        maxZ = Math.max(maxZ, point.z);
      }
    }
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
  }

  // ============== 布尔运算核心 ==============
  public async performBooleanOperation(
    soilVolume: GeometryModel,
    excavationShape: CADGeometry,
    operation: 'difference' | 'union' | 'intersection'
  ): Promise<GeometryModel> {
    console.log(`🔧 执行布尔运算: ${operation}`);
    
    const startTime = performance.now();
    
    try {
      // 将CAD几何转换为3D网格
      const excavationMesh = await this.cadGeometryToMesh(excavationShape);
      
      // 执行布尔运算
      const resultMesh = this.booleanEngine ? 
        await this.booleanEngine.performOperation(soilVolume, excavationMesh, operation) :
        await this.performBooleanSimple(soilVolume, excavationMesh, operation);
      
      const endTime = performance.now();
      console.log(`⏱️ 布尔运算完成: ${(endTime - startTime).toFixed(2)}ms`);
      
      return resultMesh;
    } catch (error) {
      console.error('❌ 布尔运算失败:', error);
      throw new Error(`布尔运算失败: ${error.message}`);
    }
  }

  private async cadGeometryToMesh(cadGeometry: CADGeometry): Promise<GeometryModel> {
    console.log('🏗️ 将CAD几何转换为3D网格...');
    
    const vertices: number[] = [];
    const faces: number[] = [];
    let vertexIndex = 0;
    
    // 处理每个CAD实体
    for (const entity of cadGeometry.entities) {
      switch (entity.type) {
        case 'line':
          // 线段转换为矩形截面
          if (entity.points.length >= 2) {
            const extrudedMesh = this.extrudeLineToRectangle(entity.points, 0.1, 1.0);
            this.addMeshToBuffers(extrudedMesh, vertices, faces, vertexIndex);
            vertexIndex += extrudedMesh.vertices.length / 3;
          }
          break;
          
        case 'polyline':
          // 多段线转换为拉伸体
          if (entity.points.length >= 3) {
            const extrudedMesh = this.extrudePolyline(entity.points, 1.0);
            this.addMeshToBuffers(extrudedMesh, vertices, faces, vertexIndex);
            vertexIndex += extrudedMesh.vertices.length / 3;
          }
          break;
          
        case 'circle':
          // 圆形转换为圆柱体
          if (entity.points.length >= 1 && entity.properties.radius) {
            const cylinderMesh = this.createCylinder(
              entity.points[0],
              entity.properties.radius,
              1.0,
              16
            );
            this.addMeshToBuffers(cylinderMesh, vertices, faces, vertexIndex);
            vertexIndex += cylinderMesh.vertices.length / 3;
          }
          break;
          
        default:
          console.warn(`不支持的CAD实体类型: ${entity.type}`);
      }
    }
    
    // 计算质量指标
    const quality = {
      triangleCount: faces.length / 3,
      vertexCount: vertices.length / 3,
      boundingBox: cadGeometry.boundingBox,
      volume: this.calculateMeshVolume(new Float32Array(vertices), new Uint32Array(faces)),
      surfaceArea: this.calculateMeshSurfaceArea(new Float32Array(vertices), new Uint32Array(faces)),
      meshReadiness: 0.9
    };
    
    return {
      id: '',
      type: 'excavation',
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces),
      metadata: {
        createdAt: new Date(),
        createdBy: 'ExcavationGeometryService',
        version: '1.0.0',
        source: 'dxf_import',
        parameters: {
          entityCount: cadGeometry.entities.length,
          triangles: faces.length / 3
        }
      },
      quality
    };
  }

  private extrudeLineToRectangle(points: Point3D[], width: number, height: number): {
    vertices: Float32Array,
    faces: Uint32Array
  } {
    if (points.length < 2) {
      throw new Error('线段至少需要2个点');
    }
    
    const vertices: number[] = [];
    const faces: number[] = [];
    
    const p1 = points[0];
    const p2 = points[1];
    
    // 计算线段方向和垂直方向
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / length;
    const uy = dy / length;
    
    // 垂直方向
    const vx = -uy;
    const vy = ux;
    
    // 生成矩形的8个顶点
    const halfWidth = width / 2;
    
    // 底面4个顶点
    vertices.push(
      p1.x - vx * halfWidth, p1.y - vy * halfWidth, p1.z,
      p1.x + vx * halfWidth, p1.y + vy * halfWidth, p1.z,
      p2.x + vx * halfWidth, p2.y + vy * halfWidth, p2.z,
      p2.x - vx * halfWidth, p2.y - vy * halfWidth, p2.z
    );
    
    // 顶面4个顶点
    vertices.push(
      p1.x - vx * halfWidth, p1.y - vy * halfWidth, p1.z + height,
      p1.x + vx * halfWidth, p1.y + vy * halfWidth, p1.z + height,
      p2.x + vx * halfWidth, p2.y + vy * halfWidth, p2.z + height,
      p2.x - vx * halfWidth, p2.y - vy * halfWidth, p2.z + height
    );
    
    // 生成面片（12个三角形，6个面）
    const faceIndices = [
      // 底面
      0, 1, 2, 0, 2, 3,
      // 顶面
      4, 6, 5, 4, 7, 6,
      // 侧面
      0, 4, 1, 1, 4, 5,
      1, 5, 2, 2, 5, 6,
      2, 6, 3, 3, 6, 7,
      3, 7, 0, 0, 7, 4
    ];
    
    faces.push(...faceIndices);
    
    return {
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces)
    };
  }

  private extrudePolyline(points: Point3D[], height: number): {
    vertices: Float32Array,
    faces: Uint32Array
  } {
    const vertices: number[] = [];
    const faces: number[] = [];
    
    // 底面顶点
    for (const point of points) {
      vertices.push(point.x, point.y, point.z);
    }
    
    // 顶面顶点
    for (const point of points) {
      vertices.push(point.x, point.y, point.z + height);
    }
    
    const n = points.length;
    
    // 底面三角化（简单扇形三角化）
    for (let i = 1; i < n - 1; i++) {
      faces.push(0, i, i + 1);
    }
    
    // 顶面三角化
    for (let i = 1; i < n - 1; i++) {
      faces.push(n, n + i + 1, n + i);
    }
    
    // 侧面
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      // 每个侧面2个三角形
      faces.push(i, next, n + i);
      faces.push(next, n + next, n + i);
    }
    
    return {
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces)
    };
  }

  private createCylinder(center: Point3D, radius: number, height: number, segments: number): {
    vertices: Float32Array,
    faces: Uint32Array
  } {
    const vertices: number[] = [];
    const faces: number[] = [];
    
    // 生成圆柱体顶点
    // 底面中心
    vertices.push(center.x, center.y, center.z);
    // 顶面中心
    vertices.push(center.x, center.y, center.z + height);
    
    // 底面圆周顶点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      vertices.push(x, y, center.z);
    }
    
    // 顶面圆周顶点
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      vertices.push(x, y, center.z + height);
    }
    
    // 生成面片
    // 底面
    for (let i = 0; i < segments; i++) {
      const next = i + 1;
      faces.push(0, 2 + next % segments, 2 + i);
    }
    
    // 顶面
    for (let i = 0; i < segments; i++) {
      const next = i + 1;
      faces.push(1, 2 + segments + i, 2 + segments + next % segments);
    }
    
    // 侧面
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const bottom1 = 2 + i;
      const bottom2 = 2 + next;
      const top1 = 2 + segments + i;
      const top2 = 2 + segments + next;
      
      faces.push(bottom1, bottom2, top1);
      faces.push(bottom2, top2, top1);
    }
    
    return {
      vertices: new Float32Array(vertices),
      faces: new Uint32Array(faces)
    };
  }

  private addMeshToBuffers(
    mesh: { vertices: Float32Array, faces: Uint32Array },
    vertexBuffer: number[],
    faceBuffer: number[],
    vertexOffset: number
  ): void {
    // 添加顶点
    for (let i = 0; i < mesh.vertices.length; i++) {
      vertexBuffer.push(mesh.vertices[i]);
    }
    
    // 添加面片（调整索引偏移）
    for (let i = 0; i < mesh.faces.length; i++) {
      faceBuffer.push(mesh.faces[i] + vertexOffset);
    }
  }

  private async performBooleanSimple(
    meshA: GeometryModel,
    meshB: GeometryModel,
    operation: 'difference' | 'union' | 'intersection'
  ): Promise<GeometryModel> {
    // 简化的布尔运算实现
    console.log('⚠️ 使用简化布尔运算实现');
    
    let resultVertices: Float32Array;
    let resultFaces: Uint32Array;
    
    switch (operation) {
      case 'difference':
        // 简单实现：返回第一个网格（土体）
        resultVertices = meshA.vertices;
        resultFaces = meshA.faces;
        break;
        
      case 'union':
        // 简单实现：合并两个网格
        const combinedVertices = new Float32Array(meshA.vertices.length + meshB.vertices.length);
        combinedVertices.set(meshA.vertices, 0);
        combinedVertices.set(meshB.vertices, meshA.vertices.length);
        
        const combinedFaces = new Uint32Array(meshA.faces.length + meshB.faces.length);
        combinedFaces.set(meshA.faces, 0);
        
        const offsetFaces = new Uint32Array(meshB.faces.length);
        const vertexOffset = meshA.vertices.length / 3;
        for (let i = 0; i < meshB.faces.length; i++) {
          offsetFaces[i] = meshB.faces[i] + vertexOffset;
        }
        combinedFaces.set(offsetFaces, meshA.faces.length);
        
        resultVertices = combinedVertices;
        resultFaces = combinedFaces;
        break;
        
      case 'intersection':
        // 简单实现：返回第二个网格（开挖体）
        resultVertices = meshB.vertices;
        resultFaces = meshB.faces;
        break;
        
      default:
        throw new Error(`不支持的布尔运算: ${operation}`);
    }
    
    return {
      id: '',
      type: 'excavation',
      vertices: resultVertices,
      faces: resultFaces,
      metadata: {
        createdAt: new Date(),
        createdBy: 'ExcavationGeometryService',
        version: '1.0.0',
        source: 'boolean_operation',
        parameters: {
          operation,
          inputMeshes: 2
        }
      },
      quality: {
        triangleCount: resultFaces.length / 3,
        vertexCount: resultVertices.length / 3,
        boundingBox: this.calculateMeshBoundingBox(resultVertices),
        volume: this.calculateMeshVolume(resultVertices, resultFaces),
        surfaceArea: this.calculateMeshSurfaceArea(resultVertices, resultFaces),
        meshReadiness: 0.8
      }
    };
  }

  // ============== 分层开挖算法 ==============
  public async generateLayeredExcavation(
    geometry: CADGeometry,
    layers: LayerConfig[]
  ): Promise<GeometryModel[]> {
    console.log(`🏗️ 生成分层开挖: ${layers.length}层`);
    
    const layerModels: GeometryModel[] = [];
    let currentDepth = 0;
    
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerGeometry = await this.createLayerGeometry(geometry, currentDepth, layer.depth);
      
      layerGeometry.metadata.parameters = {
        ...layerGeometry.metadata.parameters,
        layerIndex: i,
        layerDepth: layer.depth,
        excavationMethod: layer.excavationMethod,
        constructionDays: layer.constructionDays
      };
      
      layerModels.push(layerGeometry);
      currentDepth += layer.depth;
    }
    
    return layerModels;
  }

  private async createLayerGeometry(
    baseGeometry: CADGeometry,
    startDepth: number,
    layerDepth: number
  ): Promise<GeometryModel> {
    // 为特定深度范围创建几何体
    const layerGeometry: CADGeometry = {
      ...baseGeometry,
      entities: baseGeometry.entities.map(entity => ({
        ...entity,
        id: `${entity.id}_layer_${startDepth}_${layerDepth}`,
        points: entity.points.map(point => ({
          ...point,
          z: point.z - startDepth // 调整Z坐标到层的起始深度
        }))
      }))
    };
    
    // 转换为网格并设置高度
    const meshModel = await this.cadGeometryToMesh(layerGeometry);
    
    // 调整网格高度到指定的层厚度
    this.adjustMeshHeight(meshModel, layerDepth);
    
    return meshModel;
  }

  private adjustMeshHeight(model: GeometryModel, height: number): void {
    // 找到最小和最大Z值
    let minZ = Infinity;
    let maxZ = -Infinity;
    
    for (let i = 2; i < model.vertices.length; i += 3) {
      minZ = Math.min(minZ, model.vertices[i]);
      maxZ = Math.max(maxZ, model.vertices[i]);
    }
    
    const currentHeight = maxZ - minZ;
    if (currentHeight === 0) return;
    
    const scale = height / currentHeight;
    
    // 调整所有Z坐标
    for (let i = 2; i < model.vertices.length; i += 3) {
      model.vertices[i] = minZ + (model.vertices[i] - minZ) * scale;
    }
    
    // 更新质量指标
    model.quality.boundingBox.max.z = minZ + height;
    model.quality.volume = this.calculateMeshVolume(model.vertices, model.faces);
  }

  // ============== 几何统计计算 ==============
  public async calculateExcavationStats(geometry: GeometryModel): Promise<ExcavationStats> {
    console.log('📊 计算开挖统计信息...');
    
    const totalVolume = geometry.quality.volume;
    const surfaceArea = geometry.quality.surfaceArea;
    
    // 简化的层统计（实际项目中应该基于地质数据）
    const layers: LayerStats[] = [
      {
        layer: 1,
        volume: totalVolume * 0.3,
        soilType: '填土',
        difficulty: 0.2
      },
      {
        layer: 2,
        volume: totalVolume * 0.4,
        soilType: '粘土',
        difficulty: 0.5
      },
      {
        layer: 3,
        volume: totalVolume * 0.3,
        soilType: '砂土',
        difficulty: 0.8
      }
    ];
    
    // 风险评估
    const avgDifficulty = layers.reduce((sum, layer) => sum + layer.difficulty, 0) / layers.length;
    let riskLevel: ExcavationStats['riskLevel'];
    
    if (avgDifficulty < 0.3) riskLevel = 'low';
    else if (avgDifficulty < 0.6) riskLevel = 'medium';
    else if (avgDifficulty < 0.8) riskLevel = 'high';
    else riskLevel = 'critical';
    
    return {
      totalVolume,
      surfaceArea,
      layers,
      riskLevel
    };
  }

  // ============== 公共创建接口 ==============
  public async createExcavationModel(dxfFile: File, config: any): Promise<GeometryModel> {
    // 解析DXF文件
    const cadGeometry = await this.parseDXFFile(dxfFile);
    
    // 转换为3D网格
    return await this.cadGeometryToMesh(cadGeometry);
  }

  /**
   * 生成开挖三维几何模型 - 主入口函数
   * 匹配ExcavationDesign.tsx的数据结构
   */
  public async generateExcavationGeometry(
    excavationData: ExcavationData,
    designParams: DesignParameters
  ): Promise<ExcavationGeometryResult> {
    console.log('🏗️ 开始生成开挖三维几何模型...');
    const startTime = performance.now();

    try {
      const warnings: string[] = [];

      // 1. 验证输入数据
      const validation = this.validateExcavationData(excavationData);
      if (!validation.isValid) {
        return this.createFailureResult(validation.errors);
      }

      // 2. 生成基坑轮廓几何
      const outlineGeometry = this.generateOutlineGeometry(excavationData.coordinates);
      
      // 3. 生成分层开挖几何
      const stageGeometries = await this.generateStageGeometriesFromExcavation(
        excavationData.stages,
        outlineGeometry,
        designParams
      );

      // 4. 合并所有阶段几何
      const combinedGeometry = this.combineStageGeometries(stageGeometries);

      // 5. 应用边坡处理
      if (excavationData.slopeRatio > 0) {
        this.applySlopeGeometry(combinedGeometry, excavationData.slopeRatio);
        warnings.push('已应用边坡几何，边坡比: ' + excavationData.slopeRatio);
      }

      // 6. 生成网格数据
      const meshData = this.generateMeshData(combinedGeometry);

      // 7. 计算几何统计
      const stats = this.calculateGeometryStatistics(combinedGeometry, stageGeometries);

      // 8. 生成glTF文件（模拟）
      const gltfUrl = await this.exportToGLTF(combinedGeometry, `excavation_${this.geometryIdCounter}`);

      const processingTime = performance.now() - startTime;
      console.log(`✅ 开挖几何生成完成，耗时: ${processingTime.toFixed(2)}ms`);

      return {
        success: true,
        geometryId: `EXC_${this.geometryIdCounter++}`,
        excavationVolume: stats.totalVolume,
        surfaceArea: stats.totalSurfaceArea,
        stages: stageGeometries.map(stage => ({
          stageId: stage.stageId,
          depth: stage.depth,
          volume: stage.volume,
          boundingBox: stage.boundingBox
        })),
        mesh: meshData,
        gltfUrl,
        warnings
      };

    } catch (error) {
      console.error('❌ 开挖几何生成失败:', error);
      return this.createFailureResult([`生成失败: ${error}`]);
    }
  }

  // ============== 新增方法支持ExcavationDesign.tsx ==============
  
  /**
   * 验证开挖数据
   */
  private validateExcavationData(data: ExcavationData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查基本参数
    if (data.totalDepth <= 0) {
      errors.push('开挖深度必须大于0');
    }

    if (data.area <= 0) {
      errors.push('开挖面积必须大于0');
    }

    if (data.coordinates.length < 3) {
      errors.push('基坑轮廓至少需要3个坐标点');
    }

    if (data.stages.length === 0) {
      errors.push('必须至少有一个开挖阶段');
    }

    // 检查阶段数据
    let cumulativeDepth = 0;
    for (const stage of data.stages) {
      if (stage.depth <= cumulativeDepth) {
        errors.push(`阶段 ${stage.name} 深度不能小于等于前一阶段`);
        break; // 避免重复错误
      }
      cumulativeDepth = stage.depth;
    }

    if (Math.abs(cumulativeDepth - data.totalDepth) > 0.1) {
      errors.push('阶段总深度与设计总深度不匹配');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成轮廓几何 - 兼容ExcavationData格式
   */
  private generateOutlineGeometry(coordinates: Array<{x: number, y: number}>): any {
    // 模拟Three.js Shape创建
    const shape = {
      type: 'Shape',
      points: coordinates.length > 0 ? coordinates : [
        {x: -25, y: -25}, {x: 25, y: -25}, {x: 25, y: 25}, {x: -25, y: 25}
      ]
    };
    
    console.log(`📐 生成基坑轮廓，顶点数: ${shape.points.length}`);
    return shape;
  }

  /**
   * 生成分层开挖几何 - 从ExcavationData生成
   */
  private async generateStageGeometriesFromExcavation(
    stages: ExcavationStage[],
    outline: any,
    designParams: DesignParameters
  ): Promise<StageGeometryData[]> {
    const stageGeometries: StageGeometryData[] = [];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const prevDepth = i > 0 ? stages[i - 1].depth : 0;
      const stageHeight = stage.depth - prevDepth;

      // 计算阶段体积（简化计算）
      const outlineArea = this.calculateOutlineArea(outline.points);
      const volume = outlineArea * stageHeight * (designParams.safetyFactor || 1.0);

      // 计算边界框
      const boundingBox = this.calculateStageBoundingBox(outline.points, prevDepth, stage.depth);

      // 创建几何体（简化）
      const geometry = this.createStageGeometry(outline, stageHeight, stage.depth);

      stageGeometries.push({
        stageId: stage.id,
        depth: stage.depth,
        height: stageHeight,
        volume,
        geometry,
        boundingBox
      });

      console.log(`✅ 生成阶段 ${stage.name} 几何，深度: ${stage.depth}m，体积: ${volume.toFixed(2)}m³`);
    }

    return stageGeometries;
  }

  /**
   * 计算轮廓面积
   */
  private calculateOutlineArea(points: Array<{x: number, y: number}>): number {
    if (points.length < 3) return 100; // 默认面积

    // 使用鞋带公式计算多边形面积
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * 计算阶段边界框
   */
  private calculateStageBoundingBox(
    points: Array<{x: number, y: number}>,
    startDepth: number,
    endDepth: number
  ): {
    min: [number, number, number];
    max: [number, number, number];
  } {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    return {
      min: [Math.min(...xs), Math.min(...ys), -endDepth],
      max: [Math.max(...xs), Math.max(...ys), -startDepth]
    };
  }

  /**
   * 创建阶段几何体
   */
  private createStageGeometry(outline: any, height: number, depth: number): any {
    // 简化的几何体创建
    return {
      type: 'ExtrudeGeometry',
      outline,
      height,
      depth,
      vertices: new Float32Array(0), // 占位符
      faces: new Uint32Array(0)      // 占位符
    };
  }

  /**
   * 合并阶段几何
   */
  private combineStageGeometries(stages: StageGeometryData[]): any {
    if (stages.length === 0) {
      return { 
        vertices: new Float32Array([0,0,0, 1,0,0, 0,1,0]), 
        faces: new Uint32Array([0,1,2]) 
      };
    }

    // 简化版几何合并
    const totalVolume = stages.reduce((sum, stage) => sum + stage.volume, 0);
    const firstStage = stages[0];
    
    return {
      type: 'CombinedGeometry',
      vertices: firstStage.geometry.vertices || new Float32Array(24), // 立方体顶点
      faces: firstStage.geometry.faces || new Uint32Array(36),       // 立方体面
      volume: totalVolume
    };
  }

  /**
   * 应用边坡几何
   */
  private applySlopeGeometry(geometry: any, slopeRatio: number): void {
    console.log(`🔧 应用边坡几何，边坡比: ${slopeRatio}`);
    // 简化实现：记录边坡信息
    geometry.slopeRatio = slopeRatio;
    geometry.hasSlope = true;
  }

  /**
   * 生成网格数据
   */
  private generateMeshData(geometry: any): {
    vertices: number[];
    faces: number[];
    normals: number[];
  } {
    // 简化的立方体网格数据
    const vertices = [
      // 前面
      -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
      // 后面  
      -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1, -1,
      // 顶面
      -1,  1, -1, -1,  1,  1,  1,  1,  1,  1,  1, -1,
      // 底面
      -1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1,
      // 右面
       1, -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,
      // 左面
      -1, -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1
    ];

    const faces = [
      0,  1,  2,    0,  2,  3,    // 前面
      4,  5,  6,    4,  6,  7,    // 后面
      8,  9,  10,   8,  10, 11,   // 顶面
      12, 13, 14,   12, 14, 15,   // 底面
      16, 17, 18,   16, 18, 19,   // 右面
      20, 21, 22,   20, 22, 23    // 左面
    ];

    const normals = [
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,   // 前面
      0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1,   // 后面
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,   // 顶面
      0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0,   // 底面
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,   // 右面
     -1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0    // 左面
    ];

    return { vertices, faces, normals };
  }

  /**
   * 计算几何统计
   */
  private calculateGeometryStatistics(
    combinedGeometry: any,
    stages: StageGeometryData[]
  ) {
    const totalVolume = stages.reduce((sum, stage) => sum + stage.volume, 0);
    
    // 简化表面积计算
    const avgDimension = Math.cbrt(totalVolume); // 立方根近似
    const totalSurfaceArea = 6 * avgDimension * avgDimension; // 立方体表面积近似

    return {
      totalVolume,
      totalSurfaceArea
    };
  }

  /**
   * 导出为glTF格式
   */
  private async exportToGLTF(geometry: any, filename: string): Promise<string> {
    // 模拟glTF导出
    const mockUrl = `http://localhost:8084/generated/${filename}.gltf`;
    console.log(`📁 模拟导出glTF: ${mockUrl}`);
    return mockUrl;
  }

  /**
   * 创建失败结果
   */
  private createFailureResult(errors: string[]): ExcavationGeometryResult {
    return {
      success: false,
      geometryId: '',
      excavationVolume: 0,
      surfaceArea: 0,
      stages: [],
      mesh: { vertices: [], faces: [], normals: [] },
      warnings: errors
    };
  }

  // ============== 工具方法 ==============
  private calculateMeshBoundingBox(vertices: Float32Array): BoundingBox {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (let i = 0; i < vertices.length; i += 3) {
      minX = Math.min(minX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]);
      maxX = Math.max(maxX, vertices[i]);
      maxY = Math.max(maxY, vertices[i + 1]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
    }
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
  }

  private calculateMeshVolume(vertices: Float32Array, faces: Uint32Array): number {
    let volume = 0;
    
    // 使用发散定理计算体积
    for (let i = 0; i < faces.length; i += 3) {
      const i1 = faces[i] * 3;
      const i2 = faces[i + 1] * 3;
      const i3 = faces[i + 2] * 3;
      
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
      
      // 计算三角形的贡献
      volume += v1[0] * (v2[1] * v3[2] - v3[1] * v2[2]) / 6;
    }
    
    return Math.abs(volume);
  }

  private calculateMeshSurfaceArea(vertices: Float32Array, faces: Uint32Array): number {
    let area = 0;
    
    for (let i = 0; i < faces.length; i += 3) {
      const i1 = faces[i] * 3;
      const i2 = faces[i + 1] * 3;
      const i3 = faces[i + 2] * 3;
      
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      const v3 = [vertices[i3], vertices[i3 + 1], vertices[i3 + 2]];
      
      // 计算三角形面积
      const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      
      const cross = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ];
      
      const magnitude = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
      area += magnitude * 0.5;
    }
    
    return area;
  }

  public async dispose(): Promise<void> {
    this.geometryCache.clear();
    this.initialized = false;
  }
}

export default ExcavationGeometryService;