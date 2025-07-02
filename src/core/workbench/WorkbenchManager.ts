/**
 * 工作台管理器
 * 
 * 参考FreeCAD的工作台概念，管理不同专业工作台的激活状态和切换
 */

import { create } from 'zustand';

// 工作台类型
export enum WorkbenchType {
  GEOLOGY = 'geology',           // 地质建模工作台
  STRUCTURE = 'structure',       // 支护结构工作台
  ANALYSIS = 'analysis',         // 分析设置工作台
  RESULTS = 'results',           // 结果可视化工作台
  MONITORING = 'monitoring',     // 监测数据工作台
  PHYSICS_AI = 'physics_ai'      // 物理AI工作台
}

// 工作台接口
export interface Workbench {
  id: WorkbenchType;
  name: string;
  icon: string;
  description: string;
  active: boolean;
}

// 工作台状态
interface WorkbenchState {
  workbenches: Workbench[];
  activeWorkbench: WorkbenchType | null;
  
  // 激活工作台
  activateWorkbench: (id: WorkbenchType) => void;
  
  // 获取当前激活的工作台
  getActiveWorkbench: () => Workbench | null;
  
  // 初始化工作台
  initializeWorkbenches: () => void;
}

// 创建工作台状态管理
export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  workbenches: [],
  activeWorkbench: null,
  
  activateWorkbench: (id: WorkbenchType) => {
    set(state => ({
      workbenches: state.workbenches.map(wb => ({
        ...wb,
        active: wb.id === id
      })),
      activeWorkbench: id
    }));
  },
  
  getActiveWorkbench: () => {
    const { workbenches, activeWorkbench } = get();
    return workbenches.find(wb => wb.id === activeWorkbench) || null;
  },
  
  initializeWorkbenches: () => {
    const workbenches: Workbench[] = [
      {
        id: WorkbenchType.GEOLOGY,
        name: '地质建模',
        icon: 'terrain',
        description: '创建和编辑地质模型，定义土层参数',
        active: false
      },
      {
        id: WorkbenchType.STRUCTURE,
        name: '支护结构',
        icon: 'wall',
        description: '设计地下连续墙、支撑、锚杆等支护结构',
        active: false
      },
      {
        id: WorkbenchType.ANALYSIS,
        name: '分析设置',
        icon: 'settings',
        description: '配置分析参数，设置边界条件和荷载',
        active: false
      },
      {
        id: WorkbenchType.RESULTS,
        name: '结果可视化',
        icon: 'assessment',
        description: '查看和分析计算结果',
        active: false
      },
      {
        id: WorkbenchType.MONITORING,
        name: '监测数据',
        icon: 'monitoring',
        description: '导入和分析现场监测数据',
        active: false
      },
      {
        id: WorkbenchType.PHYSICS_AI,
        name: '物理AI',
        icon: 'psychology',
        description: '利用物理信息AI进行参数反演、代理建模和可靠度分析',
        active: false
      }
    ];
    
    set({
      workbenches,
      activeWorkbench: WorkbenchType.GEOLOGY // 默认激活地质建模工作台
    });
    
    // 激活默认工作台
    get().activateWorkbench(WorkbenchType.GEOLOGY);
  }
})); 