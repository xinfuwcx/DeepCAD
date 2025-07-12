/**
 * Viewport3D 状态管理
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  ViewportState, 
  ToolbarAction, 
  RenderMode, 
  ViewMode, 
  ToolbarPosition, 
  ToolbarDisplay,
  MeasurementData,
  SectionPlane,
  GridConfig,
  CoordinateSystemConfig,
  ViewportConfig,
  ToolbarConfig
} from '../types/viewport';

interface ViewportStore extends ViewportState {
  // 工具栏操作
  setActiveTool: (tool: ToolbarAction) => void;
  toggleTool: (tool: ToolbarAction) => void;
  
  // 视口配置
  setRenderMode: (mode: RenderMode) => void;
  setViewMode: (mode: ViewMode) => void;
  updateViewportConfig: (config: Partial<ViewportConfig>) => void;
  
  // 网格控制
  toggleGrid: () => void;
  setGridConfig: (config: Partial<GridConfig>) => void;
  
  // 坐标系控制
  toggleCoordinateSystem: () => void;
  setCoordinateSystemConfig: (config: Partial<CoordinateSystemConfig>) => void;
  
  // 工具栏配置
  setToolbarPosition: (position: ToolbarPosition) => void;
  setToolbarDisplay: (display: ToolbarDisplay) => void;
  updateToolbarConfig: (config: Partial<ToolbarConfig>) => void;
  
  // 测量功能
  addMeasurement: (measurement: MeasurementData) => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;
  
  // 剖切功能
  addSectionPlane: (plane: SectionPlane) => void;
  removeSectionPlane: (id: string) => void;
  toggleSectionPlane: (id: string) => void;
  clearSectionPlanes: () => void;
  
  // 相机控制
  setCameraPosition: (position: {x: number, y: number, z: number}) => void;
  setCameraTarget: (target: {x: number, y: number, z: number}) => void;
  resetCamera: () => void;
  fitView: () => void;
  
  // 交互状态
  setInteracting: (isInteracting: boolean) => void;
  
  // 重置所有设置
  resetToDefaults: () => void;
}

// 默认配置
const defaultGridConfig: GridConfig = {
  visible: true,
  size: 10,
  divisions: 10,
  color: '#888888',
  opacity: 0.3,
  infinite: false
};

const defaultCoordinateSystemConfig: CoordinateSystemConfig = {
  visible: true,
  size: 1,
  position: 'bottom-right',
  labels: true
};

const defaultViewportConfig: ViewportConfig = {
  background: '#f0f0f0',
  renderMode: RenderMode.SOLID,
  viewMode: ViewMode.PERSPECTIVE,
  fov: 75,
  near: 0.1,
  far: 1000,
  enableDamping: true,
  dampingFactor: 0.05,
  enablePan: true,
  enableZoom: true,
  enableRotate: true
};

const defaultToolbarConfig: ToolbarConfig = {
  position: ToolbarPosition.TOP_LEFT,
  display: ToolbarDisplay.ALWAYS,
  size: 'medium',
  orientation: 'horizontal',
  visibleTools: [
    ToolbarAction.SELECT,
    ToolbarAction.ORBIT,
    ToolbarAction.PAN,
    ToolbarAction.ZOOM,
    ToolbarAction.FIT,
    ToolbarAction.RESET,
    ToolbarAction.MEASURE,
    ToolbarAction.SECTION_CUT,
    ToolbarAction.WIREFRAME,
    ToolbarAction.GRID,
    ToolbarAction.SCREENSHOT,
    ToolbarAction.SETTINGS
  ]
};

const defaultCameraState = {
  position: { x: 10, y: 10, z: 10 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 }
};

const initialState: ViewportState = {
  activeTool: ToolbarAction.ORBIT,
  isInteracting: false,
  measurements: [],
  sectionPlanes: [],
  grid: defaultGridConfig,
  coordinateSystem: defaultCoordinateSystemConfig,
  viewport: defaultViewportConfig,
  toolbar: defaultToolbarConfig,
  camera: defaultCameraState
};

export const useViewportStore = create<ViewportStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 工具栏操作
      setActiveTool: (tool: ToolbarAction) => {
        set({ activeTool: tool });
      },

      toggleTool: (tool: ToolbarAction) => {
        const { activeTool } = get();
        set({ activeTool: activeTool === tool ? ToolbarAction.ORBIT : tool });
      },

      // 视口配置
      setRenderMode: (mode: RenderMode) => {
        set((state) => ({
          viewport: { ...state.viewport, renderMode: mode }
        }));
      },

      setViewMode: (mode: ViewMode) => {
        set((state) => ({
          viewport: { ...state.viewport, viewMode: mode }
        }));
      },

      updateViewportConfig: (config: Partial<ViewportConfig>) => {
        set((state) => ({
          viewport: { ...state.viewport, ...config }
        }));
      },

      // 网格控制
      toggleGrid: () => {
        set((state) => ({
          grid: { ...state.grid, visible: !state.grid.visible }
        }));
      },

      setGridConfig: (config: Partial<GridConfig>) => {
        set((state) => ({
          grid: { ...state.grid, ...config }
        }));
      },

      // 坐标系控制
      toggleCoordinateSystem: () => {
        set((state) => ({
          coordinateSystem: { 
            ...state.coordinateSystem, 
            visible: !state.coordinateSystem.visible 
          }
        }));
      },

      setCoordinateSystemConfig: (config: Partial<CoordinateSystemConfig>) => {
        set((state) => ({
          coordinateSystem: { ...state.coordinateSystem, ...config }
        }));
      },

      // 工具栏配置
      setToolbarPosition: (position: ToolbarPosition) => {
        set((state) => ({
          toolbar: { ...state.toolbar, position }
        }));
      },

      setToolbarDisplay: (display: ToolbarDisplay) => {
        set((state) => ({
          toolbar: { ...state.toolbar, display }
        }));
      },

      updateToolbarConfig: (config: Partial<ToolbarConfig>) => {
        set((state) => ({
          toolbar: { ...state.toolbar, ...config }
        }));
      },

      // 测量功能
      addMeasurement: (measurement: MeasurementData) => {
        set((state) => ({
          measurements: [...state.measurements, measurement]
        }));
      },

      removeMeasurement: (id: string) => {
        set((state) => ({
          measurements: state.measurements.filter(m => m.id !== id)
        }));
      },

      clearMeasurements: () => {
        set({ measurements: [] });
      },

      // 剖切功能
      addSectionPlane: (plane: SectionPlane) => {
        set((state) => ({
          sectionPlanes: [...state.sectionPlanes, plane]
        }));
      },

      removeSectionPlane: (id: string) => {
        set((state) => ({
          sectionPlanes: state.sectionPlanes.filter(p => p.id !== id)
        }));
      },

      toggleSectionPlane: (id: string) => {
        set((state) => ({
          sectionPlanes: state.sectionPlanes.map(p =>
            p.id === id ? { ...p, enabled: !p.enabled } : p
          )
        }));
      },

      clearSectionPlanes: () => {
        set({ sectionPlanes: [] });
      },

      // 相机控制
      setCameraPosition: (position: {x: number, y: number, z: number}) => {
        set((state) => ({
          camera: { ...state.camera, position }
        }));
      },

      setCameraTarget: (target: {x: number, y: number, z: number}) => {
        set((state) => ({
          camera: { ...state.camera, target }
        }));
      },

      resetCamera: () => {
        set((state) => ({
          camera: defaultCameraState
        }));
      },

      fitView: () => {
        // 这个方法会被Viewport3D组件实现
        console.log('Fit view requested');
      },

      // 交互状态
      setInteracting: (isInteracting: boolean) => {
        set({ isInteracting });
      },

      // 重置所有设置
      resetToDefaults: () => {
        set(initialState);
      }
    }),
    {
      name: 'viewport-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        grid: state.grid,
        coordinateSystem: state.coordinateSystem,
        viewport: state.viewport,
        toolbar: state.toolbar
      })
    }
  )
);

// 导出选择器函数以优化性能
export const selectActiveTool = (state: ViewportStore) => state.activeTool;
export const selectGrid = (state: ViewportStore) => state.grid;
export const selectCoordinateSystem = (state: ViewportStore) => state.coordinateSystem;
export const selectViewport = (state: ViewportStore) => state.viewport;
export const selectToolbar = (state: ViewportStore) => state.toolbar;
export const selectMeasurements = (state: ViewportStore) => state.measurements;
export const selectSectionPlanes = (state: ViewportStore) => state.sectionPlanes;