import { STORAGE_KEYS } from '../config/appConfig';

/**
 * 本地存储工具
 */
class Storage {
  /**
   * 设置本地存储项
   * @param key 存储键
   * @param value 存储值
   * @param useSessionStorage 是否使用会话存储
   */
  set(key: string, value: any, useSessionStorage: boolean = false): void {
    try {
      const serializedValue = JSON.stringify(value);
      if (useSessionStorage) {
        sessionStorage.setItem(key, serializedValue);
      } else {
        localStorage.setItem(key, serializedValue);
      }
    } catch (error) {
      console.error('存储数据失败:', error);
    }
  }

  /**
   * 获取本地存储项
   * @param key 存储键
   * @param useSessionStorage 是否使用会话存储
   * @returns 存储值
   */
  get<T>(key: string, useSessionStorage: boolean = false): T | null {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('获取存储数据失败:', error);
      return null;
    }
  }

  /**
   * 移除本地存储项
   * @param key 存储键
   * @param useSessionStorage 是否使用会话存储
   */
  remove(key: string, useSessionStorage: boolean = false): void {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      storage.removeItem(key);
    } catch (error) {
      console.error('移除存储数据失败:', error);
    }
  }

  /**
   * 清除所有本地存储
   * @param useSessionStorage 是否使用会话存储
   */
  clear(useSessionStorage: boolean = false): void {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      storage.clear();
    } catch (error) {
      console.error('清除存储数据失败:', error);
    }
  }

  /**
   * 检查本地存储项是否存在
   * @param key 存储键
   * @param useSessionStorage 是否使用会话存储
   * @returns 是否存在
   */
  has(key: string, useSessionStorage: boolean = false): boolean {
    try {
      const storage = useSessionStorage ? sessionStorage : localStorage;
      return storage.getItem(key) !== null;
    } catch (error) {
      console.error('检查存储数据失败:', error);
      return false;
    }
  }
}

// 创建存储实例
const storage = new Storage();

/**
 * 用户相关存储
 */
export const userStorage = {
  /**
   * 保存认证令牌
   * @param token 认证令牌
   * @param remember 是否记住登录状态
   */
  saveToken(token: string, remember: boolean = true): void {
    storage.set(STORAGE_KEYS.AUTH_TOKEN, token, !remember);
  },

  /**
   * 获取认证令牌
   * @returns 认证令牌
   */
  getToken(): string | null {
    // 先尝试从localStorage获取
    let token = storage.get<string>(STORAGE_KEYS.AUTH_TOKEN, false);
    
    // 如果localStorage中没有，再尝试从sessionStorage获取
    if (!token) {
      token = storage.get<string>(STORAGE_KEYS.AUTH_TOKEN, true);
    }
    
    return token;
  },

  /**
   * 移除认证令牌
   */
  removeToken(): void {
    storage.remove(STORAGE_KEYS.AUTH_TOKEN, false);
    storage.remove(STORAGE_KEYS.AUTH_TOKEN, true);
  },

  /**
   * 保存用户信息
   * @param user 用户信息
   * @param remember 是否记住登录状态
   */
  saveUserInfo(user: any, remember: boolean = true): void {
    storage.set(STORAGE_KEYS.USER_INFO, user, !remember);
  },

  /**
   * 获取用户信息
   * @returns 用户信息
   */
  getUserInfo<T>(): T | null {
    // 先尝试从localStorage获取
    let userInfo = storage.get<T>(STORAGE_KEYS.USER_INFO, false);
    
    // 如果localStorage中没有，再尝试从sessionStorage获取
    if (!userInfo) {
      userInfo = storage.get<T>(STORAGE_KEYS.USER_INFO, true);
    }
    
    return userInfo;
  },

  /**
   * 移除用户信息
   */
  removeUserInfo(): void {
    storage.remove(STORAGE_KEYS.USER_INFO, false);
    storage.remove(STORAGE_KEYS.USER_INFO, true);
  },

  /**
   * 清除所有用户相关存储
   */
  clearUserStorage(): void {
    this.removeToken();
    this.removeUserInfo();
  },

  /**
   * 检查用户是否已登录
   * @returns 是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
};

/**
 * 应用程序设置存储
 */
export const settingsStorage = {
  /**
   * 保存主题设置
   * @param theme 主题
   */
  saveTheme(theme: string): void {
    storage.set(STORAGE_KEYS.THEME_SETTING, theme);
  },

  /**
   * 获取主题设置
   * @returns 主题
   */
  getTheme(): string | null {
    return storage.get<string>(STORAGE_KEYS.THEME_SETTING);
  },

  /**
   * 保存语言设置
   * @param language 语言
   */
  saveLanguage(language: string): void {
    storage.set(STORAGE_KEYS.LANGUAGE, language);
  },

  /**
   * 获取语言设置
   * @returns 语言
   */
  getLanguage(): string | null {
    return storage.get<string>(STORAGE_KEYS.LANGUAGE);
  }
};

/**
 * 项目相关存储
 */
export const projectStorage = {
  /**
   * 保存最近访问的项目ID
   * @param projectId 项目ID
   */
  saveRecentProject(projectId: number | string): void {
    const key = 'recent_project';
    storage.set(key, projectId);
  },

  /**
   * 获取最近访问的项目ID
   * @returns 项目ID
   */
  getRecentProject(): number | string | null {
    const key = 'recent_project';
    return storage.get<number | string>(key);
  },

  /**
   * 保存项目表单草稿
   * @param projectId 项目ID
   * @param formData 表单数据
   */
  saveProjectFormDraft(projectId: number | string, formData: any): void {
    const key = `project_form_${projectId}`;
    storage.set(key, formData);
  },

  /**
   * 获取项目表单草稿
   * @param projectId 项目ID
   * @returns 表单数据
   */
  getProjectFormDraft<T>(projectId: number | string): T | null {
    const key = `project_form_${projectId}`;
    return storage.get<T>(key);
  },

  /**
   * 移除项目表单草稿
   * @param projectId 项目ID
   */
  removeProjectFormDraft(projectId: number | string): void {
    const key = `project_form_${projectId}`;
    storage.remove(key);
  }
};

export default {
  storage,
  userStorage,
  settingsStorage,
  projectStorage
}; 