/**
 * DeepCAD 项目导航演示
 * 深基坑工程可视化导航系统
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { EarthRenderer, ProjectMarker } from './EarthRenderer';
import { CameraFlightController, FlightSequence } from './CameraFlightController';
import { LoadingLogo } from '../brand/Logo';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface FlightDemoProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  autoStart?: boolean;
  showControls?: boolean;
  onFlightComplete?: () => void;
}

interface FlightStatus {
  isFlying: boolean;
  currentSequence: string | null;
  progress: number;
  isPaused: boolean;
  currentWaypoint?: number;
  waypointDescription?: string;
}

// ==================== 演示数据 ====================

const DEMO_PROJECTS: ProjectMarker[] = [
  {
    id: '1',
    name: '上海中心深基坑工程',
    latitude: 31.2304,
    longitude: 121.4737,
    type: 'excavation',
    status: 'completed',
    description: '632米超高层建筑，70米深基坑工程'
  },
  {
    id: '2',
    name: '北京大兴机场T1航站楼',
    latitude: 39.5098,
    longitude: 116.4105,
    type: 'construction',
    status: 'active',
    description: '世界最大单体航站楼基坑工程'
  },
  {
    id: '3',
    name: '深圳前海金融区',
    latitude: 22.5431,
    longitude: 113.9339,
    type: 'monitoring',
    status: 'planning',
    description: '大型金融区深基坑群监测'
  },
  {
    id: '4',
    name: '广州珠江新城CBD',
    latitude: 23.1291,
    longitude: 113.3240,  
    type: 'excavation',
    status: 'completed',
    description: 'CBD核心区超深基坑群'
  }
];

// ==================== 主演示组件 ====================

export const EpicFlightDemo: React.FC<EpicFlightDemoProps> = ({
  className = '',
  style = {},
  width = 1920,
  height = 1080,
  autoStart = true,
  showControls = true,
  onFlightComplete
}) => {
  const earthRendererRef = useRef<any>(null);
  const flightControllerRef = useRef<CameraFlightController | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [flightStatus, setFlightStatus] = useState<FlightStatus>({
    isFlying: false,
    currentSequence: null,
    progress: 0,
    isPaused: false
  });
  const [currentSequence, setCurrentSequence] = useState<FlightSequence | null>(null);
  const [showNarration, setShowNarration] = useState(false);
  const [narrationText, setNarrationText] = useState('');

  // 地球渲染器准备完成
  const handleEarthReady = useCallback(() => {
    if (earthRendererRef.current) {
      const renderer = earthRendererRef.current.getRenderer();
      const camera = earthRendererRef.current.getCamera();
      const scene = earthRendererRef.current.getScene();

      // 初始化飞行控制器
      flightControllerRef.current = new CameraFlightController(camera, scene, {
        onFlightStart: () => {
          setFlightStatus(prev => ({ ...prev, isFlying: true }));
          setShowNarration(true);
        },
        onFlightComplete: () => {
          setFlightStatus(prev => ({ 
            ...prev, 
            isFlying: false, 
            currentSequence: null,
            progress: 1 
          }));
          setShowNarration(false);
          onFlightComplete?.();
        },
        onWaypointReached: (waypoint, index) => {
          setFlightStatus(prev => ({ 
            ...prev, 
            currentWaypoint: index,
            waypointDescription: waypoint.description 
          }));
          setNarrationText(waypoint.description || '');
        }
      });

      setIsInitialized(true);

      // 自动开始演示
      if (autoStart) {
        setTimeout(() => {
          startEpicOpening();
        }, 2000);
      }
    }
  }, [autoStart, onFlightComplete]);

  // 开始史诗级开场演示
  const startEpicOpening = useCallback(async () => {
    if (!flightControllerRef.current) return;

    const sequence = flightControllerRef.current.getEpicOpeningSequence();
    
    setCurrentSequence(sequence);
    await flightControllerRef.current.startFlightSequence(sequence);
  }, []);

  // 开始全球巡览
  const startGlobalTour = useCallback(async () => {
    if (!flightControllerRef.current) return;

    const sequence = flightControllerRef.current.getGlobalTourSequence();
    
    setCurrentSequence(sequence);
    await flightControllerRef.current.startFlightSequence(sequence);
  }, []);

  // 开始施工过程演示
  const startConstructionDemo = useCallback(async () => {
    if (!flightControllerRef.current) return;

    const sequence = flightControllerRef.current.getConstructionDemoSequence();
    setCurrentSequence(sequence);
    await flightControllerRef.current.startFlightSequence(sequence);
  }, []);

  // 飞行控制
  const handleFlightControl = useCallback((action: string) => {
    if (!flightControllerRef.current) return;

    switch (action) {
      case 'pause':
        flightControllerRef.current.pauseFlight();
        setFlightStatus(prev => ({ ...prev, isPaused: true }));
        break;
      case 'resume':
        flightControllerRef.current.resumeFlight();
        setFlightStatus(prev => ({ ...prev, isPaused: false }));
        break;
      case 'stop':
        flightControllerRef.current.stopFlight();
        setFlightStatus({
          isFlying: false,
          currentSequence: null,
          progress: 0,
          isPaused: false
        });
        setShowNarration(false);
        break;
    }
  }, []);

  // 更新飞行进度
  useEffect(() => {
    if (!flightStatus.isFlying || !flightControllerRef.current) return;

    const updateProgress = () => {
      const controller = flightControllerRef.current!;
      const status = controller.getFlightStatus();
      setFlightStatus(prev => ({
        ...prev,
        currentSequence: status.currentSequence
      }));
    };

    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, [flightStatus.isFlying]);

  return (
    <motion.div
      className={`epic-flight-demo ${className}`}
      style={{
        position: 'relative',
        width,
        height,
        background: '#000000',
        overflow: 'hidden',
        ...style
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 地球渲染器 */}
      <EarthRenderer
        width={width}
        height={height}
        showProjects={true}
        autoRotate={false}
        onEarthReady={handleEarthReady}
        ref={earthRendererRef}
      />

      {/* 震撼的开场Logo动画 */}
      {!isInitialized && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, rgba(0, 17, 34, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%)',
            zIndex: 100
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: isInitialized ? 0 : 1 }}
          transition={{ duration: 1 }}
        >
          <LoadingLogo />
        </motion.div>
      )}

      {/* 飞行状态HUD */}
      <AnimatePresence>
        {flightStatus.isFlying && (
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '120px',
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${designTokens.spacing[6]} ${designTokens.spacing[8]}`,
              zIndex: 50
            }}
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* 左侧信息 */}
            <div>
              <h2 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                margin: 0,
                marginBottom: designTokens.spacing[2],
                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
              }}>
                {currentSequence?.name || 'DeepCAD 飞行演示'}
              </h2>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: designTokens.spacing[4]
              }}>
                <div style={{
                  color: designTokens.colors.primary[400],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontFamily: designTokens.typography.fontFamily.mono.join(', ')
                }}>
                  进度: {Math.round(flightStatus.progress * 100)}%
                </div>
                
                <div style={{
                  color: designTokens.colors.secondary[400],
                  fontSize: designTokens.typography.fontSize.sm,
                }}>
                  路径点: {(flightStatus.currentWaypoint || 0) + 1}/{currentSequence?.waypoints.length || 0}
                </div>
              </div>
            </div>

            {/* 右侧状态指示器 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: designTokens.spacing[3]
            }}>
              <motion.div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: flightStatus.isPaused ? 
                    designTokens.colors.semantic.warning : 
                    designTokens.colors.semantic.success
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span style={{
                color: designTokens.colors.neutral[300],
                fontSize: designTokens.typography.fontSize.sm,
                fontWeight: designTokens.typography.fontWeight.medium
              }}>
                {flightStatus.isPaused ? '已暂停' : '飞行中'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 飞行进度条 */}
      <AnimatePresence>
        {flightStatus.isFlying && (
          <motion.div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 50
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <motion.div
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.accent[500]}, ${designTokens.colors.secondary[400]})`,
                borderRadius: '0 3px 3px 0'
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${flightStatus.progress * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 解说文字 */}
      <AnimatePresence>
        {showNarration && narrationText && (
          <motion.div
            style={{
              position: 'absolute',
              bottom: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '800px',
              padding: `${designTokens.spacing[4]} ${designTokens.spacing[6]}`,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(12px)',
              borderRadius: designTokens.borderRadius.lg,
              border: `1px solid ${designTokens.colors.primary[500]}40`,
              textAlign: 'center',
              zIndex: 40
            }}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            key={narrationText}
          >
            <p style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.medium,
              margin: 0,
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}>
              {narrationText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 控制面板 */}
      {showControls && isInitialized && (
        <motion.div
          style={{
            position: 'absolute',
            top: designTokens.spacing[6],
            right: designTokens.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[3],
            zIndex: 60
          }}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          {/* 演示选择按钮 */}
          {!flightStatus.isFlying && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: designTokens.spacing[2]
            }}>
              <button
                onClick={startEpicOpening}
                style={{
                  background: `linear-gradient(135deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.primary[600]})`,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.md,
                  padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: designTokens.shadows.md,
                  minWidth: '160px'
                }}
              >
                🚀 史诗开场
              </button>
              
              <button
                onClick={startGlobalTour}
                style={{
                  background: `linear-gradient(135deg, ${designTokens.colors.secondary[500]}, ${designTokens.colors.secondary[600]})`,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.md,
                  padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: designTokens.shadows.md,
                  minWidth: '160px'
                }}
              >
                🌍 全球巡览
              </button>
              
              <button
                onClick={startConstructionDemo}
                style={{
                  background: `linear-gradient(135deg, ${designTokens.colors.accent[500]}, ${designTokens.colors.accent[600]})`,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.md,
                  padding: `${designTokens.spacing[3]} ${designTokens.spacing[4]}`,
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: designTokens.shadows.md,
                  minWidth: '160px'
                }}
              >
                🏗️ 施工演示
              </button>
            </div>
          )}

          {/* 飞行控制按钮 */}
          {flightStatus.isFlying && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: designTokens.spacing[2]
            }}>
              <button
                onClick={() => handleFlightControl(flightStatus.isPaused ? 'resume' : 'pause')}
                style={{
                  background: flightStatus.isPaused ? 
                    designTokens.colors.semantic.success : 
                    designTokens.colors.semantic.warning,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.md,
                  padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                {flightStatus.isPaused ? '▶️ 继续' : '⏸️ 暂停'}
              </button>
              
              <button
                onClick={() => handleFlightControl('stop')}
                style={{
                  background: designTokens.colors.semantic.error,
                  border: 'none',
                  borderRadius: designTokens.borderRadius.md,
                  padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
                  color: designTokens.colors.neutral[100],
                  fontSize: designTokens.typography.fontSize.sm,
                  fontWeight: designTokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                ⏹️ 停止
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* 品牌水印 */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: designTokens.spacing[6],
          left: designTokens.spacing[6],
          opacity: 0.7,
          zIndex: 30
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 1, delay: 2 }}
      >
        <div style={{
          color: designTokens.colors.neutral[400],
          fontSize: designTokens.typography.fontSize.sm,
          fontFamily: designTokens.typography.fontFamily.primary.join(', '),
          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
        }}>
          <span style={{ color: designTokens.colors.primary[400] }}>Deep</span>
          <span style={{ color: designTokens.colors.accent[400] }}>CAD</span>
          <span style={{ marginLeft: designTokens.spacing[2] }}>
            世界级深基坑CAE平台
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EpicFlightDemo;