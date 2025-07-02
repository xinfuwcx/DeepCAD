import axios from 'axios';

const API_URL = '/api/auth';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
}

/**
 * 用户登录
 */
export const login = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  try {
    // API使用表单数据格式
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await axios.post<AuthResponse>(
      `${API_URL}/token`,
      formData
    );
    
    // 存储令牌
    localStorage.setItem('token', response.data.access_token);
    
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw new Error('用户名或密码错误');
  }
};

/**
 * 用户注册
 */
export const register = async (userData: RegisterRequest): Promise<User> => {
  try {
    const response = await axios.post<User>(
      `${API_URL}/register`,
      userData
    );
    return response.data;
  } catch (error: any) {
    console.error('注册失败:', error);
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data.detail || '注册失败，请检查输入信息');
    }
    
    throw new Error('注册失败，请稍后重试');
  }
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return null;
    }
    
    const response = await axios.get<User>(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    logout(); // 如果获取失败，可能是令牌过期，清除本地存储
    return null;
  }
};

/**
 * 登出
 */
export const logout = (): void => {
  localStorage.removeItem('token');
};

/**
 * 设置请求拦截器，自动添加认证信息
 */
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 检查用户是否已认证
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

export default {
  login,
  register,
  getCurrentUser,
  logout,
  isAuthenticated
}; 