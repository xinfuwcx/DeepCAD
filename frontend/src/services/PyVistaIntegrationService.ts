/**
 * PyVista集成服务
 * 0号架构师 - 基于3号专家提供的PyVista接口规范
 * 实现PyVista数据到Three.js的完整转换和显示
 */

import * as THREE from 'three';

// 3号专家提供的PyVista接口定义
export interface PyVistaGeometryData {
  vertices: Float32Array;          // [x1,y1,z1, x2,y2,z2, ...]
  vertexCount: number;             // 顶点总数
  cells: Uint32Array;              // [n1,i1,i2,...,in1, n2,j1,j2,...,jn2, ...]
  cellTypes: Uint8Array;           // VTK单元类型数组
  cellCount: number;               // 单元总数
  normals?: Float32Array;          // 顶点法向量
  textureCoords?: Float32Array;    // UV坐标
}

export interface PyVistaScalarData {
  name: string;                    // 字段名称
  values: Float32Array;            // 标量值数组
  range: [number, number];         // 数值范围 [min, max]
  location: 'points' | 'cells';    // 数据位置（顶点或单元）
}

export interface PyVistaVectorData {
  name: string;                    // 字段名称
  vectors: Float32Array;           // 向量数组 [vx1,vy1,vz1, vx2,vy2,vz2, ...]
  magnitude: Float32Array;         // 向量长度数组
  location: 'points' | 'cells';    // 数据位置
}

export interface PyVistaDataSet {
  geometry: PyVistaGeometryData;
  scalars: PyVistaScalarData[];
  vectors: PyVistaVectorData[];
  metadata: {
    timestamp: string;
    source: string;               // 数据来源
    units: Record<string, string>; // 单位信息
  };
}

// 深基坑分析结果接口
export interface PyVistaDeepExcavationResults {
  mesh: PyVistaGeometryData;
  stressField: {
    vonMises: PyVistaScalarData;     // von Mises应力
    principal: {
      sigma1: PyVistaScalarData;     // 主应力1
      sigma2: PyVistaScalarData;     // 主应力2
      sigma3: PyVistaScalarData;     // 主应力3
    };
    shear: PyVistaScalarData;        // 剪应力
  };
  displacementField: {
    displacement: PyVistaVectorData;  // 位移向量
    magnitude: PyVistaScalarData;     // 位移大小
  };
  seepageField: {
    pressure: PyVistaScalarData;      // 孔隙水压力
    velocity: PyVistaVectorData;      // 渗流速度
    hydraulicHead: PyVistaScalarData; // 水头
  };
  safetyFactor: PyVistaScalarData;
}

export interface PyVistaStageResults {
  stageId: number;
  stageName: string;
  results: PyVistaDeepExcavationResults;
  constructionDate: string;
}

// PyVista数据API客户端
export class PyVistaDataAPI {
  private baseURL = '/api/pyvista';

