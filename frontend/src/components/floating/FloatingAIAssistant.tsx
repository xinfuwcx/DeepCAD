/**
 * 悬浮AI助手 - 右下角经典🧠图标助手
 * DeepCAD AI Assistant - 1号专家智能对话系统
 * 经典悬浮设计 + RAG增强功能
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiAssistantWithRAG, ChatMessage } from '../../services/AIAssistantWithRAG';

// ======================= 接口定义 =======================

interface FloatingAIAssistantProps {
  position?: {
    bottom?: number;
    right?: number;
    left?: number;
    top?: number;
  };
}

// ======================= 悬浮AI助手组件 =======================

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  position = { bottom: 30, right: 30 }
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 初始化AI助手
  useEffect(() => {
    if (!isInitialized) {
      initializeAI();
    }
  }, [isInitialized]);
  
  const initializeAI = async () => {
    try {
      console.log('🧠 初始化悬浮AI助手...');
      await aiAssistantWithRAG.initialize();
      
      const history = aiAssistantWithRAG.getChatHistory();
      setMessages(history);
      setIsInitialized(true);
      
      // 显示欢迎闪烁
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 3000);
      
      console.log('✅ 悬浮AI助手初始化完成');
    } catch (error) {
      console.error('❌ 悬浮AI助手初始化失败:', error);
    }
  };
  
  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // 发送消息
  const sendMessage = async () => {
    if (!inputText.trim() || isTyping || !isInitialized) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setIsTyping(true);
    
    try {
      const response = await aiAssistantWithRAG.askQuestion(messageText);
      const updatedHistory = aiAssistantWithRAG.getChatHistory();
      setMessages(updatedHistory);
      
      // 如果对话框未展开，增加未读计数
      if (!isExpanded) {
        setUnreadCount(prev => prev + 1);
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 2000);
      }
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
    } finally {
      setIsTyping(false);
    }
  };
  
  // 处理展开/收起
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setUnreadCount(0);
      setIsBlinking(false);
      // 聚焦输入框
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
    }
  };
  
  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      ...position,
      zIndex: 10000,
      userSelect: 'none'
    }}>
      {/* 展开的对话面板 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            style={{
              position: 'absolute',
              bottom: '80px',
              right: '0',
              width: '350px',
              height: '500px',
              background: 'rgba(0, 0, 0, 0.95)',
              border: '2px solid #00ffff',
              borderRadius: '20px 20px 20px 4px',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: `
                0 0 30px rgba(0, 255, 255, 0.3),
                0 0 60px rgba(0, 255, 255, 0.1)
              `
            }}
          >
            {/* 标题栏 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgba(0, 255, 255, 0.1)',
              borderBottom: '1px solid rgba(0, 255, 255, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  style={{ fontSize: '20px' }}
                >
                  🧠
                </motion.div>
                <div>
                  <div style={{ 
                    color: '#00ffff', 
                    fontSize: '14px', 
                    fontWeight: 'bold' 
                  }}>
                    DeepCAD AI
                  </div>
                  <div style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    fontSize: '10px' 
                  }}>
                    {isInitialized ? '🟢 在线' : '🔴 初始化中...'}
                  </div>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleToggle}
                style={{
                  background: 'rgba(255, 100, 100, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ffffff',
                  padding: '4px 8px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </motion.button>
            </div>
            
            {/* 消息区域 */}
            <div style={{
              flex: 1,
              padding: '12px',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 255, 255, 0.5) transparent'
            }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    background: message.role === 'user' ? 
                      'linear-gradient(135deg, rgba(0, 150, 255, 0.8), rgba(0, 100, 200, 0.8))' :
                      message.role === 'system' ?
                      'rgba(100, 100, 100, 0.6)' :
                      'rgba(0, 255, 255, 0.2)',
                    border: `1px solid ${message.role === 'user' ? '#0096ff' : '#00ffff'}`,
                    borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '12px',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </div>
                    
                    {/* 时间戳 */}
                    <div style={{
                      fontSize: '9px',
                      opacity: 0.6,
                      marginTop: '4px',
                      textAlign: message.role === 'user' ? 'right' : 'left'
                    }}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    
                    {/* AI回答的置信度 */}
                    {message.role === 'assistant' && message.metadata?.confidence && (
                      <div style={{
                        marginTop: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>置信度:</span>
                        <div style={{
                          flex: 1,
                          height: '2px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '1px',
                          overflow: 'hidden'
                        }}>
                          <div
                            style={{
                              width: `${message.metadata.confidence}%`,
                              height: '100%',
                              background: message.metadata.confidence > 70 ?
                                '#00ff00' : message.metadata.confidence > 40 ? '#ffff00' : '#ff8800',
                              borderRadius: '1px'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '9px', color: '#00ffff' }}>
                          {message.metadata.confidence.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* 打字指示器 */}
              {isTyping && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: 'rgba(0, 255, 255, 0.1)',
                  borderRadius: '12px 12px 12px 4px',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '14px' }}>🧠</div>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <span style={{ color: '#00ffff', fontSize: '11px' }}>思考中</span>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        style={{
                          width: '3px',
                          height: '3px',
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
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* 输入区域 */}
            <div style={{
              display: 'flex',
              padding: '12px',
              gap: '8px',
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
                  !isInitialized ? "初始化中..." :
                  isTyping ? "AI正在思考..." :
                  "问我任何问题..."
                }
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#ffffff',
                  fontSize: '11px',
                  outline: 'none'
                }}
              />
              
              <motion.button
                whileHover={!isTyping && isInitialized ? { scale: 1.05 } : {}}
                whileTap={!isTyping && isInitialized ? { scale: 0.95 } : {}}
                onClick={sendMessage}
                disabled={!inputText.trim() || isTyping || !isInitialized}
                style={{
                  background: (!inputText.trim() || isTyping || !isInitialized) ?
                    'rgba(100, 100, 100, 0.5)' :
                    'linear-gradient(45deg, #00ffff, #0080ff)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: '#ffffff',
                  fontSize: '11px',
                  cursor: (!inputText.trim() || isTyping || !isInitialized) ? 
                    'not-allowed' : 'pointer',
                  minWidth: '40px'
                }}
              >
                {isTyping ? '⏳' : '🚀'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 悬浮按钮 - 经典🧠图标 */}
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          boxShadow: isBlinking ? [
            '0 0 20px rgba(0, 255, 255, 0.5)',
            '0 0 40px rgba(0, 255, 255, 0.8)',
            '0 0 20px rgba(0, 255, 255, 0.5)'
          ] : '0 0 20px rgba(0, 255, 255, 0.3)',
          scale: isBlinking ? [1, 1.1, 1] : 1
        }}
        transition={{
          duration: isBlinking ? 1 : 0.3,
          repeat: isBlinking ? Infinity : 0
        }}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: isInitialized ? 
            'linear-gradient(135deg, #00ffff, #0080ff, #ff00ff, #00ffff)' :
            'linear-gradient(135deg, #666666, #888888)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          cursor: 'pointer',
          position: 'relative',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden'
        }}
      >
        {/* 旋转背景光环 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            inset: '-2px',
            background: 'conic-gradient(from 0deg, transparent, #00ffff, transparent, #ff00ff, transparent)',
            borderRadius: '50%',
            zIndex: -1,
            opacity: isInitialized ? 0.8 : 0.3
          }}
        />
        
        {/* 🧠图标 */}
        <motion.div
          animate={isInitialized ? { 
            rotateY: [0, 15, -15, 0],
            scale: [1, 1.05, 1]
          } : {}}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          🧠
        </motion.div>
        
        {/* 未读消息标记 */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ff4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff'
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 状态指示灯 */}
        <div style={{
          position: 'absolute',
          bottom: '5px',
          right: '5px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: isInitialized ? '#00ff00' : '#ff8800',
          border: '2px solid #ffffff',
          boxShadow: `0 0 8px ${isInitialized ? '#00ff00' : '#ff8800'}`
        }} />
      </motion.button>
    </div>
  );
};

export default FloatingAIAssistant;