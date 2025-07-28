/**
 * 全局类型定义
 * 0号架构师 - 系统级类型定义统一管理
 */

declare global {
  // 全局工具类型
  type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };

  type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

  type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
  }[keyof T];

  type OptionalKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
  }[keyof T];

  // 环境变量类型
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_WS_URL: string;
    readonly VITE_BUILD_TIME: string;
    readonly VITE_BUILD_VERSION: string;
    readonly VITE_DEBUG_MODE: string;
    readonly VITE_GPU_ENABLED: string;
    readonly VITE_WEBGPU_ENABLED: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  // 扩展Window接口
  interface Window {
    __DEV__: boolean;
    __DEEPCAD_VERSION__: string;
    __BUILD_TIME__: string;
    webkitRequestIdleCallback?: (callback: IdleRequestCallback) => number;
    mozRequestIdleCallback?: (callback: IdleRequestCallback) => number;
    msRequestIdleCallback?: (callback: IdleRequestCallback) => number;
    webkitCancelIdleCallback?: (id: number) => void;
    mozCancelIdleCallback?: (id: number) => void;
    msCancelIdleCallback?: (id: number) => void;
  }

  // 性能监控相关类型
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    webkitMemory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  // 文件系统相关类型
  interface File {
    webkitRelativePath?: string;
  }

  interface FileReader {
    error: DOMException | null;
  }

  // 自定义错误类型
  interface CAEError extends Error {
    code: string;
    category: 'validation' | 'computation' | 'rendering' | 'network' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
    context?: Record<string, any>;
  }

  // 事件类型扩展
  interface CustomEventMap {
    'cae:error': CustomEvent<CAEError>;
    'cae:progress': CustomEvent<{ percentage: number; message: string }>;
    'cae:complete': CustomEvent<{ result: any; duration: number }>;
    'gpu:ready': CustomEvent<{ device: GPUDevice }>;
    'gpu:error': CustomEvent<{ error: Error }>;
  }

  interface WindowEventMap extends CustomEventMap {}

  // 开发工具类型
  namespace DevTools {
    interface ComponentInfo {
      name: string;
      props: Record<string, any>;
      state?: Record<string, any>;
      renderTime: number;
      mountTime: number;
    }

    interface PerformanceMetrics {
      fps: number;
      frameTime: number;
      memoryUsage: number;
      cpuUsage: number;
      renderCalls: number;
      triangles: number;
    }

    interface DebugContext {
      mode: 'development' | 'production' | 'testing';
      enableLogs: boolean;
      enableProfiler: boolean;
      enableDebugOverlay: boolean;
    }
  }

  // 系统集成类型
  namespace SystemIntegration {
    interface ExpertModule {
      id: string;
      name: string;
      version: string;
      status: 'loading' | 'ready' | 'error';
      capabilities: string[];
      dependencies: string[];
    }

    interface ModuleRegistry {
      register(module: ExpertModule): void;
      unregister(moduleId: string): void;
      get(moduleId: string): ExpertModule | undefined;
      list(): ExpertModule[];
    }

    interface EventBus {
      emit<T = any>(event: string, data: T): void;
      on<T = any>(event: string, handler: (data: T) => void): void;
      off(event: string, handler?: Function): void;
      once<T = any>(event: string, handler: (data: T) => void): void;
    }
  }

  // 数据流类型
  namespace DataFlow {
    interface StreamData<T = any> {
      id: string;
      type: string;
      timestamp: number;
      source: string;
      target: string;
      payload: T;
      metadata?: Record<string, any>;
    }

    interface DataProcessor<TInput = any, TOutput = any> {
      id: string;
      name: string;
      process(input: TInput): Promise<TOutput>;
      validate(input: TInput): boolean;
    }

    interface Pipeline {
      id: string;
      name: string;
      processors: DataProcessor[];
      execute(input: any): Promise<any>;
    }
  }

  // 配置类型
  namespace Config {
    interface AppConfig {
      api: {
        baseURL: string;
        timeout: number;
        retryAttempts: number;
      };
      ui: {
        theme: 'dark' | 'light';
        language: 'zh-CN' | 'en-US';
        animations: boolean;
      };
      performance: {
        enableGPU: boolean;
        maxMemoryUsage: number;
        targetFPS: number;
      };
      development: {
        debugMode: boolean;
        enableHotReload: boolean;
        showPerformanceOverlay: boolean;
      };
    }

    interface FeatureFlags {
      enableWebGPU: boolean;
      enableExperimentalFeatures: boolean;
      enableBetaModules: boolean;
      enableAdvancedVisuals: boolean;
    }
  }

  // 计算相关类型
  namespace Computation {
    interface ComputeJob {
      id: string;
      type: 'mesh' | 'analysis' | 'optimization' | 'visualization';
      status: 'pending' | 'running' | 'completed' | 'failed';
      progress: number;
      startTime: number;
      endTime?: number;
      result?: any;
      error?: CAEError;
    }

    interface ComputeResource {
      id: string;
      type: 'cpu' | 'gpu' | 'webgpu';
      available: boolean;
      capabilities: string[];
      usage: number;
    }

    interface ComputeScheduler {
      submit(job: ComputeJob): Promise<string>;
      cancel(jobId: string): Promise<void>;
      getStatus(jobId: string): ComputeJob | undefined;
      listJobs(): ComputeJob[];
    }
  }

  // 渲染相关类型
  namespace Rendering {
    interface RenderContext {
      canvas: HTMLCanvasElement;
      renderer: any; // THREE.WebGLRenderer
      scene: any; // THREE.Scene
      camera: any; // THREE.Camera
      controls: any; // THREE.Controls
    }

    interface RenderPass {
      name: string;
      enabled: boolean;
      execute(context: RenderContext): void;
    }

    interface RenderPipeline {
      passes: RenderPass[];
      execute(context: RenderContext): void;
    }
  }

  // 存储相关类型
  namespace Storage {
    interface StorageAdapter {
      get<T = any>(key: string): Promise<T | null>;
      set<T = any>(key: string, value: T): Promise<void>;
      remove(key: string): Promise<void>;
      clear(): Promise<void>;
      keys(): Promise<string[]>;
    }

    interface CacheOptions {
      ttl?: number;
      maxSize?: number;
      strategy?: 'lru' | 'fifo' | 'lfu';
    }

    interface CacheManager {
      get<T = any>(key: string): Promise<T | null>;
      set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
      invalidate(key: string): Promise<void>;
      clear(): Promise<void>;
      stats(): Promise<{ hits: number; misses: number; size: number }>;
    }
  }
}

