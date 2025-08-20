import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { immer } from 'zustand/middleware/immer';

// #region State Types
export interface ContourSettings {
  variable: string;
  component: string;
  colormap: string;
  numLevels: number;
  showContourLines: boolean;
  fillContours: boolean;
  opacity: number;
  range: { min: number; max: number };
}

export interface VectorSettings {
  variable: string;
  scale: number;
  density: number;
  showArrows: boolean;
  color: string;
  opacity: number;
}

export interface SliceSettings {
  direction: string;
  position: number;
  showSlice: boolean;
  sliceOpacity: number;
  numSlices: number;
}

export interface DeformationSettings {
  enabled: boolean;
  scale: number;
  showUndeformed: boolean;
  undeformedOpacity: number;
}

export interface AnimationSettings {
  isPlaying: boolean;
  speed: number;
  currentTimeStep: number;
  maxTimeSteps: number;
}

export interface ResultData {
  id: string;
  name: string;
  date: string;
  author: string;
  status: 'completed' | 'failed' | 'processing';
  type: string;
  description: string;
  resultFileUrl?: string; // URL to the VTK or other result file
}

export interface ResultsState {
  loading: boolean;
  error: string | null;
  currentResult: ResultData | null;
  
  // Visualization settings
  contour: ContourSettings;
  vector: VectorSettings;
  slice: SliceSettings;
  deformation: DeformationSettings;
  animation: AnimationSettings;
  // 新增：存储可视化几何数据
  visualizationData: Record<string, any> | null; 
  // 新增：适配渲染器的数据格式
  rendererData: any | null;

  // Actions
  fetchResult: (resultId: string) => Promise<void>;
  // 新增：获取可视化数据的action
  fetchVisualizationData: (resultId: string, field: string) => Promise<void>;
  updateContourSettings: (settings: Partial<ContourSettings>) => void;
  updateVectorSettings: (settings: Partial<VectorSettings>) => void;
  updateSliceSettings: (settings: Partial<SliceSettings>) => void;
  updateDeformationSettings: (settings: Partial<DeformationSettings>) => void;
  updateAnimationSettings: (settings: Partial<AnimationSettings>) => void;
  resetVisualization: () => void;
}
// #endregion State Types

const initialContourSettings: ContourSettings = {
  variable: 'displacement',
  component: 'magnitude',
  colormap: 'rainbow',
  numLevels: 10,
  showContourLines: true,
  fillContours: true,
  opacity: 0.8,
  range: { min: 0, max: 100 },
};

const initialVectorSettings: VectorSettings = {
  variable: 'displacement',
  scale: 1.0,
  density: 1.0,
  showArrows: true,
  color: '#1890ff',
  opacity: 0.7,
};

const initialSliceSettings: SliceSettings = {
  direction: 'z',
  position: 0,
  showSlice: true,
  sliceOpacity: 0.9,
  numSlices: 1,
};

const initialDeformationSettings: DeformationSettings = {
  enabled: true,
  scale: 1.0,
  showUndeformed: false,
  undeformedOpacity: 0.3,
};

const initialAnimationSettings: AnimationSettings = {
  isPlaying: false,
  speed: 1,
  currentTimeStep: 0,
  maxTimeSteps: 100,
};

export const useResultsStore = create<ResultsState>()(
  persist(
    immer((set, get) => ({
    loading: false,
    error: null,
    currentResult: null,
    visualizationData: null,
    rendererData: null,

    // Visualization settings
    contour: initialContourSettings,
    vector: initialVectorSettings,
    slice: initialSliceSettings,
    deformation: initialDeformationSettings,
    animation: initialAnimationSettings,

    // Actions
    fetchResult: async (resultId) => {
      set({ loading: true, error: null });
      try {
        // Assume an API endpoint exists to fetch result metadata
        const response = await axios.get(`/api/results/${resultId}`);
        set({ currentResult: response.data, loading: false });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },
    fetchVisualizationData: async (resultId, field) => {
      set({ loading: true, error: null });
      try {
        const response = await axios.get(`/api/computation/terra/analysis/${resultId}/visualize/${field}`);
        
        // 将后端返回的JSON转换为渲染器需要的格式
        const visData = response.data[field];
        const rendererData = {
          fields: [{
            id: field,
            name: field,
            type: 'scalar', // 假设目前只处理标量
            unit: visData.field_info.unit,
            // 将普通数组转换为Float32Array
            data: new Float32Array(visData.mesh.scalars),
            range: visData.mesh.range,
            // 同样需要转换顶点和面片数据
            geometry: {
              vertices: new Float32Array(visData.mesh.vertices),
              faces: new Uint32Array(visData.mesh.faces),
            }
          }],
          currentTimeStep: 0,
          timeSteps: [0],
        };

        set(state => {
          state.visualizationData = {
            ...state.visualizationData,
            [field]: visData,
          };
          state.rendererData = rendererData;
          state.loading = false;
        });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },
    updateContourSettings: (settings) => {
      set((state) => {
        state.contour = { ...state.contour, ...settings };
      });
      // 当更改可视化设置时，可能需要重新获取数据或重新处理
      const { currentResult, contour } = get();
      if (currentResult && settings.variable && settings.variable !== contour.variable) {
        get().fetchVisualizationData(currentResult.id, settings.variable);
      }
    },
    updateVectorSettings: (settings) => {
      set((state) => {
        state.vector = { ...state.vector, ...settings };
      });
    },
    updateSliceSettings: (settings) => {
      set((state) => {
        state.slice = { ...state.slice, ...settings };
      });
    },
    updateDeformationSettings: (settings) => {
      set((state) => {
        state.deformation = { ...state.deformation, ...settings };
      });
    },
    updateAnimationSettings: (settings) => {
      set((state) => {
        state.animation = { ...state.animation, ...settings };
      });
    },
    resetVisualization: () => {
      set({
        contour: initialContourSettings,
        vector: initialVectorSettings,
        slice: initialSliceSettings,
        deformation: initialDeformationSettings,
        animation: initialAnimationSettings,
      });
    },
  })),
  {
    name: 'deepcad-results-v1',
    partialize: (state) => ({
      currentResult: state.currentResult,
      contour: state.contour,
      vector: state.vector,
      slice: state.slice,
      deformation: state.deformation,
      animation: state.animation,
      // avoid persisting large raw arrays
      visualizationData: null,
      rendererData: null,
    }),
    version: 1,
  }
)
); 