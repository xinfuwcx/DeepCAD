import * as THREE from 'three';
import { LODManager } from './LODManager';
import { BatchRenderer } from './BatchRenderer';
import { MemoryManager } from './MemoryManager';

export interface PerformanceProfile {
  name: string;
  description: string;
  settings: {
    lod: {
      enableAutoLOD: boolean;
      maxDistance: number;
      qualityLevels: number;
    };
    batch: {
      maxInstancesPerBatch: number;
      enableFrustumCulling: boolean;
      enableDistanceCulling: boolean;
    };
    memory: {
      maxMemoryMB: number;
      gcThresholdPercent: number;
      enableResourcePooling: boolean;
    };
    render: {
      pixelRatio: number;
      antialias: boolean;
      shadowMapSize: number;
      maxLights: number;
    };
  };
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  lodLevel: number;
  batchEfficiency: number;
  gpuMemory: number;
  timestamp: number;
}

export interface PerformanceTarget {
  minFPS: number;
  maxFrameTime: number;
  maxMemoryMB: number;
  maxDrawCalls: number;
}

/**
 * 性能监控器
 * 集成LOD、批量渲染、内存管理等性能优化组件
 */
export class PerformanceMonitor {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  
  // 性能组件
  private lodManager: LODManager;
  private batchRenderer: BatchRenderer;
  private memoryManager: MemoryManager;
  
  // 性能监控
  private metrics: PerformanceMetrics[] = [];
  private currentProfile: PerformanceProfile;
  private target: PerformanceTarget;
  private isMonitoring: boolean = false;
  
  // 时间统计
  private lastTime: number = 0;
  private frameCount: number = 0;
  private metricsBuffer: PerformanceMetrics[] = [];
  private bufferSize: number = 60; // 1秒的数据（60fps）
  
  // 自适应优化
  private adaptiveEnabled: boolean = true;
  private adjustmentCooldown: number = 0;
  private adjustmentInterval: number = 2000; // 2秒
  
  // 预定义性能配置
  public static readonly PROFILES: Record<string, PerformanceProfile> = {
    low: {
      name: '低端设备',
      description: '优化性能，降低质量',
      settings: {
        lod: {
          enableAutoLOD: true,
          maxDistance: 50,
          qualityLevels: 3
        },
        batch: {
          maxInstancesPerBatch: 500,
          enableFrustumCulling: true,
          enableDistanceCulling: true
        },
        memory: {
          maxMemoryMB: 256,
          gcThresholdPercent: 70,
          enableResourcePooling: true
        },
        render: {
          pixelRatio: 1,
          antialias: false,
          shadowMapSize: 512,
          maxLights: 2
        }
      }
    },
    medium: {
      name: '中端设备',
      description: '平衡性能和质量',
      settings: {
        lod: {
          enableAutoLOD: true,
          maxDistance: 100,
          qualityLevels: 4
        },
        batch: {
          maxInstancesPerBatch: 1000,
          enableFrustumCulling: true,
          enableDistanceCulling: true
        },
        memory: {
          maxMemoryMB: 512,
          gcThresholdPercent: 80,
          enableResourcePooling: true
        },
        render: {
          pixelRatio: 1.5,
          antialias: true,
          shadowMapSize: 1024,
          maxLights: 4
        }
      }
    },
    high: {
      name: '高端设备',
      description: '最佳质量',
      settings: {
        lod: {
          enableAutoLOD: true,
          maxDistance: 200,
          qualityLevels: 5
        },
        batch: {
          maxInstancesPerBatch: 2000,
          enableFrustumCulling: true,
          enableDistanceCulling: false
        },
        memory: {
          maxMemoryMB: 1024,
          gcThresholdPercent: 85,
          enableResourcePooling: true
        },
        render: {
          pixelRatio: 2,
          antialias: true,
          shadowMapSize: 2048,
          maxLights: 8
        }
      }
    }
  };

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    options: {
      profile?: string;
      target?: Partial<PerformanceTarget>;
      adaptiveEnabled?: boolean;
    } = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // 设置性能目标
    this.target = {
      minFPS: 30,
      maxFrameTime: 33.33, // 30fps
      maxMemoryMB: 512,
      maxDrawCalls: 100,
      ...options.target
    };
    
    this.adaptiveEnabled = options.adaptiveEnabled !== false;
    
    // 选择性能配置
    const profileName = options.profile || this.detectDeviceProfile();
    this.currentProfile = PerformanceMonitor.PROFILES[profileName];
    
    // 初始化性能组件
    this.initializeComponents();
    
