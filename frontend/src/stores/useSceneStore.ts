import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ProjectScene } from './models';

// Component Types
export interface DiaphragmWall {
  id: string;
  name: string;
  type: 'diaphragm_wall';
  thickness: number;
  depth: number;
  material_id: string | null;
  // Other properties...
}

export interface PileArrangement {
  id: string;
  name: string;
  type: 'pile_arrangement';
  pile_diameter: number;
  pile_depth: number;
  pile_spacing: number;
  material_id: string | null;
  arrangement_type?: string;
  rows?: number;
  row_spacing?: number;
  system_type?: string;
}

// 本构模型类型
export enum ConstitutiveModelType {
  LINEAR_ELASTIC = 'linear_elastic',
  MOHR_COULOMB = 'mohr_coulomb',
  DRUCKER_PRAGER = 'drucker_prager',
  CAM_CLAY = 'cam_clay',
  HARDENING_SOIL = 'hardening_soil',
  HYPOPLASTIC = 'hypoplastic'
}

// 本构模型接口
export interface ConstitutiveModel {
  type: ConstitutiveModelType;
  parameters: Record<string, number>;
  advanced_options?: Record<string, any>;
}

// 物理属性接口
export interface PhysicalProperties {
  unit_weight: number;
  water_content?: number;
  void_ratio?: number;
  saturation?: number;
  permeability?: number;
}

// 土层接口
export interface SoilLayer {
  id: string;
  name: string;
  depth_range: {
    from: number;
    to: number;
  };
  soil_type: 'clay' | 'sand' | 'silt' | 'rock' | 'mixed';
  constitutive_model: ConstitutiveModel;
  physical_properties: PhysicalProperties;
  enabled: boolean;
}

// 锚杆排接口
export interface AnchorRow {
  id: string;
  row_number: number;
  position: {
    depth: number;
    horizontal_offset: number;
  };
  geometry: {
    free_length: number;
    bonded_length: number;
    diameter: number;
    angle: number;
  };
  spacing: {
    horizontal: number;
    vertical?: number;
  };
  anchor_count: number;
  prestress: number;
  enabled: boolean;
}

// 土体域接口
export interface SoilDomain {
  id: string;
  name: string;
  geometry: Record<string, any>;
  soil_layers: SoilLayer[];
  water_table_depth: number;
  boundary_conditions: any[];
  infinite_elements?: {
    enabled: boolean;
    boundary_type: string;
    direction: string;
    distance_factor: number;
  };
  use_layered_model: boolean;
  global_constitutive_model?: ConstitutiveModel;
}

// 网格片段接口
export interface DomainFragment {
  id: string;
  name: string;
  fragment_type: 'soil_domain' | 'structure' | 'excavation' | 'infinite_boundary';
  geometry: {
    type: string;
    coordinates: number[][];
    holes?: number[][][];
    depth_range?: { from: number; to: number; };
  };
  mesh_properties: {
    element_size: number;
    element_type: string;
    mesh_density: string;
    structured_mesh: boolean;
    infinite_elements?: {
      enabled: boolean;
      direction: string;
      layers: number;
    };
  };
  material_assignment?: string;
  boundary_conditions: string[];
}

// 网格配置接口
export interface MeshConfig {
  id: string;
  global_settings: {
    element_type: string;
    default_element_size: number;
    mesh_quality: string;
    max_element_size: number;
    min_element_size: number;
    mesh_smoothing: boolean;
  };
  domain_fragments: DomainFragment[];
  refinement_zones: any[];
  infinite_elements: {
    enabled: boolean;
    outer_boundary?: any;
    infinite_layers: any[];
  };
}

export interface AnchorRod {
  id: string;
  name: string;
  type: 'anchor_rod';
  location: { x: number; y: number; z: number };
  free_length: number;
  bonded_length: number;
  diameter: number;
  angle: number;
  material_id: string | null;
  // 新增多排和预应力支持
  multi_row_mode?: boolean;
  global_prestress?: number;
  anchor_rows?: AnchorRow[];
}

export interface Excavation {
  id: string;
  name: string;
  type: 'excavation';
  depth: number;
  // Other properties...
}

