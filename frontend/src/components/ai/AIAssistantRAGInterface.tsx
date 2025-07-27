/**
 * DeepCAD AI助手RAG系统界面
 * 1号架构师 - 集成检索增强生成的智能AI助手系统
 * 结合知识库、向量搜索、LLM推理的完整RAG流程
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Typography, Progress, Divider, Tabs, Badge, Input, List, Avatar } from 'antd';
import {
  RobotOutlined,
  SearchOutlined,
  BulbOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  BranchesOutlined,
  ExperimentOutlined,
  BookOutlined,
  SettingOutlined,
  SendOutlined,
  LoadingOutlined,
  StarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { KnowledgeBaseAPI, type KnowledgeEntry } from '../../services/caeKnowledgeBase';
import { logger } from '../../utils/advancedLogger';
import { designTokens } from '../../design/tokens';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

// ==================== 类型定义 ====================

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  relatedKnowledge?: KnowledgeEntry[];
  confidenceScore?: number;
  processingTime?: number;
  tokens?: {
    input: number;
    output: number;
  };
}

interface RAGContext {
  query: string;
  retrievedKnowledge: KnowledgeEntry[];
  enhancedPrompt: string;
  confidenceScore: number;
}

interface AIAssistantRAGInterfaceProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  onContextUpdate?: (context: RAGContext) => void;
}

// ==================== RAG处理类 ====================

class RAGProcessor {
  private knowledgeCache: Map<string, KnowledgeEntry[]> = new Map();
  
  /**
   * 检索相关知识
   */
  async retrieveKnowledge(query: string, limit = 5): Promise<KnowledgeEntry[]> {
    try {
      // 检查缓存
      const cacheKey = query.toLowerCase().trim();
      if (this.knowledgeCache.has(cacheKey)) {
        return this.knowledgeCache.get(cacheKey) || [];
      }
      
      // 从知识库检索
      const results = await KnowledgeBaseAPI.searchKnowledge(query);
      const topResults = results.slice(0, limit);
      
      // 缓存结果
      this.knowledgeCache.set(cacheKey, topResults);
      
      logger.info('RAG知识检索完成', { 
        query, 
        resultCount: topResults.length 
      });
      
      return topResults;
    } catch (error) {
      logger.error('RAG知识检索失败', error);
      return [];
    }
  }
  
  /**
   * 构建增强提示词
   */
  buildEnhancedPrompt(query: string, knowledge: KnowledgeEntry[]): string {
    if (knowledge.length === 0) {
      return query;
    }
    
    const contextBlock = knowledge.map((entry, index) => {
      return `## 知识条目 ${index + 1}: ${entry.title}
**分类**: ${entry.category}
**难度**: ${entry.difficulty}
**内容**: ${entry.content}

${entry.parameters ? `**参数**:\n${Object.entries(entry.parameters).map(([key, param]) => 
  `- ${key}: ${param.value}${param.unit || ''} (${param.description})`
).join('\n')}\n` : ''}

${entry.formulas ? `**公式**:\n${entry.formulas.map(f => 
  `- ${f.name}: ${f.description}`
).join('\n')}\n` : ''}

${entry.tags.length > 0 ? `**标签**: ${entry.tags.join(', ')}\n` : ''}
---`;
    }).join('\n\n');
    
    return `# CAE专业知识上下文

${contextBlock}

# 用户问题
${query}

# 回答要求
请基于上述专业知识回答用户问题，确保：
1. 回答准确、专业，基于提供的知识内容
2. 如果涉及公式或参数，请详细说明
3. 提供实用的建议和最佳实践
4. 如果知识不足以完全回答问题，请诚实说明
5. 使用中文回答，保持专业但易懂的语调`;
  }
  
  /**
   * 计算置信度得分
   */
  calculateConfidenceScore(query: string, knowledge: KnowledgeEntry[]): number {
    if (knowledge.length === 0) return 0.1;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    let totalRelevance = 0;
    
    knowledge.forEach(entry => {
      const entryText = (entry.title + ' ' + entry.content + ' ' + entry.tags.join(' ')).toLowerCase();
      const matchCount = queryWords.filter(word => entryText.includes(word)).length;
      const relevance = matchCount / queryWords.length;
      totalRelevance += relevance;
    });
    
    const averageRelevance = totalRelevance / knowledge.length;
    return Math.min(0.95, Math.max(0.1, averageRelevance));
  }
}

