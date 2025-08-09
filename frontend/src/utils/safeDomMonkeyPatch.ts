/**
 * Global DOM removal instrumentation and safety shim.
 * Prevents hard crashes from NotFoundError and logs diagnostic info
 * so we can trace the offending caller making invalid removeChild calls.
 */

// Avoid double patch under HMR
if (!(window as any).__DEEPCAD_REMOVECHILD_PATCHED__) {
  (window as any).__DEEPCAD_REMOVECHILD_PATCHED__ = true;

  interface RemovalLogEntry {
    time: string;
    parentTag?: string;
    childTag?: string;
    parentId?: string;
    childId?: string;
    parentClasses?: string;
    childClasses?: string;
    stack?: string;
    reason: 'not-a-child' | 'exception';
  }

  const diag: { events: RemovalLogEntry[]; uniqueKeys: Set<string>; max: number } = {
    events: [],
    uniqueKeys: new Set(),
    max: 200
  };
  (window as any).__DEEPCAD_DOM_PATCH_DIAG = diag;

  const recordEvent = (entry: RemovalLogEntry) => {
    const key = `${entry.reason}|${entry.parentTag}|${entry.childTag}|${entry.parentId}|${entry.childId}`;
    if (diag.uniqueKeys.has(key)) return; // dedupe
    diag.uniqueKeys.add(key);
    if (diag.events.length >= diag.max) diag.events.shift();
    diag.events.push(entry);
  };

  const safeDescribe = (n: any) => {
    try {
      if (!n) return undefined;
      if (n.nodeType === 3) return '#text';
      return (n as HTMLElement).tagName;
    } catch { return undefined; }
  };

  const originalRemoveChild = Node.prototype.removeChild;
  const originalElementRemove: any = (Element.prototype as any).remove;

  function patchedRemoveChild<T extends Node>(this: Node, child: T): T {
    if (child && child.parentNode !== this) {
      const entry: RemovalLogEntry = {
        time: new Date().toISOString(),
        parentTag: safeDescribe(this),
        childTag: safeDescribe(child),
        parentId: (this as any).id,
        childId: (child as any).id,
        parentClasses: (this instanceof HTMLElement) ? this.className : undefined,
        childClasses: (child instanceof HTMLElement) ? child.className : undefined,
        stack: new Error().stack,
        reason: 'not-a-child'
      };
      recordEvent(entry);
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[SafeRemoveChild] Skip removal – not a child', entry);
      }
  return child; // no-op (type T preserved)
    }
    try {
  return originalRemoveChild.call(this, child as any) as any as T;
    } catch (err) {
      const entry: RemovalLogEntry = {
        time: new Date().toISOString(),
        parentTag: safeDescribe(this),
        childTag: safeDescribe(child),
        parentId: (this as any).id,
        childId: (child as any).id,
        parentClasses: (this instanceof HTMLElement) ? this.className : undefined,
        childClasses: (child instanceof HTMLElement) ? child.className : undefined,
        stack: (err as any)?.stack || new Error().stack,
        reason: 'exception'
      };
      recordEvent(entry);
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[SafeRemoveChild] Exception swallowed', err, entry);
      }
    return child;
    }
  }

  // Cast to any to satisfy TypeScript structural typing w/out overriding lib.dom.d.ts definition issues
  (Node.prototype as any).removeChild = patchedRemoveChild;

  if (originalElementRemove) {
    (Element.prototype as any).remove = function patchedElementRemove(this: Element) {
      if (this.parentNode) {
        try { this.parentNode.removeChild(this); } catch {/* handled */}
      } else {
        const entry: RemovalLogEntry = {
          time: new Date().toISOString(),
          childTag: safeDescribe(this),
          childId: (this as any).id,
          childClasses: (this as HTMLElement).className,
          reason: 'not-a-child',
          stack: new Error().stack
        };
        recordEvent(entry);
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[SafeRemoveChild] Orphan element.remove() skipped', entry);
        }
      }
    };
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[SafeRemoveChild] Instrumentation active');
  }
}

export {}; // mark as module