export interface Tunnel {
  id: string;
  name: string;
  type: 'tunnel';
  diameter: number;
  material_id: string | null;
  length?: number;
  lining_thickness?: number;
  support_type?: string;
  overburden?: number;
  profile?: {
    type: string;
    radius: number;
  };
}

export type AnyComponent = DiaphragmWall | PileArrangement | AnchorRod | Excavation | Tunnel;

// Layer definition
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  // Other properties...
}

// View settings
export interface ViewSettings {
  renderMode: 'solid' | 'wireframe' | 'points';
  backgroundColor: 'dark' | 'light' | 'gradient' | 'transparent';
  ambientIntensity: number;
  shadows: boolean;
  antialiasing: boolean;
  showAxes: boolean;
  // Other view settings...
}

export interface SceneState {
  scene: ProjectScene | null;
  layers: Layer[];
  selectedComponentId: string | null;
  selectedComponentIds: string[]; // 新增：多选组件 ID 数组
  isMultiSelectMode: boolean; // 新增：是否处于多选模式
  viewSettings: ViewSettings;
  
  // 新增：土体域和网格配置
  soilDomain: SoilDomain | null;
  meshConfig: MeshConfig | null;
  
  // Scene operations
  loadScene: (sceneId: string) => Promise<void>;
  saveScene: () => Promise<void>;
  createNewScene: (name: string) => Promise<void>;
  
  // Component operations
  addComponent: (componentData: Omit<AnyComponent, 'id'>) => Promise<string>;
  updateComponent: (id: string, updates: Partial<AnyComponent>) => void;
  deleteComponent: (id: string) => Promise<void>;
  setSelectedComponentId: (id: string | null) => void;
  
  // Layer operations
  addLayer: (layer: Omit<Layer, 'id'>) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  
  // View settings
  updateViewSettings: (settings: Partial<ViewSettings>) => void;
  resetView: () => void;
  
  // 多选相关操作
  toggleMultiSelectMode: () => void; // 切换多选模式
  toggleComponentSelection: (id: string) => void; // 切换单个组件的选择状态
  clearSelection: () => void; // 清除所有选择
  selectComponents: (ids: string[]) => void; // 选择多个组件
  
  // 土体域操作
  setSoilDomain: (domain: SoilDomain) => void;
  updateSoilDomain: (updates: Partial<SoilDomain>) => void;
  addSoilLayer: (layer: SoilLayer) => void;
  updateSoilLayer: (id: string, updates: Partial<SoilLayer>) => void;
  removeSoilLayer: (id: string) => void;
  
  // 网格配置操作
  setMeshConfig: (config: MeshConfig) => void;
  updateMeshConfig: (updates: Partial<MeshConfig>) => void;
  addDomainFragment: (fragment: DomainFragment) => void;
  updateDomainFragment: (id: string, updates: Partial<DomainFragment>) => void;
  removeDomainFragment: (id: string) => void;
}

export const useSceneStore = createWithEqualityFn<
  SceneState,
  [["zustand/persist", unknown]]
