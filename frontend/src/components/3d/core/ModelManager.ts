import * as THREE from 'three';
import { GLTFLoader, LoadedModel } from './GLTFLoader';

export interface ModelInstance {
  id: string;
  name: string;
  model: LoadedModel;
  object3D: THREE.Object3D;
  transform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  layer: string;
  tags: string[];
  userData: any;
  createdAt: number;
  lastModified: number;
}

export interface ModelGroup {
  id: string;
  name: string;
  instances: string[];
  visible: boolean;
  transform: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
  tags: string[];
  userData: any;
}

export interface ModelLibrary {
  id: string;
  name: string;
  description: string;
  models: LoadedModel[];
  tags: string[];
  category: string;
  thumbnailUrl?: string;
  createdAt: number;
}

export interface ModelManagerEvents {
  instanceAdded: (instance: ModelInstance) => void;
  instanceRemoved: (instanceId: string) => void;
  instanceUpdated: (instance: ModelInstance) => void;
  groupCreated: (group: ModelGroup) => void;
  groupRemoved: (groupId: string) => void;
  groupUpdated: (group: ModelGroup) => void;
  libraryCreated: (library: ModelLibrary) => void;
  libraryRemoved: (libraryId: string) => void;
  selectionChanged: (selectedIds: string[]) => void;
}

/**
 * 高级模型管理系统
 * 负责模型实例化、分组、库管理、变换控制、选择管理等
 */
export class ModelManager {
  private gltfLoader: GLTFLoader;
  private scene: THREE.Scene;
  private instances: Map<string, ModelInstance> = new Map();
  private groups: Map<string, ModelGroup> = new Map();
  private libraries: Map<string, ModelLibrary> = new Map();
  private selectedInstances: Set<string> = new Set();
  
  // 事件监听器
  private eventListeners: Partial<ModelManagerEvents> = {};
  
  // 变换工具
  private transformGroup: THREE.Group;
  private instanceLookup: Map<THREE.Object3D, string> = new Map();
  
  // 性能统计
  private stats = {
    totalInstances: 0,
    visibleInstances: 0,
    totalTriangles: 0,
    totalMemory: 0,
    drawCalls: 0
  };

  constructor(scene: THREE.Scene, renderer?: THREE.WebGLRenderer) {
    this.scene = scene;
    this.gltfLoader = new GLTFLoader(renderer);
    this.transformGroup = new THREE.Group();
    this.transformGroup.name = 'ModelManager_TransformGroup';
    this.scene.add(this.transformGroup);
  }

  /**
   * 加载并创建模型实例
   */
  public async createInstance(
    url: string,
    options: {
      name?: string;
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
      layer?: string;
      tags?: string[];
      visible?: boolean;
      castShadow?: boolean;
      receiveShadow?: boolean;
      userData?: any;
    } = {}
  ): Promise<ModelInstance> {
    try {
      // 加载模型
      const model = await this.gltfLoader.loadModel(url);
      
      // 克隆场景对象
      const object3D = model.scene.clone();
      
      // 生成实例ID
      const instanceId = this.generateInstanceId();
      
      // 创建实例
      const instance: ModelInstance = {
        id: instanceId,
        name: options.name || model.name || `Instance_${instanceId}`,
        model,
        object3D,
        transform: {
          position: options.position?.clone() || new THREE.Vector3(),
          rotation: options.rotation?.clone() || new THREE.Euler(),
          scale: options.scale?.clone() || new THREE.Vector3(1, 1, 1)
        },
        visible: options.visible !== false,
        castShadow: options.castShadow || false,
        receiveShadow: options.receiveShadow || false,
        layer: options.layer || 'default',
        tags: options.tags || [],
        userData: options.userData || {},
        createdAt: Date.now(),
        lastModified: Date.now()
      };

      // 应用变换
      this.applyTransform(instance);
      
      // 设置阴影
      this.updateShadowSettings(instance);
      
      // 添加到场景
      this.transformGroup.add(object3D);
      
      // 建立对象查找映射
      this.buildObjectLookup(object3D, instanceId);
      
      // 存储实例
      this.instances.set(instanceId, instance);
      
      // 更新统计
      this.updateStats();
      
      // 触发事件
      this.eventListeners.instanceAdded?.(instance);
      
      console.log(`✅ 模型实例创建成功: ${instance.name} (${instanceId})`);
      return instance;

    } catch (error) {
      console.error('❌ 模型实例创建失败:', error);
      throw error;
    }
  }

