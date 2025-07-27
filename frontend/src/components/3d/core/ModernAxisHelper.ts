/**
 * 现代化3D坐标轴组件
 * 提供霓虹发光效果、交互功能和动画的坐标轴
 */
import * as THREE from 'three';

export interface ModernAxisOptions {
  size?: number;
  lineWidth?: number;
  enableGlow?: boolean;
  enableAnimation?: boolean;
  enableInteraction?: boolean;
  labelSize?: number;
  colors?: {
    x: string;
    y: string;
    z: string;
  };
}

const DEFAULT_OPTIONS: Required<ModernAxisOptions> = {
  size: 20,
  lineWidth: 0.3,
  enableGlow: true,
  enableAnimation: true,
  enableInteraction: true,
  labelSize: 2,
  colors: {
    x: '#ff0040',
    y: '#00ff40', 
    z: '#0040ff'
  }
};

export class ModernAxisHelper extends THREE.Group {
  private options: Required<ModernAxisOptions>;
  private axisLines: THREE.Mesh[] = [];
  private axisLabels: THREE.Mesh[] = [];
  private glowMeshes: THREE.Mesh[] = [];
  private animationSpeed = 0.002;
  private time = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private camera?: THREE.Camera;
  private renderer?: THREE.WebGLRenderer;
  private hoveredAxis: number = -1;
  private isDragging: boolean = false;
  private dragStartPosition = new THREE.Vector2();
  private dragOffset = new THREE.Vector3();
  private originalPosition = new THREE.Vector3();

  constructor(options: ModernAxisOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.name = 'ModernAxisHelper';
    this.setupAxis();
  }

  private setupAxis(): void {
    this.createAxisLines();
    this.createAxisLabels();
    if (this.options.enableGlow) {
      this.createGlowEffects();
    }
  }

  private createAxisLines(): void {
    const axes = [
      { direction: [1, 0, 0], color: this.options.colors.x, name: 'X' },
      { direction: [0, 1, 0], color: this.options.colors.y, name: 'Y' },
      { direction: [0, 0, 1], color: this.options.colors.z, name: 'Z' }
    ];

    axes.forEach((axis, index) => {
      // 创建圆柱几何体作为轴线
      const geometry = new THREE.CylinderGeometry(
        this.options.lineWidth, 
        this.options.lineWidth, 
        this.options.size, 
        16
      );

      // 创建发光材质
      const material = this.createAxisMaterial(axis.color, false);
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // 根据轴向旋转圆柱体
      if (index === 0) { // X轴
        mesh.rotation.z = -Math.PI / 2;
        mesh.position.x = this.options.size / 2;
      } else if (index === 1) { // Y轴
        mesh.position.y = this.options.size / 2;
      } else { // Z轴
        mesh.rotation.x = Math.PI / 2;
        mesh.position.z = this.options.size / 2;
      }

      mesh.userData = { 
        axisIndex: index, 
        axisName: axis.name,
        originalColor: axis.color,
        isAxisLine: true
      };

      this.axisLines.push(mesh);
      this.add(mesh);
    });
  }

