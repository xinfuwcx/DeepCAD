import { create } from './zustand';
import { AnyFeature } from '../services/parametricAnalysisService';

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

// =================================================================================
// Store Interface
// =================================================================================

export interface AppState {
    features: AnyFeature[];
    selectedFeatureId: string | null;
    activeWorkbench: Workbench;
    activeTask: Task | null;
    activeModal: ModalType; // Manages which modal is open

    // --- Actions ---
    addFeature: (feature: AnyFeature) => void;
    selectFeature: (id: string | null) => void;
    updateFeature: (feature: AnyFeature) => void;
    
    setActiveWorkbench: (workbench: Workbench) => void;
    startTask: (type: AnyFeature['type'], parentId?: string) => void;
    cancelTask: () => void;
    
    openModal: (modal: NonNullable<ModalType>) => void;
    closeModal: () => void;

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
    activeTask: null,
    activeModal: null,

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

    // --- Selector Implementations ---
    getSelectedFeature: () => {
        const id = get().selectedFeatureId;
        return get().features.find(f => f.id === id) || null;
    },
})); 