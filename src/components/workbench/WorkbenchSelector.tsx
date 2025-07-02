/**
 * 工作台选择器组件
 * 
 * 参考FreeCAD的工作台选择UI，提供专业工作台切换功能
 */

import React, { useEffect } from 'react';
import { 
  Box, 
  Tabs, 
  Tab,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import TerrainIcon from '@mui/icons-material/Terrain';
import WallIcon from '@mui/icons-material/Wall';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MonitoringIcon from '@mui/icons-material/Monitoring';

import { WorkbenchType, useWorkbenchStore } from '../../core/workbench/WorkbenchManager';

// 工作台图标映射
const workbenchIcons: Record<WorkbenchType, React.ReactNode> = {
  [WorkbenchType.GEOLOGY]: <TerrainIcon />,
  [WorkbenchType.STRUCTURE]: <WallIcon />,
  [WorkbenchType.ANALYSIS]: <SettingsIcon />,
  [WorkbenchType.RESULTS]: <AssessmentIcon />,
  [WorkbenchType.MONITORING]: <MonitoringIcon />
};

interface WorkbenchSelectorProps {
  orientation?: 'horizontal' | 'vertical';
}

const WorkbenchSelector: React.FC<WorkbenchSelectorProps> = ({ orientation = 'horizontal' }) => {
  const theme = useTheme();
  const { workbenches, activeWorkbench, activateWorkbench, initializeWorkbenches } = useWorkbenchStore();
  
  // 初始化工作台
  useEffect(() => {
    initializeWorkbenches();
  }, [initializeWorkbenches]);
  
  // 处理工作台切换
  const handleWorkbenchChange = (_event: React.SyntheticEvent, newValue: WorkbenchType) => {
    activateWorkbench(newValue);
  };
  
  return (
    <Box 
      sx={{ 
        bgcolor: theme.palette.background.paper,
        boxShadow: 1,
        borderRadius: 1,
        ...(orientation === 'vertical' ? {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '72px',
          py: 1
        } : {
          width: '100%',
          borderBottom: 1,
          borderColor: 'divider'
        })
      }}
    >
      <Tabs
        value={activeWorkbench}
        onChange={handleWorkbenchChange}
        orientation={orientation}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '.MuiTab-root': {
            minWidth: orientation === 'vertical' ? 'auto' : '80px',
            minHeight: orientation === 'vertical' ? 'auto' : '72px',
            py: orientation === 'vertical' ? 1 : 1.5,
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        {workbenches.map((wb) => (
          <Tooltip 
            key={wb.id} 
            title={wb.description} 
            placement={orientation === 'vertical' ? 'right' : 'bottom'}
          >
            <Tab
              value={wb.id}
              icon={workbenchIcons[wb.id as WorkbenchType]}
              label={
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 0.5, 
                    fontSize: '0.7rem',
                    textTransform: 'none'
                  }}
                >
                  {wb.name}
                </Typography>
              }
            />
          </Tooltip>
        ))}
      </Tabs>
    </Box>
  );
};

export default WorkbenchSelector; 