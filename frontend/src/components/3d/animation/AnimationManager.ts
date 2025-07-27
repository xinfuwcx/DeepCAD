import * as THREE from 'three';
// 使用内置的简单补间动画实现
class SimpleTween {
  private startTime: number = 0;
  private duration: number = 1000;
  private startValues: any = {};
  private targetValues: any = {};
  private currentValues: any = {};
  private easingFunction: (t: number) => number = (t) => t;
  private isRunning: boolean = false;
  private onUpdateCallback?: (values: any) => void;
  private onCompleteCallback?: () => void;
  private onStartCallback?: () => void;
  private onStopCallback?: () => void;
  private delayTime: number = 0;
  private repeatCount: number = 0;
  private currentRepeat: number = 0;
  private yoyoEnabled: boolean = false;
  private isYoyoReverse: boolean = false;

  constructor(startValues: any) {
    this.startValues = { ...startValues };
    this.currentValues = { ...startValues };
  }

  to(targetValues: any, duration: number): SimpleTween {
    this.targetValues = { ...targetValues };
    this.duration = duration;
    return this;
  }

  easing(easingFn: (t: number) => number): SimpleTween {
    this.easingFunction = easingFn;
    return this;
  }

  delay(delayMs: number): SimpleTween {
    this.delayTime = delayMs;
    return this;
  }

  repeat(count: number): SimpleTween {
    this.repeatCount = count;
    return this;
  }

  yoyo(enabled: boolean): SimpleTween {
    this.yoyoEnabled = enabled;
    return this;
  }

  onStart(callback: () => void): SimpleTween {
    this.onStartCallback = callback;
    return this;
  }

  onUpdate(callback: (values: any) => void): SimpleTween {
    this.onUpdateCallback = callback;
    return this;
  }

  onComplete(callback: () => void): SimpleTween {
    this.onCompleteCallback = callback;
    return this;
  }

  onStop(callback: () => void): SimpleTween {
    this.onStopCallback = callback;
    return this;
  }

  start(): SimpleTween {
    this.startTime = performance.now() + this.delayTime;
    this.isRunning = true;
    this.currentRepeat = 0;
    this.isYoyoReverse = false;
    
    if (this.onStartCallback) {
      this.onStartCallback();
    }
    
    this.animate();
    return this;
  }

  stop(): SimpleTween {
    this.isRunning = false;
    if (this.onStopCallback) {
      this.onStopCallback();
    }
    return this;
  }

  private animate(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    
    if (now < this.startTime) {
      requestAnimationFrame(() => this.animate());
      return;
    }

    const elapsed = now - this.startTime;
    let progress = Math.min(elapsed / this.duration, 1);

    if (this.isYoyoReverse) {
      progress = 1 - progress;
    }

    const easedProgress = this.easingFunction(progress);

    // 更新当前值
    Object.keys(this.targetValues).forEach(key => {
      const start = this.startValues[key];
      const target = this.targetValues[key];
      
      if (typeof start === 'number' && typeof target === 'number') {
        this.currentValues[key] = start + (target - start) * easedProgress;
      } else if (start && typeof start === 'object' && 'x' in start) {
        // Vector3/Euler类型
        this.currentValues[key] = {
          x: start.x + (target.x - start.x) * easedProgress,
          y: start.y + (target.y - start.y) * easedProgress,
          z: start.z + (target.z - start.z) * easedProgress
        };
      } else if (start && typeof start === 'object' && 'r' in start) {
        // Color类型
        this.currentValues[key] = {
          r: start.r + (target.r - start.r) * easedProgress,
          g: start.g + (target.g - start.g) * easedProgress,
          b: start.b + (target.b - start.b) * easedProgress
        };
      }
    });

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.currentValues);
    }

    if (progress >= 1) {
      // 动画完成
      if (this.yoyoEnabled && !this.isYoyoReverse) {
        this.isYoyoReverse = true;
        this.startTime = performance.now();
        this.animate();
        return;
      }

      if (this.repeatCount > 0 && this.currentRepeat < this.repeatCount) {
        this.currentRepeat++;
        this.startTime = performance.now();
        this.isYoyoReverse = false;
        this.animate();
        return;
      }

      this.isRunning = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    } else {
      requestAnimationFrame(() => this.animate());
    }
  }
}

// 简单的缓动函数
const EASING = {
  Linear: {
    None: (t: number) => t
  },
  Quadratic: {
    In: (t: number) => t * t,
    Out: (t: number) => t * (2 - t),
    InOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  },
  Bounce: {
    Out: (t: number) => {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      } else {
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      }
    }
  },
  Elastic: {
    Out: (t: number) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * (2 * Math.PI) / 0.4) + 1;
    }
  }
};

