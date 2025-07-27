/**
 * 深基坑流场可视化WebGPU系统
 * 3号计算专家 - 基于PyVista+Three.js架构的专业渗流可视化
 * 数据流：PyVista渗流计算 → WebGPU流场处理 → Three.js震撼渲染
 * 支持地下水流动、渗流分析、管涌风险可视化的高性能GPU系统
 */

import * as THREE from 'three';
import { 
  GPUEnhancedPostprocessor,
  type GPUPerformanceMetrics 
} from './gpuIntegration';

import { 
  StressCloudGPURenderer,
  type PyVistaStressData 
} from './stressCloudGPURenderer';

// 流场可视化配置
export interface FlowFieldVisualizationConfig {
  // WebGPU计算配置
  webgpu: {
    workgroupSize: [number, number, number];
    maxComputeInvocations: number;
    enableAsyncCompute: boolean;
    computeShaderOptimization: 'speed' | 'memory' | 'quality';
    maxBufferSize: number;                    // MB
  };
  
  // 流场渲染配置
  flowField: {
    // 流线配置
    streamlines: {
      enabled: boolean;
      density: number;                        // 流线密度 0-1
      maxLength: number;                      // 最大流线长度 (m)
      integrationStep: number;                // 积分步长
      animationSpeed: number;                 // 动画速度倍数
      fadeEffect: boolean;                    // 淡出效果
      colorByVelocity: boolean;              // 按速度着色
    };
    
    // 矢量场配置  
    vectorField: {
      enabled: boolean;
      arrowDensity: number;                   // 箭头密度
      arrowScale: number;                     // 箭头缩放
      arrowShape: 'arrow' | 'needle' | 'cone';
      dynamicScaling: boolean;                // 动态缩放
      velocityThreshold: number;              // 显示阈值 (m/s)
    };
    
    // 粒子追踪配置
    particleTracing: {
      enabled: boolean;
      particleCount: number;                  // 粒子数量
      particleLifetime: number;               // 粒子生命周期 (s)
      particleSize: number;                   // 粒子大小
      emissionRate: number;                   // 发射速率 (particles/s)
      gravity: boolean;                       // 重力影响
      turbulence: number;                     // 湍流强度
    };
    
    // 等速线配置
    isovelocity: {
      enabled: boolean;
      levels: number[];                       // 速度等级 (m/s)
      contourSmoothing: number;              // 等值线平滑度
      fillContours: boolean;                  // 填充等值线
      labelContours: boolean;                 // 标注数值
    };
  };
  
  // 渗流专业配置
  seepage: {
    // 管涌风险可视化
    pipingRisk: {
      enabled: boolean;
      criticalGradient: number;               // 临界水力梯度
      riskZoneHighlight: boolean;             // 高风险区域高亮
      warningThreshold: number;               // 预警阈值
      dangerThreshold: number;                // 危险阈值
    };
    
    // 承压含水层
    confinedAquifer: {
      enabled: boolean;
      pressureVisualization: boolean;         // 水压可视化
      drawdownCones: boolean;                 // 降落漏斗
      wellInfluence: boolean;                 // 井点影响范围
    };
    
    // 地下水位
    groundwaterLevel: {
      enabled: boolean;
      animateWaterTable: boolean;             // 水位动画
      seasonalVariation: boolean;             // 季节变化
      precipitationEffect: boolean;           // 降雨影响
    };
  };
  
  // 视觉效果配置
  visualEffects: {
    // 流体效果
    fluidEffects: {
      enableFluidShading: boolean;            // 流体着色
      refractionEffect: boolean;              // 折射效果
      transparencyLayers: boolean;            // 透明度分层
      foamGeneration: boolean;                // 泡沫生成
    };
    
    // 动画效果
    animation: {
      enableTimeAnimation: boolean;           // 时间动画
      flowPulsation: boolean;                 // 流动脉动
      velocityWaves: boolean;                 // 速度波动
      particleSparkle: boolean;               // 粒子闪烁
    };
    
    // 交互效果
    interaction: {
      enableHover: boolean;                   // 悬停交互
      clickForDetails: boolean;               // 点击详情
      enableCrossSections: boolean;           // 截面分析
      measurementTools: boolean;              // 测量工具
    };
  };
  
