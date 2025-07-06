import { create } from 'zustand';
import * as THREE from 'three';
import { produce } from 'immer';
import {
    AnyFeature as ParametricAnyFeature,
    BaseFeature,
    CreateBoxFeature,
    CreateBuildingFeature,
    CreateDiaphragmWallFeature,
    CreateExcavationFeature,
    CreateGeologicalModelFeature,
    CreatePileRaftFeature,
    CreateTunnelFeature,
    GemPyParams,
    BoreholeData,
    CreateGeologicalModelParameters
} from '../services/parametricAnalysisService';
import { VisualizationData } from '../services/visualizationService';

// =================================================================================
// Type Definitions - Centralized Feature Types
// =================================================================================

// Re-export some types for convenience in other components
export type { GemPyParams, BoreholeData, CreateGeologicalModelParameters };
export type { BaseFeature };

// --- Feature Interfaces ---
// (此处放置所有Feature接口，如 CreateBoxFeature, etc.)

// ... (其他所有Feature接口，确保它们都继承自 BaseFeature 或有相似结构)

// --- The Union Type ---
export type AnyFeature = ParametricAnyFeature;

export type Workbench = 'Modeling' | 'Mesh' | 'Analysis' | 'Results';
export type ModalType = 'MeshSettings' | 'MaterialManager' | null;

export interface PickingState {
    isActive: boolean;
    onPick: ((point: { x: number; y: number; z: number }) => void) | null;
}

export interface ViewportHandles {
  addAnalysisMesh: (mesh: THREE.Object3D) => void;
  clearAnalysisMeshes: () => void;
  loadVtkResults: (url: string, opacity: number) => Promise<void>;
  setModelOpacity: (opacity: number) => void;
}

export interface HistoryState {
  past: AppState['features'][];  // 过去的状态
  future: AppState['features'][]; // 未来的状态
}

export interface MeshSettings {
    // 全局网格参数
    global_mesh_size: number;
    min_mesh_size: number;
    max_mesh_size: number;
    mesh_growth_rate: number;
    
    // 局部网格参数
    refinement_regions: {
        enabled: boolean;
        excavation_boundary_size: number;
        diaphragm_wall_size: number;
        strut_size: number;
        anchor_size: number;
    };
    
    // 网格质量参数
    quality_settings: {
        optimize_steps: number;
        min_quality: number;
        smooth_iterations: number;
        recombination: boolean;
    };
    
    // 高级设置
    advanced_settings: {
        algorithm: 'delaunay' | 'frontal' | 'hxt';
        dimension: '2D' | '3D';
        use_occ: boolean;
        parallel_meshing: boolean;
        thread_count: number;
    };
}

export interface MeshInfo {
    id: string;
    name: string;
    elementCount: number;
    nodeCount: number;
    quality: number;
    status: 'ready' | 'generating' | 'error' | 'none';
    visible: boolean;
    type: '2D' | '3D';
    algorithm: string;
    timestamp: Date;
}

export interface AnalysisSettings {
    analysis_type: 'static' | 'staged_construction' | 'seepage';
    num_steps: number;
    solver: 'direct' | 'iterative' | 'amg';
    nonlinear: boolean;
    gravity: boolean;
    initialStress: boolean;
}

// =================================================================================
// Store Interface
// =================================================================================

export interface AppState {
    features: AnyFeature[];
    selectedFeatureId: string | null;
    
    // 历史记录状态
    history: HistoryState;
    
    // Settings
    meshSettings: MeshSettings;
    meshes: MeshInfo[];
    selectedMeshId: string | null;
    isMeshGenerating: boolean;
    meshGenerationProgress: number;
    
    analysisSettings: AnalysisSettings;
    geologySettings: {
        algorithm: string;
        domain: { width: number; length: number; height: number; };
    };

    // Visualization State
    visualizationData: VisualizationData | null;
    activeScalarName: string;
    modelOpacity: number;
    isResultLoading: boolean;

    // UI State
    activeWorkbench: Workbench;
    activeModal: ModalType;
    pickingState: PickingState;

    // Viewport & Transient State
    transientObjects: THREE.Object3D[];
    viewportApi: ViewportHandles | null;

    // --- Actions ---
    addFeature: (feature: AnyFeature) => void;
    selectFeature: (id: string | null) => void;
    updateFeature: (featureId: string, updatedParams: Partial<AnyFeature['parameters']>) => void;
    deleteFeature: (featureId: string) => void;
    setFeatures: (features: AnyFeature[]) => void;
    
