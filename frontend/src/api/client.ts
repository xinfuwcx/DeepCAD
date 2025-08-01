/**
 * HTTP客户端配置
 * 基于axios的API请求客户端
 */
import axios from 'axios';

// API基础URL配置
const API_BASE_URL = 'http://localhost:8083/api';

/**
 * 创建axios实例
 * 预配置请求头和基础URL
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL, // 后端API地址
  headers: {
    'Content-Type': 'application/json', // 默认JSON格式
  },
  timeout: 10000, // 请求超时时间10秒
});

/**
 * 请求拦截器
 * 在发送请求前添加通用配置
 */
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器
 * 统一处理响应数据和错误
 */
apiClient.interceptors.response.use(
  (response) => response.data, // 直接返回数据部分
  (error) => {
    // 统一错误处理
    console.error('API请求失败:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);