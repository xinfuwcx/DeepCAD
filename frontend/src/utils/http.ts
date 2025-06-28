import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, STORAGE_KEYS } from '../config/appConfig';

// 创建axios实例
const http = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
http.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 从localStorage获取token
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    
    // 如果存在token，则添加到请求头
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // 如果响应成功，直接返回数据
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      
      // 处理401错误(未授权)
      if (status === 401) {
        // 清除本地存储的token和用户信息
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_INFO);
        
        // 重定向到登录页面
        window.location.href = '/login';
      }
      
      // 处理403错误(禁止访问)
      if (status === 403) {
        console.error('没有权限访问该资源');
      }
      
      // 处理404错误(资源不存在)
      if (status === 404) {
        console.error('请求的资源不存在');
      }
      
      // 处理500错误(服务器错误)
      if (status >= 500) {
        console.error('服务器错误，请稍后重试');
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error('网络错误，请检查您的网络连接');
    } else {
      // 请求配置出错
      console.error('请求配置错误:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// 封装GET请求
export const get = <T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => {
  return http.get(url, { params, ...config });
};

// 封装POST请求
export const post = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return http.post(url, data, config);
};

// 封装PUT请求
export const put = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return http.put(url, data, config);
};

// 封装DELETE请求
export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return http.delete(url, config);
};

// 封装PATCH请求
export const patch = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return http.patch(url, data, config);
};

// 封装上传文件请求
export const upload = <T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> => {
  const formData = new FormData();
  formData.append('file', file);
  
  return http.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
};

// 封装下载文件请求
export const download = (url: string, filename: string, params?: any): void => {
  http
    .get(url, {
      params,
      responseType: 'blob',
    })
    .then((response: any) => {
      const blob = new Blob([response]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    })
    .catch((error) => {
      console.error('下载文件失败:', error);
    });
};

export default {
  get,
  post,
  put,
  del,
  patch,
  upload,
  download,
}; 