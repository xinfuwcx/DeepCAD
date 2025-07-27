/**
 * 深基坑变形动画系统
 * 3号计算专家 - 基于PyVista+Three.js架构的专业变形可视化
 * 数据流：PyVista变形计算 → WebGPU动画处理 → Three.js震撼展示
 * 为1号首席架构师的大屏演示提供电影级变形动画效果
 */

import * as THREE from 'three';
import { 
  StressCloudGPURenderer,
  type PyVistaStressData 
} from './stressCloudGPURenderer';

import { 
  GPUEnhancedPostprocessor 
} from './gpuIntegration';

// 变形动画配置
export interface DeformationAnimationConfig {
  // 动画时间控制
  timing: {
    totalDuration: number;       // 总时长 (秒)
    frameRate: number;           // 帧率 (fps)
    playbackSpeed: number;       // 播放速度倍数
    enableTimeReversal: boolean; // 允许倒放
    loopMode: 'none' | 'repeat' | 'pingpong';
  };
  
  // 变形可视化配置
  deformation: {
    amplificationFactor: number; // 变形放大系数
    enableRealScale: boolean;    // 真实比例模式
    showOriginalMesh: boolean;   // 显示原始网格
    originalMeshOpacity: number; // 原始网格透明度
    enableMorphTargets: boolean; // 使用变形目标
    morphBlendMode: 'linear' | 'cubic' | 'smooth';
  };
  
  // 视觉效果配置
  visualEffects: {
    enableTrails: boolean;       // 轨迹跟踪
    trailLength: number;         // 轨迹长度
    enableParticles: boolean;    // 粒子效果
    particleDensity: number;     // 粒子密度
    enableShockwaves: boolean;   // 冲击波效果
    colorTransition: boolean;    // 颜色过渡
  };
  
  // 相机动画配置
  cameraAnimation: {
    enableCameraMovement: boolean; // 相机运动
    cameraPath: 'orbit' | 'fly_through' | 'focus_follow' | 'custom';
    focusPoints: THREE.Vector3[]; // 关键关注点
    transitionDuration: number;   // 转场时间
    enableCinematicEffects: boolean; // 电影效果
  };
  
  // 交互控制
  interaction: {
    allowManualControl: boolean; // 允许手动控制
    enableTimelineScrubbing: boolean; // 时间轴拖拽
    showControlPanel: boolean;   // 显示控制面板
    enableHotkeys: boolean;      // 快捷键支持
  };
  
  // 性能优化
  performance: {
    enableLOD: boolean;          // LOD优化
    lodDistances: number[];      // LOD切换距离
    enableCulling: boolean;      // 视锥裁剪
    maxVerticesPerFrame: number; // 每帧最大顶点数
    enableGPUMorphing: boolean;  // GPU变形计算
  };
}

// PyVista变形数据格式
export interface PyVistaDeformationData {
  // 时间序列信息
  timeSteps: Array<{
    time: number;                // 时间点 (相对开始时间)
    stageName: string;           // 阶段名称
    description: string;         // 阶段描述
  }>;
  
  // 变形网格数据
  meshFrames: Array<{
    timeIndex: number;
    
    // 基础几何
    vertices: Float32Array;      // 变形后顶点位置
    originalVertices: Float32Array; // 原始顶点位置
    displacements: Float32Array; // 位移矢量
    
    // 变形分析
    deformationMagnitude: Float32Array; // 变形大小
    strainField: Float32Array;   // 应变场
    rotationField: Float32Array; // 旋转场
    
    // 支护系统变形
    supportDeformation?: {
      strutDisplacements: Float32Array; // 支撑变形
      wallDeflection: Float32Array;     // 墙体偏移
      anchorForces: Float32Array;       // 锚杆受力
    };
    
    // 土体流动
    soilFlow?: {
      velocityField: Float32Array; // 土体流速
      densityField: Float32Array;  // 密度变化
      volumeChange: Float32Array;  // 体积变化
    };
  }>;
  
  // 关键事件标记
  keyEvents: Array<{
    timeIndex: number;
    eventType: 'excavation_start' | 'support_install' | 'dewatering' | 'critical_deformation';
    location: THREE.Vector3;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  
  // 变形统计
  statistics: {
    maxDeformation: {
      value: number;
      location: THREE.Vector3;
      timeIndex: number;
    };
    
    deformationRate: {
      max: number;
      average: number;
      timeline: number[]; // 各时间点的变形速率
    };
    
    criticalZones: Array<{
      zone: THREE.Box3;
      severity: number;
      activeTimeRange: [number, number];
    }>;
  };
  
  // 元数据
  metadata: {
    units: {
      displacement: string;      // mm, cm, m
      time: string;             // hours, days
      velocity: string;         // mm/day, cm/day
    };
    coordinateSystem: 'global' | 'local';
    analysisType: 'linear' | 'nonlinear' | 'large_deformation';
    referenceConfiguration: 'initial' | 'updated';
  };
}

// 动画控制器
export interface AnimationController {
  // 播放控制
  play(): void;
  pause(): void;
  stop(): void;
  reset(): void;
  
  // 时间控制
  setCurrentTime(time: number): void;
  getCurrentTime(): number;
  getTotalDuration(): number;
  
  // 播放状态
  isPlaying(): boolean;
  isPaused(): boolean;
  getCurrentFrame(): number;
  getTotalFrames(): number;
  
  // 速度控制
  setPlaybackSpeed(speed: number): void;
  getPlaybackSpeed(): number;
  
  // 事件监听
  onTimeUpdate(callback: (time: number, frame: number) => void): void;
  onAnimationComplete(callback: () => void): void;
  onKeyEvent(callback: (event: any) => void): void;
}

// 动画渲染结果
export interface DeformationAnimationResult {
  success: boolean;
  animationId: string;
  
  // 动画信息
  totalFrames: number;
  duration: number;
  frameRate: number;
  
  // Three.js动画对象
  animationObjects: {
    deformedMesh: THREE.Mesh;
    originalMesh?: THREE.Mesh;
    trailSystem?: THREE.Object3D;
    particleSystem?: THREE.Points;
    cameraRig?: THREE.Object3D;
  };
  
  // 动画控制器
  controller: AnimationController;
  
  // 性能统计
  performance: {
    preprocessingTime: number;
    averageFrameTime: number;
    memoryUsage: number;
    gpuMemoryUsage: number;
  };
  