// 替换TWEEN
const TWEEN = {
  Tween: SimpleTween,
  Easing: EASING,
  update: () => {} // 不需要全局更新，每个动画自己管理
};

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  autoStart?: boolean;
}

export interface CameraAnimationTarget {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  zoom?: number;
  fov?: number;
  target?: THREE.Vector3; // For OrbitControls
}

export interface ObjectAnimationTarget {
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  opacity?: number;
  color?: THREE.Color;
  morphTargetInfluences?: number[];
}

export interface MaterialAnimationTarget {
  opacity?: number;
  color?: THREE.Color;
  emissive?: THREE.Color;
  metalness?: number;
  roughness?: number;
  transmission?: number;
}

export type AnimationEventType = 'start' | 'update' | 'complete' | 'stop';

export interface AnimationEvent {
  type: AnimationEventType;
  animation: Animation;
  progress: number;
}

/**
 * 动画实例
 */
export class Animation {
  public id: string;
  public name: string;
  public target: any;
  public config: AnimationConfig;
  public tween: SimpleTween;
  public isPlaying: boolean = false;
  public isPaused: boolean = false;
  public progress: number = 0;
  
  private callbacks: Map<AnimationEventType, ((event: AnimationEvent) => void)[]> = new Map();

  constructor(
    id: string,
    name: string,
    target: any,
    from: any,
    to: any,
    config: AnimationConfig
  ) {
    this.id = id;
    this.name = name;
    this.target = target;
    this.config = config;

    // 初始化回调映射
    this.callbacks.set('start', []);
    this.callbacks.set('update', []);
    this.callbacks.set('complete', []);
    this.callbacks.set('stop', []);

    // 创建Tween动画
    this.tween = new TWEEN.Tween(from)
      .to(to, config.duration)
      .easing(this.getEasingFunction(config.easing))
      .delay(config.delay || 0)
      .repeat(config.repeat || 0)
      .yoyo(config.yoyo || false)
      .onStart(() => {
        this.isPlaying = true;
        this.isPaused = false;
        this.emitEvent('start', 0);
      })
      .onUpdate((values) => {
        // 应用动画值到目标对象
        this.applyValues(values);
        this.emitEvent('update', this.progress);
      })
      .onComplete(() => {
        this.isPlaying = false;
        this.isPaused = false;
        this.progress = 1;
        this.emitEvent('complete', 1);
      })
      .onStop(() => {
        this.isPlaying = false;
        this.isPaused = false;
        this.emitEvent('stop', this.progress);
      });

    if (config.autoStart) {
      this.start();
    }
  }

  /**
   * 应用动画值到目标对象
   */
  private applyValues(values: any): void {
    Object.keys(values).forEach(key => {
      if (this.target && key in this.target) {
        const value = values[key];
        
        // 处理Vector3类型
        if (this.target[key] instanceof THREE.Vector3) {
          if (typeof value === 'object' && 'x' in value) {
            this.target[key].copy(value);
          }
        }
        // 处理Euler类型
        else if (this.target[key] instanceof THREE.Euler) {
          if (typeof value === 'object' && 'x' in value) {
            this.target[key].set(value.x, value.y, value.z);
          }
        }
        // 处理Color类型
        else if (this.target[key] instanceof THREE.Color) {
          if (typeof value === 'object' && 'r' in value) {
            this.target[key].setRGB(value.r, value.g, value.b);
          }
        }
        // 处理数值类型
        else {
          this.target[key] = value;
        }
      }
    });
  }

  /**
   * 获取缓动函数
   */
  private getEasingFunction(easing: string): (t: number) => number {
    switch (easing) {
      case 'linear':
        return TWEEN.Easing.Linear.None;
      case 'easeIn':
        return TWEEN.Easing.Quadratic.In;
      case 'easeOut':
        return TWEEN.Easing.Quadratic.Out;
      case 'easeInOut':
        return TWEEN.Easing.Quadratic.InOut;
      case 'bounce':
        return TWEEN.Easing.Bounce.Out;
      case 'elastic':
        return TWEEN.Easing.Elastic.Out;
      default:
        return TWEEN.Easing.Quadratic.InOut;
    }
  }

  /**
   * 发射事件
   */
  private emitEvent(type: AnimationEventType, progress: number): void {
    this.progress = progress;
    const callbacks = this.callbacks.get(type) || [];
    const event: AnimationEvent = {
      type,
      animation: this,
      progress
    };
    
    callbacks.forEach(callback => callback(event));
  }

