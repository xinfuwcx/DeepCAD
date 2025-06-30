import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Typography, 
  IconButton, 
  Fade, 
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  styled
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Mic as MicIcon, 
  Close as CloseIcon, 
  Code as CodeIcon,
  Architecture as ArchitectureIcon,
  Water as WaterIcon,
  Construction as ConstructionIcon,
  Timeline as TimelineIcon,
  Science as ScienceIcon,
  Analytics as AnalyticsIcon,
  Assistant as AssistantIcon
} from '@mui/icons-material';
import { quantumTokens } from '../../styles/tokens/quantumTokens';

/**
 * 智能命令面板组件
 * 支持自然语言输入和智能建议
 */

// 命令类型
interface CommandSuggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  confidence: number; // 0-100
  type: 'analysis' | 'mesh' | 'modeling' | 'results' | 'ai' | 'system';
}

// 自定义样式组件
const CommandContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: '20%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: quantumTokens.components.commandPalette.width.default,
  maxWidth: '90vw',
  backgroundColor: quantumTokens.components.commandPalette.background,
  backdropFilter: quantumTokens.components.commandPalette.backdropFilter,
  borderRadius: quantumTokens.borderRadius.lg,
  boxShadow: quantumTokens.shadows.glass.lg,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  overflow: 'hidden',
  zIndex: quantumTokens.zIndex.command,
  transition: quantumTokens.animation.transitions.bounce,
}));

const SearchField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: quantumTokens.borderRadius.lg,
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&.Mui-focused fieldset': {
      borderColor: quantumTokens.colors.quantumBrightEnd,
      boxShadow: quantumTokens.shadows.glow.subtle(quantumTokens.colors.quantumBrightEnd),
    },
  },
  '& .MuiInputBase-input': {
    padding: '14px 14px 14px 20px',
    fontSize: quantumTokens.typography.fontSize.lg,
    color: '#fff',
  },
}));

const ConfidenceBar = styled(Box)<{ confidence: number; type: string }>(({ confidence, type }) => {
  const getColor = () => {
    if (type === 'analysis') return quantumTokens.colors.neonDisplacement;
    if (type === 'mesh') return quantumTokens.colors.neonFlow;
    if (type === 'ai') return quantumTokens.colors.neonStress;
    if (type === 'results') return quantumTokens.colors.neonWarning;
    return quantumTokens.colors.quantumBrightEnd;
  };
  
  return {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: '2px',
    width: `${confidence}%`,
    backgroundColor: getColor(),
    transition: quantumTokens.animation.transitions.normal,
  };
});

const MicButton = styled(IconButton)(({ theme }) => ({
  color: quantumTokens.colors.quantumBrightEnd,
  '&:hover': {
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    boxShadow: quantumTokens.shadows.glow.subtle(quantumTokens.colors.quantumBrightEnd),
  },
}));

// 命令类型标签
const CommandTypeChip = styled(Chip)<{ commandtype: string }>(({ commandtype }) => {
  const getColor = () => {
    switch (commandtype) {
      case 'analysis': return quantumTokens.colors.neonDisplacement;
      case 'mesh': return quantumTokens.colors.neonFlow;
      case 'ai': return quantumTokens.colors.neonStress;
      case 'results': return quantumTokens.colors.neonWarning;
      case 'modeling': return quantumTokens.colors.quantumDeepEnd;
      default: return quantumTokens.colors.quantumBrightEnd;
    }
  };
  
  return {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: `1px solid ${getColor()}`,
    color: getColor(),
    fontSize: '0.7rem',
    height: '20px',
  };
});

// 获取命令类型的图标
const getCommandIcon = (type: string) => {
  switch (type) {
    case 'analysis': return <AnalyticsIcon sx={{ color: quantumTokens.colors.neonDisplacement }} />;
    case 'mesh': return <CodeIcon sx={{ color: quantumTokens.colors.neonFlow }} />;
    case 'modeling': return <ArchitectureIcon sx={{ color: quantumTokens.colors.quantumDeepEnd }} />;
    case 'results': return <TimelineIcon sx={{ color: quantumTokens.colors.neonWarning }} />;
    case 'ai': return <ScienceIcon sx={{ color: quantumTokens.colors.neonStress }} />;
    case 'system': return <AssistantIcon sx={{ color: quantumTokens.colors.quantumBrightEnd }} />;
    default: return <ConstructionIcon sx={{ color: quantumTokens.colors.quantumBrightEnd }} />;
  }
};