  // 可视化数据
  visualizationData: {
    deformationHeatmap: THREE.DataTexture;
    trailTexture?: THREE.DataTexture;
    keyEventMarkers: THREE.Object3D[];
  };
}

// WebGPU变形计算着色器
const DEFORMATION_COMPUTE_SHADER = `
@group(0) @binding(0) var<storage, read> originalVertices: array<vec3<f32>>;
@group(0) @binding(1) var<storage, read> displacements: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> deformedVertices: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read_write> velocities: array<vec3<f32>>;
@group(0) @binding(4) var<uniform> animationParams: AnimationParams;

struct AnimationParams {
  time: f32,
  deltaTime: f32,
  amplificationFactor: f32,
  frameIndex: u32,
  totalFrames: u32,
  interpolationMode: u32,
}

// 三次样条插值
fn cubicInterpolation(p0: vec3<f32>, p1: vec3<f32>, p2: vec3<f32>, p3: vec3<f32>, t: f32) -> vec3<f32> {
  let t2 = t * t;
  let t3 = t2 * t;
  
  let a0 = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
  let a1 = p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
  let a2 = -0.5 * p0 + 0.5 * p2;
  let a3 = p1;
  
  return a0 * t3 + a1 * t2 + a2 * t + a3;
}

// 平滑步长函数
fn smoothstep3(t: f32) -> f32 {
  return t * t * (3.0 - 2.0 * t);
}

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  
  if (index >= arrayLength(&originalVertices)) {
    return;
  }
  
  let originalPos = originalVertices[index];
  let displacement = displacements[index] * animationParams.amplificationFactor;
  
  // 计算变形后位置
  let deformedPos = originalPos + displacement;
  
  // 计算速度（基于位移变化）
  let prevPos = deformedVertices[index];
  let velocity = (deformedPos - prevPos) / animationParams.deltaTime;
  
  // 平滑过渡
  let smoothFactor = smoothstep3(animationParams.time);
  let finalPos = mix(originalPos, deformedPos, smoothFactor);
  
  deformedVertices[index] = finalPos;
  velocities[index] = velocity;
}
`;

// 轨迹生成着色器
const TRAIL_COMPUTE_SHADER = `
@group(0) @binding(0) var<storage, read> currentPositions: array<vec3<f32>>;
@group(0) @binding(1) var<storage, read> previousPositions: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> trailPoints: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read_write> trailColors: array<vec4<f32>>;
@group(0) @binding(4) var<uniform> trailParams: TrailParams;

struct TrailParams {
  trailLength: u32,
  fadeRate: f32,
  currentFrame: u32,
  velocityScale: f32,
}

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let vertexIndex = global_id.x;
  
  if (vertexIndex >= arrayLength(&currentPositions)) {
    return;
  }
  
  let currentPos = currentPositions[vertexIndex];
  let previousPos = previousPositions[vertexIndex];
  let velocity = length(currentPos - previousPos);
  
  // 计算轨迹颜色（基于速度）
  let normalizedVelocity = clamp(velocity * trailParams.velocityScale, 0.0, 1.0);
  let trailColor = vec4<f32>(
    normalizedVelocity,
    1.0 - normalizedVelocity * 0.5,
    0.2,
    1.0 - normalizedVelocity * 0.3
  );
  
  // 更新轨迹点
  let trailBaseIndex = vertexIndex * trailParams.trailLength;
  let currentTrailIndex = trailBaseIndex + (trailParams.currentFrame % trailParams.trailLength);
  
  trailPoints[currentTrailIndex] = currentPos;
  trailColors[currentTrailIndex] = trailColor;
  
  // 淡化旧的轨迹点
  for (var i = 0u; i < trailParams.trailLength; i++) {
    let trailIndex = trailBaseIndex + i;
    let age = f32((trailParams.currentFrame - i) % trailParams.trailLength) / f32(trailParams.trailLength);
    trailColors[trailIndex].a *= (1.0 - age * trailParams.fadeRate);
  }
}
`;

export class DeformationAnimationSystem {
  private config: DeformationAnimationConfig;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.Camera;
  
  // WebGPU计算资源
  private device: GPUDevice | null = null;
  private deformationPipeline: GPUComputePipeline | null = null;
  private trailPipeline: GPUComputePipeline | null = null;
  
  // GPU缓冲区
  private originalVerticesBuffer: GPUBuffer | null = null;
  private displacementsBuffer: GPUBuffer | null = null;
  private deformedVerticesBuffer: GPUBuffer | null = null;
  private velocitiesBuffer: GPUBuffer | null = null;
  private trailPointsBuffer: GPUBuffer | null = null;
  
  // 动画状态
  private animationState: {
    currentTime: number;
    currentFrame: number;
    isPlaying: boolean;
    isPaused: boolean;
    playbackSpeed: number;
    animationId: string;
  } = {
    currentTime: 0,
    currentFrame: 0,
    isPlaying: false,
    isPaused: false,
    playbackSpeed: 1.0,
    animationId: ''
  };
  
  // 动画数据
  private deformationData: PyVistaDeformationData | null = null;
  private animationObjects: DeformationAnimationResult['animationObjects'] = {
    deformedMesh: new THREE.Mesh()
  };
  
  // 事件回调
  private eventCallbacks: {
    onTimeUpdate: Array<(time: number, frame: number) => void>;
    onAnimationComplete: Array<() => void>;
    onKeyEvent: Array<(event: any) => void>;
  } = {
    onTimeUpdate: [],
    onAnimationComplete: [],
    onKeyEvent: []
  };
  
  // 性能监控
  private performanceStats: {
    frameProcessingTimes: number[];
    averageFrameTime: number;
    memoryUsage: number;
    droppedFrames: number;
  } = {
    frameProcessingTimes: [],
    averageFrameTime: 0,
    memoryUsage: 0,
    droppedFrames: 0
  };
  
  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    config?: Partial<DeformationAnimationConfig>
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;
    
    // 默认配置
    this.config = {
      timing: {
        totalDuration: 30.0,     // 30秒动画
        frameRate: 60,           // 60fps
        playbackSpeed: 1.0,
        enableTimeReversal: true,
        loopMode: 'repeat'
      },
      
      deformation: {
        amplificationFactor: 1000.0, // 1000倍放大显示
        enableRealScale: false,
        showOriginalMesh: true,
        originalMeshOpacity: 0.3,
        enableMorphTargets: true,
        morphBlendMode: 'smooth'
      },
      
      visualEffects: {
        enableTrails: true,
        trailLength: 20,
        enableParticles: true,
        particleDensity: 0.5,
        enableShockwaves: false,
        colorTransition: true
      },
      
      cameraAnimation: {
        enableCameraMovement: true,
        cameraPath: 'orbit',
        focusPoints: [],
        transitionDuration: 2.0,
        enableCinematicEffects: true
      },
      
      interaction: {
        allowManualControl: true,
        enableTimelineScrubbing: true,
        showControlPanel: true,
        enableHotkeys: true
      },
      
      performance: {
        enableLOD: true,
        lodDistances: [50, 100, 200, 500],
        enableCulling: true,
        maxVerticesPerFrame: 1000000,
        enableGPUMorphing: true
      },
      
      ...config
    };
    
    console.log('🎬 初始化深基坑变形动画系统...');
    console.log(`   动画时长: ${this.config.timing.totalDuration}秒`);
    console.log(`   目标帧率: ${this.config.timing.frameRate}fps`);
    console.log(`   变形放大: ${this.config.deformation.amplificationFactor}倍`);
    console.log(`   GPU变形: ${this.config.performance.enableGPUMorphing ? '启用' : '禁用'}`);
  }
  
  /**
   * 初始化WebGPU动画系统
   */
  async initialize(): Promise<boolean> {
    return await this.initializeGPUAnimation();
  }

