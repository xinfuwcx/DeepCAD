/**
 * safeDomDetach - 通用安全 DOM 元素卸载工具，避免 NotFoundError。
 */
export function safeDomDetach(element: HTMLElement | null | undefined) {
  if (!element) return;
  try {
    if (element.parentNode) {
      if (element.parentNode && element.parentNode.contains(element)) {
        element.parentNode.removeChild(element);
      }
    }
  } catch (e) {
    // 降级日志
    // eslint-disable-next-line no-console
    console.warn('safeDomDetach warning:', e);
  }
}
