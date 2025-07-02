/**
 * 工作台内容组件
 * 
 * 根据当前激活的工作台显示对应的内容
 */

import React from 'react';
import { Box } from '@mui/material';

import { WorkbenchType, useWorkbenchStore } from '../../core/workbench/WorkbenchManager';
import PhysicsAIWorkbench from './PhysicsAIWorkbench';
import TrameFEMViewer from '../frontend/components/visualization/TrameFEMViewer';

// 导入各工作台组件
// 在实际开发中，这些组件会从对应文件导入
const GeologyWorkbench = () => <TrameFEMViewer />;
const StructureWorkbench = () => <TrameFEMViewer />;
const AnalysisWorkbench = () => <Box>分析设置工作台内容</Box>;
const ResultsWorkbench = () => <TrameFEMViewer />;
const MonitoringWorkbench = () => <Box>监测数据工作台内容</Box>;

// 工作台组件映射
const workbenchComponents: Record<WorkbenchType, React.ComponentType> = {
  [WorkbenchType.GEOLOGY]: GeologyWorkbench,
  [WorkbenchType.STRUCTURE]: StructureWorkbench,
  [WorkbenchType.ANALYSIS]: AnalysisWorkbench,
  [WorkbenchType.RESULTS]: ResultsWorkbench,
  [WorkbenchType.MONITORING]: MonitoringWorkbench,
  [WorkbenchType.PHYSICS_AI]: PhysicsAIWorkbench
};

const WorkbenchContent: React.FC = () => {
  const { activeWorkbench } = useWorkbenchStore();
  
  if (!activeWorkbench) {
    return <Box>请选择工作台</Box>;
  }
  
  const ActiveWorkbenchComponent = workbenchComponents[activeWorkbench];
  
  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
      <ActiveWorkbenchComponent />
    </Box>
  );
};

export default WorkbenchContent; 