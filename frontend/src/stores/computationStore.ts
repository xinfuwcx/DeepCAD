/**
 * 计算模块状态管理
 * 1号架构师 - 计算分析专用Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ComputationState, ComputationParams, ComputationResults, SystemError, ProgressInfo } from './types';

interface ComputationActions {
  // 参数操作
  updateParams: (params: Partial<ComputationParams>) => void;
  resetParams: () => void;
  loadParamsFromTemplate: (templateName: string) => void;
  
  // 计算控制
  startComputation: () => Promise<void>;
  pauseComputation: () => void;
  resumeComputation: () => void;
  stopComputation: () => void;
  resetComputationStatus: () => void;
  
  // 结果管理
  setResults: (results: ComputationResults) => void;
  clearResults: () => void;
  exportResults: (format: 'json' | 'csv' | 'vtk') => Promise<void>;
  
  // 实时监控
  updateMonitoring: (monitoring: Partial<ComputationState['monitoring']>) => void;
  updatePerformance: (performance: Partial<ComputationState['performance']>) => void;
  
  // 错误处理
  addError: (error: Omit<SystemError, 'id' | 'timestamp'>) => void;
  clearErrors: () => void;
  
  // 进度更新
  updateProgress: (progress: Partial<ProgressInfo>) => void;
  
  // 状态管理
  setStatus: (status: ComputationState['status']) => void;
  reset: () => void;
}

// 默认计算参数
const defaultParams: ComputationParams = {
  solver: 'kratos',
  solverSettings: {
    maxIterations: 1000,
    tolerance: 1e-6,
    timeStep: 0.1,
    endTime: 10.0
  },
  
  analysisType: 'static',
  
  boundaryConditions: [
    {
      id: 'bc_bottom',
      type: 'displacement',
      region: 'bottom_surface',
      value: [0, 0, 0]
    },
    {
      id: 'bc_sides',
      type: 'displacement', 
      region: 'side_surfaces',
      value: [0, 0, 0]
    }
  ],
  
  loads: [
    {
      id: 'gravity',
      type: 'gravity',
      magnitude: 9.81,
      direction: [0, 0, -1]
    }
  ],
  
  materials: [
    {
      id: 'soil_1',
      name: '填土层',
      type: 'elastic',
      properties: {
        density: 1800,
        elasticModulus: 8000,
        poissonRatio: 0.35
      }
    },
    {
      id: 'soil_2',
      name: '粉质粘土层',
      type: 'elastic', 
      properties: {
        density: 1900,
        elasticModulus: 12000,
        poissonRatio: 0.3
      }
    }
  ]
};

// 初始状态
const initialState: ComputationState = {
  params: defaultParams,
  results: null,
  status: 'idle',
  progress: { current: 0, total: 100, percentage: 0 },
  errors: [],
  
  monitoring: {
    cpuUsage: 0,
    memoryUsage: 0,
    networkIO: 0,
    diskIO: 0
  },
  
  performance: {
    startTime: 0,
    elementsPerSecond: 0,
    memoryPeak: 0
  }
};

// Store定义
export const useComputationStore = create<ComputationState & ComputationActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // ==================== 参数操作 ====================
        
        updateParams: (params) => {
          set((state) => {
            Object.assign(state.params, params);
            // 参数变化时清除旧结果
            state.results = null;
            state.status = 'idle';
            state.progress = { current: 0, total: 100, percentage: 0 };
          });
        },

        resetParams: () => {
          set((state) => {
            state.params = { ...defaultParams };
            state.results = null;
            state.status = 'idle';
            state.errors = [];
          });
        },

        loadParamsFromTemplate: (templateName) => {
          const templates: Record<string, Partial<ComputationParams>> = {
            'static_analysis': {
              analysisType: 'static',
              solverSettings: {
                maxIterations: 500,
                tolerance: 1e-6,
                timeStep: 1.0,
                endTime: 1.0
              }
            },
            'dynamic_analysis': {
              analysisType: 'dynamic',
              solverSettings: {
                maxIterations: 2000,
                tolerance: 1e-8,
                timeStep: 0.01,
                endTime: 20.0
              }
            },
            'nonlinear_analysis': {
              analysisType: 'nonlinear',
              solverSettings: {
                maxIterations: 1500,
                tolerance: 1e-7,
                timeStep: 0.05,
                endTime: 15.0
              }
            }
          };
          
          const template = templates[templateName];
          if (template) {
            get().updateParams(template);
          }
        },

        // ==================== 计算控制 ====================
        
        startComputation: async () => {
          try {
            set((state) => {
              state.status = 'running';
              state.progress = { current: 0, total: 100, percentage: 0 };
              state.errors = [];
              state.performance.startTime = Date.now();
            });

            // 模拟计算过程
            const totalSteps = 100;
            const stepDuration = 100; // ms per step
            
            for (let step = 0; step <= totalSteps; step++) {
              await new Promise(resolve => setTimeout(resolve, stepDuration));
              
              // 检查是否被暂停或停止
              const currentStatus = get().status;
              if (currentStatus === 'cancelled') {
                return;
              }

              set((state) => {
                state.progress = {
                  current: step,
                  total: totalSteps,
                  percentage: (step / totalSteps) * 100,
                  message: step < 20 ? '初始化求解器...' :
                          step < 40 ? '组装刚度矩阵...' :
                          step < 70 ? '求解线性方程...' :
                          step < 90 ? '计算后处理...' : '完成计算'
                };
                
                // 更新性能监控
                state.monitoring = {
                  cpuUsage: 50 + Math.random() * 30,
                  memoryUsage: 30 + (step / totalSteps) * 40,
                  networkIO: Math.random() * 10,
                  diskIO: Math.random() * 5
                };
                
                state.performance.elementsPerSecond = 1000 + Math.random() * 500;
                state.performance.memoryPeak = Math.max(
                  state.performance.memoryPeak,
                  state.monitoring.memoryUsage
                );
              });
            }

            // 生成模拟结果
            const mockResults: ComputationResults = {
              nodeResults: {
                displacement: Array.from({ length: 1000 }, (_, i) => ({
                  nodeId: `node_${i}`,
                  x: (Math.random() - 0.5) * 0.1,
                  y: (Math.random() - 0.5) * 0.1,
                  z: (Math.random() - 0.5) * 0.05
                })),
                velocity: [],
                acceleration: []
              },
              
              elementResults: {
                stress: Array.from({ length: 500 }, (_, i) => ({
                  elementId: `element_${i}`,
                  xx: (Math.random() - 0.5) * 1000,
                  yy: (Math.random() - 0.5) * 1000,
                  zz: (Math.random() - 0.5) * 500,
                  xy: (Math.random() - 0.5) * 200,
                  xz: (Math.random() - 0.5) * 200,
                  yz: (Math.random() - 0.5) * 200
                })),
                strain: []
              },
              
              globalResults: {
                energy: {
                  kinetic: 0,
                  potential: 1250.6,
                  total: 1250.6
                },
                convergence: {
                  iterations: 45,
                  residual: 8.7e-7,
                  converged: true
                },
                timeStep: get().params.solverSettings.timeStep,
                currentTime: get().params.solverSettings.endTime
              },
              
              safetyFactors: [
                { region: 'excavation_wall', factor: 2.1, type: 'sliding' },
                { region: 'excavation_base', factor: 3.5, type: 'bearing' },
                { region: 'support_structure', factor: 1.8, type: 'overturning' }
              ]
            };

            set((state) => {
              state.results = mockResults;
              state.status = 'completed';
              state.performance.endTime = Date.now();
              state.performance.duration = state.performance.endTime - state.performance.startTime;
              state.progress.message = '计算完成';
            });

          } catch (error) {
            set((state) => {
              state.status = 'error';
              state.errors.push({
                id: `error_${Date.now()}`,
                level: 'error',
                module: 'computation',
                message: error instanceof Error ? error.message : '计算过程出错',
                timestamp: Date.now()
              });
            });
          }
        },

        pauseComputation: () => {
          set((state) => {
            if (state.status === 'running') {
              state.status = 'pending';
            }
          });
        },

        resumeComputation: () => {
          set((state) => {
            if (state.status === 'pending') {
              state.status = 'running';
            }
          });
        },

        stopComputation: () => {
          set((state) => {
            state.status = 'cancelled';
            state.progress.message = '计算已停止';
          });
        },

        resetComputationStatus: () => {
          set((state) => {
            state.status = 'idle';
            state.progress = { current: 0, total: 100, percentage: 0 };
            state.results = null;
            state.errors = [];
          });
        },

        // ==================== 结果管理 ====================
        
        setResults: (results) => {
          set((state) => {
            state.results = results;
            state.status = 'completed';
          });
        },

        clearResults: () => {
          set((state) => {
            state.results = null;
            state.status = 'idle';
          });
        },

        exportResults: async (format) => {
          const state = get();
          if (!state.results) return;

          try {
            set((state) => {
              state.progress.message = `导出${format.toUpperCase()}格式...`;
            });

            // 模拟导出过程
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 这里应该调用实际的导出API
            console.log(`导出计算结果为${format}格式`);

            set((state) => {
              state.progress.message = '导出完成';
            });

          } catch (error) {
            get().addError({
              level: 'error',
              module: 'computation',
              message: `导出${format}格式失败`
            });
          }
        },

        // ==================== 实时监控 ====================
        
        updateMonitoring: (monitoring) => {
          set((state) => {
            Object.assign(state.monitoring, monitoring);
          });
        },

        updatePerformance: (performance) => {
          set((state) => {
            Object.assign(state.performance, performance);
          });
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

        // ==================== 进度更新 ====================
        
        updateProgress: (progress) => {
          set((state) => {
            Object.assign(state.progress, progress);
            if (progress.current !== undefined && progress.total !== undefined) {
              state.progress.percentage = (progress.current / progress.total) * 100;
            }
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
    { name: 'computation-store' }
  )
);

// 性能监控Hook
export const useComputationPerformance = () => {
  return useComputationStore((state) => ({
    monitoring: state.monitoring,
    performance: state.performance,
    updateMonitoring: state.updateMonitoring,
    updatePerformance: state.updatePerformance
  }));
};

// 计算结果Hook
export const useComputationResults = () => {
  return useComputationStore((state) => ({
    results: state.results,
    status: state.status,
    progress: state.progress,
    setResults: state.setResults,
    clearResults: state.clearResults,
    exportResults: state.exportResults
  }));
};

// 导出类型
export type ComputationStore = typeof useComputationStore;