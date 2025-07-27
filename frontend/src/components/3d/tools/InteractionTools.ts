import * as THREE from 'three';

export interface InteractionToolEvents {
  onSelect: (objects: THREE.Object3D[]) => void;
  onMeasure: (measurement: MeasurementResult) => void;
  onAnnotate: (annotation: Annotation) => void;
  onToolChange: (tool: InteractionTool) => void;
}

export type InteractionTool = 'select' | 'measure' | 'annotate' | 'section' | 'explode';

export interface MeasurementResult {
  id: string;
  type: 'distance' | 'angle' | 'area' | 'volume';
  points: THREE.Vector3[];
  value: number;
  unit: string;
  label: string;
  color: number;
  visible: boolean;
  createdAt: number;
}

export interface Annotation {
  id: string;
  type: 'note' | 'dimension' | 'leader' | 'symbol';
  position: THREE.Vector3;
  text: string;
  size: number;
  color: number;
  visible: boolean;
  attachedObject?: THREE.Object3D;
  leaderPoints?: THREE.Vector3[];
  createdAt: number;
}

export interface SelectionBox {
  start: THREE.Vector2;
  end: THREE.Vector2;
  active: boolean;
}

/**
 * 高级交互工具系统
 * 支持选择、测量、标注、剖切、爆炸等CAE常用交互功能
 */
export class InteractionTools {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private canvas: HTMLCanvasElement;
  private raycaster: THREE.Raycaster;
  
  // 当前工具状态
  private currentTool: InteractionTool = 'select';
  private isActive: boolean = false;
  
  // 选择系统
  private selectedObjects: Set<THREE.Object3D> = new Set();
  private selectionBox: SelectionBox = { start: new THREE.Vector2(), end: new THREE.Vector2(), active: false };
  private selectionHelper: THREE.Object3D;
  
  // 测量系统
  private measurements: Map<string, MeasurementResult> = new Map();
  private measurementPoints: THREE.Vector3[] = [];
  private measurementHelpers: THREE.Group;
  
  // 标注系统
  private annotations: Map<string, Annotation> = new Map();
  private annotationHelpers: THREE.Group;
  
  // 剖切系统
  private sectionPlane: THREE.Plane;
  private sectionHelper: THREE.PlaneHelper;
  
  // 爆炸系统
  private explosionCenter: THREE.Vector3;
  private explosionFactor: number = 0;
  private originalPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();
  
  // 事件监听器
  private eventListeners: Partial<InteractionToolEvents> = {};
  
