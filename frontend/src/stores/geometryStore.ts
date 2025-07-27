/**
 * 几何模块状态管理
 * 1号架构师 - 几何建模专用Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GeometryState, GeometryParams, GeometryData, SystemError, ProgressInfo } from './types';

interface GeometryActions {
  // 参数操作
  updateParams: (params: Partial<GeometryParams>) => void;
  resetParams: () => void;
  loadParamsFromPreset: (presetName: string) => void;
  
  // 几何生成
  generateGeometry: () => Promise<void>;
  cancelGeneration: () => void;
  regenerateGeometry: () => Promise<void>;
  
  // 数据操作
  setGeometryData: (data: GeometryData) => void;
  clearGeometryData: () => void;
  updateGeometryData: (updates: Partial<GeometryData>) => void;
  
  // 质量分析
  analyzeQuality: () => Promise<void>;
  optimizeGeometry: () => Promise<void>;
  
  // 错误处理
  addError: (error: Omit<SystemError, 'id' | 'timestamp'>) => void;
  clearErrors: () => void;
  resolveError: (errorId: string) => void;
  
  // 进度更新
  updateProgress: (progress: Partial<ProgressInfo>) => void;
  resetProgress: () => void;
  
  // 历史操作
  addToHistory: (action: string, params: Partial<GeometryParams>) => void;
  undoLastAction: () => void;
  clearHistory: () => void;
  
  // 状态管理
  setStatus: (status: GeometryState['status']) => void;
  reset: () => void;
}

// 默认参数配置
const defaultParams: GeometryParams = {
  excavationDepth: 10.0,
  excavationWidth: 30.0,
  excavationLength: 50.0,
  
  soilLayers: [
    {
      id: 'layer_1',
      name: '填土层',
      depth: 3.0,
      properties: {
        density: 1800,
        cohesion: 15,
        friction: 25,
        elasticModulus: 8000,
        poissonRatio: 0.35
      }
    },
    {
      id: 'layer_2', 
      name: '粉质粘土层',
      depth: 7.0,
      properties: {
        density: 1900,
        cohesion: 25,
        friction: 18,
        elasticModulus: 12000,
        poissonRatio: 0.3
      }
    }
  ],
  
  supportStructures: [],
  
  meshSize: 2.0,
  qualityThreshold: 0.65,
  optimizationEnabled: true
};

// 初始状态
const initialState: GeometryState = {
  params: defaultParams,
  data: null,
  status: 'idle',
  progress: { current: 0, total: 100, percentage: 0 },
  errors: [],
  quality: null,
  history: []
};

// Store定义
export const useGeometryStore = create<GeometryState & GeometryActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // ==================== 参数操作 ====================
        
        updateParams: (params) => {
          set((state) => {
            const oldParams = { ...state.params };
            Object.assign(state.params, params);
            
            // 添加到历史记录
            state.history.push({
              id: `action_${Date.now()}`,
              action: 'update_params',
              timestamp: Date.now(),
              params: oldParams
            });
            
            // 参数变化时重置数据和质量分析
            state.data = null;
            state.quality = null;
            state.status = 'idle';
            state.progress = { current: 0, total: 100, percentage: 0 };
          });
        },

        resetParams: () => {
          set((state) => {
            state.params = { ...defaultParams };
            state.data = null;
            state.quality = null;
            state.status = 'idle';
            state.progress = { current: 0, total: 100, percentage: 0 };
            state.errors = [];
          });
        },

        loadParamsFromPreset: (presetName) => {
          // 预设参数库
          const presets: Record<string, Partial<GeometryParams>> = {
            'simple_excavation': {
              excavationDepth: 5.0,
              excavationWidth: 20.0,
              excavationLength: 30.0,
              meshSize: 1.5
            },
            'deep_excavation': {
              excavationDepth: 15.0,
              excavationWidth: 40.0,
              excavationLength: 60.0,
              meshSize: 2.5
            },
            'complex_excavation': {
              excavationDepth: 20.0,
              excavationWidth: 80.0,
              excavationLength: 120.0,
              meshSize: 3.0
            }
          };
          
          const preset = presets[presetName];
          if (preset) {
            get().updateParams(preset);
          }
        },

        // ==================== 几何生成 ====================
        
        generateGeometry: async () => {
          const state = get();
          
          try {
            set((state) => {
              state.status = 'running';
              state.progress = { current: 0, total: 100, percentage: 0 };
              state.errors = [];
            });

            // 模拟几何生成过程
            for (let i = 0; i <= 100; i += 10) {
              await new Promise(resolve => setTimeout(resolve, 200));
              
              set((state) => {
                state.progress = {
                  current: i,
                  total: 100,
                  percentage: i,
                  message: i < 30 ? '生成土层网格...' :
                          i < 60 ? '创建支护结构...' :
                          i < 90 ? '优化网格质量...' : '完成几何建模'
                };
              });
            }

            // 生成模拟数据
            const mockData: GeometryData = {
              nodes: Array.from({ length: 1000 }, (_, i) => ({
                id: `node_${i}`,
                x: Math.random() * state.params.excavationWidth,
                y: Math.random() * state.params.excavationLength,
                z: Math.random() * state.params.excavationDepth
              })),
              elements: Array.from({ length: 500 }, (_, i) => ({
                id: `element_${i}`,
                nodeIds: [`node_${i*2}`, `node_${i*2+1}`, `node_${i*2+2}`, `node_${i*2+3}`],
                materialId: `material_${Math.floor(i / 100)}`
              })),
              materials: state.params.soilLayers.map(layer => ({
                id: `material_${layer.id}`,
                name: layer.name,
                properties: layer.properties
              })),
              boundaryConditions: [],
              loads: []
            };

            set((state) => {
              state.data = mockData;
              state.status = 'completed';
              state.progress.message = '几何建模完成';
            });

            // 自动进行质量分析
            await get().analyzeQuality();

          } catch (error) {
            set((state) => {
              state.status = 'error';
              state.errors.push({
                id: `error_${Date.now()}`,
                level: 'error',
                module: 'geometry',
                message: error instanceof Error ? error.message : '几何生成失败',
                timestamp: Date.now()
              });
            });
          }
        },

        cancelGeneration: () => {
          set((state) => {
            state.status = 'cancelled';
            state.progress.message = '生成已取消';
          });
        },

        regenerateGeometry: async () => {
          get().clearGeometryData();
          await get().generateGeometry();
        },

        // ==================== 数据操作 ====================
        
        setGeometryData: (data) => {
          set((state) => {
            state.data = data;
            state.status = 'completed';
          });
        },

        clearGeometryData: () => {
          set((state) => {
            state.data = null;
            state.quality = null;
            state.status = 'idle';
            state.progress = { current: 0, total: 100, percentage: 0 };
          });
        },

        updateGeometryData: (updates) => {
          set((state) => {
            if (state.data) {
              Object.assign(state.data, updates);
            }
          });
        },

        // ==================== 质量分析 ====================
        
        analyzeQuality: async () => {
          const state = get();
          if (!state.data) return;

          try {
            set((state) => {
              state.progress.message = '分析几何质量...';
            });

            // 模拟质量分析
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockQuality = {
              score: 0.85,
              distribution: {
                excellent: 0.3,
                good: 0.5,
                acceptable: 0.15,
                poor: 0.05
              },
              issues: [
                { type: 'aspect_ratio', count: 12, severity: 'warning' },
                { type: 'skewness', count: 3, severity: 'error' }
              ]
            };

            set((state) => {
              state.quality = mockQuality;
              state.progress.message = '质量分析完成';
            });

          } catch (error) {
            get().addError({
              level: 'warning',
              module: 'geometry',
              message: '质量分析失败'
            });
          }
        },

        optimizeGeometry: async () => {
          const state = get();
          if (!state.data || !state.params.optimizationEnabled) return;

          try {
            set((state) => {
              state.status = 'running';
              state.progress.message = '优化几何质量...';
            });

            // 模拟优化过程
            await new Promise(resolve => setTimeout(resolve, 2000));

            set((state) => {
              if (state.quality) {
                state.quality.score = Math.min(0.95, state.quality.score + 0.1);
                state.quality.distribution.excellent += 0.1;
                state.quality.distribution.poor = Math.max(0, state.quality.distribution.poor - 0.05);
              }
              state.status = 'completed';
              state.progress.message = '几何优化完成';
            });

          } catch (error) {
            get().addError({
              level: 'error',
              module: 'geometry',
              message: '几何优化失败'
            });
          }
        },

        // ==================== 错误处理 ====================
        
        addError: (error) => {
          set((state) => {
            state.errors.push({
              ...error,
              id: `error_${Date.now()}`,
              timestamp: Date.now()
            });
          });
        },

        clearErrors: () => {
          set((state) => {
            state.errors = [];
          });
        },

        resolveError: (errorId) => {
          set((state) => {
            const error = state.errors.find(e => e.id === errorId);
            if (error) {
              error.resolved = true;
            }
          });
        },

        // ==================== 进度更新 ====================
        
        updateProgress: (progress) => {
          set((state) => {
            Object.assign(state.progress, progress);
            if (progress.current !== undefined && progress.total !== undefined) {
              state.progress.percentage = (progress.current / progress.total) * 100;
            }
          });
        },

        resetProgress: () => {
          set((state) => {
            state.progress = { current: 0, total: 100, percentage: 0 };
          });
        },

        // ==================== 历史操作 ====================
        
        addToHistory: (action, params) => {
          set((state) => {
            state.history.push({
              id: `action_${Date.now()}`,
              action,
              timestamp: Date.now(),
              params
            });
            
            // 限制历史记录数量
            if (state.history.length > 50) {
              state.history = state.history.slice(-50);
            }
          });
        },

        undoLastAction: () => {
          set((state) => {
            const lastAction = state.history.pop();
            if (lastAction && lastAction.action === 'update_params') {
              Object.assign(state.params, lastAction.params);
              state.data = null;
              state.quality = null;
              state.status = 'idle';
            }
          });
        },

        clearHistory: () => {
          set((state) => {
            state.history = [];
          });
        },

        // ==================== 状态管理 ====================
        
        setStatus: (status) => {
          set((state) => {
            state.status = status;
          });
        },

        reset: () => {
          set(() => ({ ...initialState }));
        }
      }))
    ),
    { name: 'geometry-store' }
  )
);

// 导出类型
export type GeometryStore = typeof useGeometryStore;