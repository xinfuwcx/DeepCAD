// 简易全局事件总线 / 命令系统（支持中间件 & 命令日志）
export type EventHandler<T=any> = (payload: T) => void;
export type Middleware = (event: string, payload: any, next: () => void) => void;

export interface CommandLogEntry {
  ts: number;          // 时间戳
  event: string;       // 事件名称 ('command' / 'command:xxx')
  payload: any;        // 事件载荷
}

class EventBus {
  private handlers: Record<string, Set<EventHandler>> = {};
  private middlewares: Middleware[] = [];
  private commandLogs: CommandLogEntry[] = [];
  private maxLogs = 300;

  use(mw: Middleware) { this.middlewares.push(mw); }

  on(event: string, handler: EventHandler) {
    if (!this.handlers[event]) this.handlers[event] = new Set();
    this.handlers[event].add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) { this.handlers[event]?.delete(handler); }

  emit<T=any>(event: string, payload: T) {
    let idx = -1;
    const chainNext = () => {
      idx++;
      if (idx < this.middlewares.length) {
        try { this.middlewares[idx](event, payload, chainNext); } catch (e) { console.error('[EventBus] middleware error', e); chainNext(); }
      } else {
        this.handlers[event]?.forEach(h => { try { h(payload); } catch (e) { console.error('[EventBus] handler error', e); } });
      }
    };
    chainNext();
    if (event.startsWith('command')) {
      this.commandLogs.push({ ts: Date.now(), event, payload });
      if (this.commandLogs.length > this.maxLogs) {
        this.commandLogs.splice(0, this.commandLogs.length - this.maxLogs);
      }
    }
  }

  getLogs(): CommandLogEntry[] { return [...this.commandLogs].reverse(); }
  clearLogs() { this.commandLogs = []; }
}

export const eventBus = new EventBus();

// 命令封装
export interface CommandPayload { [k:string]: any; }
export function dispatchCommand(command: string, payload: CommandPayload = {}) {
  eventBus.emit('command', { command, ...payload });
  eventBus.emit(`command:${command}`, payload);
}

// 默认日志中间件（可关闭）
if (!(window as any).__EVENT_BUS_LOGGER__) {
  eventBus.use((evt, payload, next) => {
    if ((window as any).__EVENT_BUS_LOGGER__ && evt === 'command') {
      console.debug('[CMD]', (payload as any).command, payload);
    }
    next();
  });
  (window as any).__EVENT_BUS_LOGGER__ = true;
}

export function enableCommandLogging(enable: boolean) { (window as any).__EVENT_BUS_LOGGER__ = enable; }
export function getCommandLogs() { return eventBus.getLogs(); }
export function clearCommandLogs() { eventBus.clearLogs(); }
