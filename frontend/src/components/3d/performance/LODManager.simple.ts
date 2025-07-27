import * as THREE from 'three';

export interface LODLevel {
  distance: number;
  geometry: THREE.BufferGeometry;
  material?: THREE.Material;
  visible: boolean;
  triangleCount: number;
  memoryUsage: number;
}

export interface LODObject {
  id: string;
  name: string;
  originalObject: THREE.Object3D;
  lodGroup: THREE.LOD;
  levels: LODLevel[];
  currentLevel: number;
  distance: number;
  autoLOD: boolean;
  priority: 'high' | 'medium' | 'low';
  lastUpdate: number;
}

export interface LODSettings {
  enableAutoLOD: boolean;
  maxDistance: number;
  qualityLevels: number;
  reductionFactor: number;
  updateFrequency: number;
  frustumCulling: boolean;
  occlusionCulling: boolean;
  adaptiveQuality: boolean;
}

/**
 * LOD (Level of Detail) 管理器 - 简化版
 * 解决500错误的精简版本
 */
export class LODManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private lodObjects: Map<string, LODObject> = new Map();
  private settings: LODSettings;
  
  // 性能监控
  private frameTime: number = 0;
  private targetFrameTime: number = 16.67; // 60 FPS
  private performanceBuffer: number[] = [];
  private bufferSize: number = 30;
  
  // 更新优化
  private updateTimer: number = 0;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor(scene: THREE.Scene, camera: THREE.Camera, settings: Partial<LODSettings> = {}) {
    this.scene = scene;
    this.camera = camera;
    
    this.settings = {
      enableAutoLOD: true,
      maxDistance: 100,
      qualityLevels: 3,
      reductionFactor: 0.5,
      updateFrequency: 100,
      frustumCulling: true,
      occlusionCulling: false,
      adaptiveQuality: true,
      ...settings
    };
  }

  /**
   * 创建简单LOD对象
   */
  public createLODObject(
    object: THREE.Object3D,
    options: {
      name?: string;
      autoGenerate?: boolean;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): LODObject {
    const id = this.generateId();
    const lodGroup = new THREE.LOD();
    
    const lodObject: LODObject = {
      id,
      name: options.name || object.name || `LOD_${id}`,
      originalObject: object,
      lodGroup,
      levels: [],
      currentLevel: 0,
      distance: 0,
      autoLOD: this.settings.enableAutoLOD,
      priority: options.priority || 'medium',
      lastUpdate: Date.now()
    };

    // 创建简单的单级LOD
    this.createDefaultLOD(lodObject);

    // 添加到场景
    lodGroup.position.copy(object.position);
    lodGroup.rotation.copy(object.rotation);
    lodGroup.scale.copy(object.scale);
    lodGroup.userData.lodObjectId = id;

    this.scene.add(lodGroup);
    this.lodObjects.set(id, lodObject);

    console.log(`✅ LOD对象创建: ${lodObject.name}`);
    return lodObject;
  }

  /**
   * 创建默认LOD (单级)
   */
  private createDefaultLOD(lodObject: LODObject): void {
    const originalObject = lodObject.originalObject;
    
    originalObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const level: LODLevel = {
          distance: 0,
          geometry: child.geometry.clone(),
          material: child.material,
          visible: true,
          triangleCount: this.getTriangleCount(child.geometry),
          memoryUsage: this.calculateGeometryMemory(child.geometry)
        };

        lodObject.levels.push(level);
        
        const lodMesh = new THREE.Mesh(level.geometry, level.material);
        lodMesh.userData.lodLevel = 0;
        lodObject.lodGroup.addLevel(lodMesh, 0);
      }
    });
  }

  /**
   * 计算三角形数量
   */
  private getTriangleCount(geometry: THREE.BufferGeometry): number {
    if (geometry.index) {
      return geometry.index.count / 3;
    } else if (geometry.attributes.position) {
      return geometry.attributes.position.count / 3;
    }
    return 0;
  }

  /**
   * 计算几何体内存使用量
   */
  private calculateGeometryMemory(geometry: THREE.BufferGeometry): number {
    let memory = 0;
    
    Object.keys(geometry.attributes).forEach(key => {
      const attribute = geometry.attributes[key];
      if (attribute && attribute.array) {
        memory += attribute.array.byteLength;
      }
    });

    if (geometry.index) {
      memory += geometry.index.array.byteLength;
    }

    return memory;
  }

  /**
   * 更新LOD系统 - 简化版
   */
  public update(deltaTime?: number): void {
    const now = Date.now();
    
    if (now - this.updateTimer < this.settings.updateFrequency) {
      return;
    }
    
    this.updateTimer = now;

    // 更新所有LOD对象
    this.lodObjects.forEach(lodObject => {
      this.updateLODObject(lodObject);
    });
  }

  /**
   * 更新单个LOD对象
   */
  private updateLODObject(lodObject: LODObject): void {
    // 计算距离
    const cameraPosition = new THREE.Vector3();
    const objectPosition = new THREE.Vector3();
    
    this.camera.getWorldPosition(cameraPosition);
    lodObject.lodGroup.getWorldPosition(objectPosition);
    
    lodObject.distance = cameraPosition.distanceTo(objectPosition);

    // 距离剔除
    if (lodObject.distance > this.settings.maxDistance) {
      lodObject.lodGroup.visible = false;
      return;
    } else {
      lodObject.lodGroup.visible = true;
    }

    // 更新LOD级别
    lodObject.lodGroup.update(this.camera);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `lod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取LOD统计信息
   */
  public getStatistics(): {
    totalObjects: number;
    visibleObjects: number;
    totalTriangles: number;
    totalMemory: number;
    averageFrameTime: number;
    levelDistribution: Record<number, number>;
  } {
    const stats = this.getStats();
    return {
      totalObjects: stats.totalObjects,
      visibleObjects: stats.visibleObjects,
      totalTriangles: stats.totalTriangles,
      totalMemory: stats.memoryUsage,
      averageFrameTime: this.frameTime,
      levelDistribution: { 0: stats.visibleObjects }
    };
  }

  /**
   * 获取LOD统计信息 - 兼容旧接口
   */
  public getStats(): {
    totalObjects: number;
    visibleObjects: number;
    totalTriangles: number;
    memoryUsage: number;
    averageLevel: number;
  } {
    let visibleObjects = 0;
    let totalTriangles = 0;
    let memoryUsage = 0;
    let levelSum = 0;

    this.lodObjects.forEach(lodObject => {
      if (lodObject.lodGroup.visible) {
        visibleObjects++;
        const currentLevel = lodObject.levels[lodObject.currentLevel];
        if (currentLevel) {
          totalTriangles += currentLevel.triangleCount;
          memoryUsage += currentLevel.memoryUsage;
        }
        levelSum += lodObject.currentLevel;
      }
    });

    return {
      totalObjects: this.lodObjects.size,
      visibleObjects,
      totalTriangles,
      memoryUsage,
      averageLevel: visibleObjects > 0 ? levelSum / visibleObjects : 0
    };
  }

  /**
   * 设置性能时间
   */
  public setFrameTime(frameTime: number): void {
    this.frameTime = frameTime;
  }

  /**
   * 更新设置
   */
  public updateSettings(settings: Partial<LODSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * 清理所有LOD对象
   */
  public dispose(): void {
    this.lodObjects.forEach(lodObject => {
      this.scene.remove(lodObject.lodGroup);
      
      lodObject.levels.forEach(level => {
        level.geometry.dispose();
        if (level.material && typeof level.material.dispose === 'function') {
          level.material.dispose();
        }
      });
    });

    this.lodObjects.clear();
    console.log('🧹 LOD管理器已清理');
  }
}