  private createAxisMaterial(color: string, isGlow: boolean = false): THREE.Material {
    const baseColor = new THREE.Color(color);
    
    if (isGlow) {
      // 发光材质
      return new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
    } else {
      // 主轴材质 - 使用自发光
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9
      });
    }
  }

  private createGlowEffects(): void {
    this.axisLines.forEach((line, index) => {
      const glowGeometry = new THREE.CylinderGeometry(
        this.options.lineWidth * 2, 
        this.options.lineWidth * 2, 
        this.options.size, 
        16
      );

      const color = index === 0 ? this.options.colors.x : 
                   index === 1 ? this.options.colors.y : this.options.colors.z;
      
      const glowMaterial = this.createAxisMaterial(color, true);
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      
      // 复制主轴的位置和旋转
      glowMesh.position.copy(line.position);
      glowMesh.rotation.copy(line.rotation);
      glowMesh.scale.set(1.5, 1, 1.5); // 稍微放大产生光晕效果

      this.glowMeshes.push(glowMesh);
      this.add(glowMesh);
    });
  }

  private createAxisLabels(): void {
    const labels = ['X', 'Y', 'Z'];
    const colors = [this.options.colors.x, this.options.colors.y, this.options.colors.z];
    const positions = [
      [this.options.size + 2, 0, 0],
      [0, this.options.size + 2, 0],
      [0, 0, this.options.size + 2]
    ];

    labels.forEach((label, index) => {
      // 创建文字纹理
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 128;
      canvas.height = 128;
      
      context.fillStyle = colors[index];
      context.font = 'bold 72px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, 64, 64);
      
      // 添加发光效果
      context.shadowColor = colors[index];
      context.shadowBlur = 10;
      context.fillText(label, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide
      });

      const geometry = new THREE.PlaneGeometry(this.options.labelSize, this.options.labelSize);
      const labelMesh = new THREE.Mesh(geometry, material);
      
      labelMesh.position.set(positions[index][0], positions[index][1], positions[index][2]);
      labelMesh.userData = { 
        axisIndex: index, 
        axisName: label,
        isAxisLabel: true 
      };

      this.axisLabels.push(labelMesh);
      this.add(labelMesh);
    });
  }

  // 设置相机和渲染器用于交互
  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    if (this.options.enableInteraction && this.renderer) {
      this.setupInteraction();
    }
  }

  private setupInteraction(): void {
    if (!this.renderer) return;

    const domElement = this.renderer.domElement;

    const onMouseMove = (event: MouseEvent) => {
      if (!this.camera) return;

      if (this.isDragging) {
        // 拖动模式
        const deltaX = event.clientX - this.dragStartPosition.x;
        const deltaY = event.clientY - this.dragStartPosition.y;
        
        // 将屏幕空间的移动转换为世界空间
        const dragSensitivity = 0.1;
        const newPosition = this.originalPosition.clone();
        newPosition.x += deltaX * dragSensitivity;
        newPosition.y -= deltaY * dragSensitivity; // Y轴翻转
        
        this.position.copy(newPosition);
        return;
      }

      // 正常的悬停检测
      const rect = domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.axisLines);

      // 重置所有轴的发光强度
      this.resetAxisGlow();

      if (intersects.length > 0) {
        const axisIndex = intersects[0].object.userData.axisIndex;
        this.hoveredAxis = axisIndex;
        this.highlightAxis(axisIndex);
        domElement.style.cursor = 'pointer';
      } else {
        this.hoveredAxis = -1;
        domElement.style.cursor = 'default';
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 2) { // 右键
        event.preventDefault();
        this.isDragging = true;
        this.dragStartPosition.set(event.clientX, event.clientY);
        this.originalPosition.copy(this.position);
        domElement.style.cursor = 'grabbing';
      } else if (event.button === 0 && this.hoveredAxis !== -1) { // 左键点击轴线
        this.snapToAxis(this.hoveredAxis);
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 2 && this.isDragging) {
        this.isDragging = false;
        domElement.style.cursor = 'default';
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault(); // 阻止右键菜单
    };

    domElement.addEventListener('mousedown', onMouseDown);
    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('contextmenu', onContextMenu);
  }

  private resetAxisGlow(): void {
    this.axisLines.forEach((line, index) => {
      const material = line.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5;
    });

    this.glowMeshes.forEach((glow) => {
      const material = glow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3;
    });
  }

  private highlightAxis(axisIndex: number): void {
    if (axisIndex >= 0 && axisIndex < this.axisLines.length) {
      const line = this.axisLines[axisIndex];
      const material = line.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.0;

      if (axisIndex < this.glowMeshes.length) {
        const glow = this.glowMeshes[axisIndex];
        const glowMaterial = glow.material as THREE.MeshBasicMaterial;
        glowMaterial.opacity = 0.6;
      }
    }
  }

  private snapToAxis(axisIndex: number): void {
    if (!this.camera) return;

    const positions = [
      [this.options.size * 2, 0, 0],     // X轴视角
      [0, this.options.size * 2, 0],     // Y轴视角  
      [0, 0, this.options.size * 2]      // Z轴视角
    ];

    const targetPosition = new THREE.Vector3(...positions[axisIndex]);
    const currentPosition = this.camera.position.clone();

    // 简单的摄像机动画
    const animateCamera = () => {
      currentPosition.lerp(targetPosition, 0.1);
      this.camera!.position.copy(currentPosition);
      this.camera!.lookAt(0, 0, 0);

      if (currentPosition.distanceTo(targetPosition) > 0.1) {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }

  // 动画更新
  public update(deltaTime: number): void {
    if (!this.options.enableAnimation) return;

    this.time += deltaTime * this.animationSpeed;

    // 呼吸效果
    const breathIntensity = 0.3 + 0.2 * Math.sin(this.time);
    
    this.axisLines.forEach((line) => {
      const material = line.material as THREE.MeshStandardMaterial;
      if (this.hoveredAxis === -1) {
        material.emissiveIntensity = breathIntensity;
      }
    });

    // 标签面向相机
    if (this.camera) {
      this.axisLabels.forEach((label) => {
        label.lookAt(this.camera!.position);
      });
    }
  }

  // 调整大小
  public setSize(size: number): void {
    this.options.size = size;
    this.clear();
    this.setupAxis();
  }

  // 显示/隐藏
  public setVisible(visible: boolean): void {
    this.visible = visible;
  }

  // 设置坐标轴位置
  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
  }

  // 重置坐标轴到原点
  public resetPosition(): void {
    this.position.set(0, 0, 0);
  }

  // 获取当前位置
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  // 设置坐标轴到视口角落
  public setCornerPosition(corner: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' = 'bottom-left'): void {
    if (!this.camera) return;
    
    const distance = 50; // 距离相机的距离
    const offset = 15;   // 距离角落的偏移
    
    let position: THREE.Vector3;
    
    switch (corner) {
      case 'bottom-left':
        position = new THREE.Vector3(-offset, -offset, -distance);
        break;
      case 'bottom-right': 
        position = new THREE.Vector3(offset, -offset, -distance);
        break;
      case 'top-left':
        position = new THREE.Vector3(-offset, offset, -distance);
        break;
      case 'top-right':
        position = new THREE.Vector3(offset, offset, -distance);
        break;
      default:
        position = new THREE.Vector3(-offset, -offset, -distance);
    }
    
    this.position.copy(position);
  }

  // 清理资源
  public dispose(): void {
    this.axisLines.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });

    this.axisLabels.forEach(label => {
      label.geometry.dispose();
      const material = label.material as THREE.MeshBasicMaterial;
      if (material.map) material.map.dispose();
      material.dispose();
    });

    this.glowMeshes.forEach(glow => {
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
    });

    this.clear();
  }
}

export default ModernAxisHelper;