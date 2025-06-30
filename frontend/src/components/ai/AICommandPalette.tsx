/**
 * @file AICommandPalette.tsx
 * @description AI驱动命令面板 - 自然语言交互的未来界面
 * @author GitHub Copilot - AI交互设计师
 * @inspiration 《少数派报告》手势界面 + Siri + GitHub Copilot
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
  Fade,
  Slide,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Send,
  Psychology,
  AutoAwesome,
  Engineering,
  Science,
  ViewInAr,
  Calculate,
  Timeline,
  Memory,
  Speed,
  TrendingUp,
  Close,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { defaultTokens } from '../../styles/tokens/defaultTokens';

// 🧠 AI命令接口定义
interface AICommand {
  id: string;
  trigger: string;           // "分析基坑稳定性"
  intent: string;           // "structural_analysis"
  confidence: number;       // 0.95
  parameters: Record<string, any>;
  suggestions: string[];
  category: 'analysis' | 'modeling' | 'visualization' | 'optimization' | 'general';
  icon: React.ReactNode;
  estimatedTime?: number;   // 预估执行时间（秒）
  complexity?: 'low' | 'medium' | 'high';
}

// 🎯 意图识别结果接口
interface IntentResult {
  intent: string;
  confidence: number;
  entities: Array<{
    entity: string;
    value: string;
    confidence: number;
  }>;
  response: string;
}

// 💬 对话历史接口
interface ConversationHistory {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

// 🚀 AI命令面板属性
interface AICommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommandExecute: (command: AICommand) => void;
  context?: {
    currentProject?: string;
    activeModel?: string;
    selectedElements?: string[];
    analysisHistory?: any[];
  };
  className?: string;
}

// 🎤 语音识别Hook
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        setError(event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, transcript, error, startListening, stopListening };
};

// 🤖 AI意图识别服务 (模拟)
const mockAIService = {
  async analyzeIntent(input: string, context?: any): Promise<IntentResult> {
    // 模拟AI处理延迟
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const patterns = [
      { keywords: ['分析', '计算', '稳定性', '安全系数'], intent: 'structural_analysis', confidence: 0.95 },
      { keywords: ['建模', '几何', '模型'], intent: 'geometric_modeling', confidence: 0.90 },
      { keywords: ['网格', '划分', '细化'], intent: 'mesh_generation', confidence: 0.88 },
      { keywords: ['可视化', '显示', '图表'], intent: 'visualization', confidence: 0.85 },
      { keywords: ['优化', '改进', '建议'], intent: 'optimization', confidence: 0.82 },
      { keywords: ['导出', '保存', '报告'], intent: 'export_data', confidence: 0.80 },
    ];
    
    let bestMatch = { intent: 'general_query', confidence: 0.3 };
    
    for (const pattern of patterns) {
      const matchCount = pattern.keywords.filter(keyword => 
        input.toLowerCase().includes(keyword)
      ).length;
      
      if (matchCount > 0) {
        const confidence = Math.min(0.95, pattern.confidence * (matchCount / pattern.keywords.length));
        if (confidence > bestMatch.confidence) {
          bestMatch = { intent: pattern.intent, confidence };
        }
      }
    }
    
    return {
      intent: bestMatch.intent,
      confidence: bestMatch.confidence,
      entities: [],
      response: `我理解您想要进行${bestMatch.intent}操作，置信度: ${Math.round(bestMatch.confidence * 100)}%`
    };
  },

  async getSuggestions(input: string): Promise<string[]> {
    const suggestions = [
      '分析深基坑支护结构稳定性',
      '生成三维有限元网格',
      '计算土体位移场分布',
      '优化支护桩间距',
      '导出应力分析报告',
      '可视化渗流场分布',
      '分析施工阶段安全性',
      '评估地下水影响',
    ];
    
    return suggestions
      .filter(s => s.toLowerCase().includes(input.toLowerCase()) || input.length < 2)
      .slice(0, 6);
  }
};

// 🎨 命令建议组件
const CommandSuggestion: React.FC<{
  command: AICommand;
  onSelect: (command: AICommand) => void;
  isSelected: boolean;
}> = ({ command, onSelect, isSelected }) => {
  const theme = useTheme();
  
  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'low': return theme.palette.success.main;
      case 'medium': return theme.palette.warning.main;
      case 'high': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };
  
  return (
    <ListItem
      button
      selected={isSelected}
      onClick={() => onSelect(command)}
      sx={{
        borderRadius: defaultTokens.borderRadius.medium,
        mb: 1,
        transition: defaultTokens.transitions.preset.quantumScale,
        backgroundColor: isSelected 
          ? alpha(theme.palette.primary.main, 0.1)
          : 'transparent',
        border: isSelected 
          ? `1px solid ${theme.palette.primary.main}`
          : '1px solid transparent',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          transform: 'translateX(4px)',
          boxShadow: defaultTokens.shadows.quantum.float,
        },
      }}
    >
      <ListItemIcon>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            background: defaultTokens.colors.quantum.primary,
            color: 'white',
          }}
        >
          {command.icon}
        </Avatar>
      </ListItemIcon>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {command.trigger}
            </Typography>
            <Chip
              size="small"
              label={`${Math.round(command.confidence * 100)}%`}
              sx={{
                height: 20,
                fontSize: '0.75rem',
                backgroundColor: alpha(theme.palette.success.main, 0.2),
                color: theme.palette.success.main,
              }}
            />
          </Box>
        }
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {command.intent.replace('_', ' ')}
            </Typography>
            {command.estimatedTime && (
              <Chip
                size="small"
                label={`~${command.estimatedTime}s`}
                sx={{
                  height: 16,
                  fontSize: '0.7rem',
                  backgroundColor: alpha(getComplexityColor(command.complexity), 0.2),
                  color: getComplexityColor(command.complexity),
                }}
              />
            )}
          </Box>
        }
      />
    </ListItem>
  );
};

// 🚀 主组件
const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  isOpen,
  onClose,
  onCommandExecute,
  context,
  className,
}) => {
  const theme = useTheme();
  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
  
  // 状态管理
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [commands, setCommands] = useState<AICommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [conversation, setConversation] = useState<ConversationHistory[]>([]);
  
  // 引用
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  // 模拟命令数据
  const mockCommands: AICommand[] = [
    {
      id: 'structural_analysis',
      trigger: '分析深基坑支护结构稳定性',
      intent: 'structural_analysis',
      confidence: 0.95,
      parameters: { analysisType: 'stability', structure: 'retaining_wall' },
      suggestions: ['使用有限元方法', '考虑土-结构相互作用', '检查安全系数'],
      category: 'analysis',
      icon: <Engineering />,
      estimatedTime: 120,
      complexity: 'high',
    },
    {
      id: 'mesh_generation',
      trigger: '生成三维有限元网格',
      intent: 'mesh_generation',
      confidence: 0.90,
      parameters: { meshType: 'tetrahedral', density: 'fine' },
      suggestions: ['自动网格细化', '边界层处理', '质量检查'],
      category: 'modeling',
      icon: <ViewInAr />,
      estimatedTime: 45,
      complexity: 'medium',
    },
    {
      id: 'ai_optimization',
      trigger: '使用AI优化支护参数',
      intent: 'ai_optimization',
      confidence: 0.88,
      parameters: { target: 'safety_factor', method: 'genetic_algorithm' },
      suggestions: ['多目标优化', '参数敏感性分析', '成本效益评估'],
      category: 'optimization',
      icon: <Psychology />,
      estimatedTime: 300,
      complexity: 'high',
    },
  ];
  
  // 处理输入变化
  const handleInputChange = useCallback(async (value: string) => {
    setInput(value);
    
    if (value.length > 1) {
      setIsProcessing(true);
      
      try {
        // 获取建议
        const newSuggestions = await mockAIService.getSuggestions(value);
        setSuggestions(newSuggestions);
        
        // 分析意图
        const intentResult = await mockAIService.analyzeIntent(value, context);
        
        // 生成相关命令
        const relevantCommands = mockCommands.filter(cmd => 
          cmd.intent === intentResult.intent || 
          cmd.trigger.toLowerCase().includes(value.toLowerCase())
        );
        
        setCommands(relevantCommands);
        setSelectedIndex(0);
      } catch (error) {
        console.error('AI处理错误:', error);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setSuggestions([]);
      setCommands([]);
    }
  }, [context]);
  
  // 处理语音识别结果
  useEffect(() => {
    if (transcript) {
      handleInputChange(transcript);
    }
  }, [transcript, handleInputChange]);
  
  // 键盘导航
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, commands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (commands[selectedIndex]) {
        handleCommandSelect(commands[selectedIndex]);
      }
    } else if (event.key === 'Escape') {
      onClose();
    }
  };
  
  // 选择命令
  const handleCommandSelect = (command: AICommand) => {
    // 添加到对话历史
    const userMessage: ConversationHistory = {
      id: Date.now().toString(),
      type: 'user',
      content: command.trigger,
      timestamp: new Date(),
    };
    
    const aiResponse: ConversationHistory = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: `正在执行: ${command.trigger}`,
      timestamp: new Date(),
      metadata: command,
    };
    
    setConversation(prev => [...prev, userMessage, aiResponse]);
    onCommandExecute(command);
    onClose();
  };
  
  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <Fade in={isOpen}>
      <Box
        className={className}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: defaultTokens.zIndex.modal,
          backgroundColor: defaultTokens.colors.glass.modal,
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          pt: '10vh',
        }}
        onClick={onClose}
      >
        <Slide direction="down" in={isOpen} mountOnEnter unmountOnExit>
          <Paper
            onClick={(e) => e.stopPropagation()}
            sx={{
              width: '90%',
              maxWidth: 600,
              maxHeight: '80vh',
              background: defaultTokens.colors.glass.card,
              backdropFilter: 'blur(24px)',
              border: `1px solid ${defaultTokens.colors.glass.borderGlow}`,
              borderRadius: defaultTokens.borderRadius.modal,
              boxShadow: defaultTokens.shadows.quantum.levitate,
              overflow: 'hidden',
            }}
          >
            {/* 头部 */}
            <Box
              sx={{
                p: 3,
                borderBottom: `1px solid ${defaultTokens.colors.glass.border}`,
                background: defaultTokens.colors.quantum.primary,
                color: 'white',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Psychology />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      🤖 AI智能助手
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      自然语言驱动的深基坑分析
                    </Typography>
                  </Box>
                </Box>
                
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                  <Close />
                </IconButton>
              </Box>
            </Box>
            
            {/* 输入区域 */}
            <Box sx={{ p: 3, borderBottom: `1px solid ${defaultTokens.colors.glass.border}` }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  ref={inputRef}
                  fullWidth
                  placeholder="请描述您想要执行的操作，如：分析深基坑稳定性..."
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  multiline
                  maxRows={3}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: defaultTokens.colors.glass.surface,
                      '&.Mui-focused': {
                        boxShadow: defaultTokens.shadows.neon.blue,
                      },
                    },
                  }}
                />
                
                <IconButton
                  color={isListening ? 'error' : 'primary'}
                  onClick={isListening ? stopListening : startListening}
                  sx={{
                    minWidth: 48,
                    height: 48,
                    backgroundColor: isListening 
                      ? alpha(theme.palette.error.main, 0.1)
                      : alpha(theme.palette.primary.main, 0.1),
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: isListening 
                        ? defaultTokens.shadows.neon.pink
                        : defaultTokens.shadows.neon.blue,
                    },
                  }}
                >
                  {isListening ? <MicOff /> : <Mic />}
                </IconButton>
                
                <IconButton
                  color="primary"
                  disabled={!input.trim()}
                  onClick={() => commands[0] && handleCommandSelect(commands[0])}
                  sx={{
                    minWidth: 48,
                    height: 48,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  <Send />
                </IconButton>
              </Box>
              
              {/* 处理状态 */}
              {isProcessing && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress 
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '& .MuiLinearProgress-bar': {
                        background: defaultTokens.colors.quantum.primary,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    🧠 AI正在理解您的需求...
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* 命令建议 */}
            {commands.length > 0 && (
              <Box sx={{ p: 3, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main' }}>
                  💡 智能建议
                </Typography>
                
                <List sx={{ p: 0 }}>
                  {commands.map((command, index) => (
                    <CommandSuggestion
                      key={command.id}
                      command={command}
                      onSelect={handleCommandSelect}
                      isSelected={index === selectedIndex}
                    />
                  ))}
                </List>
              </Box>
            )}
            
            {/* 快速建议 */}
            {suggestions.length > 0 && (
              <Box sx={{ p: 3, pt: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                  💭 常用命令
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {suggestions.map((suggestion, index) => (
                    <Chip
                      key={index}
                      label={suggestion}
                      size="small"
                      clickable
                      onClick={() => handleInputChange(suggestion)}
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.2),
                          transform: 'translateY(-1px)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {/* 空状态 */}
            {!isProcessing && input.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <AutoAwesome sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>
                  🚀 AI助手已就绪
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  使用自然语言描述您的需求，或点击麦克风使用语音输入
                </Typography>
              </Box>
            )}
          </Paper>
        </Slide>
      </Box>
    </Fade>
  );
};

export default AICommandPalette;
