// 统一的地质建模请求分类颜色映射
export const GEO_REQ_CLASS_COLORS: Record<string,string> = {
  success: 'green',
  network: 'blue',
  server: 'orange',
  timeout: 'gold',
  throttle: 'purple',
  validation: 'cyan',
  auth: 'magenta',
  other: 'default',
  unknown: 'default'
};

export interface AttemptDetail {
  attempt: number;
  error?: string;
  status?: number;
  attemptAt?: number;      // Date.now()
  backoffMs?: number;      // 实际应用的退避时间（下一次等待）
}