    // 撤销和重做操作
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    
    // 网格相关操作
    updateMeshSettings: (settings: Partial<MeshSettings>) => void;
    addMesh: (mesh: MeshInfo) => void;
    selectMesh: (id: string | null) => void;
    deleteMesh: (id: string) => void;
    toggleMeshVisibility: (id: string) => void;
    setMeshGenerating: (isGenerating: boolean) => void;
    updateMeshGenerationProgress: (progress: number) => void;
    
    // 分析相关操作
    updateAnalysisSettings: (settings: Partial<AnalysisSettings>) => void;
    setGeologySettings: (settings: AppState['geologySettings']) => void;

    // Visualization Actions
    setVisualizationData: (data: VisualizationData | null) => void;
    setActiveScalarName: (scalarName: string) => void;
    setModelOpacity: (opacity: number) => void;
    setIsResultLoading: (isLoading: boolean) => void;

    setActiveWorkbench: (workbench: Workbench) => void;
    openModal: (modal: NonNullable<ModalType>) => void;
    closeModal: () => void;

    startPicking: (onPick: (point: { x: number; y: number; z: number }) => void) => void;
    executePick: (point: { x: number; y: number; z: number }) => void;
    stopPicking: () => void;
    exitEditMode: () => void;
    
    setTransientObjects: (objects: THREE.Object3D[]) => void;
    clearTransientObjects: () => void;
    setViewportApi: (api: ViewportHandles | null) => void;
    
    // --- Selectors ---
    getSelectedFeature: () => AnyFeature | null;
    getFeatureById: (id: string) => AnyFeature | undefined;
    getSelectedMesh: () => MeshInfo | null;
}

// =================================================================================
// Store Implementation
// =================================================================================

const defaultMeshSettings: MeshSettings = {
    global_mesh_size: 5.0,
    min_mesh_size: 0.5,
    max_mesh_size: 20.0,
    mesh_growth_rate: 1.3,
    
    refinement_regions: {
        enabled: true,
        excavation_boundary_size: 1.0,
        diaphragm_wall_size: 0.5,
        strut_size: 0.8,
        anchor_size: 0.8,
    },
    
    quality_settings: {
        optimize_steps: 10,
        min_quality: 0.3,
        smooth_iterations: 5,
        recombination: true,
    },
    
    advanced_settings: {
        algorithm: 'delaunay',
        dimension: '3D',
        use_occ: true,
        parallel_meshing: true,
        thread_count: 4,
    }
};

