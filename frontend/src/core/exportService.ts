// exportService 提供统一导出逻辑
import { Command } from './commands';
import { eventBus } from './eventBus';

// 导出任务接口 & 队列
interface ResultExportTask {
  id: string;
  command: Command;
  createdAt: number;
  status: 'pending' | 'running' | 'success' | 'error';
  filename?: string;
  error?: string;
}

const queue: ResultExportTask[] = [];
let busy = false;

export interface ExportContext {
  hasResults: boolean;
  getResults: () => any;
}

export function enqueueExport(command: Command, ctx: ExportContext) {
  const task: ResultExportTask = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, command, createdAt: Date.now(), status: 'pending' };
  if (!ctx.hasResults) {
    task.status = 'error';
    task.error = 'No results';
    queue.push(task);
    return task.id;
  }
  queue.push(task);
  process(ctx);
  return task.id;
}

export function getExportTasks(): ResultExportTask[] { return [...queue].reverse(); }

async function process(ctx: ExportContext) {
  if (busy) return;
  busy = true;
  while (true) {
    const task = queue.find(t => t.status === 'pending');
    if (!task) break;
    task.status = 'running';
    try {
      const filename = await performSingleExport(task.command, ctx);
      task.status = 'success';
      task.filename = filename;
  eventBus.emit('export:done', { taskId: task.id, command: task.command, filename, success: true });
    } catch(e:any) {
      task.status = 'error';
      task.error = e?.message || String(e);
  eventBus.emit('export:done', { taskId: task.id, command: task.command, error: task.error, success: false });
    }
  }
  busy = false;
}

export async function performSingleExport(command: Command, ctx: ExportContext): Promise<string> {
  switch (command) {
    case Command.ResultsExportCSV: {
      const r = ctx.getResults() || {};
      const rows = ['key,value'];
      Object.entries(r).forEach(([k,v]) => rows.push(`${k},${JSON.stringify(v)}`));
      const blob = new Blob([rows.join('\n')], { type:'text/csv' });
      triggerDownload(blob,'results.csv');
      return 'results.csv';
    }
    case Command.ResultsExportJSON: {
      const r = ctx.getResults();
      const blob = new Blob([JSON.stringify(r,null,2)], { type:'application/json' });
      triggerDownload(blob,'results.json');
      return 'results.json';
    }
    case Command.ResultsExportVTK: {
      const vtkContent = '# vtk DataFile Version 3.0\nMock VTK Export\nASCII\nDATASET POLYDATA\n';
      const blob = new Blob([vtkContent], { type:'text/plain' });
      triggerDownload(blob,'results.vtk');
      return 'results.vtk';
    }
    case Command.ResultsExportPNG: {
      const canvas = document.createElement('canvas'); canvas.width=800; canvas.height=600;
      const ctx2 = canvas.getContext('2d');
      if (ctx2) {
        ctx2.fillStyle='#111'; ctx2.fillRect(0,0,800,600);
        ctx2.fillStyle='#0ff'; ctx2.font='16px monospace';
        ctx2.fillText('Mock Screenshot', 300, 300);
      }
      const file = await new Promise<string>(resolve => {
        canvas.toBlob(b=>{ if(!b) return resolve(''); triggerDownload(b,'screenshot.png'); resolve('screenshot.png'); });
      });
      return file;
    }
    default:
      throw new Error('Unknown export command');
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
}

// 兼容旧API (同步调用 -> 队列)
export function performExport(command: Command, ctx: ExportContext) { enqueueExport(command, ctx); }
