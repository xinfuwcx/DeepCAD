/**
 * domRemovalGuard: 轻量级全局 DOM removeChild 防护层
 * 仅开发期使用：拦截非法 removeChild，记录一次堆栈并吞掉 NotFoundError，避免 React 提交阶段报错中断。
 */
if (!(window as any).__DEEPCAD_DOM_GUARD__) {
  (window as any).__DEEPCAD_DOM_GUARD__ = true;
  const original = Node.prototype.removeChild;
  const seen = new Set<string>();
  function guardedRemoveChild<T extends Node>(this: Node, child: T): T {
    if (child && child.parentNode !== this) {
      const parentName = (this as any).nodeName || 'UNKNOWN_PARENT';
      const childName = (child as any).nodeName || 'UNKNOWN_CHILD';
      const key = `${parentName}>${childName}`;
      if (!seen.has(key)) {
        seen.add(key);
  if ((import.meta as any).env?.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[domRemovalGuard] Skip invalid removeChild', {
            parent: parentName,
            child: childName,
            stack: new Error().stack?.split('\n').slice(1, 6).join('\n')
          });
        }
      }
      return child;
    }
    try {
      return original.call(this, child as any) as any as T;
    } catch (err: any) {
      if (err && err.name === 'NotFoundError') {
        const parentName = (this as any).nodeName || 'UNKNOWN_PARENT';
        const childName = (child as any).nodeName || 'UNKNOWN_CHILD';
        const key = `EX-${parentName}>${childName}`;
        if (!seen.has(key)) {
          seen.add(key);
          if ((import.meta as any).env?.DEV) {
            // eslint-disable-next-line no-console
            console.warn('[domRemovalGuard] Caught NotFoundError (swallowed)', key);
          }
        }
        return child;
      }
      throw err;
    }
  }
  (Node.prototype as any).removeChild = guardedRemoveChild;
  if ((import.meta as any).env?.DEV) {
    // eslint-disable-next-line no-console
    console.log('[domRemovalGuard] active');
  }
}
export {};
/**
 * domRemovalGuard: 轻量级全局 DOM removeChild 防护层
 * 目的：开发阶段先阻止重复/越权 removeChild 引发的 NotFoundError 直接抛出，
 *      记录一次性诊断信息，后续再精准清理源头组件中的手动 DOM 移除。
 * 行为：
 *  - 拦截 Node.prototype.removeChild
 *  - 若 child.parentNode !== this 则记录并静默返回（不抛错）
 *  - 仅在开发环境输出一次性告警（同签名不重复刷屏）
 */
if (!(window as any).__DEEPCAD_DOM_GUARD__) {
  (window as any).__DEEPCAD_DOM_GUARD__ = true;
  const original = Node.prototype.removeChild;
  const seen = new Set<string>();
  function guardedRemoveChild<T extends Node>(this: Node, child: T): T {
    if (child && child.parentNode !== this) {
      const parentName = (this as any).nodeName || 'UNKNOWN_PARENT';
      const childName = (child as any).nodeName || 'UNKNOWN_CHILD';
      const key = `${parentName}>${childName}`;
      if (!seen.has(key)) {
        seen.add(key);
          if ((import.meta as any).env?.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[domRemovalGuard] Skip invalid removeChild', {
            parent: parentName,
            child: childName,
            stack: new Error().stack?.split('\n').slice(1, 6).join('\n')
          });
        }
      }
      return child; // 静默忽略
    }
    try {
      return original.call(this, child as any) as any as T;
    } catch (err: any) {
      if (err && err.name === 'NotFoundError') {
        const parentName = (this as any).nodeName || 'UNKNOWN_PARENT';
        const childName = (child as any).nodeName || 'UNKNOWN_CHILD';
        const key = `EX-${parentName}>${childName}`;
        if (!seen.has(key)) {
          seen.add(key);
            if ((import.meta as any).env?.DEV) {
            // eslint-disable-next-line no-console
            console.warn('[domRemovalGuard] Caught NotFoundError (swallowed)', key);
          }
        }
        return child;
      }
      throw err;
    }
  }
  (Node.prototype as any).removeChild = guardedRemoveChild;
  if ((import.meta as any).env?.DEV) {
    // eslint-disable-next-line no-console
    console.log('[domRemovalGuard] active');
  }
}

export {}; // 保持为模块
