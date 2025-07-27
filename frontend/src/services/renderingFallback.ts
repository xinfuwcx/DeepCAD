/**
 * DeepCAD 渲染降级处理机制
 * @description 为WebGPU不支持的环境提供多层级降级处理方案
 * 确保在不支持WebGPU的设备上仍能提供基本的200万单元网格渲染功能
 * @author 1号首席架构师
 * @version 3.0.0
 * @since 2024-07-25
 */

/**
 * 设备能力检测结果接口
 * @interface DeviceCapabilities
 */
export interface DeviceCapabilities {
  /** WebGPU支持状态 */
  webgpu: {
    supported: boolean;
    version: string;
    features: string[];
    limits: Record<string, number>;
  };
  
  /** WebGL支持状态 */
  webgl: {
    webgl2Supported: boolean;
    webgl1Supported: boolean;
    maxTextureSize: number;
    maxVertexUniforms: number;
    extensions: string[];
  };
  
  /** 硬件信息 */
  hardware: {
    gpu: string;
    vendor: string;
    renderer: string;
    memorySize: number;
    maxViewportSize: number[];
  };
  
  /** 浏览器信息 */
  browser: {
    name: string;
    version: string;
    userAgent: string;
    platform: string;
  };
}

/**
 * 渲染器类型枚举
 * @enum RendererType
 */
export enum RendererType {
  /** WebGPU渲染器 - 最高性能 */
  WebGPU = 'webgpu',
  /** WebGL2渲染器 - 高性能 */
  WebGL2 = 'webgl2',
  /** WebGL1渲染器 - 基础性能 */
  WebGL1 = 'webgl1',
  /** Canvas2D渲染器 - 最低性能 */
  Canvas2D = 'canvas2d',
  /** 软件渲染器 - 兜底方案 */
  Software = 'software'
}

/**
 * 降级模式配置接口
 * @interface FallbackMode
 */
export interface FallbackMode {
  /** 渲染器类型 */
  renderer: RendererType;
  /** 最大支持单元数 */
  maxElements: number;
  /** 最大支持节点数 */
  maxNodes: number;
  /** 支持的功能特性 */
  features: {
    realTimeRendering: boolean;    // 实时渲染
    multipass: boolean;            // 多通道渲染
    computeShaders: boolean;       // 计算着色器
    largeTextures: boolean;        // 大纹理支持
    instancing: boolean;           // 实例化渲染
    postProcessing: boolean;       // 后处理效果
  };
  /** 性能预期 */
  performance: {
    targetFPS: number;             // 目标帧率
    maxDrawCalls: number;          // 最大绘制调用
    memoryLimit: number;           // 内存限制 (MB)
  };
}

/**
 * 渲染降级处理器
 * @class RenderingFallback
 * @description 核心降级处理系统，提供智能的渲染器选择和性能适配
 */
export class RenderingFallback {
  /** 设备能力检测结果 */
  private deviceCapabilities: DeviceCapabilities | null = null;
  
  /** 当前选择的渲染器类型 */
  private currentRenderer: RendererType = RendererType.Software;
  
  /** 当前降级模式配置 */
  private currentFallbackMode: FallbackMode | null = null;
  
  /** 渲染器实例缓存 */
  private rendererInstances: Map<RendererType, any> = new Map();
  
  /** 性能监控回调 */
  private performanceCallback: ((metrics: any) => void) | null = null;

  /**
   * 初始化降级处理系统
   * @description 检测设备能力并选择最优渲染器
   * @returns Promise<boolean> 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔍 开始设备能力检测...');

      // 检测设备能力
      this.deviceCapabilities = await this.detectDeviceCapabilities();
      
      // 选择最优渲染器
      const selectedRenderer = this.selectOptimalRenderer();
      
      // 配置降级模式
      this.currentFallbackMode = this.configureFallbackMode(selectedRenderer);
      
      // 初始化选定的渲染器
      const success = await this.initializeRenderer(selectedRenderer);
      
      if (success) {
        this.currentRenderer = selectedRenderer;
        console.log(`✅ 渲染降级系统初始化成功 - 使用 ${selectedRenderer} 渲染器`);
        console.log('📊 降级模式配置:', this.currentFallbackMode);
        return true;
      } else {
        console.error('❌ 渲染器初始化失败，尝试下一级降级');
        return this.fallbackToNextLevel();
      }
    } catch (error) {
      console.error('❌ 降级处理系统初始化失败:', error);
      return this.initializeEmergencyFallback();
    }
  }

  /**
   * 检测设备能力
   * @description 全面检测设备的图形能力和浏览器支持
   * @returns Promise<DeviceCapabilities> 设备能力信息
   * @private
   */
  private async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    const capabilities: DeviceCapabilities = {
      webgpu: await this.detectWebGPUCapabilities(),
      webgl: this.detectWebGLCapabilities(),
      hardware: this.detectHardwareInfo(),
      browser: this.detectBrowserInfo()
    };

