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
 * LOD (Level of Detail) 管理器
 * 根据距离和性能自动调整模型细节等级
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
  
  // 几何体简化工具
  private geometrySimplifier?: any; // 可选的几何体简化库

  constructor(scene: THREE.Scene, camera: THREE.Camera, settings: Partial<LODSettings> = {}) {
    this.scene = scene;
    this.camera = camera;
    
    this.settings = {
      enableAutoLOD: true,
      maxDistance: 100,
      qualityLevels: 4,
      reductionFactor: 0.5,
      updateFrequency: 100, // 毫秒
      frustumCulling: true,
      occlusionCulling: false,
      adaptiveQuality: true,
      ...settings
    };
  }

  /**
   * 创建LOD对象
   */
  public createLODObject(
    object: THREE.Object3D,
    options: {
      name?: string;
      autoGenerate?: boolean;
      distances?: number[];
      geometries?: THREE.BufferGeometry[];
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

    if (options.autoGenerate) {
      this.generateLODLevels(lodObject);
    } else if (options.geometries && options.distances) {
      this.createCustomLODLevels(lodObject, options.geometries, options.distances);
    } else {
      // 创建默认单级LOD
      this.createDefaultLOD(lodObject);
    }

    // 添加到场景
    lodGroup.position.copy(object.position);
    lodGroup.rotation.copy(object.rotation);
    lodGroup.scale.copy(object.scale);
    lodGroup.userData.lodObjectId = id;

    this.scene.add(lodGroup);
    this.lodObjects.set(id, lodObject);

    console.log(`✅ LOD对象创建: ${lodObject.name} (${lodObject.levels.length} 级)`);
    return lodObject;
  }

  /**
   * 自动生成LOD级别
   */
  private generateLODLevels(lodObject: LODObject): void {
    const originalObject = lodObject.originalObject;
    const levels = this.settings.qualityLevels;
    const maxDistance = this.settings.maxDistance;

    originalObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        for (let i = 0; i < levels; i++) {
          const distance = (maxDistance / levels) * i;
          const reductionFactor = Math.pow(this.settings.reductionFactor, i);
          
          let lodGeometry: THREE.BufferGeometry;
          let lodMaterial = child.material;

          if (i === 0) {
            // 最高质量级别使用原始几何体
            lodGeometry = child.geometry.clone();
          } else {
            // 简化几何体
            lodGeometry = this.simplifyGeometry(child.geometry, reductionFactor);
          }

          const triangleCount = this.getTriangleCount(lodGeometry);
          const memoryUsage = this.calculateGeometryMemory(lodGeometry);

          const level: LODLevel = {
            distance,
            geometry: lodGeometry,
            material: lodMaterial,
            visible: true,
            triangleCount,
            memoryUsage
          };

          lodObject.levels.push(level);

          // 创建LOD网格并添加到LOD组
          const lodMesh = new THREE.Mesh(lodGeometry, lodMaterial);
          lodMesh.userData.lodLevel = i;
          lodObject.lodGroup.addLevel(lodMesh, distance);
        }
      }
    });
  }

  /**
   * 创建自定义LOD级别
   */
  private createCustomLODLevels(
    lodObject: LODObject,
    geometries: THREE.BufferGeometry[],
    distances: number[]
  ): void {
    if (geometries.length !== distances.length) {
      console.warn('几何体数量和距离数量不匹配');
      return;
    }

    geometries.forEach((geometry, index) => {
      const distance = distances[index];
      const triangleCount = this.getTriangleCount(geometry);
      const memoryUsage = this.calculateGeometryMemory(geometry);

      const level: LODLevel = {
        distance,
        geometry: geometry.clone(),
        visible: true,
        triangleCount,
        memoryUsage
      };

      lodObject.levels.push(level);

      // 使用原始对象的材质
      let material: THREE.Material | THREE.Material[] | undefined;
      lodObject.originalObject.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          material = child.material;
        }
      });

      const lodMesh = new THREE.Mesh(geometry, material);
      lodMesh.userData.lodLevel = index;
      lodObject.lodGroup.addLevel(lodMesh, distance);
    });
  }

  /**
   * 创建默认LOD
   */
  private createDefaultLOD(lodObject: LODObject): void {
    lodObject.originalObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const triangleCount = this.getTriangleCount(child.geometry);
        const memoryUsage = this.calculateGeometryMemory(child.geometry);

        const level: LODLevel = {
          distance: 0,
          geometry: child.geometry.clone(),
          material: child.material,
          visible: true,
          triangleCount,
          memoryUsage
        };

        lodObject.levels.push(level);

        const lodMesh = new THREE.Mesh(child.geometry, child.material);
        lodMesh.userData.lodLevel = 0;
        lodObject.lodGroup.addLevel(lodMesh, 0);
      }
    });
  }

  /**
   * 简化几何体
   */
  private simplifyGeometry(
    geometry: THREE.BufferGeometry,
    reductionFactor: number
  ): THREE.BufferGeometry {
    // 如果有专用的简化库（如SimplifyModifier），使用它
    if (this.geometrySimplifier) {
      return this.geometrySimplifier.modify(geometry, reductionFactor);
    }

    // 简单的顶点抽取简化
    const simplified = geometry.clone();
    
    if (simplified.index) {
      const indexArray = simplified.index.array;
      const targetCount = Math.floor(indexArray.length * reductionFactor);
      const step = Math.floor(indexArray.length / targetCount);
      
      const newIndices = [];
      for (let i = 0; i < indexArray.length; i += step) {
        if (newIndices.length < targetCount) {
          newIndices.push(indexArray[i]);
        }
      }
      
      simplified.setIndex(newIndices);
    }

    return simplified;
  }

  /**
   * 获取三角形数量
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
    
    Object.values(geometry.attributes).forEach(attribute => {
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
   * 更新LOD系统
   */
  public update(deltaTime: number): void {
    if (!this.settings.enableAutoLOD) return;

    this.updateTimer += deltaTime;
    
    if (this.updateTimer < this.settings.updateFrequency) return;
    this.updateTimer = 0;

    // 更新性能监控
    this.updatePerformanceMonitoring(deltaTime);

    // 更新视锥体矩阵
    if (this.settings.frustumCulling) {
      this.cameraMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    }

    // 更新每个LOD对象
    this.lodObjects.forEach(lodObject => {
      this.updateLODObject(lodObject);
    });

    // 自适应质量调整
    if (this.settings.adaptiveQuality) {
      this.adaptiveQualityAdjustment();
    }
  }

  /**
   * 更新单个LOD对象
   */
  private updateLODObject(lodObject: LODObject): void {
    if (!lodObject.autoLOD) return;

    // 计算到相机的距离
    const cameraPosition = this.camera.position;
    const objectPosition = lodObject.lodGroup.position;
    const distance = cameraPosition.distanceTo(objectPosition);
    lodObject.distance = distance;

    // 视锥体剔除
    if (this.settings.frustumCulling) {
      const boundingBox = new THREE.Box3().setFromObject(lodObject.lodGroup);
      const visible = this.frustum.intersectsBox(boundingBox);
      lodObject.lodGroup.visible = visible;
      
      if (!visible) return; // 不在视野内，跳过LOD更新
    }

    // 更新LOD级别
    lodObject.lodGroup.update(this.camera);

    // 记录当前级别
    const currentObject = lodObject.lodGroup.getCurrentLevel();
    if (currentObject && currentObject.userData.lodLevel !== undefined) {
      lodObject.currentLevel = currentObject.userData.lodLevel;
    }

    lodObject.lastUpdate = Date.now();
  }

  /**
   * 性能监控
   */
  private updatePerformanceMonitoring(deltaTime: number): void {
    this.frameTime = deltaTime;
    this.performanceBuffer.push(deltaTime);
    
    if (this.performanceBuffer.length > this.bufferSize) {
      this.performanceBuffer.shift();
    }
  }

  /**
   * 自适应质量调整
   */
  private adaptiveQualityAdjustment(): void {
    const averageFrameTime = this.performanceBuffer.reduce((a, b) => a + b, 0) / this.performanceBuffer.length;
    
    if (averageFrameTime > this.targetFrameTime * 1.5) {
      // 性能不足，降低质量
      this.adjustQualityDown();
    } else if (averageFrameTime < this.targetFrameTime * 0.8) {
      // 性能充足，提高质量
      this.adjustQualityUp();
    }
  }

  /**
   * 降低质量
   */
  private adjustQualityDown(): void {
    this.lodObjects.forEach(lodObject => {
      // 增加LOD距离，更早使用低质量模型
      lodObject.levels.forEach(level => {
        level.distance *= 0.9;
      });
      
      // 重新构建LOD组
      this.rebuildLODGroup(lodObject);
    });
    
    console.log('🔽 自适应质量调整: 降低质量');
  }

  /**
   * 提高质量
   */
  private adjustQualityUp(): void {
    this.lodObjects.forEach(lodObject => {
      // 减少LOD距离，更晚使用低质量模型
      lodObject.levels.forEach(level => {
        level.distance *= 1.1;
      });
      
      // 重新构建LOD组
      this.rebuildLODGroup(lodObject);
    });
    
    console.log('🔼 自适应质量调整: 提高质量');
  }

  /**
   * 重新构建LOD组
   */
  private rebuildLODGroup(lodObject: LODObject): void {
    // 清除现有级别
    while (lodObject.lodGroup.levels.length > 0) {
      lodObject.lodGroup.removeLevel(0);
    }

    // 重新添加级别
    lodObject.levels.forEach((level, index) => {
      const mesh = new THREE.Mesh(level.geometry, level.material);
      mesh.userData.lodLevel = index;
      lodObject.lodGroup.addLevel(mesh, level.distance);
    });
  }

  /**
   * 设置LOD对象的自动模式
   */
  public setAutoLOD(id: string, enabled: boolean): void {
    const lodObject = this.lodObjects.get(id);
    if (lodObject) {
      lodObject.autoLOD = enabled;
    }
  }

  /**
   * 手动设置LOD级别
   */
  public setLODLevel(id: string, level: number): void {
    const lodObject = this.lodObjects.get(id);
    if (!lodObject || level < 0 || level >= lodObject.levels.length) return;

    lodObject.autoLOD = false;
    lodObject.currentLevel = level;
    
    // 直接显示指定级别
    lodObject.lodGroup.children.forEach((child, index) => {
      child.visible = index === level;
    });
  }

  /**
   * 移除LOD对象
   */
  public removeLODObject(id: string): boolean {
    const lodObject = this.lodObjects.get(id);
    if (!lodObject) return false;

    this.scene.remove(lodObject.lodGroup);
    
    // 清理几何体
    lodObject.levels.forEach(level => {
      level.geometry.dispose();
    });

    this.lodObjects.delete(id);
    console.log(`🗑️ LOD对象已移除: ${lodObject.name}`);
    return true;
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
    let totalTriangles = 0;
    let totalMemory = 0;
    let visibleObjects = 0;
    const levelDistribution: Record<number, number> = {};

    this.lodObjects.forEach(lodObject => {
      if (lodObject.lodGroup.visible) {
        visibleObjects++;
        const currentLevel = lodObject.levels[lodObject.currentLevel];
        if (currentLevel) {
          totalTriangles += currentLevel.triangleCount;
          totalMemory += currentLevel.memoryUsage;
          
          levelDistribution[lodObject.currentLevel] = 
            (levelDistribution[lodObject.currentLevel] || 0) + 1;
        }
      }
    });

    const averageFrameTime = this.performanceBuffer.length > 0 
      ? this.performanceBuffer.reduce((a, b) => a + b, 0) / this.performanceBuffer.length
      : 0;

    return {
      totalObjects: this.lodObjects.size,
      visibleObjects,
      totalTriangles,
      totalMemory,
      averageFrameTime,
      levelDistribution
    };
  }

  /**
   * 获取LOD对象信息
   */
  public getLODObject(id: string): LODObject | undefined {
    return this.lodObjects.get(id);
  }

  /**
   * 获取所有LOD对象
   */
  public getAllLODObjects(): LODObject[] {
    return Array.from(this.lodObjects.values());
  }

  /**
   * 更新设置
   */
  public updateSettings(settings: Partial<LODSettings>): void {
    this.settings = { ...this.settings, ...settings };
    
    // 重新应用设置到所有LOD对象
    this.lodObjects.forEach(lodObject => {
      if (settings.enableAutoLOD !== undefined) {
        lodObject.autoLOD = settings.enableAutoLOD;
      }
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `lod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.lodObjects.forEach(lodObject => {
      this.removeLODObject(lodObject.id);
    });
    
    this.lodObjects.clear();
    console.log('🧹 LOD管理器已清理');
  }
}