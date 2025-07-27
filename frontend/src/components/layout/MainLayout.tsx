import React, { useState } from 'react';
import { Layout, Menu, Avatar, Badge, Typography } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DashboardOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  BuildOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  TeamOutlined,
  CodeOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import DashboardViewPro from '../../views/DashboardViewPro';
import UISystemView from '../../views/UISystemView';
import GeologyView from '../../views/GeologyView';
import GeometryView from '../../views/GeometryView';
import MeshingView from '../../views/MeshingView';
import AnalysisView from '../../views/AnalysisView';
import ResultsView from '../../views/ResultsView';
import LandingView from '../../views/LandingView';
import MaterialLibraryView from '../../views/MaterialLibraryView';
import SettingsView from '../../views/SettingsView';
import PhysicsAIView from '../../views/PhysicsAIView';
import MainWorkspaceView from '../../views/MainWorkspaceView';
import EnhancedMainWorkspaceView from '../../views/EnhancedMainWorkspaceView';
import DataFlowDemoView from '../../views/DataFlowDemoView';
import ExcavationWorkflowView from '../../views/ExcavationWorkflowView';
import { EpicControlCenter } from '../control/EpicControlCenter';
import { ComponentExampleShowcase } from '../../examples/ComponentExamples';
import AIAssistantFloating from '../AIAssistantFloating';
import SmartNotificationSystem from '../ui/SmartNotificationSystem';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Epic控制中心',
    },
    {
      key: '/geometry',
      icon: <AppstoreOutlined />,
      label: '几何建模 (2号专家)',
    },
    {
      key: '/meshing',
      icon: <BuildOutlined />,
      label: '网格生成',
    },
    {
      key: '/analysis',
      icon: <CalculatorOutlined />,
      label: '计算分析 (3号专家)',
    },
    {
      key: '/results',
      icon: <BarChartOutlined />,
      label: '结果查看',
    },
    {
      key: '/physics-ai',
      icon: <ExperimentOutlined />,
      label: '物理AI',
    },
    {
      key: '/materials',
      icon: <DatabaseOutlined />,
      label: '材料库',
    },
    {
      key: '/examples',
      icon: <CodeOutlined />,
      label: '开发示例',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#000011' }}>
      {/* 🚀 Epic级左侧控制面板 - 大屏震撼质感 */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, type: "spring", bounce: 0.3 }}
        style={{
          width: collapsed ? '80px' : '280px',
          minHeight: '100vh',
          background: `
            linear-gradient(135deg, 
              rgba(0, 0, 17, 0.95) 0%, 
              rgba(0, 20, 40, 0.9) 25%, 
              rgba(16, 33, 62, 0.85) 50%, 
              rgba(0, 20, 40, 0.9) 75%, 
              rgba(0, 0, 17, 0.95) 100%
            ),
            radial-gradient(ellipse at 30% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(255, 0, 255, 0.08) 0%, transparent 50%)
          `,
          borderRight: '2px solid transparent',
          backgroundImage: `
            linear-gradient(135deg, rgba(0, 0, 17, 0.95), rgba(16, 33, 62, 0.85)),
            linear-gradient(90deg, #00ffff20, #ff00ff15, #00ffff20)
          `,
          backgroundOrigin: 'border-box',
          backgroundClip: 'content-box, border-box',
          backdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: `
            2px 0 30px rgba(0, 255, 255, 0.2),
            inset -1px 0 0 rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          position: 'relative',
          zIndex: 1000,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        {/* 动态背景粒子效果 */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 60%, rgba(255, 0, 255, 0.02) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(0, 150, 255, 0.025) 0%, transparent 50%)
          `,
          animation: 'epicPulse 8s ease-in-out infinite',
          pointerEvents: 'none'
        }} />

        {/* 🎮 Epic Logo标识区域 */}
        <motion.div 
          style={{ 
            height: collapsed ? '80px' : '100px', 
            margin: collapsed ? '12px' : '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: collapsed ? '20px' : '30px',
            flexDirection: collapsed ? 'column' : 'row',
            gap: collapsed ? '8px' : '15px',
            position: 'relative',
            borderBottom: '2px solid transparent',
            borderImage: 'linear-gradient(90deg, transparent, #00ffff60, #ff00ff40, #00ffff60, transparent) 1',
            paddingBottom: collapsed ? '12px' : '20px',
            cursor: 'pointer'
          }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400 }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {/* Logo with Epic Effects */}
          <motion.div
            style={{
              width: collapsed ? '40px' : '60px',
              height: collapsed ? '40px' : '60px',
              background: 'linear-gradient(45deg, #00ffff 0%, #0080ff 25%, #ff00ff 50%, #0080ff 75%, #00ffff 100%)',
              borderRadius: collapsed ? '10px' : '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: collapsed ? '20px' : '28px',
              position: 'relative',
              boxShadow: `
                0 0 25px rgba(0, 255, 255, 0.6),
                0 0 50px rgba(0, 255, 255, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `,
              cursor: 'pointer'
            }}
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              boxShadow: [
                '0 0 25px rgba(0, 255, 255, 0.6), 0 0 50px rgba(0, 255, 255, 0.3)',
                '0 0 35px rgba(255, 0, 255, 0.8), 0 0 70px rgba(255, 0, 255, 0.4)',
                '0 0 25px rgba(0, 255, 255, 0.6), 0 0 50px rgba(0, 255, 255, 0.3)'
              ]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                background: 'linear-gradient(to bottom, #8B4513 0%, #654321 30%, #2F4F4F 100%)',
                border: '2px solid #00ffff',
                borderRadius: '6px',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '0',
                height: '0',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '10px solid #00ffff',
                filter: 'drop-shadow(0 0 4px #00ffff)'
              }} />
            </motion.div>
            
            {/* 光环效果 */}
            <motion.div
              style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: collapsed ? '14px' : '20px',
                background: 'linear-gradient(45deg, transparent, #00ffff, transparent, #ff00ff, transparent)',
                opacity: 0.7,
                zIndex: -1
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
          
          {/* Brand Text */}
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div 
                style={{ 
                  color: 'transparent',
                  background: 'linear-gradient(90deg, #00ffff, #ffffff, #ff00ff, #ffffff, #00ffff)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  textShadow: '0 0 15px rgba(0, 255, 255, 0.6)',
                  letterSpacing: '2px',
                  marginBottom: '4px'
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                DeepCAD
              </motion.div>
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: '11px',
                textAlign: 'center',
                letterSpacing: '1px',
                opacity: 0.9
              }}>
                🏗️ 深基坑工程系统
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 🎛️ Epic Navigation Menu */}
        <div style={{ 
          padding: collapsed ? '0 8px' : '0 16px',
          marginBottom: '20px'
        }}>
          {menuItems.map((item, index) => {
            const isSelected = location.pathname === item.key;
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                onClick={() => handleMenuClick({ key: item.key })}
                whileHover={{ 
                  scale: 1.02,
                  x: 5
                }}
                whileTap={{ scale: 0.98 }}
                style={{
                  marginBottom: '8px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <motion.div
                  animate={{
                    background: isSelected ? 
                      [
                        'linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 255, 0.15))',
                        'linear-gradient(90deg, rgba(255, 0, 255, 0.15), rgba(0, 255, 255, 0.2))',
                        'linear-gradient(90deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 255, 0.15))'
                      ] : 'transparent',
                    borderColor: isSelected ? 
                      ['#00ffff80', '#ff00ff60', '#00ffff80'] : 'transparent'
                  }}
                  transition={{
                    duration: isSelected ? 2 : 0.3,
                    repeat: isSelected ? Infinity : 0,
                    ease: "linear"
                  }}
                  style={{
                    padding: collapsed ? '12px 8px' : '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: isSelected ? '#00ffff80' : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? '0' : '12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Glow effect for selected item */}
                  {isSelected && (
                    <motion.div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
                        zIndex: -1
                      }}
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                  
                  {/* Icon */}
                  <motion.div
                    animate={isSelected ? {
                      color: ['#00ffff', '#ff00ff', '#00ffff'],
                      textShadow: [
                        '0 0 8px #00ffff',
                        '0 0 12px #ff00ff',
                        '0 0 8px #00ffff'
                      ]
                    } : { color: '#ffffff80' }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      fontSize: collapsed ? '18px' : '16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {item.icon}
                  </motion.div>
                  
                  {/* Label */}
                  {!collapsed && (
                    <motion.span
                      animate={isSelected ? {
                        color: ['#ffffff', '#00ffff', '#ffffff'],
                        textShadow: [
                          '0 0 5px rgba(255, 255, 255, 0.5)',
                          '0 0 10px rgba(0, 255, 255, 0.8)',
                          '0 0 5px rgba(255, 255, 255, 0.5)'
                        ]
                      } : { color: '#ffffff90' }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{
                        fontSize: '14px',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* 🔥 Epic User Profile */}
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '16px',
              right: '16px',
              padding: '16px',
              background: `
                linear-gradient(135deg, 
                  rgba(0, 255, 255, 0.1) 0%, 
                  rgba(255, 0, 255, 0.05) 50%, 
                  rgba(0, 255, 255, 0.1) 100%
                )
              `,
              borderRadius: '12px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              backdropFilter: 'blur(15px)',
              boxShadow: '0 8px 25px rgba(0, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background animation */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(45deg, rgba(0, 255, 255, 0.02), rgba(255, 0, 255, 0.01))',
                zIndex: -1
              }}
              animate={{
                background: [
                  'linear-gradient(45deg, rgba(0, 255, 255, 0.02), rgba(255, 0, 255, 0.01))',
                  'linear-gradient(45deg, rgba(255, 0, 255, 0.01), rgba(0, 255, 255, 0.02))',
                  'linear-gradient(45deg, rgba(0, 255, 255, 0.02), rgba(255, 0, 255, 0.01))'
                ]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                style={{ position: 'relative' }}
              >
                <Badge dot color="#52c41a" style={{ fontSize: '8px' }}>
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 15px rgba(0, 255, 255, 0.6)',
                        '0 0 25px rgba(0, 255, 255, 0.8)',
                        '0 0 15px rgba(0, 255, 255, 0.6)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #00ffff, #0080ff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      position: 'relative',
                      width: '20px',
                      height: '20px',
                      background: 'linear-gradient(to bottom, #8B4513 0%, #654321 30%, #2F4F4F 100%)',
                      border: '1px solid #ffffff',
                      borderRadius: '3px'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '0',
                        height: '0',
                        borderLeft: '3px solid transparent',
                        borderRight: '3px solid transparent',
                        borderTop: '5px solid #ffffff'
                      }} />
                    </div>
                  </motion.div>
                </Badge>
              </motion.div>
              
              <div style={{ flex: 1 }}>
                <motion.div
                  animate={{
                    color: ['#ffffff', '#00ffff', '#ffffff']
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{ 
                    fontSize: '15px', 
                    fontWeight: 'bold',
                    marginBottom: '2px'
                  }}
                >
                  CAE工程师
                </motion.div>
                <div style={{ 
                  color: '#00ff6480', 
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.8, 1, 0.8]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#00ff64'
                    }}
                  />
                  在线 • 深基坑系统
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Collapse button for collapsed state */}
        {collapsed && (
          <motion.div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              cursor: 'pointer'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCollapsed(false)}
          >
            <motion.div
              animate={{
                background: [
                  'linear-gradient(45deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.2))',
                  'linear-gradient(45deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.3))',
                  'linear-gradient(45deg, rgba(0, 255, 255, 0.3), rgba(255, 0, 255, 0.2))'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#ffffff',
                border: '1px solid rgba(0, 255, 255, 0.5)'
              }}
            >
              🏗️
            </motion.div>
          </motion.div>
        )}

        {/* CSS Animations */}
        <style>{`
          @keyframes epicPulse {
            0%, 100% { 
              opacity: 0.3;
              transform: scale(1);
            }
            50% { 
              opacity: 0.6;
              transform: scale(1.02);
            }
          }
        `}</style>
      </motion.div>

      <Layout>
        <Content style={{ 
          margin: 0, 
          background: '#001122',
          minHeight: '100vh',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <Routes>
            <Route path="/" element={
              <EpicControlCenter 
                onExit={() => navigate('/')}
                onProjectSelect={(projectId) => console.log('项目选择:', projectId)}
              />
            } />
            <Route path="/dashboard" element={
              <EpicControlCenter 
                onExit={() => navigate('/')}
                onProjectSelect={(projectId) => console.log('项目选择:', projectId)}
              />
            } />
            <Route path="/geometry" element={<EnhancedMainWorkspaceView activeModule="geometry" />} />
            <Route path="/meshing" element={<EnhancedMainWorkspaceView activeModule="meshing" />} />
            <Route path="/analysis" element={<EnhancedMainWorkspaceView activeModule="analysis" />} />
            <Route path="/results" element={<EnhancedMainWorkspaceView activeModule="results" />} />
            <Route path="/physics-ai" element={<PhysicsAIView />} />
            <Route path="/materials" element={<MaterialLibraryView />} />
            <Route path="/examples" element={<ComponentExampleShowcase />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </Content>
      </Layout>
      
      {/* 全局浮动AI助手 */}
      <AIAssistantFloating 
        position="bottom-right"
        defaultExpanded={false}
      />
      
      {/* 智能通知系统 */}
      <SmartNotificationSystem />
    </Layout>
  );
};

export default MainLayout;