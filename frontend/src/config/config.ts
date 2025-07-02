/**
 * 应用配置文件
 * 
 * 支持不同环境的配置项
 */

// 通用配置
const commonConfig = {
  // API相关
  api: {
    baseUrl: '/api',
    timeout: 30000,
  },
  
  // 应用版本
  appVersion: '0.1.0',
  
  // chili3d相关配置
  chili3d: {
    useCache: true,
    maxModelSize: 500 * 1024 * 1024, // 500MB
    defaultQuality: 'medium',
  },
  
  // 分析设置
  analysis: {
    autoMesh: true,
    defaultMeshSize: 'medium',
    maxIterations: 1000,
  },
};

// 获取环境变量(忽略TypeScript类型检查)
const isDevelopment = (process as any).env.NODE_ENV === 'development' || true;
const useMockApi = (process as any).env.VITE_USE_MOCK_API === 'true' || false;

// 开发环境配置
const devConfig = {
  debug: true,
  logLevel: 'debug',
  useMockApi: useMockApi,
};

// 生产环境配置
const prodConfig = {
  debug: false,
  logLevel: 'error',
  useMockApi: false,
};

// 导出最终配置
const config = {
  ...commonConfig,
  ...(isDevelopment ? devConfig : prodConfig),
};

/**
 * 获取API基础URL
 * @returns API基础URL
 */
export const getApiBaseUrl = (): string => {
  return config.api.baseUrl;
};

export default config; 