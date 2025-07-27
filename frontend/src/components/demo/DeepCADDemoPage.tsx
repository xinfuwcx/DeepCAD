/**
 * DeepCAD 大屏演示页面
 * 1号架构师 - 整合所有震撼效果的完整演示
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingLogo } from '../brand/Logo';
import { EpicFlightDemo } from '../visualization/EpicFlightDemo';
import { CAEParameterPanel } from '../ui/CAEParameterPanel';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { FunctionalIcons, StatusIcons } from '../icons/SimpleIcons';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface DeepCADDemoPageProps {
  className?: string;
  style?: React.CSSProperties;
  autoStart?: boolean;          // 自动开始演示
  fullscreen?: boolean;         // 全屏模式
  showControls?: boolean;       // 显示控制面板
}

interface DemoSection {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  duration?: number;            // 演示时长（秒）
}

interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  activeConnections: number;
  analysisQueue: number;
}

// ==================== 演示数据 ====================

const DEMO_SECTIONS: DemoSection[] = [
  {
    id: 'hero',
    name: '震撼开场',
    description: '从太空深处到基坑现场的史诗级视觉飞行',
    icon: <FunctionalIcons.ExcavationDesign size={24} />,
    component: null, // 将在组件中动态渲染
    duration: 30
  },
  {
    id: 'components',
    name: '组件展示',
    description: '专业CAE平台的完整UI组件库',
    icon: <FunctionalIcons.InterfaceDesign size={24} />,
    component: null,
    duration: 45
  },
  {
    id: 'parameters',
    name: '参数配置',
    description: '专业的深基坑分析参数设置界面',
    icon: <FunctionalIcons.GeologyModeling size={24} />,
    component: null,
    duration: 60
  },
  {
    id: 'analysis',
    name: '分析演示',
    description: '实时计算过程和结果可视化',
    icon: <FunctionalIcons.GPUComputing size={24} />,
    component: null,
    duration: 90
  }
];

const INITIAL_STATUS: SystemStatus = {
  cpuUsage: 0,
  memoryUsage: 0,
  gpuUsage: 0,
  activeConnections: 0,
  analysisQueue: 0
};

// ==================== 主演示组件 ====================

export const DeepCADDemoPage: React.FC<DeepCADDemoPageProps> = ({
  className = '',
  style,
  autoStart = true,
  fullscreen = true,
  showControls = true
}) => {
  // 状态管理
  const [isLoading, setIsLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<string>('hero');
  const [isPlaying, setIsPlaying] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(INITIAL_STATUS);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'info' | 'success' | 'warning' }>>([]);
  
  const demoRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化加载
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      if (autoStart) {
        setTimeout(() => startDemo(), 1000);
      }
    }, 3000);

    return () => clearTimeout(loadingTimer);
  }, [autoStart]);

  // 系统状态模拟
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setSystemStatus(prev => ({
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        gpuUsage: Math.max(0, Math.min(100, prev.gpuUsage + (Math.random() - 0.5) * 15)),
        activeConnections: Math.max(0, prev.activeConnections + Math.floor((Math.random() - 0.5) * 3)),
        analysisQueue: Math.max(0, prev.analysisQueue + Math.floor((Math.random() - 0.7) * 2))
      }));
    }, 2000);

    return () => clearInterval(statusInterval);
  }, []);

  // 开始演示
  const startDemo = useCallback(() => {
    setIsPlaying(true);
    setDemoProgress(0);
    setCurrentSection('hero');
    
    // 添加开始通知
    addNotification('演示已开始', 'info');
    
    // 自动播放进度
    progressIntervalRef.current = setInterval(() => {
      setDemoProgress(prev => {
        const newProgress = prev + 1;
        
        // 自动切换演示段落
        if (newProgress === 30) {
          setCurrentSection('components');
          addNotification('切换到组件展示', 'info');
        } else if (newProgress === 75) {
          setCurrentSection('parameters');
          addNotification('切换到参数配置', 'info');
        } else if (newProgress === 135) {
          setCurrentSection('analysis');
          addNotification('开始分析演示', 'success');
        } else if (newProgress >= 225) {
          // 演示结束
          setIsPlaying(false);
          addNotification('演示完成', 'success');
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          return 0;
        }
        
        return newProgress;
      });
    }, 1000);
  }, []);

  // 停止演示
  const stopDemo = useCallback(() => {
    setIsPlaying(false);
    setDemoProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    addNotification('演示已停止', 'warning');
  }, []);

  // 添加通知
  const addNotification = useCallback((message: string, type: 'info' | 'success' | 'warning') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // 5秒后自动移除通知
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // 切换段落
  const switchSection = useCallback((sectionId: string) => {
    setCurrentSection(sectionId);
    addNotification(`切换到：${DEMO_SECTIONS.find(s => s.id === sectionId)?.name}`, 'info');
  }, []);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      demoRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <motion.div
      ref={demoRef}
      className={`deepcad-demo-page ${className}`}
      style={{
        position: 'relative',
        width: fullscreen ? '100vw' : '100%',
        height: fullscreen ? '100vh' : '100%',
        background: '#000000',
        overflow: 'hidden',
        ...style
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 加载界面 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at center, rgba(0, 17, 34, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)',
              zIndex: 1000
            }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: designTokens.spacing[8]
            }}>
              <LoadingLogo />
              
              <div style={{ textAlign: 'center' }}>
                <h1 style={{
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize['4xl'],
                  fontWeight: designTokens.typography.fontWeight.bold,
                  marginBottom: designTokens.spacing[4],
                  background: `linear-gradient(135deg, ${designTokens.colors.primary[400]}, ${designTokens.colors.accent[400]})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  DeepCAD 演示系统
                </h1>
                
                <p style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.xl,
                  maxWidth: '600px',
                  lineHeight: designTokens.typography.lineHeight.relaxed,
                  margin: 0
                }}>
                  世界级深基坑CAE平台的完整技术演示
                </p>
                
                <motion.div
                  style={{
                    marginTop: designTokens.spacing[6],
                    height: '2px',
                    width: '300px',
                    background: designTokens.colors.neutral[800],
                    borderRadius: '1px',
                    overflow: 'hidden'
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: '300px' }}
                  transition={{ duration: 2.5 }}
                >
                  <motion.div
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.accent[500]})`,
                      borderRadius: 'inherit'
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.5, ease: 'easeOut' }}
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主演示内容 */}
      {!isLoading && (
        <>
          {/* 顶部HUD */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.9) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `0 ${designTokens.spacing[8]}`,
              zIndex: 100
            }}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {/* 左侧品牌信息 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[4]
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.accent[500]})`,
                borderRadius: designTokens.borderRadius.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FunctionalIcons.ExcavationDesign size={24} color="#ffffff" />
              </div>
              
              <div>
                <h1 style={{
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize.xl,
                  fontWeight: designTokens.typography.fontWeight.bold,
                  margin: 0,
                  lineHeight: 1
                }}>
                  DeepCAD Platform
                </h1>
                <p style={{
                  color: designTokens.colors.neutral[400],
                  fontSize: designTokens.typography.fontSize.sm,
                  margin: 0,
                  lineHeight: 1
                }}>
                  深基坑CAE技术演示
                </p>
              </div>
            </div>

            {/* 中间演示进度 */}
            {isPlaying && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing[4]
              }}>
                <div style={{
                  color: designTokens.colors.neutral[300],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontFamily: designTokens.typography.fontFamily.mono.join(', ')
                }}>
                  {Math.floor(demoProgress / 60).toString().padStart(2, '0')}:
                  {(demoProgress % 60).toString().padStart(2, '0')}
                </div>
                
                <div style={{
                  width: '200px',
                  height: '4px',
                  background: designTokens.colors.neutral[800],
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <motion.div
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.accent[500]})`,
                      borderRadius: 'inherit'
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${(demoProgress / 225) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <div style={{
                  color: designTokens.colors.primary[400],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontWeight: designTokens.typography.fontWeight.medium
                }}>
                  {DEMO_SECTIONS.find(s => s.id === currentSection)?.name}
                </div>
              </div>
            )}

            {/* 右侧系统状态 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[3]
            }}>
              <motion.div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: designTokens.colors.semantic.success
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              <span style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.sm
              }}>
                系统运行中
              </span>
              
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowSystemModal(true)}
              >
                详情
              </Button>
            </div>
          </motion.div>

          {/* 演示内容区域 */}
          <div style={{
            position: 'absolute',
            inset: 0,
            paddingTop: '80px',
            paddingBottom: showControls ? '120px' : 0
          }}>
            <AnimatePresence mode="wait">
              {/* 震撼开场 - 史诗飞行演示 */}
              {currentSection === 'hero' && (
                <motion.div
                  key="hero"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <EpicFlightDemo
                    width={window.innerWidth}
                    height={window.innerHeight - (showControls ? 200 : 80)}
                    autoStart={isPlaying}
                    showControls={false}
                  />
                </motion.div>
              )}

              {/* 组件展示 */}
              {currentSection === 'components' && (
                <motion.div
                  key="components"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: designTokens.spacing[8],
                    overflow: 'auto'
                  }}
                >
                  <ComponentShowcase />
                </motion.div>
              )}

              {/* 参数配置 */}
              {currentSection === 'parameters' && (
                <motion.div
                  key="parameters"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.8 }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <CAEParameterPanel
                    onParametersChange={(params) => {
                      console.log('演示参数更新:', params);
                    }}
                    onAnalysisStart={(params) => {
                      addNotification('分析任务已提交', 'success');
                      switchSection('analysis');
                    }}
                  />
                </motion.div>
              )}

              {/* 分析演示 */}
              {currentSection === 'analysis' && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.8 }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <AnalysisDemo />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 底部控制面板 */}
          {showControls && (
            <motion.div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '120px',
                background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.9) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `0 ${designTokens.spacing[8]}`,
                zIndex: 100
              }}
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing[6],
                background: designTokens.colors.background.glass,
                backdropFilter: 'blur(12px)',
                padding: designTokens.spacing[4],
                borderRadius: designTokens.borderRadius.xl,
                border: `1px solid ${designTokens.colors.neutral[700]}`
              }}>
                {/* 演示控制 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing[3]
                }}>
                  <Button
                    variant={isPlaying ? 'outline' : 'primary'}
                    size="lg"
                    leftIcon={isPlaying ? '⏸️' : '▶️'}
                    onClick={isPlaying ? stopDemo : startDemo}
                  >
                    {isPlaying ? '暂停' : '开始'}演示
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="md"
                    leftIcon="🔄"
                    onClick={() => {
                      stopDemo();
                      setTimeout(startDemo, 500);
                    }}
                  >
                    重新开始
                  </Button>
                </div>

                {/* 段落切换 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing[2]
                }}>
                  {DEMO_SECTIONS.map((section) => (
                    <Button
                      key={section.id}
                      variant={currentSection === section.id ? 'primary' : 'ghost'}
                      size="sm"
                      leftIcon={section.icon}
                      onClick={() => switchSection(section.id)}
                    >
                      {section.name}
                    </Button>
                  ))}
                </div>

                {/* 全屏控制 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing[2]
                }}>
                  <Button
                    variant="ghost"
                    size="md"
                    leftIcon="🖥️"
                    onClick={toggleFullscreen}
                  >
                    全屏
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="md"
                    leftIcon="⚙️"
                    onClick={() => setShowSystemModal(true)}
                  >
                    系统
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 通知系统 */}
          <div style={{
            position: 'absolute',
            top: '100px',
            right: designTokens.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[2],
            zIndex: 200
          }}>
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 100, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 100, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    padding: designTokens.spacing[3],
                    background: designTokens.colors.background.glass,
                    backdropFilter: 'blur(12px)',
                    borderRadius: designTokens.borderRadius.lg,
                    border: `1px solid ${
                      notification.type === 'success' ? designTokens.colors.semantic.success :
                      notification.type === 'warning' ? designTokens.colors.semantic.warning :
                      designTokens.colors.primary[500]
                    }40`,
                    color: designTokens.colors.neutral[100],
                    fontSize: designTokens.typography.fontSize.sm,
                    maxWidth: '300px',
                    boxShadow: designTokens.shadows.lg
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: designTokens.spacing[2]
                  }}>
                    <span style={{
                      color: notification.type === 'success' ? designTokens.colors.semantic.success :
                            notification.type === 'warning' ? designTokens.colors.semantic.warning :
                            designTokens.colors.primary[400]
                    }}>
                      {notification.type === 'success' ? '✓' : 
                       notification.type === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    {notification.message}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 系统状态模态框 */}
          <Modal
            open={showSystemModal}
            onClose={() => setShowSystemModal(false)}
            variant="glass"
            size="md"
            title="系统状态监控"
            description="DeepCAD平台实时运行状态"
            caeType="analysis"
          >
            <SystemStatusPanel status={systemStatus} />
          </Modal>
        </>
      )}
    </motion.div>
  );
};

// ==================== 组件展示子组件 ====================

const ComponentShowcase: React.FC = () => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: designTokens.spacing[6],
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <Card variant="premium" glowing>
        <h2 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          marginBottom: designTokens.spacing[6],
          textAlign: 'center'
        }}>
          UI组件库演示
        </h2>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing[4]
        }}>
          <div style={{
            display: 'flex',
            gap: designTokens.spacing[3],
            flexWrap: 'wrap'
          }}>
            <Button variant="primary" glow>主要操作</Button>
            <Button variant="secondary">次要操作</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
          </div>
          
          <Input
            label="几何参数输入"
            caeType="coordinate"
            type="number"
            placeholder="输入坐标值"
            unit="mm"
            precision={3}
            leftIcon="📐"
            helperText="专业CAE参数输入组件"
            fluid
          />
        </div>
      </Card>

      <Card variant="glass" animated>
        <h3 style={{
          color: designTokens.colors.secondary[400],
          fontSize: designTokens.typography.fontSize.xl,
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing[3]
        }}>
          <FunctionalIcons.MaterialLibrary size={24} />
          功能图标展示
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: designTokens.spacing[4],
          textAlign: 'center'
        }}>
          {[
            { icon: <FunctionalIcons.GeologyModeling size={32} />, name: '地质建模' },
            { icon: <FunctionalIcons.MeshGeneration size={32} />, name: '网格生成' },
            { icon: <FunctionalIcons.GPUComputing size={32} />, name: 'GPU计算' },
            { icon: <FunctionalIcons.StructuralAnalysis size={32} />, name: '结构分析' }
          ].map((item, index) => (
            <motion.div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: designTokens.spacing[2],
                padding: designTokens.spacing[3],
                borderRadius: designTokens.borderRadius.lg,
                border: `1px solid ${designTokens.colors.neutral[700]}`
              }}
              whileHover={{ 
                scale: 1.05,
                borderColor: designTokens.colors.primary[500]
              }}
              transition={{ duration: 0.2 }}
            >
              {item.icon}
              <span style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.xs
              }}>
                {item.name}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ==================== 分析演示子组件 ====================

const AnalysisDemo: React.FC = () => {
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisPhase, setAnalysisPhase] = useState('初始化');

  useEffect(() => {
    const phases = [
      { name: '初始化', duration: 10 },
      { name: '网格生成', duration: 20 },
      { name: '材料赋值', duration: 15 },
      { name: '边界设置', duration: 10 },
      { name: '求解计算', duration: 30 },
      { name: '结果处理', duration: 15 }
    ];

    let currentProgress = 0;
    let phaseIndex = 0;

    const progressInterval = setInterval(() => {
      currentProgress += 1;
      setAnalysisProgress(currentProgress);

      // 更新阶段
      let totalDuration = 0;
      for (let i = 0; i <= phaseIndex; i++) {
        totalDuration += phases[i].duration;
      }

      if (currentProgress >= totalDuration && phaseIndex < phases.length - 1) {
        phaseIndex++;
        setAnalysisPhase(phases[phaseIndex].name);
      }

      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        setAnalysisPhase('完成');
      }
    }, 200);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: designTokens.spacing[8],
      textAlign: 'center'
    }}>
      <motion.div
        style={{
          marginBottom: designTokens.spacing[8]
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
          scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }}
      >
        <FunctionalIcons.GPUComputing size={120} color={designTokens.colors.primary[400]} />
      </motion.div>

      <h2 style={{
        color: designTokens.colors.neutral[100],
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        marginBottom: designTokens.spacing[4]
      }}>
        CAE分析进行中
      </h2>

      <p style={{
        color: designTokens.colors.neutral[400],
        fontSize: designTokens.typography.fontSize.xl,
        marginBottom: designTokens.spacing[8]
      }}>
        当前阶段：{analysisPhase}
      </p>

      <div style={{
        width: '600px',
        maxWidth: '90%',
        marginBottom: designTokens.spacing[6]
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: designTokens.spacing[2]
        }}>
          <span style={{
            color: designTokens.colors.neutral[300],
            fontSize: designTokens.typography.fontSize.sm
          }}>
            分析进度
          </span>
          <span style={{
            color: designTokens.colors.primary[400],
            fontSize: designTokens.typography.fontSize.sm,
            fontFamily: designTokens.typography.fontFamily.mono.join(', ')
          }}>
            {analysisProgress}%
          </span>
        </div>
        
        <div style={{
          width: '100%',
          height: '8px',
          background: designTokens.colors.neutral[800],
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <motion.div
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.accent[500]})`,
              borderRadius: 'inherit'
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${analysisProgress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      <Card variant="glass" size="sm">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: designTokens.spacing[4],
          fontSize: designTokens.typography.fontSize.sm
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: designTokens.colors.secondary[400],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.bold,
              fontFamily: designTokens.typography.fontFamily.mono.join(', ')
            }}>
              127,543
            </div>
            <div style={{ color: designTokens.colors.neutral[400] }}>
              网格单元
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: designTokens.colors.accent[400],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.bold,
              fontFamily: designTokens.typography.fontFamily.mono.join(', ')
            }}>
              {Math.floor(analysisProgress * 1275.43).toLocaleString()}
            </div>
            <div style={{ color: designTokens.colors.neutral[400] }}>
              已处理
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: designTokens.colors.primary[400],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.bold,
              fontFamily: designTokens.typography.fontFamily.mono.join(', ')
            }}>
              {(200 - analysisProgress * 2).toFixed(0)}s
            </div>
            <div style={{ color: designTokens.colors.neutral[400] }}>
              预计剩余
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ==================== 系统状态面板子组件 ====================

const SystemStatusPanel: React.FC<{ status: SystemStatus }> = ({ status }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: designTokens.spacing[4]
    }}>
      {/* 资源使用情况 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: designTokens.spacing[4]
      }}>
        {[
          { label: 'CPU使用率', value: status.cpuUsage, unit: '%', color: designTokens.colors.semantic.computing },
          { label: '内存使用率', value: status.memoryUsage, unit: '%', color: designTokens.colors.semantic.material },
          { label: 'GPU使用率', value: status.gpuUsage, unit: '%', color: designTokens.colors.semantic.geometry }
        ].map((item, index) => (
          <Card key={index} variant="outlined" size="xs">
            <div style={{
              textAlign: 'center'
            }}>
              <div style={{
                color: item.color,
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                marginBottom: designTokens.spacing[1]
              }}>
                {item.value.toFixed(1)}{item.unit}
              </div>
              <div style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.sm
              }}>
                {item.label}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 连接统计 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: designTokens.spacing[4]
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: designTokens.spacing[3],
          background: designTokens.colors.background.tertiary,
          borderRadius: designTokens.borderRadius.md
        }}>
          <span style={{ color: designTokens.colors.neutral[300] }}>活跃连接</span>
          <span style={{ 
            color: designTokens.colors.primary[400], 
            fontFamily: designTokens.typography.fontFamily.mono.join(', '),
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.bold
          }}>
            {status.activeConnections}
          </span>
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: designTokens.spacing[3],
          background: designTokens.colors.background.tertiary,
          borderRadius: designTokens.borderRadius.md
        }}>
          <span style={{ color: designTokens.colors.neutral[300] }}>分析队列</span>
          <span style={{ 
            color: designTokens.colors.secondary[400], 
            fontFamily: designTokens.typography.fontFamily.mono.join(', '),
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.bold
          }}>
            {status.analysisQueue}
          </span>
        </div>
      </div>

      {/* 系统信息 */}
      <Card variant="filled" size="sm">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: designTokens.spacing[3],
          fontSize: designTokens.typography.fontSize.sm
        }}>
          <div>
            <span style={{ color: designTokens.colors.neutral[400] }}>平台版本：</span>
            <span style={{ color: designTokens.colors.neutral[100] }}>v2.1.0</span>
          </div>
          <div>
            <span style={{ color: designTokens.colors.neutral[400] }}>运行时间：</span>
            <span style={{ color: designTokens.colors.neutral[100] }}>2天3小时</span>
          </div>
          <div>
            <span style={{ color: designTokens.colors.neutral[400] }}>WebGPU：</span>
            <span style={{ color: designTokens.colors.semantic.success }}>已启用</span>
          </div>
          <div>
            <span style={{ color: designTokens.colors.neutral[400] }}>集群状态：</span>
            <span style={{ color: designTokens.colors.semantic.success }}>在线</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DeepCADDemoPage;