import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Avatar, Card, Spin, Space, Tag, Tooltip, Typography } from 'antd';
import { 
  UserOutlined, 
  RobotOutlined, 
  SendOutlined, 
  CloseOutlined,
  BulbOutlined as BrainOutlined,
  ExperimentOutlined,
  CalculatorOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  FileTextOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../api/client';
import { useAIStore } from '../stores/useAIStore';

const { Text } = Typography;

interface Message {
  text: string;
  sender: 'user' | 'assistant';
  timestamp?: Date;
  type?: 'text' | 'command' | 'suggestion';
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: '你好！我是DeepCAD AI助手，可以帮你进行几何建模、网格生成、FEM分析和物理AI优化。有什么需要帮助的吗？', 
      sender: 'assistant',
      timestamp: new Date()
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { closePanel } = useAIStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // 快捷命令
  const quickCommands = [
    { icon: <ExperimentOutlined />, text: '创建基坑模型', command: '帮我创建一个50米深的基坑模型' },
    { icon: <CalculatorOutlined />, text: '生成网格', command: '帮我生成计算网格' },
    { icon: <ThunderboltOutlined />, text: 'FEM分析', command: '开始FEM结构分析' },
    { icon: <BrainOutlined />, text: 'AI优化', command: '启动物理AI优化' },
    { icon: <ToolOutlined />, text: '后处理', command: '显示应力云图和位移矢量' },
    { icon: <QuestionCircleOutlined />, text: '操作指南', command: '如何使用DeepCAD进行完整的分析流程？' }
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { 
      text: inputValue, 
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInputValue = inputValue;
    setInputValue('');
    setLoading(true);

    try {
      const response = await apiClient.post('/ai/chat', {
        message: currentInputValue,
        conversation_id: conversationId,
      });

      const botMessage: Message = { 
        text: response.data.message, 
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      if (!conversationId) {
        setConversationId(response.data.conversation_id);
      }
    } catch (error) {
      const errorMessage: Message = { 
        text: '抱歉，我遇到了一个错误。这可能是网络连接问题或者后端服务暂时不可用。请稍后再试，或者您可以：\n\n1. 检查网络连接\n2. 刷新页面重试\n3. 查看系统文档获取帮助\n\n如果问题持续存在，请联系技术支持。', 
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCommand = (command: string) => {
    setInputValue(command);
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-tertiary)'
      }}>
        <Space>
          <Avatar 
            icon={<BrainOutlined />} 
            style={{ 
              backgroundColor: 'linear-gradient(45deg, #722ed1, #1890ff)',
              border: '2px solid var(--primary-color)' 
            }} 
          />
          <div>
            <Text strong style={{ color: 'white', fontSize: 14 }}>
              DeepCAD AI助手
            </Text>
            <div>
              <Tag color="processing">智能分析</Tag>
              <Tag color="success">在线</Tag>
            </div>
          </div>
        </Space>
        <Button 
          type="text" 
          icon={<CloseOutlined />} 
          onClick={closePanel}
          style={{ color: 'white' }}
        />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '12px',
          maxHeight: '180px'
        }}>
          <List
            itemLayout="horizontal"
            dataSource={messages}
            size="small"
            renderItem={(item, index) => (
              <List.Item key={index} style={{ 
                borderBottom: 'none',
                padding: '4px 0'
              }}>
                <List.Item.Meta
                  avatar={
                    item.sender === 'user' 
                      ? <Avatar size="small" icon={<UserOutlined />} /> 
                      : <Avatar 
                          size="small" 
                          icon={<RobotOutlined />} 
                          style={{ 
                            background: 'linear-gradient(45deg, #722ed1, #1890ff)'
                          }} 
                        />
                  }
                  title={
                    <Text style={{ 
                      color: 'white', 
                      fontSize: 12,
                      fontWeight: item.sender === 'assistant' ? 'bold' : 'normal'
                    }}>
                      {item.sender === 'user' ? '你' : 'AI助手'}
                      {item.timestamp && (
                        <Text style={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          fontSize: 10,
                          marginLeft: 8
                        }}>
                          {item.timestamp.toLocaleTimeString()}
                        </Text>
                      )}
                    </Text>
                  }
                  description={
                    <Text style={{ 
                      color: 'rgba(255,255,255,0.8)', 
                      fontSize: 12,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {item.text}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
          {loading && (
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <Spin size="small" />
              <Text style={{ color: 'white', marginLeft: 8, fontSize: 12 }}>
                AI正在思考...
              </Text>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Commands */}
        <div style={{ 
          width: '200px',
          borderLeft: '1px solid var(--border-color)',
          padding: '8px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <Text style={{ 
            color: 'white', 
            fontSize: 11, 
            fontWeight: 'bold',
            display: 'block',
            marginBottom: 8
          }}>
            快捷操作
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {quickCommands.map((cmd, index) => (
              <Tooltip key={index} title={cmd.command} placement="left">
                <Button 
                  size="small"
                  type="text"
                  icon={cmd.icon}
                  onClick={() => handleQuickCommand(cmd.command)}
                  style={{ 
                    color: 'white',
                    fontSize: 10,
                    height: '24px',
                    padding: '0 6px',
                    justifyContent: 'flex-start',
                    textAlign: 'left'
                  }}
                >
                  {cmd.text}
                </Button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div style={{ 
        padding: '8px 12px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-tertiary)'
      }}>
        <Input.Group compact>
          <Input
            style={{ width: 'calc(100% - 40px)' }}
            placeholder="请输入您的问题，比如：如何创建基坑模型？"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSendMessage}
            disabled={loading}
            size="small"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={loading}
            size="small"
            style={{ width: '40px' }}
          />
        </Input.Group>
      </div>
    </div>
  );
};

export default AIAssistant; 