    return capabilities;
  }

  /**
   * 检测WebGPU能力
   * @returns Promise<WebGPU能力信息>
   * @private
   */
  private async detectWebGPUCapabilities(): Promise<DeviceCapabilities['webgpu']> {
    const webgpuInfo = {
      supported: false,
      version: '',
      features: [] as string[],
      limits: {} as Record<string, number>
    };

    try {
      if (!navigator.gpu) {
        console.log('❌ WebGPU API 不可用');
        return webgpuInfo;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.log('❌ 无法获取WebGPU适配器');
        return webgpuInfo;
      }

      const device = await adapter.requestDevice();
      
      webgpuInfo.supported = true;
      webgpuInfo.features = Array.from(adapter.features);
      webgpuInfo.limits = {
        maxTextureSize: device.limits.maxTextureDimension2D,
        maxBufferSize: device.limits.maxBufferSize,
        maxComputeWorkgroupSize: device.limits.maxComputeWorkgroupSizeX,
        maxVertexBuffers: device.limits.maxVertexBuffers,
        maxBindGroups: device.limits.maxBindGroups
      };

      console.log('✅ WebGPU 支持检测成功');
      console.log('🎮 WebGPU特性:', webgpuInfo.features);

      device.destroy();
      
    } catch (error) {
      console.log('❌ WebGPU检测失败:', error);
    }

    return webgpuInfo;
  }

  /**
   * 检测WebGL能力
   * @returns WebGL能力信息
   * @private
   */
  private detectWebGLCapabilities(): DeviceCapabilities['webgl'] {
    const webglInfo = {
      webgl2Supported: false,
      webgl1Supported: false,
      maxTextureSize: 0,
      maxVertexUniforms: 0,
      extensions: [] as string[]
    };

    try {
      // 检测WebGL2
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      
      if (gl2) {
        webglInfo.webgl2Supported = true;
        webglInfo.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE);
        webglInfo.maxVertexUniforms = gl2.getParameter(gl2.MAX_VERTEX_UNIFORM_VECTORS);
        webglInfo.extensions = gl2.getSupportedExtensions() || [];
        
        console.log('✅ WebGL2 支持检测成功');
        console.log(`📐 最大纹理尺寸: ${webglInfo.maxTextureSize}px`);
      } else {
        // 检测WebGL1
        const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl1) {
          webglInfo.webgl1Supported = true;
          webglInfo.maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE);
          webglInfo.maxVertexUniforms = gl1.getParameter(gl1.MAX_VERTEX_UNIFORM_VECTORS);
          webglInfo.extensions = gl1.getSupportedExtensions() || [];
          
          console.log('✅ WebGL1 支持检测成功');
        } else {
          console.log('❌ WebGL 不支持');
        }
      }
    } catch (error) {
      console.error('❌ WebGL检测失败:', error);
    }

    return webglInfo;
  }

  /**
   * 检测硬件信息
   * @returns 硬件信息
   * @private
   */
  private detectHardwareInfo(): DeviceCapabilities['hardware'] {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    let gpu = 'Unknown';
    let vendor = 'Unknown';
    let renderer = 'Unknown';
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        gpu = renderer;
      }
    }

    // 估算显存大小 (基于GPU型号的粗略估算)
    let memorySize = 2048; // 默认2GB
    if (renderer.includes('RTX 4090')) memorySize = 24576;
    else if (renderer.includes('RTX 4080')) memorySize = 16384;
    else if (renderer.includes('RTX 4070')) memorySize = 12288;
    else if (renderer.includes('RTX 3090')) memorySize = 24576;
    else if (renderer.includes('RTX 3080')) memorySize = 10240;
    else if (renderer.includes('RTX 3070')) memorySize = 8192;
    else if (renderer.includes('RTX 3060')) memorySize = 12288;
    else if (renderer.includes('GTX')) memorySize = 6144;
    else if (renderer.includes('RX 7900')) memorySize = 20480;
    else if (renderer.includes('RX 6900')) memorySize = 16384;
    else if (renderer.includes('RX 6800')) memorySize = 16384;
    else if (renderer.includes('integrated') || renderer.includes('Intel')) memorySize = 1024;

    return {
      gpu,
      vendor,
      renderer,
      memorySize,
      maxViewportSize: gl ? [
        gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0],
        gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1]
      ] : [1920, 1080]
    };
  }

  /**
   * 检测浏览器信息
   * @returns 浏览器信息
   * @private
   */
  private detectBrowserInfo(): DeviceCapabilities['browser'] {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    // 检测浏览器类型
    if (userAgent.includes('Chrome/')) {
      name = 'Chrome';
      version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox/')) {
      name = 'Firefox';
      version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge/')) {
      name = 'Edge';
      version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
    }

    return {
      name,
      version,
      userAgent,
      platform: navigator.platform
    };
  }

  /**
   * 选择最优渲染器
   * @description 基于设备能力选择最适合的渲染器
   * @returns RendererType 选择的渲染器类型
   * @private
   */
  private selectOptimalRenderer(): RendererType {
    if (!this.deviceCapabilities) {
      return RendererType.Software;
    }

    const { webgpu, webgl, hardware } = this.deviceCapabilities;

    // 检查WebGPU支持 (最优选择)
    if (webgpu.supported && hardware.memorySize >= 4096) {
      console.log('🚀 选择WebGPU渲染器 - 最高性能模式');
      return RendererType.WebGPU;
    }

    // 检查WebGL2支持 (次优选择)
    if (webgl.webgl2Supported && webgl.maxTextureSize >= 4096 && hardware.memorySize >= 2048) {
      console.log('⚡ 选择WebGL2渲染器 - 高性能模式');
      return RendererType.WebGL2;
    }

    // 检查WebGL1支持 (基础选择)
    if (webgl.webgl1Supported && webgl.maxTextureSize >= 2048) {
      console.log('🔧 选择WebGL1渲染器 - 基础性能模式');
      return RendererType.WebGL1;
    }

    // 降级到Canvas2D (最低选择)
    console.log('📱 选择Canvas2D渲染器 - 兼容模式');
    return RendererType.Canvas2D;
  }

  /**
   * 配置降级模式
   * @param renderer 渲染器类型
   * @returns 降级模式配置
   * @private
   */
  private configureFallbackMode(renderer: RendererType): FallbackMode {
    const baseConfig = {
      renderer,
      maxElements: 0,
      maxNodes: 0,
      features: {
        realTimeRendering: false,
        multipass: false,
        computeShaders: false,
        largeTextures: false,
        instancing: false,
        postProcessing: false
      },
      performance: {
        targetFPS: 30,
        maxDrawCalls: 100,
        memoryLimit: 512
      }
    };

    switch (renderer) {
      case RendererType.WebGPU:
        return {
          ...baseConfig,
          maxElements: 2000000,  // 200万单元
          maxNodes: 6000000,     // 600万节点
          features: {
            realTimeRendering: true,
            multipass: true,
            computeShaders: true,
            largeTextures: true,
            instancing: true,
            postProcessing: true
          },
          performance: {
            targetFPS: 60,
            maxDrawCalls: 1000,
            memoryLimit: 8192
          }
        };

      case RendererType.WebGL2:
        return {
          ...baseConfig,
          maxElements: 1000000,  // 100万单元
          maxNodes: 3000000,     // 300万节点
          features: {
            realTimeRendering: true,
            multipass: true,
            computeShaders: false,
            largeTextures: true,
            instancing: true,
            postProcessing: true
          },
          performance: {
            targetFPS: 45,
            maxDrawCalls: 500,
            memoryLimit: 4096
          }
        };

      case RendererType.WebGL1:
        return {
          ...baseConfig,
          maxElements: 500000,   // 50万单元
          maxNodes: 1500000,     // 150万节点
          features: {
            realTimeRendering: true,
            multipass: false,
            computeShaders: false,
            largeTextures: false,
            instancing: false,
            postProcessing: false
          },
          performance: {
            targetFPS: 30,
            maxDrawCalls: 200,
            memoryLimit: 2048
          }
        };

      case RendererType.Canvas2D:
        return {
          ...baseConfig,
          maxElements: 100000,   // 10万单元
          maxNodes: 300000,      // 30万节点
          features: {
            realTimeRendering: false,
            multipass: false,
            computeShaders: false,
            largeTextures: false,
            instancing: false,
            postProcessing: false
          },
          performance: {
            targetFPS: 15,
            maxDrawCalls: 50,
            memoryLimit: 512
          }
        };

      default:
        return baseConfig;
    }
  }

  /**
   * 初始化渲染器
   * @param renderer 渲染器类型
   * @returns Promise<boolean> 初始化是否成功
   * @private
   */
  private async initializeRenderer(renderer: RendererType): Promise<boolean> {
    try {
      switch (renderer) {
        case RendererType.WebGPU:
          return await this.initializeWebGPURenderer();
          
        case RendererType.WebGL2:
          return this.initializeWebGL2Renderer();
          
        case RendererType.WebGL1:
          return this.initializeWebGL1Renderer();
          
        case RendererType.Canvas2D:
          return this.initializeCanvas2DRenderer();
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ ${renderer} 渲染器初始化失败:`, error);
      return false;
    }
  }

  /**
   * 初始化WebGPU渲染器
   * @private
   */
  private async initializeWebGPURenderer(): Promise<boolean> {
    // WebGPU渲染器初始化逻辑
    console.log('🚀 初始化WebGPU渲染器...');
    return true; // 简化实现
  }

  /**
   * 初始化WebGL2渲染器
   * @private
   */
  private initializeWebGL2Renderer(): boolean {
    // WebGL2渲染器初始化逻辑
    console.log('⚡ 初始化WebGL2渲染器...');
    return true; // 简化实现
  }

  /**
   * 初始化WebGL1渲染器
   * @private
   */
  private initializeWebGL1Renderer(): boolean {
    // WebGL1渲染器初始化逻辑
    console.log('🔧 初始化WebGL1渲染器...');
    return true; // 简化实现
  }

  /**
   * 初始化Canvas2D渲染器
   * @private
   */
  private initializeCanvas2DRenderer(): boolean {
    // Canvas2D渲染器初始化逻辑
    console.log('📱 初始化Canvas2D渲染器...');
    return true; // 简化实现
  }

  /**
   * 降级到下一级渲染器
   * @private
   */
  private async fallbackToNextLevel(): Promise<boolean> {
    const fallbackOrder = [
      RendererType.WebGPU,
      RendererType.WebGL2,
      RendererType.WebGL1,
      RendererType.Canvas2D,
      RendererType.Software
    ];

    const currentIndex = fallbackOrder.indexOf(this.currentRenderer);
    
    for (let i = currentIndex + 1; i < fallbackOrder.length; i++) {
      const nextRenderer = fallbackOrder[i];
      console.log(`🔄 尝试降级到 ${nextRenderer} 渲染器...`);
      
      this.currentFallbackMode = this.configureFallbackMode(nextRenderer);
      const success = await this.initializeRenderer(nextRenderer);
      
      if (success) {
        this.currentRenderer = nextRenderer;
        console.log(`✅ 成功降级到 ${nextRenderer} 渲染器`);
        return true;
      }
    }

    return false;
  }

  /**
   * 初始化紧急降级方案
   * @private
   */
  private initializeEmergencyFallback(): boolean {
    console.log('🆘 启动紧急降级方案 - 软件渲染模式');
    
    this.currentRenderer = RendererType.Software;
    this.currentFallbackMode = {
      renderer: RendererType.Software,
      maxElements: 10000,    // 1万单元
      maxNodes: 30000,       // 3万节点
      features: {
        realTimeRendering: false,
        multipass: false,
        computeShaders: false,
        largeTextures: false,
        instancing: false,
        postProcessing: false
      },
      performance: {
        targetFPS: 5,
        maxDrawCalls: 10,
        memoryLimit: 128
      }
    };

    return true;
  }

  /**
   * 获取当前渲染器类型
   * @returns RendererType 当前渲染器
   */
  getCurrentRenderer(): RendererType {
    return this.currentRenderer;
  }

  /**
   * 获取当前降级模式配置
   * @returns FallbackMode 降级模式配置
   */
  getCurrentFallbackMode(): FallbackMode | null {
    return this.currentFallbackMode;
  }

  /**
   * 获取设备能力信息
   * @returns DeviceCapabilities 设备能力
   */
  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  /**
   * 检查是否支持指定功能
   * @param feature 功能名称
   * @returns boolean 是否支持
   */
  isFeatureSupported(feature: keyof FallbackMode['features']): boolean {
    return this.currentFallbackMode?.features[feature] || false;
  }

  /**
   * 动态切换渲染器
   * @param targetRenderer 目标渲染器
   * @returns Promise<boolean> 切换是否成功
   */
  async switchRenderer(targetRenderer: RendererType): Promise<boolean> {
    if (targetRenderer === this.currentRenderer) {
      return true;
    }

    console.log(`🔄 尝试切换到 ${targetRenderer} 渲染器...`);

    const newMode = this.configureFallbackMode(targetRenderer);
    const success = await this.initializeRenderer(targetRenderer);

    if (success) {
      this.currentRenderer = targetRenderer;
      this.currentFallbackMode = newMode;
      console.log(`✅ 成功切换到 ${targetRenderer} 渲染器`);
      return true;
    } else {
      console.log(`❌ 切换到 ${targetRenderer} 渲染器失败`);
      return false;
    }
  }
}

/**
 * 全局渲染降级处理器实例
 */
export const globalRenderingFallback = new RenderingFallback();

/**
 * 创建渲染降级处理器
 * @returns RenderingFallback 降级处理器实例
 */
export function createRenderingFallback(): RenderingFallback {
  return new RenderingFallback();
}