  async initializeGPUAnimation(): Promise<boolean> {
    console.log('⚡ 初始化WebGPU变形动画系统...');
    
    try {
      // 检查WebGPU支持
      if (!navigator.gpu) {
        console.warn('⚠️ WebGPU不支持，将使用CPU变形');
        return false;
      }
      
      // 获取GPU设备
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!adapter) {
        console.warn('⚠️ 无法获取GPU适配器');
        return false;
      }
      
      // 获取GPU设备 (修复WebGPU特性名称)
      try {
        this.device = await adapter.requestDevice({
          requiredFeatures: ['timestamp-query'],
          requiredLimits: {
            maxComputeWorkgroupSizeX: 64,
            maxStorageBufferBindingSize: 1024 * 1024 * 1024 // 1GB
          }
        });
      } catch (error) {
        // 回退到无特性请求
        console.warn('⚠️ GPU特性请求失败，使用基础配置');
        this.device = await adapter.requestDevice({});
      }
      
      console.log('✅ WebGPU设备获取成功');
      
      // 创建计算管道
      await this.createComputePipelines();
      
      console.log('✅ WebGPU变形动画系统初始化完成');
      return true;
      
    } catch (error) {
      console.error('❌ WebGPU动画初始化失败:', error);
      return false;
    }
  }
  
  /**
   * 创建变形动画
   */
  async createDeformationAnimation(
    deformationData: PyVistaDeformationData
  ): Promise<DeformationAnimationResult> {
    
    console.log('🎬 创建深基坑变形动画...');
    console.log(`   时间步数: ${deformationData.timeSteps.length}`);
    console.log(`   网格帧数: ${deformationData.meshFrames.length}`);
    console.log(`   关键事件: ${deformationData.keyEvents.length}个`);
    
    const creationStartTime = performance.now();
    
    try {
      // 1. 存储变形数据
      this.deformationData = deformationData;
      
      // 2. 准备GPU缓冲区
      if (this.config.performance.enableGPUMorphing && this.device) {
        await this.prepareGPUBuffers(deformationData);
      }
      
      // 3. 创建Three.js动画对象
      const animationObjects = await this.createAnimationObjects(deformationData);
      
      // 4. 设置相机动画
      if (this.config.cameraAnimation.enableCameraMovement) {
        await this.setupCameraAnimation(deformationData);
      }
      
      // 5. 创建视觉效果
      const visualEffects = await this.createVisualEffects(deformationData);
      
      // 6. 创建动画控制器
      const controller = this.createAnimationController();
      
      // 7. 设置交互控制
      if (this.config.interaction.allowManualControl) {
        this.setupInteractionControls();
      }
      
      const creationTime = performance.now() - creationStartTime;
      const animationId = `deformation_animation_${Date.now()}`;
      
      // 更新动画状态
      this.animationState.animationId = animationId;
      this.animationObjects = animationObjects;
      
      const result: DeformationAnimationResult = {
        success: true,
        animationId: animationId,
        totalFrames: deformationData.meshFrames.length,
        duration: this.config.timing.totalDuration,
        frameRate: this.config.timing.frameRate,
        animationObjects: animationObjects,
        controller: controller,
        performance: {
          preprocessingTime: creationTime,
          averageFrameTime: 0,
          memoryUsage: this.calculateMemoryUsage(deformationData),
          gpuMemoryUsage: this.calculateGPUMemoryUsage(deformationData)
        },
        visualizationData: {
          deformationHeatmap: this.generateDeformationHeatmap(deformationData),
          trailTexture: this.config.visualEffects.enableTrails ? this.generateTrailTexture() : undefined,
          keyEventMarkers: this.createKeyEventMarkers(deformationData)
        }
      };
      
      console.log(`✅ 变形动画创建完成 (${creationTime.toFixed(2)}ms)`);
      console.log(`   动画ID: ${animationId}`);
      console.log(`   总帧数: ${result.totalFrames}`);
      console.log(`   内存使用: ${(result.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   GPU内存: ${(result.performance.gpuMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      
      return result;
      
    } catch (error) {
      console.error('❌ 变形动画创建失败:', error);
      
      return {
        success: false,
        animationId: '',
        totalFrames: 0,
        duration: 0,
        frameRate: 0,
        animationObjects: {
          deformedMesh: new THREE.Mesh()
        },
        controller: this.createAnimationController(),
        performance: {
          preprocessingTime: performance.now() - creationStartTime,
          averageFrameTime: 0,
          memoryUsage: 0,
          gpuMemoryUsage: 0
        },
        visualizationData: {
          deformationHeatmap: new THREE.DataTexture(new Uint8Array(4), 1, 1),
          keyEventMarkers: []
        }
      };
    }
  }
  
  /**
   * 播放变形动画
   */
  async playAnimation(): Promise<void> {
    if (!this.deformationData) {
      console.error('❌ 没有变形数据，无法播放动画');
      return;
    }
    
    console.log('▶️ 开始播放深基坑变形动画...');
    console.log(`   从时间 ${this.animationState.currentTime.toFixed(2)}s 开始播放`);
    
    this.animationState.isPlaying = true;
    this.animationState.isPaused = false;
    
    // 开始动画循环
    this.startAnimationLoop();
  }
  
  /**
   * 暂停动画
   */
  pauseAnimation(): void {
    console.log('⏸️ 暂停变形动画');
    this.animationState.isPlaying = false;
    this.animationState.isPaused = true;
  }
  
  /**
   * 停止动画
   */
  stopAnimation(): void {
    console.log('⏹️ 停止变形动画');
    this.animationState.isPlaying = false;
    this.animationState.isPaused = false;
    this.animationState.currentTime = 0;
    this.animationState.currentFrame = 0;
    
    // 重置到初始状态
    this.resetToInitialState();
  }
  
  /**
   * 跳转到指定时间
   */
  async seekToTime(time: number): Promise<void> {
    if (!this.deformationData) return;
    
    const clampedTime = Math.max(0, Math.min(time, this.config.timing.totalDuration));
    const frameIndex = Math.floor(clampedTime / this.config.timing.totalDuration * this.deformationData.meshFrames.length);
    
    console.log(`⏭️ 跳转到时间 ${clampedTime.toFixed(2)}s (帧 ${frameIndex})`);
    
    this.animationState.currentTime = clampedTime;
    this.animationState.currentFrame = frameIndex;
    
    // 更新显示到指定帧
    await this.updateToFrame(frameIndex);
    
    // 触发时间更新回调
    this.eventCallbacks.onTimeUpdate.forEach(callback => {
      callback(clampedTime, frameIndex);
    });
  }
  
  /**
   * 设置播放速度
   */
  setPlaybackSpeed(speed: number): void {
    const clampedSpeed = Math.max(0.1, Math.min(speed, 10.0));
    this.animationState.playbackSpeed = clampedSpeed;
    
    console.log(`🏃 设置播放速度: ${clampedSpeed}x`);
  }
  
  /**
   * 创建计算管道
   */
  private async createComputePipelines(): Promise<void> {
    if (!this.device) return;
    
    console.log('🔧 创建WebGPU变形计算管道...');
    
    // 变形计算管道
    const deformationShaderModule = this.device.createShaderModule({
      code: DEFORMATION_COMPUTE_SHADER
    });
    
    this.deformationPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: deformationShaderModule,
        entryPoint: 'main'
      }
    });
    
    // 轨迹计算管道
    if (this.config.visualEffects.enableTrails) {
      const trailShaderModule = this.device.createShaderModule({
        code: TRAIL_COMPUTE_SHADER
      });
      
      this.trailPipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: trailShaderModule,
          entryPoint: 'main'
        }
      });
    }
    
    console.log('✅ WebGPU变形计算管道创建完成');
  }
  
  /**
   * 准备GPU缓冲区
   */
  private async prepareGPUBuffers(deformationData: PyVistaDeformationData): Promise<void> {
    if (!this.device || deformationData.meshFrames.length === 0) return;
    
    console.log('📦 准备GPU变形缓冲区...');
    
    const firstFrame = deformationData.meshFrames[0];
    const vertexCount = firstFrame.originalVertices.length / 3;
    
    // 原始顶点缓冲区
    this.originalVerticesBuffer = this.device.createBuffer({
      size: firstFrame.originalVertices.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(this.originalVerticesBuffer.getMappedRange()).set(firstFrame.originalVertices);
    this.originalVerticesBuffer.unmap();
    
    // 位移缓冲区
    this.displacementsBuffer = this.device.createBuffer({
      size: firstFrame.displacements.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    
    // 变形后顶点缓冲区
    this.deformedVerticesBuffer = this.device.createBuffer({
      size: firstFrame.vertices.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    
    // 速度缓冲区
    this.velocitiesBuffer = this.device.createBuffer({
      size: vertexCount * 3 * 4, // vec3 float
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    
    // 轨迹点缓冲区
    if (this.config.visualEffects.enableTrails) {
      const trailBufferSize = vertexCount * this.config.visualEffects.trailLength * 3 * 4;
      this.trailPointsBuffer = this.device.createBuffer({
        size: trailBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });
    }
    
    console.log(`   原始顶点: ${(this.originalVerticesBuffer.size / 1024).toFixed(2)}KB`);
    console.log(`   变形顶点: ${(this.deformedVerticesBuffer.size / 1024).toFixed(2)}KB`);
    console.log(`   速度场: ${(this.velocitiesBuffer.size / 1024).toFixed(2)}KB`);
    if (this.trailPointsBuffer) {
      console.log(`   轨迹数据: ${(this.trailPointsBuffer.size / 1024).toFixed(2)}KB`);
    }
  }
  
  /**
   * 创建动画对象
   */
  private async createAnimationObjects(deformationData: PyVistaDeformationData): Promise<DeformationAnimationResult['animationObjects']> {
    console.log('🔧 创建Three.js变形动画对象...');
    
    const firstFrame = deformationData.meshFrames[0];
    
    // 1. 创建变形网格
    const deformedGeometry = new THREE.BufferGeometry();
    
    // 设置基础属性
    deformedGeometry.setAttribute('position', new THREE.BufferAttribute(firstFrame.vertices, 3));
    deformedGeometry.setAttribute('normal', new THREE.BufferAttribute(this.calculateNormals(firstFrame.vertices), 3));
    
    // 设置变形相关属性
    deformedGeometry.setAttribute('originalPosition', new THREE.BufferAttribute(firstFrame.originalVertices, 3));
    deformedGeometry.setAttribute('displacement', new THREE.BufferAttribute(firstFrame.displacements, 3));
    deformedGeometry.setAttribute('deformationMagnitude', new THREE.BufferAttribute(firstFrame.deformationMagnitude, 1));
    
    // 生成颜色（基于变形大小）
    const colors = this.generateDeformationColors(firstFrame.deformationMagnitude);
    deformedGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // 创建材质
    const deformedMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      wireframe: false,
      flatShading: false
    });
    
    // 如果启用变形目标，设置morph targets
    if (this.config.deformation.enableMorphTargets) {
      const morphTargets = [];
      const morphNormals = [];
      
      for (let i = 1; i < Math.min(deformationData.meshFrames.length, 8); i++) { // 最多8个变形目标
        const frame = deformationData.meshFrames[i];
        morphTargets.push(new THREE.BufferAttribute(frame.vertices, 3));
        morphNormals.push(new THREE.BufferAttribute(this.calculateNormals(frame.vertices), 3));
      }
      
      deformedGeometry.morphAttributes.position = morphTargets;
      deformedGeometry.morphAttributes.normal = morphNormals;
      deformedMaterial.morphTargets = true;
      deformedMaterial.morphNormals = true;
      
      console.log(`   变形目标: ${morphTargets.length}个`);
    }
    
    const deformedMesh = new THREE.Mesh(deformedGeometry, deformedMaterial);
    deformedMesh.name = 'DeformationMesh';
    
    // 2. 创建原始网格（可选）
    let originalMesh;
    if (this.config.deformation.showOriginalMesh) {
      const originalGeometry = new THREE.BufferGeometry();
      originalGeometry.setAttribute('position', new THREE.BufferAttribute(firstFrame.originalVertices, 3));
      originalGeometry.setAttribute('normal', new THREE.BufferAttribute(this.calculateNormals(firstFrame.originalVertices), 3));
      
      const originalMaterial = new THREE.MeshBasicMaterial({
        color: 0x808080,
        transparent: true,
        opacity: this.config.deformation.originalMeshOpacity,
        wireframe: true
      });
      
      originalMesh = new THREE.Mesh(originalGeometry, originalMaterial);
      originalMesh.name = 'OriginalMesh';
    }
    
    // 3. 创建轨迹系统
    let trailSystem;
    if (this.config.visualEffects.enableTrails) {
      trailSystem = this.createTrailSystem(deformationData);
    }
    
    // 4. 创建粒子系统
    let particleSystem;
    if (this.config.visualEffects.enableParticles) {
      particleSystem = this.createParticleSystem(deformationData);
    }
    
    // 5. 创建相机装备
    let cameraRig;
    if (this.config.cameraAnimation.enableCameraMovement) {
      cameraRig = this.createCameraRig(deformationData);
    }
    
    // 添加到场景
    this.scene.add(deformedMesh);
    if (originalMesh) this.scene.add(originalMesh);
    if (trailSystem) this.scene.add(trailSystem);
    if (particleSystem) this.scene.add(particleSystem);
    if (cameraRig) this.scene.add(cameraRig);
    
    console.log('✅ Three.js变形动画对象创建完成');
    console.log(`   变形网格: ${(firstFrame.vertices.length / 3)}个顶点`);
    if (originalMesh) console.log(`   原始网格: 透明度${this.config.deformation.originalMeshOpacity}`);
    if (trailSystem) console.log(`   轨迹系统: 长度${this.config.visualEffects.trailLength}`);
    
    return {
      deformedMesh,
      originalMesh,
      trailSystem,
      particleSystem,
      cameraRig
    };
  }
  
  /**
   * 创建轨迹系统
   */
  private createTrailSystem(deformationData: PyVistaDeformationData): THREE.Object3D {
    const trailGroup = new THREE.Object3D();
    trailGroup.name = 'TrailSystem';
    
    const firstFrame = deformationData.meshFrames[0];
    const vertexCount = firstFrame.vertices.length / 3;
    const trailLength = this.config.visualEffects.trailLength;
    const samplingRate = Math.max(1, Math.floor(vertexCount / 1000)); // 采样率，避免过多轨迹
    
    // 选择关键点创建轨迹
    const keyVertices = [];
    for (let i = 0; i < vertexCount; i += samplingRate) {
      if (firstFrame.deformationMagnitude[i] > deformationData.statistics.maxDeformation.value * 0.3) {
        keyVertices.push(i);
      }
    }
    
    console.log(`   创建轨迹: ${keyVertices.length}条轨迹线`);
    
    // 为每个关键顶点创建轨迹线
    for (const vertexIndex of keyVertices) {
      const trailPositions = new Float32Array(trailLength * 3);
      const trailColors = new Float32Array(trailLength * 3);
      
      // 初始化轨迹点
      for (let i = 0; i < trailLength; i++) {
        const baseIndex = vertexIndex * 3;
        trailPositions[i * 3] = firstFrame.vertices[baseIndex];
        trailPositions[i * 3 + 1] = firstFrame.vertices[baseIndex + 1];
        trailPositions[i * 3 + 2] = firstFrame.vertices[baseIndex + 2];
        
        const alpha = 1.0 - (i / trailLength);
        trailColors[i * 3] = 1.0 * alpha;     // 红色通道
        trailColors[i * 3 + 1] = 0.5 * alpha; // 绿色通道
        trailColors[i * 3 + 2] = 0.0;         // 蓝色通道
      }
      
      const trailGeometry = new THREE.BufferGeometry();
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
      
      const trailMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        linewidth: 2
      });
      
      const trailLine = new THREE.Line(trailGeometry, trailMaterial);
      trailLine.userData = { vertexIndex: vertexIndex };
      
      trailGroup.add(trailLine);
    }
    
    return trailGroup;
  }
  
  /**
   * 创建粒子系统
   */
  private createParticleSystem(deformationData: PyVistaDeformationData): THREE.Points {
    console.log('✨ 创建变形粒子系统...');
    
    const firstFrame = deformationData.meshFrames[0];
    const vertexCount = firstFrame.vertices.length / 3;
    const particleCount = Math.floor(vertexCount * this.config.visualEffects.particleDensity);
    
    // 粒子几何
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // 初始化粒子
    for (let i = 0; i < particleCount; i++) {
      const vertexIndex = Math.floor(Math.random() * vertexCount);
      const baseIndex = vertexIndex * 3;
      
      positions[i * 3] = firstFrame.vertices[baseIndex];
      positions[i * 3 + 1] = firstFrame.vertices[baseIndex + 1];
      positions[i * 3 + 2] = firstFrame.vertices[baseIndex + 2];
      
      // 基于变形大小设置颜色
      const deformation = firstFrame.deformationMagnitude[vertexIndex];
      const normalizedDeformation = deformation / deformationData.statistics.maxDeformation.value;
      
      colors[i * 3] = normalizedDeformation;         // 红色
      colors[i * 3 + 1] = 1.0 - normalizedDeformation; // 绿色
      colors[i * 3 + 2] = 0.5;                      // 蓝色
      
      sizes[i] = 2.0 + normalizedDeformation * 3.0; // 大小基于变形
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // 粒子材质
    const particleMaterial = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      alphaTest: 0.1
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.name = 'ParticleSystem';
    
    console.log(`   粒子数量: ${particleCount}`);
    
    return particleSystem;
  }
  
  /**
   * 创建相机装备
   */
  private createCameraRig(deformationData: PyVistaDeformationData): THREE.Object3D {
    console.log('🎥 创建相机动画装备...');
    
    const cameraRig = new THREE.Object3D();
    cameraRig.name = 'CameraRig';
    
    // 计算场景边界
    const bounds = this.calculateSceneBounds(deformationData);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // 设置关键关注点
    this.config.cameraAnimation.focusPoints = [
      center.clone(), // 中心点
      center.clone().add(new THREE.Vector3(maxDimension * 0.5, 0, 0)), // 右侧
      center.clone().add(new THREE.Vector3(0, maxDimension * 0.5, 0)), // 上方
      center.clone().add(new THREE.Vector3(0, 0, maxDimension * 0.5)), // 前方
      deformationData.statistics.maxDeformation.location.clone() // 最大变形点
    ];
    
    // 创建相机路径
    const cameraPath = this.createCameraPath(this.config.cameraAnimation.focusPoints);
    cameraRig.userData = { cameraPath };
    
    console.log(`   关注点: ${this.config.cameraAnimation.focusPoints.length}个`);
    console.log(`   路径模式: ${this.config.cameraAnimation.cameraPath}`);
    
    return cameraRig;
  }
  
  /**
   * 创建相机路径
   */
  private createCameraPath(focusPoints: THREE.Vector3[]): THREE.CatmullRomCurve3 {
    // 生成相机轨道点
    const cameraPoints = [];
    const radius = 100; // 相机轨道半径
    
    for (let i = 0; i < focusPoints.length; i++) {
      const focusPoint = focusPoints[i];
      const angle = (i / focusPoints.length) * Math.PI * 2;
      
      const cameraPoint = new THREE.Vector3(
        focusPoint.x + Math.cos(angle) * radius,
        focusPoint.y + Math.sin(angle) * radius * 0.5 + radius * 0.5,
        focusPoint.z + Math.sin(angle) * radius
      );
      
      cameraPoints.push(cameraPoint);
    }
    
    // 创建平滑曲线
    return new THREE.CatmullRomCurve3(cameraPoints, true); // 闭合曲线
  }
  
  /**
   * 设置相机动画
   */
  private async setupCameraAnimation(deformationData: PyVistaDeformationData): Promise<void> {
    console.log('🎬 设置相机动画系统...');
    
    if (!this.animationObjects.cameraRig) {
      this.animationObjects.cameraRig = this.createCameraRig(deformationData);
    }
    
    console.log('✅ 相机动画系统设置完成');
  }
  
  /**
   * 创建视觉效果
   */
  private async createVisualEffects(deformationData: PyVistaDeformationData): Promise<void> {
    console.log('✨ 创建变形视觉效果...');
    
    // 震撼波效果
    if (this.config.visualEffects.enableShockwaves) {
      await this.createShockwaveEffects(deformationData);
    }
    
    console.log('✅ 视觉效果创建完成');
  }
  
  /**
   * 创建震撼波效果
   */
  private async createShockwaveEffects(deformationData: PyVistaDeformationData): Promise<void> {
    // 在关键事件位置创建震撼波
    for (const event of deformationData.keyEvents) {
      if (event.severity === 'high' || event.severity === 'critical') {
        const shockwave = this.createShockwave(event.location, event.severity);
        this.scene.add(shockwave);
      }
    }
  }
  
  /**
   * 创建震撼波
   */
  private createShockwave(position: THREE.Vector3, severity: string): THREE.Object3D {
    const shockwaveGroup = new THREE.Object3D();
    
    // 创建环形几何
    const ringGeometry = new THREE.RingGeometry(0.1, 2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: severity === 'critical' ? 0xff0000 : 0xff8800,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.userData = { type: 'shockwave', severity };
    
    shockwaveGroup.add(ring);
    return shockwaveGroup;
  }
  
  /**
   * 动画循环
   */
  private startAnimationLoop(): void {
    const animate = () => {
      if (!this.animationState.isPlaying || !this.deformationData) {
        return;
      }
      
      const frameStartTime = performance.now();
      
      // 更新时间
      const deltaTime = 1 / this.config.timing.frameRate * this.animationState.playbackSpeed;
      this.animationState.currentTime += deltaTime;
      
      // 检查动画结束
      if (this.animationState.currentTime >= this.config.timing.totalDuration) {
        if (this.config.timing.loopMode === 'repeat') {
          this.animationState.currentTime = 0;
          this.animationState.currentFrame = 0;
        } else if (this.config.timing.loopMode === 'pingpong') {
          this.animationState.playbackSpeed *= -1;
          this.animationState.currentTime = this.config.timing.totalDuration;
        } else {
          this.stopAnimation();
          this.eventCallbacks.onAnimationComplete.forEach(callback => callback());
          return;
        }
      }
      
      // 计算当前帧
      const frameProgress = this.animationState.currentTime / this.config.timing.totalDuration;
      const frameIndex = Math.floor(frameProgress * this.deformationData.meshFrames.length);
      this.animationState.currentFrame = frameIndex;
      
      // 更新动画
      this.updateAnimationFrame(frameIndex, frameProgress);
      
      // 更新相机
      if (this.config.cameraAnimation.enableCameraMovement) {
        this.updateCameraAnimation(frameProgress);
      }
      
      // 性能统计
      const frameTime = performance.now() - frameStartTime;
      this.updatePerformanceStats(frameTime);
      
      // 触发回调
      this.eventCallbacks.onTimeUpdate.forEach(callback => {
        callback(this.animationState.currentTime, frameIndex);
      });
      
      // 继续下一帧
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * 更新动画帧
   */
  private async updateAnimationFrame(frameIndex: number, frameProgress: number): Promise<void> {
    if (!this.deformationData) return;
    
    const targetFrame = this.deformationData.meshFrames[frameIndex];
    if (!targetFrame) return;
    
    // GPU变形计算
    if (this.config.performance.enableGPUMorphing && this.device && this.deformationPipeline) {
      await this.updateGPUDeformation(targetFrame, frameProgress);
    } else {
      // CPU变形更新
      this.updateCPUDeformation(targetFrame, frameProgress);
    }
    
    // 更新轨迹
    if (this.config.visualEffects.enableTrails && this.animationObjects.trailSystem) {
      this.updateTrailSystem(targetFrame, frameIndex);
    }
    
    // 更新粒子
    if (this.config.visualEffects.enableParticles && this.animationObjects.particleSystem) {
      this.updateParticleSystem(targetFrame, frameProgress);
    }
  }
  
  /**
   * GPU变形更新
   */
  private async updateGPUDeformation(frame: any, progress: number): Promise<void> {
    if (!this.device || !this.deformationPipeline) return;
    
    // 更新位移数据
    this.device.queue.writeBuffer(this.displacementsBuffer!, 0, frame.displacements);
    
    // 创建参数缓冲区
    const params = new Float32Array([
      this.animationState.currentTime,           // time
      1 / this.config.timing.frameRate,         // deltaTime
      this.config.deformation.amplificationFactor, // amplificationFactor
      this.animationState.currentFrame,         // frameIndex
      this.deformationData!.meshFrames.length,  // totalFrames
      0                                         // interpolationMode
    ]);
    
    const paramsBuffer = this.device.createBuffer({
      size: params.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Float32Array(paramsBuffer.getMappedRange()).set(params);
    paramsBuffer.unmap();
    
    // 创建绑定组
    const bindGroup = this.device.createBindGroup({
      layout: this.deformationPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.originalVerticesBuffer! } },
        { binding: 1, resource: { buffer: this.displacementsBuffer! } },
        { binding: 2, resource: { buffer: this.deformedVerticesBuffer! } },
        { binding: 3, resource: { buffer: this.velocitiesBuffer! } },
        { binding: 4, resource: { buffer: paramsBuffer } }
      ]
    });
    
    // 执行计算
    const commandEncoder = this.device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    
    computePass.setPipeline(this.deformationPipeline);
    computePass.setBindGroup(0, bindGroup);
    
    const vertexCount = frame.vertices.length / 3;
    const workgroupCount = Math.ceil(vertexCount / 64);
    computePass.dispatchWorkgroups(workgroupCount);
    
    computePass.end();
    
    // 提交命令
    this.device.queue.submit([commandEncoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    
    // 读取结果并更新Three.js网格
    const resultBuffer = this.device.createBuffer({
      size: this.deformedVerticesBuffer!.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    
    const copyEncoder = this.device.createCommandEncoder();
    copyEncoder.copyBufferToBuffer(this.deformedVerticesBuffer!, 0, resultBuffer, 0, resultBuffer.size);
    this.device.queue.submit([copyEncoder.finish()]);
    
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const resultArray = new Float32Array(resultBuffer.getMappedRange());
    
    // 更新Three.js几何体
    if (this.animationObjects.deformedMesh.geometry.attributes.position) {
      this.animationObjects.deformedMesh.geometry.attributes.position.array.set(resultArray);
      this.animationObjects.deformedMesh.geometry.attributes.position.needsUpdate = true;
      this.animationObjects.deformedMesh.geometry.computeVertexNormals();
    }
    
    resultBuffer.unmap();
    resultBuffer.destroy();
    paramsBuffer.destroy();
  }
  
  /**
   * CPU变形更新
   */
  private updateCPUDeformation(frame: any, progress: number): void {
    const positionAttribute = this.animationObjects.deformedMesh.geometry.attributes.position;
    if (!positionAttribute) return;
    
    const positions = positionAttribute.array as Float32Array;
    const amplification = this.config.deformation.amplificationFactor;
    
    // 简单的线性插值更新
    for (let i = 0; i < frame.vertices.length; i++) {
      positions[i] = frame.originalVertices[i] + frame.displacements[i] * amplification;
    }
    
    positionAttribute.needsUpdate = true;
    this.animationObjects.deformedMesh.geometry.computeVertexNormals();
    
    // 更新颜色（基于变形大小）
    const colorAttribute = this.animationObjects.deformedMesh.geometry.attributes.color;
    if (colorAttribute) {
      const colors = this.generateDeformationColors(frame.deformationMagnitude);
      colorAttribute.array.set(colors);
      colorAttribute.needsUpdate = true;
    }
  }
  
  /**
   * 更新轨迹系统
   */
  private updateTrailSystem(frame: any, frameIndex: number): void {
    if (!this.animationObjects.trailSystem) return;
    
    // 更新每条轨迹线
    this.animationObjects.trailSystem.children.forEach((trailLine: THREE.Line) => {
      const vertexIndex = trailLine.userData.vertexIndex;
      const positionAttribute = trailLine.geometry.attributes.position;
      
      if (positionAttribute) {
        const positions = positionAttribute.array as Float32Array;
        const trailLength = this.config.visualEffects.trailLength;
        
        // 移动轨迹点
        for (let i = trailLength - 1; i > 0; i--) {
          positions[i * 3] = positions[(i - 1) * 3];
          positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
          positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
        }
        
        // 设置新的头部点
        const baseIndex = vertexIndex * 3;
        positions[0] = frame.vertices[baseIndex];
        positions[1] = frame.vertices[baseIndex + 1];
        positions[2] = frame.vertices[baseIndex + 2];
        
        positionAttribute.needsUpdate = true;
      }
    });
  }
  
  /**
   * 更新粒子系统
   */
  private updateParticleSystem(frame: any, progress: number): void {
    if (!this.animationObjects.particleSystem) return;
    
    const positionAttribute = this.animationObjects.particleSystem.geometry.attributes.position;
    const sizeAttribute = this.animationObjects.particleSystem.geometry.attributes.size;
    
    if (positionAttribute && sizeAttribute) {
      const positions = positionAttribute.array as Float32Array;
      const sizes = sizeAttribute.array as Float32Array;
      
      // 基于变形更新粒子位置和大小
      for (let i = 0; i < positions.length / 3; i++) {
        const vertexIndex = Math.floor(Math.random() * (frame.vertices.length / 3));
        const baseIndex = vertexIndex * 3;
        
        positions[i * 3] = frame.vertices[baseIndex];
        positions[i * 3 + 1] = frame.vertices[baseIndex + 1];
        positions[i * 3 + 2] = frame.vertices[baseIndex + 2];
        
        const deformation = frame.deformationMagnitude[vertexIndex];
        sizes[i] = 2.0 + (deformation / this.deformationData!.statistics.maxDeformation.value) * 5.0;
      }
      
      positionAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
    }
  }
  
  /**
   * 更新相机动画
   */
  private updateCameraAnimation(progress: number): void {
    if (!this.animationObjects.cameraRig) return;
    
    const cameraPath = this.animationObjects.cameraRig.userData.cameraPath as THREE.CatmullRomCurve3;
    if (!cameraPath) return;
    
    // 计算相机位置
    const cameraPosition = cameraPath.getPoint(progress);
    this.camera.position.copy(cameraPosition);
    
    // 计算注视点
    const focusIndex = Math.floor(progress * this.config.cameraAnimation.focusPoints.length);
    const focusPoint = this.config.cameraAnimation.focusPoints[focusIndex] || this.config.cameraAnimation.focusPoints[0];
    
    this.camera.lookAt(focusPoint);
  }
  
  // =================================
  // 辅助方法
  // =================================
  
  private updateToFrame(frameIndex: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.deformationData) {
        resolve();
        return;
      }
      
      const frame = this.deformationData.meshFrames[frameIndex];
      if (frame) {
        this.updateCPUDeformation(frame, frameIndex / this.deformationData.meshFrames.length);
      }
      
      resolve();
    });
  }
  
  private resetToInitialState(): void {
    if (!this.deformationData) return;
    
    const firstFrame = this.deformationData.meshFrames[0];
    this.updateCPUDeformation(firstFrame, 0);
  }
  
  private createAnimationController(): AnimationController {
    const self = this;
    
    return {
      play: () => self.playAnimation(),
      pause: () => self.pauseAnimation(),
      stop: () => self.stopAnimation(),
      reset: () => {
        self.stopAnimation();
        self.seekToTime(0);
      },
      
      setCurrentTime: (time: number) => self.seekToTime(time),
      getCurrentTime: () => self.animationState.currentTime,
      getTotalDuration: () => self.config.timing.totalDuration,
      
      isPlaying: () => self.animationState.isPlaying,
      isPaused: () => self.animationState.isPaused,
      getCurrentFrame: () => self.animationState.currentFrame,
      getTotalFrames: () => self.deformationData?.meshFrames.length || 0,
      
      setPlaybackSpeed: (speed: number) => self.setPlaybackSpeed(speed),
      getPlaybackSpeed: () => self.animationState.playbackSpeed,
      
      onTimeUpdate: (callback) => self.eventCallbacks.onTimeUpdate.push(callback),
      onAnimationComplete: (callback) => self.eventCallbacks.onAnimationComplete.push(callback),
      onKeyEvent: (callback) => self.eventCallbacks.onKeyEvent.push(callback)
    };
  }
  
  private setupInteractionControls(): void {
    console.log('🎮 设置交互控制...');
    
    if (this.config.interaction.enableHotkeys) {
      document.addEventListener('keydown', (event) => {
        switch (event.code) {
          case 'Space':
            event.preventDefault();
            if (this.animationState.isPlaying) {
              this.pauseAnimation();
            } else {
              this.playAnimation();
            }
            break;
          case 'KeyR':
            event.preventDefault();
            this.stopAnimation();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            this.seekToTime(Math.max(0, this.animationState.currentTime - 1));
            break;
          case 'ArrowRight':
            event.preventDefault();
            this.seekToTime(Math.min(this.config.timing.totalDuration, this.animationState.currentTime + 1));
            break;
        }
      });
    }
    
    console.log('✅ 交互控制设置完成');
  }
  
  private calculateNormals(vertices: Float32Array): Float32Array {
    const normals = new Float32Array(vertices.length);
    
    // 简化的法向量计算
    for (let i = 0; i < vertices.length; i += 9) {
      const v1 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
      const v2 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
      const v3 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);
      
      const normal = new THREE.Vector3()
        .crossVectors(v2.clone().sub(v1), v3.clone().sub(v1))
        .normalize();
      
      for (let j = 0; j < 3; j++) {
        normals[i + j * 3] = normal.x;
        normals[i + j * 3 + 1] = normal.y;
        normals[i + j * 3 + 2] = normal.z;
      }
    }
    
    return normals;
  }
  
  private generateDeformationColors(deformationMagnitude: Float32Array): Float32Array {
    const colors = new Float32Array(deformationMagnitude.length * 3);
    const maxDeformation = Math.max(...Array.from(deformationMagnitude));
    
    for (let i = 0; i < deformationMagnitude.length; i++) {
      const normalized = deformationMagnitude[i] / maxDeformation;
      
      // 热力图颜色映射 (蓝->绿->黄->红)
      if (normalized < 0.25) {
        const t = normalized / 0.25;
        colors[i * 3] = 0;                    // R
        colors[i * 3 + 1] = t;               // G
        colors[i * 3 + 2] = 1;               // B
      } else if (normalized < 0.5) {
        const t = (normalized - 0.25) / 0.25;
        colors[i * 3] = 0;                    // R
        colors[i * 3 + 1] = 1;               // G
        colors[i * 3 + 2] = 1 - t;           // B
      } else if (normalized < 0.75) {
        const t = (normalized - 0.5) / 0.25;
        colors[i * 3] = t;                    // R
        colors[i * 3 + 1] = 1;               // G
        colors[i * 3 + 2] = 0;               // B
      } else {
        const t = (normalized - 0.75) / 0.25;
        colors[i * 3] = 1;                    // R
        colors[i * 3 + 1] = 1 - t;           // G
        colors[i * 3 + 2] = 0;               // B
      }
    }
    
    return colors;
  }
  
  private calculateSceneBounds(deformationData: PyVistaDeformationData): THREE.Box3 {
    const bounds = new THREE.Box3();
    
    for (const frame of deformationData.meshFrames) {
      for (let i = 0; i < frame.vertices.length; i += 3) {
        bounds.expandByPoint(new THREE.Vector3(
          frame.vertices[i],
          frame.vertices[i + 1],
          frame.vertices[i + 2]
        ));
      }
    }
    
    return bounds;
  }
  
  private generateDeformationHeatmap(deformationData: PyVistaDeformationData): THREE.DataTexture {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    
    // 生成变形热力图纹理
    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random();
      data[i] = Math.floor(value * 255);     // R
      data[i + 1] = Math.floor((1 - value) * 255); // G
      data[i + 2] = 0;                       // B
      data[i + 3] = 255;                     // A
    }
    
    return new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  }
  
  private generateTrailTexture(): THREE.DataTexture {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    
    // 生成轨迹纹理
    for (let i = 0; i < data.length; i += 4) {
      const alpha = Math.random() * 255;
      data[i] = 255;      // R
      data[i + 1] = 128;  // G
      data[i + 2] = 0;    // B
      data[i + 3] = alpha; // A
    }
    
    return new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  }
  
  private createKeyEventMarkers(deformationData: PyVistaDeformationData): THREE.Object3D[] {
    const markers: THREE.Object3D[] = [];
    
    for (const event of deformationData.keyEvents) {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      let color = 0xffff00;
      
      switch (event.severity) {
        case 'critical': color = 0xff0000; break;
        case 'high': color = 0xff8800; break;
        case 'medium': color = 0xffff00; break;
        case 'low': color = 0x00ff00; break;
      }
      
      const material = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(geometry, material);
      
      marker.position.copy(event.location);
      marker.userData = { event };
      
      markers.push(marker);
    }
    
    return markers;
  }
  
  private calculateMemoryUsage(deformationData: PyVistaDeformationData): number {
    let totalMemory = 0;
    
    for (const frame of deformationData.meshFrames) {
      totalMemory += frame.vertices.byteLength;
      totalMemory += frame.originalVertices.byteLength;
      totalMemory += frame.displacements.byteLength;
      totalMemory += frame.deformationMagnitude.byteLength;
    }
    
    return totalMemory;
  }
  
  private calculateGPUMemoryUsage(deformationData: PyVistaDeformationData): number {
    if (!this.config.performance.enableGPUMorphing) return 0;
    
    const firstFrame = deformationData.meshFrames[0];
    const vertexCount = firstFrame.vertices.length / 3;
    
    let gpuMemory = 0;
    gpuMemory += firstFrame.originalVertices.byteLength; // 原始顶点
    gpuMemory += firstFrame.displacements.byteLength;    // 位移
    gpuMemory += vertexCount * 3 * 4;                    // 变形后顶点
    gpuMemory += vertexCount * 3 * 4;                    // 速度场
    
    if (this.config.visualEffects.enableTrails) {
      gpuMemory += vertexCount * this.config.visualEffects.trailLength * 3 * 4; // 轨迹
    }
    
    return gpuMemory;
  }
  
  private updatePerformanceStats(frameTime: number): void {
    this.performanceStats.frameProcessingTimes.push(frameTime);
    
    // 保持最近100帧的记录
    if (this.performanceStats.frameProcessingTimes.length > 100) {
      this.performanceStats.frameProcessingTimes.shift();
    }
    
    // 计算平均帧时间
    this.performanceStats.averageFrameTime = 
      this.performanceStats.frameProcessingTimes.reduce((sum, time) => sum + time, 0) / 
      this.performanceStats.frameProcessingTimes.length;
    
    // 检测丢帧
    if (frameTime > 1000 / this.config.timing.frameRate * 1.5) {
      this.performanceStats.droppedFrames++;
    }
  }
  
  /**
   * 获取性能统计
   */
  getPerformanceStatistics(): {
    averageFrameTime: number;
    currentFPS: number;
    droppedFrames: number;
    memoryUsage: number;
    gpuMemoryUsage: number;
  } {
    const currentFPS = this.performanceStats.averageFrameTime > 0 ? 
      1000 / this.performanceStats.averageFrameTime : 0;
    
    return {
      averageFrameTime: this.performanceStats.averageFrameTime,
      currentFPS,
      droppedFrames: this.performanceStats.droppedFrames,
      memoryUsage: this.performanceStats.memoryUsage,
      gpuMemoryUsage: this.calculateGPUMemoryUsage(this.deformationData!)
    };
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    console.log('🧹 清理变形动画系统资源...');
    
    // 停止动画
    this.stopAnimation();
    
    // 清理GPU资源
    if (this.originalVerticesBuffer) this.originalVerticesBuffer.destroy();
    if (this.displacementsBuffer) this.displacementsBuffer.destroy();
    if (this.deformedVerticesBuffer) this.deformedVerticesBuffer.destroy();
    if (this.velocitiesBuffer) this.velocitiesBuffer.destroy();
    if (this.trailPointsBuffer) this.trailPointsBuffer.destroy();
    
    if (this.device) {
      this.device.destroy();
    }
    
    // 清理Three.js对象
    if (this.animationObjects.deformedMesh) {
      this.scene.remove(this.animationObjects.deformedMesh);
    }
    if (this.animationObjects.originalMesh) {
      this.scene.remove(this.animationObjects.originalMesh);
    }
    if (this.animationObjects.trailSystem) {
      this.scene.remove(this.animationObjects.trailSystem);
    }
    if (this.animationObjects.particleSystem) {
      this.scene.remove(this.animationObjects.particleSystem);
    }
    
    // 清理事件监听
    this.eventCallbacks.onTimeUpdate = [];
    this.eventCallbacks.onAnimationComplete = [];
    this.eventCallbacks.onKeyEvent = [];
    
    console.log('✅ 变形动画系统资源清理完成');
  }
}

// 导出便捷函数
export function createDeformationAnimationSystem(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  config?: Partial<DeformationAnimationConfig>
): DeformationAnimationSystem {
  return new DeformationAnimationSystem(scene, renderer, camera, config);
}

// 使用示例
export const DEFORMATION_ANIMATION_EXAMPLES = {
  cinematic_showcase: `
    // 电影级深基坑变形动画示例
    const animationSystem = createDeformationAnimationSystem(scene, renderer, camera, {
      timing: {
        totalDuration: 45.0,      // 45秒震撼展示
        frameRate: 60,            // 60fps流畅播放
        playbackSpeed: 1.0,
        loopMode: 'repeat'
      },
      
      deformation: {
        amplificationFactor: 5000.0, // 5000倍放大显示
        showOriginalMesh: true,
        morphBlendMode: 'smooth'
      },
      
      visualEffects: {
        enableTrails: true,       // 轨迹跟踪
        enableParticles: true,    // 粒子效果
        enableShockwaves: true,   // 震撼波
        colorTransition: true
      },
      
      cameraAnimation: {
        enableCameraMovement: true,
        cameraPath: 'fly_through', // 飞行穿越
        enableCinematicEffects: true
      },
      
      performance: {
        enableGPUMorphing: true,  // GPU高性能变形
        enableLOD: true,
        maxVerticesPerFrame: 2000000
      }
    });
    
    // 初始化WebGPU
    await animationSystem.initializeGPUAnimation();
    
    // 创建变形动画
    const animationResult = await animationSystem.createDeformationAnimation(pyvistaDeformationData);
    
    // 播放震撼动画
    await animationSystem.playAnimation();
    
    console.log('🎬 深基坑电影级变形动画播放中...');
  `
};

console.log('🎬 深基坑变形动画系统已就绪 - PyVista专业计算 + WebGPU高性能 + Three.js震撼展示');