  // 获取计算结果
  async getComputationResults(jobId: string): Promise<PyVistaDataSet> {
    try {
      const response = await fetch(`${this.baseURL}/results/${jobId}`);
      if (!response.ok) {
        throw new Error(`获取计算结果失败: HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('PyVista计算结果获取失败:', error);
      throw error;
    }
  }

  // 获取实时数据流
  async getRealtimeData(streamId: string): Promise<PyVistaDataSet> {
    try {
      const response = await fetch(`${this.baseURL}/stream/${streamId}`);
      if (!response.ok) {
        throw new Error(`获取实时数据失败: HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('PyVista实时数据获取失败:', error);
      throw error;
    }
  }

  // 推送计算参数
  async submitComputation(params: any): Promise<{ jobId: string }> {
    try {
      const response = await fetch(`${this.baseURL}/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        throw new Error(`提交计算任务失败: HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PyVista计算任务提交失败:', error);
      throw error;
    }
  }

  // 获取计算状态
  async getComputationStatus(jobId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'error';
    progress: number;
    message: string;
    estimatedTime?: number;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/status/${jobId}`);
      if (!response.ok) {
        throw new Error(`获取计算状态失败: HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('PyVista计算状态查询失败:', error);
      throw error;
    }
  }
}

// PyVista实时数据流
export class PyVistaRealtimeStream {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Function> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3秒

  connect(): void {
    try {
      this.ws = new WebSocket('ws://localhost:8080/pyvista/stream');

      this.ws.onopen = () => {
        console.log('✅ PyVista WebSocket连接建立');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleDataUpdate(data);
        } catch (error) {
          console.error('PyVista WebSocket数据解析失败:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 PyVista WebSocket连接关闭');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ PyVista WebSocket错误:', error);
      };

    } catch (error) {
      console.error('PyVista WebSocket连接失败:', error);
    }
  }

  // 订阅数据更新
  subscribe(dataType: string, callback: (data: PyVistaDataSet) => void): void {
    this.callbacks.set(dataType, callback);
  }

  // 取消订阅
  unsubscribe(dataType: string): void {
    this.callbacks.delete(dataType);
  }

  // 断开连接
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }

  private handleDataUpdate(data: any): void {
    const callback = this.callbacks.get(data.type);
    if (callback && data.payload) {
      callback(data.payload);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 尝试重连PyVista WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('❌ PyVista WebSocket重连失败，已达到最大尝试次数');
    }
  }
}

// PyVista到Three.js转换器
export class PyVistaToThreeConverter {
  private scene: THREE.Scene;
  private materialCache: Map<string, THREE.Material> = new Map();
  private colorMaps: Map<string, THREE.DataTexture> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // 主要转换方法
  convertDataSet(dataset: PyVistaDataSet, name: string = 'pyvista_data'): THREE.Group {
    console.log('🔄 开始PyVista数据转换:', {
      顶点数: dataset.geometry.vertexCount,
      单元数: dataset.geometry.cellCount,
      标量场数: dataset.scalars.length,
      向量场数: dataset.vectors.length
    });

    const group = new THREE.Group();
    group.name = name;

    try {
      // 1. 转换几何体
      const geometry = this.convertGeometry(dataset.geometry);

      // 2. 为每个标量场创建材质和网格
      dataset.scalars.forEach((scalarData, index) => {
        const material = this.createScalarMaterial(scalarData, dataset.geometry);
        const mesh = new THREE.Mesh(geometry.clone(), material);
        
        mesh.name = `${name}_scalar_${scalarData.name}`;
        mesh.userData = {
          type: 'pyvista_scalar',
          scalarName: scalarData.name,
          range: scalarData.range,
          source: dataset.metadata.source
        };
        
        // 默认只显示第一个标量场
        mesh.visible = index === 0;
        group.add(mesh);
      });

      // 3. 添加向量场显示
      dataset.vectors.forEach((vectorData, index) => {
        const arrows = this.createVectorField(vectorData, dataset.geometry);
        arrows.name = `${name}_vector_${vectorData.name}`;
        arrows.visible = false; // 默认隐藏向量场
        group.add(arrows);
      });

      // 4. 如果没有标量场，创建基础网格
      if (dataset.scalars.length === 0) {
        const basicMaterial = new THREE.MeshPhongMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, basicMaterial);
        mesh.name = `${name}_basic`;
        group.add(mesh);
      }

      console.log('✅ PyVista数据转换完成');
      return group;

    } catch (error) {
      console.error('❌ PyVista数据转换失败:', error);
      throw error;
    }
  }

  // 几何数据转换
  private convertGeometry(pyvistaGeom: PyVistaGeometryData): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // 顶点位置
    geometry.setAttribute('position',
      new THREE.BufferAttribute(pyvistaGeom.vertices, 3));

    // 单元索引转换为三角形
    const indices = this.convertCellsToTriangles(
      pyvistaGeom.cells,
      pyvistaGeom.cellTypes
    );
    geometry.setIndex(indices);

