/**
 * 格式化日期时间
 * @param date 日期对象或时间戳
 * @param format 格式化模式
 * @returns 格式化后的日期字符串
 */
export const formatDateTime = (
  date: Date | string | number,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const year = d.getFullYear().toString();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('深度克隆对象失败:', error);
    return obj;
  }
};

/**
 * 防抖函数
 * @param func 要执行的函数
 * @param wait 等待时间(ms)
 * @returns 防抖处理后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeout: number | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
};

/**
 * 节流函数
 * @param func 要执行的函数
 * @param limit 时间限制(ms)
 * @returns 节流处理后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number = 300
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * 将对象转换为查询字符串
 * @param params 参数对象
 * @returns 查询字符串
 */
export const objectToQueryString = (params: Record<string, any>): string => {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        return value
          .map(item => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
};

/**
 * 解析查询字符串为对象
 * @param queryString 查询字符串
 * @returns 解析后的对象
 */
export const queryStringToObject = (queryString: string): Record<string, string> => {
  const params: Record<string, string> = {};
  
  if (!queryString || queryString === '') {
    return params;
  }
  
  const query = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  
  query.split('&').forEach(item => {
    const [key, value] = item.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  });
  
  return params;
};

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 文件扩展名
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

/**
 * 检查文件类型是否有效
 * @param file 文件对象
 * @param allowedTypes 允许的文件类型数组
 * @returns 是否有效
 */
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  const extension = getFileExtension(file.name).toLowerCase();
  return allowedTypes.includes(extension);
};

/**
 * 检查文件大小是否有效
 * @param file 文件对象
 * @param maxSizeInBytes 最大文件大小(字节)
 * @returns 是否有效
 */
export const isValidFileSize = (file: File, maxSizeInBytes: number): boolean => {
  return file.size <= maxSizeInBytes;
};

/**
 * 将颜色从RGB转换为十六进制
 * @param r 红色分量(0-255)
 * @param g 绿色分量(0-255)
 * @param b 蓝色分量(0-255)
 * @returns 十六进制颜色字符串
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
};

/**
 * 将十六进制颜色转换为RGB
 * @param hex 十六进制颜色字符串
 * @returns RGB颜色对象
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * 随机生成颜色
 * @returns 十六进制颜色字符串
 */
export const generateRandomColor = (): string => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
};

/**
 * 计算两点之间的距离
 * @param x1 第一个点的x坐标
 * @param y1 第一个点的y坐标
 * @param x2 第二个点的x坐标
 * @param y2 第二个点的y坐标
 * @returns 两点之间的距离
 */
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * 计算多边形面积
 * @param points 多边形顶点数组
 * @returns 多边形面积
 */
export const calculatePolygonArea = (points: Array<{ x: number; y: number }>): number => {
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
};

/**
 * 将数值四舍五入到指定小数位
 * @param value 数值
 * @param decimals 小数位数
 * @returns 四舍五入后的数值
 */
export const roundToDecimals = (value: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * 检查对象是否为空
 * @param obj 对象
 * @returns 是否为空
 */
export const isEmptyObject = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0;
};

/**
 * 格式化数字
 * @param number 数字
 * @param decimals 小数位数
 * @param thousandsSeparator 千位分隔符
 * @param decimalSeparator 小数点分隔符
 * @returns 格式化后的数字字符串
 */
export const formatNumber = (
  number: number,
  decimals: number = 2,
  thousandsSeparator: string = ',',
  decimalSeparator: string = '.'
): string => {
  const fixed = number.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');
  
  const formattedIntegerPart = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    thousandsSeparator
  );
  
  return decimalPart
    ? formattedIntegerPart + decimalSeparator + decimalPart
    : formattedIntegerPart;
};

export default {
  formatDateTime,
  formatFileSize,
  generateUniqueId,
  deepClone,
  debounce,
  throttle,
  objectToQueryString,
  queryStringToObject,
  getFileExtension,
  isValidFileType,
  isValidFileSize,
  rgbToHex,
  hexToRgb,
  generateRandomColor,
  calculateDistance,
  calculatePolygonArea,
  roundToDecimals,
  isEmptyObject,
  formatNumber
}; 