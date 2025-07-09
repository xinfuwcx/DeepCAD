import { create } from 'zustand';

// Define the types for our domain data.
// These would be expanded with actual types for geometry, mesh, results, etc.
interface GeometryData {
  // Placeholder for geometry data structure
  id: string;
  name: string;
  // ... other properties
}

interface DomainState {
  projectName: string;
  geometry: GeometryData | null;
  
  setProjectName: (name: string) => void;
  setGeometry: (data: GeometryData) => void;
  clearGeometry: () => void;
}

/**
 * Zustand store for managing core application domain data.
 * This includes geometry, meshing, analysis results, etc.
 */
export const useDomainStore = create<DomainState>((set) => ({
  // Initial State
  projectName: 'New Project',
  geometry: null,

  // Actions
  setProjectName: (name) => set({ projectName: name }),
  setGeometry: (data) => set({ geometry: data }),
  clearGeometry: () => set({ geometry: null }),
})); 