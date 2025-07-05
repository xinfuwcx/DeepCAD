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

// =================================================================================
// Store Interface
// =================================================================================

export interface AppState {
    features: AnyFeature[];
    selectedFeatureId: string | null;
    
    activeWorkbench: Workbench;
    activeModal: ModalType;
    pickingState: PickingState;

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

    // --- Selector Implementations ---
    getSelectedFeature: () => {
        const id = get().selectedFeatureId;
        return get().features.find(f => f.id === id) || null;
    },
})); 