    console.log(`🚀 性能监控器启动: ${this.currentProfile.name}`);
  }

  /**
   * 初始化性能组件
   */
  private initializeComponents(): void {
    const settings = this.currentProfile.settings;
    
    // 初始化LOD管理器
    this.lodManager = new LODManager(this.scene, this.camera, {
      enableAutoLOD: settings.lod.enableAutoLOD,
      maxDistance: settings.lod.maxDistance,
      qualityLevels: settings.lod.qualityLevels
    });
    
    // 初始化批量渲染器
    this.batchRenderer = new BatchRenderer(this.scene, this.camera, {
      maxInstancesPerBatch: settings.batch.maxInstancesPerBatch,
      enableFrustumCulling: settings.batch.enableFrustumCulling,
      enableDistanceCulling: settings.batch.enableDistanceCulling
    });
    
    // 初始化内存管理器
    this.memoryManager = new MemoryManager({
      maxMemoryMB: settings.memory.maxMemoryMB,
      gcThresholdPercent: settings.memory.gcThresholdPercent,
      enableResourcePooling: settings.memory.enableResourcePooling
    });
    
    this.memoryManager.setWebGLInfo(this.renderer.info);
  }

  /**
   * 检测设备性能等级
   */
  private detectDeviceProfile(): string {
    // 基于设备信息的简单性能检测
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'low';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // 基于内存的评估
    const memory = (navigator as any).deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    // 综合评分
    let score = 0;
    
    if (memory >= 8) score += 2;
    else if (memory >= 4) score += 1;
    
    if (hardwareConcurrency >= 8) score += 2;
    else if (hardwareConcurrency >= 4) score += 1;
    
    if (renderer.includes('NVIDIA') || renderer.includes('AMD')) {
      if (renderer.includes('RTX') || renderer.includes('RX')) score += 3;
      else if (renderer.includes('GTX')) score += 2;
      else score += 1;
    }
    
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * 开始性能监控
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
    this.lastTime = performance.now();
    console.log('📊 性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('📊 性能监控已停止');
  }

  /**
   * 更新性能监控
   */
  public update(deltaTime: number): void {
    if (!this.isMonitoring) return;
    
    const currentTime = performance.now();
    this.frameCount++;
    
    // 收集性能指标
    const metrics = this.collectMetrics(deltaTime);
    this.metricsBuffer.push(metrics);
    
    // 保持缓冲区大小
    if (this.metricsBuffer.length > this.bufferSize) {
      this.metricsBuffer.shift();
    }
    
    // 更新性能组件
    this.lodManager.update(deltaTime);
    this.batchRenderer.update(deltaTime);
    this.memoryManager.update(deltaTime);
    
    // 自适应性能调整
    if (this.adaptiveEnabled) {
      this.adjustmentCooldown -= deltaTime;
      if (this.adjustmentCooldown <= 0) {
        this.adaptiveAdjustment();
        this.adjustmentCooldown = this.adjustmentInterval;
      }
    }
    
    this.lastTime = currentTime;
  }

  /**
   * 收集性能指标
   */
  private collectMetrics(deltaTime: number): PerformanceMetrics {
    const lodStats = this.lodManager.getStatistics();
    const batchStats = this.batchRenderer.getStatistics();
    const memoryStats = this.memoryManager.getStats();
    
    return {
      fps: this.frameCount > 0 ? 1000 / deltaTime : 0,
      frameTime: deltaTime,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      memoryUsage: memoryStats.usedMemory,
      lodLevel: Object.keys(lodStats.levelDistribution).length > 0 
        ? Math.max(...Object.keys(lodStats.levelDistribution).map(Number)) 
        : 0,
      batchEfficiency: batchStats.savedDrawCalls / Math.max(1, batchStats.totalInstances) * 100,
      gpuMemory: this.renderer.info.memory.geometries + this.renderer.info.memory.textures,
      timestamp: Date.now()
    };
  }

  /**
   * 自适应性能调整
   */
  private adaptiveAdjustment(): void {
    if (this.metricsBuffer.length < 30) return; // 需要足够的数据
    
    const recent = this.metricsBuffer.slice(-30);
    const avgFPS = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const avgFrameTime = recent.reduce((sum, m) => sum + m.frameTime, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    
    let needsAdjustment = false;
    let adjustmentDirection: 'up' | 'down' = 'down';
    
    // 检查是否需要调整
    if (avgFPS < this.target.minFPS || avgFrameTime > this.target.maxFrameTime) {
      needsAdjustment = true;
      adjustmentDirection = 'down';
    } else if (avgFPS > this.target.minFPS * 1.5 && avgFrameTime < this.target.maxFrameTime * 0.7) {
      needsAdjustment = true;
      adjustmentDirection = 'up';
    }
    
    if (avgMemory > this.target.maxMemoryMB * 1024 * 1024) {
      needsAdjustment = true;
      adjustmentDirection = 'down';
    }
    
    if (needsAdjustment) {
      this.adjustPerformance(adjustmentDirection);
    }
  }

  /**
   * 调整性能设置
   */
  private adjustPerformance(direction: 'up' | 'down'): void {
    const profiles = ['low', 'medium', 'high'];
    const currentIndex = profiles.indexOf(Object.keys(PerformanceMonitor.PROFILES).find(
      key => PerformanceMonitor.PROFILES[key] === this.currentProfile
    ) || 'medium');
    
    let newIndex = currentIndex;
    
    if (direction === 'down' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'up' && currentIndex < profiles.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
      this.setProfile(profiles[newIndex]);
      console.log(`🔧 自适应调整: ${direction === 'up' ? '提升' : '降低'}性能至 ${this.currentProfile.name}`);
    }
  }

  /**
   * 设置性能配置
   */
  public setProfile(profileName: string): void {
    const profile = PerformanceMonitor.PROFILES[profileName];
    if (!profile) {
      console.warn(`未知的性能配置: ${profileName}`);
      return;
    }
    
    this.currentProfile = profile;
    
    // 更新LOD设置
    this.lodManager.updateSettings({
      enableAutoLOD: profile.settings.lod.enableAutoLOD,
      maxDistance: profile.settings.lod.maxDistance,
      qualityLevels: profile.settings.lod.qualityLevels
    });
    
    // 更新批量渲染设置
    this.batchRenderer.updateSettings({
      maxInstancesPerBatch: profile.settings.batch.maxInstancesPerBatch,
      enableFrustumCulling: profile.settings.batch.enableFrustumCulling,
      enableDistanceCulling: profile.settings.batch.enableDistanceCulling
    });
    
    // 更新渲染器设置
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.settings.render.pixelRatio));
    
    console.log(`✅ 性能配置已切换: ${profile.name}`);
  }

  /**
   * 获取性能报告
   */
  public getPerformanceReport(): {
    current: PerformanceMetrics;
    average: PerformanceMetrics;
    profile: string;
    target: PerformanceTarget;
    recommendations: string[];
    components: {
      lod: any;
      batch: any;
      memory: any;
    };
  } {
    const recent = this.metricsBuffer.slice(-30);
    const current = this.metricsBuffer[this.metricsBuffer.length - 1] || this.collectMetrics(16.67);
    
    const average = recent.length > 0 ? {
      fps: recent.reduce((sum, m) => sum + m.fps, 0) / recent.length,
      frameTime: recent.reduce((sum, m) => sum + m.frameTime, 0) / recent.length,
      drawCalls: recent.reduce((sum, m) => sum + m.drawCalls, 0) / recent.length,
      triangles: recent.reduce((sum, m) => sum + m.triangles, 0) / recent.length,
      memoryUsage: recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length,
      lodLevel: recent.reduce((sum, m) => sum + m.lodLevel, 0) / recent.length,
      batchEfficiency: recent.reduce((sum, m) => sum + m.batchEfficiency, 0) / recent.length,
      gpuMemory: recent.reduce((sum, m) => sum + m.gpuMemory, 0) / recent.length,
      timestamp: Date.now()
    } : current;
    
    const recommendations: string[] = [];
    
    if (average.fps < this.target.minFPS) {
      recommendations.push('帧率过低，建议降低渲染质量或启用LOD');
    }
    
    if (average.memoryUsage > this.target.maxMemoryMB * 1024 * 1024 * 0.8) {
      recommendations.push('内存使用率过高，建议清理未使用的资源');
    }
    
    if (average.drawCalls > this.target.maxDrawCalls) {
      recommendations.push('绘制调用过多，建议使用批量渲染');
    }
    
    if (average.batchEfficiency < 50) {
      recommendations.push('批量渲染效率低，建议优化实例化对象');
    }
    
    const profileName = Object.keys(PerformanceMonitor.PROFILES).find(
      key => PerformanceMonitor.PROFILES[key] === this.currentProfile
    ) || 'unknown';
    
    return {
      current,
      average,
      profile: profileName,
      target: this.target,
      recommendations,
      components: {
        lod: this.lodManager.getStatistics(),
        batch: this.batchRenderer.getStatistics(),
        memory: this.memoryManager.getStats()
      }
    };
  }

  /**
   * 获取性能组件
   */
  public getLODManager(): LODManager {
    return this.lodManager;
  }

  public getBatchRenderer(): BatchRenderer {
    return this.batchRenderer;
  }

  public getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * 设置自适应优化
   */
  public setAdaptiveEnabled(enabled: boolean): void {
    this.adaptiveEnabled = enabled;
  }

  /**
   * 获取历史性能数据
   */
  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsBuffer];
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.stopMonitoring();
    this.lodManager.dispose();
    this.batchRenderer.dispose();
    this.memoryManager.dispose();
    
    this.metrics = [];
    this.metricsBuffer = [];
    
    console.log('🧹 性能监控器已清理');
  }
}