  /**
   * 从现有模型创建实例
   */
  public createInstanceFromModel(
    model: LoadedModel,
    options: {
      name?: string;
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
      layer?: string;
      tags?: string[];
      visible?: boolean;
      castShadow?: boolean;
      receiveShadow?: boolean;
      userData?: any;
    } = {}
  ): ModelInstance {
    const object3D = model.scene.clone();
    const instanceId = this.generateInstanceId();
    
    const instance: ModelInstance = {
      id: instanceId,
      name: options.name || model.name || `Instance_${instanceId}`,
      model,
      object3D,
      transform: {
        position: options.position?.clone() || new THREE.Vector3(),
        rotation: options.rotation?.clone() || new THREE.Euler(),
        scale: options.scale?.clone() || new THREE.Vector3(1, 1, 1)
      },
      visible: options.visible !== false,
      castShadow: options.castShadow || false,
      receiveShadow: options.receiveShadow || false,
      layer: options.layer || 'default',
      tags: options.tags || [],
      userData: options.userData || {},
      createdAt: Date.now(),
      lastModified: Date.now()
    };

    this.applyTransform(instance);
    this.updateShadowSettings(instance);
    this.transformGroup.add(object3D);
    this.buildObjectLookup(object3D, instanceId);
    this.instances.set(instanceId, instance);
    this.updateStats();
    
    this.eventListeners.instanceAdded?.(instance);
    return instance;
  }

  /**
   * 移除模型实例
   */
  public removeInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    // 从场景中移除
    this.transformGroup.remove(instance.object3D);
    
    // 清理对象查找映射
    this.clearObjectLookup(instance.object3D);
    
    // 从选择中移除
    this.selectedInstances.delete(instanceId);
    
    // 释放资源
    this.disposeInstance(instance);
    
    // 移除实例
    this.instances.delete(instanceId);
    
    // 更新统计
    this.updateStats();
    
    // 触发事件
    this.eventListeners.instanceRemoved?.(instanceId);
    
