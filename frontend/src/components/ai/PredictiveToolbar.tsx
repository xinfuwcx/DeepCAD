/**
 * @file PredictiveToolbar.tsx
 * @description AI驱动的预测式工具栏 - 智能工具推荐系统
 * @author GitHub Copilot - AI预测系统设计师
 * @inspiration 《少数派报告》预知界面 + iPhone动态岛 + Figma智能推荐
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Badge,
  CircularProgress,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Stack,
  Button,
} from '@mui/material';
import {
  Engineering,
  Science,
  ViewInAr,
  Calculate,
  Timeline,
  Memory,
  Speed,
  TrendingUp,
  Psychology,
  AutoAwesome,
  Bolt,
  Grain,
  Architecture,
  Functions,
  Assessment,
  CloudUpload,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Settings,
  Help,
  Star,
  TipsAndUpdates,
} from '@mui/icons-material';
import { defaultTokens } from '../../styles/tokens/defaultTokens';

// 🧠 AI预测接口定义
interface ToolPrediction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  probability: number;        // 0-1之间的概率值
  confidence: number;         // 预测置信度
  category: 'modeling' | 'analysis' | 'visualization' | 'ai' | 'data';
  estimatedTime: number;      // 预计使用时间(分钟)
  prerequisites: string[];    // 前置条件
  relatedTools: string[];     // 相关工具
  hotkey?: string;           // 快捷键
  isPreloaded?: boolean;     // 是否已预加载
  isActive?: boolean;        // 是否正在使用
  usageFrequency?: number;   // 使用频率
}

interface UserContext {
  currentWorkflow: 'initialization' | 'modeling' | 'meshing' | 'analysis' | 'postprocessing';
  projectType: 'excavation' | 'tunnel' | 'foundation' | 'slope';
  analysisPhase: 'setup' | 'computing' | 'reviewing' | 'reporting';
  recentActions: string[];
  userExperience: 'beginner' | 'intermediate' | 'expert';
  preferences: {
    favoriteTools: string[];
    workingHours: string[];
    autoSave: boolean;
    aiAssistance: boolean;
  };
}

interface PredictiveToolbarProps {
  context?: UserContext;
  onToolSelect?: (tool: ToolPrediction) => void;
  onPreloadTool?: (toolId: string) => void;
  showConfidence?: boolean;
  maxTools?: number;
  compact?: boolean;
}

// 🎯 工具定义库
const TOOL_LIBRARY: ToolPrediction[] = [
  {
    id: 'geometry_modeling',
    name: '几何建模',
    description: '创建和编辑基坑几何模型',
    icon: <Architecture />,
    probability: 0.0,
    confidence: 0.85,
    category: 'modeling',
    estimatedTime: 15,
    prerequisites: [],
    relatedTools: ['mesh_generation', 'material_setup'],
    hotkey: 'Ctrl+G',
  },
  {
    id: 'mesh_generation',
    name: '网格生成',
    description: '使用Netgen生成高质量网格',
    icon: <Grain />,
    probability: 0.0,
    confidence: 0.92,
    category: 'modeling',
    estimatedTime: 8,
    prerequisites: ['geometry_modeling'],
    relatedTools: ['mesh_quality_check', 'fem_analysis'],
    hotkey: 'Ctrl+M',
  },
  {
    id: 'fem_analysis',
    name: 'FEM分析',
    description: '有限元结构分析计算',
    icon: <Calculate />,
    probability: 0.0,
    confidence: 0.88,
    category: 'analysis',
    estimatedTime: 25,
    prerequisites: ['mesh_generation'],
    relatedTools: ['seepage_analysis', 'coupling_analysis'],
    hotkey: 'Ctrl+F',
  },
  {
    id: 'seepage_analysis',
    name: '渗流分析',
    description: '地下水渗流计算分析',
    icon: <Science />,
    probability: 0.0,
    confidence: 0.90,
    category: 'analysis',
    estimatedTime: 20,
    prerequisites: ['mesh_generation'],
    relatedTools: ['fem_analysis', 'coupling_analysis'],
    hotkey: 'Ctrl+S',
  },
  {
    id: 'coupling_analysis',
    name: '耦合分析',
    description: '渗流-结构耦合分析',
    icon: <Functions />,
    probability: 0.0,
    confidence: 0.87,
    category: 'analysis',
    estimatedTime: 35,
    prerequisites: ['fem_analysis', 'seepage_analysis'],
    relatedTools: ['ai_optimization', 'result_visualization'],
    hotkey: 'Ctrl+C',
  },
  {
    id: 'ai_optimization',
    name: 'AI优化',
    description: '物理AI参数优化和预测',
    icon: <Psychology />,
    probability: 0.0,
    confidence: 0.93,
    category: 'ai',
    estimatedTime: 12,
    prerequisites: ['fem_analysis'],
    relatedTools: ['parameter_tuning', 'result_visualization'],
    hotkey: 'Ctrl+A',
  },
  {
    id: 'result_visualization',
    name: '结果可视化',
    description: '3D结果展示和分析',
    icon: <ViewInAr />,
    probability: 0.0,
    confidence: 0.91,
    category: 'visualization',
    estimatedTime: 10,
    prerequisites: ['fem_analysis'],
    relatedTools: ['report_generation', 'data_export'],
    hotkey: 'Ctrl+V',
  },
  {
    id: 'parameter_tuning',
    name: '参数调优',
    description: '智能参数标定和优化',
    icon: <TipsAndUpdates />,
    probability: 0.0,
    confidence: 0.89,
    category: 'ai',
    estimatedTime: 18,
    prerequisites: [],
    relatedTools: ['ai_optimization', 'sensitivity_analysis'],
    hotkey: 'Ctrl+T',
  },
];

// 🤖 AI预测算法模拟
const useAIPrediction = (context: UserContext): ToolPrediction[] => {
  return useMemo(() => {
    const predictions = TOOL_LIBRARY.map(tool => {
      let probability = 0.1; // 基础概率
      
      // 基于工作流阶段的概率调整
      switch (context.currentWorkflow) {
        case 'initialization':
          if (tool.category === 'modeling') probability += 0.7;
          break;
        case 'modeling':
          if (tool.category === 'modeling' || tool.id === 'mesh_generation') probability += 0.6;
          break;
        case 'meshing':
          if (tool.category === 'analysis') probability += 0.6;
          break;
        case 'analysis':
          if (tool.category === 'analysis' || tool.category === 'ai') probability += 0.5;
          break;
        case 'postprocessing':
          if (tool.category === 'visualization') probability += 0.7;
          break;
      }
      
      // 基于分析阶段的调整
      switch (context.analysisPhase) {
        case 'setup':
          if (tool.category === 'modeling') probability += 0.3;
          break;
        case 'computing':
          if (tool.category === 'analysis') probability += 0.4;
          break;
        case 'reviewing':
          if (tool.category === 'visualization' || tool.category === 'ai') probability += 0.4;
          break;
        case 'reporting':
          if (tool.category === 'visualization') probability += 0.5;
          break;
      }
      
      // 基于用户经验调整
      if (context.userExperience === 'beginner') {
        if (tool.category === 'ai') probability += 0.2; // 新手更需要AI帮助
      } else if (context.userExperience === 'expert') {
        if (tool.hotkey) probability += 0.1; // 专家喜欢快捷键
      }
      
      // 基于偏好调整
      if (context.preferences.favoriteTools.includes(tool.id)) {
        probability += 0.3;
      }
      
      // 基于最近操作调整
      if (context.recentActions.some(action => tool.relatedTools.includes(action))) {
        probability += 0.2;
      }
      
      // 确保概率在合理范围内
      probability = Math.min(0.95, Math.max(0.05, probability));
      
      return {
        ...tool,
        probability,
        // 根据概率动态调整置信度
        confidence: tool.confidence * (0.7 + 0.3 * probability),
      };
    });
    
    // 按概率排序并返回前N个
    return predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 6);
  }, [context]);
};

// 🎨 工具按钮组件
const ToolButton: React.FC<{
  tool: ToolPrediction;
  onSelect: (tool: ToolPrediction) => void;
  onPreload: (toolId: string) => void;
  showConfidence: boolean;
  compact: boolean;
}> = ({ tool, onSelect, onPreload, showConfidence, compact }) => {
  const theme = useTheme();
  
  const handleClick = useCallback(() => {
    onSelect(tool);
  }, [tool, onSelect]);
  
  const handlePreload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPreload(tool.id);
  }, [tool.id, onPreload]);
  
  // 根据概率计算颜色强度
  const intensityColor = useMemo(() => {
    const intensity = tool.probability;
    if (intensity > 0.7) return defaultTokens.colors.neon.blue;
    if (intensity > 0.5) return defaultTokens.colors.neon.green;
    if (intensity > 0.3) return defaultTokens.colors.quantum.secondary;
    return defaultTokens.colors.glass.border;
  }, [tool.probability]);
  
  return (
    <Zoom in timeout={300 + Math.random() * 200}>
      <Box>
        <Tooltip
          title={
            <Box>
              <Typography variant="subtitle2">{tool.name}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {tool.description}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                概率: {(tool.probability * 100).toFixed(0)}% | 
                预计: {tool.estimatedTime}分钟
                {tool.hotkey && ` | ${tool.hotkey}`}
              </Typography>
            </Box>
          }
          arrow
          placement="top"
        >
          <Badge
            badgeContent={showConfidence ? `${(tool.confidence * 100).toFixed(0)}%` : null}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                background: defaultTokens.colors.quantum.primary,
                color: '#F8FAFC', // 全息白色
                fontSize: '0.6rem',
                fontWeight: 600,
              }
            }}
          >
            <Paper
              elevation={0}
              onClick={handleClick}
              sx={{
                position: 'relative',
                padding: compact ? 1 : 1.5,
                minWidth: compact ? 48 : 80,
                minHeight: compact ? 48 : 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: defaultTokens.transitions.preset.cardHover,
                background: `linear-gradient(135deg, 
                  ${alpha(intensityColor, 0.1)} 0%, 
                  ${alpha(intensityColor, 0.05)} 100%)`,
                border: `1px solid ${alpha(intensityColor, 0.3)}`,
                borderRadius: defaultTokens.borderRadius.large,
                backdropFilter: 'blur(20px)',
                
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: `0 8px 25px ${alpha(intensityColor, 0.3)}`,
                  borderColor: intensityColor,
                  background: `linear-gradient(135deg, 
                    ${alpha(intensityColor, 0.2)} 0%, 
                    ${alpha(intensityColor, 0.1)} 100%)`,
                },
                
                '&:active': {
                  transform: 'translateY(0px) scale(0.98)',
                },
                
                // 概率高的工具添加脉动效果
                ...(tool.probability > 0.7 && {
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': { boxShadow: `0 0 0 0 ${alpha(intensityColor, 0.7)}` },
                    '70%': { boxShadow: `0 0 0 10px ${alpha(intensityColor, 0)}` },
                    '100%': { boxShadow: `0 0 0 0 ${alpha(intensityColor, 0)}` },
                  },
                }),
              }}
            >
              {/* 工具图标 */}
              <Box
                sx={{
                  color: intensityColor,
                  fontSize: compact ? 20 : 24,
                  mb: compact ? 0.5 : 1,
                }}
              >
                {tool.icon}
              </Box>
              
              {/* 工具名称 */}
              {!compact && (
                <Typography
                  variant="caption"
                  sx={{
                    textAlign: 'center',
                    lineHeight: 1.2,
                    color: '#F8FAFC', // 全息白色
                    fontWeight: 500,
                  }}
                >
                  {tool.name}
                </Typography>
              )}
              
              {/* 概率指示器 */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: intensityColor,
                  opacity: tool.probability,
                }}
              />
              
              {/* 预加载按钮 */}
              {tool.probability > 0.5 && !tool.isPreloaded && (
                <IconButton
                  size="small"
                  onClick={handlePreload}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 16,
                    height: 16,
                    color: defaultTokens.colors.neon.orange,
                    '&:hover': {
                      background: alpha(defaultTokens.colors.neon.orange, 0.1),
                    },
                  }}
                >
                  <CloudUpload sx={{ fontSize: 12 }} />
                </IconButton>
              )}
            </Paper>
          </Badge>
        </Tooltip>
      </Box>
    </Zoom>
  );
};