  // 鼠标状态
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private mouseDown: boolean = false;
  private mouseButton: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    
    this.initializeHelpers();
    this.setupEventListeners();
  }

  /**
   * 初始化辅助对象
   */
  private initializeHelpers(): void {
    // 创建选择框辅助器
    this.createSelectionHelper();
    
    // 创建测量辅助器组
    this.measurementHelpers = new THREE.Group();
    this.measurementHelpers.name = 'MeasurementHelpers';
    this.scene.add(this.measurementHelpers);
    
    // 创建标注辅助器组
    this.annotationHelpers = new THREE.Group();
    this.annotationHelpers.name = 'AnnotationHelpers';
    this.scene.add(this.annotationHelpers);
    
    // 创建剖切平面
    this.sectionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.sectionHelper = new THREE.PlaneHelper(this.sectionPlane, 5, 0xffff00);
    this.sectionHelper.visible = false;
    this.scene.add(this.sectionHelper);
    
    // 初始化爆炸中心
    this.explosionCenter = new THREE.Vector3();
  }

  /**
   * 创建选择框辅助器
   */
  private createSelectionHelper(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      0, 0, 0,  1, 0, 0,  1, 1, 0,  0, 1, 0,  0, 0, 0
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.8 
    });
    
    this.selectionHelper = new THREE.Line(geometry, material);
    this.selectionHelper.visible = false;
    this.scene.add(this.selectionHelper);
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
  }

  /**
   * 鼠标按下事件
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.isActive) return;
    
    this.mouseDown = true;
    this.mouseButton = event.button;
    this.updateMouse(event);
    
    switch (this.currentTool) {
      case 'select':
        this.handleSelectMouseDown(event);
        break;
      case 'measure':
        this.handleMeasureMouseDown(event);
        break;
      case 'annotate':
        this.handleAnnotateMouseDown(event);
        break;
      case 'section':
        this.handleSectionMouseDown(event);
        break;
    }
  }

  /**
   * 鼠标移动事件
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isActive) return;
    
    this.updateMouse(event);
    
    switch (this.currentTool) {
      case 'select':
        this.handleSelectMouseMove(event);
        break;
      case 'measure':
        this.handleMeasureMouseMove(event);
        break;
      case 'section':
        this.handleSectionMouseMove(event);
        break;
    }
  }

  /**
   * 鼠标释放事件
   */
  private onMouseUp(event: MouseEvent): void {
    if (!this.isActive) return;
    
    this.mouseDown = false;
    this.updateMouse(event);
    
    switch (this.currentTool) {
      case 'select':
        this.handleSelectMouseUp(event);
        break;
      case 'measure':
        this.handleMeasureMouseUp(event);
        break;
    }
  }

  /**
   * 双击事件
   */
  private onDoubleClick(event: MouseEvent): void {
    if (!this.isActive) return;
    
    this.updateMouse(event);
    
    switch (this.currentTool) {
      case 'measure':
        this.finalizeMeasurement();
        break;
      case 'annotate':
        this.finalizeAnnotation();
        break;
    }
  }

  /**
   * 右键菜单事件
   */
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // 可以在这里显示上下文菜单
  }

  /**
   * 更新鼠标坐标
   */
  private updateMouse(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 选择工具 - 鼠标按下
   */
  private handleSelectMouseDown(event: MouseEvent): void {
    if (event.button === 0) { // 左键
      if (!event.ctrlKey && !event.shiftKey) {
        this.clearSelection();
      }
      
      if (event.shiftKey) {
        // 开始选择框
        this.selectionBox.start.copy(this.mouse);
        this.selectionBox.active = true;
        this.selectionHelper.visible = true;
      } else {
        // 点选
        this.performRaycastSelection(event.ctrlKey);
      }
    }
  }

  /**
   * 选择工具 - 鼠标移动
   */
  private handleSelectMouseMove(event: MouseEvent): void {
    if (this.selectionBox.active && this.mouseDown) {
      this.selectionBox.end.copy(this.mouse);
      this.updateSelectionBox();
    }
  }

  /**
   * 选择工具 - 鼠标释放
   */
  private handleSelectMouseUp(event: MouseEvent): void {
    if (this.selectionBox.active) {
      this.performBoxSelection();
      this.selectionBox.active = false;
      this.selectionHelper.visible = false;
    }
  }

  /**
   * 射线选择
   */
  private performRaycastSelection(addToSelection: boolean): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      this.selectObject(object, addToSelection);
    }
  }

  /**
   * 框选
   */
  private performBoxSelection(): void {
    // 实现框选逻辑
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    
    // 创建选择视锥
    const tempCamera = this.camera.clone() as THREE.PerspectiveCamera;
    projScreenMatrix.multiplyMatrices(tempCamera.projectionMatrix, tempCamera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);
    
    // 检查对象是否在选择框内
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const box = new THREE.Box3().setFromObject(object);
        if (frustum.intersectsBox(box)) {
          this.selectObject(object, true);
        }
      }
    });
  }

  /**
   * 选择对象
   */
  private selectObject(object: THREE.Object3D, addToSelection: boolean): void {
    if (addToSelection) {
      if (this.selectedObjects.has(object)) {
        this.selectedObjects.delete(object);
        this.removeSelectionHighlight(object);
      } else {
        this.selectedObjects.add(object);
        this.addSelectionHighlight(object);
      }
    } else {
      this.selectedObjects.clear();
      this.clearAllHighlights();
      this.selectedObjects.add(object);
      this.addSelectionHighlight(object);
    }
    
    this.eventListeners.onSelect?.(Array.from(this.selectedObjects));
  }

  /**
   * 测量工具 - 鼠标按下
   */
  private handleMeasureMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.measurementPoints.push(point.clone());
        this.createMeasurementPoint(point);
        
        if (this.measurementPoints.length >= 2) {
          this.updateMeasurementLine();
        }
      }
    }
  }

  /**
   * 测量工具 - 鼠标移动
   */
  private handleMeasureMouseMove(event: MouseEvent): void {
    if (this.measurementPoints.length > 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.updateTemporaryMeasurement(point);
      }
    }
  }

  /**
   * 测量工具 - 鼠标释放
   */
  private handleMeasureMouseUp(event: MouseEvent): void {
    // 测量点击逻辑在mouseDown中处理
  }

  /**
   * 创建测量点
   */
  private createMeasurementPoint(position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.05);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    this.measurementHelpers.add(sphere);
  }

  /**
   * 更新测量线
   */
  private updateMeasurementLine(): void {
    if (this.measurementPoints.length < 2) return;
    
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    
    for (const point of this.measurementPoints) {
      positions.push(point.x, point.y, point.z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const line = new THREE.Line(geometry, material);
    
    this.measurementHelpers.add(line);
  }

  /**
   * 更新临时测量
   */
  private updateTemporaryMeasurement(currentPoint: THREE.Vector3): void {
    if (this.measurementPoints.length === 0) return;
    
    const lastPoint = this.measurementPoints[this.measurementPoints.length - 1];
    const distance = lastPoint.distanceTo(currentPoint);
    
    // 显示临时距离标签
    this.showTemporaryLabel(currentPoint, `${distance.toFixed(3)} mm`);
  }

  /**
   * 显示临时标签
   */
  private showTemporaryLabel(position: THREE.Vector3, text: string): void {
    // 实现临时标签显示
    // 可以使用CSS3DRenderer或者Canvas纹理
  }

  /**
   * 完成测量
   */
  private finalizeMeasurement(): void {
    if (this.measurementPoints.length < 2) return;
    
    const measurement: MeasurementResult = {
      id: this.generateId('measurement'),
      type: 'distance',
      points: [...this.measurementPoints],
      value: this.calculateDistance(this.measurementPoints),
      unit: 'mm',
      label: '',
      color: 0x00ff00,
      visible: true,
      createdAt: Date.now()
    };
    
    this.measurements.set(measurement.id, measurement);
    this.createMeasurementLabel(measurement);
    
    this.measurementPoints = [];
    this.eventListeners.onMeasure?.(measurement);
  }

  /**
   * 计算距离
   */
  private calculateDistance(points: THREE.Vector3[]): number {
    if (points.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += points[i - 1].distanceTo(points[i]);
    }
    
    return totalDistance;
  }

  /**
   * 创建测量标签
   */
  private createMeasurementLabel(measurement: MeasurementResult): void {
    // 计算标签位置（点的中点）
    const center = new THREE.Vector3();
    measurement.points.forEach(point => center.add(point));
    center.divideScalar(measurement.points.length);
    
    // 创建文本精灵
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const fontSize = 48;
    const text = `${measurement.value.toFixed(2)} ${measurement.unit}`;
    
    context.font = `${fontSize}px Arial`;
    const textWidth = context.measureText(text).width;
    
    canvas.width = textWidth + 20;
    canvas.height = fontSize + 20;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = `${fontSize}px Arial`;
    context.fillText(text, 10, fontSize + 5);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(center);
    sprite.scale.setScalar(0.5);
    sprite.userData.measurementId = measurement.id;
    
    this.measurementHelpers.add(sprite);
  }

  /**
   * 标注工具 - 鼠标按下
   */
  private handleAnnotateMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.createAnnotation(point);
      }
    }
  }

  /**
   * 创建标注
   */
  private createAnnotation(position: THREE.Vector3, text: string = '新标注'): void {
    const annotation: Annotation = {
      id: this.generateId('annotation'),
      type: 'note',
      position: position.clone(),
      text,
      size: 1.0,
      color: 0xffff00,
      visible: true,
      createdAt: Date.now()
    };
    
    this.annotations.set(annotation.id, annotation);
    this.createAnnotationVisual(annotation);
    this.eventListeners.onAnnotate?.(annotation);
  }

  /**
   * 创建标注视觉元素
   */
  private createAnnotationVisual(annotation: Annotation): void {
    const group = new THREE.Group();
    
    // 创建标注图标
    const geometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const material = new THREE.MeshBasicMaterial({ color: annotation.color });
    const cone = new THREE.Mesh(geometry, material);
    cone.position.copy(annotation.position);
    group.add(cone);
    
    // 创建文本标签
    this.createAnnotationText(annotation, group);
    
    group.userData.annotationId = annotation.id;
    this.annotationHelpers.add(group);
  }

  /**
   * 创建标注文本
   */
  private createAnnotationText(annotation: Annotation, parent: THREE.Group): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const fontSize = 32;
    
    context.font = `${fontSize}px Arial`;
    const textWidth = context.measureText(annotation.text).width;
    
    canvas.width = textWidth + 20;
    canvas.height = fontSize + 20;
    
    context.fillStyle = 'rgba(255, 255, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'black';
    context.font = `${fontSize}px Arial`;
    context.fillText(annotation.text, 10, fontSize + 5);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(annotation.position);
    sprite.position.y += 0.5; // 稍微抬高
    sprite.scale.setScalar(0.3);
    
    parent.add(sprite);
  }

  /**
   * 剖切工具 - 鼠标按下
   */
  private handleSectionMouseDown(event: MouseEvent): void {
    this.sectionHelper.visible = true;
    // 实现剖切平面的交互控制
  }

  /**
   * 剖切工具 - 鼠标移动
   */
  private handleSectionMouseMove(event: MouseEvent): void {
    if (this.mouseDown) {
      // 更新剖切平面位置
      this.updateSectionPlane();
    }
  }

  /**
   * 更新剖切平面
   */
  private updateSectionPlane(): void {
    // 根据鼠标位置更新剖切平面
    const normalizedY = (this.mouse.y + 1) / 2;
    this.sectionPlane.constant = (normalizedY - 0.5) * 10;
    this.sectionHelper.updateMatrixWorld();
    
    // 应用剖切到所有材质
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material instanceof THREE.Material) {
            material.clippingPlanes = [this.sectionPlane];
            material.needsUpdate = true;
          }
        });
      }
    });
  }

  /**
   * 爆炸视图
   */
  public setExplodeFactor(factor: number): void {
    this.explosionFactor = Math.max(0, Math.min(2, factor));
    
    if (this.explosionFactor === 0) {
      this.resetExplosion();
    } else {
      this.applyExplosion();
    }
  }

  /**
   * 应用爆炸效果
   */
  private applyExplosion(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (!this.originalPositions.has(object)) {
          this.originalPositions.set(object, object.position.clone());
        }
        
        const originalPos = this.originalPositions.get(object)!;
        const direction = originalPos.clone().sub(this.explosionCenter).normalize();
        const distance = originalPos.distanceTo(this.explosionCenter);
        
        const explodedPos = originalPos.clone().add(
          direction.multiplyScalar(distance * this.explosionFactor)
        );
        
        object.position.copy(explodedPos);
      }
    });
  }

  /**
   * 重置爆炸效果
   */
  private resetExplosion(): void {
    this.originalPositions.forEach((originalPos, object) => {
      object.position.copy(originalPos);
    });
  }

  /**
   * 设置当前工具
   */
  public setTool(tool: InteractionTool): void {
    this.currentTool = tool;
    this.resetToolState();
    this.eventListeners.onToolChange?.(tool);
  }

  /**
   * 重置工具状态
   */
  private resetToolState(): void {
    this.measurementPoints = [];
    this.selectionBox.active = false;
    this.selectionHelper.visible = false;
    this.sectionHelper.visible = this.currentTool === 'section';
  }

  /**
   * 激活/停用工具
   */
  public setActive(active: boolean): void {
    this.isActive = active;
  }

  /**
   * 清空选择
   */
  public clearSelection(): void {
    this.selectedObjects.clear();
    this.clearAllHighlights();
    this.eventListeners.onSelect?.([]);
  }

  /**
   * 添加选择高亮
   */
  private addSelectionHighlight(object: THREE.Object3D): void {
    // 实现选择高亮效果
    if (object instanceof THREE.Mesh) {
      object.userData.originalMaterial = object.material;
      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3
      });
      object.material = highlightMaterial;
    }
  }

  /**
   * 移除选择高亮
   */
  private removeSelectionHighlight(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh && object.userData.originalMaterial) {
      object.material = object.userData.originalMaterial;
      delete object.userData.originalMaterial;
    }
  }

  /**
   * 清除所有高亮
   */
  private clearAllHighlights(): void {
    this.selectedObjects.forEach(object => {
      this.removeSelectionHighlight(object);
    });
  }

  /**
   * 更新选择框
   */
  private updateSelectionBox(): void {
    const start = this.selectionBox.start;
    const end = this.selectionBox.end;
    
    const geometry = (this.selectionHelper as any).geometry as THREE.BufferGeometry;
    const positions = geometry.attributes.position;
    
    // 更新选择框的顶点位置
    positions.setXYZ(0, start.x, start.y, 0);
    positions.setXYZ(1, end.x, start.y, 0);
    positions.setXYZ(2, end.x, end.y, 0);
    positions.setXYZ(3, start.x, end.y, 0);
    positions.setXYZ(4, start.x, start.y, 0);
    
    positions.needsUpdate = true;
  }

  /**
   * 完成标注
   */
  private finalizeAnnotation(): void {
    // 完成标注编辑
  }

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加事件监听器
   */
  public addEventListener<K extends keyof InteractionToolEvents>(
    event: K,
    listener: InteractionToolEvents[K]
  ): void {
    this.eventListeners[event] = listener;
  }

  /**
   * 获取当前工具
   */
  public getCurrentTool(): InteractionTool {
    return this.currentTool;
  }

  /**
   * 获取选中的对象
   */
  public getSelectedObjects(): THREE.Object3D[] {
    return Array.from(this.selectedObjects);
  }

  /**
   * 获取所有测量
   */
  public getMeasurements(): MeasurementResult[] {
    return Array.from(this.measurements.values());
  }

  /**
   * 获取所有标注
   */
  public getAnnotations(): Annotation[] {
    return Array.from(this.annotations.values());
  }

  /**
   * 删除测量
   */
  public deleteMeasurement(id: string): boolean {
    const measurement = this.measurements.get(id);
    if (!measurement) return false;
    
    // 移除视觉元素
    this.measurementHelpers.children.forEach(child => {
      if (child.userData.measurementId === id) {
        this.measurementHelpers.remove(child);
      }
    });
    
    this.measurements.delete(id);
    return true;
  }

  /**
   * 删除标注
   */
  public deleteAnnotation(id: string): boolean {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;
    
    // 移除视觉元素
    this.annotationHelpers.children.forEach(child => {
      if (child.userData.annotationId === id) {
        this.annotationHelpers.remove(child);
      }
    });
    
    this.annotations.delete(id);
    return true;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    
    this.scene.remove(this.selectionHelper);
    this.scene.remove(this.measurementHelpers);
    this.scene.remove(this.annotationHelpers);
    this.scene.remove(this.sectionHelper);
    
    this.selectedObjects.clear();
    this.measurements.clear();
    this.annotations.clear();
    this.originalPositions.clear();
  }
}