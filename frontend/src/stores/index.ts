/**
 * 统一状态管理Store入口
 * 1号架构师 - DeepCAD核心状态管理架构
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

// 导出所有store类型
export * from './types';

// 导出所有子store
export { useGeometryStore } from './geometryStore';
export { useComputationStore } from './computationStore';
export { useUIStore } from './useUIStore';
// Performance store not implemented yet
// export { usePerformanceStore } from './performanceStore';
// Project store not implemented yet
// export { useProjectStore } from './projectStore';

// 导出复合hooks
export { useCAEWorkflow } from './hooks/useCAEWorkflow';
// 数据流和系统状态hooks将在未来版本中实现
// 当前版本使用useCAEWorkflow提供完整的工作流管理

// Store配置
export const storeConfig = {
  name: 'deepcad-store',
  version: '1.0.0',
  devtools: process.env.NODE_ENV === 'development',
  persist: {
    enabled: true,
    key: 'deepcad-state',
    // 只持久化关键配置，不持久化临时状态
    partialize: (state: any) => ({
      ui: {
        theme: state.ui?.theme,
        layout: state.ui?.layout
      },
      project: {
        recent: state.project?.recent
      }
    })
  }
};

// 全局状态监听器 - 实现核心数据流监听
export const setupGlobalListeners = () => {
  // 几何数据变化时重置计算状态，确保数据一致性
  useGeometryStore.subscribe(
    (state) => state.geometry?.data,
    (data) => {
      if (data?.lastModified) {
        const { resetComputationStatus } = useComputationStore.getState();
        resetComputationStatus();
        console.log('🔄 几何数据变化，已重置计算状态');
      }
    }
  );

  // 计算完成时更新UI状态
  useComputationStore.subscribe(
    (state) => state.computation?.status,
    (status) => {
      if (status === 'completed') {
        const { setActiveTab } = useUIStore.getState();
        setActiveTab('results');
        console.log('✅ 计算完成，切换到结果查看');
      }
    }
  );
};

console.log('🏗️ DeepCAD统一状态管理系统已初始化');