import { create } from 'zustand';
import { AnyFeature, Point3D } from '../services/parametricAnalysisService';
import * as THREE from 'three';

// =================================================================================
// Type Definitions
// =================================================================================

export type Workbench = 'Modeling' | 'Analysis';

// The type of the "right-hand panel" task
export type TaskType = 'CreateBox' | 'CreateSketch' | 'Extrude';

// The type of the currently open modal
export type ModalType = 'MeshSettings' | 'MaterialManager' | 'ConstraintEditor' | 'LoadEditor' | null;

// A task is defined by the type of the feature it's intended to create.
export interface Task {
    type: AnyFeature['type']; // e.g., 'CreateBox', 'CreateSketch'
    parentId?: string;
}

// State for interactive picking in the viewport
export interface PickingState {
    isActive: boolean;
    // The callback to run when a point is picked.
    onPick: ((point: Point3D) => void) | null;
}

export interface MeshSettings {
    max_area: number;
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
    meshSettings: MeshSettings;
    analysisSettings: AnalysisSettings | null;
    geologySettings: {
        algorithm: string;
        domain: { width: number; length: number; height: number; };
    };
    transientObjects: THREE.Object3D[];
    selectedFeatureId: string | null;
    activeWorkbench: Workbench;
    activeTask: Task | null;
    activeModal: string | null;
    pickingState: PickingState; // Add picking state to the store

    // --- Actions ---
    addFeature: (feature: AnyFeature) => void;
    selectFeature: (id: string | null) => void;
    updateFeature: (feature: AnyFeature) => void;
    deleteFeature: (featureId: string) => void;
    setFeatures: (features: AnyFeature[]) => void;
    updateMeshSettings: (settings: Partial<MeshSettings>) => void;
    updateAnalysisSettings: (settings: Partial<AnalysisSettings>) => void;
    setGeologySettings: (settings: AppState['geologySettings']) => void;
    setTransientObjects: (objects: THREE.Object3D[]) => void;
    clearTransientObjects: () => void;
    setActiveWorkbench: (workbench: Workbench) => void;
    startTask: (type: AnyFeature['type'], parentId?: string) => void;
    cancelTask: () => void;
    openModal: (modal: string) => void;
    closeModal: () => void;
    // Picking actions
    startPicking: (onPick: (point: Point3D) => void) => void;
    stopPicking: () => void;
    executePick: (point: Point3D) => void;

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
    meshSettings: { max_area: 10.0, refinement_level: 1 },
    analysisSettings: null,
    geologySettings: {
        algorithm: 'TIN',
        domain: { width: 100, length: 100, height: 50 },
    },
    transientObjects: [],
    selectedFeatureId: null,
    activeWorkbench: 'Modeling',
    activeTask: null,
    activeModal: null,
    pickingState: {
        isActive: false,
        onPick: null,
    },

    // --- Action Implementations ---
    addFeature: (feature) => {
        set(state => ({ features: [...state.features, feature] }));
        set({ activeTask: null, selectedFeatureId: feature.id });
    },

    selectFeature: (id) => set({ selectedFeatureId: id, activeTask: null }),

    updateFeature: (featureToUpdate) => {
        set(state => ({
            features: state.features.map(f => f.id === featureToUpdate.id ? featureToUpdate : f),
        }));
    },
    
    setActiveWorkbench: (workbench) => set({ activeWorkbench: workbench, selectedFeatureId: null, activeTask: null }),
    
    startTask: (type, parentId) => set({ activeTask: { type, parentId } }),
    
    cancelTask: () => set({ activeTask: null }),
    
    openModal: (modal) => set({ activeModal: modal }),
    
    closeModal: () => set({ activeModal: null }),

    // Picking action implementations
    startPicking: (onPickCallback) => {
        set({
            pickingState: {
                isActive: true,
                onPick: onPickCallback,
            },
        });
    },

    stopPicking: () => {
        set({
            pickingState: {
                isActive: false,
                onPick: null,
            },
        });
    },

    executePick: (point) => {
        const { pickingState } = get();
        if (pickingState.isActive && pickingState.onPick) {
            pickingState.onPick(point);
        }
    },

    deleteFeature: (featureId) => set(state => ({ features: state.features.filter(f => f.id !== featureId) })),

    setFeatures: (features) => set({ features: features }),

    updateMeshSettings: (settings) => set(state => ({ meshSettings: { ...state.meshSettings, ...settings } })),

    updateAnalysisSettings: (settings) => set(state => ({ analysisSettings: state.analysisSettings ? { ...state.analysisSettings, ...settings } : settings as AnalysisSettings })),

    setGeologySettings: (settings) => set({ geologySettings: settings }),

    setTransientObjects: (objects) => set({ transientObjects: objects }),

    clearTransientObjects: () => set({ transientObjects: [] }),

    // --- Selector Implementations ---
    getSelectedFeature: () => {
        const id = get().selectedFeatureId;
        return get().features.find(f => f.id === id) || null;
    },

    getFeatureById: (id: string) => get().features.find(f => f.id === id),
})); 