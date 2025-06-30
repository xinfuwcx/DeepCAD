import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Slide, 
  Tooltip, 
  IconButton, 
  Typography,
  Badge,
  Stack,
  styled,
  LinearProgress
} from '@mui/material';
import {
  Architecture as ArchitectureIcon,
  Tune as TuneIcon,
  StackedLineChart as StackedLineChartIcon,
  Code as CodeIcon,
  Memory as MemoryIcon,
  Science as ScienceIcon,
  BarChart as BarChartIcon,
  WaterDrop as WaterDropIcon,
  Timeline as TimelineIcon,
  Layers as LayersIcon,
  AutoAwesome as AutoAwesomeIcon,
  Construction as ConstructionIcon,
  RotateLeft as RotateLeftIcon,
} from '@mui/icons-material';
import { quantumTokens } from '../../styles/tokens/quantumTokens';

/**
 * 预测式工具栏组件
 * 根据用户行为和当前上下文智能推荐工具
 */

// 工具类型
export type ToolType = 'modeling' | 'mesh' | 'analysis' | 'results' | 'ai' | 'parameters';

// 工具项定义
export interface PredictiveTool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: ToolType;
  confidence: number; // 0-100
  action: () => void;
  shortcut?: string;
  badge?: number | null;
  isNew?: boolean;
}

// 样式组件
const ToolbarContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  left: '50%',
  bottom: 24,
  transform: 'translateX(-50%)',
  width: 'auto',
  maxWidth: 'calc(100vw - 48px)',
  height: quantumTokens.components.predictiveToolbar.height,
  backgroundColor: quantumTokens.components.predictiveToolbar.background,
  backdropFilter: 'blur(10px)',
  borderRadius: quantumTokens.borderRadius.full,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 16px',
  zIndex: 1000,
  boxShadow: quantumTokens.shadows.glass.md,
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const ToolButton = styled(IconButton)<{ confidence: number; active?: boolean }>(
  ({ confidence, active }) => ({
    position: 'relative',
    margin: '0 4px',
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: active
      ? quantumTokens.components.predictiveToolbar.activeItem.background
      : 'transparent',
    transition: quantumTokens.animation.transitions.normal,
    overflow: 'hidden',
    boxShadow: active ? quantumTokens.components.predictiveToolbar.activeItem.glow : 'none',
    
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: `${confidence}%`,
      height: '2px',
      backgroundColor: active
        ? quantumTokens.colors.quantumBrightEnd
        : 'rgba(255, 255, 255, 0.3)',
      transition: quantumTokens.animation.transitions.normal,
    },
    
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      '&::after': {
        width: '100%',
        backgroundColor: quantumTokens.colors.quantumBrightEnd,
      },
    },
  }),
);

const ToolName = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  bottom: -20,
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '10px',
  whiteSpace: 'nowrap',
  opacity: 0,
  transition: quantumTokens.animation.transitions.fast,
  pointerEvents: 'none',
}));

const ToolTip = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 70,
  left: '50%',
  transform: 'translateX(-50%)',
  minWidth: 200,
  padding: '8px 12px',
  backgroundColor: 'rgba(10, 14, 39, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: quantumTokens.borderRadius.md,
  boxShadow: quantumTokens.shadows.glass.md,
  zIndex: 1010,
}));

const getIconColor = (type: ToolType, active: boolean): string => {
  if (!active) return 'rgba(255, 255, 255, 0.7)';
  
  switch (type) {
    case 'modeling':
      return quantumTokens.colors.quantumBrightEnd;
    case 'mesh':
      return quantumTokens.colors.neonFlow;
    case 'analysis':
      return quantumTokens.colors.neonDisplacement;
    case 'results':
      return quantumTokens.colors.neonWarning;
    case 'ai':
      return quantumTokens.colors.neonStress;
    case 'parameters':
      return quantumTokens.colors.engineeringConcrete;
    default:
      return quantumTokens.colors.quantumBrightEnd;
  }
};

// 示例工具集合
const exampleTools: PredictiveTool[] = [
  {
    id: 'modeling-geometry',
    name: '几何建模',
    description: '创建和编辑深基坑几何模型',
    icon: <ArchitectureIcon />,
    type: 'modeling',
    confidence: 95,
    action: () => console.log('几何建模'),
    shortcut: 'Alt+G',
  },
  {
    id: 'mesh-generation',
    name: '网格生成',
    description: '生成并优化有限元网格',
    icon: <CodeIcon />,
    type: 'mesh',
    confidence: 88,
    action: () => console.log('网格生成'),
    shortcut: 'Alt+M',
  },
  {
    id: 'analysis-setup',
    name: '分析设置',
    description: '配置深基坑分析参数',
    icon: <TuneIcon />,
    type: 'parameters',
    confidence: 75,
    action: () => console.log('分析设置'),
    shortcut: 'Alt+P',
  },
  {
    id: 'fem-analysis',
    name: 'FEM分析',
    description: '运行有限元分析',
    icon: <StackedLineChartIcon />,
    type: 'analysis',
    confidence: 85,
    action: () => console.log('FEM分析'),
    shortcut: 'Alt+F',
  },
  {
    id: 'results-viewer',
    name: '结果可视化',
    description: '可视化分析结果',
    icon: <BarChartIcon />,
    type: 'results',
    confidence: 92,
    action: () => console.log('结果可视化'),
    shortcut: 'Alt+R',
  },
  {
    id: 'ai-parameter',
    name: '参数反演',
    description: '使用AI进行参数反演',
    icon: <ScienceIcon />,
    type: 'ai',
    confidence: 70,
    action: () => console.log('参数反演'),
    shortcut: 'Alt+I',
    isNew: true,
  },
  {
    id: 'flow-analysis',
    name: '渗流分析',
    description: '分析地下水流动',
    icon: <WaterDropIcon />,
    type: 'analysis',
    confidence: 65,
    action: () => console.log('渗流分析'),
    badge: 3,
  },
  {
    id: 'construction-stages',
    name: '施工阶段',
    description: '模拟分步施工过程',
    icon: <LayersIcon />,
    type: 'modeling',
    confidence: 60,
    action: () => console.log('施工阶段'),
  },
  {
    id: 'optimization',
    name: '自动优化',
    description: 'AI驱动的设计优化',
    icon: <AutoAwesomeIcon />,
    type: 'ai',
    confidence: 55,
    action: () => console.log('自动优化'),
    isNew: true,
  },
];