  /**
   * 开始动画
   */
  public start(): void {
    this.tween.start();
  }

  /**
   * 停止动画
   */
  public stop(): void {
    this.tween.stop();
  }

  /**
   * 暂停动画
   */
  public pause(): void {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      // TWEEN.js 不直接支持暂停，需要手动实现
    }
  }

  /**
   * 恢复动画
   */
  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
    }
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(type: AnimationEventType, callback: (event: AnimationEvent) => void): void {
    const callbacks = this.callbacks.get(type) || [];
    callbacks.push(callback);
    this.callbacks.set(type, callbacks);
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(type: AnimationEventType, callback: (event: AnimationEvent) => void): void {
    const callbacks = this.callbacks.get(type) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
}

/**
 * 动画管理器
 * 管理所有3D场景中的动画效果
 */
export class AnimationManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private animations: Map<string, Animation> = new Map();
  private animationGroups: Map<string, Animation[]> = new Map();
  private isRunning: boolean = false;
  
  // 预定义动画配置
  public static readonly PRESETS = {
    quick: { duration: 300, easing: 'easeOut' as const },
    normal: { duration: 600, easing: 'easeInOut' as const },
    slow: { duration: 1000, easing: 'easeInOut' as const },
    bounce: { duration: 800, easing: 'bounce' as const },
    elastic: { duration: 1200, easing: 'elastic' as const }
  };

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.startAnimationLoop();
  }

  /**
   * 启动动画循环
   */
  private startAnimationLoop(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    const animate = () => {
      if (!this.isRunning) return;
      
      TWEEN.update();
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * 停止动画循环
   */
  public stopAnimationLoop(): void {
    this.isRunning = false;
  }

  /**
   * 创建相机动画
   */
  public animateCamera(
    target: CameraAnimationTarget,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    const id = this.generateId('camera');
    
    // 获取当前相机状态
    const from: any = {};
    const to: any = {};
    
    if (target.position) {
      from.position = this.camera.position.clone();
      to.position = target.position.clone();
    }
    
    if (target.rotation) {
      from.rotation = this.camera.rotation.clone();
      to.rotation = target.rotation.clone();
    }
    
    if (target.zoom && this.camera instanceof THREE.OrthographicCamera) {
      from.zoom = this.camera.zoom;
      to.zoom = target.zoom;
    }
    
    if (target.fov && this.camera instanceof THREE.PerspectiveCamera) {
      from.fov = this.camera.fov;
      to.fov = target.fov;
    }

    const animation = new Animation(id, 'camera_animation', this.camera, from, to, config);
    
    // 特殊处理相机更新
    animation.addEventListener('update', () => {
      if (this.camera instanceof THREE.PerspectiveCamera && target.fov) {
        this.camera.updateProjectionMatrix();
      }
    });

    this.animations.set(id, animation);
    return animation;
  }

  /**
   * 创建对象动画
   */
  public animateObject(
    object: THREE.Object3D,
    target: ObjectAnimationTarget,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    const id = this.generateId('object');
    
    const from: any = {};
    const to: any = {};
    
    if (target.position) {
      from.position = object.position.clone();
      to.position = target.position.clone();
    }
    
    if (target.rotation) {
      from.rotation = object.rotation.clone();
      to.rotation = target.rotation.clone();
    }
    
    if (target.scale) {
      from.scale = object.scale.clone();
      to.scale = target.scale.clone();
    }
    
    if (target.opacity !== undefined && object instanceof THREE.Mesh) {
      const material = object.material as THREE.Material;
      from.opacity = material.opacity;
      to.opacity = target.opacity;
    }

    const animation = new Animation(id, 'object_animation', object, from, to, config);
    this.animations.set(id, animation);
    return animation;
  }

  /**
   * 创建材质动画
   */
  public animateMaterial(
    material: THREE.Material,
    target: MaterialAnimationTarget,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    const id = this.generateId('material');
    
    const from: any = {};
    const to: any = {};
    
    if (target.opacity !== undefined) {
      from.opacity = material.opacity;
      to.opacity = target.opacity;
    }
    
    if (target.color && 'color' in material) {
      from.color = (material as any).color.clone();
      to.color = target.color.clone();
    }
    
    if (target.emissive && 'emissive' in material) {
      from.emissive = (material as any).emissive.clone();
      to.emissive = target.emissive.clone();
    }
    
    if (target.metalness !== undefined && 'metalness' in material) {
      from.metalness = (material as any).metalness;
      to.metalness = target.metalness;
    }
    
    if (target.roughness !== undefined && 'roughness' in material) {
      from.roughness = (material as any).roughness;
      to.roughness = target.roughness;
    }

    const animation = new Animation(id, 'material_animation', material, from, to, config);
    this.animations.set(id, animation);
    return animation;
  }

  /**
   * 创建淡入动画
   */
  public fadeIn(
    object: THREE.Object3D,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    if (object instanceof THREE.Mesh) {
      const material = object.material as THREE.Material;
      material.transparent = true;
      material.opacity = 0;
      
      return this.animateMaterial(material, { opacity: 1 }, config);
    }
    
    throw new Error('Object must be a Mesh for fade animation');
  }

  /**
   * 创建淡出动画
   */
  public fadeOut(
    object: THREE.Object3D,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    if (object instanceof THREE.Mesh) {
      const material = object.material as THREE.Material;
      material.transparent = true;
      
      return this.animateMaterial(material, { opacity: 0 }, config);
    }
    
    throw new Error('Object must be a Mesh for fade animation');
  }

  /**
   * 创建飞入动画
   */
  public flyIn(
    object: THREE.Object3D,
    fromPosition: THREE.Vector3,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    const originalPosition = object.position.clone();
    object.position.copy(fromPosition);
    
    return this.animateObject(object, { position: originalPosition }, config);
  }

  /**
   * 创建缩放动画
   */
  public scaleAnimation(
    object: THREE.Object3D,
    targetScale: THREE.Vector3,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    return this.animateObject(object, { scale: targetScale }, config);
  }

  /**
   * 创建旋转动画
   */
  public rotateAnimation(
    object: THREE.Object3D,
    targetRotation: THREE.Euler,
    config: AnimationConfig = AnimationManager.PRESETS.normal
  ): Animation {
    return this.animateObject(object, { rotation: targetRotation }, config);
  }

  /**
   * 创建脉冲动画
   */
  public pulseAnimation(
    object: THREE.Object3D,
    scale: number = 1.2,
    config: Partial<AnimationConfig> = {}
  ): Animation {
    const pulseConfig: AnimationConfig = {
      ...AnimationManager.PRESETS.bounce,
      repeat: Infinity,
      yoyo: true,
      ...config
    };
    
    const originalScale = object.scale.clone();
    const targetScale = originalScale.clone().multiplyScalar(scale);
    
    return this.animateObject(object, { scale: targetScale }, pulseConfig);
  }

  /**
   * 创建动画组
   */
  public createAnimationGroup(groupName: string, animations: Animation[]): void {
    this.animationGroups.set(groupName, animations);
  }

  /**
   * 播放动画组
   */
  public playAnimationGroup(groupName: string, sequential: boolean = false): void {
    const animations = this.animationGroups.get(groupName);
    if (!animations) return;

    if (sequential) {
      // 顺序播放
      let delay = 0;
      animations.forEach((animation, index) => {
        animation.config.delay = delay;
        animation.start();
        delay += animation.config.duration;
      });
    } else {
      // 同时播放
      animations.forEach(animation => animation.start());
    }
  }

  /**
   * 停止动画组
   */
  public stopAnimationGroup(groupName: string): void {
    const animations = this.animationGroups.get(groupName);
    if (!animations) return;

    animations.forEach(animation => animation.stop());
  }

  /**
   * 获取动画
   */
  public getAnimation(id: string): Animation | undefined {
    return this.animations.get(id);
  }

  /**
   * 停止动画
   */
  public stopAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.stop();
      this.animations.delete(id);
    }
  }

  /**
   * 停止所有动画
   */
  public stopAllAnimations(): void {
    this.animations.forEach(animation => animation.stop());
    this.animations.clear();
  }

  /**
   * 暂停所有动画
   */
  public pauseAllAnimations(): void {
    this.animations.forEach(animation => animation.pause());
  }

  /**
   * 恢复所有动画
   */
  public resumeAllAnimations(): void {
    this.animations.forEach(animation => animation.resume());
  }

  /**
   * 获取活跃动画数量
   */
  public getActiveAnimationCount(): number {
    return Array.from(this.animations.values()).filter(animation => animation.isPlaying).length;
  }

  /**
   * 获取所有动画信息
   */
  public getAnimationInfo(): Array<{
    id: string;
    name: string;
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;
  }> {
    return Array.from(this.animations.values()).map(animation => ({
      id: animation.id,
      name: animation.name,
      isPlaying: animation.isPlaying,
      isPaused: animation.isPaused,
      progress: animation.progress
    }));
  }

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string = 'anim'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.stopAllAnimations();
    this.animationGroups.clear();
    this.stopAnimationLoop();
    
    console.log('🧹 动画管理器已清理');
  }
}