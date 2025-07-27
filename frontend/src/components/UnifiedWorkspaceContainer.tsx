/**
 * 统一工作空间容器
 * 0号架构师 - 基于正确的支护结构系统架构
 * 桩基系统作为支护结构的组成部分，而非独立模块
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 核心专家模块导入
import EpicControlCenterIntegrated from './EpicControlCenterIntegrated';
import GeologyIntegratedWorkspace from './GeologyIntegratedWorkspace';
import ComputationIntegratedWorkspace from './ComputationIntegratedWorkspace';

// 数据流和协作组件
import { ExpertCollaborationHub } from '../services/ExpertCollaborationHub';
import { DataFlowVisualizer } from './DataFlowVisualizer';

// 支护结构相关接口
interface SupportStructureSystem {
  // 地下连续墙系统
  diaphragmWalls: {
    enabled: boolean;
    configuration: DiaphragmWallConfig;
    status: 'idle' | 'processing' | 'completed';
  };
  
  // 桩基支护系统 (作为支护结构的一部分)
  pileSupports: {
    enabled: boolean;
    pileTypes: Array<{
      type: 'BORED_CAST_IN_PLACE' | 'HAND_DUG' | 'PRECAST_DRIVEN' | 'SWM_METHOD' | 'CFG_PILE' | 'HIGH_PRESSURE_JET';
      strategy: 'BEAM_ELEMENT' | 'SHELL_ELEMENT';
      configuration: PileConfiguration;
    }>;
    status: 'idle' | 'processing' | 'completed';
  };
  
  // 锚索系统
  anchorSystems: {
    enabled: boolean;
    configuration: AnchorConfiguration;
    status: 'idle' | 'processing' | 'completed';
  };
  
  // 钢支撑系统
  steelSupports: {
    enabled: boolean;
    configuration: SteelSupportConfiguration;
    status: 'idle' | 'processing' | 'completed';
  };
}

interface UnifiedWorkspaceState {
  // 当前激活的专家
  activeExpert: 1 | 2 | 3;
  
  // 专家状态管理
  expertStates: {
    expert1: {
      mode: 'epic_control' | 'geo_visualization' | 'weather_system';
      currentProject?: string;
      epicSystemReady: boolean;
    };
    expert2: {
      mode: 'geology_modeling' | 'support_structures' | 'geometry_processing';
      geologyModelReady: boolean;
      supportStructures: SupportStructureSystem;
      currentProcessing?: string;
    };
    expert3: {
      mode: 'computation_control' | 'mesh_analysis' | 'ai_systems';
      computationReady: boolean;
      meshQuality?: number;
      aiModulesActive: boolean;
    };
  };
  
  // 数据流协作状态
  collaboration: {
    epic2Geology: boolean;       // 1号→2号: Epic项目上下文传递
    geology2Support: boolean;    // 2号内部: 地质模型→支护结构
    support2Computation: boolean; // 2号→3号: 支护几何→计算网格
    computation2Epic: boolean;   // 3号→1号: 计算结果→Epic可视化
  };
  
  // 界面布局状态
  ui: {
    layout: 'single_expert' | 'dual_collaboration' | 'triple_overview';
    sidebarCollapsed: boolean;
    dataFlowVisible: boolean;
  };
}

interface UnifiedWorkspaceContainerProps {
  onExpertSwitch?: (expertId: 1 | 2 | 3) => void;
  onSystemStatusChange?: (status: any) => void;
  initialExpert?: 1 | 2 | 3;
}

const UnifiedWorkspaceContainer: React.FC<UnifiedWorkspaceContainerProps> = ({
  onExpertSwitch,
  onSystemStatusChange,
  initialExpert = 1
}) => {
  const [workspaceState, setWorkspaceState] = useState<UnifiedWorkspaceState>({
    activeExpert: initialExpert,
    expertStates: {
      expert1: {
        mode: 'epic_control',
        epicSystemReady: false
      },
      expert2: {
        mode: 'geology_modeling',
        geologyModelReady: false,
        supportStructures: {
          diaphragmWalls: { enabled: false, configuration: {}, status: 'idle' },
          pileSupports: { enabled: false, pileTypes: [], status: 'idle' },
          anchorSystems: { enabled: false, configuration: {}, status: 'idle' },
          steelSupports: { enabled: false, configuration: {}, status: 'idle' }
        }
      },
      expert3: {
        mode: 'computation_control',
        computationReady: false,
        aiModulesActive: false
      }
    },
    collaboration: {
      epic2Geology: false,
      geology2Support: false,
      support2Computation: false,
      computation2Epic: false
    },
    ui: {
      layout: 'single_expert',
      sidebarCollapsed: false,
      dataFlowVisible: true
    }
  });

  // 专家切换处理
  const handleExpertSwitch = (expertId: 1 | 2 | 3) => {
    setWorkspaceState(prev => ({
      ...prev,
      activeExpert: expertId
    }));
    
    onExpertSwitch?.(expertId);
  };

  // 2号专家支护结构系统更新
  const handleSupportStructureUpdate = (supportSystem: Partial<SupportStructureSystem>) => {
    setWorkspaceState(prev => ({
      ...prev,
      expertStates: {
        ...prev.expertStates,
        expert2: {
          ...prev.expertStates.expert2,
          supportStructures: {
            ...prev.expertStates.expert2.supportStructures,
            ...supportSystem
          }
        }
      }
    }));
  };

  // 桩基系统配置 (作为支护结构的一部分)
  const handlePileSystemConfiguration = (pileConfig: any) => {
    handleSupportStructureUpdate({
      pileSupports: {
        enabled: true,
        pileTypes: pileConfig.selectedPileTypes,
        status: 'processing'
      }
    });
  };

  // 数据流协作状态更新
  const handleCollaborationUpdate = (collaborationData: any) => {
    setWorkspaceState(prev => ({
      ...prev,
      collaboration: {
        ...prev.collaboration,
        ...collaborationData
      }
    }));
  };

  // 专家模块切换器组件
  const ExpertModuleSwitcher = () => (
    <div className="expert-switcher flex items-center space-x-4 p-4 bg-gray-900/50 backdrop-blur-sm rounded-lg">
      {[1, 2, 3].map(expertId => (
        <motion.button
          key={expertId}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            workspaceState.activeExpert === expertId
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => handleExpertSwitch(expertId as 1 | 2 | 3)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {expertId}号专家
          {expertId === 1 && ' - Epic控制'}
          {expertId === 2 && ' - 几何建模'}
          {expertId === 3 && ' - 计算分析'}
        </motion.button>
      ))}
    </div>
  );

  // 支护结构状态指示器
  const SupportStructureIndicator = () => (
    <div className="support-indicator p-4 bg-gray-900/30 rounded-lg">
      <h3 className="text-sm font-medium text-gray-300 mb-3">支护结构系统状态</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">地下连续墙</span>
          <div className={`w-3 h-3 rounded-full ${
            workspaceState.expertStates.expert2.supportStructures.diaphragmWalls.enabled 
              ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">桩基支护</span>
          <div className={`w-3 h-3 rounded-full ${
            workspaceState.expertStates.expert2.supportStructures.pileSupports.enabled 
              ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">锚索系统</span>
          <div className={`w-3 h-3 rounded-full ${
            workspaceState.expertStates.expert2.supportStructures.anchorSystems.enabled 
              ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">钢支撑</span>
          <div className={`w-3 h-3 rounded-full ${
            workspaceState.expertStates.expert2.supportStructures.steelSupports.enabled 
              ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="unified-workspace-container min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 顶部专家切换器 */}
      <div className="workspace-header p-6">
        <ExpertModuleSwitcher />
      </div>

      {/* 主工作区域 */}
      <div className="workspace-main flex flex-1">
        {/* 左侧边栏 - 协作状态和系统指示器 */}
        {!workspaceState.ui.sidebarCollapsed && (
          <div className="sidebar w-80 p-6 space-y-6">
            <SupportStructureIndicator />
            
            {workspaceState.ui.dataFlowVisible && (
              <DataFlowVisualizer
                dataFlows={new Map()}
                onFlowUpdate={handleCollaborationUpdate}
              />
            )}
          </div>
        )}

        {/* 中央专家模块区域 */}
        <div className="main-content flex-1 p-6">
          <AnimatePresence mode="wait">
            {workspaceState.activeExpert === 1 && (
              <motion.div
                key="expert1"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.3 }}
              >
                <EpicControlCenterIntegrated
                  width={1200}
                  height={800}
                  activeInWorkspace={true}
                  workspaceMode={workspaceState.expertStates.expert1.mode}
                  onProjectSelect={(project) => {
                    // 激活与2号专家的协作
                    handleCollaborationUpdate({ epic2Geology: true });
                  }}
                  onExpertSwitch={(expertId) => {
                    handleExpertSwitch(expertId);
                  }}
                  onDataTransfer={(data) => {
                    // 处理项目上下文数据传递
                    console.log('Epic数据传递:', data);
                  }}
                />
              </motion.div>
            )}

            {workspaceState.activeExpert === 2 && (
              <motion.div
                key="expert2"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.3 }}
              >
                <GeologyIntegratedWorkspace
                  projectData={workspaceState.expertStates.expert1.currentProject}
                  workspaceWidth={1200}
                  workspaceHeight={800}
                  onGeologyComplete={(geologyData) => {
                    handleCollaborationUpdate({ geology2Support: true });
                  }}
                  onSupportStructureComplete={(supportData) => {
                    handleSupportStructureUpdate(supportData);
                    handleCollaborationUpdate({ support2Computation: true });
                  }}
                  onDataTransferTo3号={(data) => {
                    console.log('传输数据给3号专家:', data);
                  }}
                />
              </motion.div>
            )}

            {workspaceState.activeExpert === 3 && (
              <motion.div
                key="expert3"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.3 }}
              >
                <ComputationIntegratedWorkspace
                  geologyData={collaborationData?.geologyModel}
                  supportStructureData={collaborationData?.supportStructures}
                  workspaceWidth={1200}
                  workspaceHeight={800}
                  onComputationComplete={(results) => {
                    handleCollaborationUpdate({ computation2Epic: true });
                  }}
                  onMeshGenerated={(metrics) => {
                    console.log('网格质量指标:', metrics);
                  }}
                  onDataTransferToEpic={(visualizationData) => {
                    console.log('传输可视化数据给1号专家:', visualizationData);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default UnifiedWorkspaceContainer;