// 工具栏属性
export interface PredictiveToolbarProps {
  tools?: PredictiveTool[];
  currentWorkflow?: string;
  activeToolId?: string;
  onToolClick?: (tool: PredictiveTool) => void;
  minConfidence?: number;
  showLabels?: boolean;
  maxTools?: number;
}

export const PredictiveToolbar: React.FC<PredictiveToolbarProps> = ({
  tools = exampleTools,
  currentWorkflow,
  activeToolId,
  onToolClick,
  minConfidence = 50,
  showLabels = false,
  maxTools = 8,
}) => {
  const [showTip, setShowTip] = useState<PredictiveTool | null>(null);
  const [visibleTools, setVisibleTools] = useState<PredictiveTool[]>([]);
  const [showMoreTools, setShowMoreTools] = useState(false);
  
  // 根据置信度过滤和排序工具
  useEffect(() => {
    const filtered = tools
      .filter(tool => tool.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, showMoreTools ? tools.length : maxTools);
    
    setVisibleTools(filtered);
  }, [tools, minConfidence, maxTools, showMoreTools]);

  // 处理工具点击
  const handleToolClick = (tool: PredictiveTool) => {
    if (onToolClick) {
      onToolClick(tool);
    } else {
      tool.action();
    }
  };

  // 处理切换显示更多工具
  const toggleMoreTools = () => {
    setShowMoreTools(!showMoreTools);
  };

  return (
    <Slide in={true} direction="up">
      <ToolbarContainer>
        {/* 当前工作流显示 */}
        {currentWorkflow && (
          <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem' }}
            >
              当前工作流:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: quantumTokens.colors.quantumBrightEnd,
                ml: 0.5,
                fontSize: '0.7rem',
                fontWeight: 'bold',
              }}
            >
              {currentWorkflow}
            </Typography>
          </Box>
        )}

        {/* 工具按钮列表 */}
        {visibleTools.map((tool) => (
          <Tooltip
            key={tool.id}
            title={showLabels ? '' : tool.name}
            enterDelay={500}
            arrow
            placement="top"
          >
            <Box
              sx={{ position: 'relative' }}
              onMouseEnter={() => setShowTip(tool)}
              onMouseLeave={() => setShowTip(null)}
            >
              <ToolButton
                confidence={tool.confidence}
                active={activeToolId === tool.id}
                onClick={() => handleToolClick(tool)}
              >
                <Badge
                  color="error"
                  badgeContent={tool.badge}
                  invisible={!tool.badge}
                  variant="dot"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: tool.isNew
                        ? quantumTokens.colors.neonStress
                        : undefined,
                    },
                  }}
                >
                  {React.cloneElement(tool.icon as React.ReactElement, {
                    sx: { color: getIconColor(tool.type, activeToolId === tool.id) },
                  })}
                </Badge>
                {showLabels && (
                  <ToolName
                    sx={{
                      opacity: 1,
                      bottom: -18,
                    }}
                  >
                    {tool.name}
                  </ToolName>
                )}
              </ToolButton>
            </Box>
          </Tooltip>
        ))}

        {/* 显示更多工具按钮 */}
        {tools.length > maxTools && (
          <Tooltip title={showMoreTools ? '显示常用工具' : '显示全部工具'}>
            <IconButton size="small" onClick={toggleMoreTools} sx={{ ml: 1 }}>
              {showMoreTools ? (
                <RotateLeftIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
              ) : (
                <ConstructionIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
              )}
            </IconButton>
          </Tooltip>
        )}

        {/* 悬浮提示 */}
        {showTip && (
          <ToolTip>
            <Typography
              variant="subtitle2"
              sx={{ color: getIconColor(showTip.type, true), fontWeight: 'bold' }}
            >
              {showTip.name}
              {showTip.isNew && (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    fontSize: '0.6rem',
                    backgroundColor: quantumTokens.colors.neonStress,
                    color: '#fff',
                    px: 0.5,
                    py: 0.1,
                    borderRadius: 0.5,
                  }}
                >
                  新
                </Box>
              )}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 1 }}
            >
              {showTip.description}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.6rem' }}
                >
                  推荐度: {showTip.confidence}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={showTip.confidence}
                  sx={{
                    height: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getIconColor(showTip.type, true),
                    },
                  }}
                />
              </Box>
              {showTip.shortcut && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    px: 0.7,
                    py: 0.2,
                    borderRadius: 0.5,
                    fontSize: '0.7rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {showTip.shortcut}
                </Box>
              )}
            </Stack>
          </ToolTip>
        )}
      </ToolbarContainer>
    </Slide>
  );
};

export default PredictiveToolbar; 