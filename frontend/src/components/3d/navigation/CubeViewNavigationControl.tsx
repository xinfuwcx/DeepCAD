/**
 * CubeView 3D导航控件
 * 1号架构师 - 为Epic控制中心集成的专业级3D视口导航工具
 * 支持直观的立方体式视角切换和平滑的相机过渡动画
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Tooltip, Typography, Space } from 'antd';
import {
  RotateLeftOutlined,
  ExpandOutlined,
  AimOutlined,
  SettingOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { designTokens } from '../../../design/tokens';
import { logger } from '../../../utils/advancedLogger';

const { Text } = Typography;

// ==================== 类型定义 ====================

interface CubeViewNavigationControlProps {
  className?: string;
  style?: React.CSSProperties;
  camera: THREE.Camera;
  controls?: any; // OrbitControls
  onViewChange?: (viewName: string, position: THREE.Vector3, target: THREE.Vector3) => void;
  size?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  theme?: 'dark' | 'light';
}

interface ViewPreset {
  name: string;
  label: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  icon?: string;
}

// ==================== 预设视角配置 ====================

const VIEW_PRESETS: ViewPreset[] = [
  {
    name: 'front',
    label: '前',
    position: new THREE.Vector3(0, 0, 50),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    icon: 'F'
  },
  {
    name: 'back',
    label: '后',
    position: new THREE.Vector3(0, 0, -50),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    icon: 'B'
  },
  {
    name: 'right',
    label: '右',
    position: new THREE.Vector3(50, 0, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    icon: 'R'
  },
  {
    name: 'left',
    label: '左',
    position: new THREE.Vector3(-50, 0, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    icon: 'L'
  },
  {
    name: 'top',
    label: '顶',
    position: new THREE.Vector3(0, 50, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, -1),
    icon: 'T'
  },
  {
    name: 'bottom',
    label: '底',
    position: new THREE.Vector3(0, -50, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, 1),
    icon: 'B'
  },
  {
    name: 'isometric',
    label: '等轴',
    position: new THREE.Vector3(35, 35, 35),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    icon: 'ISO'
  }
];

// ==================== 主组件 ====================

export const CubeViewNavigationControl: React.FC<CubeViewNavigationControlProps> = ({
  className = '',
  style = {},
  camera,
  controls,
  onViewChange,
  size = 120,
  position = 'top-right',
  theme = 'dark'
}) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentView, setCurrentView] = useState<string>('isometric');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // 获取位置样式
  const getPositionStyle = useCallback(() => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'top-right':
        return { ...baseStyle, top: '20px', right: '20px' };
      case 'top-left':
        return { ...baseStyle, top: '20px', left: '20px' };
      case 'bottom-right':
        return { ...baseStyle, bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '20px', left: '20px' };
      default:
        return { ...baseStyle, top: '20px', right: '20px' };
    }
  }, [position]);

  // 平滑过渡到指定视角
  const transitionToView = useCallback(async (preset: ViewPreset) => {
    if (!camera || !controls || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentView(preset.name);

    try {
      logger.info('CubeView navigation: Transitioning to view', { 
        view: preset.name,
        position: preset.position.toArray(),
        target: preset.target.toArray()
      });

      // 创建动画
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();
      const startUp = camera.up.clone();

      const duration = 1000; // 1秒过渡时间
      const startTime = Date.now();

      const animateTransition = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用easeInOutCubic缓动函数
        const easeProgress = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        // 插值计算新位置
        const newPosition = startPosition.clone().lerp(preset.position, easeProgress);
        const newTarget = startTarget.clone().lerp(preset.target, easeProgress);
        const newUp = startUp.clone().lerp(preset.up, easeProgress);

        // 应用新位置
        camera.position.copy(newPosition);
        camera.up.copy(newUp);
        controls.target.copy(newTarget);
        controls.update();

        if (progress < 1) {
          requestAnimationFrame(animateTransition);
        } else {
          setIsTransitioning(false);
          onViewChange?.(preset.name, preset.position, preset.target);
          logger.info('CubeView navigation: Transition completed', { view: preset.name });
        }
      };

      animateTransition();
    } catch (error) {
      logger.error('CubeView navigation: Transition failed', error);
      setIsTransitioning(false);
    }
  }, [camera, controls, isTransitioning, onViewChange]);

  // 重置到默认视角
  const resetView = useCallback(() => {
    const defaultPreset = VIEW_PRESETS.find(p => p.name === 'isometric');
    if (defaultPreset) {
      transitionToView(defaultPreset);
    }
  }, [transitionToView]);

  // 渲染立方体面
  const renderCubeFace = useCallback((preset: ViewPreset, faceClass: string) => {
    const isActive = currentView === preset.name;
    
    return (
      <motion.div
        key={preset.name}
        className={`cube-face ${faceClass} ${isActive ? 'active' : ''}`}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isTransitioning ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          color: theme === 'dark' ? '#ffffff' : '#000000',
          background: isActive 
            ? 'linear-gradient(135deg, #00d9ff, #0066cc)' 
            : theme === 'dark' 
            ? 'rgba(0, 0, 0, 0.7)' 
            : 'rgba(255, 255, 255, 0.7)',
          border: `1px solid ${isActive ? '#00d9ff' : 'rgba(255, 255, 255, 0.2)'}`,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          userSelect: 'none'
        }}
        whileHover={!isTransitioning ? { 
          scale: 1.05,
          background: 'linear-gradient(135deg, #00d9ff40, #0066cc40)'
        } : {}}
        whileTap={!isTransitioning ? { scale: 0.95 } : {}}
        onClick={() => !isTransitioning && transitionToView(preset)}
        onMouseEnter={() => setShowTooltip(preset.name)}
        onMouseLeave={() => setShowTooltip(null)}
      >
        {preset.icon || preset.label}
      </motion.div>
    );
  }, [currentView, isTransitioning, theme, transitionToView]);

  // 渲染3D立方体
  const renderCube = () => (
    <motion.div
      style={{
        width: size,
        height: size,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `rotateX(-10deg) rotateY(20deg)`,
        transition: 'transform 0.3s ease'
      }}
      animate={{
        rotateX: isHovered ? -15 : -10,
        rotateY: isHovered ? 25 : 20,
        scale: isHovered ? 1.05 : 1
      }}
      transition={{ duration: 0.3 }}
    >
      {/* 前面 */}
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: `translateZ(${size / 2}px)`
      }}>
        {renderCubeFace(VIEW_PRESETS[0], 'front')}
      </div>
      
      {/* 后面 */}
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: `translateZ(-${size / 2}px) rotateY(180deg)`
      }}>
        {renderCubeFace(VIEW_PRESETS[1], 'back')}
      </div>
      
      {/* 右面 */}
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: `rotateY(90deg) translateZ(${size / 2}px)`
      }}>
        {renderCubeFace(VIEW_PRESETS[2], 'right')}
      </div>
      
      {/* 左面 */}
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: `rotateY(-90deg) translateZ(${size / 2}px)`
      }}>
        {renderCubeFace(VIEW_PRESETS[3], 'left')}
      </div>
      
      {/* 顶面 */}
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: `rotateX(90deg) translateZ(${size / 2}px)`
      }}>
        {renderCubeFace(VIEW_PRESETS[4], 'top')}
      </div>
      
      {/* 底面 */}
      <div style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: `rotateX(-90deg) translateZ(${size / 2}px)`
      }}>
        {renderCubeFace(VIEW_PRESETS[5], 'bottom')}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      className={`cubeview-navigation ${className}`}
      style={{
        ...getPositionStyle(),
        ...style
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowTooltip(null);
      }}
    >
      <Card
        size="small"
        style={{
          background: theme === 'dark' 
            ? 'rgba(0, 0, 0, 0.8)' 
            : 'rgba(255, 255, 255, 0.9)',
          border: `1px solid ${theme === 'dark' ? 'rgba(0, 217, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: designTokens.borderRadius.lg,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
        bodyStyle={{ padding: '12px' }}
      >
        {/* 3D立方体 */}
        <div
          ref={cubeRef}
          style={{
            perspective: '400px',
            perspectiveOrigin: 'center center',
            marginBottom: '12px'
          }}
        >
          {renderCube()}
        </div>

        {/* 控制按钮 */}
        <Space direction="horizontal" size={4}>
          <Tooltip title="重置视角">
            <Button
              type="text"
              size="small"
              icon={<RotateLeftOutlined />}
              onClick={resetView}
              disabled={isTransitioning}
              style={{
                color: theme === 'dark' ? '#ffffff80' : '#00000080',
                border: 'none'
              }}
            />
          </Tooltip>
          
          <Tooltip title="等轴视图">
            <Button
              type="text"
              size="small"
              icon={<ExpandOutlined />}
              onClick={() => {
                const isoPreset = VIEW_PRESETS.find(p => p.name === 'isometric');
                if (isoPreset) transitionToView(isoPreset);
              }}
              disabled={isTransitioning}
              style={{
                color: theme === 'dark' ? '#ffffff80' : '#00000080',
                border: 'none'
              }}
            />
          </Tooltip>
          
          <Text 
            style={{ 
              color: theme === 'dark' ? '#ffffff60' : '#00000060',
              fontSize: '10px',
              marginLeft: '4px'
            }}
          >
            {isTransitioning ? '切换中...' : '3D导航'}
          </Text>
        </Space>

        {/* 视角提示 */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute',
                bottom: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                zIndex: 1001,
                border: '1px solid rgba(0, 217, 255, 0.3)'
              }}
            >
              {VIEW_PRESETS.find(p => p.name === showTooltip)?.label}视图
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 过渡状态指示器 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 217, 255, 0.9)',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 'bold',
              zIndex: 1002,
              pointerEvents: 'none'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block', marginRight: '4px' }}
            >
              ⟲
            </motion.div>
            切换中
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CubeViewNavigationControl;