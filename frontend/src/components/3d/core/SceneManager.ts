import * as THREE from 'three';

export interface SceneLayer {
  name: string;
  visible: boolean;
  opacity: number;
  objects: Set<THREE.Object3D>;
  renderOrder: number;
  material?: THREE.Material;
}

export interface SelectionOptions {
  mode: 'single' | 'multiple' | 'region';
  enableHover: boolean;
  highlightColor: THREE.Color;
  selectionColor: THREE.Color;
}

export interface BoundingBoxInfo {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
}

/**
 * 高级场景管理器
 * 负责3D场景的层级管理、对象管理、选择管理和空间查询
 */
export class SceneManager {
  private scene: THREE.Scene;
  private layers: Map<string, SceneLayer>;
  private selectedObjects: Set<THREE.Object3D>;
  private hoveredObject: THREE.Object3D | null = null;
  
  // 空间查询优化
  private octree: THREE.Object3D[] = []; // 简化的八叉树实现
  private boundingBox: THREE.Box3;
  
  // 选择管理
  private raycaster: THREE.Raycaster;
  private selectionOptions: SelectionOptions;
  
  // 材质备份（用于高亮显示）
  private originalMaterials: WeakMap<THREE.Object3D, THREE.Material | THREE.Material[]>;
  private highlightMaterial: THREE.MeshBasicMaterial;
  private selectionMaterial: THREE.MeshBasicMaterial;
  
  // 事件回调
  private onSelectionChange?: (objects: THREE.Object3D[]) => void;
  private onHoverChange?: (object: THREE.Object3D | null) => void;
  private onLayerChange?: (layerName: string, layer: SceneLayer) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.layers = new Map();
    this.selectedObjects = new Set();
    this.raycaster = new THREE.Raycaster();
    this.boundingBox = new THREE.Box3();
    this.originalMaterials = new WeakMap();
    
    // 默认选择选项
    this.selectionOptions = {
      mode: 'single',
      enableHover: true,
      highlightColor: new THREE.Color(0x00ff00),
      selectionColor: new THREE.Color(0xff6600)
    };
    
