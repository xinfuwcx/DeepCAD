import React, { useState, useEffect, useCallback } from 'react';
import { notification, Badge, Button, Typography, Space, Avatar, Tag } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CloseOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface SmartNotification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'computation' | 'visualization' | 'ai' | 'security';
  read: boolean;
  actionable?: boolean;
  action?: () => void;
  actionText?: string;
}

export const SmartNotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 模拟系统通知生成
  useEffect(() => {
    const generateNotification = () => {
      const notificationTypes = [
        {
          type: 'success' as const,
          title: 'CAE计算完成',
          message: '深基坑分析计算已成功完成，结果已生成。',
          category: 'computation' as const,
          priority: 'medium' as const
        },
        {
          type: 'warning' as const,
          title: 'GPU温度警告',
          message: '显卡温度达到75°C，建议检查散热系统。',
          category: 'system' as const,
          priority: 'high' as const,
          actionable: true,
          actionText: '查看详情'
        },
        {
          type: 'info' as const,
          title: 'AI模型更新',
          message: '新的PINN模型已下载，性能提升15%。',
          category: 'ai' as const,
          priority: 'medium' as const
        },
        {
          type: 'error' as const,
          title: '网格生成失败',
          message: '几何体存在拓扑错误，无法生成有效网格。',
          category: 'computation' as const,
          priority: 'high' as const,
          actionable: true,
          actionText: '修复几何'
        },
        {
          type: 'system' as const,
          title: '系统性能优化',
          message: 'WebGPU加速已启用，渲染性能提升3倍。',
          category: 'visualization' as const,
          priority: 'low' as const
        }
      ];

      const randomNotification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      
      const newNotification: SmartNotification = {
        id: Date.now().toString(),
        ...randomNotification,
        timestamp: new Date(),
        read: false,
        action: randomNotification.actionable ? () => {
          console.log(`执行操作: ${randomNotification.actionText}`);
        } : undefined
      };

      setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // 最多保留50条
    };

    // 初始通知
    generateNotification();
    
    // 定期生成新通知 (演示用)
    const interval = setInterval(generateNotification, 15000);
    return () => clearInterval(interval);
  }, []);

  // 计算未读数量
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getNotificationIcon = (type: string, category: string) => {
    if (type === 'success') return <CheckCircleOutlined style={{ color: '#10b981' }} />;
    if (type === 'warning') return <WarningOutlined style={{ color: '#f59e0b' }} />;
    if (type === 'error') return <FireOutlined style={{ color: '#ef4444' }} />;
    
    switch (category) {
      case 'computation': return <ThunderboltOutlined style={{ color: '#8b5cf6' }} />;
      case 'visualization': return <EyeOutlined style={{ color: '#00d9ff' }} />;
      case 'ai': return <InfoCircleOutlined style={{ color: '#10b981' }} />;
      case 'security': return <WarningOutlined style={{ color: '#f59e0b' }} />;
      default: return <InfoCircleOutlined style={{ color: '#00d9ff' }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#00d9ff';
      case 'low': return '#10b981';
      default: return '#666666';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* 通知触发按钮 */}
      <motion.div
        style={{
          position: 'fixed',
          top: '20px',
          right: '80px',
          zIndex: 1000
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Badge count={unreadCount} overflowCount={99}>
          <Button
            type="text"
            icon={<BellOutlined />}
            onClick={() => setIsOpen(!isOpen)}
            style={{
              color: 'white',
              fontSize: '18px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}
          />
        </Badge>
      </motion.div>

      {/* 通知面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              top: '70px',
              right: '20px',
              width: '400px',
              maxHeight: '600px',
              background: 'rgba(26, 26, 46, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              zIndex: 1001,
              overflow: 'hidden'
            }}
          >
            {/* 头部 */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(135deg, rgba(0,217,255,0.1), rgba(139,92,246,0.1))'
            }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <BellOutlined style={{ color: '#00d9ff' }} />
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>
                    系统通知
                  </Text>
                  <Tag color="processing">{notifications.length}</Tag>
                </Space>
                <Space>
                  {unreadCount > 0 && (
                    <Button size="small" type="text" onClick={markAllAsRead}>
                      全部已读
                    </Button>
                  )}
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<SettingOutlined />}
                    style={{ color: 'white' }}
                  />
                  <Button 
                    size="small" 
                    type="text" 
                    icon={<CloseOutlined />}
                    onClick={() => setIsOpen(false)}
                    style={{ color: 'white' }}
                  />
                </Space>
              </Space>
            </div>

            {/* 通知列表 */}
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
              padding: '8px'
            }}>
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 300, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      margin: '8px 0',
                      padding: '12px',
                      background: notification.read 
                        ? 'rgba(255,255,255,0.05)' 
                        : 'rgba(0,217,255,0.1)',
                      border: `1px solid ${notification.read 
                        ? 'rgba(255,255,255,0.1)' 
                        : 'rgba(0,217,255,0.3)'}`,
                      borderRadius: '8px',
                      borderLeft: `4px solid ${getPriorityColor(notification.priority)}`,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => markAsRead(notification.id)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Space style={{ width: '100%' }} align="start">
                      <Avatar
                        size="small"
                        icon={getNotificationIcon(notification.type, notification.category)}
                        style={{ 
                          background: 'transparent',
                          border: `1px solid ${getPriorityColor(notification.priority)}`
                        }}
                      />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '4px'
                        }}>
                          <Text style={{ 
                            color: 'white', 
                            fontWeight: notification.read ? 'normal' : 'bold',
                            fontSize: '0.9rem'
                          }}>
                            {notification.title}
                          </Text>
                          <Button
                            type="text"
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            style={{ 
                              color: 'rgba(255,255,255,0.5)',
                              minWidth: 'auto',
                              padding: '0 4px'
                            }}
                          />
                        </div>
                        
                        <Text style={{ 
                          color: 'rgba(255,255,255,0.8)', 
                          fontSize: '0.8rem',
                          display: 'block',
                          marginBottom: '8px',
                          lineHeight: '1.4'
                        }}>
                          {notification.message}
                        </Text>
                        
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Space>
                            <Tag 
                              size="small" 
                              color={getPriorityColor(notification.priority)}
                            >
                              {notification.priority}
                            </Tag>
                            <Text style={{ 
                              color: 'rgba(255,255,255,0.5)', 
                              fontSize: '0.7rem' 
                            }}>
                              {formatTime(notification.timestamp)}
                            </Text>
                          </Space>
                          
                          {notification.actionable && (
                            <Button
                              size="small"
                              type="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.action?.();
                              }}
                              style={{ fontSize: '0.7rem' }}
                            >
                              {notification.actionText}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Space>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {notifications.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'rgba(255,255,255,0.5)'
                  }}
                >
                  <BellOutlined style={{ fontSize: '2rem', marginBottom: '16px' }} />
                  <div>暂无通知</div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartNotificationSystem;