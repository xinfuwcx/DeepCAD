/**
 * 应用程序全局配置
 */

// API配置
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.deepexcavation.com/api/v1' 
    : 'http://localhost:8000/api/v1',
  TIMEOUT: 30000, // 请求超时时间(ms)
};

// 本地存储键
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  THEME_SETTING: 'theme_setting',
  LANGUAGE: 'language',
};

// 主题配置
export const THEME_CONFIG = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// 语言配置
export const LANGUAGE_CONFIG = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
};

// 文件类型配置
export const FILE_TYPES = {
  MESH: ['msh', 'vtk', 'mesh'],
  MODEL: ['json', 'xml', 'model'],
  RESULT: ['csv', 'dat', 'result'],
  PROJECT: ['zip', 'project'],
};

// 文件大小限制(bytes)
export const FILE_SIZE_LIMITS = {
  MESH: 100 * 1024 * 1024, // 100MB
  MODEL: 50 * 1024 * 1024, // 50MB
  RESULT: 200 * 1024 * 1024, // 200MB
  PROJECT: 500 * 1024 * 1024, // 500MB
};

// 应用程序路由配置
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:id',
  EXCAVATION_ANALYSIS: '/excavation-analysis/:projectId',
  TUNNEL_MODELING: '/tunnel-modeling/:projectId',
  FOUNDATION_ANALYSIS: '/foundation-analysis/:projectId',
  MESHING: '/meshing/:projectId',
  COMPUTATION: '/computation/:projectId',
  RESULTS: '/results/:projectId',
  DATA_MANAGEMENT: '/data-management',
  SETTINGS: '/settings',
  HELP: '/help',
};

// 默认分页设置
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
};

// 系统常量
export const CONSTANTS = {
  APP_NAME: '深基坑CAE系统',
  APP_VERSION: '1.0.0',
  COPYRIGHT: `© ${new Date().getFullYear()} 深基坑CAE系统`,
  SUPPORT_EMAIL: 'support@deepexcavation.com',
};

export default {
  API_CONFIG,
  STORAGE_KEYS,
  THEME_CONFIG,
  LANGUAGE_CONFIG,
  FILE_TYPES,
  FILE_SIZE_LIMITS,
  ROUTES,
  PAGINATION_CONFIG,
  CONSTANTS,
}; 