// ==================== 主组件 ====================

export const AIAssistantRAGInterface: React.FC<AIAssistantRAGInterfaceProps> = ({
  className = '',
  style = {},
  width = 900,
  height = 700,
  onContextUpdate
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'system',
      content: `🤖 **DeepCAD AI助手** 已激活！

我是基于RAG（检索增强生成）技术的专业CAE助手，能够：

✨ **智能检索** - 从专业知识库中检索相关信息
🧠 **理解分析** - 理解你的CAE问题和需求  
📊 **生成答案** - 基于检索到的知识生成专业回答
🔍 **知识关联** - 提供相关的公式、参数和案例

**支持的专业领域**:
• 深基坑工程 • 有限元分析 • 地质建模 • 渗流分析
• 结构分析 • 稳定性分析 • GPU计算 • 智能优化

请输入你的CAE问题，我将为你提供专业的解答！`,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRAGContext, setCurrentRAGContext] = useState<RAGContext | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [knowledgeHistory, setKnowledgeHistory] = useState<KnowledgeEntry[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ragProcessor = useRef(new RAGProcessor());
  
  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // 模拟LLM API调用
  const callLLMAPI = async (enhancedPrompt: string): Promise<string> => {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    // 模拟基于知识的回答生成（实际应调用真实的LLM API）
    return `基于检索到的专业知识，我来为您详细解答：

${enhancedPrompt.includes('网格') ? `
关于有限元网格质量控制，关键要素包括：

**1. 单元质量指标**
- 长宽比(Aspect Ratio): 应控制在3以下
- 偏斜度(Skewness): 应小于0.85
- 正交质量: 应大于0.1

**2. 网格密度优化**
- 在应力集中区域加密网格
- 使用自适应网格技术
- 保证单元尺寸平滑过渡

**3. 实际建议**
- 使用四面体单元进行复杂几何建模
- 边界层区域使用结构化网格
- 定期进行网格收敛性分析
` : ''}

${enhancedPrompt.includes('深基坑') ? `
深基坑工程分析要点：

**1. 荷载分析**
- 土压力按朗肯理论或库伦理论计算
- 考虑地下水压力和动荷载影响
- 分阶段开挖的荷载传递路径

**2. 稳定性验算**
- 整体稳定性分析（安全系数≥1.2）
- 局部稳定性检查
- 抗倾覆和抗滑移验算

**3. 变形控制**
- 围护墙最大水平位移限制
- 周边地表沉降控制
- 实时监测和预警系统
` : ''}

这些分析基于我检索到的专业知识库内容，如需更详细的计算方法或参数设置，请告诉我具体的工程条件。`;
  };
  
  // 处理用户消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputValue.trim();
    setInputValue('');
    setIsProcessing(true);
    
    const startTime = Date.now();
    
    try {
      // Step 1: 知识检索
      logger.info('RAG流程开始', { query: currentQuery });
      const retrievedKnowledge = await ragProcessor.current.retrieveKnowledge(currentQuery, 5);
      
      // Step 2: 构建增强提示词
      const enhancedPrompt = ragProcessor.current.buildEnhancedPrompt(currentQuery, retrievedKnowledge);
      
      // Step 3: 计算置信度
      const confidenceScore = ragProcessor.current.calculateConfidenceScore(currentQuery, retrievedKnowledge);
      
      // Step 4: 更新RAG上下文
      const ragContext: RAGContext = {
        query: currentQuery,
        retrievedKnowledge,
        enhancedPrompt,
        confidenceScore
      };
      
      setCurrentRAGContext(ragContext);
      onContextUpdate?.(ragContext);
      
      // Step 5: 调用LLM生成回答
      const response = await callLLMAPI(enhancedPrompt);
      
      const processingTime = (Date.now() - startTime) / 1000;
      
      // Step 6: 生成助手消息
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response,
        timestamp: new Date(),
        relatedKnowledge: retrievedKnowledge,
        confidenceScore,
        processingTime,
        tokens: {
          input: enhancedPrompt.length,
          output: response.length
        }
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // 更新知识历史
      setKnowledgeHistory(prev => {
        const updated = [...retrievedKnowledge, ...prev];
        return updated.slice(0, 20); // 保持最近20条
      });
      
      logger.info('RAG流程完成', { 
        processingTime,
        knowledgeCount: retrievedKnowledge.length,
        confidenceScore 
      });
      
    } catch (error) {
      logger.error('RAG处理失败', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '抱歉，处理您的问题时遇到了技术故障。请稍后重试或联系技术支持。',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 渲染消息
  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            maxWidth: isSystem ? '100%' : '80%',
            padding: '12px 16px',
            borderRadius: '12px',
            background: isUser 
              ? 'linear-gradient(135deg, #1890ff, #096dd9)'
              : isSystem
              ? 'linear-gradient(135deg, #52c41a, #389e0d)'
              : 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* 消息头部 */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isUser ? (
                <Avatar size="small" icon={<SettingOutlined />} style={{ backgroundColor: '#1890ff' }} />
              ) : isSystem ? (
                <Avatar size="small" icon={<ThunderboltOutlined />} style={{ backgroundColor: '#52c41a' }} />
              ) : (
                <Avatar size="small" icon={<RobotOutlined />} style={{ backgroundColor: '#722ed1' }} />
              )}
              <Text style={{ 
                color: '#ffffff', 
                fontSize: '12px', 
                opacity: 0.9,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 500,
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}>
                {isUser ? '用户' : isSystem ? '系统' : 'AI助手'}
              </Text>
            </div>
            
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {message.confidenceScore && (
                <Badge count={`${Math.round(message.confidenceScore * 100)}%`} 
                       style={{ backgroundColor: '#52c41a' }} />
              )}
              {message.processingTime && (
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '11px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: 400,
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                }}>
                  <ClockCircleOutlined /> {message.processingTime.toFixed(1)}s
                </Text>
              )}
            </div>
          </div>
          
          {/* 消息内容 */}
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: '1.6',
            color: '#ffffff',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: 400,
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)'
          }}>
            {message.content}
          </div>
          
          {/* 相关知识显示 */}
          {message.relatedKnowledge && message.relatedKnowledge.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: '12px', 
                marginBottom: '8px', 
                display: 'block',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 400,
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)'
              }}>
                <DatabaseOutlined /> 基于 {message.relatedKnowledge.length} 条专业知识
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {message.relatedKnowledge.slice(0, 3).map((knowledge, index) => (
                  <Badge key={index} 
                         count={knowledge.title} 
                         style={{ backgroundColor: '#722ed1', fontSize: '10px' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // 渲染知识检索面板
  const renderKnowledgePanel = () => (
    <div style={{ padding: '16px' }}>
      <Title level={4} style={{ 
        color: '#ffffff', 
        marginBottom: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 600,
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }}>
        <DatabaseOutlined /> 知识检索状态
      </Title>
      
      {currentRAGContext && (
        <Card style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.1)', border: 'none' }}>
          <div style={{ marginBottom: '12px' }}>
            <Text style={{ 
              color: '#ffffff80',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 400,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)'
            }}>当前查询: </Text>
            <Text style={{ 
              color: '#ffffff',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 500,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)'
            }}>{currentRAGContext.query}</Text>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <Text style={{ 
              color: '#ffffff80',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 400,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)'
            }}>检索到知识: </Text>
            <Text style={{ 
              color: '#00d9ff',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 600,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)'
            }}>{currentRAGContext.retrievedKnowledge.length} 条</Text>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <Text style={{ 
              color: '#ffffff80',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 400,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)'
            }}>置信度: </Text>
            <Progress 
              percent={Math.round(currentRAGContext.confidenceScore * 100)} 
              size="small"
              strokeColor="#52c41a"
              style={{ width: '100px', display: 'inline-block', marginLeft: '8px' }}
            />
          </div>
        </Card>
      )}
      
      <Title level={5} style={{ 
        color: '#ffffff', 
        marginBottom: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 600,
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }}>
        相关知识条目
      </Title>
      
      <List
        dataSource={knowledgeHistory.slice(0, 10)}
        renderItem={(knowledge) => (
          <List.Item style={{ border: 'none', padding: '8px 0' }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ 
                  color: '#ffffff', 
                  fontSize: '13px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: 500,
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                }}>{knowledge.title}</Text>
                <Badge count={knowledge.difficulty} style={{ backgroundColor: '#722ed1' }} />
              </div>
              <Text style={{ 
                color: '#ffffff60', 
                fontSize: '11px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 400,
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)'
              }}>
                {knowledge.category} • {knowledge.tags.slice(0, 2).join(', ')}
              </Text>
            </div>
          </List.Item>
        )}
        style={{ maxHeight: '300px', overflowY: 'auto' }}
      />
    </div>
  );
  
  return (
    <motion.div
      className={`ai-assistant-rag-interface ${className}`}
      style={{
        width,
        height,
        background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
        borderRadius: designTokens.borderRadius.lg,
        border: '1px solid rgba(0, 217, 255, 0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* 标题栏 */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #722ed1, #531dab)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <RobotOutlined style={{ fontSize: '24px', color: '#ffffff' }} />
          </motion.div>
          <div>
            <Title level={4} style={{ 
              color: '#ffffff', 
              margin: 0,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 600,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}>
              AI助手 RAG系统
            </Title>
            <Text style={{ 
              color: 'rgba(255, 255, 255, 0.85)', 
              fontSize: '12px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 400,
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)'
            }}>
              检索增强生成 • 专业CAE知识库
            </Text>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge dot color="#52c41a">
            <DatabaseOutlined style={{ fontSize: '16px', color: '#ffffff80' }} />
          </Badge>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '11px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: 400,
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)'
          }}>
            {knowledgeHistory.length} 条知识已缓存
          </Text>
        </div>
      </div>
      
      {/* 主要内容区域 */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* 左侧聊天区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 消息区域 */}
          <div style={{ 
            flex: 1, 
            padding: '16px', 
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.2)'
          }}>
            {messages.map(renderMessage)}
            
            {/* 处理中指示器 */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ffffff80',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}
              >
                <LoadingOutlined spin />
                <span style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: 400,
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                }}>AI正在检索知识并生成回答...</span>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* 输入区域 */}
          <div style={{
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="输入CAE问题 (Shift+Enter换行，Enter发送)"
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff'
                }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                loading={isProcessing}
                disabled={!inputValue.trim()}
                style={{
                  background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                  border: 'none',
                  height: 'auto'
                }}
              >
                发送
              </Button>
            </div>
          </div>
        </div>
        
        {/* 右侧知识面板 */}
        <div style={{ 
          width: '300px', 
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            style={{ height: '100%' }}
            tabBarStyle={{ color: '#ffffff' }}
          >
            <TabPane 
              tab={<span><DatabaseOutlined /> 知识库</span>} 
              key="knowledge"
            >
              {renderKnowledgePanel()}
            </TabPane>
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
};

export default AIAssistantRAGInterface;