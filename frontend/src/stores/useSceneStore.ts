import { create } from 'zustand';
import axios from 'axios';
import { ProjectScene, Material } from './models';
import { AnyComponent } from './components';
import { useUIStore } from './useUIStore';
import { notification } from 'antd';

export * from './models';
export * from './components';

// --- Start of Refactored Interfaces ---

export interface Layer {
  url: string | null;
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface Layers {
  mesh: Layer;
  result: Layer;
  constraints: Layer;
  loads: Layer;
  loadsScale: number;
}

export interface PostProcessingSettings {
  resultType: string;
  colorMap: string;
  useCustomRange: boolean;
  customRange: [number, number];
  showScalarBar: boolean;
  showWireframe: boolean;
}

export interface ViewSettings {
  renderMode: 'solid' | 'wireframe' | 'points';
  backgroundColor: 'dark' | 'light' | 'gradient' | 'transparent';
  ambientIntensity: number;
  shadows: boolean;
  antialiasing: boolean;
  showAxes: boolean;
}

export interface SceneState {
  scene: ProjectScene | null;
  isLoading: boolean;
  error: string | null;
  selectedComponentId: string | null;

  layers: Layers;
  postProcessing: PostProcessingSettings;
  viewSettings: ViewSettings;
  
  // Actions
  setSelectedComponentId: (id: string | null) => void;
  fetchScene: () => Promise<void>;
  updateComponent: (componentId: string, updatedProperties: Partial<AnyComponent>) => Promise<boolean>;
  generateMesh: () => Promise<void>;
  startComputation: () => Promise<void>;

  updateLayer: (layerName: keyof Omit<Layers, 'loadsScale'>, props: Partial<Layer>) => void;
  setLoadsScale: (scale: number) => void;
  updatePostProcessing: (settings: Partial<PostProcessingSettings>) => void;
  updateViewSettings: (settings: Partial<ViewSettings>) => void;
  resetView: () => void;
  
  // Legacy actions to be removed by this refactoring
  // setGeneratedMeshUrl, setComputationResultUrl, setConstraintsUrl, setLoadsUrl
  // setPostProcessingSettings, setShowConstraints, setShowLoads
}

// --- End of Refactored Interfaces ---

const API_BASE_URL = 'http://localhost:8000/api';

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: null,
  isLoading: false,
  error: null,
  selectedComponentId: null,

  layers: {
    mesh: { url: null, isVisible: true, isLoading: false, error: null },
    result: { url: null, isVisible: true, isLoading: false, error: null },
    constraints: { url: null, isVisible: true, isLoading: false, error: null },
    loads: { url: null, isVisible: true, isLoading: false, error: null },
    loadsScale: 1.0,
  },

  postProcessing: {
    resultType: 'displacement',
    colorMap: 'cool_to_warm',
    useCustomRange: false,
    customRange: [0, 100],
    showScalarBar: true,
    showWireframe: false,
  },

  viewSettings: {
    renderMode: 'solid',
    backgroundColor: 'dark',
    ambientIntensity: 1.0,
    shadows: true,
    antialiasing: true,
    showAxes: true,
  },

  setSelectedComponentId: (id: string | null) => set({ selectedComponentId: id }),
  
