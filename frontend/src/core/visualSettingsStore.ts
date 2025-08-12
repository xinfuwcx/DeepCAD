import { create } from 'zustand';

interface VisualSettingsState {
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
        showEpicGlobe: parsed.showEpicGlobe ?? true,
        showLegacyParticles: parsed.showLegacyParticles ?? true,
        enablePostFX: parsed.enablePostFX ?? true,
        showLayerDebugPanel: parsed.showLayerDebugPanel ?? true,
        theme: parsed.theme ?? 'dark',
    minimalMode: parsed.minimalMode ?? false,
  showColumns: parsed.showColumns ?? false,
  showHex: parsed.showHex ?? true
      };
    }
  } catch {}
  return {
    showEpicGlobe: true,
    showLegacyParticles: true,
    enablePostFX: true,
    showLayerDebugPanel: true,
    theme: 'dark',
  minimalMode: false,
  showColumns: false,
  showHex: true
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
    set(partial as any);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...partial })); } catch {}
  }
}));

export const visualSettings = {
  get: () => useVisualSettingsStore.getState(),
  set: (p: Partial<Omit<VisualSettingsState, 'toggle' | 'set'>>) => useVisualSettingsStore.getState().set(p)
};
