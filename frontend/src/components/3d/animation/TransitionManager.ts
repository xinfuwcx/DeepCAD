import * as THREE from 'three';
import { AnimationManager, AnimationConfig } from './AnimationManager';

export interface ViewTransition {
  name: string;
  from: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    zoom?: number;
    fov?: number;
  };
  to: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    zoom?: number;
    fov?: number;
  };
  config?: AnimationConfig;
}

export interface SceneTransition {
  name: string;
  objects: Array<{
    object: THREE.Object3D;
    from: {
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
      opacity?: number;
    };
    to: {
      position?: THREE.Vector3;
      rotation?: THREE.Euler;
      scale?: THREE.Vector3;
      opacity?: number;
    };
    delay?: number;
  }>;
  config?: AnimationConfig;
}

export interface ModelLoadTransition {
  type: 'fadeIn' | 'scaleUp' | 'slideIn' | 'spiral';
  direction?: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
  config?: AnimationConfig;
}

/**
 * 过渡管理器
 * 管理场景切换、视角切换、模型加载等过渡效果
 */
export class TransitionManager {
  private animationManager: AnimationManager;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private controls?: any; // OrbitControls
  
  // 预定义视角
  private viewPresets: Map<string, ViewTransition> = new Map();
  
  // 过渡效果预设
  public static readonly TRANSITION_PRESETS = {
    instant: { duration: 0, easing: 'linear' as const },
    quick: { duration: 300, easing: 'easeOut' as const },
    smooth: { duration: 800, easing: 'easeInOut' as const },
    cinematic: { duration: 1500, easing: 'easeInOut' as const },
    bounce: { duration: 1000, easing: 'bounce' as const }
  };

  constructor(
    animationManager: AnimationManager,
    scene: THREE.Scene,
    camera: THREE.Camera,
    controls?: any
  ) {
    this.animationManager = animationManager;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    
    this.initializeViewPresets();
  }

  /**
   * 初始化预设视角
   */
  private initializeViewPresets(): void {
    const distance = 20;
    
    // 标准视角预设
    this.viewPresets.set('front', {
      name: '前视图',
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: {
        position: new THREE.Vector3(0, 0, distance),
        rotation: new THREE.Euler(0, 0, 0)
      },
      config: TransitionManager.TRANSITION_PRESETS.smooth
    });

    this.viewPresets.set('back', {
      name: '后视图',
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: {
        position: new THREE.Vector3(0, 0, -distance),
        rotation: new THREE.Euler(0, Math.PI, 0)
      },
      config: TransitionManager.TRANSITION_PRESETS.smooth
    });

    this.viewPresets.set('left', {
      name: '左视图',
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: {
        position: new THREE.Vector3(-distance, 0, 0),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0)
      },
      config: TransitionManager.TRANSITION_PRESETS.smooth
    });

    this.viewPresets.set('right', {
      name: '右视图',
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: {
        position: new THREE.Vector3(distance, 0, 0),
        rotation: new THREE.Euler(0, Math.PI / 2, 0)
      },
      config: TransitionManager.TRANSITION_PRESETS.smooth
    });

