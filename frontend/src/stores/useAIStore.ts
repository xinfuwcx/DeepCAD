import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIState {
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      isPanelOpen: false,
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
    }),
    { name: 'deepcad-ai-panel-v1' }
  )
);