    console.log(`🗑️ 模型实例已移除: ${instance.name} (${instanceId})`);
    return true;
  }

  /**
   * 更新模型实例
   */
  public updateInstance(
    instanceId: string,
    updates: Partial<Pick<ModelInstance, 'name' | 'visible' | 'castShadow' | 'receiveShadow' | 'layer' | 'tags' | 'userData'>>
  ): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    // 应用更新
    Object.assign(instance, updates);
    instance.lastModified = Date.now();

    // 更新可见性
    if ('visible' in updates) {
      instance.object3D.visible = instance.visible;
    }

    // 更新阴影设置
    if ('castShadow' in updates || 'receiveShadow' in updates) {
      this.updateShadowSettings(instance);
    }

    // 更新统计
    this.updateStats();
    
    // 触发事件
    this.eventListeners.instanceUpdated?.(instance);
    
    return true;
  }

  /**
   * 设置实例变换
   */
  public setInstanceTransform(
    instanceId: string,
    transform: {
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
    }
  ): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    if (transform.position) {
      instance.transform.position.copy(transform.position);
    }
    if (transform.rotation) {
      instance.transform.rotation.copy(transform.rotation);
    }
    if (transform.scale) {
      instance.transform.scale.copy(transform.scale);
    }

    this.applyTransform(instance);
    instance.lastModified = Date.now();
    
    this.eventListeners.instanceUpdated?.(instance);
    return true;
  }

  /**
   * 创建模型组
   */
  public createGroup(
    name: string,
    instanceIds: string[],
    options: {
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
      tags?: string[];
      userData?: any;
    } = {}
  ): ModelGroup {
    const groupId = this.generateGroupId();
    
    const group: ModelGroup = {
      id: groupId,
      name,
      instances: instanceIds.filter(id => this.instances.has(id)),
      visible: true,
      transform: {
        position: options.position?.clone() || new THREE.Vector3(),
        rotation: options.rotation?.clone() || new THREE.Euler(),
        scale: options.scale?.clone() || new THREE.Vector3(1, 1, 1)
      },
      tags: options.tags || [],
      userData: options.userData || {}
    };

    this.groups.set(groupId, group);
    this.eventListeners.groupCreated?.(group);
    
    console.log(`📁 模型组创建成功: ${name} (${group.instances.length} 个实例)`);
    return group;
  }

  /**
   * 选择实例
   */
  public selectInstances(instanceIds: string[], addToSelection: boolean = false): void {
    if (!addToSelection) {
      this.selectedInstances.clear();
    }

    instanceIds.forEach(id => {
      if (this.instances.has(id)) {
        this.selectedInstances.add(id);
      }
    });

    this.eventListeners.selectionChanged?.(Array.from(this.selectedInstances));
  }

  /**
   * 取消选择实例
   */
  public deselectInstances(instanceIds: string[]): void {
    instanceIds.forEach(id => {
      this.selectedInstances.delete(id);
    });

    this.eventListeners.selectionChanged?.(Array.from(this.selectedInstances));
  }

  /**
   * 清空选择
   */
  public clearSelection(): void {
    this.selectedInstances.clear();
    this.eventListeners.selectionChanged?.([]);
  }

  /**
   * 通过射线检测选择实例
   */
  public selectByRaycast(
    raycaster: THREE.Raycaster,
    addToSelection: boolean = false
  ): ModelInstance | null {
    const intersects = raycaster.intersectObject(this.transformGroup, true);
    
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
      const instanceId = this.findInstanceIdForObject(intersectedObject);
      
      if (instanceId) {
        this.selectInstances([instanceId], addToSelection);
        return this.instances.get(instanceId) || null;
      }
    }

    if (!addToSelection) {
      this.clearSelection();
    }

    return null;
  }

  /**
   * 按标签查找实例
   */
  public findInstancesByTag(tag: string): ModelInstance[] {
    return Array.from(this.instances.values()).filter(instance =>
      instance.tags.includes(tag)
    );
  }

  /**
   * 按图层查找实例
   */
  public findInstancesByLayer(layer: string): ModelInstance[] {
    return Array.from(this.instances.values()).filter(instance =>
      instance.layer === layer
    );
  }

  /**
   * 获取实例
   */
  public getInstance(instanceId: string): ModelInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * 获取所有实例
   */
  public getAllInstances(): ModelInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * 获取选中的实例
   */
  public getSelectedInstances(): ModelInstance[] {
    return Array.from(this.selectedInstances)
      .map(id => this.instances.get(id))
      .filter(Boolean) as ModelInstance[];
  }

  /**
   * 应用变换到实例
   */
  private applyTransform(instance: ModelInstance): void {
    const { object3D, transform } = instance;
    object3D.position.copy(transform.position);
    object3D.rotation.copy(transform.rotation);
    object3D.scale.copy(transform.scale);
  }

  /**
   * 更新阴影设置
   */
  private updateShadowSettings(instance: ModelInstance): void {
    instance.object3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = instance.castShadow;
        child.receiveShadow = instance.receiveShadow;
      }
    });
  }

  /**
   * 建立对象查找映射
   */
  private buildObjectLookup(object: THREE.Object3D, instanceId: string): void {
    this.instanceLookup.set(object, instanceId);
    object.children.forEach(child => {
      this.buildObjectLookup(child, instanceId);
    });
  }

  /**
   * 清理对象查找映射
   */
  private clearObjectLookup(object: THREE.Object3D): void {
    this.instanceLookup.delete(object);
    object.children.forEach(child => {
      this.clearObjectLookup(child);
    });
  }

  /**
   * 查找对象对应的实例ID
   */
  private findInstanceIdForObject(object: THREE.Object3D): string | undefined {
    let current = object;
    while (current) {
      const instanceId = this.instanceLookup.get(current);
      if (instanceId) return instanceId;
      current = current.parent!;
    }
    return undefined;
  }

  /**
   * 释放实例资源
   */
  private disposeInstance(instance: ModelInstance): void {
    // Three.js对象会被垃圾回收器处理
    // 这里主要清理引用
    instance.object3D.clear();
  }

  /**
   * 更新性能统计
   */
  private updateStats(): void {
    this.stats.totalInstances = this.instances.size;
    this.stats.visibleInstances = Array.from(this.instances.values())
      .filter(instance => instance.visible).length;
    
    let totalTriangles = 0;
    let totalMemory = 0;
    
    this.instances.forEach(instance => {
      totalMemory += instance.model.memory.total;
      instance.model.geometries.forEach(geometry => {
        if (geometry.index) {
          totalTriangles += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          totalTriangles += geometry.attributes.position.count / 3;
        }
      });
    });
    
    this.stats.totalTriangles = totalTriangles;
    this.stats.totalMemory = totalMemory;
  }

  /**
   * 生成实例ID
   */
  private generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成组ID
   */
  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加事件监听器
   */
  public addEventListener<K extends keyof ModelManagerEvents>(
    event: K,
    listener: ModelManagerEvents[K]
  ): void {
    this.eventListeners[event] = listener;
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener<K extends keyof ModelManagerEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  /**
   * 获取性能统计
   */
  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * 导出场景数据
   */
  public exportSceneData(): {
    instances: ModelInstance[];
    groups: ModelGroup[];
    libraries: ModelLibrary[];
  } {
    return {
      instances: Array.from(this.instances.values()),
      groups: Array.from(this.groups.values()),
      libraries: Array.from(this.libraries.values())
    };
  }

  /**
   * 清理所有资源
   */
  public dispose(): void {
    // 移除所有实例
    Array.from(this.instances.keys()).forEach(id => {
      this.removeInstance(id);
    });

    // 清理加载器
    this.gltfLoader.dispose();

    // 从场景中移除变换组
    this.scene.remove(this.transformGroup);

    // 清理映射
    this.instanceLookup.clear();
    this.groups.clear();
    this.libraries.clear();

    console.log('🧹 ModelManager资源已清理');
  }
}