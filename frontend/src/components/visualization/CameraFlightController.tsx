/**
 * DeepCAD 电影级相机飞行控制器
 * 1号架构师 - 从太空到基坑的震撼视觉飞行体验
 */

import * as THREE from 'three';

// ==================== 飞行路径点类型定义 ====================

export interface FlightWaypoint {
  position: THREE.Vector3;
  target: THREE.Vector3;
  duration: number;
  fov?: number;
  description?: string;
}

export interface FlightSequence {
  name: string;
  waypoints: FlightWaypoint[];
  totalDuration: number;
  music?: string;
  narration?: string[];
}

// ==================== 相机飞行控制器类 ====================

export class CameraFlightController {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private isFlying: boolean = false;
  private currentSequence: FlightSequence | null = null;
  private animationId: number | null = null;
  
  // 飞行状态回调
  private onFlightStart?: () => void;
  private onFlightComplete?: () => void;
  private onWaypointReached?: (waypoint: FlightWaypoint, index: number) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    callbacks?: {
      onFlightStart?: () => void;
      onFlightComplete?: () => void;
      onWaypointReached?: (waypoint: FlightWaypoint, index: number) => void;
    }
  ) {
    this.camera = camera;
    this.scene = scene;
    this.onFlightStart = callbacks?.onFlightStart;
    this.onFlightComplete = callbacks?.onFlightComplete;
    this.onWaypointReached = callbacks?.onWaypointReached;
  }

  // ==================== 预设飞行序列 ====================

  /**
   * 史诗级开场飞行 - 从太空深处飞向地球，再深入基坑
   */
  getEpicOpeningSequence(): FlightSequence {
    return {
      name: 'epic-opening',
      totalDuration: 30000,
      waypoints: [
        {
          position: new THREE.Vector3(0, 0, 200000),
          target: new THREE.Vector3(0, 0, 0),
          duration: 3000,
          fov: 60,
          description: '太空深处 - 俯瞰地球全貌'
        },
        {
          position: new THREE.Vector3(0, 50000, 50000),
          target: new THREE.Vector3(0, 0, 0),
          duration: 5000,
          fov: 50,
          description: '接近地球 - 大气层闪闪发光'
        },
        {
          position: new THREE.Vector3(0, 10000, 10000),
          target: new THREE.Vector3(0, 0, 0),
          duration: 7000,
          fov: 40,
          description: '进入大气层 - 城市轮廓清晰可见'
        },
        {
          position: new THREE.Vector3(0, 1000, 1000),
          target: new THREE.Vector3(0, 0, 0),
          duration: 8000,
          fov: 35,
          description: '城市上空 - 建筑物细节显现'
        },
        {
          position: new THREE.Vector3(0, 100, 200),
          target: new THREE.Vector3(0, -15, 0),
          duration: 7000,
          fov: 30,
          description: '基坑现场 - 深基坑工程全貌'
        }
      ]
    };
  }

  /**
   * 全球巡航飞行 - 展示全球深基坑项目
   */
  getGlobalTourSequence(): FlightSequence {
    return {
      name: 'global-tour',
      totalDuration: 45000,
      waypoints: [
        {
          position: new THREE.Vector3(0, 0, 15000),
          target: new THREE.Vector3(0, 0, 0),
          duration: 5000,
          fov: 45,
          description: '全球视角 - 项目分布概览'
        },
        {
          position: new THREE.Vector3(8000, 2000, 8000),
          target: new THREE.Vector3(8000, 0, 0),
          duration: 8000,
          fov: 40,
          description: '亚洲项目 - 上海陆家嘴'
        },
        {
          position: new THREE.Vector3(-5000, 2000, 6000),
          target: new THREE.Vector3(-5000, 0, 0),
          duration: 8000,
          fov: 40,
          description: '欧洲项目 - 伦敦金融城'
        },
        {
          position: new THREE.Vector3(-8000, 2000, -4000),
          target: new THREE.Vector3(-8000, 0, 0),
          duration: 8000,
          fov: 40,
          description: '北美项目 - 纽约曼哈顿'
        },
        {
          position: new THREE.Vector3(6000, 2000, -6000),
          target: new THREE.Vector3(6000, 0, 0),
          duration: 8000,
          fov: 40,
          description: '中东项目 - 迪拜'
        },
        {
          position: new THREE.Vector3(0, 3000, 5000),
          target: new THREE.Vector3(0, 0, 0),
          duration: 8000,
          fov: 50,
          description: '回到全球视角'
        }
      ]
    };
  }

  /**
   * 施工演示飞行 - 深入基坑内部展示施工过程
   */
  getConstructionDemoSequence(): FlightSequence {
    return {
      name: 'construction-demo',
      totalDuration: 60000,
      waypoints: [
        {
          position: new THREE.Vector3(100, 50, 150),
          target: new THREE.Vector3(0, 0, 0),
          duration: 5000,
          fov: 35,
          description: '基坑全景 - 施工现场概览'
        },
        {
          position: new THREE.Vector3(80, 20, 80),
          target: new THREE.Vector3(0, -5, 0),
          duration: 8000,
          fov: 30,
          description: '围护结构 - 地下连续墙施工'
        },
        {
          position: new THREE.Vector3(50, 10, 50),
          target: new THREE.Vector3(0, -10, 0),
          duration: 10000,
          fov: 25,
          description: '开挖过程 - 分层开挖作业'
        },
        {
          position: new THREE.Vector3(20, 5, 30),
          target: new THREE.Vector3(0, -15, 0),
          duration: 12000,
          fov: 20,
          description: '支撑系统 - 钢支撑安装'
        },
        {
          position: new THREE.Vector3(10, -5, 20),
          target: new THREE.Vector3(0, -20, 0),
          duration: 15000,
          fov: 18,
          description: '基坑底部 - 基础施工'
        },
        {
          position: new THREE.Vector3(30, 0, 40),
          target: new THREE.Vector3(0, -12, 0),
          duration: 10000,
          fov: 25,
          description: '施工完成 - 整体效果展示'
        }
      ]
    };
  }

  // ==================== 飞行控制方法 ====================

  /**
   * 开始飞行序列
   */
  async startFlightSequence(sequence: FlightSequence): Promise<void> {
    if (this.isFlying) {
      this.stopFlight();
    }

    this.currentSequence = sequence;
    this.isFlying = true;
    this.onFlightStart?.();

    try {
      for (let i = 0; i < sequence.waypoints.length; i++) {
        if (!this.isFlying) break;
        
        const waypoint = sequence.waypoints[i];
        await this.flyToWaypoint(waypoint, i);
        
        this.onWaypointReached?.(waypoint, i);
      }
    } catch (error) {
      console.error('Flight sequence error:', error);
    } finally {
      this.isFlying = false;
      this.onFlightComplete?.();
    }
  }

  /**
   * 飞行到指定路径点
   */
  private flyToWaypoint(waypoint: FlightWaypoint, index: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const startPosition = this.camera.position.clone();
      const startTarget = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).add(this.camera.position);
      const startFov = this.camera.fov;

      const animate = (currentTime: number) => {
        if (!this.isFlying) {
          resolve();
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / waypoint.duration, 1);
        
        // 使用easeInOutCubic缓动函数
        const eased = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // 插值位置
        this.camera.position.lerpVectors(startPosition, waypoint.position, eased);
        
        // 插值视角
        if (waypoint.fov) {
          this.camera.fov = startFov + (waypoint.fov - startFov) * eased;
          this.camera.updateProjectionMatrix();
        }

        // 插值目标朝向
        const currentTarget = new THREE.Vector3().lerpVectors(startTarget, waypoint.target, eased);
        this.camera.lookAt(currentTarget);

        if (progress >= 1) {
          resolve();
        } else {
          this.animationId = requestAnimationFrame(animate);
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  }

  /**
   * 平滑飞行到指定位置
   */
  flyToPosition(
    position: THREE.Vector3,
    target: THREE.Vector3,
    duration: number = 2000,
    fov?: number
  ): Promise<void> {
    const waypoint: FlightWaypoint = {
      position,
      target,
      duration,
      fov
    };

    return this.flyToWaypoint(waypoint, 0);
  }

  /**
   * 停止当前飞行
   */
  stopFlight(): void {
    this.isFlying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 暂停飞行
   */
  pauseFlight(): void {
    this.isFlying = false;
  }

  /**
   * 恢复飞行
   */
  resumeFlight(): void {
    if (this.currentSequence && !this.isFlying) {
      this.isFlying = true;
    }
  }

  /**
   * 获取当前飞行状态
   */
  getFlightStatus(): {
    isFlying: boolean;
    currentSequence: string | null;
  } {
    return {
      isFlying: this.isFlying,
      currentSequence: this.currentSequence?.name || null
    };
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    this.stopFlight();
    this.currentSequence = null;
  }
}

// ==================== 预设飞行序列工厂 ====================

export const FlightSequences = {
  /**
   * 创建史诗级开场飞行
   */
  createEpicOpening: (controller: CameraFlightController) => 
    controller.getEpicOpeningSequence(),

  /**
   * 创建全球巡航飞行
   */
  createGlobalTour: (controller: CameraFlightController) => 
    controller.getGlobalTourSequence(),

  /**
   * 创建施工演示飞行
   */
  createConstructionDemo: (controller: CameraFlightController) => 
    controller.getConstructionDemoSequence()
};

export default CameraFlightController;