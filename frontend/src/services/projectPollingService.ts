import { ProjectItem, saveProjects } from './projectService';

/**
 * projectPollingService
 * 模拟后台增量轮询: 定期随机微调项目进度 / 风险
 * 后续可替换为真实 fetch(diffSince=timestamp) 逻辑。
 */
export interface PollingOptions {
  intervalMs?: number;
  jitterRatio?: number; // 触发进度微调概率
  onUpdate?: (items: ProjectItem[]) => void;
}

let timer: any = null;

export function startProjectPolling(source: () => Promise<ProjectItem[]>, opts: PollingOptions = {}) {
  const interval = opts.intervalMs ?? 15000;
  const jitterRatio = opts.jitterRatio ?? 0.3;
  stopProjectPolling();
  const loop = async () => {
    try {
      const items = await source();
      let changed = false;
      const next = items.map(it => {
        if (Math.random() < jitterRatio && (it.status === 'active' || it.status === 'planning')) {
          const delta = Math.random() * 3; // 0-3% 微调
          const newProgress = Math.min(100, Math.max(0, (it.progress ?? 0) + delta));
          if (newProgress !== it.progress) {
            changed = true;
            return { ...it, progress: newProgress };
          }
        }
        return it;
      });
      if (changed) {
        saveProjects(next); // 写回缓存 (模拟后端更新持久化)
        opts.onUpdate?.(next);
      }
    } catch (e) {
      // swallow errors
    } finally {
      timer = setTimeout(loop, interval);
    }
  };
  timer = setTimeout(loop, interval);
}

export function stopProjectPolling() {
  if (timer) { clearTimeout(timer); timer = null; }
}
