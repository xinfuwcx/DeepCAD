/**
 * 控制中心全局状态管理
 * 使用 Zustand 管理地图、天气、UI等状态
 */

import { create } from 'zustand';
import { MapLayerType, iTownsMapController } from '../components/control/iTownsMapController';

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
export type NavigationKey = 'street' | 'satellite' | 'terrain' | 'dark' | 'weather' | 'weather-effects' | 'epic' | 'monitor' | 'ai' | 'exit';

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
export const useControlCenterStore = create<ControlCenterState>()((set, get) => ({
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
          
        case 'street':
        case 'satellite':
        case 'terrain':
          // 地图图层切换
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
  })
);

// === 选择器 Hooks ===
export const useMapState = () => useControlCenterStore((state) => ({
  activeMapMode: state.activeMapMode,
  currentLocation: state.currentLocation,
  mapStatus: state.mapStatus,
  errorMessage: state.errorMessage,
}));

export const useUIState = () => useControlCenterStore((state) => ({
  showWeatherPanel: state.showWeatherPanel,
  darkMode: state.darkMode,
  fullscreenMode: state.fullscreenMode,
  epicMode: state.epicMode,
  showAIAssistant: state.showAIAssistant,
}));

export const useWeatherStateStore = () => useControlCenterStore((state) => ({
  weatherState: state.weatherState,
  weatherIntensity: state.weatherIntensity,
  cloudDensity: state.cloudDensity,
  currentWeatherData: state.currentWeatherData,
}));

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