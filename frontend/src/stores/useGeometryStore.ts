/**
 * 几何模块全局状态管理
 * 1号架构师 - 响应2号几何专家集成需求
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  GeometryData, 
  MaterialZone, 
  GeometryToMeshData,
  MeshQualityFeedback,
  InterfaceValidator 
} from '../core/InterfaceProtocol';
import { ComponentDevHelper } from '../utils/developmentTools';

// 几何模块状态接口
interface GeometryState {
  // 几何数据
  geometries: Map<string, GeometryData>;
  selectedGeometryIds: string[];
  
  // 材料分区
  materialZones: Map<string, MaterialZone>;
  activeMaterialZone: string | null;
  
  // 网格数据
  meshData: GeometryToMeshData | null;
  lastMeshQuality: MeshQualityFeedback | null;
  
  // 状态标志
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastError: string | null;
  
  // 操作历史 (用于撤销/重做)
  history: {
    geometries: GeometryData[];
    materialZones: MaterialZone[];
  }[];
  historyIndex: number;
  maxHistorySize: number;
}

// 几何模块操作接口
interface GeometryActions {
  // 几何数据管理
  addGeometry: (geometry: GeometryData) => void;
  updateGeometry: (id: string, geometry: Partial<GeometryData>) => void;
  removeGeometry: (id: string) => void;
  selectGeometry: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  
  // 材料分区管理
  addMaterialZone: (zone: MaterialZone) => void;
  updateMaterialZone: (id: string, zone: Partial<MaterialZone>) => void;
  removeMaterialZone: (id: string) => void;
  setActiveMaterialZone: (id: string | null) => void;
  
  // 网格数据管理
  generateMeshData: () => GeometryToMeshData | null;
  updateMeshQuality: (feedback: MeshQualityFeedback) => void;
  
  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markUnsaved: () => void;
  markSaved: () => void;
  
  // 历史操作
  saveToHistory: () => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // 数据验证和清理
  validateAllData: () => boolean;
  reset: () => void;
}

type GeometryStore = GeometryState & GeometryActions;

// 初始状态
const initialState: GeometryState = {
  geometries: new Map(),
  selectedGeometryIds: [],
  materialZones: new Map(),
  activeMaterialZone: null,
  meshData: null,
  lastMeshQuality: null,
  isLoading: false,
  hasUnsavedChanges: false,
  lastError: null,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

// 创建几何状态管理器
export const useGeometryStore = create<GeometryStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // 添加几何体
      addGeometry: (geometry: GeometryData) => {
        set((state) => {
          // 数据验证
          if (!InterfaceValidator.validateGeometryData(geometry)) {
            state.lastError = '几何数据格式无效';
            ComponentDevHelper.logError(new Error('Invalid geometry data'), '几何数据验证', '1号架构师');
            return;
          }

          // 检查ID冲突
          if (state.geometries.has(geometry.id)) {
            state.lastError = `几何体ID冲突: ${geometry.id}`;
            return;
          }

          // 添加到状态
          state.geometries.set(geometry.id, geometry);
          state.hasUnsavedChanges = true;
          state.lastError = null;
          
          ComponentDevHelper.logDevTip(`几何体已添加: ${geometry.id} (${geometry.type})`);
        });
        
        // 自动保存历史
        get().saveToHistory();
      },

      // 更新几何体
      updateGeometry: (id: string, geometryUpdate: Partial<GeometryData>) => {
        set((state) => {
          const existing = state.geometries.get(id);
          if (!existing) {
            state.lastError = `几何体不存在: ${id}`;
            return;
          }

          const updated = { ...existing, ...geometryUpdate };
          
          // 验证更新后的数据
          if (!InterfaceValidator.validateGeometryData(updated)) {
            state.lastError = '更新后的几何数据格式无效';
            return;
          }

          state.geometries.set(id, updated);
          state.hasUnsavedChanges = true;
          state.lastError = null;
        });
        
        get().saveToHistory();
      },

      // 删除几何体
      removeGeometry: (id: string) => {
        set((state) => {
          if (!state.geometries.has(id)) {
            state.lastError = `几何体不存在: ${id}`;
            return;
          }

          state.geometries.delete(id);
          
          // 从选择中移除
          const index = state.selectedGeometryIds.indexOf(id);
          if (index > -1) {
            state.selectedGeometryIds.splice(index, 1);
          }
          
          state.hasUnsavedChanges = true;
          state.lastError = null;
          
          ComponentDevHelper.logDevTip(`几何体已删除: ${id}`);
        });
        
        get().saveToHistory();
      },

      // 选择几何体
      selectGeometry: (id: string, multiSelect = false) => {
        set((state) => {
          if (!state.geometries.has(id)) {
            state.lastError = `几何体不存在: ${id}`;
            return;
          }

          if (multiSelect) {
            const index = state.selectedGeometryIds.indexOf(id);
            if (index > -1) {
              state.selectedGeometryIds.splice(index, 1);
            } else {
              state.selectedGeometryIds.push(id);
            }
          } else {
            state.selectedGeometryIds = [id];
          }
          
          state.lastError = null;
        });
      },

      // 清除选择
      clearSelection: () => {
        set((state) => {
          state.selectedGeometryIds = [];
        });
      },

      // 添加材料分区
      addMaterialZone: (zone: MaterialZone) => {
        set((state) => {
          if (!InterfaceValidator.validateMaterialZone(zone)) {
            state.lastError = '材料分区数据格式无效';
            return;
          }

          if (state.materialZones.has(zone.id)) {
            state.lastError = `材料分区ID冲突: ${zone.id}`;
            return;
          }

          state.materialZones.set(zone.id, zone);
          state.hasUnsavedChanges = true;
          state.lastError = null;
          
          ComponentDevHelper.logDevTip(`材料分区已添加: ${zone.name}`);
        });
        
        get().saveToHistory();
      },

      // 更新材料分区
      updateMaterialZone: (id: string, zoneUpdate: Partial<MaterialZone>) => {
        set((state) => {
          const existing = state.materialZones.get(id);
          if (!existing) {
            state.lastError = `材料分区不存在: ${id}`;
            return;
          }

          const updated = { ...existing, ...zoneUpdate };
          
          if (!InterfaceValidator.validateMaterialZone(updated)) {
            state.lastError = '更新后的材料分区数据格式无效';
            return;
          }

          state.materialZones.set(id, updated);
          state.hasUnsavedChanges = true;
          state.lastError = null;
        });
        
        get().saveToHistory();
      },

      // 删除材料分区
      removeMaterialZone: (id: string) => {
        set((state) => {
          if (!state.materialZones.has(id)) {
            state.lastError = `材料分区不存在: ${id}`;
            return;
          }

          state.materialZones.delete(id);
          
          if (state.activeMaterialZone === id) {
            state.activeMaterialZone = null;
          }
          
          state.hasUnsavedChanges = true;
          state.lastError = null;
        });
        
        get().saveToHistory();
      },

      // 设置活动材料分区
      setActiveMaterialZone: (id: string | null) => {
        set((state) => {
          if (id && !state.materialZones.has(id)) {
            state.lastError = `材料分区不存在: ${id}`;
            return;
          }

          state.activeMaterialZone = id;
          state.lastError = null;
        });
      },

      // 生成网格数据 - 供3号计算专家使用
      generateMeshData: (): GeometryToMeshData | null => {
        const state = get();
        
        if (state.geometries.size === 0) {
          set((draft) => {
            draft.lastError = '没有几何数据可用于网格生成';
          });
          return null;
        }

        try {
          const meshData: GeometryToMeshData = {
            geometry: Array.from(state.geometries.values()),
            materialZones: Array.from(state.materialZones.values()),
            meshSettings: {
              globalSize: 1.0, // 默认全局尺寸
              algorithm: 'delaunay',
              optimization: true,
              qualityThreshold: 0.8
            },
            qualityRequirements: {
              minAspectRatio: 0.1,
              maxSkewness: 0.8,
              minOrthogonality: 0.1
            }
          };

          set((draft) => {
            draft.meshData = meshData;
            draft.lastError = null;
          });

          ComponentDevHelper.logDevTip(`网格数据已生成: ${meshData.geometry.length}个几何体, ${meshData.materialZones.length}个材料分区`);
          return meshData;

        } catch (error) {
          set((draft) => {
            draft.lastError = `网格数据生成失败: ${error}`;
          });
          ComponentDevHelper.logError(error as Error, '网格数据生成', '1号架构师');
          return null;
        }
      },

      // 更新网格质量反馈 - 来自3号计算专家
      updateMeshQuality: (feedback: MeshQualityFeedback) => {
        set((state) => {
          if (!InterfaceValidator.validateMeshQualityFeedback(feedback)) {
            state.lastError = '网格质量反馈数据格式无效';
            return;
          }

          state.lastMeshQuality = feedback;
          state.lastError = null;
          
          ComponentDevHelper.logDevTip(`网格质量反馈已更新: 平均质量${feedback.overall.averageQuality.toFixed(2)}`);
        });
      },

      // 状态管理
      setLoading: (loading: boolean) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setError: (error: string | null) => {
        set((state) => {
          state.lastError = error;
        });
      },

      markUnsaved: () => {
        set((state) => {
          state.hasUnsavedChanges = true;
        });
      },

      markSaved: () => {
        set((state) => {
          state.hasUnsavedChanges = false;
        });
      },

      // 保存到历史记录
      saveToHistory: () => {
        set((state) => {
          const currentSnapshot = {
            geometries: Array.from(state.geometries.values()),
            materialZones: Array.from(state.materialZones.values())
          };

          // 移除历史索引之后的项目（重做分支）
          state.history = state.history.slice(0, state.historyIndex + 1);
          
          // 添加新的历史记录
          state.history.push(currentSnapshot);
          state.historyIndex = state.history.length - 1;

          // 限制历史记录大小
          if (state.history.length > state.maxHistorySize) {
            state.history.shift();
            state.historyIndex--;
          }
        });
      },

      // 撤销操作
      undo: (): boolean => {
        const state = get();
        if (!state.canUndo()) return false;

        set((draft) => {
          draft.historyIndex--;
          const snapshot = draft.history[draft.historyIndex];
          
          // 恢复几何数据
          draft.geometries.clear();
          snapshot.geometries.forEach(geo => {
            draft.geometries.set(geo.id, geo);
          });
          
          // 恢复材料分区
          draft.materialZones.clear();
          snapshot.materialZones.forEach(zone => {
            draft.materialZones.set(zone.id, zone);
          });

          draft.hasUnsavedChanges = true;
        });

        ComponentDevHelper.logDevTip('执行撤销操作');
        return true;
      },

      // 重做操作
      redo: (): boolean => {
        const state = get();
        if (!state.canRedo()) return false;

        set((draft) => {
          draft.historyIndex++;
          const snapshot = draft.history[draft.historyIndex];
          
          // 恢复几何数据
          draft.geometries.clear();
          snapshot.geometries.forEach(geo => {
            draft.geometries.set(geo.id, geo);
          });
          
          // 恢复材料分区
          draft.materialZones.clear();
          snapshot.materialZones.forEach(zone => {
            draft.materialZones.set(zone.id, zone);
          });

          draft.hasUnsavedChanges = true;
        });

        ComponentDevHelper.logDevTip('执行重做操作');
        return true;
      },

      // 检查是否可以撤销
      canUndo: (): boolean => {
        const state = get();
        return state.historyIndex > 0;
      },

      // 检查是否可以重做
      canRedo: (): boolean => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      // 验证所有数据
      validateAllData: (): boolean => {
        const state = get();
        let isValid = true;
        const errors: string[] = [];

        // 验证几何数据
        for (const [id, geometry] of state.geometries) {
          if (!InterfaceValidator.validateGeometryData(geometry)) {
            errors.push(`几何体 ${id} 数据无效`);
            isValid = false;
          }
        }

        // 验证材料分区
        for (const [id, zone] of state.materialZones) {
          if (!InterfaceValidator.validateMaterialZone(zone)) {
            errors.push(`材料分区 ${id} 数据无效`);
            isValid = false;
          }
        }

        if (!isValid) {
          set((draft) => {
            draft.lastError = errors.join('; ');
          });
          ComponentDevHelper.logError(new Error(errors.join('; ')), '数据验证', '1号架构师');
        }

        return isValid;
      },

      // 重置状态
      reset: () => {
        set(() => ({ ...initialState }));
        ComponentDevHelper.logDevTip('几何状态已重置');
      },
    }))
  )
);

// 订阅状态变化，用于调试和监控
useGeometryStore.subscribe(
  (state) => state.hasUnsavedChanges,
  (hasUnsavedChanges) => {
    if (hasUnsavedChanges) {
      ComponentDevHelper.logDevTip('几何数据有未保存的更改');
    }
  }
);

// 订阅错误状态
useGeometryStore.subscribe(
  (state) => state.lastError,
  (error) => {
    if (error) {
      ComponentDevHelper.logError(new Error(error), '几何状态管理', '1号架构师');
    }
  }
);

console.log('🗃️ 几何模块状态管理已建立 - 1号架构师为2号几何专家提供的全局状态集成');