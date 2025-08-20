import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the types for our domain data.
// These would be expanded with actual types for geometry, mesh, results, etc.
interface GeometryData {
  // Placeholder for geometry data structure
  id: string;
  name: string;
  // ... other properties
}

// Definition for a long-running task
export type TaskStatus = 'running' | 'completed' | 'failed';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number; // 0 to 100
  createdAt: number; // timestamp
}

interface DomainState {
  projectName: string;
  geometry: GeometryData | null;
  tasks: Task[];
  
  setProjectName: (name: string) => void;
  setGeometry: (data: GeometryData) => void;
  clearGeometry: () => void;

  // Task management actions
  addTask: (task: Omit<Task, 'createdAt'>) => void;
  updateTask: (taskId: string, updates: Partial<Pick<Task, 'status' | 'progress'>>) => void;
  removeTask: (taskId: string) => void;
  clearCompletedTasks: () => void;
}

/**
 * Zustand store for managing core application domain data.
 * This includes geometry, meshing, analysis results, and tasks.
 */
export const useDomainStore = create<DomainState>()(
  persist(
    (set) => ({
      // Initial State
      projectName: 'New Project',
      geometry: null,
      tasks: [],

      // Actions
      setProjectName: (name) => set({ projectName: name }),
      setGeometry: (data) => set({ geometry: data }),
      clearGeometry: () => set({ geometry: null }),

      // Task management
      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, { ...task, createdAt: Date.now() }],
      })),

      updateTask: (taskId, updates) => set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      })),

      removeTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
      })),

      clearCompletedTasks: () => set((state) => ({
        tasks: state.tasks.filter((task) => task.status === 'running'),
      })),
    }),
    {
      name: 'deepcad-domain-v1',
      // Persist only serializable user data
      partialize: (state) => ({
        projectName: state.projectName,
        geometry: state.geometry,
        tasks: state.tasks,
      }),
      version: 1,
    }
  )
);