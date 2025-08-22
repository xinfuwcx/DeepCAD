import { create } from 'zustand';

interface VisualSettingsState {
  // 2.5D 平视倾斜视图（不启用建筑体）
  twoPointFiveD: boolean;
  // 新增：底图与布局
  basemap: 'road' | 'satellite';
  floatingUI: boolean;
  showEpicGlobe: boolean;
  showLegacyParticles: boolean;
  enablePostFX: boolean;
  showLayerDebugPanel: boolean;
  // 新增：主题与简约模式
  theme: 'dark' | 'minimal' | 'business';
  minimalMode: boolean;
  // 新增：是否显示 3D 柱状图
  showColumns: boolean;
  // 新增：是否显示 Hex 聚合热区
  showHex: boolean;
  // 新增：地图 HUD/特效
  showTechGrid: boolean; // 科技网格
  showCityGlow: boolean; // 城市辉光
  showScreenFog: boolean; // 屏幕空间雾
  showVignette: boolean; // 轻微暗角
  // 新增：地图天气表情叠加
  showWeatherOverlay: boolean;
  // 新增：发光动线与地标光柱
  showGlowPaths: boolean;
  showLandmarkBeams: boolean;
  // AMap/3D 引擎参数
  buildingHeightFactor: number; // 3D建筑物高度放大倍数
  scanRingSpeed: number; // 扫描环动画速度倍率
  // 动线参数
  flylineSpeed: number; // 飞线动画速度倍率
  flylineWidth: number; // 飞线基础线宽（像素）
  flylineCount: number; // 飞线数量（前N个项目）
  beamGlowIntensity: number; // 光柱屏幕空间辉光强度
  toggle: (key: keyof Omit<VisualSettingsState, 'toggle' | 'set'>) => void;
  set: (partial: Partial<Omit<VisualSettingsState, 'toggle' | 'set'>>) => void;
}

const STORAGE_KEY = 'deepcad_visual_settings_v1';

function loadInitial(): Omit<VisualSettingsState, 'toggle' | 'set'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
  twoPointFiveD: parsed.twoPointFiveD ?? true,
  basemap: parsed.basemap ?? 'satellite',
  floatingUI: parsed.floatingUI ?? true,
        showEpicGlobe: parsed.showEpicGlobe ?? true,
        showLegacyParticles: parsed.showLegacyParticles ?? true,
        enablePostFX: parsed.enablePostFX ?? false,
        showLayerDebugPanel: parsed.showLayerDebugPanel ?? true,
        theme: parsed.theme ?? 'dark',
    minimalMode: parsed.minimalMode ?? false,
  showColumns: parsed.showColumns ?? false,
  showHex: parsed.showHex ?? true,
  showTechGrid: parsed.showTechGrid ?? true,
  showCityGlow: parsed.showCityGlow ?? true,
  showScreenFog: parsed.showScreenFog ?? false,
  showVignette: parsed.showVignette ?? true,
  showWeatherOverlay: parsed.showWeatherOverlay ?? true,
  showGlowPaths: parsed.showGlowPaths ?? true,
  showLandmarkBeams: parsed.showLandmarkBeams ?? false,
  buildingHeightFactor: parsed.buildingHeightFactor ?? 3,
  scanRingSpeed: parsed.scanRingSpeed ?? 1,
  flylineSpeed: parsed.flylineSpeed ?? 1,
  flylineWidth: parsed.flylineWidth ?? 2,
  flylineCount: parsed.flylineCount ?? 10,
  beamGlowIntensity: parsed.beamGlowIntensity ?? 1
      };
    }
  } catch {}
  return {
  twoPointFiveD: true,
  basemap: 'satellite',
  floatingUI: true,
    showEpicGlobe: true,
    showLegacyParticles: true,
  enablePostFX: false,
    showLayerDebugPanel: true,
    theme: 'dark',
  minimalMode: false,
  showColumns: false,
  showHex: true,
  showTechGrid: true,
  showCityGlow: true,
  showScreenFog: false,
  showVignette: true,
  showWeatherOverlay: true,
  showGlowPaths: true,
  showLandmarkBeams: false,
  buildingHeightFactor: 3,
  scanRingSpeed: 1,
  flylineSpeed: 1,
  flylineWidth: 2,
  flylineCount: 10,
  beamGlowIntensity: 1
  };
}

export const useVisualSettingsStore = create<VisualSettingsState>((set, get) => ({
  ...loadInitial(),
  toggle: (key) => {
    const next = !get()[key];
    set({ [key]: next } as any);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), [key]: next })); } catch {}
  },
  set: (partial) => {
    const current = get() as any;
    const next: any = {};
    let changed = false;
    for (const k in partial) {
      if (Object.prototype.hasOwnProperty.call(partial, k)) {
        const nv = (partial as any)[k];
        if (current[k] !== nv) { next[k] = nv; changed = true; }
      }
    }
    if (!changed) return; // no-op if nothing changed
    set(next as any);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...next })); } catch {}
  }
}));

export const visualSettings = {
  get: () => useVisualSettingsStore.getState(),
  set: (p: Partial<Omit<VisualSettingsState, 'toggle' | 'set'>>) => useVisualSettingsStore.getState().set(p)
};
