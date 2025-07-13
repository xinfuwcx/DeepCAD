export { SceneManager } from './SceneManager';
export { RendererManager } from './RendererManager';
export { GLTFLoader } from './GLTFLoader';
export { ModelManager } from './ModelManager';

export type {
  SceneLayer,
  SelectionOptions,
  BoundingBoxInfo
} from './SceneManager';

export type {
  PerformanceMetrics,
  RenderSettings,
  RenderLayer
} from './RendererManager';

export type {
  GLTFLoadOptions,
  LoadedModel,
  ModelCache
} from './GLTFLoader';

export type {
  ModelInstance,
  ModelGroup,
  ModelLibrary,
  ModelManagerEvents
} from './ModelManager';

// 工具函数
export const ThreeJSUtils = {
  // 计算包围盒
  calculateBoundingBox: (objects: THREE.Object3D[]): THREE.Box3 => {
    const box = new THREE.Box3();
    objects.forEach(obj => {
      const objBox = new THREE.Box3().setFromObject(obj);
      box.union(objBox);
    });
    return box;
  },

  // 计算包围球
  calculateBoundingSphere: (objects: THREE.Object3D[]): THREE.Sphere => {
    const box = ThreeJSUtils.calculateBoundingBox(objects);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    return sphere;
  },

  // 格式化内存大小
  formatMemorySize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 生成唯一ID
  generateId: (prefix: string = 'obj'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 相机自适应
  fitCameraToObject: (
    camera: THREE.Camera, 
    object: THREE.Object3D, 
    controls?: { target: THREE.Vector3 }
  ): void => {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (camera instanceof THREE.PerspectiveCamera) {
      const maxSize = Math.max(size.x, size.y, size.z);
      const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
      const fitWidthDistance = fitHeightDistance / camera.aspect;
      const distance = Math.max(fitHeightDistance, fitWidthDistance);

      const direction = camera.position.clone().sub(center).normalize();
      camera.position.copy(center).add(direction.multiplyScalar(distance * 1.5));
      
      if (controls) {
        controls.target.copy(center);
      }
    } else if (camera instanceof THREE.OrthographicCamera) {
      const maxSize = Math.max(size.x, size.y, size.z);
      camera.left = -maxSize;
      camera.right = maxSize;
      camera.top = maxSize;
      camera.bottom = -maxSize;
      camera.updateProjectionMatrix();
      
      camera.position.copy(center).add(new THREE.Vector3(0, 0, maxSize * 2));
      
      if (controls) {
        controls.target.copy(center);
      }
    }
  },

  // 优化几何体
  optimizeGeometry: (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
    // 合并重复顶点
    geometry = geometry.clone();
    const mergedGeometry = BufferGeometryUtils.mergeVertices(geometry);
    
    // 计算法线（如果没有）
    if (!mergedGeometry.attributes.normal) {
      mergedGeometry.computeVertexNormals();
    }
    
    // 计算包围盒和包围球
    mergedGeometry.computeBoundingBox();
    mergedGeometry.computeBoundingSphere();
    
    return mergedGeometry;
  },

  // 创建线框几何体
  createWireframeGeometry: (geometry: THREE.BufferGeometry): THREE.BufferGeometry => {
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    return wireframeGeometry;
  },

  // 创建包围盒助手
  createBoundingBoxHelper: (object: THREE.Object3D, color: number = 0xff0000): THREE.BoxHelper => {
    return new THREE.BoxHelper(object, color);
  },

  // 检查WebGL支持
  checkWebGLSupport: (): { webgl: boolean; webgl2: boolean; extensions: string[] } => {
    const canvas = document.createElement('canvas');
    
    const webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    const webgl2 = !!canvas.getContext('webgl2');
    
    let extensions: string[] = [];
    if (webgl) {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      extensions = gl ? gl.getSupportedExtensions() || [] : [];
    }
    
    return { webgl, webgl2, extensions };
  },

  // 设备性能检测
  detectDevicePerformance: (): 'high' | 'medium' | 'low' => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'low';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // 基于硬件信息的简单性能评估
    if (renderer.includes('NVIDIA') || renderer.includes('AMD')) {
      if (renderer.includes('RTX') || renderer.includes('RX')) return 'high';
      if (renderer.includes('GTX') || renderer.includes('R9')) return 'medium';
    }
    
    // 基于内存的评估
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize >= 8192) return 'high';
    if (maxTextureSize >= 4096) return 'medium';
    
    return 'low';
  }
};

// 常量定义
export const THREE_CONSTANTS = {
  // 默认材质配置
  DEFAULT_MATERIALS: {
    BASIC: {
      color: 0xffffff,
      transparent: false,
      opacity: 1.0
    },
    STANDARD: {
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.5,
      transparent: false,
      opacity: 1.0
    },
    WIREFRAME: {
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8
    }
  },

  // 默认光照配置
  DEFAULT_LIGHTS: {
    AMBIENT: {
      color: 0xffffff,
      intensity: 0.4
    },
    DIRECTIONAL: {
      color: 0xffffff,
      intensity: 0.8,
      position: [10, 10, 5],
      castShadow: true
    },
    POINT: {
      color: 0xffffff,
      intensity: 1.0,
      distance: 100,
      decay: 2
    }
  },

  // 默认相机配置
  DEFAULT_CAMERAS: {
    PERSPECTIVE: {
      fov: 45,
      near: 0.1,
      far: 1000,
      position: [10, 10, 10]
    },
    ORTHOGRAPHIC: {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
      near: 0.1,
      far: 1000,
      position: [10, 10, 10]
    }
  },

  // 文件格式支持
  SUPPORTED_FORMATS: {
    INPUT: ['.gltf', '.glb', '.obj', '.fbx', '.dae', '.3ds', '.ply', '.stl'],
    OUTPUT: ['.gltf', '.glb', '.obj', '.ply', '.stl']
  },

  // 质量预设
  QUALITY_PRESETS: {
    LOW: {
      pixelRatio: 1,
      antialias: false,
      shadowMapSize: 512,
      maxLights: 2
    },
    MEDIUM: {
      pixelRatio: 1.5,
      antialias: true,
      shadowMapSize: 1024,
      maxLights: 4
    },
    HIGH: {
      pixelRatio: 2,
      antialias: true,
      shadowMapSize: 2048,
      maxLights: 8
    },
    ULTRA: {
      pixelRatio: 2,
      antialias: true,
      shadowMapSize: 4096,
      maxLights: 16
    }
  }
};