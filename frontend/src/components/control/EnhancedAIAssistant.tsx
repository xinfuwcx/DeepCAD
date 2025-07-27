/**
 * 增强版AI助手面板 - 1号专家RAG智能对话系统
 * 集成检索增强生成功能，提供专业级AI问答体验
 * 炫酷未来感UI设计，完美融入控制中心
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiAssistantWithRAG, ChatMessage, RetrievedKnowledge } from '../../services/AIAssistantWithRAG';

// ======================= 接口定义 =======================

interface EnhancedAIAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  width?: number;
  height?: number;
}

interface TypingIndicatorProps {
  isVisible: boolean;
}

// ======================= 打字指示器组件 =======================

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(0, 255, 255, 0.1)',
            borderRadius: '12px',
            margin: '8px 0',
            border: '1px solid rgba(0, 255, 255, 0.3)'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #00ffff, #0080ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            🤖
          </div>
          
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ color: '#00ffff', fontSize: '14px' }}>AI正在思考</span>
            <motion.div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#00ffff'
                  }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ======================= 消息组件 =======================

const MessageBubble: React.FC<{ 
  message: ChatMessage; 
  onKnowledgeClick?: (knowledge: RetrievedKnowledge) => void;
}> = ({ message, onKnowledgeClick }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px'
      }}
    >
      <div style={{
        maxWidth: '80%',
        background: isUser ? 
          'linear-gradient(135deg, rgba(0, 150, 255, 0.8), rgba(0, 100, 200, 0.8))' :
          isSystem ?
          'linear-gradient(135deg, rgba(100, 100, 100, 0.8), rgba(80, 80, 80, 0.8))' :
          'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 200, 200, 0.2))',
        border: isUser ? 
          '2px solid rgba(0, 150, 255, 0.5)' :
          isSystem ?
          '1px solid rgba(100, 100, 100, 0.5)' :
          '2px solid rgba(0, 255, 255, 0.5)',
        borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
        padding: '12px 16px',
        color: '#ffffff',
        fontSize: '14px',
        lineHeight: '1.5',
        backdropFilter: 'blur(10px)',
        boxShadow: isUser ?
          '0 4px 15px rgba(0, 150, 255, 0.3)' :
          '0 4px 15px rgba(0, 255, 255, 0.2)'
      }}>
        {/* 消息内容 */}
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </div>
        
        {/* 时间戳 */}
        <div style={{
          fontSize: '10px',
          opacity: 0.7,
          marginTop: '8px',
          textAlign: isUser ? 'right' : 'left'
        }}>
          {message.timestamp.toLocaleTimeString()}
        </div>
        
        {/* AI回答的元数据 */}
        {!isUser && !isSystem && message.metadata && (
          <div style={{ marginTop: '12px' }}>
            {/* 置信度 */}
            {message.metadata.confidence && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>置信度:</span>
                <div style={{
                  flex: 1,
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${message.metadata.confidence}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    style={{
                      height: '100%',
                      background: message.metadata.confidence > 70 ?
                        'linear-gradient(90deg, #00ff00, #00ffff)' :
                        message.metadata.confidence > 40 ?
                        'linear-gradient(90deg, #ffff00, #ff8800)' :
                        'linear-gradient(90deg, #ff8800, #ff0000)',
                      borderRadius: '2px'
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#00ffff' }}>
                  {message.metadata.confidence.toFixed(0)}%
                </span>
              </div>
            )}
            
            {/* 知识来源 */}
            {message.metadata.sources && message.metadata.sources.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>
                  📚 知识来源:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {message.metadata.sources.slice(0, 3).map((source, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: '10px',
                        background: 'rgba(0, 255, 255, 0.2)',
                        border: '1px solid rgba(0, 255, 255, 0.4)',
                        borderRadius: '8px',
                        padding: '2px 6px',
                        color: '#00ffff'
                      }}
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* 相关知识条目 */}
            {message.metadata.retrievedKnowledge && 
             message.metadata.retrievedKnowledge.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>
                  🔗 相关知识:
                </div>
                {message.metadata.retrievedKnowledge.slice(0, 2).map((knowledge, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onKnowledgeClick?.(knowledge)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      marginBottom: '4px',
                      fontSize: '10px',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#00ffff' }}>
                      {knowledge.entry.title}
                    </div>
                    <div style={{ opacity: 0.7, marginTop: '2px' }}>
                      相关度: {(knowledge.relevanceScore * 100).toFixed(0)}%
                    </div>
                    {knowledge.matchedKeywords.length > 0 && (
                      <div style={{ marginTop: '2px' }}>
                        🏷️ {knowledge.matchedKeywords.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ======================= 建议问题组件 =======================

const SuggestedQuestions: React.FC<{
  questions: string[];
  onQuestionClick: (question: string) => void;
}> = ({ questions, onQuestionClick }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        💡 建议问题
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {questions.map((question, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onQuestionClick(question)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '12px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ opacity: 0.7 }}>❓</span> {question}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// ======================= 主AI助手组件 =======================

export const EnhancedAIAssistant: React.FC<EnhancedAIAssistantProps> = ({
  isVisible,
  onClose,
  width = 400,
  height = 600
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 初始化AI助手
  useEffect(() => {
    if (isVisible && !isInitialized && !isInitializing) {
      initializeAI();
    }
  }, [isVisible, isInitialized, isInitializing]);
  
  const initializeAI = async () => {
    setIsInitializing(true);
    try {
      console.log('🚀 正在初始化RAG增强AI助手...');
      await aiAssistantWithRAG.initialize();
      
      const history = aiAssistantWithRAG.getChatHistory();
      setMessages(history);
      
      const suggestions = aiAssistantWithRAG.getSuggestedQuestions();
      setSuggestedQuestions(suggestions);
      
      setIsInitialized(true);
      console.log('✅ RAG增强AI助手初始化完成');
    } catch (error) {
      console.error('❌ AI助手初始化失败:', error);
    } finally {
      setIsInitializing(false);
    }
  };
  
  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping || !isInitialized) return;
    
    const messageText = text.trim();
    setInputText('');
    setIsTyping(true);
    
    try {
      const response = await aiAssistantWithRAG.askQuestion(messageText);
      const updatedHistory = aiAssistantWithRAG.getChatHistory();
      setMessages(updatedHistory);
      
      // 更新建议问题
      const suggestions = aiAssistantWithRAG.getSuggestedQuestions();
      setSuggestedQuestions(suggestions);
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, isInitialized]);
  
  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };
  
  // 清空对话
  const clearChat = () => {
    aiAssistantWithRAG.clearHistory();
    setMessages([]);
    setSuggestedQuestions(aiAssistantWithRAG.getSuggestedQuestions());
  };
  
  // 处理建议问题点击
  const handleSuggestedQuestionClick = (question: string) => {
    setInputText(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // 处理知识条目点击
  const handleKnowledgeClick = (knowledge: RetrievedKnowledge) => {
    console.log('📚 查看知识条目:', knowledge.entry.title);
    // 这里可以打开知识详情弹窗
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: width, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: width, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '90px',
            width: `${width}px`,
            height: `${height}px`,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '3px solid transparent',
            borderImage: 'linear-gradient(135deg, #00ffff, #0080ff, #ff00ff, #00ffff) 1',
            borderRadius: '20px',
            backdropFilter: 'blur(20px)',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: `
              0 0 40px rgba(0, 255, 255, 0.3),
              0 0 80px rgba(0, 255, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `
          }}
        >
          {/* 标题栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '2px solid transparent',
            borderImage: 'linear-gradient(90deg, #00ffff, #ff00ff, #00ffff) 1',
            background: 'rgba(0, 20, 40, 0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(45deg, #00ffff, #0080ff)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
                }}
              >
                🤖
              </motion.div>
              <div>
                <h3 style={{
                  color: 'transparent',
                  background: 'linear-gradient(90deg, #00ffff, #ffffff, #ff00ff)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  RAG智能助手
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                  fontSize: '11px'
                }}>
                  {isInitializing ? '正在初始化...' : 
                   isInitialized ? '🟢 已连接知识库' : '🔴 未初始化'}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={clearChat}
                disabled={!isInitialized}
                style={{
                  background: 'rgba(255, 165, 0, 0.8)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '6px 8px',
                  fontSize: '10px',
                  cursor: isInitialized ? 'pointer' : 'not-allowed',
                  opacity: isInitialized ? 1 : 0.5
                }}
              >
                🗑️
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: 'rgba(255, 100, 100, 0.8)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '6px 8px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </motion.button>
            </div>
          </div>
          
          {/* 消息区域 */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0, 255, 255, 0.5) transparent'
          }}>
            {isInitializing ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '16px'
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ fontSize: '48px' }}
                >
                  ⚙️
                </motion.div>
                <div style={{ color: '#00ffff', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                    正在初始化RAG智能助手
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    正在加载知识库和向量索引...
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onKnowledgeClick={handleKnowledgeClick}
                  />
                ))}
                
                <TypingIndicator isVisible={isTyping} />
                
                {/* 建议问题 */}
                {!isTyping && messages.length > 1 && suggestedQuestions.length > 0 && (
                  <SuggestedQuestions
                    questions={suggestedQuestions}
                    onQuestionClick={handleSuggestedQuestionClick}
                  />
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          {/* 输入区域 */}
          <div style={{
            display: 'flex',
            padding: '16px',
            gap: '12px',
            borderTop: '1px solid rgba(0, 255, 255, 0.3)',
            background: 'rgba(0, 10, 20, 0.8)'
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isInitialized || isTyping}
              placeholder={
                !isInitialized ? "正在初始化..." :
                isTyping ? "AI正在思考..." :
                "请输入您的问题..."
              }
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.8)',
                border: '2px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 255, 255, 0.6)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 255, 255, 0.3)';
              }}
            />
            
            <motion.button
              whileHover={!isTyping && isInitialized ? { scale: 1.05 } : {}}
              whileTap={!isTyping && isInitialized ? { scale: 0.95 } : {}}
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isTyping || !isInitialized}
              style={{
                background: (!inputText.trim() || isTyping || !isInitialized) ?
                  'rgba(100, 100, 100, 0.5)' :
                  'linear-gradient(45deg, #00ffff, #0080ff)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: (!inputText.trim() || isTyping || !isInitialized) ? 
                  'not-allowed' : 'pointer',
                minWidth: '60px',
                boxShadow: (!inputText.trim() || isTyping || !isInitialized) ?
                  'none' : '0 0 15px rgba(0, 255, 255, 0.4)'
              }}
            >
              {isTyping ? '⏳' : '🚀'}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnhancedAIAssistant;