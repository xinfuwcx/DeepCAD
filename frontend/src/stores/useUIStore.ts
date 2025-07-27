import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UIState as UnifiedUIState, UITheme } from './types';

export interface UIConfig {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  glassEffect: boolean;
  animations: boolean;
  borderRadius: number;
  spacing: number;
  fontSize: number;
  layout: 'futuristic' | 'professional' | 'minimal' | 'classic';
  sidebarCollapsed: boolean;
  compactMode: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

interface UIStoreState {
  config: UIConfig;
  // Theme state
  theme: UITheme | null;
  uiMode: 'light' | 'dark' | 'quantum';
  particleEffectsEnabled: boolean;
  activeModule: 'geometry' | 'meshing' | 'analysis' | 'results';
  
  // WebSocket related state
  websocket: WebSocket | null;
  clientId: string | null;
  taskProgress: {
    taskId?: string;
    progress?: number;
    status?: string;
    message?: string;
  };
  
  // UI methods
  setTheme: (theme: UIConfig['theme']) => void;
  setAccentColor: (color: string) => void;
  setGlassEffect: (enabled: boolean) => void;
  setAnimations: (enabled: boolean) => void;
  setBorderRadius: (radius: number) => void;
  setSpacing: (spacing: number) => void;
  setFontSize: (size: number) => void;
  setLayout: (layout: UIConfig['layout']) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  updateConfig: (partial: Partial<UIConfig>) => void;
  resetToDefaults: () => void;
  
  // New theme methods
  toggleTheme: () => void;
  setUiMode: (mode: 'light' | 'dark' | 'quantum') => void;
  toggleParticleEffects: () => void;
  setActiveModule: (module: 'geometry' | 'meshing' | 'analysis' | 'results') => void;
  
  // WebSocket methods
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  resetTaskProgress: () => void;
}

const defaultConfig: UIConfig = {
  theme: 'dark',
  accentColor: '#00d9ff',
  glassEffect: true,
  animations: true,
  borderRadius: 8,
  spacing: 16,
  fontSize: 14,
  layout: 'futuristic',
  sidebarCollapsed: false,
  compactMode: false,
  highContrast: false,
  reducedMotion: false,
};

export const useUIStore = create<UIStoreState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      // Theme state
      theme: null,
      uiMode: 'dark',
      particleEffectsEnabled: true,
      activeModule: 'geometry',
      // WebSocket state
      websocket: null,
      clientId: null,
      taskProgress: {},
      
      setTheme: (theme) =>
        set((state) => ({
          config: { ...state.config, theme },
        })),
      
      setAccentColor: (accentColor) =>
        set((state) => ({
          config: { ...state.config, accentColor },
        })),
      
      setGlassEffect: (glassEffect) =>
        set((state) => ({
          config: { ...state.config, glassEffect },
        })),
      
      setAnimations: (animations) =>
        set((state) => ({
          config: { ...state.config, animations },
        })),
      
      setBorderRadius: (borderRadius) =>
        set((state) => ({
          config: { ...state.config, borderRadius },
        })),
      
      setSpacing: (spacing) =>
        set((state) => ({
          config: { ...state.config, spacing },
        })),
      
      setFontSize: (fontSize) =>
        set((state) => ({
          config: { ...state.config, fontSize },
        })),
      
      setLayout: (layout) =>
        set((state) => ({
          config: { ...state.config, layout },
        })),
      
      setSidebarCollapsed: (sidebarCollapsed) =>
        set((state) => ({
          config: { ...state.config, sidebarCollapsed },
        })),
      
      setCompactMode: (compactMode) =>
        set((state) => ({
          config: { ...state.config, compactMode },
        })),
      
      setHighContrast: (highContrast) =>
        set((state) => ({
          config: { ...state.config, highContrast },
        })),
      
      setReducedMotion: (reducedMotion) =>
        set((state) => ({
          config: { ...state.config, reducedMotion },
        })),
      
      updateConfig: (partial) =>
        set((state) => ({
          config: { ...state.config, ...partial },
        })),
      
      resetToDefaults: () =>
        set({ config: defaultConfig }),
      
      // New theme methods
      toggleTheme: () => {
        const currentMode = get().uiMode;
        const nextMode = currentMode === 'light' ? 'dark' : 
                        currentMode === 'dark' ? 'quantum' : 'light';
        set({ uiMode: nextMode });
      },
      
      setUiMode: (mode) => set({ uiMode: mode }),
      
      toggleParticleEffects: () => 
        set((state) => ({ particleEffectsEnabled: !state.particleEffectsEnabled })),
      
      setActiveModule: (module) => set({ activeModule: module }),
        
      // WebSocket methods
      connectWebSocket: () => {
        const ws = new WebSocket('ws://localhost:8080/ws');
        set({ websocket: ws, clientId: Date.now().toString() });
      },
      
      disconnectWebSocket: () => {
        const { websocket } = get();
        if (websocket) {
          websocket.close();
        }
        set({ websocket: null, clientId: null });
      },
      
      resetTaskProgress: () => {
        set({ taskProgress: {} });
      },
    }),
    {
      name: 'deepcad-ui-config',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ config: state.config }),
    }
  )
);

// 主题相关的工具函数
export const getThemeVariables = (config: UIConfig) => {
  const { theme, accentColor, borderRadius, spacing, fontSize } = config;
  
  return {
    '--primary-color': accentColor,
    '--border-radius': `${borderRadius}px`,
    '--spacing-base': `${spacing}px`,
    '--font-size-base': `${fontSize}px`,
    '--glass-opacity': config.glassEffect ? '0.05' : '0',
    '--glass-blur': config.glassEffect ? '20px' : '0px',
  };
};

// 应用主题到DOM
export const applyThemeToDOM = (config: UIConfig) => {
  const root = document.documentElement;
  const themeVars = getThemeVariables(config);
  
  Object.entries(themeVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // 应用主题类名
  root.className = root.className.replace(/theme-\w+/g, '');
  root.classList.add(`theme-${config.theme}`);
  
  // 应用布局类名
  root.className = root.className.replace(/layout-\w+/g, '');
  root.classList.add(`layout-${config.layout}`);
  
  // 应用其他配置类名
  root.classList.toggle('glass-effect', config.glassEffect);
  root.classList.toggle('animations-disabled', !config.animations);
  root.classList.toggle('compact-mode', config.compactMode);
  root.classList.toggle('high-contrast', config.highContrast);
  root.classList.toggle('reduced-motion', config.reducedMotion);
};

// Hook for theme-aware styles
export const useThemeStyles = () => {
  const config = useUIStore((state) => state.config);
  
  return {
    primaryColor: config.accentColor,
    borderRadius: config.borderRadius,
    spacing: config.spacing,
    fontSize: config.fontSize,
    glassStyle: config.glassEffect
      ? {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${config.accentColor}30`,
        }
      : {},
    buttonStyle: {
      borderRadius: config.borderRadius,
      fontSize: config.fontSize,
    },
    cardStyle: {
      borderRadius: config.borderRadius,
      padding: config.spacing,
    },
  };
};