  fetchScene: async () => {
    set({ isLoading: true, error: null });
    try {
      // Assuming the backend /api/scene endpoint now returns a ProjectScene with a 'components' array
      const response = await axios.get<ProjectScene>(`${API_BASE_URL}/scene`);
      set({ scene: response.data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch scene:", error);
      set({
        error: 'Failed to load project scene. Please check if the backend is running.',
        isLoading: false,
      });
    }
  },
  
  updateComponent: async (componentId, updatedProperties) => {
    const scene = get().scene;
    if (!scene) return false;

    try {
      // The backend expects a ComponentUpdateRequest model
      const payload = {
          name: updatedProperties.name,
          material_id: updatedProperties.material_id,
          properties: {
              ...updatedProperties
          }
      }
      // Clean up properties that are not part of the 'properties' field
      delete payload.properties.id;
      delete payload.properties.name;
      delete payload.properties.type;
      delete payload.properties.material_id;

      const response = await axios.put<AnyComponent>(`${API_BASE_URL}/components/${componentId}`, payload);
      const updatedComponent = response.data;

      // Update the scene in the store
      const updatedComponents = scene.components.map(c => 
        c.id === componentId ? updatedComponent : c
      );
      
      set({ scene: { ...scene, components: updatedComponents } });
      notification.success({ message: `Component "${updatedComponent.name}" updated.`});
      return true;

    } catch (error: any) {
      console.error("Failed to update component:", error);
      notification.error({ message: 'Component Update Failed', description: error.response?.data?.detail });
      return false;
    }
  },

  generateMesh: async () => {
    const { layers, updateLayer } = get();
    // 获取UI状态但避免直接调用方法
    const uiState = useUIStore.getState();
    const { clientId } = uiState;

    // Reset previous mesh and start loading
    updateLayer('mesh', { url: null, isLoading: true, error: null });
    
    // 重置任务进度
    uiState.resetTaskProgress();
    
    const scene = get().scene;
    if (!scene || !scene.domain.bounding_box_min || !scene.domain.bounding_box_max) {
      notification.error({
        message: 'Meshing Failed',
        description: 'Scene or computational domain is not defined.',
      });
      updateLayer('mesh', { isLoading: false, error: 'Scene or computational domain not defined.' });
      return;
    }

    try {
      const response = await axios.post<{ message: string; clientId: string }>(
        `${API_BASE_URL}/meshing/generate`,
        {
          boundingBoxMin: [scene.domain.bounding_box_min.x, scene.domain.bounding_box_min.y, scene.domain.bounding_box_min.z],
          boundingBoxMax: [scene.domain.bounding_box_max.x, scene.domain.bounding_box_max.y, scene.domain.bounding_box_max.z],
          meshSize: scene.meshing.global_size,
          clientId: clientId,
        }
      );
      
      notification.info({
        message: 'Mesh Generation Started',
        description: response.data.message,
      });

    } catch (error: any) {
      notification.error({
        message: 'Mesh Generation Failed',
        description: error.response?.data?.detail || 'An unexpected error occurred.',
      });
       updateLayer('mesh', { isLoading: false, error: 'Failed to start mesh generation.' });
    }
  },
  
  startComputation: async () => {
    // 获取UI状态但避免直接调用方法
    const uiState = useUIStore.getState();
    const { clientId } = uiState;
    const { updateLayer } = get();

    // Reset previous results and progress
    uiState.resetTaskProgress();
    updateLayer('result', { url: null, isLoading: true, error: null });
    updateLayer('constraints', { url: null, isLoading: false, error: null });
    updateLayer('loads', { url: null, isLoading: false, error: null });


    try {
      await axios.post(`${API_BASE_URL}/computation/start`, { client_id: clientId });
      notification.info({
        message: 'Computation Started',
        description: 'The solver is running. You can monitor the progress in the task indicator.',
      });
    } catch (error: any) {
      notification.error({
        message: 'Failed to Start Computation',
        description: error.response?.data?.detail || 'An unexpected server error occurred.',
      });
      updateLayer('result', { isLoading: false, error: 'Failed to start computation.' });
    }
  },
  
  updateLayer: (layerName, props) => set(state => ({
    layers: {
      ...state.layers,
      [layerName]: {
        ...state.layers[layerName],
        ...props,
      }
    }
  })),

  setLoadsScale: (scale) => set(state => ({
    layers: { ...state.layers, loadsScale: scale }
  })),

  updatePostProcessing: (settings) => set(state => ({
    postProcessing: { ...state.postProcessing, ...settings }
  })),

  updateViewSettings: (settings) => set(state => ({
    viewSettings: { ...state.viewSettings, ...settings }
  })),

  resetView: () => set(state => ({
    viewSettings: {
      renderMode: 'solid',
      backgroundColor: 'dark',
      ambientIntensity: 1.0,
      shadows: true,
      antialiasing: true,
      showAxes: true,
    }
  })),
})); 