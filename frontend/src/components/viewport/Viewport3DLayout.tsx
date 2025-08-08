/**
 * 3D视口布局容器组件
 * 实现3号专家推荐的五区域工具栏布局方案
 * 集成所有现有工具栏组件到统一布局系统
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// 导入现有工具栏组件
import UnifiedToolbar from '../layout/UnifiedToolbar';
import CADToolbar from '../geometry/CADToolbar';
import MeshingVerticalToolbar from '../meshing/MeshingVerticalToolbar';
import InteractionToolbar from '../3d/tools/InteractionToolbar';
import CubeViewNavigationControl from '../3d/navigation/CubeViewNavigationControl';
import GeometryViewport3D from '../geometry/GeometryViewport3D';

// 工具栏配置接口
interface ToolbarConfig {
  leftPanelContent: 'geometry' | 'meshing' | 'computation' | 'visualization';
  rightPanelContent: 'interaction' | 'properties' | 'results' | 'analysis';
  topToolbarMode: 'standard' | 'compact' | 'professional';
  showNavigationCube: boolean;
  showQuickActions: boolean;
  showStatusBar: boolean;
  enableResponsive: boolean;
}

interface Viewport3DLayoutProps {
  scene?: THREE.Scene;
  currentMode: 'geometry' | 'meshing' | 'analysis' | 'results';
  onModeChange: (mode: string) => void;
  enableResponsive?: boolean;
  customToolbarConfig?: Partial<ToolbarConfig>;
  onToolSelect?: (tool: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const Viewport3DLayout: React.FC<Viewport3DLayoutProps> = ({
  scene,
  currentMode,
  onModeChange,
  enableResponsive = true,
  customToolbarConfig = {},
  onToolSelect,
  className,
  style
}) => {
  // 状态管理
  const [leftPanelVisible, setLeftPanelVisible] = useState(false); // permanently disabled
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentView, setCurrentView] = useState('isometric');
  
  // 工具栏配置状态
  const [toolbarConfig, setToolbarConfig] = useState<ToolbarConfig>({
    leftPanelContent: 'geometry',
    rightPanelContent: 'interaction',
    topToolbarMode: 'standard',
    showNavigationCube: true,
    showQuickActions: true,
    showStatusBar: true,
    enableResponsive: true,
    ...customToolbarConfig
  });

  // 3D视口引用
  const viewportRef = useRef<HTMLDivElement>(null);
  const geometryViewportRef = useRef<any>(null);

  // 监听模式变化，自动切换工具栏内容
  useEffect(() => {
    setToolbarConfig(prev => ({
      ...prev,
      leftPanelContent: currentMode === 'geometry' ? 'geometry' :
                      currentMode === 'meshing' ? 'meshing' :
                      currentMode === 'analysis' ? 'computation' : 'visualization',
      rightPanelContent: currentMode === 'results' ? 'results' :
                        currentMode === 'analysis' ? 'analysis' : 'interaction'
    }));
  }, [currentMode]);

  // 工具选择处理
  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);
    onToolSelect?.(tool);
    
    // 根据工具类型智能显示相关面板
    if (['measurement', 'annotation', 'sectioning'].includes(tool)) {
      setRightPanelVisible(true);
      setToolbarConfig(prev => ({ ...prev, rightPanelContent: 'interaction' }));
    }
  };

  // 快捷键处理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // 阻止在输入框中触发快捷键
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'f':
          event.preventDefault();
          // 适合窗口
          break;
        case 'h':
          event.preventDefault();
          // 重置视图
          break;
        case 'q':
          event.preventDefault();
          handleToolSelect('select');
          break;
        case 'm':
          event.preventDefault();
          handleToolSelect('measure');
          break;
        case 'a':
          event.preventDefault();
          handleToolSelect('annotation');
          break;
        case 'x':
          event.preventDefault();
          handleToolSelect('section');
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
          event.preventDefault();
          const viewMap = {
            '1': 'front',
            '2': 'back', 
            '3': 'right',
            '4': 'left',
            '5': 'top',
            '6': 'bottom',
            '7': 'isometric'
          };
          setCurrentView(viewMap[event.key as keyof typeof viewMap]);
          break;
      }

      // Ctrl组合键
      if (event.ctrlKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            break;
          case '2':
            event.preventDefault();
            setRightPanelVisible(!rightPanelVisible);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [leftPanelVisible, rightPanelVisible]);

  // 响应式布局调整
  useEffect(() => {
    if (!enableResponsive) return;

    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width < 1024) {
        // 小屏幕：隐藏侧边栏，使用底部抽屉
        setLeftPanelVisible(false);
        setRightPanelVisible(false);
        setToolbarConfig(prev => ({ ...prev, topToolbarMode: 'compact' }));
      } else if (width < 1400) {
        // 中屏幕：正常布局
        setToolbarConfig(prev => ({ ...prev, topToolbarMode: 'standard' }));
      } else {
        // 大屏幕：专业模式
        setToolbarConfig(prev => ({ ...prev, topToolbarMode: 'professional' }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [enableResponsive]);

  // 渲染左侧工具面板内容
  const renderLeftPanelContent = () => {
    switch (toolbarConfig.leftPanelContent) {
      case 'geometry':
        // 几何模式下不在左侧渲染 CAD 工具栏，避免与右侧固定栏冲突
        return null;
      case 'meshing':
        return <MeshingVerticalToolbar />;
      case 'computation':
        return (
          <div className="computation-tools">
            <h3>⚡ 计算分析</h3>
            <button className="tool-button">深基坑分析</button>
            <button className="tool-button">土结耦合</button>
            <button className="tool-button">施工阶段</button>
          </div>
        );
      case 'visualization':
        return (
          <div className="visualization-tools">
            <h3>🎨 可视化</h3>
            <button className="tool-button">应力云图</button>
            <button className="tool-button">位移矢量</button>
            <button className="tool-button">动画播放</button>
          </div>
        );
      default:
        return null;
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#1a1a1a',
    ...style
  };

  return (
    <div className={`viewport-3d-layout ${className || ''}`} style={containerStyle}>
      {/* 顶部主工具栏 */}
      <div className="top-toolbar-container" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: toolbarConfig.topToolbarMode === 'compact' ? '40px' : '48px',
        background: 'rgba(30, 30, 30, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 100
      }}>
        <UnifiedToolbar
          onToolSelect={handleToolSelect}
          selectedTool={selectedTool}
          currentMode={currentMode}
          mode={toolbarConfig.topToolbarMode}
          onModeChange={onModeChange}
        />
      </div>

      {/* 左侧工具面板 */}
      <AnimatePresence>
        {leftPanelVisible && (
          <motion.div
            className="left-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: 'absolute',
              left: 0,
              top: toolbarConfig.topToolbarMode === 'compact' ? '40px' : '48px',
              bottom: toolbarConfig.showStatusBar ? '24px' : '0px',
              width: window.innerWidth < 1400 ? '280px' : '320px',
              background: 'rgba(20, 20, 20, 0.92)',
              backdropFilter: 'blur(8px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              overflowY: 'auto',
              zIndex: 90
            }}
          >
            {/* 折叠按钮 */}
            <div style={{
              position: 'sticky',
              top: 0,
              padding: '8px',
              background: 'rgba(30, 30, 30, 0.9)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={() => setLeftPanelVisible(false)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                ◀ 收起工具面板
              </button>
            </div>

            {/* 工具内容 */}
            <div style={{ padding: '16px' }}>
              {renderLeftPanelContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主3D视口区域 */}
      <div
        ref={viewportRef}
        className="main-3d-viewport"
        style={{
          position: 'absolute',
          left: leftPanelVisible ? (window.innerWidth < 1400 ? '280px' : '320px') : '0',
          top: toolbarConfig.topToolbarMode === 'compact' ? '40px' : '48px',
          right: rightPanelVisible ? (window.innerWidth < 1400 ? '320px' : '360px') : '0',
          bottom: toolbarConfig.showStatusBar ? '24px' : '0',
          background: '#1a1a1a'
        }}
      >
        <GeometryViewport3D
          ref={geometryViewportRef}
          className="geometry-viewport-3d"
          onAction={(action) => console.log('Viewport action:', action)}
          onControlsChange={(controls) => console.log('Controls changed:', controls)}
        />

        {/* 右上角导航立方体 */}
        {toolbarConfig.showNavigationCube && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: window.innerWidth < 1400 ? '100px' : '120px',
            height: window.innerWidth < 1400 ? '100px' : '120px',
            zIndex: 110
          }}>
            <CubeViewNavigationControl
              onViewChange={(view) => {
                setCurrentView(view);
                console.log('视图切换:', view);
              }}
              currentView={currentView}
              showLabels={true}
              enableAnimation={true}
            />
          </div>
        )}

        {/* 右下角快速操作 */}
        {toolbarConfig.showQuickActions && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 105
          }}>
            <motion.button
              className="quick-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                width: '44px',
                height: '44px',
                background: 'rgba(30, 30, 30, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#00d9ff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backdropFilter: 'blur(10px)'
              }}
              title="全屏"
            >
              🔍
            </motion.button>
            <motion.button
              className="quick-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: '44px',
                height: '44px',
                background: 'rgba(30, 30, 30, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#00d9ff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backdropFilter: 'blur(10px)'
              }}
              title="截图"
            >
              📷
            </motion.button>
            <motion.button
              className="quick-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: '44px',
                height: '44px',
                background: 'rgba(30, 30, 30, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#00d9ff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                backdropFilter: 'blur(10px)'
              }}
              title="设置"
            >
              ⚙️
            </motion.button>
          </div>
        )}
      </div>

      {/* 右侧交互面板 */}
      <AnimatePresence>
        {rightPanelVisible && (
          <motion.div
            className="right-panel"
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: 'absolute',
              right: 0,
              top: toolbarConfig.topToolbarMode === 'compact' ? '40px' : '48px',
              bottom: toolbarConfig.showStatusBar ? '24px' : '0px',
              width: window.innerWidth < 1400 ? '320px' : '360px',
              background: 'rgba(25, 25, 25, 0.95)',
              backdropFilter: 'blur(12px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              overflowY: 'auto',
              zIndex: 85
            }}
          >
            <InteractionToolbar
              selectedTool={selectedTool}
              onPanelToggle={setRightPanelVisible}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部状态栏 */}
      {toolbarConfig.showStatusBar && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '24px',
          background: 'rgba(15, 15, 15, 0.98)',
          backdropFilter: 'blur(6px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '12px',
          color: '#999',
          zIndex: 95
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>模式: {currentMode}</span>
            <span>工具: {selectedTool}</span>
            <span>视图: {currentView}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>FPS: 60</span>
            <span>三角形: 125,430</span>
            <span>内存: 2.1GB / 8GB</span>
          </div>
        </div>
      )}

      {/* 左侧面板切换按钮已禁用，统一使用右侧工具栏 */}
      {/* 在几何模式下，将 CAD 工具栏固定到视口右侧（组件内部已使用 position: fixed; right: 20px） */}
      {currentMode === 'geometry' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none'
          }}
        >
          {/* Anchor the toolbar to the 3D viewport's right edge */}
          <CADToolbar onToolSelect={() => {}} positionMode="absolute" />
        </div>
      )}

      {/* 右侧面板切换按钮 */}
      {!rightPanelVisible && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setRightPanelVisible(true)}
          style={{
            position: 'absolute',
            right: '8px',
            top: '60px',
            width: '32px',
            height: '48px',
            background: 'rgba(30, 30, 30, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            color: '#00d9ff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            zIndex: 80,
            backdropFilter: 'blur(10px)'
          }}
          whileHover={{ x: -4 }}
          title="展开交互面板"
        >
          ◀
        </motion.button>
      )}

      {/* 响应式提示 */}
      {window.innerWidth < 1024 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(30, 30, 30, 0.95)',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#fff',
          textAlign: 'center',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            移动端优化模式
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
            使用手势操作3D视口
          </p>
        </div>
      )}
    </div>
  );
};

export default Viewport3DLayout;