// 🎪 主组件
const PredictiveToolbar: React.FC<PredictiveToolbarProps> = ({
  context = {
    currentWorkflow: 'initialization',
    projectType: 'excavation',
    analysisPhase: 'setup',
    recentActions: [],
    userExperience: 'intermediate',
    preferences: {
      favoriteTools: ['geometry_modeling', 'fem_analysis'],
      workingHours: ['09:00-18:00'],
      autoSave: true,
      aiAssistance: true,
    },
  },
  onToolSelect = () => {},
  onPreloadTool = () => {},
  showConfidence = true,
  maxTools = 6,
  compact = false,
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // 获取AI预测结果
  const predictions = useAIPrediction(context);
  const topPredictions = predictions.slice(0, maxTools);
  
  // 模拟预测更新
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdateTime(Date.now());
    }, 30000); // 每30秒更新一次预测
    
    return () => clearInterval(interval);
  }, []);
  
  const handleToolSelect = useCallback((tool: ToolPrediction) => {
    setIsLoading(true);
    onToolSelect(tool);
    
    // 模拟工具加载时间
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, [onToolSelect]);
  
  const handlePreload = useCallback((toolId: string) => {
    onPreloadTool(toolId);
  }, [onPreloadTool]);
  
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        padding: 2,
        background: `linear-gradient(135deg, 
          ${defaultTokens.colors.glass.surface} 0%, 
          ${defaultTokens.colors.glass.card} 100%)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${defaultTokens.colors.glass.border}`,
        borderRadius: defaultTokens.borderRadius.xl,
        overflow: 'hidden',
      }}
    >
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome
            sx={{
              color: defaultTokens.colors.neon.blue,
              fontSize: 20,
            }}
          />
          <Typography
            variant="subtitle2"
            sx={{
              color: '#F8FAFC', // 全息白色
              fontWeight: 600,
            }}
          >
            AI工具推荐
          </Typography>
          {isLoading && (
            <CircularProgress
              size={16}
              sx={{ color: defaultTokens.colors.neon.blue }}
            />
          )}
        </Box>
        
        <Chip
          label={`${context.currentWorkflow} | ${context.analysisPhase}`}
          size="small"
          sx={{
            background: alpha(defaultTokens.colors.quantum.primary, 0.2),
            color: '#F8FAFC', // 全息白色
            border: `1px solid ${alpha(defaultTokens.colors.quantum.primary, 0.3)}`,
            fontSize: '0.7rem',
          }}
        />
      </Box>
      
      {/* 工具网格 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: compact 
            ? 'repeat(auto-fit, minmax(48px, 1fr))' 
            : 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: compact ? 1 : 1.5,
          minHeight: compact ? 60 : 100,
        }}
      >
        {topPredictions.map((tool, index) => (
          <Fade
            key={tool.id}
            in
            timeout={300 + index * 100}
          >
            <Box>
              <ToolButton
                tool={tool}
                onSelect={handleToolSelect}
                onPreload={handlePreload}
                showConfidence={showConfidence}
                compact={compact}
              />
            </Box>
          </Fade>
        ))}
      </Box>
      
      {/* 底部信息栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: 2,
          pt: 1.5,
          borderTop: `1px solid ${defaultTokens.colors.glass.border}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: alpha('#F8FAFC', 0.7), // 全息白色透明
          }}
        >
          基于AI分析 · 每30秒更新
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: alpha('#F8FAFC', 0.7), // 全息白色透明
            }}
          >
            置信度: {(topPredictions[0]?.confidence * 100 || 0).toFixed(0)}%
          </Typography>
          <Bolt
            sx={{
              color: defaultTokens.colors.neon.yellow,
              fontSize: 14,
            }}
          />
        </Box>
      </Box>
      
      {/* 背景装饰效果 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          background: `radial-gradient(circle, 
            ${alpha(defaultTokens.colors.neon.blue, 0.1)} 0%, 
            transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
    </Paper>
  );
};

export default PredictiveToolbar;
export type { ToolPrediction, UserContext, PredictiveToolbarProps };