    this.viewPresets.set('top', {
      name: '顶视图',
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: {
        position: new THREE.Vector3(0, distance, 0),
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0)
      },
      config: TransitionManager.TRANSITION_PRESETS.smooth
    });

    this.viewPresets.set('bottom', {
      name: '底视图',
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: {
        position: new THREE.Vector3(0, -distance, 0),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0)
      },
      config: TransitionManager.TRANSITION_PRESETS.smooth
    });

    this.viewPresets.set('isometric', {
      name: '等轴视图',
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: {
        position: new THREE.Vector3(distance * 0.7, distance * 0.7, distance * 0.7),
        rotation: new THREE.Euler(-Math.PI / 6, Math.PI / 4, 0)
      },
      config: TransitionManager.TRANSITION_PRESETS.cinematic
    });
  }

  /**
   * 视角过渡
   */
  public transitionToView(
    viewName: string,
    config?: AnimationConfig
  ): Promise<void> {
    const preset = this.viewPresets.get(viewName);
    if (!preset) {
      throw new Error(`未找到视角预设: ${viewName}`);
    }

    const transitionConfig = config || preset.config || TransitionManager.TRANSITION_PRESETS.smooth;
    
    return new Promise((resolve) => {
      const animation = this.animationManager.animateCamera(preset.to, transitionConfig);
      
      animation.addEventListener('complete', () => {
        // 更新OrbitControls目标（如果存在）
        if (this.controls && this.controls.target) {
          this.controls.target.set(0, 0, 0);
          this.controls.update();
        }
        resolve();
      });
    });
  }

  /**
   * 平滑缩放到适配视口
   */
  public fitToScreen(
    objects?: THREE.Object3D[],
    config: AnimationConfig = TransitionManager.TRANSITION_PRESETS.smooth
  ): Promise<void> {
    const targetObjects = objects || this.scene.children.filter(child => 
      child instanceof THREE.Mesh || child instanceof THREE.Group
    );

    if (targetObjects.length === 0) {
      return Promise.resolve();
    }

    // 计算包围盒
    const box = new THREE.Box3();
    targetObjects.forEach(obj => {
      const objBox = new THREE.Box3().setFromObject(obj);
      box.union(objBox);
    });

    if (box.isEmpty()) {
      return Promise.resolve();
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // 计算相机距离
    let distance = maxDim * 2;
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const fov = this.camera.fov * (Math.PI / 180);
      distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
    }

    const cameraPosition = center.clone().add(new THREE.Vector3(distance, distance * 0.5, distance));

    return new Promise((resolve) => {
      const animation = this.animationManager.animateCamera({
        position: cameraPosition
      }, config);

      animation.addEventListener('complete', () => {
        if (this.controls && this.controls.target) {
          this.controls.target.copy(center);
          this.controls.update();
        }
        resolve();
      });
    });
  }

  /**
   * 模型加载过渡效果
   */
  public animateModelLoad(
    object: THREE.Object3D,
    transition: ModelLoadTransition
  ): Promise<void> {
    return new Promise((resolve) => {
      const config = transition.config || TransitionManager.TRANSITION_PRESETS.smooth;
      let animation;

      switch (transition.type) {
        case 'fadeIn':
          animation = this.animationManager.fadeIn(object, config);
          break;

        case 'scaleUp':
          const originalScale = object.scale.clone();
          object.scale.setScalar(0.01);
          animation = this.animationManager.animateObject(object, { scale: originalScale }, config);
          break;

        case 'slideIn':
          const originalPos = object.position.clone();
          const offset = this.getSlideOffset(transition.direction || 'top');
          object.position.add(offset);
          animation = this.animationManager.animateObject(object, { position: originalPos }, config);
          break;

        case 'spiral':
          animation = this.createSpiralAnimation(object, config);
          break;

        default:
          animation = this.animationManager.fadeIn(object, config);
      }

      animation.addEventListener('complete', () => resolve());
    });
  }

  /**
   * 获取滑入偏移
   */
  private getSlideOffset(direction: string): THREE.Vector3 {
    const offset = 20;
    switch (direction) {
      case 'top': return new THREE.Vector3(0, offset, 0);
      case 'bottom': return new THREE.Vector3(0, -offset, 0);
      case 'left': return new THREE.Vector3(-offset, 0, 0);
      case 'right': return new THREE.Vector3(offset, 0, 0);
      case 'front': return new THREE.Vector3(0, 0, offset);
      case 'back': return new THREE.Vector3(0, 0, -offset);
      default: return new THREE.Vector3(0, offset, 0);
    }
  }

  /**
   * 创建螺旋动画
   */
  private createSpiralAnimation(
    object: THREE.Object3D,
    config: AnimationConfig
  ) {
    const originalPos = object.position.clone();
    const originalScale = object.scale.clone();
    const originalRotation = object.rotation.clone();
    
    // 设置初始状态
    object.position.y += 10;
    object.scale.setScalar(0.1);
    object.rotation.y = Math.PI * 4;

    // 创建组合动画
    const animations = [
      this.animationManager.animateObject(object, { position: originalPos }, config),
      this.animationManager.animateObject(object, { scale: originalScale }, {
        ...config,
        delay: config.duration * 0.3
      }),
      this.animationManager.animateObject(object, { rotation: originalRotation }, config)
    ];

    this.animationManager.createAnimationGroup('spiral_load', animations);
    this.animationManager.playAnimationGroup('spiral_load');
    
    return animations[0]; // 返回主动画用于事件监听
  }

  /**
   * 场景过渡效果
   */
  public transitionScene(
    sceneTransition: SceneTransition
  ): Promise<void> {
    return new Promise((resolve) => {
      const animations = sceneTransition.objects.map((objTransition, index) => {
        const config = {
          ...sceneTransition.config,
          delay: objTransition.delay || 0
        };

        // 设置初始状态
        if (objTransition.from.position) {
          objTransition.object.position.copy(objTransition.from.position);
        }
        if (objTransition.from.rotation) {
          objTransition.object.rotation.copy(objTransition.from.rotation);
        }
        if (objTransition.from.scale) {
          objTransition.object.scale.copy(objTransition.from.scale);
        }

        return this.animationManager.animateObject(
          objTransition.object,
          objTransition.to,
          config
        );
      });

      // 监听最后一个动画完成
      if (animations.length > 0) {
        const lastAnimation = animations[animations.length - 1];
        lastAnimation.addEventListener('complete', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * 相机环绕动画
   */
  public orbitAroundTarget(
    target: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    radius: number = 10,
    duration: number = 5000,
    axis: 'x' | 'y' | 'z' = 'y'
  ): Promise<void> {
    return new Promise((resolve) => {
      const startAngle = 0;
      const endAngle = Math.PI * 2;
      
      const animation = this.animationManager.animateCamera({
        // 这里需要自定义动画逻辑来实现环绕
      }, {
        duration,
        easing: 'linear',
        autoStart: true
      });

      // 自定义更新函数实现环绕
      animation.addEventListener('update', (event) => {
        const progress = event.progress;
        const angle = startAngle + (endAngle - startAngle) * progress;
        
        const x = axis === 'x' ? target.x : target.x + Math.cos(angle) * radius;
        const y = axis === 'y' ? target.y + Math.sin(angle) * radius : target.y;
        const z = axis === 'z' ? target.z : target.z + Math.sin(angle) * radius;
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(target);
      });

      animation.addEventListener('complete', () => resolve());
    });
  }

  /**
   * 添加自定义视角预设
   */
  public addViewPreset(
    name: string,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    config?: AnimationConfig
  ): void {
    this.viewPresets.set(name, {
      name,
      from: { position: this.camera.position.clone(), rotation: this.camera.rotation.clone() },
      to: { position: position.clone(), rotation: rotation.clone() },
      config: config || TransitionManager.TRANSITION_PRESETS.smooth
    });
  }

  /**
   * 获取所有视角预设名称
   */
  public getViewPresetNames(): string[] {
    return Array.from(this.viewPresets.keys());
  }

  /**
   * 创建摄像机路径动画
   */
  public animateCameraPath(
    waypoints: Array<{
      position: THREE.Vector3;
      rotation?: THREE.Euler;
      duration: number;
    }>,
    smooth: boolean = true
  ): Promise<void> {
    return new Promise((resolve) => {
      let totalDelay = 0;
      const animations: any[] = [];

      waypoints.forEach((waypoint, index) => {
        const config: AnimationConfig = {
          duration: waypoint.duration,
          easing: smooth ? 'easeInOut' : 'linear',
          delay: totalDelay,
          autoStart: true
        };

        const target: any = { position: waypoint.position };
        if (waypoint.rotation) {
          target.rotation = waypoint.rotation;
        }

        const animation = this.animationManager.animateCamera(target, config);
        animations.push(animation);
        totalDelay += waypoint.duration;
      });

      // 监听最后一个动画完成
      if (animations.length > 0) {
        const lastAnimation = animations[animations.length - 1];
        lastAnimation.addEventListener('complete', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * 获取活跃过渡动画数量
   */
  public getActiveTransitionCount(): number {
    return this.animationManager.getActiveAnimationCount();
  }

  /**
   * 停止所有过渡动画
   */
  public stopAllTransitions(): void {
    this.animationManager.stopAllAnimations();
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.stopAllTransitions();
    this.viewPresets.clear();
    
    console.log('🧹 过渡管理器已清理');
  }
}