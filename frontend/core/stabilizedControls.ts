/**
 * 稳定化相机控制系统
 * 专门解决Three.js相机抖动问题
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface StabilizationConfig {
  // 平滑参数
  dampingFactor: number;
  rotationSmoothing: number;
  zoomSmoothing: number;
  panSmoothing: number;
  
  // 抗抖动参数
  velocityThreshold: number;
  accelerationThreshold: number;
  stabilizationStrength: number;
  
  // 精度参数
  minMovement: number;
  maxVelocity: number;
  
  // 适应性参数
  adaptiveSmoothing: boolean;
  performanceMode: boolean;
}

export class StabilizedControls {
  private controls!: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private config: StabilizationConfig;
  
  // 运动状态追踪
  private previousPosition = new THREE.Vector3();
  private previousTarget = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private acceleration = new THREE.Vector3();
  private angularVelocity = new THREE.Euler();
  
  // 平滑缓冲
  private positionBuffer: THREE.Vector3[] = [];
  private targetBuffer: THREE.Vector3[] = [];
  private rotationBuffer: THREE.Euler[] = [];
  private bufferSize = 5;
  
  // 性能监控
  private frameTime = 0;
  private lastFrameTime = 0;
  private smoothingQuality = 1.0;
  
  // 状态标志
  private isMoving = false;
  private isRotating = false;
  private isZooming = false;
  
  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    config: Partial<StabilizationConfig> = {}
  ) {
    this.camera = camera;
    this.config = {
      dampingFactor: 0.05,
      rotationSmoothing: 0.1,
      zoomSmoothing: 0.15,
      panSmoothing: 0.12,
      velocityThreshold: 0.01,
      accelerationThreshold: 0.005,
      stabilizationStrength: 0.8,
      minMovement: 0.001,
      maxVelocity: 10.0,
      adaptiveSmoothing: true,
      performanceMode: false,
      ...config
    };
    
    this.initializeControls(domElement);
    this.initializeBuffers();
    
    console.log('🎮 稳定化控制器初始化完成');
  }
  
  private initializeControls(domElement: HTMLElement): void {
    this.controls = new OrbitControls(this.camera, domElement);
    
    // 基础设置
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.config.dampingFactor;
    
    // 速度设置 - 降低以减少抖动
    this.controls.rotateSpeed = 0.3;
    this.controls.zoomSpeed = 0.6;
    this.controls.panSpeed = 0.5;
    
    // 平滑设置
    this.controls.screenSpacePanning = true;
    // 禁用键盘控制以减少冲突 (注：新版本OrbitControls已移除enableKeys属性)
    
    // 约束设置
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 2000;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    
    // 禁用自动旋转以避免冲突
    this.controls.autoRotate = false;
    
    // 事件监听
    this.controls.addEventListener('start', () => this.onControlStart());
    this.controls.addEventListener('change', () => this.onControlChange());
    this.controls.addEventListener('end', () => this.onControlEnd());
  }
  
  private initializeBuffers(): void {
    // 初始化缓冲区
    for (let i = 0; i < this.bufferSize; i++) {
      this.positionBuffer.push(this.camera.position.clone());
      this.targetBuffer.push(this.controls.target.clone());
      this.rotationBuffer.push(this.camera.rotation.clone());
    }
  }
  
  private onControlStart(): void {
    this.isMoving = true;
    console.log('🎯 控制开始');
  }
  
  private onControlChange(): void {
    this.updateMovementState();
  }
  
  private onControlEnd(): void {
    this.isMoving = false;
    this.isRotating = false;
    this.isZooming = false;
    console.log('🎯 控制结束');
  }
  
  private updateMovementState(): void {
    const currentPosition = this.camera.position.clone();
    const currentTarget = this.controls.target.clone();
    
    // 计算位置变化
    const positionDelta = currentPosition.clone().sub(this.previousPosition);
    const targetDelta = currentTarget.clone().sub(this.previousTarget);
    
    // 判断运动类型
    this.isRotating = positionDelta.length() > this.config.minMovement;
    this.isZooming = Math.abs(positionDelta.length() - this.previousPosition.distanceTo(this.controls.target)) > this.config.minMovement;
    
    // 更新前一帧状态
    this.previousPosition.copy(currentPosition);
    this.previousTarget.copy(currentTarget);
  }
  
  /**
   * 计算运动平滑度
   */
  private calculateVelocitySmoothing(): number {
    const currentTime = performance.now();
    this.frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // 基于帧率调整平滑度
    const targetFrameTime = 16.67; // 60 FPS
    const frameRatio = this.frameTime / targetFrameTime;
    
    // 帧率越低，平滑度越高
    return Math.min(1.0, Math.max(0.1, 1.0 - (frameRatio - 1.0) * 0.5));
  }
  
  /**
   * 应用位置平滑
   */
  private applyPositionSmoothing(): void {
    if (!this.isMoving && !this.config.performanceMode) return;
    
    const smoothing = this.config.adaptiveSmoothing ? 
      this.calculateVelocitySmoothing() : 1.0;
    
    // 更新位置缓冲
    this.positionBuffer.shift();
    this.positionBuffer.push(this.camera.position.clone());
    
    // 计算平滑位置
    const smoothedPosition = new THREE.Vector3();
    let totalWeight = 0;
    
    for (let i = 0; i < this.positionBuffer.length; i++) {
      const weight = (i + 1) / this.positionBuffer.length;
      smoothedPosition.add(this.positionBuffer[i].clone().multiplyScalar(weight));
      totalWeight += weight;
    }
    
    smoothedPosition.divideScalar(totalWeight);
    
    // 应用平滑（仅在移动时）
    if (this.isMoving) {
      const smoothingFactor = this.config.panSmoothing * smoothing;
      this.camera.position.lerp(smoothedPosition, smoothingFactor);
    }
  }
  
  /**
   * 应用旋转平滑
   */
  private applyRotationSmoothing(): void {
    if (!this.isRotating && !this.config.performanceMode) return;
    
    const smoothing = this.config.adaptiveSmoothing ? 
      this.calculateVelocitySmoothing() : 1.0;
    
    // 更新旋转缓冲
    this.rotationBuffer.shift();
    this.rotationBuffer.push(this.camera.rotation.clone());
    
    // 计算平滑旋转
    const smoothedRotation = new THREE.Euler();
    let totalWeight = 0;
    
    for (let i = 0; i < this.rotationBuffer.length; i++) {
      const weight = (i + 1) / this.rotationBuffer.length;
      const rotation = this.rotationBuffer[i];
      
      smoothedRotation.x += rotation.x * weight;
      smoothedRotation.y += rotation.y * weight;
      smoothedRotation.z += rotation.z * weight;
      totalWeight += weight;
    }
    
    smoothedRotation.x /= totalWeight;
    smoothedRotation.y /= totalWeight;
    smoothedRotation.z /= totalWeight;
    
    // 应用平滑（仅在旋转时）
    if (this.isRotating) {
      const smoothingFactor = this.config.rotationSmoothing * smoothing;
      
      this.camera.rotation.x = THREE.MathUtils.lerp(
        this.camera.rotation.x, 
        smoothedRotation.x, 
        smoothingFactor
      );
      this.camera.rotation.y = THREE.MathUtils.lerp(
        this.camera.rotation.y, 
        smoothedRotation.y, 
        smoothingFactor
      );
      this.camera.rotation.z = THREE.MathUtils.lerp(
        this.camera.rotation.z, 
        smoothedRotation.z, 
        smoothingFactor
      );
    }
  }
  
  /**
   * 应用缩放平滑
   */
  private applyZoomSmoothing(): void {
    if (!this.isZooming) return;
    
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const smoothingFactor = this.config.zoomSmoothing;
    
    // 限制缩放速度
    const maxZoomSpeed = this.config.maxVelocity * 0.1;
    const deltaDistance = Math.abs(currentDistance - this.previousPosition.distanceTo(this.controls.target));
    
    if (deltaDistance > maxZoomSpeed) {
      const direction = this.camera.position.clone().sub(this.controls.target).normalize();
      const clampedDistance = this.previousPosition.distanceTo(this.controls.target) + 
        Math.sign(currentDistance - this.previousPosition.distanceTo(this.controls.target)) * maxZoomSpeed;
      
      this.camera.position.copy(this.controls.target).add(direction.multiplyScalar(clampedDistance));
    }
  }
  
  /**
   * 检测并修正抖动
   */
  private detectAndCorrectJitter(): void {
    // 计算速度变化
    const currentVelocity = this.camera.position.clone().sub(this.previousPosition);
    const velocityChange = currentVelocity.clone().sub(this.velocity);
    
    // 检测高频抖动
    if (velocityChange.length() > this.config.accelerationThreshold) {
      // 应用抗抖动修正
      const correctionFactor = this.config.stabilizationStrength;
      const correctedPosition = this.camera.position.clone().lerp(this.previousPosition, correctionFactor);
      
      this.camera.position.copy(correctedPosition);
      
      console.log('🔧 检测到抖动，应用修正');
    }
    
    // 更新速度
    this.velocity.copy(currentVelocity);
  }
  
  /**
   * 主更新函数
   */
  update(): void {
    // 更新基础控制器
    this.controls.update();
    
    // 应用各种平滑
    this.applyPositionSmoothing();
    this.applyRotationSmoothing();
    this.applyZoomSmoothing();
    
    // 检测并修正抖动
    this.detectAndCorrectJitter();
    
    // 更新性能质量
    if (this.config.adaptiveSmoothing) {
      this.updateSmoothingQuality();
    }
  }
  
  /**
   * 更新平滑质量
   */
  private updateSmoothingQuality(): void {
    const targetFrameTime = 16.67; // 60 FPS
    const qualityFactor = targetFrameTime / Math.max(this.frameTime, 1);
    
    this.smoothingQuality = Math.min(1.0, Math.max(0.3, qualityFactor));
    
    // 根据性能调整配置
    if (this.smoothingQuality < 0.7) {
      this.config.performanceMode = true;
      this.bufferSize = 3; // 减少缓冲区大小
    } else {
      this.config.performanceMode = false;
      this.bufferSize = 5; // 恢复缓冲区大小
    }
  }
  
  /**
   * 设置相机位置
   */
  setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.previousPosition.copy(this.camera.position);
  }
  
  /**
   * 设置目标位置
   */
  setTarget(x: number, y: number, z: number): void {
    this.controls.target.set(x, y, z);
    this.previousTarget.copy(this.controls.target);
  }
  
  /**
   * 启用/禁用控制
   */
  setEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }
  
  /**
   * 获取控制器实例
   */
  getControls(): OrbitControls {
    return this.controls;
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    frameTime: number;
    smoothingQuality: number;
    isMoving: boolean;
    isRotating: boolean;
    isZooming: boolean;
  } {
    return {
      frameTime: this.frameTime,
      smoothingQuality: this.smoothingQuality,
      isMoving: this.isMoving,
      isRotating: this.isRotating,
      isZooming: this.isZooming
    };
  }
  
  /**
   * 重置稳定化状态
   */
  reset(): void {
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.isMoving = false;
    this.isRotating = false;
    this.isZooming = false;
    
    // 重置缓冲区
    this.initializeBuffers();
    
    console.log('🔄 稳定化控制器已重置');
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    this.controls.dispose();
    console.log('🧹 稳定化控制器已清理');
  }
}

// 创建稳定化控制器的工厂函数
export function createStabilizedControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  config: Partial<StabilizationConfig> = {}
): StabilizedControls {
  return new StabilizedControls(camera, domElement, config);
} 