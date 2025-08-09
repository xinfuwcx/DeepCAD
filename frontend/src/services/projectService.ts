import Papa from 'papaparse';

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'risk' | 'paused';

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  location?: string;
  latitude: number;
  longitude: number;
  status: ProjectStatus;
  progress?: number; // 0-100
  manager?: string;
  startDate?: string;
  endDate?: string;
  depth?: number; // m
  area?: number;  // m^2
  tags?: string[];
  thumbnail?: string;
}

const LS_KEY = 'pm-projects-v1';
const WEATHER_CACHE_KEY = 'pm-weather-cache-v1';

export async function getProjects(): Promise<ProjectItem[]> {
  // 1) LocalStorage 优先
  const fromLS = localStorage.getItem(LS_KEY);
  if (fromLS) {
    try {
      const data = JSON.parse(fromLS) as ProjectItem[];
      if (Array.isArray(data) && data.length) return data;
    } catch {}
  }
  // 2) 内置 demo 兜底（使用动态导入，避免路径问题）
  const demo = (await import('../data/projects.demo.json')).default as ProjectItem[];
  return demo;
}

export function saveProjects(items: ProjectItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export async function importCSV(file: File): Promise<ProjectItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const rows = result.data as any[];
          const items: ProjectItem[] = rows.map((r, idx) => normalizeRow(r, idx));
          resolve(items.filter(Boolean) as ProjectItem[]);
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err)
    });
  });
}

function normalizeRow(r: any, idx: number): ProjectItem | null {
  // 兼容多种列名
  const lat = pickNumber(r, ['lat', 'latitude', '纬度']);
  const lng = pickNumber(r, ['lng', 'lon', 'longitude', '经度']);
  const name = pickString(r, ['name', '项目名称', '工程名称']);
  if (!name || lat == null || lng == null) return null;
  const status = (pickString(r, ['status', '状态']) || 'planning') as ProjectStatus;
  return {
    id: r.id || `CSV_${Date.now()}_${idx}`,
    name,
    description: pickString(r, ['description', '描述']),
    location: pickString(r, ['location', '地址', '行政区']),
    latitude: lat,
    longitude: lng,
    status,
    progress: pickNumber(r, ['progress', '进度']) || 0,
    manager: pickString(r, ['manager', '负责人']),
    startDate: pickString(r, ['startDate', '开始时间']),
    endDate: pickString(r, ['endDate', '结束时间']),
    depth: pickNumber(r, ['depth', '深度']),
    area: pickNumber(r, ['area', '面积']),
    tags: pickArray(r, ['tags', '标签']),
    thumbnail: pickString(r, ['thumbnail', '缩略图'])
  };
}

function pickString(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
}
function pickNumber(obj: any, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    const n = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : NaN);
    if (!Number.isNaN(n)) return n;
  }
}
function pickArray(obj: any, keys: string[]): string[] | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.includes(',')) return v.split(',').map(s => s.trim()).filter(Boolean);
  }
}

// 天气缓存（后续在 PR4 使用）
export interface WeatherCacheEntry {
  t: number; // timestamp ms
  data: any;
}
export function getWeatherCache(key: string): any | null {
  try {
    const all = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
    return all[key] || null;
  } catch {
    return null;
  }
}
export function setWeatherCache(key: string, data: any) {
  try {
    const all = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
    all[key] = data;
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(all));
  } catch {}
}

