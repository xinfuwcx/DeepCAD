import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { userStorage } from '../../utils/storage';
import { useAlert } from '../common/AlertProvider';
import { User } from '../../models/types';

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUserProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件Props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 认证提供者组件
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { showSuccess, showError, showLoading, hideLoading } = useAlert();

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 检查本地存储中是否有token
        const token = userStorage.getToken();
        
        if (token) {
          // 如果有token，获取用户信息
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        // 如果获取用户信息失败，清除token和用户信息
        userStorage.clearUserStorage();
        console.error('获取用户信息失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // 登录
  const login = async (username: string, password: string, remember: boolean = true) => {
    try {
      showLoading('登录中...');
      const { token, user } = await authApi.login({ username, password });
      
      // 保存token和用户信息
      userStorage.saveToken(token, remember);
      userStorage.saveUserInfo(user, remember);
      
      // 更新状态
      setUser(user);
      
      hideLoading();
      showSuccess('登录成功');
      
      // 跳转到主页
      navigate('/dashboard');
    } catch (error) {
      hideLoading();
      showError('登录失败: ' + (error instanceof Error ? error.message : '未知错误'));
      throw error;
    }
  };

  // 注册
  const register = async (userData: any) => {
    try {
      showLoading('注册中...');
      const { token, user } = await authApi.register(userData);
      
      // 保存token和用户信息
      userStorage.saveToken(token);
      userStorage.saveUserInfo(user);
      
      // 更新状态
      setUser(user);
      
      hideLoading();
      showSuccess('注册成功');
      
      // 跳转到主页
      navigate('/dashboard');
    } catch (error) {
      hideLoading();
      showError('注册失败: ' + (error instanceof Error ? error.message : '未知错误'));
      throw error;
    }
  };

  // 退出登录
  const logout = () => {
    try {
      // 调用退出登录API
      authApi.logout().catch(console.error);
      
      // 清除本地存储
      userStorage.clearUserStorage();
      
      // 更新状态
      setUser(null);
      
      showSuccess('已退出登录');
      
      // 跳转到登录页
      navigate('/login');
    } catch (error) {
      showError('退出登录失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 更新用户资料
  const updateUserProfile = async (userData: Partial<User>) => {
    try {
      showLoading('更新中...');
      const updatedUser = await authApi.updateUserProfile(userData);
      
      // 更新本地存储的用户信息
      const currentUser = userStorage.getUserInfo<User>();
      if (currentUser) {
        userStorage.saveUserInfo({ ...currentUser, ...updatedUser });
      }
      
      // 更新状态
      setUser(prev => prev ? { ...prev, ...updatedUser } : null);
      
      hideLoading();
      showSuccess('个人资料已更新');
    } catch (error) {
      hideLoading();
      showError('更新个人资料失败: ' + (error instanceof Error ? error.message : '未知错误'));
      throw error;
    }
  };

  // 修改密码
  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      showLoading('修改密码中...');
      await authApi.changePassword({ oldPassword, newPassword });
      
      hideLoading();
      showSuccess('密码已修改');
    } catch (error) {
      hideLoading();
      showError('修改密码失败: ' + (error instanceof Error ? error.message : '未知错误'));
      throw error;
    }
  };

  // 认证上下文值
  const authContextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUserProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 使用认证钩子
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthProvider; 