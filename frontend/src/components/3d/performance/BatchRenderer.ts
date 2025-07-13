import * as THREE from 'three';

export interface BatchGroup {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  instances: BatchInstance[];
  instancedMesh: THREE.InstancedMesh;
  maxInstances: number;
  currentCount: number;
  visible: boolean;
  frustumCulled: boolean;
  sortTransparent: boolean;
}

export interface BatchInstance {
  id: string;
  matrix: THREE.Matrix4;
  color?: THREE.Color;
  visible: boolean;
  userData: any;
  distance?: number;
}

export interface BatchSettings {
  maxInstancesPerBatch: number;
  enableFrustumCulling: boolean;
  enableDistanceCulling: boolean;
  maxDistance: number;
  sortTransparentObjects: boolean;
  updateFrequency: number;
  enableOcclusionCulling: boolean;
}

/**
 * 批量渲染管理器
 * 使用InstancedMesh优化大量相同几何体的渲染性能
 */
export class BatchRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private batchGroups: Map<string, BatchGroup> = new Map();
  private settings: BatchSettings;
  
  // 性能监控
  private drawCalls: number = 0;
  private instanceCount: number = 0;
  private lastUpdateTime: number = 0;
  
  // 临时变量（避免频繁创建）
  private tempMatrix = new THREE.Matrix4();
  private tempVector = new THREE.Vector3();
  private tempBox = new THREE.Box3();
  private frustum = new THREE.Frustum();
  private cameraMatrix = new THREE.Matrix4();

  constructor(scene: THREE.Scene, camera: THREE.Camera, settings: Partial<BatchSettings> = {}) {
    this.scene = scene;
    this.camera = camera;
    
    this.settings = {
      maxInstancesPerBatch: 1000,
      enableFrustumCulling: true,
      enableDistanceCulling: true,
      maxDistance: 200,
      sortTransparentObjects: true,
      updateFrequency: 100,
      enableOcclusionCulling: false,
      ...settings
    };
  }

  /**
   * 创建批次组
   */
  public createBatchGroup(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    options: {
      name?: string;
      maxInstances?: number;
      frustumCulled?: boolean;
      sortTransparent?: boolean;
    } = {}
  ): string {
    const id = this.generateId();
    const maxInstances = options.maxInstances || this.settings.maxInstancesPerBatch;
    
    // 创建实例化网格
    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.frustumCulled = options.frustumCulled !== false;
    
    // 如果材质支持，添加实例颜色
    if (material instanceof THREE.MeshStandardMaterial || 
        material instanceof THREE.MeshBasicMaterial) {
      instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(maxInstances * 3), 3
      );
      instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }

    const batchGroup: BatchGroup = {
      id,
      name: options.name || `Batch_${id}`,
      geometry: geometry.clone(),
      material,
      instances: [],
      instancedMesh,
      maxInstances,
      currentCount: 0,
      visible: true,
      frustumCulled: options.frustumCulled !== false,
      sortTransparent: options.sortTransparent !== false
    };

    this.batchGroups.set(id, batchGroup);
    this.scene.add(instancedMesh);

    console.log(`✅ 批次组创建: ${batchGroup.name} (最大 ${maxInstances} 实例)`);
    return id;
  }

  /**
   * 添加实例到批次组
   */
  public addInstance(
    batchId: string,
    transform: {
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: THREE.Vector3;
    },
    options: {
      color?: THREE.Color;
      visible?: boolean;
      userData?: any;
    } = {}
  ): string | null {
    const batchGroup = this.batchGroups.get(batchId);
    if (!batchGroup) {
      console.warn(`批次组不存在: ${batchId}`);
      return null;
    }

    if (batchGroup.currentCount >= batchGroup.maxInstances) {
      console.warn(`批次组已满: ${batchGroup.name}`);
      return null;
    }

    const instanceId = this.generateId();
    const matrix = new THREE.Matrix4();
    
    // 构建变换矩阵
    matrix.makeRotationFromEuler(transform.rotation);
    matrix.scale(transform.scale);
    matrix.setPosition(transform.position);

    const instance: BatchInstance = {
      id: instanceId,
      matrix: matrix.clone(),
      color: options.color,
      visible: options.visible !== false,
      userData: options.userData || {}
    };

    batchGroup.instances.push(instance);
    this.updateInstanceMatrix(batchGroup, batchGroup.currentCount, instance);
    
    if (options.color && batchGroup.instancedMesh.instanceColor) {
      this.updateInstanceColor(batchGroup, batchGroup.currentCount, options.color);
    }

    batchGroup.currentCount++;
    batchGroup.instancedMesh.count = batchGroup.currentCount;

    return instanceId;
  }

  /**
   * 更新实例
   */
  public updateInstance(
    batchId: string,
    instanceId: string,
    updates: {
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
      color?: THREE.Color;
      visible?: boolean;
      userData?: any;
    }
  ): boolean {
    const batchGroup = this.batchGroups.get(batchId);
    if (!batchGroup) return false;

    const instanceIndex = batchGroup.instances.findIndex(inst => inst.id === instanceId);
    if (instanceIndex === -1) return false;

    const instance = batchGroup.instances[instanceIndex];

    // 更新变换
    if (updates.position || updates.rotation || updates.scale) {
      const position = updates.position || this.tempVector.setFromMatrixPosition(instance.matrix);
      const rotation = updates.rotation || new THREE.Euler().setFromRotationMatrix(instance.matrix);
      const scale = updates.scale || this.tempVector.setFromMatrixScale(instance.matrix);

      instance.matrix.makeRotationFromEuler(rotation);
      instance.matrix.scale(scale);
      instance.matrix.setPosition(position);

      this.updateInstanceMatrix(batchGroup, instanceIndex, instance);
    }

    // 更新颜色
    if (updates.color) {
      instance.color = updates.color;
      this.updateInstanceColor(batchGroup, instanceIndex, updates.color);
    }

    // 更新可见性
    if (updates.visible !== undefined) {
      instance.visible = updates.visible;
    }

    // 更新用户数据
    if (updates.userData) {
      instance.userData = { ...instance.userData, ...updates.userData };
    }

    return true;
  }

  /**
   * 移除实例
   */
  public removeInstance(batchId: string, instanceId: string): boolean {
    const batchGroup = this.batchGroups.get(batchId);
    if (!batchGroup) return false;

    const instanceIndex = batchGroup.instances.findIndex(inst => inst.id === instanceId);
    if (instanceIndex === -1) return false;

    // 移除实例
    batchGroup.instances.splice(instanceIndex, 1);
    batchGroup.currentCount--;

    // 重新构建实例矩阵
    this.rebuildInstanceMatrices(batchGroup);
    
    batchGroup.instancedMesh.count = batchGroup.currentCount;
    return true;
  }

  /**
   * 更新实例矩阵
   */
  private updateInstanceMatrix(batchGroup: BatchGroup, index: number, instance: BatchInstance): void {
    batchGroup.instancedMesh.setMatrixAt(index, instance.matrix);
    batchGroup.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 更新实例颜色
   */
  private updateInstanceColor(batchGroup: BatchGroup, index: number, color: THREE.Color): void {
    if (batchGroup.instancedMesh.instanceColor) {
      batchGroup.instancedMesh.setColorAt(index, color);
      batchGroup.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * 重新构建实例矩阵
   */
  private rebuildInstanceMatrices(batchGroup: BatchGroup): void {
    batchGroup.instances.forEach((instance, index) => {
      this.updateInstanceMatrix(batchGroup, index, instance);
      
      if (instance.color && batchGroup.instancedMesh.instanceColor) {
        this.updateInstanceColor(batchGroup, index, instance.color);
      }
    });
  }

  /**
   * 更新批量渲染系统
   */
  public update(deltaTime: number): void {
    const currentTime = performance.now();
    
    if (currentTime - this.lastUpdateTime < this.settings.updateFrequency) {
      return;
    }
    
    this.lastUpdateTime = currentTime;

    // 更新视锥体
    if (this.settings.enableFrustumCulling || this.settings.enableDistanceCulling) {
      this.cameraMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    }

    // 更新每个批次组
    this.batchGroups.forEach(batchGroup => {
      this.updateBatchGroup(batchGroup);
    });

    // 更新统计信息
    this.updateStatistics();
  }

  /**
   * 更新单个批次组
   */
  private updateBatchGroup(batchGroup: BatchGroup): void {
    if (!batchGroup.visible) {
      batchGroup.instancedMesh.visible = false;
      return;
    }

    let visibleCount = 0;
    const cameraPosition = this.camera.position;
    
    // 距离排序（用于透明对象）
    if (batchGroup.sortTransparent && 
        batchGroup.material.transparent) {
      batchGroup.instances.forEach(instance => {
        this.tempVector.setFromMatrixPosition(instance.matrix);
        instance.distance = cameraPosition.distanceTo(this.tempVector);
      });
      
      batchGroup.instances.sort((a, b) => (b.distance || 0) - (a.distance || 0));
      this.rebuildInstanceMatrices(batchGroup);
    }

    // 剔除和可见性检查
    batchGroup.instances.forEach((instance, index) => {
      if (!instance.visible) return;

      this.tempVector.setFromMatrixPosition(instance.matrix);
      
      // 距离剔除
      if (this.settings.enableDistanceCulling) {
        const distance = cameraPosition.distanceTo(this.tempVector);
        if (distance > this.settings.maxDistance) {
          return;
        }
      }

      // 视锥体剔除
      if (this.settings.enableFrustumCulling && batchGroup.frustumCulled) {
        // 简化的点测试，实际应该使用包围盒
        if (!this.frustum.containsPoint(this.tempVector)) {
          return;
        }
      }

      visibleCount++;
    });

    batchGroup.instancedMesh.visible = visibleCount > 0;
  }

  /**
   * 合并批次组
   */
  public mergeBatchGroups(sourceBatchId: string, targetBatchId: string): boolean {
    const sourceBatch = this.batchGroups.get(sourceBatchId);
    const targetBatch = this.batchGroups.get(targetBatchId);
    
    if (!sourceBatch || !targetBatch) return false;
    
    // 检查是否可以合并（几何体和材质必须兼容）
    if (!this.canMergeBatches(sourceBatch, targetBatch)) {
      console.warn('批次组不兼容，无法合并');
      return false;
    }

    // 检查目标批次容量
    const totalInstances = sourceBatch.currentCount + targetBatch.currentCount;
    if (totalInstances > targetBatch.maxInstances) {
      console.warn('目标批次容量不足');
      return false;
    }

    // 移动实例
    sourceBatch.instances.forEach(instance => {
      targetBatch.instances.push(instance);
      this.updateInstanceMatrix(targetBatch, targetBatch.currentCount, instance);
      
      if (instance.color && targetBatch.instancedMesh.instanceColor) {
        this.updateInstanceColor(targetBatch, targetBatch.currentCount, instance.color);
      }
      
      targetBatch.currentCount++;
    });

    targetBatch.instancedMesh.count = targetBatch.currentCount;

    // 删除源批次组
    this.removeBatchGroup(sourceBatchId);
    
    console.log(`🔗 批次组合并: ${sourceBatch.name} -> ${targetBatch.name}`);
    return true;
  }

  /**
   * 检查批次组是否可以合并
   */
  private canMergeBatches(batch1: BatchGroup, batch2: BatchGroup): boolean {
    // 简化检查：几何体和材质类型是否相同
    return batch1.geometry.constructor === batch2.geometry.constructor &&
           batch1.material.constructor === batch2.material.constructor;
  }

  /**
   * 自动优化批次组
   */
  public optimizeBatches(): void {
    const batches = Array.from(this.batchGroups.values());
    
    // 查找可以合并的批次组
    for (let i = 0; i < batches.length; i++) {
      for (let j = i + 1; j < batches.length; j++) {
        const batch1 = batches[i];
        const batch2 = batches[j];
        
        if (this.canMergeBatches(batch1, batch2) &&
            batch1.currentCount + batch2.currentCount <= Math.max(batch1.maxInstances, batch2.maxInstances)) {
          
          // 合并到容量更大的批次
          const targetBatch = batch1.maxInstances >= batch2.maxInstances ? batch1 : batch2;
          const sourceBatch = targetBatch === batch1 ? batch2 : batch1;
          
          this.mergeBatchGroups(sourceBatch.id, targetBatch.id);
          break;
        }
      }
    }
    
    console.log('🔧 批次组优化完成');
  }

  /**
   * 移除批次组
   */
  public removeBatchGroup(batchId: string): boolean {
    const batchGroup = this.batchGroups.get(batchId);
    if (!batchGroup) return false;

    this.scene.remove(batchGroup.instancedMesh);
    
    // 清理几何体和材质
    batchGroup.geometry.dispose();
    if (batchGroup.instancedMesh.instanceColor) {
      batchGroup.instancedMesh.instanceColor.dispose();
    }

    this.batchGroups.delete(batchId);
    console.log(`🗑️ 批次组已移除: ${batchGroup.name}`);
    return true;
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    this.drawCalls = this.batchGroups.size;
    this.instanceCount = 0;
    
    this.batchGroups.forEach(batchGroup => {
      if (batchGroup.visible && batchGroup.instancedMesh.visible) {
        this.instanceCount += batchGroup.currentCount;
      }
    });
  }

  /**
   * 获取统计信息
   */
  public getStatistics(): {
    batchCount: number;
    drawCalls: number;
    totalInstances: number;
    visibleInstances: number;
    memoryUsage: number;
    savedDrawCalls: number;
  } {
    let visibleInstances = 0;
    let memoryUsage = 0;
    let totalInstances = 0;

    this.batchGroups.forEach(batchGroup => {
      totalInstances += batchGroup.currentCount;
      
      if (batchGroup.visible && batchGroup.instancedMesh.visible) {
        visibleInstances += batchGroup.currentCount;
      }
      
      // 估算内存使用量
      memoryUsage += batchGroup.geometry.attributes.position.array.byteLength;
      if (batchGroup.instancedMesh.instanceMatrix) {
        memoryUsage += batchGroup.instancedMesh.instanceMatrix.array.byteLength;
      }
      if (batchGroup.instancedMesh.instanceColor) {
        memoryUsage += batchGroup.instancedMesh.instanceColor.array.byteLength;
      }
    });

    // 计算节省的绘制调用数
    const savedDrawCalls = Math.max(0, totalInstances - this.drawCalls);

    return {
      batchCount: this.batchGroups.size,
      drawCalls: this.drawCalls,
      totalInstances,
      visibleInstances,
      memoryUsage,
      savedDrawCalls
    };
  }

  /**
   * 获取批次组信息
   */
  public getBatchGroup(batchId: string): BatchGroup | undefined {
    return this.batchGroups.get(batchId);
  }

  /**
   * 获取所有批次组
   */
  public getAllBatchGroups(): BatchGroup[] {
    return Array.from(this.batchGroups.values());
  }

  /**
   * 更新设置
   */
  public updateSettings(settings: Partial<BatchSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.batchGroups.forEach(batchGroup => {
      this.removeBatchGroup(batchGroup.id);
    });
    
    this.batchGroups.clear();
    console.log('🧹 批量渲染器已清理');
  }
}