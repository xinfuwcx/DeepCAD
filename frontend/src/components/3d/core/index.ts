import * as THREE from 'three';

// 导出核心组件
export { ModernAxisHelper } from './ModernAxisHelper';

// 简化的核心模块导出
export interface ViewportConfig {
  renderMode: 'wireframe' | 'solid' | 'transparent';
  showGrid: boolean;
  showAxes: boolean;
  backgroundColor: string;
  lighting: 'ambient' | 'directional' | 'point';
}

export interface ModelData {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

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
    }
  },

  // 创建包围盒助手
  createBoundingBoxHelper: (object: THREE.Object3D, color: number = 0xff0000): THREE.BoxHelper => {
    return new THREE.BoxHelper(object, color);
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
    }
  }
};