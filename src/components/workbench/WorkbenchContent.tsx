/**
 * 工作台内容组件
 * 
 * 根据当前激活的工作台显示对应的内容
 */

import React from 'react';
import { Box } from '@mui/material';

import { WorkbenchType, useWorkbenchStore } from '../../core/workbench/WorkbenchManager';

// 导入各工作台组件
// 在实际开发中，这些组件会从对应文件导入
const GeologyWorkbench = () => <Box>地质建模工作台内容</Box>;
const StructureWorkbench = () => <Box>支护结构工作台内容</Box>;
const AnalysisWorkbench = () => <Box>分析设置工作台内容</Box>;
const ResultsWorkbench = () => <Box>结果可视化工作台内容</Box>;
const MonitoringWorkbench = () => <Box>监测数据工作台内容</Box>;

// 工作台组件映射
const workbenchComponents: Record<WorkbenchType, React.ComponentType> = {
  [WorkbenchType.GEOLOGY]: GeologyWorkbench,
  [WorkbenchType.STRUCTURE]: StructureWorkbench,
  [WorkbenchType.ANALYSIS]: AnalysisWorkbench,
  [WorkbenchType.RESULTS]: ResultsWorkbench,
  [WorkbenchType.MONITORING]: MonitoringWorkbench
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