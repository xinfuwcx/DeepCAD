/**
 * ABAQUS风格坐标轴系统
 * 专业的CAE软件坐标轴显示，符合工程软件标准
 */

import * as THREE from 'three';

export interface AbaqusAxisOptions {
  size?: number;
  lineWidth?: number;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  margin?: number;
  showLabels?: boolean;
  labelSize?: number;
  colors?: {
    x: string;
    y: string;
    z: string;
  };
  backgroundColor?: string;
  borderRadius?: number;
  opacity?: number;
}

const DEFAULT_OPTIONS: Required<AbaqusAxisOptions> = {
  size: 60,
  lineWidth: 3,
  position: 'bottom-left',
  margin: 20,
  showLabels: true,
  labelSize: 14,
  colors: {
    x: '#E74C3C',  // ABAQUS红色
    y: '#27AE60',  // ABAQUS绿色  
    z: '#3498DB'   // ABAQUS蓝色
  },
  backgroundColor: 'rgba(45, 52, 64, 0.9)',
  borderRadius: 8,
  opacity: 0.95
};

export class AbaqusStyleAxis {
  private options: Required<AbaqusAxisOptions>;
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private axisGroup: THREE.Group;
  private mainCamera?: THREE.Camera;
  private isInitialized = false;

  constructor(parentElement: HTMLElement, options: AbaqusAxisOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.setupContainer(parentElement);
    this.setupCanvas();
    this.setupThreeJS();
    this.createAxisGeometry();
    this.startRenderLoop();
  }

  private setupContainer(parentElement: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.className = 'abaqus-axis-container';
    
    const { position, margin, size } = this.options;
    
    // 设置容器样式
    this.container.style.cssText = `
      position: absolute;
      width: ${size + 20}px;
      height: ${size + 20}px;
      background: ${this.options.backgroundColor};
      border-radius: ${this.options.borderRadius}px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      pointer-events: none;
      z-index: 1000;
      opacity: ${this.options.opacity};
      transition: opacity 0.3s ease;
    `;

    // 根据位置设置定位
    switch (position) {
      case 'bottom-left':
        this.container.style.bottom = `${margin}px`;
        this.container.style.left = `${margin}px`;
        break;
      case 'bottom-right':
        this.container.style.bottom = `${margin}px`;
        this.container.style.right = `${margin}px`;
        break;
      case 'top-left':
        this.container.style.top = `${margin}px`;
        this.container.style.left = `${margin}px`;
        break;
      case 'top-right':
        this.container.style.top = `${margin}px`;
        this.container.style.right = `${margin}px`;
        break;
    }

    parentElement.appendChild(this.container);
  }

  private setupCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.options.size + 20;
    this.canvas.height = this.options.size + 20;
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    
    this.context = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
  }

  private setupThreeJS(): void {
    // 创建场景
    this.scene = new THREE.Scene();
    
    // 创建正交相机
    const aspect = 1;
    const frustumSize = 2;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    this.camera.position.set(1, 1, 1);
    this.camera.lookAt(0, 0, 0);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.options.size + 20, this.options.size + 20);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private createAxisGeometry(): void {
    this.axisGroup = new THREE.Group();

    const { colors, size, lineWidth } = this.options;
    const axisLength = size * 0.006; // 转换为Three.js单位

    // 创建轴线几何体
    const createAxisLine = (direction: THREE.Vector3, color: string): THREE.Group => {
      const group = new THREE.Group();
      
      // 轴线
      const geometry = new THREE.CylinderGeometry(
        lineWidth * 0.0008, 
        lineWidth * 0.0008, 
        axisLength, 
        8
      );
      
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(color),
        transparent: false
      });
      
      const line = new THREE.Mesh(geometry, material);
      
      // 根据方向旋转轴线
      if (direction.equals(new THREE.Vector3(1, 0, 0))) {
        line.rotation.z = -Math.PI / 2;
      } else if (direction.equals(new THREE.Vector3(0, 0, 1))) {
        line.rotation.x = Math.PI / 2;
      }
      
      line.position.copy(direction.multiplyScalar(axisLength / 2));
      group.add(line);

      // 箭头头部
      const arrowGeometry = new THREE.ConeGeometry(
        lineWidth * 0.002, 
        axisLength * 0.2, 
        8
      );
      const arrowHead = new THREE.Mesh(arrowGeometry, material);
      
      // 箭头方向和位置
      if (direction.equals(new THREE.Vector3(1, 0, 0))) {
        arrowHead.rotation.z = -Math.PI / 2;
        arrowHead.position.set(axisLength * 0.9, 0, 0);
      } else if (direction.equals(new THREE.Vector3(0, 1, 0))) {
        arrowHead.position.set(0, axisLength * 0.9, 0);
      } else if (direction.equals(new THREE.Vector3(0, 0, 1))) {
        arrowHead.rotation.x = Math.PI / 2;
        arrowHead.position.set(0, 0, axisLength * 0.9);
      }
      
      group.add(arrowHead);
      return group;
    };

    // 创建三个轴
    const xAxis = createAxisLine(new THREE.Vector3(1, 0, 0), colors.x);
    const yAxis = createAxisLine(new THREE.Vector3(0, 1, 0), colors.y);
    const zAxis = createAxisLine(new THREE.Vector3(0, 0, 1), colors.z);

    this.axisGroup.add(xAxis);
    this.axisGroup.add(yAxis);
    this.axisGroup.add(zAxis);

    // 添加标签（如果启用）
    if (this.options.showLabels) {
      this.createAxisLabels();
    }

    this.scene.add(this.axisGroup);
    this.isInitialized = true;
  }

  private createAxisLabels(): void {
    // 使用Canvas创建文本纹理
    const createTextTexture = (text: string, color: string): THREE.Texture => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d')!;
      
      // 清除背景
      context.clearRect(0, 0, 64, 64);
      
      // 设置文本样式
      context.font = 'bold 40px Arial';
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // 绘制文本
      context.fillText(text, 32, 32);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    };

    const { colors } = this.options;
    const labelDistance = this.options.size * 0.008;

    // 创建标签
    const labels = [
      { text: 'X', position: new THREE.Vector3(labelDistance, 0, 0), color: colors.x },
      { text: 'Y', position: new THREE.Vector3(0, labelDistance, 0), color: colors.y },
      { text: 'Z', position: new THREE.Vector3(0, 0, labelDistance), color: colors.z }
    ];

    labels.forEach(({ text, position, color }) => {
      const texture = createTextTexture(text, color);
      const material = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });
      
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);
      sprite.scale.set(0.3, 0.3, 1);
      
      this.axisGroup.add(sprite);
    });
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (this.isInitialized && this.mainCamera) {
        // 同步坐标轴方向与主相机
        this.syncWithMainCamera();
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  private syncWithMainCamera(): void {
    if (!this.mainCamera) return;

    // 提取主相机的旋转矩阵
    const cameraMatrix = new THREE.Matrix4();
    cameraMatrix.extractRotation(this.mainCamera.matrixWorld);
    
    // 应用到坐标轴组
    this.axisGroup.setRotationFromMatrix(cameraMatrix);
  }

  /**
   * 设置主相机引用，用于同步坐标轴方向
   */
  public setMainCamera(camera: THREE.Camera): void {
    this.mainCamera = camera;
  }

  /**
   * 更新坐标轴颜色
   */
  public updateColors(colors: { x?: string; y?: string; z?: string }): void {
    this.options.colors = { ...this.options.colors, ...colors };
    // 重新创建坐标轴
    this.scene.remove(this.axisGroup);
    this.createAxisGeometry();
  }

  /**
   * 设置可见性
   */
  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'block' : 'none';
  }

  /**
   * 设置透明度
   */
  public setOpacity(opacity: number): void {
    this.options.opacity = opacity;
    this.container.style.opacity = opacity.toString();
  }

  /**
   * 销毁坐标轴
   */
  public dispose(): void {
    this.isInitialized = false;
    
    // 清理Three.js资源
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
    
    // 清理DOM
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.renderer.dispose();
  }
}