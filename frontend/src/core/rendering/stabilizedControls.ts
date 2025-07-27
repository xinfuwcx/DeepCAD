import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * StabilizedControls 扩展了 OrbitControls，通过运动缓冲和平滑算法
 * 来减少相机移动时的抖动，提供更稳定、更流畅的用户体验。
 */
export class StabilizedControls extends OrbitControls {
  // --- 平滑参数 ---
  public positionSmoothing = true;
  public targetSmoothing = true;
  public positionDamping = 0.05; // 值越小越平滑，但响应越慢 (0 to 1)
  public targetDamping = 0.08;   // 值越小越平滑

  // --- 内部状态 ---
  private readonly _targetPosition = new THREE.Vector3();
  private readonly _targetTarget = new THREE.Vector3();

  // 记录初始的target，因为OrbitControls会修改它
  private _initialTarget = new THREE.Vector3();
  private clock = new THREE.Clock();

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    super(camera, domElement);
    this._initialTarget.copy(this.target);
    this._targetPosition.copy(camera.position);
    this._targetTarget.copy(this.target);
  }

  /**
   * 重写 update 方法以应用平滑。
   * @returns {boolean} - 如果控件已更新，则返回true。
   */
  public update(): boolean {
    const delta = this.getDelta();
    if (delta === 0) return false;

    // 首先，调用原始的 update 方法来计算出 "理想" 的下一帧相机位置和目标
    // 但我们先禁用其内部的 damping，因为我们将自己实现更精细的平滑
    const originalEnableDamping = this.enableDamping;
    this.enableDamping = false;
    super.update(delta);
    this.enableDamping = originalEnableDamping;

    let hasChanged = false;

    // 如果启用了位置平滑
    if (this.positionSmoothing) {
      // 使用 LERP (线性插值) 来平滑地移动相机到理想位置
      this._targetPosition.lerp(this.object.position, this.positionDamping);
      
      // 只有在距离足够远时才更新，避免微小的浮点数变化
      if (this.object.position.distanceToSquared(this._targetPosition) > 1e-6) {
        this.object.position.copy(this._targetPosition);
        hasChanged = true;
      }
    }

    // 如果启用了目标点平滑
    if (this.targetSmoothing) {
      // 平滑移动目标点
      this._targetTarget.lerp(this.target, this.targetDamping);

      if (this.target.distanceToSquared(this._targetTarget) > 1e-6) {
        this.target.copy(this._targetTarget);
        hasChanged = true;
      }
    }

    // 调用原始的 update 以应用旋转等其他效果，此时不应该有 delta
    if (hasChanged) {
      super.update(0);
    }
    
    return hasChanged;
  }
  
  // 覆盖 getDelta 方法，如果需要可以自定义时间增量
  private getDelta(): number {
    return this.clock.getDelta();
  }
} 