  // 性能优化配置
  performance: {
    levelOfDetail: {
      enabled: boolean;
      lodDistances: number[];                 // LOD切换距离
      particleLOD: boolean;                   // 粒子LOD
      streamlineLOD: boolean;                 // 流线LOD
    };
    
    culling: {
      frustumCulling: boolean;                // 视锥裁剪
      occlusionCulling: boolean;              // 遮挡裁剪
      velocityCulling: boolean;               // 速度裁剪
      cullThreshold: number;                  // 裁剪阈值
    };
    
    gpu: {
      enableBatching: boolean;                // 批处理
      maxDrawCalls: number;                   // 最大绘制调用
      bufferOptimization: boolean;            // 缓冲区优化
      memoryManagement: 'automatic' | 'manual';
    };
  };
}

// PyVista渗流数据格式
export interface PyVistaSeepageData {
  // 基础网格数据
  meshData: {
    vertices: Float32Array;                   // 节点坐标 [x,y,z,...]
    cells: Uint32Array;                       // 单元连接
    cellTypes: Uint8Array;                    // 单元类型
    normals: Float32Array;                    // 法向量
  };
  
  // 渗流场数据
  seepageFields: {
    // 速度场
    velocity: {
      vectors: Float32Array;                  // 速度矢量 [vx,vy,vz,...]
      magnitude: Float32Array;                // 速度大小
      direction: Float32Array;                // 流向角度
      range: [number, number];                // 速度范围 (m/s)
    };
    
    // 压力场
    pressure: {
      values: Float32Array;                   // 孔隙水压力 (kPa)
      hydraulicHead: Float32Array;            // 水头高度 (m)
      pressureGradient: Float32Array;         // 压力梯度
      range: [number, number];                // 压力范围
    };
    
    // 渗透性场
    permeability: {
      horizontal: Float32Array;               // 水平渗透系数 (m/s)
      vertical: Float32Array;                 // 垂直渗透系数 (m/s)
      anisotropyRatio: Float32Array;          // 各向异性比
      conductivity: Float32Array;             // 导水系数
    };
    
    // 水力梯度
    hydraulicGradient: {
      values: Float32Array;                   // 水力梯度值
      directions: Float32Array;               // 梯度方向
      criticalZones: Float32Array;            // 临界区域标记
      pipingRisk: Float32Array;               // 管涌风险指数 0-1
    };
  };
  
  // 边界条件
  boundaryConditions: {
    // 定水头边界
    constantHead: Array<{
      nodeIds: number[];
      headValue: number;                      // 水头值 (m)
      isActive: boolean;
    }>;
    
    // 定流量边界
    constantFlow: Array<{
      elementIds: number[];
      flowRate: number;                       // 流量 (m³/s)
      direction: [number, number, number];    // 流向
    }>;
    
    // 不透水边界
    impermeable: Array<{
      faceIds: number[];
      description: string;
    }>;
    
    // 渗出面边界
    seepageFace: Array<{
      faceIds: number[];
      atmosphericPressure: number;            // 大气压力 (kPa)
    }>;
  };
  
  // 井点数据
  wellData: Array<{
    wellId: string;
    position: [number, number, number];       // 井点位置
    wellType: 'pumping' | 'injection' | 'observation';
    
    // 抽水井参数
    pumpingRate?: number;                     // 抽水量 (m³/day)
    screenDepth?: [number, number];           // 滤管深度范围
    wellRadius?: number;                      // 井半径 (m)
    
    // 影响范围
    influenceRadius?: number;                 // 影响半径 (m)
    drawdownCone?: {
      vertices: Float32Array;                 // 降落漏斗顶点
      depths: Float32Array;                   // 深度值
    };
  }>;
  
  // 时间序列数据
  timeSeriesData?: {
    timeSteps: number[];                      // 时间步 (day)
    velocityHistory: Float32Array[];          // 速度历史
    pressureHistory: Float32Array[];          // 压力历史
    waterLevelHistory: Float32Array[];        // 水位历史
  };
  
  // 统计信息
  statistics: {
    flow: {
      maxVelocity: number;                    // 最大流速 (m/s)
      avgVelocity: number;                    // 平均流速 (m/s)
      totalInflow: number;                    // 总入流量 (m³/day)
      totalOutflow: number;                   // 总出流量 (m³/day)
    };
    
    pressure: {
      maxPressure: number;                    // 最大压力 (kPa)
      minPressure: number;                    // 最小压力 (kPa)
      avgGradient: number;                    // 平均梯度
    };
    
    risk: {
      pipingRiskNodes: number;                // 管涌风险节点数
      highGradientCells: number;              // 高梯度单元数
      criticalZoneArea: number;               // 临界区域面积 (m²)
    };
  };
}

// WebGPU流场计算着色器
const FLOW_FIELD_COMPUTE_SHADER = /* wgsl */`
struct FlowFieldUniforms {
  time: f32,
  deltaTime: f32,
  particleCount: u32,
  maxVelocity: f32,
  integrationStep: f32,
  gravityStrength: f32,
  turbulenceStrength: f32,
  fadeRate: f32,
};

struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  age: f32,
  life: f32,
  size: f32,
  color: vec3<f32>,
};

struct FlowVertex {
  position: vec3<f32>,
  velocity: vec3<f32>,
  pressure: f32,
  gradient: f32,
};

@group(0) @binding(0) var<uniform> uniforms: FlowFieldUniforms;
@group(0) @binding(1) var<storage, read> flowField: array<FlowVertex>;
@group(0) @binding(2) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(3) var<storage, read_write> streamlines: array<vec3<f32>>;

// 三线性插值获取流场数据
fn interpolateFlowField(pos: vec3<f32>) -> vec3<f32> {
  // 找到最近的网格点
  let gridSize = vec3<f32>(128.0, 64.0, 32.0);
  let gridPos = pos * gridSize;
  let basePos = floor(gridPos);
  let fraction = gridPos - basePos;
  
  // 获取8个邻近点的速度
  let i000 = u32(basePos.x) + u32(basePos.y) * 128u + u32(basePos.z) * 128u * 64u;
  let i001 = i000 + 128u * 64u;
  let i010 = i000 + 128u;
  let i011 = i010 + 128u * 64u;
  let i100 = i000 + 1u;
  let i101 = i100 + 128u * 64u;
  let i110 = i100 + 128u;
  let i111 = i110 + 128u * 64u;
  
  // 边界检查
  if (i111 >= arrayLength(&flowField)) {
    return vec3<f32>(0.0);
  }
  
  // 三线性插值
  let v000 = flowField[i000].velocity;
  let v001 = flowField[i001].velocity;
  let v010 = flowField[i010].velocity;
  let v011 = flowField[i011].velocity;
  let v100 = flowField[i100].velocity;
  let v101 = flowField[i101].velocity;
  let v110 = flowField[i110].velocity;
  let v111 = flowField[i111].velocity;
  
  let v00 = mix(v000, v001, fraction.z);
  let v01 = mix(v010, v011, fraction.z);
  let v10 = mix(v100, v101, fraction.z);
  let v11 = mix(v110, v111, fraction.z);
  
  let v0 = mix(v00, v01, fraction.y);
  let v1 = mix(v10, v11, fraction.y);
  
  return mix(v0, v1, fraction.x);
}

// 粒子更新计算
@compute @workgroup_size(256)
fn updateParticles(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= uniforms.particleCount) {
    return;
  }
  
  var particle = particles[index];
  
  // 更新粒子年龄
  particle.age += uniforms.deltaTime;
  
  // 重生已死亡粒子
  if (particle.age > particle.life) {
    // 随机重生位置 (简化随机)
    let hash = f32(index * 1103515245u + 12345u) / 4294967296.0;
    particle.position = vec3<f32>(
      hash * 100.0 - 50.0,
      (hash * 37.0) % 1.0 * 100.0 - 50.0,
      (hash * 73.0) % 1.0 * 20.0 - 10.0
    );
    particle.age = 0.0;
    particle.life = 5.0 + hash * 10.0;
    particle.size = 0.1 + hash * 0.2;
  }
  
  // 获取当前位置的流场
  let flowVelocity = interpolateFlowField(particle.position * 0.01);
  
  // 添加重力
  var gravity = vec3<f32>(0.0, -9.81, 0.0) * uniforms.gravityStrength;
  
  // 添加湍流
  let turbulence = vec3<f32>(
    sin(uniforms.time * 2.0 + particle.position.x * 0.1) * uniforms.turbulenceStrength,
    cos(uniforms.time * 1.5 + particle.position.y * 0.1) * uniforms.turbulenceStrength,
    sin(uniforms.time * 3.0 + particle.position.z * 0.1) * uniforms.turbulenceStrength
  );
  
  // 更新速度
  particle.velocity = flowVelocity + gravity * uniforms.deltaTime + turbulence;
  
  // 限制最大速度
  let speed = length(particle.velocity);
  if (speed > uniforms.maxVelocity) {
    particle.velocity = particle.velocity * (uniforms.maxVelocity / speed);
  }
  
  // 更新位置
  particle.position += particle.velocity * uniforms.deltaTime;
  
  // 更新颜色 (基于速度和年龄)
  let ageRatio = particle.age / particle.life;
  let speedRatio = min(speed / uniforms.maxVelocity, 1.0);
  
  particle.color = vec3<f32>(
    speedRatio,                           // 红色通道：速度
    1.0 - ageRatio,                       // 绿色通道：年轻度
    0.5 + 0.5 * sin(uniforms.time + speedRatio * 6.28)  // 蓝色通道：动态
  );
  
  // 更新大小 (随年龄衰减)
  particle.size = particle.size * (1.0 - uniforms.fadeRate * uniforms.deltaTime);
  
  particles[index] = particle;
}

// 流线追踪计算
@compute @workgroup_size(64)
fn traceStreamlines(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let streamlineId = global_id.x;
  let pointsPerStreamline = 100u;
  let totalPoints = arrayLength(&streamlines) / pointsPerStreamline;
  
  if (streamlineId >= totalPoints) {
    return;
  }
  
  // 流线起始点
  let startIndex = streamlineId * pointsPerStreamline;
  var currentPos = streamlines[startIndex];
  
  // Runge-Kutta 4阶积分追踪流线
  for (var i = 1u; i < pointsPerStreamline; i++) {
    let k1 = interpolateFlowField(currentPos) * uniforms.integrationStep;
    let k2 = interpolateFlowField(currentPos + k1 * 0.5) * uniforms.integrationStep;
    let k3 = interpolateFlowField(currentPos + k2 * 0.5) * uniforms.integrationStep;
    let k4 = interpolateFlowField(currentPos + k3) * uniforms.integrationStep;
    
    let deltaPos = (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0;
    currentPos += deltaPos;
    
    // 边界检查
    if (currentPos.x < -50.0 || currentPos.x > 50.0 ||
        currentPos.y < -50.0 || currentPos.y > 50.0 ||
        currentPos.z < -10.0 || currentPos.z > 10.0) {
      break;
    }
    
    streamlines[startIndex + i] = currentPos;
  }
}
`;

// 流场WebGPU渲染器主类
export class FlowFieldVisualizationGPU {
  private device: GPUDevice | null = null;
  private computePipeline: GPUComputePipeline | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private flowFieldBuffer: GPUBuffer | null = null;
  private particleBuffer: GPUBuffer | null = null;
  private streamlineBuffer: GPUBuffer | null = null;
  
  private scene: THREE.Scene;
  private config: FlowFieldVisualizationConfig;
  private particleSystem: THREE.Points | null = null;
  private streamlineMesh: THREE.LineSegments | null = null;
  private vectorFieldMesh: THREE.InstancedMesh | null = null;
  
  private animationId: number | null = null;
  private startTime: number = Date.now();
  private lastUpdateTime: number = 0;
  
  constructor(scene: THREE.Scene, config: FlowFieldVisualizationConfig) {
    this.scene = scene;
    this.config = config;
  }
  
  /**
   * 初始化WebGPU流场可视化系统
   */
  async initialize(): Promise<boolean> {
    try {
      // 检查WebGPU支持
      if (!navigator.gpu) {
        console.warn('WebGPU not supported');
        return false;
      }
      
      // 请求GPU适配器和设备
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!adapter) {
        console.warn('WebGPU adapter not available');
        return false;
      }
      
      this.device = await adapter.requestDevice({
        requiredFeatures: ['timestamp-query'] as GPUFeatureName[],
        requiredLimits: {
          maxComputeWorkgroupStorageSize: 32768,
          maxComputeInvocationsPerWorkgroup: 1024,
          maxComputeWorkgroupsPerDimension: 65535
        }
      });
      
      // 创建计算管线
      await this.createComputePipeline();
      
      console.log('FlowFieldVisualizationGPU initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize FlowFieldVisualizationGPU:', error);
      return false;
    }
  }
  
  /**
   * 创建WebGPU计算管线
   */
  private async createComputePipeline(): Promise<void> {
    if (!this.device) return;
    
    // 创建着色器模块
    const shaderModule = this.device.createShaderModule({
      code: FLOW_FIELD_COMPUTE_SHADER
    });
    
    // 创建计算管线
    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'updateParticles'
      }
    });
    
    // 创建缓冲区
    await this.createBuffers();
  }
  
  /**
   * 创建GPU缓冲区
   */
  private async createBuffers(): Promise<void> {
    if (!this.device) return;
    
    // 统一变量缓冲区
    this.uniformBuffer = this.device.createBuffer({
      size: 32, // 8 * 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    // 粒子缓冲区
    const particleCount = this.config.flowField.particleTracing.particleCount;
    this.particleBuffer = this.device.createBuffer({
      size: particleCount * 44, // 11 * 4 bytes per particle
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    
    // 流线缓冲区
    const streamlinePoints = 1000 * 100; // 1000条流线，每条100个点
    this.streamlineBuffer = this.device.createBuffer({
      size: streamlinePoints * 12, // 3 * 4 bytes per point
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
  }
  
  /**
   * 加载PyVista渗流数据并创建可视化
   */
  async loadSeepageData(data: PyVistaSeepageData): Promise<void> {
    if (!this.device) {
      console.error('WebGPU device not initialized');
      return;
    }
    
    try {
      // 创建流场数据缓冲区
      await this.createFlowFieldBuffer(data);
      
      // 创建粒子系统
      if (this.config.flowField.particleTracing.enabled) {
        await this.createParticleSystem(data);
      }
      
      // 创建流线可视化
      if (this.config.flowField.streamlines.enabled) {
        await this.createStreamlineVisualization(data);
      }
      
      // 创建矢量场可视化
      if (this.config.flowField.vectorField.enabled) {
        await this.createVectorFieldVisualization(data);
      }
      
      // 创建等速线
      if (this.config.flowField.isovelocity.enabled) {
        await this.createIsovelocityContours(data);
      }
      
      // 开始动画循环
      this.startAnimation();
      
      console.log('Seepage data loaded and visualization created');
      
    } catch (error) {
      console.error('Failed to load seepage data:', error);
    }
  }
  
  /**
   * 创建流场数据缓冲区
   */
  private async createFlowFieldBuffer(data: PyVistaSeepageData): Promise<void> {
    if (!this.device) return;
    
    const vertexCount = data.meshData.vertices.length / 3;
    const flowFieldData = new Float32Array(vertexCount * 8); // position(3) + velocity(3) + pressure(1) + gradient(1)
    
    // 填充流场数据
    for (let i = 0; i < vertexCount; i++) {
      const baseIdx = i * 8;
      const vertexIdx = i * 3;
      
      // 位置
      flowFieldData[baseIdx + 0] = data.meshData.vertices[vertexIdx + 0];
      flowFieldData[baseIdx + 1] = data.meshData.vertices[vertexIdx + 1];
      flowFieldData[baseIdx + 2] = data.meshData.vertices[vertexIdx + 2];
      
      // 速度
      flowFieldData[baseIdx + 3] = data.seepageFields.velocity.vectors[vertexIdx + 0];
      flowFieldData[baseIdx + 4] = data.seepageFields.velocity.vectors[vertexIdx + 1];
      flowFieldData[baseIdx + 5] = data.seepageFields.velocity.vectors[vertexIdx + 2];
      
      // 压力和梯度
      flowFieldData[baseIdx + 6] = data.seepageFields.pressure.values[i];
      flowFieldData[baseIdx + 7] = data.seepageFields.hydraulicGradient.values[i];
    }
    
    // 创建缓冲区
    this.flowFieldBuffer = this.device.createBuffer({
      size: flowFieldData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    
    // 写入数据
    this.device.queue.writeBuffer(this.flowFieldBuffer, 0, flowFieldData);
  }
  
  /**
   * 创建GPU加速粒子系统
   */
  private async createParticleSystem(data: PyVistaSeepageData): Promise<void> {
    const particleCount = this.config.flowField.particleTracing.particleCount;
    
    // 初始化粒子数据
    const particleData = new Float32Array(particleCount * 11);
    const bounds = this.calculateBounds(data.meshData.vertices);
    
    for (let i = 0; i < particleCount; i++) {
      const baseIdx = i * 11;
      
      // 随机初始位置
      particleData[baseIdx + 0] = bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x);
      particleData[baseIdx + 1] = bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y);
      particleData[baseIdx + 2] = bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z);
      
      // 初始速度 (0)
      particleData[baseIdx + 3] = 0;
      particleData[baseIdx + 4] = 0;
      particleData[baseIdx + 5] = 0;
      
      // 年龄和生命周期
      particleData[baseIdx + 6] = 0; // age
      particleData[baseIdx + 7] = this.config.flowField.particleTracing.particleLifetime;
      
      // 大小和颜色
      particleData[baseIdx + 8] = this.config.flowField.particleTracing.particleSize;
      particleData[baseIdx + 9] = Math.random(); // color.r
      particleData[baseIdx + 10] = Math.random(); // color.g
    }
    
    // 写入粒子数据
    if (this.particleBuffer) {
      this.device!.queue.writeBuffer(this.particleBuffer, 0, particleData);
    }
    
    // 创建Three.js粒子系统
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.8 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float opacity;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }
  
  /**
   * 创建流线可视化
   */
  private async createStreamlineVisualization(data: PyVistaSeepageData): Promise<void> {
    const streamlineCount = Math.floor(this.config.flowField.streamlines.density * 1000);
    const pointsPerLine = 100;
    
    // 生成流线起始点
    const bounds = this.calculateBounds(data.meshData.vertices);
    const streamlineStarts = new Float32Array(streamlineCount * pointsPerLine * 3);
    
    for (let i = 0; i < streamlineCount; i++) {
      const startIdx = i * pointsPerLine * 3;
      
      // 随机起始点
      streamlineStarts[startIdx + 0] = bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x);
      streamlineStarts[startIdx + 1] = bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y);
      streamlineStarts[startIdx + 2] = bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z);
    }
    
    // 写入流线缓冲区
    if (this.streamlineBuffer) {
      this.device!.queue.writeBuffer(this.streamlineBuffer, 0, streamlineStarts);
    }
    
    // 创建Three.js流线几何体
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(streamlineCount * pointsPerLine * 3);
    const colors = new Float32Array(streamlineCount * pointsPerLine * 3);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });
    
    this.streamlineMesh = new THREE.LineSegments(geometry, material);
    this.scene.add(this.streamlineMesh);
  }
  
  /**
   * 创建矢量场可视化
   */
  private async createVectorFieldVisualization(data: PyVistaSeepageData): Promise<void> {
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.5, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    
    const vertexCount = data.meshData.vertices.length / 3;
    const arrowCount = Math.floor(vertexCount * this.config.flowField.vectorField.arrowDensity);
    
    this.vectorFieldMesh = new THREE.InstancedMesh(arrowGeometry, arrowMaterial, arrowCount);
    
    // 设置箭头位置和方向
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    
    for (let i = 0; i < arrowCount; i++) {
      const vertexIdx = Math.floor(i * vertexCount / arrowCount) * 3;
      
      // 位置
      position.set(
        data.meshData.vertices[vertexIdx + 0],
        data.meshData.vertices[vertexIdx + 1],
        data.meshData.vertices[vertexIdx + 2]
      );
      
      // 方向 (根据速度矢量)
      const velocity = new THREE.Vector3(
        data.seepageFields.velocity.vectors[vertexIdx + 0],
        data.seepageFields.velocity.vectors[vertexIdx + 1],
        data.seepageFields.velocity.vectors[vertexIdx + 2]
      );
      
      const up = new THREE.Vector3(0, 1, 0);
      quaternion.setFromUnitVectors(up, velocity.normalize());
      
      // 缩放 (根据速度大小)
      const speed = data.seepageFields.velocity.magnitude[vertexIdx / 3];
      const arrowScale = this.config.flowField.vectorField.arrowScale * 
                        Math.min(speed / data.seepageFields.velocity.range[1], 1.0);
      scale.setScalar(arrowScale);
      
      matrix.compose(position, quaternion, scale);
      this.vectorFieldMesh.setMatrixAt(i, matrix);
    }
    
    this.vectorFieldMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.vectorFieldMesh);
  }
  
  /**
   * 创建等速线轮廓
   */
  private async createIsovelocityContours(data: PyVistaSeepageData): Promise<void> {
    // 使用等值线算法生成速度等值线
    // 这里简化实现，实际需要更复杂的等值线算法
    const levels = this.config.flowField.isovelocity.levels;
    
    for (const level of levels) {
      const contourGeometry = this.generateContourGeometry(data, level);
      const contourMaterial = new THREE.LineBasicMaterial({
        color: this.getColorForVelocity(level, data.seepageFields.velocity.range),
        linewidth: 2
      });
      
      const contourMesh = new THREE.LineSegments(contourGeometry, contourMaterial);
      this.scene.add(contourMesh);
    }
  }
  
  /**
   * 开始动画循环
   */
  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      const currentTime = Date.now();
      const deltaTime = (currentTime - this.lastUpdateTime) / 1000.0;
      this.lastUpdateTime = currentTime;
      
      this.updateVisualization(deltaTime);
    };
    
    this.lastUpdateTime = Date.now();
    animate();
  }
  
  /**
   * 更新可视化
   */
  private updateVisualization(deltaTime: number): void {
    if (!this.device || !this.computePipeline) return;
    
    const elapsedTime = (Date.now() - this.startTime) / 1000.0;
    
    // 更新uniform缓冲区
    const uniformData = new Float32Array([
      elapsedTime,                                              // time
      deltaTime,                                                // deltaTime
      this.config.flowField.particleTracing.particleCount,     // particleCount
      10.0,                                                     // maxVelocity
      0.01,                                                     // integrationStep
      this.config.flowField.particleTracing.gravity ? 1.0 : 0.0, // gravityStrength
      this.config.flowField.particleTracing.turbulence,        // turbulenceStrength
      0.01                                                      // fadeRate
    ]);
    
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, uniformData);
    
    // 执行计算着色器
    const commandEncoder = this.device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    
    computePass.setPipeline(this.computePipeline);
    // 这里需要设置绑定组，简化示例中省略
    
    const workgroupCount = Math.ceil(this.config.flowField.particleTracing.particleCount / 256);
    computePass.dispatchWorkgroups(workgroupCount);
    
    computePass.end();
    this.device.queue.submit([commandEncoder.finish()]);
    
    // 更新Three.js渲染对象
    this.updateThreeJSObjects();
  }
  
  /**
   * 更新Three.js渲染对象
   */
  private updateThreeJSObjects(): void {
    // 更新粒子系统材质的时间uniform
    if (this.particleSystem?.material && 'uniforms' in this.particleSystem.material) {
      (this.particleSystem.material as THREE.ShaderMaterial).uniforms.time.value = 
        (Date.now() - this.startTime) / 1000.0;
    }
  }
  
  /**
   * 计算网格边界
   */
  private calculateBounds(vertices: Float32Array): { min: THREE.Vector3; max: THREE.Vector3 } {
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    
    for (let i = 0; i < vertices.length; i += 3) {
      min.x = Math.min(min.x, vertices[i]);
      min.y = Math.min(min.y, vertices[i + 1]);
      min.z = Math.min(min.z, vertices[i + 2]);
      
      max.x = Math.max(max.x, vertices[i]);
      max.y = Math.max(max.y, vertices[i + 1]);
      max.z = Math.max(max.z, vertices[i + 2]);
    }
    
    return { min, max };
  }
  
  /**
   * 生成等值线几何体
   */
  private generateContourGeometry(data: PyVistaSeepageData, level: number): THREE.BufferGeometry {
    // 简化的等值线生成算法
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    // 遍历所有三角形，查找与等值线相交的边
    const vertices = data.meshData.vertices;
    const cells = data.meshData.cells;
    const values = data.seepageFields.velocity.magnitude;
    
    for (let i = 0; i < cells.length; i += 3) {
      const v1 = cells[i];
      const v2 = cells[i + 1];
      const v3 = cells[i + 2];
      
      const val1 = values[v1];
      const val2 = values[v2];
      const val3 = values[v3];
      
      // 检查等值线是否通过这个三角形
      const intersections: THREE.Vector3[] = [];
      
      if ((val1 <= level && val2 >= level) || (val1 >= level && val2 <= level)) {
        const t = (level - val1) / (val2 - val1);
        const pos = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(vertices[v1*3], vertices[v1*3+1], vertices[v1*3+2]),
          new THREE.Vector3(vertices[v2*3], vertices[v2*3+1], vertices[v2*3+2]),
          t
        );
        intersections.push(pos);
      }
      
      if ((val2 <= level && val3 >= level) || (val2 >= level && val3 <= level)) {
        const t = (level - val2) / (val3 - val2);
        const pos = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(vertices[v2*3], vertices[v2*3+1], vertices[v2*3+2]),
          new THREE.Vector3(vertices[v3*3], vertices[v3*3+1], vertices[v3*3+2]),
          t
        );
        intersections.push(pos);
      }
      
      if ((val3 <= level && val1 >= level) || (val3 >= level && val1 <= level)) {
        const t = (level - val3) / (val1 - val3);
        const pos = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(vertices[v3*3], vertices[v3*3+1], vertices[v3*3+2]),
          new THREE.Vector3(vertices[v1*3], vertices[v1*3+1], vertices[v1*3+2]),
          t
        );
        intersections.push(pos);
      }
      
      // 如果有两个交点，添加线段
      if (intersections.length === 2) {
        positions.push(
          intersections[0].x, intersections[0].y, intersections[0].z,
          intersections[1].x, intersections[1].y, intersections[1].z
        );
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }
  
  /**
   * 根据速度获取颜色
   */
  private getColorForVelocity(velocity: number, range: [number, number]): number {
    const normalized = (velocity - range[0]) / (range[1] - range[0]);
    
    // 彩虹色映射
    if (normalized < 0.25) {
      return 0x0000ff; // 蓝色
    } else if (normalized < 0.5) {
      return 0x00ffff; // 青色
    } else if (normalized < 0.75) {
      return 0x00ff00; // 绿色
    } else {
      return 0xff0000; // 红色
    }
  }
  
  /**
   * 停止动画并清理资源
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // 清理GPU缓冲区
    this.uniformBuffer?.destroy();
    this.flowFieldBuffer?.destroy();
    this.particleBuffer?.destroy();
    this.streamlineBuffer?.destroy();
    
    // 清理Three.js对象
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
    }
    
    if (this.streamlineMesh) {
      this.scene.remove(this.streamlineMesh);
      this.streamlineMesh.geometry.dispose();
      (this.streamlineMesh.material as THREE.Material).dispose();
    }
    
    if (this.vectorFieldMesh) {
      this.scene.remove(this.vectorFieldMesh);
      this.vectorFieldMesh.geometry.dispose();
      (this.vectorFieldMesh.material as THREE.Material).dispose();
    }
  }
  
  /**
   * 更新可视化配置
   */
  updateConfig(newConfig: Partial<FlowFieldVisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 根据配置更新重新创建相关组件
    // 实际实现中需要更细粒度的更新逻辑
  }
  
  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): GPUPerformanceMetrics | null {
    // 返回GPU性能统计
    return {
      frameTime: 16.67, // 简化示例
      gpuMemoryUsage: 0,
      computeTime: 0,
      renderTime: 0
    };
  }
}