// Mock函数类型定义（用于测试）
declare namespace MockTypes {
  interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mockImplementation(fn: T): MockFunction<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockResolvedValue(value: Awaited<ReturnType<T>>): MockFunction<T>;
    mockRejectedValue(error: any): MockFunction<T>;
    mockClear(): void;
    mockReset(): void;
    mockRestore(): void;
    calls: Parameters<T>[];
  }

  interface Vi {
    fn<T extends (...args: any[]) => any>(implementation?: T): MockFunction<T>;
    mock<T extends string>(moduleName: T, factory?: () => any): void;
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
    useFakeTimers(): void;
    useRealTimers(): void;
    advanceTimersByTime(ms: number): void;
    setSystemTime(time: number | Date): void;
  }
}

// React Hook类型扩展
declare namespace React {
  // 修复useCallback类型推断问题
  function useCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
  ): T;

  // 修复useMemo类型推断问题
  function useMemo<T>(factory: () => T, deps: React.DependencyList | undefined): T;

  // 修复useRef类型问题
  function useRef<T>(initialValue: T): React.MutableRefObject<T>;
  function useRef<T>(initialValue: T | null): React.RefObject<T>;
  function useRef<T = undefined>(): React.MutableRefObject<T | undefined>;

  // 修复useState类型问题
  function useState<S>(initialState: S | (() => S)): [S, React.Dispatch<React.SetStateAction<S>>];
  function useState<S = undefined>(): [S | undefined, React.Dispatch<React.SetStateAction<S | undefined>>];

  // 修复useEffect类型问题
  function useEffect(effect: React.EffectCallback, deps?: React.DependencyList): void;
  function useLayoutEffect(effect: React.EffectCallback, deps?: React.DependencyList): void;

  // 自定义Hook类型辅助
  type HookDependencyList = React.DependencyList;
  type HookCallback<T extends (...args: any[]) => any> = T;
  type HookState<T> = [T, React.Dispatch<React.SetStateAction<T>>];
  type HookRef<T> = React.MutableRefObject<T>;
  type HookEffect = React.EffectCallback;
}

// 导出全局变量类型
declare const vi: MockTypes.Vi;
declare const __DEV__: boolean;
declare const __VERSION__: string;
declare const __BUILD_TIME__: string;

export {};