// 示例建议命令
const exampleCommands: CommandSuggestion[] = [
  {
    id: 'analysis-1',
    title: '分析深基坑支护结构稳定性',
    description: '使用渗流-结构耦合分析计算深基坑支护结构稳定性',
    icon: <AnalyticsIcon />,
    confidence: 95,
    type: 'analysis'
  },
  {
    id: 'mesh-1',
    title: '优化网格细化参数',
    description: '根据应力梯度自动调整网格细化参数',
    icon: <CodeIcon />,
    confidence: 88,
    type: 'mesh'
  },
  {
    id: 'ai-1',
    title: '启动参数反演',
    description: '使用物理AI系统反演土体材料参数',
    icon: <ScienceIcon />,
    confidence: 75,
    type: 'ai'
  },
  {
    id: 'modeling-1',
    title: '修改支护墙体厚度为800mm',
    description: '更新模型中的支护墙体厚度参数',
    icon: <ArchitectureIcon />,
    confidence: 90,
    type: 'modeling'
  },
  {
    id: 'results-1',
    title: '可视化墙体位移',
    description: '在3D视图中显示支护墙体的水平位移',
    icon: <TimelineIcon />,
    confidence: 92,
    type: 'results'
  }
];

interface AICommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onExecuteCommand?: (command: string) => void;
}

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  open,
  onClose,
  onExecuteCommand
}) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 处理命令面板打开状态
  useEffect(() => {
    if (open) {
      setExpanded(false);
      setQuery('');
      setSuggestions([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);
  
  // 处理查询变化
  useEffect(() => {
    if (query.length > 0) {
      setExpanded(true);
      setIsProcessing(true);
      
      // 模拟API调用延迟
      const timer = setTimeout(() => {
        setIsProcessing(false);
        // 返回过滤后的建议
        setSuggestions(
          exampleCommands
            .filter(cmd => 
              cmd.title.toLowerCase().includes(query.toLowerCase()) || 
              cmd.description.toLowerCase().includes(query.toLowerCase())
            )
            .map(cmd => ({
              ...cmd,
              confidence: Math.min(100, cmd.confidence + Math.random() * 10 - 5) // 随机调整置信度以模拟AI评分
            }))
            .sort((a, b) => b.confidence - a.confidence)
        );
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setExpanded(false);
      setSuggestions([]);
    }
  }, [query]);
  
  // 处理命令执行
  const handleExecuteCommand = (command: CommandSuggestion) => {
    if (onExecuteCommand) {
      onExecuteCommand(command.title);
    }
    onClose();
  };
  
  // 处理语音识别切换
  const toggleVoiceRecognition = () => {
    setIsListening(prev => !prev);
    
    if (!isListening) {
      // 在这里集成语音识别API
      // 这里是模拟
      setTimeout(() => {
        setQuery('分析深基坑支护结构');
        setIsListening(false);
      }, 2000);
    }
  };
  
  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && suggestions.length > 0 && !isProcessing) {
      handleExecuteCommand(suggestions[0]);
    }
  };

  if (!open) return null;

  return (
    <Fade in={open}>
      <CommandContainer>
        <Box sx={{ p: 1 }}>
          <SearchField
            inputRef={inputRef}
            fullWidth
            placeholder="输入命令或用语音描述你想做什么..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="outlined"
            InputProps={{
              startAdornment: isProcessing ? (
                <CircularProgress size={20} sx={{ mr: 1, color: quantumTokens.colors.quantumBrightEnd }} />
              ) : (
                <SearchIcon sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.5)' }} />
              ),
              endAdornment: (
                <>
                  <MicButton
                    onClick={toggleVoiceRecognition}
                    color={isListening ? 'primary' : 'default'}
                    size="small"
                  >
                    <MicIcon sx={{ color: isListening ? quantumTokens.colors.neonStress : 'rgba(255, 255, 255, 0.5)' }} />
                  </MicButton>
                  <IconButton size="small" onClick={onClose}>
                    <CloseIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  </IconButton>
                </>
              ),
            }}
          />
        </Box>
        
        {expanded && (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {suggestions.length > 0 ? (
              <List sx={{ py: 0 }}>
                {suggestions.map((command, index) => (
                  <React.Fragment key={command.id}>
                    {index > 0 && <Divider sx={{ opacity: 0.1 }} />}
                    <ListItem 
                      button 
                      onClick={() => handleExecuteCommand(command)}
                      sx={{ 
                        py: 1.5, 
                        position: 'relative',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getCommandIcon(command.type)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1" component="span" sx={{ color: '#fff' }}>
                              {command.title}
                            </Typography>
                            <CommandTypeChip 
                              label={command.type.toUpperCase()} 
                              size="small" 
                              commandtype={command.type}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                            {command.description}
                          </Typography>
                        }
                      />
                      <ConfidenceBar confidence={command.confidence} type={command.type} />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {isProcessing ? '处理中...' : '没有找到匹配的命令'}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CommandContainer>
    </Fade>
  );
};

export default AICommandPalette; 