/**
 * 创建流场可视化WebGPU系统
 */
export function createFlowFieldVisualizationGPU(
  scene: THREE.Scene, 
  config: FlowFieldVisualizationConfig
): FlowFieldVisualizationGPU {
  return new FlowFieldVisualizationGPU(scene, config);
}

/**
 * 默认流场可视化配置
 */
export const defaultFlowVisualizationConfig: FlowFieldVisualizationConfig = {
  webgpu: {
    workgroupSize: [256, 1, 1],
    maxComputeInvocations: 65536,
    enableAsyncCompute: true,
    computeShaderOptimization: 'speed',
    maxBufferSize: 512
  },
  
  flowField: {
    streamlines: {
      enabled: true,
      density: 0.5,
      maxLength: 50.0,
      integrationStep: 0.1,
      animationSpeed: 1.0,
      fadeEffect: true,
      colorByVelocity: true
    },
    
    vectorField: {
      enabled: true,
      arrowDensity: 0.1,
      arrowScale: 1.0,
      arrowShape: 'arrow',
      dynamicScaling: true,
      velocityThreshold: 0.001
    },
    
    particleTracing: {
      enabled: true,
      particleCount: 10000,
      particleLifetime: 10.0,
      particleSize: 0.1,
      emissionRate: 100.0,
      gravity: false,
      turbulence: 0.1
    },
    
    isovelocity: {
      enabled: true,
      levels: [0.001, 0.005, 0.01, 0.05, 0.1],
      contourSmoothing: 0.5,
      fillContours: false,
      labelContours: true
    }
  },
  
  seepage: {
    pipingRisk: {
      enabled: true,
      criticalGradient: 1.0,
      riskZoneHighlight: true,
      warningThreshold: 0.7,
      dangerThreshold: 0.9
    },
    
    confinedAquifer: {
      enabled: true,
      pressureVisualization: true,
      drawdownCones: true,
      wellInfluence: true
    },
    
    groundwaterLevel: {
      enabled: true,
      animateWaterTable: true,
      seasonalVariation: false,
      precipitationEffect: false
    }
  },
  
  visualEffects: {
    fluidEffects: {
      enableFluidShading: true,
      refractionEffect: false,
      transparencyLayers: true,
      foamGeneration: false
    },
    
    animation: {
      enableTimeAnimation: true,
      flowPulsation: false,
      velocityWaves: true,
      particleSparkle: true
    },
    
    interaction: {
      enableHover: true,
      clickForDetails: true,
      enableCrossSections: true,
      measurementTools: true
    }
  },
  
  performance: {
    levelOfDetail: {
      enabled: true,
      lodDistances: [10, 50, 200],
      particleLOD: true,
      streamlineLOD: true
    },
    
    culling: {
      frustumCulling: true,
      occlusionCulling: false,
      velocityCulling: true,
      cullThreshold: 0.0001
    },
    
    gpu: {
      enableBatching: true,
      maxDrawCalls: 1000,
      bufferOptimization: true,
      memoryManagement: 'automatic'
    }
  }
};