export const useStore = create<AppState>((set, get) => ({
    // --- Initial State ---
    features: [],
    selectedFeatureId: null,
    
    // 初始化历史记录状态
    history: {
        past: [],
        future: []
    },
    
    meshSettings: defaultMeshSettings,
    meshes: [],
    selectedMeshId: null,
    isMeshGenerating: false,
    meshGenerationProgress: 0,
    
    analysisSettings: {
        analysis_type: 'static',
        num_steps: 1,
        solver: 'direct',
        nonlinear: false,
        gravity: true,
        initialStress: true,
    },
    geologySettings: {
        algorithm: 'GemPy',
        domain: { width: 504, length: 612, height: 53 },
    },

    visualizationData: null,
    activeScalarName: 'Displacement',
    modelOpacity: 1.0,
    isResultLoading: false,

    activeWorkbench: 'Modeling',
    activeModal: null,
    pickingState: {
        isActive: false,
        onPick: null,
    },

    transientObjects: [],
    viewportApi: null,

    // --- Action Implementations ---
    addFeature: (feature) => {
        const currentFeatures = get().features;
        set(produce(draft => {
            draft.features.push(feature);
            draft.history.past.push(currentFeatures);
            draft.history.future = [];
            draft.selectedFeatureId = feature.id;
        }));
    },

    selectFeature: (id) => set({ selectedFeatureId: id }),

    updateFeature: (featureId, updatedParams) => {
        set(produce(draft => {
            const feature = draft.features.find((f: AnyFeature) => f.id === featureId);
            if (feature) {
                const updatedFeature = produce(feature, draft => {
                    Object.assign(draft.parameters, updatedParams);
                });
                const index = get().features.findIndex(f => f.id === featureId);
                const newFeatures = [...get().features];
                newFeatures[index] = updatedFeature;
                set({ features: newFeatures });
            }
        }));
    },

    deleteFeature: (featureId) => {
        const currentFeatures = get().features;
        set(produce(draft => {
            draft.features = draft.features.filter((f: AnyFeature) => f.id !== featureId);
            draft.history.past.push(currentFeatures);
            draft.history.future = [];
            if (draft.selectedFeatureId === featureId) {
                draft.selectedFeatureId = null;
            }
        }));
    },
    
    setFeatures: (features) => set({ features: features }),
    
    // 撤销操作实现
    undo: () => {
        set(produce(draft => {
            const past = draft.history.past;
            if (past.length > 0) {
                const previousState = past.pop();
                draft.history.future.unshift(draft.features);
                draft.features = previousState;
                draft.selectedFeatureId = null;
            }
        }));
    },
    
    // 重做操作实现
    redo: () => {
        set(produce(draft => {
            const future = draft.history.future;
            if (future.length > 0) {
                const nextState = future.shift();
                draft.history.past.push(draft.features);
                draft.features = nextState;
                draft.selectedFeatureId = null;
            }
        }));
    },
    
    // 检查是否可以撤销
    canUndo: () => get().history.past.length > 0,
    
    // 检查是否可以重做
    canRedo: () => get().history.future.length > 0,

    // 网格相关操作
    updateMeshSettings: (settings) => {
        set(state => ({ 
            meshSettings: { 
                ...state.meshSettings, 
                ...settings,
                refinement_regions: {
                    ...state.meshSettings.refinement_regions,
                    ...(settings.refinement_regions || {})
                },
                quality_settings: {
                    ...state.meshSettings.quality_settings,
                    ...(settings.quality_settings || {})
                },
                advanced_settings: {
                    ...state.meshSettings.advanced_settings,
                    ...(settings.advanced_settings || {})
                }
            } 
        }));
    },
    
    addMesh: (mesh) => {
        set(state => ({ 
            meshes: [...state.meshes, mesh],
            selectedMeshId: mesh.id
        }));
    },
    
    selectMesh: (id) => set({ selectedMeshId: id }),
    
    deleteMesh: (id) => {
        set(state => ({
            meshes: state.meshes.filter(m => m.id !== id),
            selectedMeshId: state.selectedMeshId === id ? null : state.selectedMeshId
        }));
    },
    
    toggleMeshVisibility: (id) => {
        set(state => ({
            meshes: state.meshes.map(m => 
                m.id === id ? { ...m, visible: !m.visible } : m
            )
        }));
    },
    
    setMeshGenerating: (isGenerating) => set({ 
        isMeshGenerating: isGenerating,
        meshGenerationProgress: isGenerating ? 0 : 100
    }),
    
    updateMeshGenerationProgress: (progress) => set({ meshGenerationProgress: progress }),
    
    updateAnalysisSettings: (settings) => {
        set(state => ({ analysisSettings: { ...state.analysisSettings, ...settings } }));
    },

    setGeologySettings: (settings) => set({ geologySettings: settings }),
    
    // Visualization Actions
    setVisualizationData: (data: VisualizationData | null) => set({ visualizationData: data }),
    setActiveScalarName: (scalarName: string) => set({ activeScalarName: scalarName }),
    setModelOpacity: (opacity: number) => {
        set({ modelOpacity: opacity });
        get().viewportApi?.setModelOpacity(opacity);
    },
    setIsResultLoading: (isLoading: boolean) => set({ isResultLoading: isLoading }),

    // --- UI Actions ---
    setActiveWorkbench: (workbench) => set({ activeWorkbench: workbench }),
    openModal: (modal) => set({ activeModal: modal }),
    closeModal: () => set({ activeModal: null }),

    startPicking: (onPick) => {
        set({ pickingState: { isActive: true, onPick } });
    },

    executePick: (point) => {
        get().pickingState.onPick?.(point);
        set({ pickingState: { isActive: false, onPick: null } });
    },

    stopPicking: () => {
        set({ pickingState: { isActive: false, onPick: null } });
    },

    exitEditMode: () => {
        // 退出所有编辑模式
        set({ 
            pickingState: { isActive: false, onPick: null },
            selectedFeatureId: null,  // 取消选择
            activeModal: null,        // 关闭任何打开的模态框
        });
        console.log('已退出所有编辑模式');
    },
    
    setTransientObjects: (objects) => set({ transientObjects: objects }),

    clearTransientObjects: () => set({ transientObjects: [] }),

    setViewportApi: (api) => set({ viewportApi: api }),

    // --- Selector Implementations ---
    getSelectedFeature: () => {
        const { features, selectedFeatureId } = get();
        if (!selectedFeatureId) return null;
        return features.find((f: AnyFeature) => f.id === selectedFeatureId) || null;
    },

    getFeatureById: (id: string) => get().features.find((f: AnyFeature) => f.id === id),
    
    getSelectedMesh: () => {
        const { meshes, selectedMeshId } = get();
        if (!selectedMeshId) return null;
        return meshes.find(m => m.id === selectedMeshId) || null;
    },
    
    // 示例：一个更复杂的selector，用于过滤特定类型的features
    getFeaturesByType: (type: string) => {
        return get().features.filter((f: AnyFeature) => f.type === type);
    }
}));