    this.initializeMaterials();
    this.createDefaultLayers();
  }

  /**
   * 初始化高亮和选择材质
   */
  private initializeMaterials(): void {
    this.highlightMaterial = new THREE.MeshBasicMaterial({
      color: this.selectionOptions.highlightColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    this.selectionMaterial = new THREE.MeshBasicMaterial({
      color: this.selectionOptions.selectionColor,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
  }

  /**
   * 创建默认图层
   */
  private createDefaultLayers(): void {
    this.createLayer('default', { visible: true, opacity: 1.0, renderOrder: 0 });
    this.createLayer('geometry', { visible: true, opacity: 1.0, renderOrder: 1 });
    this.createLayer('mesh', { visible: true, opacity: 1.0, renderOrder: 2 });
    this.createLayer('results', { visible: true, opacity: 1.0, renderOrder: 3 });
    this.createLayer('annotations', { visible: true, opacity: 1.0, renderOrder: 4 });
    this.createLayer('tools', { visible: true, opacity: 1.0, renderOrder: 5 });
  }

  /**
   * 创建图层
   */
  public createLayer(
    name: string, 
    options: { visible?: boolean; opacity?: number; renderOrder?: number } = {}
  ): SceneLayer {
    const layer: SceneLayer = {
      name,
      visible: options.visible ?? true,
      opacity: options.opacity ?? 1.0,
      objects: new Set(),
      renderOrder: options.renderOrder ?? 0
    };
    
    this.layers.set(name, layer);
    this.onLayerChange?.(name, layer);
    
    return layer;
  }

  /**
   * 删除图层
   */
  public removeLayer(name: string): boolean {
    const layer = this.layers.get(name);
    if (!layer) return false;
    
    // 移除图层中的所有对象
    layer.objects.forEach(object => {
      this.scene.remove(object);
    });
    
    this.layers.delete(name);
    return true;
  }

  /**
   * 获取图层
   */
  public getLayer(name: string): SceneLayer | undefined {
    return this.layers.get(name);
  }

  /**
   * 获取所有图层
   */
  public getAllLayers(): SceneLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.renderOrder - b.renderOrder);
  }

  /**
   * 设置图层可见性
   */
  public setLayerVisibility(name: string, visible: boolean): void {
    const layer = this.layers.get(name);
    if (!layer) return;
    
    layer.visible = visible;
    layer.objects.forEach(object => {
      object.visible = visible;
    });
    
    this.onLayerChange?.(name, layer);
  }

  /**
   * 设置图层透明度
   */
  public setLayerOpacity(name: string, opacity: number): void {
    const layer = this.layers.get(name);
    if (!layer) return;
    
    layer.opacity = Math.max(0, Math.min(1, opacity));
    
    layer.objects.forEach(object => {
      this.updateObjectOpacity(object, layer.opacity);
    });
    
    this.onLayerChange?.(name, layer);
  }

  /**
   * 更新对象透明度
   */
  private updateObjectOpacity(object: THREE.Object3D, opacity: number): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => {
            material.transparent = opacity < 1.0;
            material.opacity = opacity;
          });
        } else {
          child.material.transparent = opacity < 1.0;
          child.material.opacity = opacity;
        }
      }
    });
  }

  /**
   * 添加对象到场景和指定图层
   */
  public addObject(object: THREE.Object3D, layerName: string = 'default'): void {
    // 添加到场景
    this.scene.add(object);
    
    // 添加到图层
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.objects.add(object);
      
      // 应用图层属性
      object.visible = layer.visible;
      object.renderOrder = layer.renderOrder;
      this.updateObjectOpacity(object, layer.opacity);
      
      // 备份原始材质
      this.backupOriginalMaterial(object);
    }
    
    // 更新包围盒
    this.updateBoundingBox();
  }

  /**
   * 从场景和图层中移除对象
   */
  public removeObject(object: THREE.Object3D): void {
    // 从场景移除
    this.scene.remove(object);
    
    // 从所有图层移除
    this.layers.forEach(layer => {
      layer.objects.delete(object);
    });
    
    // 从选择中移除
    this.selectedObjects.delete(object);
    
    // 清理材质备份
    this.originalMaterials.delete(object);
    
    // 更新包围盒
    this.updateBoundingBox();
  }

  /**
   * 移动对象到不同图层
   */
  public moveObjectToLayer(object: THREE.Object3D, targetLayerName: string): void {
    // 从当前图层移除
    this.layers.forEach(layer => {
      if (layer.objects.has(object)) {
        layer.objects.delete(object);
      }
    });
    
    // 添加到目标图层
    const targetLayer = this.layers.get(targetLayerName);
    if (targetLayer) {
      targetLayer.objects.add(object);
      
      // 应用图层属性
      object.visible = targetLayer.visible;
      object.renderOrder = targetLayer.renderOrder;
      this.updateObjectOpacity(object, targetLayer.opacity);
    }
  }

  /**
   * 备份对象的原始材质
   */
  private backupOriginalMaterial(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        this.originalMaterials.set(child, child.material);
      }
    });
  }

  /**
   * 恢复对象的原始材质
   */
  private restoreOriginalMaterial(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = this.originalMaterials.get(child);
        if (originalMaterial) {
          child.material = originalMaterial;
        }
      }
    });
  }

  /**
   * 选择对象
   */
  public selectObjects(objects: THREE.Object3D[]): void {
    // 清除之前的选择
    this.clearSelection();
    
    // 选择新对象
    objects.forEach(object => {
      this.selectedObjects.add(object);
      this.applySelectionMaterial(object);
    });
    
    this.onSelectionChange?.(Array.from(this.selectedObjects));
  }

  /**
   * 添加对象到选择
   */
  public addToSelection(object: THREE.Object3D): void {
    if (this.selectionOptions.mode === 'single') {
      this.selectObjects([object]);
    } else {
      this.selectedObjects.add(object);
      this.applySelectionMaterial(object);
      this.onSelectionChange?.(Array.from(this.selectedObjects));
    }
  }

  /**
   * 从选择中移除对象
   */
  public removeFromSelection(object: THREE.Object3D): void {
    this.selectedObjects.delete(object);
    this.restoreOriginalMaterial(object);
    this.onSelectionChange?.(Array.from(this.selectedObjects));
  }

  /**
   * 清除选择
   */
  public clearSelection(): void {
    this.selectedObjects.forEach(object => {
      this.restoreOriginalMaterial(object);
    });
    this.selectedObjects.clear();
    this.onSelectionChange?.([]);
  }

  /**
   * 应用选择材质
   */
  private applySelectionMaterial(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = this.selectionMaterial;
      }
    });
  }

  /**
   * 应用悬停材质
   */
  private applyHoverMaterial(object: THREE.Object3D): void {
    if (this.selectedObjects.has(object)) return; // 已选择的对象不应用悬停效果
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = this.highlightMaterial;
      }
    });
  }

  /**
   * 射线检测选择
   */
  public raycastSelect(
    x: number, 
    y: number, 
    camera: THREE.Camera, 
    canvas: HTMLCanvasElement
  ): THREE.Object3D | null {
    // 归一化坐标
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1
    );
    
    // 射线检测
    this.raycaster.setFromCamera(mouse, camera);
    
    // 获取所有可见对象
    const visibleObjects: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (object.visible && (object instanceof THREE.Mesh || object instanceof THREE.Line)) {
        visibleObjects.push(object);
      }
    });
    
    const intersects = this.raycaster.intersectObjects(visibleObjects, false);
    
    if (intersects.length > 0) {
      return intersects[0].object;
    }
    
    return null;
  }

  /**
   * 处理鼠标悬停
   */
  public handleMouseMove(
    x: number, 
    y: number, 
    camera: THREE.Camera, 
    canvas: HTMLCanvasElement
  ): void {
    if (!this.selectionOptions.enableHover) return;
    
    const object = this.raycastSelect(x, y, camera, canvas);
    
    // 清除之前的悬停效果
    if (this.hoveredObject && this.hoveredObject !== object) {
      this.restoreOriginalMaterial(this.hoveredObject);
      this.hoveredObject = null;
    }
    
    // 应用新的悬停效果
    if (object && !this.selectedObjects.has(object)) {
      this.applyHoverMaterial(object);
      this.hoveredObject = object;
    }
    
    this.onHoverChange?.(object);
  }

  /**
   * 获取选中的对象
   */
  public getSelectedObjects(): THREE.Object3D[] {
    return Array.from(this.selectedObjects);
  }

  /**
   * 更新场景包围盒
   */
  private updateBoundingBox(): void {
    this.boundingBox.makeEmpty();
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const box = new THREE.Box3().setFromObject(object);
        this.boundingBox.union(box);
      }
    });
  }

  /**
   * 获取场景包围盒信息
   */
  public getBoundingBoxInfo(): BoundingBoxInfo {
    this.updateBoundingBox();
    
    const min = this.boundingBox.min.clone();
    const max = this.boundingBox.max.clone();
    const center = this.boundingBox.getCenter(new THREE.Vector3());
    const size = this.boundingBox.getSize(new THREE.Vector3());
    
    return { min, max, center, size };
  }

  /**
   * 适配相机到场景
   */
  public fitCameraToScene(camera: THREE.Camera): void {
    const boundingInfo = this.getBoundingBoxInfo();
    
    if (camera instanceof THREE.PerspectiveCamera) {
      const distance = boundingInfo.size.length() * 1.5;
      const direction = new THREE.Vector3(1, 1, 1).normalize();
      camera.position.copy(boundingInfo.center).add(direction.multiplyScalar(distance));
      camera.lookAt(boundingInfo.center);
    } else if (camera instanceof THREE.OrthographicCamera) {
      const maxSize = Math.max(boundingInfo.size.x, boundingInfo.size.y, boundingInfo.size.z);
      camera.left = -maxSize;
      camera.right = maxSize;
      camera.top = maxSize;
      camera.bottom = -maxSize;
      camera.updateProjectionMatrix();
    }
  }

  /**
   * 查找图层中的对象
   */
  public findObjectsInLayer(layerName: string): THREE.Object3D[] {
    const layer = this.layers.get(layerName);
    return layer ? Array.from(layer.objects) : [];
  }

  /**
   * 查找对象所在的图层
   */
  public findObjectLayer(object: THREE.Object3D): string | null {
    for (const [name, layer] of this.layers) {
      if (layer.objects.has(object)) {
        return name;
      }
    }
    return null;
  }

  /**
   * 设置选择选项
   */
  public setSelectionOptions(options: Partial<SelectionOptions>): void {
    this.selectionOptions = { ...this.selectionOptions, ...options };
    
    // 更新材质颜色
    this.highlightMaterial.color = this.selectionOptions.highlightColor;
    this.selectionMaterial.color = this.selectionOptions.selectionColor;
  }

  /**
   * 设置选择变化回调
   */
  public setSelectionChangeCallback(callback: (objects: THREE.Object3D[]) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * 设置悬停变化回调
   */
  public setHoverChangeCallback(callback: (object: THREE.Object3D | null) => void): void {
    this.onHoverChange = callback;
  }

  /**
   * 设置图层变化回调
   */
  public setLayerChangeCallback(callback: (layerName: string, layer: SceneLayer) => void): void {
    this.onLayerChange = callback;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.clearSelection();
    this.highlightMaterial.dispose();
    this.selectionMaterial.dispose();
    this.layers.clear();
    this.selectedObjects.clear();
  }
}