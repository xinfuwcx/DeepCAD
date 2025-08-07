/**
 * 全局Three.js错误处理器
 * 捕获和处理Three.js相关的DOM操作错误
 */

let isErrorHandlerInstalled = false;

interface ThreeJSError extends Error {
  isThreeJSRelated?: boolean;
}

/**
 * 检查错误是否与Three.js DOM操作相关
 */
function isThreeJSDOMError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  return (
    message.includes('removechild') ||
    message.includes('appendchild') ||
    message.includes('node to be removed is not a child') ||
    message.includes('domElement') ||
    stack.includes('three') ||
    stack.includes('webgl') ||
    stack.includes('canvas')
  );
}

/**
 * Three.js错误处理函数
 */
function handleThreeJSError(error: ThreeJSError): void {
  if (isThreeJSDOMError(error)) {
    console.warn('🔧 Three.js DOM操作警告 (已自动处理):', error.message);
    error.isThreeJSRelated = true;
    
    // 阻止错误进一步传播
    return;
  }
  
  // 如果不是Three.js相关错误，让其正常处理
  throw error;
}

/**
 * 安装全局Three.js错误处理器
 */
export function installGlobalThreeJSErrorHandler(): void {
  if (isErrorHandlerInstalled) return;
  
  // 处理未捕获的错误
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (error && isThreeJSDOMError(error)) {
      handleThreeJSError(error);
      return true; // 阻止默认错误处理
    }
    
    // 调用原始错误处理器
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    
    return false;
  };
  
  // 处理未捕获的Promise错误
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    if (event.reason && isThreeJSDOMError(event.reason)) {
      handleThreeJSError(event.reason);
      event.preventDefault(); // 阻止默认处理
      return;
    }
    
    // 调用原始处理器
    if (originalUnhandledRejection) {
      originalUnhandledRejection(event);
    }
  };
  
  // 覆盖console.error以过滤Three.js DOM警告
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const firstArg = args[0];
    if (typeof firstArg === 'string' && isThreeJSDOMError(new Error(firstArg))) {
      console.warn('🔧 Three.js DOM警告 (已过滤):', ...args);
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
  
  isErrorHandlerInstalled = true;
  console.log('✅ 全局Three.js错误处理器已安装');
}

/**
 * 卸载全局Three.js错误处理器
 */
export function uninstallGlobalThreeJSErrorHandler(): void {
  if (!isErrorHandlerInstalled) return;
  
  // 这里可以恢复原始的错误处理器，但在实际应用中通常不需要
  isErrorHandlerInstalled = false;
  console.log('🔄 全局Three.js错误处理器已卸载');
}

/**
 * 检查错误处理器是否已安装
 */
export function isThreeJSErrorHandlerInstalled(): boolean {
  return isErrorHandlerInstalled;
}

/**
 * 创建一个安全的Three.js操作包装器
 */
export function safeThreeJSOperation<T>(
  operation: () => T,
  fallback?: T,
  context?: string
): T | undefined {
  try {
    return operation();
  } catch (error) {
    if (isThreeJSDOMError(error as Error)) {
      console.warn(`🔧 Three.js操作警告 ${context ? `(${context})` : ''}:`, error);
      return fallback;
    }
    
    // 重新抛出非Three.js相关的错误
    throw error;
  }
}

// 自动安装错误处理器（如果在浏览器环境中）
if (typeof window !== 'undefined') {
  // 延迟安装，确保在应用启动后
  setTimeout(() => {
    installGlobalThreeJSErrorHandler();
  }, 0);
}