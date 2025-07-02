import axios from 'axios';
import * as THREE from 'three';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Chili3D API集成服务
 * 提供与3D可视化相关的API调用函数
 */
const chili3dIntegration = {
  /**
   * 获取3D场景数据
   * @param sceneId 场景ID
   * @returns 场景数据Promise
   */
  getSceneData: async (sceneId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/v4/chili3d/scenes/${sceneId}`);
      return response.data;
    } catch (error) {
      console.error('获取3D场景数据失败:', error);
      throw error;
    }
  },

  /**
   * 更新3D场景参数
   * @param sceneId 场景ID
   * @param params 要更新的参数
   * @returns 更新结果Promise
   */
  updateSceneParams: async (sceneId: string, params: Record<string, any>) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/v4/chili3d/scenes/${sceneId}/params`, params);
      return response.data;
    } catch (error) {
      console.error('更新3D场景参数失败:', error);
      throw error;
    }
  },

  /**
   * 执行3D场景分析
   * @param sceneId 场景ID
   * @param analysisType 分析类型
   * @returns 分析结果Promise
   */
  runSceneAnalysis: async (sceneId: string, analysisType: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/v4/chili3d/scenes/${sceneId}/analyze`, {
        analysis_type: analysisType
      });
      return response.data;
    } catch (error) {
      console.error('执行3D场景分析失败:', error);
      throw error;
    }
  },

  /**
   * 导出场景数据
   * @param sceneId 场景ID
   * @param format 导出格式(如json, dxf等)
   * @returns 导出的场景数据Promise
   */
  exportSceneData: async (sceneId: string, format: string = 'json') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/v4/chili3d/scenes/${sceneId}/export`, {
        params: { format }
      });
      return response.data;
    } catch (error) {
      console.error('导出场景数据失败:', error);
      throw error;
    }
  }
};

interface SceneOptions {
  colorScheme: 'rainbow' | 'blue' | 'terrain' | 'default';
  showWireframe: boolean;
  dataType: string;
}

/**
 * 创建Chili3D场景
 * 优化版本支持大规模数据渲染
 */
export const createChili3DScene = (
  scene: THREE.Scene,
  modelData: any,
  options: SceneOptions
): void => {
  if (!modelData || !modelData.results) {
    console.warn('无法创建场景：模型数据无效');
    return;
  }

  // 清除现有场景对象
  clearScene(scene);

  // 添加环境光和方向光
  const ambientLight = new THREE.AmbientLight(0x404040, 1);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // 根据数据类型获取数据
  const data = modelData.results[options.dataType];
  if (!data || !Array.isArray(data)) {
    console.warn(`未找到${options.dataType}类型的数据`);
    return;
  }

  // 获取数据范围
  const { min, max } = getDataRange(data);

  // 创建网格
  if (modelData.results.water_table_points) {
    createWaterTableMesh(scene, modelData.results.water_table_points, options);
  }

  // 根据数据类型创建不同的可视化
  switch (options.dataType) {
    case 'head':
    case 'pressure':
      createScalarFieldVisualization(scene, data, { 
        min, max, 
        colorScheme: options.colorScheme,
        showWireframe: options.showWireframe
      });
      break;
    case 'velocity':
      createVectorFieldVisualization(
        scene, 
        modelData.results.velocity, 
        options.colorScheme
      );
      break;
    default:
      console.warn(`不支持的数据类型: ${options.dataType}`);
  }

  // 添加坐标轴辅助器
  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);
};

/**
 * 更新场景数据
 * 高性能版本，适用于动画和大数据集
 */
export const updateSceneData = (
  scene: THREE.Scene,
  modelData: any,
  colorScheme: 'rainbow' | 'blue' | 'terrain' | 'default'
): void => {
  if (!modelData || !modelData.results) {
    return;
  }

  // 查找现有的数据网格
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.userData.isDataMesh) {
      // 更新材质颜色
      updateMeshColors(object, modelData, colorScheme);
    }
  });
};

/**
 * 清除场景中的所有对象
 * 保留光源和辅助器
 */
const clearScene = (scene: THREE.Scene): void => {
  const objectsToRemove: THREE.Object3D[] = [];
  
  scene.traverse((object) => {
    if (
      !(object instanceof THREE.Light) && 
      !(object instanceof THREE.AxesHelper) &&
      !(object instanceof THREE.Camera) &&
      object !== scene
    ) {
      objectsToRemove.push(object);
    }
  });

  // 移除对象并释放资源
  objectsToRemove.forEach((object) => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
    
    scene.remove(object);
  });
};

/**
 * 获取数据范围
 */
