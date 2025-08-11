import { create } from 'zustand';

/**
 * controlCenterStore
 * 持久化: 搜索 / 状态过滤 / 风险过滤 / 选中项目 / UI开关
 * 统一: Deck.gl 与 EpicGlobe 之间的选中同步 & 过滤条件共享
 */
interface ControlCenterState {
  searchTerm: string;
  statusFilter: string; // 'all' | status
  riskFilter: string;   // 'all' | risk
  selectedProjectId: string | null;
  showWeatherPanel: boolean;
  showProjectDetails: boolean;
  setSearchTerm: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setRiskFilter: (v: string) => void;
  setSelectedProjectId: (id: string | null) => void;
  setShowWeatherPanel: (v: boolean) => void;
  setShowProjectDetails: (v: boolean) => void;
  hydrate: () => void; // 允许显式重新加载
}

const LS_KEY = 'deepcad_control_center_state_v1';

function loadInitial(): Partial<ControlCenterState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export const useControlCenterStore = create<ControlCenterState>((set) => ({
  searchTerm: '',
  statusFilter: 'all',
  riskFilter: 'all',
  selectedProjectId: null,
  showWeatherPanel: true,
  showProjectDetails: false,
  setSearchTerm: (v) => { set({ searchTerm: v }); persist(); },
  setStatusFilter: (v) => { set({ statusFilter: v }); persist(); },
  setRiskFilter: (v) => { set({ riskFilter: v }); persist(); },
  setSelectedProjectId: (id) => { set({ selectedProjectId: id }); persist(); },
  setShowWeatherPanel: (v) => { set({ showWeatherPanel: v }); persist(); },
  setShowProjectDetails: (v) => { set({ showProjectDetails: v }); persist(); },
  hydrate: () => { set(loadInitial() as any); }
}));

function persist() {
  try {
    const { searchTerm, statusFilter, riskFilter, selectedProjectId, showWeatherPanel, showProjectDetails } = useControlCenterStore.getState();
    localStorage.setItem(LS_KEY, JSON.stringify({ searchTerm, statusFilter, riskFilter, selectedProjectId, showWeatherPanel, showProjectDetails }));
  } catch {}
}

// 初始加载
try {
  const init = loadInitial();
  if (Object.keys(init).length) {
    useControlCenterStore.setState(init as any, true);
  }
} catch {}

export const controlCenterState = {
  get: () => useControlCenterStore.getState(),
  setSelected: (id: string | null) => useControlCenterStore.getState().setSelectedProjectId(id)
};
