/**
 * 控制中心全局状态管理
 * 使用 Zustand 管理地图、天气、UI等状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { MapLayerType, iTownsMapController } from '../components/control/iTownsMapController';
import { unifiedMapService, MapStyleType, initLazyMap } from '../services/UnifiedMapService';

// 天气状态接口
export interface WeatherState {
  rain: boolean;
  snow: boolean;
  fog: boolean;
  clouds: boolean;
  intensity: number;
  cloudCoverage: number;
}

// 导航键类型
export type NavigationKey = 'street' | 'satellite' | 'terrain' | 'dark' | 'weather' | 'weather-effects' | 'epic' | 'monitor' | 'ai' | 'project-management' | 'exit';

// 统一：导航键到统一地图样式的映射（无样式返回 null）
const NAV_TO_STYLE: Record<NavigationKey, MapStyleType | null> = {
  street: 'street',
  satellite: 'satellite',
  terrain: 'terrain',
  dark: 'dark-tech',
  weather: null,
  'weather-effects': null,
  epic: null,
  monitor: null,
  ai: null,
  'project-management': null,
  exit: null,
};

// 位置信息接口
export interface Location {
  name: string;
  lat: number;
  lng: number;
}

// 控制中心状态接口
interface ControlCenterState {
  // === 地图相关 ===
  activeMapMode: NavigationKey;
  currentLocation: Location;
  mapStatus: 'loading' | 'ready' | 'error';
  errorMessage: string;
  mapController: iTownsMapController | null;
  unifiedMapService: typeof unifiedMapService;

  // === UI 状态 ===
  showWeatherPanel: boolean;
  darkMode: boolean;
  fullscreenMode: boolean;
  epicMode: boolean;
  showAIAssistant: boolean;

  // === 天气状态 ===
  weatherState: WeatherState;
  weatherIntensity: number;
  cloudDensity: number;
  currentWeatherData: any;

  // === Actions ===
  setActiveMapMode: (mode: NavigationKey) => void;
  setCurrentLocation: (location: Location) => void;
  setMapStatus: (status: 'loading' | 'ready' | 'error', message?: string) => void;
  setMapController: (controller: iTownsMapController | null) => void;
  initializeUnifiedMap: (container: HTMLElement) => Promise<void>;
  switchUnifiedMapStyle: (style: MapStyleType) => void;
  
  toggleWeatherPanel: () => void;
  toggleDarkMode: () => void;
  toggleFullscreen: () => void;
  toggleEpicMode: () => void;
  toggleAIAssistant: () => void;
  
  updateWeatherState: (updates: Partial<WeatherState>) => void;
  setWeatherIntensity: (intensity: number) => void;
  setCloudDensity: (density: number) => void;
  setCurrentWeatherData: (data: any) => void;
  
  // 复合操作
  handleNavigationClick: (key: NavigationKey) => void;
  reset: () => void;
}

// 初始状态
const initialState = {
  // 地图相关
  activeMapMode: 'street' as NavigationKey,
  currentLocation: {
    name: '北京',
    lat: 39.9042,
    lng: 116.4074
  },
  mapStatus: 'loading' as const,
  errorMessage: '',
  mapController: null,
  unifiedMapService: unifiedMapService,

  // UI 状态
  showWeatherPanel: false,
  darkMode: false,
  fullscreenMode: false,
  epicMode: false,
  showAIAssistant: false,

  // 天气状态
  weatherState: {
    rain: false,
    snow: false,
    fog: false,
    clouds: true,
    intensity: 0.5,
    cloudCoverage: 0.6
  },
  weatherIntensity: 50,
  cloudDensity: 60,
  currentWeatherData: null,
};

// 创建 Zustand store
export const useControlCenterStore = create<ControlCenterState>()(persist((set, get) => ({
    ...initialState,

    // === 基础 Actions ===
    setActiveMapMode: (mode: NavigationKey) => 
      set({ activeMapMode: mode }),

    setCurrentLocation: (location: Location) => 
      set({ currentLocation: location }),

    setMapStatus: (status, message = '') => 
      set({ mapStatus: status, errorMessage: message }),

    setMapController: (controller) => 
      set({ mapController: controller }),

    // === 统一地图服务 ===
    initializeUnifiedMap: async (container: HTMLElement) => {
      try {
        if (!container) {
          set({ mapStatus: 'error', errorMessage: '容器无效' });
          return;
        }
        await initLazyMap(container, {
          style: 'dark-tech',
          center: [get().currentLocation.lng, get().currentLocation.lat],
          zoom: 5
        });
        set({ mapStatus: 'ready', errorMessage: '' });
        console.log('✅ 统一地图服务初始化成功');
      } catch (error) {
        console.error('❌ 统一地图服务初始化失败:', error);
        set({ mapStatus: 'error', errorMessage: '地图初始化失败' });
      }
    },

    switchUnifiedMapStyle: (style: MapStyleType) => {
      unifiedMapService.setStyle(style);
      console.log(`🎨 切换统一地图样式: ${style}`);
    },

    // === UI Toggle Actions ===
    toggleWeatherPanel: () => 
      set((state) => ({ showWeatherPanel: !state.showWeatherPanel })),

    toggleDarkMode: () => 
      set((state) => ({ darkMode: !state.darkMode })),

    toggleFullscreen: () => 
      set((state) => ({ fullscreenMode: !state.fullscreenMode })),

    toggleEpicMode: () => 
      set((state) => ({ epicMode: !state.epicMode })),

    toggleAIAssistant: () => 
      set((state) => ({ showAIAssistant: !state.showAIAssistant })),

    // === 天气相关 Actions ===
    updateWeatherState: (updates: Partial<WeatherState>) =>
      set((state) => ({
        weatherState: { ...state.weatherState, ...updates }
      })),

    setWeatherIntensity: (intensity: number) =>
      set((state) => ({
        weatherIntensity: intensity,
        weatherState: { ...state.weatherState, intensity: intensity / 100 }
      })),

    setCloudDensity: (density: number) =>
      set((state) => ({
        cloudDensity: density,
        weatherState: { ...state.weatherState, cloudCoverage: density / 100 }
      })),

    setCurrentWeatherData: (data: any) => 
      set({ currentWeatherData: data }),

    // === 复合操作 ===
    handleNavigationClick: (key: NavigationKey) => {
      const state = get();
      
      // 设置活跃模式
      set({ activeMapMode: key });

      // 优先：根据导航键切换统一地图样式（若有对应关系）
      const style = NAV_TO_STYLE[key];
      if (style) {
        get().switchUnifiedMapStyle(style);
      }

      // 根据不同按钮执行不同操作
      switch (key) {
        case 'weather':
          set({ showWeatherPanel: !state.showWeatherPanel });
          break;
          
        case 'dark':
          const newDarkMode = !state.darkMode;
          set({ darkMode: newDarkMode });
          // 切换地图主题
          if (state.mapController) {
            state.mapController.setDarkMode(newDarkMode);
          }
          // 若外部未通过样式映射切换，这里保证样式与暗色保持一致
          if (NAV_TO_STYLE.dark) {
            get().switchUnifiedMapStyle(NAV_TO_STYLE.dark);
          }
          break;
          
        case 'monitor':
          set({ fullscreenMode: !state.fullscreenMode });
          break;
          
        case 'epic':
          set({ epicMode: !state.epicMode });
          break;
          
        case 'ai':
          set({ showAIAssistant: !state.showAIAssistant });
          break;
          
        case 'exit':
          // 可以执行退出逻辑
          console.log('Exit system');
          break;
          
        case 'project-management':
          // 项目管理模式
          console.log('切换到项目管理模式');
          set({ 
            showWeatherPanel: false,
            showAIAssistant: false 
          });
          break;
          
        case 'street':
        case 'satellite':
        case 'terrain':
          // 地图图层切换 - 同时支持旧系统和新系统
          if (state.mapController) {
            state.mapController.switchLayer(key as MapLayerType);
          }
          set({ 
            showWeatherPanel: false,
            showAIAssistant: false 
          });
          break;
          
        default:
          break;
      }
    },

    // === 重置状态 ===
    reset: () => set(initialState),
  }), {
  name: 'deepcad-control-center-v1',
  partialize: (state) => ({
    activeMapMode: state.activeMapMode,
    currentLocation: state.currentLocation,
    darkMode: state.darkMode,
    fullscreenMode: state.fullscreenMode,
    epicMode: state.epicMode,
    showWeatherPanel: state.showWeatherPanel,
    weatherState: state.weatherState,
    weatherIntensity: state.weatherIntensity,
    cloudDensity: state.cloudDensity,
  })
}));

// === 选择器 Hooks ===
export const useMapState = () =>
  useControlCenterStore(
    useShallow((state) => ({
      activeMapMode: state.activeMapMode,
      currentLocation: state.currentLocation,
      mapStatus: state.mapStatus,
      errorMessage: state.errorMessage,
    }))
  );

export const useUIState = () =>
  useControlCenterStore(
    useShallow((state) => ({
      showWeatherPanel: state.showWeatherPanel,
      darkMode: state.darkMode,
      fullscreenMode: state.fullscreenMode,
      epicMode: state.epicMode,
      showAIAssistant: state.showAIAssistant,
    }))
  );

export const useWeatherStateStore = () =>
  useControlCenterStore(
    useShallow((state) => ({
      weatherState: state.weatherState,
      weatherIntensity: state.weatherIntensity,
      cloudDensity: state.cloudDensity,
      currentWeatherData: state.currentWeatherData,
    }))
  );

// === 订阅变化 ===
// 暂时注释掉订阅，避免无限循环问题
// TODO: 后续可以重新启用这些订阅

// 监听暗色模式变化，自动切换地图图层
// useControlCenterStore.subscribe(
//   (state) => state.darkMode,
//   (darkMode) => {
//     console.log('Dark mode changed:', darkMode);
//     // 这里可以触发地图图层切换逻辑
//   }
// );

// 监听全屏模式变化
// useControlCenterStore.subscribe(
//   (state) => state.fullscreenMode,
//   (fullscreenMode) => {
//     if (fullscreenMode) {
//       document.documentElement.requestFullscreen?.();
//     } else {
//       document.exitFullscreen?.();
//     }
//   }
// );