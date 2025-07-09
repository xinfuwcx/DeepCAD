/**
 * 建模模块示意图展示组件
 * 展示所有建模模块的二维示意图
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Chip,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Terrain as TerrainIcon,
  Construction as ConstructionIcon,
  Engineering as EngineeringIcon,
  Sensors as SensorsIcon,
  Analytics as AnalyticsIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';

import {
  ModelingDiagram,
  GeologicalModelDiagram,
  ExcavationDiagram,
  SupportDiagram,
  MonitoringDiagram,
  AnalysisDiagram
} from '../diagrams/ModelingDiagrams';

interface DiagramCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  diagram: React.ReactNode;
  features: string[];
}

const DiagramCard: React.FC<DiagramCardProps> = ({ 
  title, 
  description, 
  icon, 
  diagram, 
  features 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        
        <Box sx={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: 2, 
          overflow: 'hidden',
          mb: 2
        }}>
          {diagram}
        </Box>
        
        <Typography variant="caption" color="text.secondary" gutterBottom>
          主要功能:
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {features.map((feature, index) => (
            <Chip
              key={index}
              label={feature}
              size="small"
              variant="outlined"
              sx={{ mb: 0.5 }}
            />
          ))}
        </Stack>
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          startIcon={<ZoomInIcon />}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '收起' : '详细查看'}
        </Button>
        <Tooltip title="全屏预览">
          <IconButton size="small">
            <FullscreenIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

const ModelingDiagramShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const diagramsData = [
    {
      title: '地质建模',
      description: '基于GemPy的三维地质建模系统，支持钻孔数据导入、地层分层和体积建模',
      icon: <TerrainIcon color="primary" />,
      diagram: <GeologicalModelDiagram width={350} height={220} />,
      features: ['钻孔数据解析', '地层自动分层', '三维体积建模', 'GemPy集成', '科学配色']
    },
    {
      title: '基坑建模',
      description: '智能基坑设计系统，支持多阶段开挖、施工方法选择和4D施工模拟',
      icon: <ConstructionIcon color="primary" />,
      diagram: <ExcavationDiagram width={350} height={220} />,
      features: ['几何设计', '开挖阶段', '施工方法', '工程量计算', '4D动画']
    },
    {
      title: '支护建模',
      description: '支护结构设计系统，包含地连墙、支撑系统、锚杆等支护构件',
      icon: <EngineeringIcon color="primary" />,
      diagram: <SupportDiagram width={350} height={220} />,
      features: ['地连墙设计', '支撑系统', '预应力锚杆', '结构优化', 'BIM集成']
    },
    {
      title: '监测建模',
      description: '监测系统设计，包含各类传感器布置、数据采集和预警系统',
      icon: <SensorsIcon color="primary" />,
      diagram: <MonitoringDiagram width={350} height={220} />,
      features: ['测斜监测', '水位监测', '应力监测', '位移监测', '实时预警']
    },
    {
      title: '分析建模',
      description: '有限元分析系统，支持网格划分、边界条件设置和多物理场耦合分析',
      icon: <AnalyticsIcon color="primary" />,
      diagram: <AnalysisDiagram width={350} height={220} />,
      features: ['网格划分', '边界条件', '荷载施加', '多物理场', 'Kratos求解']
    }
  ];

  const categories = [
    { label: '全部模块', icon: <TerrainIcon /> },
    { label: '地质建模', icon: <TerrainIcon /> },
    { label: '基坑工程', icon: <ConstructionIcon /> },
    { label: '支护系统', icon: <EngineeringIcon /> },
    { label: '监测系统', icon: <SensorsIcon /> },
    { label: '数值分析', icon: <AnalyticsIcon /> }
  ];

  const getFilteredDiagrams = () => {
    if (activeTab === 0) return diagramsData;
    return [diagramsData[activeTab - 1]];
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ 
        fontWeight: 'bold', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        mb: 3
      }}>
        <TerrainIcon fontSize="large" />
        建模模块示意图
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        基于Three.js CSS2DRenderer的交互式二维示意图，帮助理解各个建模模块的功能和流程。
      </Typography>

      {/* 分类标签 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {categories.map((category, index) => (
            <Tab
              key={index}
              label={category.label}
              icon={category.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* 示意图网格 */}
      <Grid container spacing={3}>
        {getFilteredDiagrams().map((diagram, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <DiagramCard {...diagram} />
          </Grid>
        ))}
      </Grid>

      {/* 技术说明 */}
      <Paper variant="outlined" sx={{ p: 3, mt: 4, bgcolor: 'action.hover' }}>
        <Typography variant="h6" gutterBottom>
          📐 技术特点
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>🎨 可视化技术：</strong><br/>
              • Three.js WebGL渲染<br/>
              • CSS2DRenderer标签系统<br/>
              • 实时交互和动画<br/>
              • 响应式设计
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              <strong>🔧 功能特性：</strong><br/>
              • 模块化组件设计<br/>
              • 参数化配置<br/>
              • 悬停交互效果<br/>
              • 全屏预览支持
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ModelingDiagramShowcase; 