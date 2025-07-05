import { create } from 'zustand';
import { AnyFeature } from '../services/parametricAnalysisService';
import * as THREE from 'three';

// =================================================================================
// Type Definitions
// =================================================================================

export type Workbench = 'Modeling' | 'Analysis' | 'Results';
export type ModalType = 'MeshSettings' | 'MaterialManager' | null;

export interface PickingState {
    isActive: boolean;
    onPick: ((point: { x: number; y: number; z: number }) => void) | null;
}

export interface ViewportHandles {
  addAnalysisMesh: (mesh: THREE.Object3D) => void;
  clearAnalysisMeshes: () => void;
  loadVtkResults: (url: string) => void;
}

export interface MeshSettings {
    global_mesh_size: number;
    refinement_level: number;
}

export interface AnalysisSettings {
    analysis_type: 'static' | 'staged_construction';
    num_steps: number;
}

// =================================================================================
// Store Interface
// =================================================================================

export interface AppState {
    features: AnyFeature[];
    selectedFeatureId: string | null;
    
    // Settings
    meshSettings: MeshSettings;
    analysisSettings: AnalysisSettings;
    geologySettings: {
        algorithm: string;
        domain: { width: number; length: number; height: number; };
    };

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
    
    updateMeshSettings: (settings: Partial<MeshSettings>) => void;
    updateAnalysisSettings: (settings: Partial<AnalysisSettings>) => void;
    setGeologySettings: (settings: AppState['geologySettings']) => void;

    setActiveWorkbench: (workbench: Workbench) => void;
    openModal: (modal: NonNullable<ModalType>) => void;
    closeModal: () => void;

    startPicking: (onPick: (point: { x: number; y: number; z: number }) => void) => void;
    executePick: (point: { x: number; y: number; z: number }) => void;
    stopPicking: () => void;
    
    setTransientObjects: (objects: THREE.Object3D[]) => void;
    clearTransientObjects: () => void;
    setViewportApi: (api: ViewportHandles | null) => void;
    
    // --- Selectors ---
    getSelectedFeature: () => AnyFeature | null;
    getFeatureById: (id: string) => AnyFeature | undefined;
}

// =================================================================================
// Store Implementation
// =================================================================================

export const useStore = create<AppState>((set, get) => ({
    // --- Initial State ---
    features: [],
    selectedFeatureId: null,
    
    meshSettings: {
        global_mesh_size: 25.0,
        refinement_level: 1,
    },
    analysisSettings: {
        analysis_type: 'static',
        num_steps: 1,
    },
    geologySettings: {
        algorithm: 'TIN',
        domain: { width: 100, length: 100, height: 50 },
    },

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
        set(state => ({ features: [...state.features, feature] }));
        get().selectFeature(feature.id);
    },

    selectFeature: (id) => set({ selectedFeatureId: id }),

    updateFeature: (featureId, updatedParams) => {
        set(state => ({
            features: state.features.map(f => 
                f.id === featureId 
                    ? { ...f, parameters: { ...f.parameters, ...updatedParams } } 
                    : f
            ) as AnyFeature[],
        }));
    },

    deleteFeature: (featureId) => {
        set(state => ({
            features: state.features.filter(f => f.id !== featureId),
            selectedFeatureId: get().selectedFeatureId === featureId ? null : get().selectedFeatureId,
        }));
    },
    
    setFeatures: (features) => set({ features: features }),

    updateMeshSettings: (settings) => {
        set(state => ({ meshSettings: { ...state.meshSettings, ...settings } }));
    },
    
    updateAnalysisSettings: (settings) => {
        set(state => ({ analysisSettings: { ...state.analysisSettings, ...settings } }));
    },

    setGeologySettings: (settings) => set({ geologySettings: settings }),
    
    setActiveWorkbench: (workbench) => set({ activeWorkbench: workbench, selectedFeatureId: null }),
    
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
    
    setTransientObjects: (objects) => set({ transientObjects: objects }),

    clearTransientObjects: () => set({ transientObjects: [] }),

    setViewportApi: (api) => set({ viewportApi: api }),

    // --- Selector Implementations ---
    getSelectedFeature: () => {
        const id = get().selectedFeatureId;
        return get().features.find(f => f.id === id) || null;
    },

    getFeatureById: (id: string) => get().features.find(f => f.id === id),
}));