const getDataRange = (data: number[]): { min: number; max: number } => {
  let min = Infinity;
  let max = -Infinity;

  // 使用优化的数组处理方法
  if (data.length > 1000) {
    // 对于大型数据集，采样计算
    const sampleSize = Math.max(1000, Math.floor(data.length / 10));
    const step = Math.floor(data.length / sampleSize);
    
    for (let i = 0; i < data.length; i += step) {
      const value = data[i];
      if (typeof value === 'number') {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  } else {
    // 对于小型数据集，全量计算
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      if (typeof value === 'number') {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  return { min, max };
};

/**
 * 创建标量场可视化
 * 使用实例化渲染提高性能
 */
const createScalarFieldVisualization = (
  scene: THREE.Scene,
  data: number[],
  options: {
    min: number;
    max: number;
    colorScheme: 'rainbow' | 'blue' | 'terrain' | 'default';
    showWireframe: boolean;
  }
): void => {
  const { min, max, colorScheme, showWireframe } = options;
  
  // 根据数据量选择不同的渲染策略
  const useInstancing = data.length > 1000;
  
  if (useInstancing) {
    // 使用实例化渲染
    createInstancedMesh(scene, data, min, max, colorScheme);
  } else {
    // 使用常规网格
    createRegularMesh(scene, data, min, max, colorScheme, showWireframe);
  }
};

/**
 * 创建实例化网格
 * 可高效渲染大量对象
 */
const createInstancedMesh = (
  scene: THREE.Scene,
  data: number[],
  min: number,
  max: number,
  colorScheme: 'rainbow' | 'blue' | 'terrain' | 'default'
): void => {
  const count = data.length;
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const material = new THREE.MeshPhongMaterial();
  
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  
  // 设置矩阵和颜色
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  
  // 创建网格
  const gridSize = Math.ceil(Math.sqrt(count));
  
  for (let i = 0; i < count; i++) {
    // 计算网格位置
    const x = (i % gridSize) - gridSize / 2;
    const y = Math.floor(i / gridSize) % gridSize - gridSize / 2;
    const z = Math.floor(i / (gridSize * gridSize));
    
    // 设置位置和缩放
    const value = data[i];
    const normalizedValue = (value - min) / (max - min);
    const scale = 0.5 + normalizedValue * 0.5;
    
    matrix.makeScale(scale, scale, scale);
    matrix.setPosition(x, y, z);
    
    mesh.setMatrixAt(i, matrix);
    
    // 设置颜色
    color.copy(getColorForValue(normalizedValue, colorScheme));
    mesh.setColorAt(i, color);
  }
  
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  
  mesh.userData.isDataMesh = true;
  mesh.userData.dataType = 'scalar';
  
  scene.add(mesh);
};

/**
 * 创建常规网格
 */
const createRegularMesh = (
  scene: THREE.Scene,
  data: number[],
  min: number,
  max: number,
  colorScheme: 'rainbow' | 'blue' | 'terrain' | 'default',
  showWireframe: boolean
): void => {
  // 对于少量数据，使用常规网格
  const geometry = new THREE.BufferGeometry();
  
  // 计算网格大小
  const count = data.length;
  const gridSize = Math.ceil(Math.sqrt(count));
  
  const vertices = [];
  const colors = [];
  const indices = [];
  
  // 创建顶点和颜色
  for (let i = 0; i < count; i++) {
    const x = (i % gridSize) - gridSize / 2;
    const y = Math.floor(i / gridSize) % gridSize - gridSize / 2;
    const z = data[i];
    
    vertices.push(x, y, z);
    
    // 添加颜色
    const normalizedValue = (data[i] - min) / (max - min);
    const color = getColorForValue(normalizedValue, colorScheme);
    colors.push(color.r, color.g, color.b);
  }
  
  // 创建索引（三角形）
  for (let i = 0; i < gridSize - 1; i++) {
    for (let j = 0; j < gridSize - 1; j++) {
      const a = i * gridSize + j;
      const b = i * gridSize + j + 1;
      const c = (i + 1) * gridSize + j;
      const d = (i + 1) * gridSize + j + 1;
      
      // 第一个三角形
      indices.push(a, b, c);
      // 第二个三角形
      indices.push(b, d, c);
    }
  }
  
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    wireframe: showWireframe,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.isDataMesh = true;
  mesh.userData.dataType = 'scalar';
  
  scene.add(mesh);
};

/**
 * 创建矢量场可视化
 */
const createVectorFieldVisualization = (
  scene: THREE.Scene,
  velocityData: any,
  colorScheme: 'rainbow' | 'blue' | 'terrain' | 'default'
): void => {
  if (!velocityData || !velocityData.x || !velocityData.y || !velocityData.z) {
    console.warn('速度数据不完整');
    return;
  }
  
  const xData = velocityData.x;
  const yData = velocityData.y;
  const zData = velocityData.z;
  const magData = velocityData.magnitude;
  
  // 获取数据范围
  const { min, max } = getDataRange(magData);
  
  // 计算网格大小
  const count = magData.length;
  const gridSize = Math.ceil(Math.sqrt(count));
  
  // 创建箭头几何体
  const arrowGroup = new THREE.Group();
  
  // 为了提高性能，限制箭头数量
  const maxArrows = 1000;
  const step = Math.max(1, Math.floor(count / maxArrows));
  
  for (let i = 0; i < count; i += step) {
    const x = (i % gridSize) - gridSize / 2;
    const y = Math.floor(i / gridSize) % gridSize - gridSize / 2;
    const z = Math.floor(i / (gridSize * gridSize));
    
    const vx = xData[i];
    const vy = yData[i];
    const vz = zData[i];
    const mag = magData[i];
    
    // 计算方向和颜色
    const normalizedMag = (mag - min) / (max - min);
    const color = getColorForValue(normalizedMag, colorScheme);
    
    // 创建箭头
    const direction = new THREE.Vector3(vx, vy, vz).normalize();
    const length = 0.5 * (1 + normalizedMag);
    
    const arrowHelper = new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(x, y, z),
      length,
      color.getHex(),
      length * 0.3,
      length * 0.2
    );
    
    arrowGroup.add(arrowHelper);
  }
  
  arrowGroup.userData.isDataMesh = true;
  arrowGroup.userData.dataType = 'vector';
  
  scene.add(arrowGroup);
};

/**
 * 创建水位面网格
 */
const createWaterTableMesh = (
  scene: THREE.Scene,
  points: number[][],
  options: SceneOptions
): void => {
  // 创建水位面几何体
  const geometry = new THREE.BufferGeometry();
  
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // 转换点坐标
  points.forEach(point => {
    vertices.push(point[0], point[1], point[2]);
  });
  
  // 创建德劳内三角剖分
  // 简化版本，假设点已经按网格排列
  const gridSize = Math.sqrt(points.length);
  
  if (Math.floor(gridSize) === gridSize) {
    for (let i = 0; i < gridSize - 1; i++) {
      for (let j = 0; j < gridSize - 1; j++) {
        const a = i * gridSize + j;
        const b = i * gridSize + j + 1;
        const c = (i + 1) * gridSize + j;
        const d = (i + 1) * gridSize + j + 1;
        
        // 添加两个三角形
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }
  
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  // 创建材质
  const material = new THREE.MeshPhongMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  
  const waterMesh = new THREE.Mesh(geometry, material);
  waterMesh.userData.isWaterTable = true;
  
  scene.add(waterMesh);
};

/**
 * 更新网格颜色
 */
const updateMeshColors = (
  mesh: THREE.Mesh | THREE.InstancedMesh,
  modelData: any,
  colorScheme: 'rainbow' | 'blue' | 'terrain' | 'default'
): void => {
  if (!modelData || !modelData.results) return;
  
  if (mesh instanceof THREE.InstancedMesh) {
    // 更新实例化网格颜色
    const dataType = mesh.userData.dataType;
    let data: number[];
    
    if (dataType === 'scalar') {
      data = modelData.results.head || modelData.results.pressure || [];
    } else if (dataType === 'vector') {
      data = modelData.results.velocity?.magnitude || [];
    } else {
      return;
    }
    
    const { min, max } = getDataRange(data);
    const color = new THREE.Color();
    
    for (let i = 0; i < mesh.count; i++) {
      if (i < data.length) {
        const value = data[i];
        const normalizedValue = (value - min) / (max - min);
        color.copy(getColorForValue(normalizedValue, colorScheme));
        mesh.setColorAt(i, color);
      }
    }
    
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
};

/**
 * 根据归一化值获取颜色
 */
const getColorForValue = (
  value: number,
  scheme: 'rainbow' | 'blue' | 'terrain' | 'default'
): THREE.Color => {
  // 确保值在 0-1 范围内
  value = Math.max(0, Math.min(1, value));
  
  switch (scheme) {
    case 'rainbow':
      // 彩虹色谱
      return new THREE.Color().setHSL(0.7 * (1 - value), 1, 0.5);
      
    case 'blue':
      // 蓝色渐变
      return new THREE.Color(0, value, 1);
      
    case 'terrain':
      // 地形颜色
      if (value < 0.2) {
        return new THREE.Color(0, 0, 0.5 + 2.5 * value);
      } else if (value < 0.4) {
        return new THREE.Color(0, (value - 0.2) * 5, 1);
      } else if (value < 0.6) {
        return new THREE.Color(0, 1, 1 - (value - 0.4) * 5);
      } else if (value < 0.8) {
        return new THREE.Color((value - 0.6) * 5, 1, 0);
      } else {
        return new THREE.Color(1, 1 - (value - 0.8) * 5, 0);
      }
      
    default:
      // 默认灰度
      return new THREE.Color(value, value, value);
  }
};

export default {
  createChili3DScene,
  updateSceneData
};