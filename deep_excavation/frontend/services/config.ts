/**
 * 前端服务配置文件
 */

// API基础URL，根据环境变量或默认值设置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 服务URLs
export const SERVICE_URLS = {
  GEOMETRY_SERVICE: `${API_BASE_URL}/geometry`,
  MESH_SERVICE: `${API_BASE_URL}/mesh`,
  ANALYSIS_SERVICE: `${API_BASE_URL}/analysis`,
  PROJECT_SERVICE: `${API_BASE_URL}/project`,
  FILE_SERVICE: `${API_BASE_URL}/file`,
  VISUALIZATION_SERVICE: `${API_BASE_URL}/visualization`
};

// 认证配置
export const AUTH_CONFIG = {
  TOKEN_KEY: 'auth_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  TOKEN_EXPIRY_KEY: 'token_expiry'
};

// 默认请求超时时间（毫秒）
export const DEFAULT_TIMEOUT = 30000;

// 重试配置
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RETRY_STATUS_CODES: [408, 500, 502, 503, 504]
};

// 文件上传配置
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_EXTENSIONS: ['.dxf', '.csv', '.json', '.vtk', '.mdpa', '.msh', '.xdmf']
};

// 渲染配置
export const RENDER_CONFIG = {
  DEFAULT_QUALITY: 'medium',
  QUALITY_SETTINGS: {
    low: {
      maxPoints: 100000,
      maxTriangles: 50000
    },
    medium: {
      maxPoints: 500000,
      maxTriangles: 250000
    },
    high: {
      maxPoints: 2000000,
      maxTriangles: 1000000
    }
  }
}; 