    // 法向量
    if (pyvistaGeom.normals && pyvistaGeom.normals.length > 0) {
      geometry.setAttribute('normal',
        new THREE.BufferAttribute(pyvistaGeom.normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    // UV坐标
    if (pyvistaGeom.textureCoords && pyvistaGeom.textureCoords.length > 0) {
      geometry.setAttribute('uv',
        new THREE.BufferAttribute(pyvistaGeom.textureCoords, 2));
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }

  // VTK单元转换为Three.js三角形索引
  private convertCellsToTriangles(
    cells: Uint32Array,
    cellTypes: Uint8Array
  ): Uint32Array {
    const triangles: number[] = [];
    let cellOffset = 0;

    for (let i = 0; i < cellTypes.length; i++) {
      const cellType = cellTypes[i];
      const numPoints = cells[cellOffset];
      cellOffset++;

      // VTK单元类型处理
      switch (cellType) {
        case 5: // VTK_TRIANGLE
          if (numPoints === 3) {
            triangles.push(
              cells[cellOffset],
              cells[cellOffset + 1],
              cells[cellOffset + 2]
            );
          }
          break;

        case 9: // VTK_QUAD
          if (numPoints === 4) {
            // 四边形分解为两个三角形
            triangles.push(
              cells[cellOffset],
              cells[cellOffset + 1],
              cells[cellOffset + 2],
              
              cells[cellOffset],
              cells[cellOffset + 2],
              cells[cellOffset + 3]
            );
          }
          break;

        case 10: // VTK_TETRA
          if (numPoints === 4) {
            // 四面体的4个三角形面
            const [a, b, c, d] = [
              cells[cellOffset],
              cells[cellOffset + 1],
              cells[cellOffset + 2],
              cells[cellOffset + 3]
            ];
            
            triangles.push(
              a, b, c,  // 面1
              a, c, d,  // 面2
              a, d, b,  // 面3
              b, d, c   // 面4
            );
          }
          break;

        default:
          // 其他单元类型暂时跳过
          console.warn(`不支持的VTK单元类型: ${cellType}`);
          break;
      }

      cellOffset += numPoints;
    }

    return new Uint32Array(triangles);
  }

  // 创建标量场材质
  private createScalarMaterial(
    scalarData: PyVistaScalarData,
    geometry: PyVistaGeometryData
  ): THREE.Material {
    const cacheKey = `${scalarData.name}_${scalarData.range[0]}_${scalarData.range[1]}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    // 创建颜色映射纹理
    const colorMap = this.createColorMapTexture(scalarData);
    
    // 创建顶点颜色属性
    const colors = this.computeVertexColors(scalarData, geometry.vertexCount);

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      shininess: 30
    });

    this.materialCache.set(cacheKey, material);
    return material;
  }

  // 创建颜色映射纹理
  private createColorMapTexture(scalarData: PyVistaScalarData): THREE.DataTexture {
    const cacheKey = `colormap_${scalarData.name}`;
    
    if (this.colorMaps.has(cacheKey)) {
      return this.colorMaps.get(cacheKey)!;
    }

    const width = 256;
    const height = 1;
    const data = new Uint8Array(width * height * 3);

    // 创建彩虹色彩映射 (蓝->青->绿->黄->红)
    for (let i = 0; i < width; i++) {
      const t = i / (width - 1);
      const idx = i * 3;

      if (t <= 0.25) {
        // 蓝到青
        const s = t / 0.25;
        data[idx] = 0;                    // R
        data[idx + 1] = Math.floor(s * 255); // G
        data[idx + 2] = 255;              // B
      } else if (t <= 0.5) {
        // 青到绿
        const s = (t - 0.25) / 0.25;
        data[idx] = 0;                          // R
        data[idx + 1] = 255;                    // G
        data[idx + 2] = Math.floor((1-s) * 255); // B
      } else if (t <= 0.75) {
        // 绿到黄
        const s = (t - 0.5) / 0.25;
        data[idx] = Math.floor(s * 255);     // R
        data[idx + 1] = 255;                 // G
        data[idx + 2] = 0;                   // B
      } else {
        // 黄到红
        const s = (t - 0.75) / 0.25;
        data[idx] = 255;                       // R
        data[idx + 1] = Math.floor((1-s) * 255); // G
        data[idx + 2] = 0;                     // B
      }
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    this.colorMaps.set(cacheKey, texture);
    return texture;
  }

  // 计算顶点颜色
  private computeVertexColors(
    scalarData: PyVistaScalarData,
    vertexCount: number
  ): Float32Array {
    const colors = new Float32Array(vertexCount * 3);
    const [minVal, maxVal] = scalarData.range;
    const range = maxVal - minVal;

    for (let i = 0; i < scalarData.values.length; i++) {
      const normalizedValue = range > 0 ? (scalarData.values[i] - minVal) / range : 0;
      const colorIndex = i * 3;

      // 根据归一化值计算RGB颜色
      if (normalizedValue <= 0.25) {
        const t = normalizedValue / 0.25;
        colors[colorIndex] = 0;      // R
        colors[colorIndex + 1] = t;  // G
        colors[colorIndex + 2] = 1;  // B
      } else if (normalizedValue <= 0.5) {
        const t = (normalizedValue - 0.25) / 0.25;
        colors[colorIndex] = 0;        // R
        colors[colorIndex + 1] = 1;    // G
        colors[colorIndex + 2] = 1 - t; // B
      } else if (normalizedValue <= 0.75) {
        const t = (normalizedValue - 0.5) / 0.25;
        colors[colorIndex] = t;      // R
        colors[colorIndex + 1] = 1;  // G
        colors[colorIndex + 2] = 0;  // B
      } else {
        const t = (normalizedValue - 0.75) / 0.25;
        colors[colorIndex] = 1;      // R
        colors[colorIndex + 1] = 1 - t; // G
        colors[colorIndex + 2] = 0;  // B
      }
    }

    return colors;
  }

  // 创建向量场可视化
  private createVectorField(
    vectorData: PyVistaVectorData,
    geometry: PyVistaGeometryData
  ): THREE.Group {
    const group = new THREE.Group();
    
    // 计算合适的箭头尺寸
    const maxMagnitude = Math.max(...vectorData.magnitude);
    const avgMagnitude = vectorData.magnitude.reduce((a, b) => a + b) / vectorData.magnitude.length;
    const arrowScale = avgMagnitude > 0 ? 1.0 / avgMagnitude : 1.0;

    // 创建箭头几何和材质
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    
    // 根据向量大小创建不同颜色的材质
    const materials = {
      low: new THREE.MeshBasicMaterial({ color: 0x0088ff }),
      medium: new THREE.MeshBasicMaterial({ color: 0x00ff88 }),
      high: new THREE.MeshBasicMaterial({ color: 0xff8800 })
    };

    // 采样显示（避免向量过多）
    const sampleStep = Math.max(1, Math.floor(vectorData.vectors.length / 3 / 1000));

    for (let i = 0; i < vectorData.vectors.length; i += 3 * sampleStep) {
      const vx = vectorData.vectors[i];
      const vy = vectorData.vectors[i + 1];
      const vz = vectorData.vectors[i + 2];
      const magnitude = vectorData.magnitude[i / 3];

      if (magnitude < maxMagnitude * 0.1) continue; // 跳过太小的向量

      // 获取对应的顶点位置
      const px = geometry.vertices[i];
      const py = geometry.vertices[i + 1];
      const pz = geometry.vertices[i + 2];

      // 创建箭头
      const arrow = new THREE.Group();

      // 箭头杆
      const shaft = new THREE.Mesh(shaftGeometry, materials.medium);
      shaft.scale.y = magnitude * arrowScale;
      arrow.add(shaft);

      // 箭头头部
      const head = new THREE.Mesh(arrowGeometry, materials.high);
      head.position.y = magnitude * arrowScale / 2 + 0.15;
      arrow.add(head);

      // 设置箭头位置和方向
      arrow.position.set(px, py, pz);
      
      // 计算箭头方向
      const direction = new THREE.Vector3(vx, vy, vz).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      
      if (Math.abs(direction.dot(up)) > 0.99) {
        up.set(1, 0, 0);
      }
      
      arrow.lookAt(
        px + direction.x,
        py + direction.y,
        pz + direction.z
      );

      group.add(arrow);
    }

    return group;
  }

  // 清理缓存
  dispose(): void {
    this.materialCache.forEach(material => {
      if (material instanceof THREE.Material) {
        material.dispose();
      }
    });
    this.materialCache.clear();

    this.colorMaps.forEach(texture => {
      texture.dispose();
    });
    this.colorMaps.clear();
  }
}

// 单例实例
let pyvistaIntegrationService: {
  api: PyVistaDataAPI;
  stream: PyVistaRealtimeStream;
  converter: PyVistaToThreeConverter | null;
} | null = null;

export const getPyVistaIntegrationService = (scene?: THREE.Scene) => {
  if (!pyvistaIntegrationService) {
    pyvistaIntegrationService = {
      api: new PyVistaDataAPI(),
      stream: new PyVistaRealtimeStream(),
      converter: scene ? new PyVistaToThreeConverter(scene) : null
    };
  }
  
  if (scene && !pyvistaIntegrationService.converter) {
    pyvistaIntegrationService.converter = new PyVistaToThreeConverter(scene);
  }

  return pyvistaIntegrationService;
};

export default getPyVistaIntegrationService;