/**
 * 项目导航系统
 * 实现项目飞行与模块切换联动
 * 控制中心的核心导航和协作触发系统
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';
import DataPipelineManager from './DataPipelineManager';

export interface FlightTarget {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
    alt?: number;
  };
  cameraSettings: {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    fov?: number;
  };
  metadata: {
    projectType: 'excavation' | 'construction' | 'infrastructure';
    depth: number;
    status: 'active' | 'completed' | 'planning';
    expertRecommendations: Array<{
      expertId: 1 | 2 | 3;
      priority: 'high' | 'medium' | 'low';
      reason: string;
    }>;
  };
}

export interface FlightPath {
  segments: Array<{
    from: THREE.Vector3;
    to: THREE.Vector3;
    duration: number; // milliseconds
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'epic';
    lookAtTarget?: THREE.Vector3;
  }>;
  totalDuration: number;
  effects: {
    particleTrail: boolean;
    weatherIntegration: boolean;
    transitionEffects: string[];
  };
}

export interface FlightState {
  isFlying: boolean;
  currentTarget: FlightTarget | null;
  progress: number; // 0-1
  currentSegment: number;
  startTime: number;
  expertAutoSwitch: boolean;
  collaborationTriggered: boolean;
}

class EpicFlightNavigationSystem extends EventEmitter {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private flightState: FlightState;
  private availableTargets: Map<string, FlightTarget> = new Map();
  private animationFrameId: number | null = null;
  private currentFlightPath: FlightPath | null = null;
  
  // 性能优化
  private performanceSettings = {
    maxFlightSpeed: 5000, // units per second
    minFlightDuration: 1000, // milliseconds
    maxFlightDuration: 5000, // milliseconds
    smoothingFactor: 0.95
  };

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    super();
    this.camera = camera;
    this.scene = scene;
    
    this.flightState = {
      isFlying: false,
      currentTarget: null,
      progress: 0,
      currentSegment: 0,
      startTime: 0,
      expertAutoSwitch: true,
      collaborationTriggered: false
    };

    this.initializeDefaultTargets();
    this.setupEventListeners();
  }

  // 初始化默认飞行目标
  private initializeDefaultTargets(): void {
    // 上海中心深基坑
    this.addFlightTarget({
      id: 'shanghai-center',
      name: '上海中心深基坑',
      coordinates: {
        lat: 31.2304,
        lng: 121.4737,
        alt: 150
      },
      cameraSettings: {
        position: new THREE.Vector3(12147, 200, 3123),
        lookAt: new THREE.Vector3(12147, 0, 3123),
        fov: 60
      },
      metadata: {
        projectType: 'excavation',
        depth: 70,
        status: 'completed',
        expertRecommendations: [
          {
            expertId: 2,
            priority: 'high',
            reason: '需要分析地质结构和支护设计'
          },
          {
            expertId: 3,
            priority: 'medium',
            reason: '验证计算结果和安全评估'
          }
        ]
      }
    });

    // 北京大兴机场
    this.addFlightTarget({
      id: 'beijing-daxing',
      name: '北京大兴机场',
      coordinates: {
        lat: 39.5098,
        lng: 116.4105,
        alt: 120
      },
      cameraSettings: {
        position: new THREE.Vector3(11641, 180, 3951),
        lookAt: new THREE.Vector3(11641, 0, 3951),
        fov: 70
      },
      metadata: {
        projectType: 'infrastructure',
        depth: 45,
        status: 'active',
        expertRecommendations: [
          {
            expertId: 2,
            priority: 'high',
            reason: '正在进行支护结构优化'
          },
          {
            expertId: 3,
            priority: 'high',
            reason: '需要实时监控计算分析'
          },
          {
            expertId: 1,
            priority: 'medium',
            reason: '项目进度可视化监控'
          }
        ]
      }
    });

    // 广州塔地下空间
    this.addFlightTarget({
      id: 'guangzhou-tower',
      name: '广州塔地下空间',
      coordinates: {
        lat: 23.1084,
        lng: 113.3189,
        alt: 100
      },
      cameraSettings: {
        position: new THREE.Vector3(11332, 150, 2311),
        lookAt: new THREE.Vector3(11332, 0, 2311),
        fov: 65
      },
      metadata: {
        projectType: 'construction',
        depth: 35,
        status: 'planning',
        expertRecommendations: [
          {
            expertId: 2,
            priority: 'high',
            reason: '需要进行地质勘探和建模'
          },
          {
            expertId: 1,
            priority: 'medium',
            reason: '场地条件和环境分析'
          }
        ]
      }
    });
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    // 监听专家切换完成事件
    this.on('expert:switched', (expertId: number) => {
      this.handleExpertSwitchComplete(expertId);
    });

    // 监听数据管道连接状态
    DataPipelineManager.on('connection:established', (connectionData) => {
      this.handleDataPipelineConnection(connectionData);
    });
  }

  // 添加飞行目标
  public addFlightTarget(target: FlightTarget): void {
    this.availableTargets.set(target.id, target);
    this.emit('target:added', target);
  }

  // 移除飞行目标
  public removeFlightTarget(targetId: string): void {
    const target = this.availableTargets.get(targetId);
    if (target) {
      this.availableTargets.delete(targetId);
      this.emit('target:removed', target);
    }
  }

  // 获取所有可用目标
  public getAvailableTargets(): FlightTarget[] {
    return Array.from(this.availableTargets.values());
  }

  // 飞行到目标
  public async flyToTarget(targetId: string, options?: {
    expertAutoSwitch?: boolean;
    triggerCollaboration?: boolean;
    customFlightPath?: Partial<FlightPath>;
  }): Promise<void> {
    const target = this.availableTargets.get(targetId);
    if (!target) {
      throw new Error(`Flight target ${targetId} not found`);
    }

    if (this.flightState.isFlying) {
      this.cancelCurrentFlight();
    }

    // 更新飞行状态
    this.flightState = {
      isFlying: true,
      currentTarget: target,
      progress: 0,
      currentSegment: 0,
      startTime: Date.now(),
      expertAutoSwitch: options?.expertAutoSwitch ?? true,
      collaborationTriggered: false
    };

    // 创建飞行路径
    this.currentFlightPath = this.generateFlightPath(target, options?.customFlightPath);

    // 发送飞行开始事件
    this.emit('flight:start', {
      target,
      path: this.currentFlightPath,
      options
    });

    // 开始飞行动画
    this.startFlightAnimation();

    // 等待飞行完成
    return new Promise((resolve, reject) => {
      this.once('flight:complete', resolve);
      this.once('flight:error', reject);
    });
  }

  // 生成飞行路径
  private generateFlightPath(target: FlightTarget, customPath?: Partial<FlightPath>): FlightPath {
    const currentPosition = this.camera.position.clone();
    const targetPosition = target.cameraSettings.position.clone();
    const targetLookAt = target.cameraSettings.lookAt.clone();

    // 计算飞行距离和持续时间
    const distance = currentPosition.distanceTo(targetPosition);
    const baseDuration = Math.max(
      this.performanceSettings.minFlightDuration,
      Math.min(
        this.performanceSettings.maxFlightDuration,
        distance / this.performanceSettings.maxFlightSpeed * 1000
      )
    );

    // 创建默认路径
    const defaultPath: FlightPath = {
      segments: [
        {
          from: currentPosition,
          to: this.calculateApproachPosition(targetPosition),
          duration: baseDuration * 0.7,
          easing: 'ease-out',
          lookAtTarget: targetLookAt
        },
        {
          from: this.calculateApproachPosition(targetPosition),
          to: targetPosition,
          duration: baseDuration * 0.3,
          easing: 'ease-in-out',
          lookAtTarget: targetLookAt
        }
      ],
      totalDuration: baseDuration,
      effects: {
        particleTrail: true,
        weatherIntegration: true,
        transitionEffects: ['epic_zoom', 'camera_stabilization']
      }
    };

    // 合并自定义路径设置
    if (customPath) {
      return {
        ...defaultPath,
        ...customPath,
        segments: customPath.segments || defaultPath.segments
      };
    }

    return defaultPath;
  }

  // 计算接近位置（在目标前方创建一个缓冲位置）
  private calculateApproachPosition(targetPosition: THREE.Vector3): THREE.Vector3 {
    const approachDistance = 300; // 接近距离
    const direction = new THREE.Vector3(0, 0, 1); // 默认从南方接近
    
    return targetPosition.clone().add(direction.multiplyScalar(approachDistance));
  }

  // 开始飞行动画
  private startFlightAnimation(): void {
    if (!this.currentFlightPath) return;

    const animate = () => {
      if (!this.flightState.isFlying || !this.currentFlightPath) return;

      const elapsed = Date.now() - this.flightState.startTime;
      const totalProgress = elapsed / this.currentFlightPath.totalDuration;

      if (totalProgress >= 1) {
        this.completeFlight();
        return;
      }

      // 更新相机位置
      this.updateCameraPosition(totalProgress);

      // 更新飞行状态
      this.flightState.progress = totalProgress;

      // 检查是否需要触发专家协作
      this.checkExpertCollaborationTrigger(totalProgress);

      // 发送进度更新事件
      this.emit('flight:progress', {
        progress: totalProgress,
        currentSegment: this.flightState.currentSegment,
        target: this.flightState.currentTarget
      });

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  // 更新相机位置
  private updateCameraPosition(totalProgress: number): void {
    if (!this.currentFlightPath) return;

    // 找到当前段
    let accumulatedTime = 0;
    let currentSegment = 0;
    
    for (let i = 0; i < this.currentFlightPath.segments.length; i++) {
      const segment = this.currentFlightPath.segments[i];
      const segmentEndTime = accumulatedTime + segment.duration;
      
      if (totalProgress * this.currentFlightPath.totalDuration <= segmentEndTime) {
        currentSegment = i;
        break;
      }
      
      accumulatedTime += segment.duration;
    }

    this.flightState.currentSegment = currentSegment;
    const segment = this.currentFlightPath.segments[currentSegment];
    
    // 计算段内进度
    const segmentStartTime = accumulatedTime;
    const segmentProgress = Math.max(0, Math.min(1, 
      (totalProgress * this.currentFlightPath.totalDuration - segmentStartTime) / segment.duration
    ));

    // 应用缓动函数
    const easedProgress = this.applyEasing(segmentProgress, segment.easing);

    // 更新相机位置
    this.camera.position.lerpVectors(segment.from, segment.to, easedProgress);

    // 更新相机朝向
    if (segment.lookAtTarget) {
      this.camera.lookAt(segment.lookAtTarget);
    }
  }

  // 应用缓动函数
  private applyEasing(progress: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'epic':
        // Epic自定义缓动 - 慢启动，快速中段，慢结束
        if (progress < 0.3) {
          return Math.pow(progress / 0.3, 2) * 0.1;
        } else if (progress < 0.7) {
          const t = (progress - 0.3) / 0.4;
          return 0.1 + t * 0.8;
        } else {
          const t = (progress - 0.7) / 0.3;
          return 0.9 + Math.pow(t, 0.5) * 0.1;
        }
      default:
        return progress;
    }
  }

  // 检查专家协作触发
  private checkExpertCollaborationTrigger(progress: number): void {
    if (!this.flightState.expertAutoSwitch || 
        this.flightState.collaborationTriggered || 
        !this.flightState.currentTarget) return;

    // 在飞行70%时触发专家协作
    if (progress >= 0.7) {
      this.flightState.collaborationTriggered = true;
      this.triggerExpertCollaboration();
    }
  }

  // 触发专家协作
  private async triggerExpertCollaboration(): Promise<void> {
    if (!this.flightState.currentTarget) return;

    const target = this.flightState.currentTarget;
    const recommendations = target.metadata.expertRecommendations;

    // 按优先级排序
    const sortedRecommendations = recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    // 准备项目上下文数据
    const projectContextData = {
      project: {
        id: target.id,
        name: target.name,
        depth: target.metadata.depth,
        status: target.metadata.status,
        type: target.metadata.projectType
      },
      location: {
        coordinates: {
          lat: target.coordinates.lat,
          lng: target.coordinates.lng
        },
        address: `${target.name}项目地址`,
        region: this.determineRegion(target.coordinates.lat)
      },
      flightContext: {
        arrived: false,
        flightProgress: this.flightState.progress,
        recommendedExperts: sortedRecommendations
      }
    };

    // 发送数据到数据管道
    try {
      await DataPipelineManager.transferData('epic-to-geology', projectContextData);
      
      this.emit('collaboration:triggered', {
        target,
        recommendations: sortedRecommendations,
        data: projectContextData
      });
    } catch (error) {
      console.error('专家协作触发失败:', error);
      this.emit('collaboration:error', { error, target });
    }
  }

  // 确定地理区域
  private determineRegion(lat: number): string {
    if (lat > 30) return '华东地区';
    if (lat > 25) return '华南地区';
    return '华北地区';
  }

  // 完成飞行
  private completeFlight(): void {
    if (!this.flightState.currentTarget) return;

    // 确保相机到达精确位置
    this.camera.position.copy(this.flightState.currentTarget.cameraSettings.position);
    this.camera.lookAt(this.flightState.currentTarget.cameraSettings.lookAt);

    // 更新相机FOV（如果指定）
    if (this.camera instanceof THREE.PerspectiveCamera && 
        this.flightState.currentTarget.cameraSettings.fov) {
      this.camera.fov = this.flightState.currentTarget.cameraSettings.fov;
      this.camera.updateProjectionMatrix();
    }

    // 清理动画
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 发送到达事件
    this.emit('flight:arrived', {
      target: this.flightState.currentTarget,
      finalPosition: this.camera.position.clone(),
      duration: Date.now() - this.flightState.startTime
    });

    // 触发专家切换（如果还没有触发）
    if (this.flightState.expertAutoSwitch && !this.flightState.collaborationTriggered) {
      this.triggerExpertSwitch();
    }

    // 重置飞行状态
    this.flightState.isFlying = false;
    this.flightState.progress = 1;
    this.currentFlightPath = null;

    this.emit('flight:complete', {
      target: this.flightState.currentTarget,
      success: true
    });
  }

  // 触发专家切换
  private triggerExpertSwitch(): void {
    if (!this.flightState.currentTarget) return;

    const recommendations = this.flightState.currentTarget.metadata.expertRecommendations;
    const highPriorityRecommendation = recommendations.find(r => r.priority === 'high');

    if (highPriorityRecommendation) {
      this.emit('expert:switch:request', {
        expertId: highPriorityRecommendation.expertId,
        reason: highPriorityRecommendation.reason,
        target: this.flightState.currentTarget
      });
    }
  }

  // 取消当前飞行
  public cancelCurrentFlight(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.flightState.isFlying = false;
    this.currentFlightPath = null;

    this.emit('flight:cancelled', {
      target: this.flightState.currentTarget,
      progress: this.flightState.progress
    });
  }

  // 处理专家切换完成
  private handleExpertSwitchComplete(expertId: number): void {
    this.emit('expert:switch:complete', {
      expertId,
      target: this.flightState.currentTarget,
      timestamp: Date.now()
    });
  }

  // 处理数据管道连接
  private handleDataPipelineConnection(connectionData: any): void {
    if (connectionData.sourceExpert === 1 && this.flightState.currentTarget) {
      this.emit('data:pipeline:connected', {
        connection: connectionData,
        target: this.flightState.currentTarget
      });
    }
  }

  // 获取当前飞行状态
  public getFlightState(): FlightState {
    return { ...this.flightState };
  }

  // 设置性能设置
  public setPerformanceSettings(settings: Partial<typeof this.performanceSettings>): void {
    this.performanceSettings = { ...this.performanceSettings, ...settings };
  }

  // 获取性能设置
  public getPerformanceSettings() {
    return { ...this.performanceSettings };
  }

  // 清理资源
  public dispose(): void {
    this.cancelCurrentFlight();
    this.availableTargets.clear();
    this.removeAllListeners();
  }
}

export default EpicFlightNavigationSystem;