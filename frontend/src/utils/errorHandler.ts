import { AxiosError } from 'axios';

/**
 * 自定义错误类型
 */
export class AppError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/**
 * API错误类型
 */
export class ApiError extends AppError {
  status: number;
  
  constructor(message: string, status: number, code: string = 'API_ERROR', details?: any) {
    super(message, code, details);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * 验证错误类型
 */
export class ValidationError extends AppError {
  fieldErrors: Record<string, string>;
  
  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', fieldErrors);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * 处理Axios错误
 */
export const handleAxiosError = (error: AxiosError): AppError => {
  if (error.response) {
    // 服务器返回了错误响应
    const status = error.response.status;
    const data = error.response.data as any;
    
    // 处理验证错误
    if (status === 422 && data.errors) {
      return new ValidationError(
        data.message || '表单验证失败',
        data.errors
      );
    }
    
    // 处理其他API错误
    return new ApiError(
      data.message || error.message,
      status,
      data.code || `HTTP_${status}`,
      data.details
    );
  } else if (error.request) {
    // 请求已发出但没有收到响应
    return new AppError('网络错误，请检查您的网络连接', 'NETWORK_ERROR');
  } else {
    // 请求配置出错
    return new AppError(error.message, 'REQUEST_ERROR');
  }
};

/**
 * 处理表单验证错误
 */
export const handleFormValidation = (
  values: Record<string, any>,
  rules: Record<string, (value: any) => string | undefined>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  Object.keys(rules).forEach((field) => {
    const value = values[field];
    const error = rules[field](value);
    
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
};

/**
 * 通用验证规则
 */
export const validationRules = {
  required: (value: any): string | undefined => {
    if (value === undefined || value === null || value === '') {
      return '此字段为必填项';
    }
    return undefined;
  },
  
  email: (value: string): string | undefined => {
    if (!value) return undefined;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return '请输入有效的邮箱地址';
    }
    return undefined;
  },
  
  minLength: (min: number) => (value: string): string | undefined => {
    if (!value) return undefined;
    
    if (value.length < min) {
      return `长度不能少于${min}个字符`;
    }
    return undefined;
  },
  
  maxLength: (max: number) => (value: string): string | undefined => {
    if (!value) return undefined;
    
    if (value.length > max) {
      return `长度不能超过${max}个字符`;
    }
    return undefined;
  },
  
  numeric: (value: string): string | undefined => {
    if (!value) return undefined;
    
    if (!/^\d+$/.test(value)) {
      return '请输入数字';
    }
    return undefined;
  },
  
  decimal: (value: string): string | undefined => {
    if (!value) return undefined;
    
    if (!/^\d+(\.\d+)?$/.test(value)) {
      return '请输入有效的数字';
    }
    return undefined;
  },
  
  positiveNumber: (value: string | number): string | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num <= 0) {
      return '请输入正数';
    }
    return undefined;
  },
  
  nonNegativeNumber: (value: string | number): string | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < 0) {
      return '请输入非负数';
    }
    return undefined;
  },
  
  range: (min: number, max: number) => (value: string | number): string | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < min || num > max) {
      return `请输入${min}到${max}之间的数值`;
    }
    return undefined;
  },
  
  password: (value: string): string | undefined => {
    if (!value) return undefined;
    
    if (value.length < 8) {
      return '密码长度至少为8个字符';
    }
    
    if (!/[A-Z]/.test(value)) {
      return '密码必须包含至少一个大写字母';
    }
    
    if (!/[a-z]/.test(value)) {
      return '密码必须包含至少一个小写字母';
    }
    
    if (!/[0-9]/.test(value)) {
      return '密码必须包含至少一个数字';
    }
    
    return undefined;
  },
  
  passwordMatch: (password: string) => (confirmPassword: string): string | undefined => {
    if (!confirmPassword) return undefined;
    
    if (password !== confirmPassword) {
      return '两次输入的密码不一致';
    }
    return undefined;
  },
};

/**
 * 组合多个验证规则
 */
export const combineValidators = (...validators: ((value: any) => string | undefined)[]) => {
  return (value: any): string | undefined => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        return error;
      }
    }
    return undefined;
  };
};

/**
 * 记录错误到日志
 */
export const logError = (error: Error): void => {
  console.error('应用程序错误:', error);
  
  // 在实际应用中，这里可以集成错误监控服务，如Sentry
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error);
  // }
};

export default {
  AppError,
  ApiError,
  ValidationError,
  handleAxiosError,
  handleFormValidation,
  validationRules,
  combineValidators,
  logError
}; 