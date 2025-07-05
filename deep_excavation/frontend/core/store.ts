import { create } from './zustand';
import { AnyFeature } from '../services/parametricAnalysisService';

// =================================================================================
// Type Definitions
// =================================================================================

export type Workbench = 'Modeling' | 'Analysis' | 'Results';
export type ModalType = 'MeshSettings' | 'MaterialManager' | null;

export interface PickingState {
    isActive: boolean;
    onPick: ((point: { x: number; y: number; z: number }) => void) | null;
}

// FEABench Fusion: Add settings models to the store
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
    
    activeWorkbench: Workbench;
    activeModal: ModalType;
    pickingState: PickingState;

    // FEABench Fusion: Add settings to state
    meshSettings: MeshSettings;
    analysisSettings: AnalysisSettings;

    // --- Actions ---
    addFeature: (feature: AnyFeature) => void;
    selectFeature: (id: string | null) => void;
    updateFeature: (featureId: string, updatedParams: Partial<AnyFeature['parameters']>) => void;
    deleteFeature: (featureId: string) => void;
    
    setActiveWorkbench: (workbench: Workbench) => void;
    
    openModal: (modal: NonNullable<ModalType>) => void;
    closeModal: () => void;

    startPicking: (onPick: (point: { x: number; y: number; z: number }) => void) => void;
    executePick: (point: { x: number; y: number; z: number }) => void;
    stopPicking: () => void;

    // FEABench Fusion: Add settings update actions
    updateMeshSettings: (settings: Partial<MeshSettings>) => void;
    updateAnalysisSettings: (settings: Partial<AnalysisSettings>) => void;

    // --- Selectors ---
    getSelectedFeature: () => AnyFeature | null;
}

// =================================================================================
// Store Implementation
// =================================================================================

export const useStore = create<AppState>((set, get) => ({
    // --- Initial State ---
    features: [],
    selectedFeatureId: null,
    activeWorkbench: 'Modeling',
    activeModal: null,
    pickingState: {
        isActive: false,
        onPick: null,
    },
    // FEABench Fusion: Initialize settings state
    meshSettings: {
        global_mesh_size: 25.0,
        refinement_level: 1,
    },
    analysisSettings: {
        analysis_type: 'static',
        num_steps: 1,
    },

    // --- Action Implementations ---
    addFeature: (feature) => {
        set(state => ({ features: [...state.features, feature] }));
        get().selectFeature(feature.id);
    },

    selectFeature: (id) => set({ selectedFeatureId: id }),

    updateFeature: (featureId, updatedParams) => {
        set(state => ({
            features: state.features.map(f => {
                if (f.id === featureId) {
                    const newFeature = { 
                        ...f, 
                        parameters: { ...f.parameters, ...updatedParams } 
                    };
                    return newFeature as any;
                }
                return f;
            }),
        }));
    },

    deleteFeature: (featureId) => {
        set(state => ({
            features: state.features.filter(f => f.id !== featureId),
            selectedFeatureId: get().selectedFeatureId === featureId ? null : get().selectedFeatureId,
        }));
    },
    
    setActiveWorkbench: (workbench) => set({ activeWorkbench: workbench, selectedFeatureId: null }),
    
    openModal: (modal) => set({ activeModal: modal }),
    
    closeModal: () => set({ activeModal: null }),

    startPicking: (onPick) => {
        set({ pickingState: { isActive: true, onPick } });
    },

    executePick: (point) => {
        const onPick = get().pickingState.onPick;
        if (onPick) {
            onPick(point);
        }
        set({ pickingState: { isActive: false, onPick: null } });
    },

    stopPicking: () => {
        set({ pickingState: { isActive: false, onPick: null } });
    },

    // FEABench Fusion: Implement settings update actions
    updateMeshSettings: (settings) => {
        set(state => ({ meshSettings: { ...state.meshSettings, ...settings } }));
    },
    updateAnalysisSettings: (settings) => {
        set(state => ({ analysisSettings: { ...state.analysisSettings, ...settings } }));
    },

    // --- Selector Implementations ---
    getSelectedFeature: () => {
        const id = get().selectedFeatureId;
        return get().features.find(f => f.id === id) || null;
    },
})); 