>(persist((set, get) => ({
  scene: null,
  layers: [
    { id: 'terrain', name: 'Terrain', visible: true, color: '#8B4513' },
    { id: 'structures', name: 'Structures', visible: true, color: '#808080' },
    { id: 'water', name: 'Water', visible: true, color: '#0000FF' },
  ],
  selectedComponentId: null,
  selectedComponentIds: [], // 初始化为空数组
  isMultiSelectMode: false, // 初始化为非多选模式
  soilDomain: null,
  meshConfig: null,
  viewSettings: {
    renderMode: 'solid',
    backgroundColor: 'dark',
    ambientIntensity: 1.0,
    shadows: true,
    antialiasing: true,
    showAxes: true,
  },
  
  // Scene operations
  loadScene: async (sceneId) => {
    try {
      const response = await axios.get(`/api/scenes/${sceneId}`);
      set({ scene: response.data });
    } catch (error) {
      console.error('Failed to load scene:', error);
      throw error;
    }
  },
  
  saveScene: async () => {
    const { scene } = get();
    if (!scene) throw new Error('No scene to save');
    
    try {
      await axios.put(`/api/scenes/${scene.id}`, scene);
    } catch (error) {
      console.error('Failed to save scene:', error);
      throw error;
    }
  },
  
  createNewScene: async (name) => {
    try {
      const newScene: ProjectScene = {
        id: uuidv4(),
        name,
        domain: { 
          soil_layer_thickness: 10,
          boreholes: [],
          stratums: [],
          bounding_box_min: null,
          bounding_box_max: null
        },
        components: [],
        materials: [],
        meshing: {
          global_size: 1.0
        }
      };
      
      set({ scene: newScene });
      await axios.post('/api/scenes', newScene);
    } catch (error) {
      console.error('Failed to create new scene:', error);
      throw error;
    }
  },
  
  // Component operations
  addComponent: async (componentData) => {
    const { scene } = get();
    if (!scene) throw new Error('No scene loaded');
    
    const id = uuidv4();
    const newComponent = { id, ...componentData } as any;
    
    set({
      scene: {
        ...scene,
        components: [...scene.components, newComponent] as any,
      }
    });
    
    try {
      // In a real application, make an API call to create on the backend
      await axios.post('/api/components', newComponent);
      return id;
    } catch (error) {
      console.error('Failed to add component:', error);
      // Revert the optimistic update on failure
      const { scene } = get();
      if (scene) {
        set({
          scene: {
            ...scene,
            components: scene.components.filter(c => c.id !== id) as any,
          }
        });
      }
      throw error;
    }
  },
  
  updateComponent: (id, updates) => {
    set(state => {
      if (!state.scene) return state;
      
      return {
        scene: {
          ...state.scene,
          components: state.scene.components.map(component => 
            component.id === id ? { ...component, ...updates } : component
          ) as any,
        },
      };
    });
  },
  
  deleteComponent: async (id) => {
    const { scene, selectedComponentId, selectedComponentIds } = get();
    if (!scene) throw new Error('No scene loaded');
    
    // 更新选择状态
    const newSelectedIds = selectedComponentIds.filter(componentId => componentId !== id);
    const newSelectedId = selectedComponentId === id ? 
      (newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null) : 
      selectedComponentId;
    
    // 乐观更新 UI
    set({
      scene: {
        ...scene,
        components: scene.components.filter(c => c.id !== id),
      },
      selectedComponentId: newSelectedId,
      selectedComponentIds: newSelectedIds,
    });
    
    try {
      // 实际删除组件的 API 调用
      await axios.delete(`/api/components/${id}`);
    } catch (error) {
      console.error('Failed to delete component:', error);
      // 恢复原始状态
      set({
        scene: {
          ...scene,
          components: scene.components,
        },
        selectedComponentId,
        selectedComponentIds,
      });
      throw error;
    }
  },
  
  setSelectedComponentId: (id) => {
    // 兼容多选功能
    if (get().isMultiSelectMode) {
      if (id === null) {
        set({ 
          selectedComponentId: null,
          selectedComponentIds: [],
        });
      } else {
        set(state => {
          // 如果已经选中，则取消选中
          if (state.selectedComponentIds.includes(id)) {
            const newSelectedIds = state.selectedComponentIds.filter(componentId => componentId !== id);
            return {
              selectedComponentId: newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null,
              selectedComponentIds: newSelectedIds,
            };
          } else {
            // 否则添加到选中列表
            return {
              selectedComponentId: id,
              selectedComponentIds: [...state.selectedComponentIds, id],
            };
          }
        });
      }
    } else {
      // 非多选模式，直接设置
      set({ 
        selectedComponentId: id,
        selectedComponentIds: id ? [id] : [],
      });
    }
  },
  
  // Layer operations
  addLayer: (layerData) => {
    const id = uuidv4();
    set(state => ({
      layers: [...state.layers, { id, ...layerData }],
    }));
  },
  
  updateLayer: (id, updates) => {
    set(state => ({
      layers: state.layers.map(layer => 
        layer.id === id ? { ...layer, ...updates } : layer
      ),
    }));
  },
  
  removeLayer: (id) => {
    set(state => ({
      layers: state.layers.filter(layer => layer.id !== id),
    }));
  },
  
  // View settings
  updateViewSettings: (settings) => {
    set({ viewSettings: { ...get().viewSettings, ...settings } });
  },
  
  resetView: () => {
    set({
      viewSettings: {
        renderMode: 'solid',
        backgroundColor: 'dark',
        ambientIntensity: 1.0,
        shadows: true,
        antialiasing: true,
        showAxes: true,
      },
    });
  },
  
  // 多选相关操作
  toggleMultiSelectMode: () => {
    set(state => ({
      isMultiSelectMode: !state.isMultiSelectMode,
      // 如果关闭多选模式，保留当前选中的组件
      selectedComponentIds: state.isMultiSelectMode ? 
        (state.selectedComponentId ? [state.selectedComponentId] : []) : 
        state.selectedComponentIds,
    }));
  },
  
  toggleComponentSelection: (id) => {
    set(state => {
      // 如果已经选中，则取消选中
      if (state.selectedComponentIds.includes(id)) {
        const newSelectedIds = state.selectedComponentIds.filter(componentId => componentId !== id);
        return {
          selectedComponentIds: newSelectedIds,
          // 更新主选择为最后一个选中的组件，如果没有则为 null
          selectedComponentId: newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null,
        };
      } 
      // 否则添加到选中列表
      else {
        return {
          selectedComponentIds: [...state.selectedComponentIds, id],
          selectedComponentId: id,
        };
      }
    });
  },
  
  clearSelection: () => {
    set({
      selectedComponentId: null,
      selectedComponentIds: [],
    });
  },
  
  selectComponents: (ids) => {
    set({
      selectedComponentIds: ids,
      selectedComponentId: ids.length > 0 ? ids[ids.length - 1] : null,
    });
  },
  
  // 土体域操作
  setSoilDomain: (domain) => {
    set({ soilDomain: domain });
  },
  
  updateSoilDomain: (updates) => {
    set(state => ({
      soilDomain: state.soilDomain ? { ...state.soilDomain, ...updates } : null
    }));
  },
  
  addSoilLayer: (layer) => {
    set(state => ({
      soilDomain: state.soilDomain ? {
        ...state.soilDomain,
        soil_layers: [...state.soilDomain.soil_layers, layer]
      } : null
    }));
  },
  
  updateSoilLayer: (id, updates) => {
    set(state => ({
      soilDomain: state.soilDomain ? {
        ...state.soilDomain,
        soil_layers: state.soilDomain.soil_layers.map(layer => 
          layer.id === id ? { ...layer, ...updates } : layer
        )
      } : null
    }));
  },
  
  removeSoilLayer: (id) => {
    set(state => ({
      soilDomain: state.soilDomain ? {
        ...state.soilDomain,
        soil_layers: state.soilDomain.soil_layers.filter(layer => layer.id !== id)
      } : null
    }));
  },
  
  // 网格配置操作
  setMeshConfig: (config) => {
    set({ meshConfig: config });
  },
  
  updateMeshConfig: (updates) => {
    set(state => ({
      meshConfig: state.meshConfig ? { ...state.meshConfig, ...updates } : null
    }));
  },
  
  addDomainFragment: (fragment) => {
    set(state => ({
      meshConfig: state.meshConfig ? {
        ...state.meshConfig,
        domain_fragments: [...state.meshConfig.domain_fragments, fragment]
      } : null
    }));
  },
  
  updateDomainFragment: (id, updates) => {
    set(state => ({
      meshConfig: state.meshConfig ? {
        ...state.meshConfig,
        domain_fragments: state.meshConfig.domain_fragments.map(fragment => 
          fragment.id === id ? { ...fragment, ...updates } : fragment
        )
      } : null
    }));
  },
  
  removeDomainFragment: (id) => {
    set(state => ({
      meshConfig: state.meshConfig ? {
        ...state.meshConfig,
        domain_fragments: state.meshConfig.domain_fragments.filter(fragment => fragment.id !== id)
      } : null
    }));
  },
}), {
  name: 'deepcad-scene-v1',
  // Only persist serializable, lightweight fields
  partialize: (state) => ({
    scene: state.scene ? { id: state.scene.id, name: state.scene.name, domain: state.scene.domain } : null,
    layers: state.layers,
    selectedComponentId: state.selectedComponentId,
    selectedComponentIds: state.selectedComponentIds,
    isMultiSelectMode: state.isMultiSelectMode,
    soilDomain: state.soilDomain,
    meshConfig: state.meshConfig,
    viewSettings: state.viewSettings,
  })
}), shallow);