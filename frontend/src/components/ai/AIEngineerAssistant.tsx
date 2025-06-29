/**
 * @file AIEngineerAssistant.tsx
 * @description AI工程师助手 - 智能对话式参数设置和分析建议
 * @author Deep Excavation Team
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Fade,
  Slide,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tooltip,
  Badge,
  Fab
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  Send,
  SmartToy,
  Person,
  VolumeUp,
  VolumeOff,
  Mic,
  MicOff,
  Psychology,
  Engineering,
  TipsAndUpdates,
  Warning,
  CheckCircle,
  Science,
  Calculate,
  AutoAwesome,
  Close,
  Minimize
} from '@mui/icons-material';

// AI思考动画
const aiThinking = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(90deg); }
  50% { transform: scale(1.2) rotate(180deg); }
  75% { transform: scale(1.1) rotate(270deg); }
  100% { transform: scale(1) rotate(360deg); }
`;

// 消息泡泡动画
const messageAppear = keyframes`
  0% { 
    opacity: 0; 
    transform: translateY(20px) scale(0.8); 
  }
  100% { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
`;

// AI消息卡片
const AIMessageCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.1), rgba(25, 118, 210, 0.05))',
  border: '1px solid rgba(66, 165, 245, 0.3)',
  borderRadius: '20px 20px 20px 5px',
  animation: `${messageAppear} 0.5s ease-out`,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: -8,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: '8px 8px 0 0',
    borderColor: 'rgba(66, 165, 245, 0.3) transparent transparent transparent'
  }
}));

// 用户消息卡片
const UserMessageCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(220, 0, 78, 0.1), rgba(194, 24, 91, 0.05))',
  border: '1px solid rgba(220, 0, 78, 0.3)',
  borderRadius: '20px 20px 5px 20px',
  animation: `${messageAppear} 0.3s ease-out`,
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    right: -8,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: '8px 0 0 8px',
    borderColor: 'rgba(220, 0, 78, 0.3) transparent transparent transparent'
  }
}));

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  parameters?: any[];
  warning?: boolean;
  data?: any;
}

interface AIEngineerAssistantProps {
  onParameterApply?: (parameters: any[]) => void;
  onAnalysisRequest?: (config: any) => void;
  projectContext?: any;
  onClose?: () => void;
  open?: boolean;
}

const AIEngineerAssistant: React.FC<AIEngineerAssistantProps> = ({
  onParameterApply,
  onAnalysisRequest,
  projectContext,
  onClose,
  open = false
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '你好！我是你的AI工程师助手 🤖 我可以帮助你：\n\n• 智能设置FEM分析参数\n• 提供工程建议和优化方案\n• 解答深基坑分析问题\n• 实时监控计算状态\n\n请告诉我你需要什么帮助？',
      timestamp: new Date(),
      suggestions: ['设置土体参数', '优化支护方案', '检查分析设置', '查看计算结果']
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // AI响应模拟
  const generateAIResponse = async (userMessage: string): Promise<Message> => {
    // 模拟AI思考时间
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const lowerMessage = userMessage.toLowerCase();
    
    // 智能响应逻辑
    if (lowerMessage.includes('参数') || lowerMessage.includes('设置')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: '我来帮你设置FEM分析参数！📊\n\n基于当前深基坑项目，我推荐以下参数配置：',
        timestamp: new Date(),
        parameters: [
          { name: '粘聚力', value: 25, unit: 'kPa', suggestion: '适用于粘性土' },
          { name: '内摩擦角', value: 28, unit: '°', suggestion: '基于土质报告' },
          { name: '弹性模量', value: 30000, unit: 'kPa', suggestion: '考虑固结状态' }
        ],
        suggestions: ['应用这些参数', '调整材料模型', '查看工程验证']
      };
    }
    
    if (lowerMessage.includes('优化') || lowerMessage.includes('建议')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: '🎯 基于AI分析，我发现以下优化机会：\n\n• 支护结构可优化30%材料用量\n• 建议采用变刚度设计\n• 施工步序可优化，减少2个施工阶段\n\n这将提高安全性并降低成本！',
        timestamp: new Date(),
        suggestions: ['查看详细方案', '应用优化建议', '风险评估'],
        data: { optimization: true, savings: '30%' }
      };
    }
    
    if (lowerMessage.includes('错误') || lowerMessage.includes('问题')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: '⚠️ 我检测到几个需要注意的问题：\n\n1. 泊松比超出合理范围 (>0.45)\n2. 网格质量可能影响计算精度\n3. 边界条件需要验证\n\n我可以帮你自动修复这些问题。',
        timestamp: new Date(),
        warning: true,
        suggestions: ['自动修复', '详细诊断', '手动调整']
      };
    }
    
    // 默认响应
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: `我理解你的问题："${userMessage}"\n\n🤔 让我基于深基坑工程经验为你提供专业建议...\n\n作为AI工程师，我建议从以下几个方面考虑：\n• 土体特性与本构模型选择\n• 支护结构设计优化\n• 施工步序合理性\n• 安全监测要求\n\n需要我详细解释哪个方面？`,
      timestamp: new Date(),
      suggestions: ['土体建模', '支护设计', '施工模拟', '监测方案']
    };
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      const aiResponse = await generateAIResponse(inputValue);
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI响应失败:', error);
    } finally {
      setIsThinking(false);
    }
  };

  // 快速建议处理
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  // 应用AI建议的参数
  const applyAIParameters = (parameters: any[]) => {
    onParameterApply?.(parameters);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'ai',
      content: '✅ 参数已应用！我会继续监控分析状态并提供实时建议。',
      timestamp: new Date(),
      suggestions: ['开始FEM分析', '查看参数详情', '设置监测点']
    }]);
  };

  if (isMinimized) {
    return (
      <Fab
        color="secondary"
        sx={{ 
          position: 'fixed',
          bottom: 20,
          left: 20,
          background: 'linear-gradient(45deg, #42a5f5, #dc004e)',
          animation: `${aiThinking} 3s ease-in-out infinite`
        }}
        onClick={() => setIsMinimized(false)}
      >
        <Badge badgeContent={messages.filter(m => m.type === 'ai').length} color="error">
          <SmartToy />
        </Badge>
      </Fab>
    );
  }

  return (
    <Card sx={{ 
      position: 'fixed',
      bottom: 20,
      left: 20,
      width: 400,
      height: 600,
      background: 'rgba(13, 27, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(66, 165, 245, 0.3)',
      borderRadius: '20px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1300
    }}>
      {/* 标题栏 */}
      <CardContent sx={{ p: 2, borderBottom: '1px solid rgba(66, 165, 245, 0.2)' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Avatar sx={{ 
              bgcolor: 'primary.main', 
              mr: 1,
              animation: isThinking ? `${aiThinking} 2s linear infinite` : 'none'
            }}>
              <SmartToy />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
                AI工程师助手
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isThinking ? '正在思考...' : '在线 • FEM专家'}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Tooltip title={isVoiceEnabled ? '关闭语音' : '开启语音'}>
              <IconButton 
                size="small" 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                color={isVoiceEnabled ? 'primary' : 'default'}
              >
                {isVoiceEnabled ? <VolumeUp /> : <VolumeOff />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="最小化">
              <IconButton size="small" onClick={() => setIsMinimized(true)}>
                <Minimize />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>

      {/* 消息列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {messages.map((message, index) => (
          <Box key={message.id} sx={{ mb: 2 }}>
            <Box display="flex" alignItems="flex-start" gap={1}>
              {message.type === 'ai' && (
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 32, 
                  height: 32,
                  animation: isThinking && index === messages.length - 1 ? `${aiThinking} 1.5s linear infinite` : 'none'
                }}>
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
              )}
              
              <Box sx={{ flex: 1, ...(message.type === 'user' && { display: 'flex', justifyContent: 'flex-end' }) }}>
                {message.type === 'ai' ? (
                  <AIMessageCard>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="body2" sx={{ color: 'white', whiteSpace: 'pre-line' }}>
                        {message.content}
                      </Typography>
                      
                      {/* AI建议的参数 */}
                      {message.parameters && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>
                            🎯 推荐参数:
                          </Typography>
                          {message.parameters.map((param, i) => (
                            <Box key={i} sx={{ 
                              background: 'rgba(66, 165, 245, 0.1)',
                              borderRadius: 1,
                              p: 1,
                              mb: 1
                            }}>
                              <Typography variant="body2" sx={{ color: 'white' }}>
                                <strong>{param.name}:</strong> {param.value} {param.unit}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {param.suggestion}
                              </Typography>
                            </Box>
                          ))}
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<AutoAwesome />}
                            onClick={() => applyAIParameters(message.parameters!)}
                            sx={{ mt: 1 }}
                          >
                            应用这些参数
                          </Button>
                        </Box>
                      )}
                      
                      {/* 警告信息 */}
                      {message.warning && (
                        <Chip 
                          icon={<Warning />}
                          label="需要注意"
                          color="warning"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                      
                      {/* 快速建议 */}
                      {message.suggestions && (
                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {message.suggestions.map((suggestion, i) => (
                            <Chip
                              key={i}
                              label={suggestion}
                              size="small"
                              variant="outlined"
                              color="primary"
                              onClick={() => handleSuggestionClick(suggestion)}
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </AIMessageCard>
                ) : (
                  <Box display="flex" alignItems="flex-start" gap={1}>
                    <UserMessageCard sx={{ maxWidth: '80%' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          {message.content}
                        </Typography>
                      </CardContent>
                    </UserMessageCard>
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                      <Person sx={{ fontSize: 18 }} />
                    </Avatar>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        ))}
        
        {/* AI思考指示器 */}
        {isThinking && (
          <Box display="flex" alignItems="center" gap={1} sx={{ ml: 5 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              AI正在分析...
            </Typography>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入区域 */}
      <CardContent sx={{ p: 2, borderTop: '1px solid rgba(66, 165, 245, 0.2)' }}>
        <Box display="flex" gap={1} alignItems="flex-end">
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={3}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="问我任何关于深基坑FEM分析的问题..."
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                '& fieldset': {
                  borderColor: 'rgba(66, 165, 245, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(66, 165, 245, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
              '& .MuiInputBase-input': {
                color: 'white',
              }
            }}
          />
          
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={!inputValue.trim() || isThinking}
            sx={{
              background: 'linear-gradient(45deg, #42a5f5, #dc004e)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976d2, #c2185b)',
              }
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AIEngineerAssistant;
