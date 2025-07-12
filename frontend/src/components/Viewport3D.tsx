import React, { useRef, Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '../stores/useSceneStore';
import { ThreeProvider, useThree } from './Viewport3D/ThreeProvider';
import { useComponentGizmo } from '../hooks/useComponentGizmo';
import { useGridSettings } from '../hooks/useGridSettings';
import ViewportControls from './ViewportControls';
import { Button, Result } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useUIStore } from '../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';
import QuantumParticles from './effects/QuantumParticles';
import Toolbar from './Viewport3D/Toolbar';
import Grid3D from './Viewport3D/Grid3D';
import CoordinateSystem from './Viewport3D/CoordinateSystem';
import { useViewportStore } from '../stores/useViewportStore';
import { ToolbarAction } from '../types/viewport';

class ErrorBoundary extends Component<{ children: ReactNode, onReset: () => void }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Viewport3D caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="3D视图渲染失败"
          subTitle="加载3D视图时发生错误，这可能是由于浏览器兼容性或数据问题。"
          className="theme-text-primary"
          extra={[
            <Button type="primary" key="reset" onClick={this.props.onReset} className="theme-btn-primary">
              禁用并重置视图
            </Button>,
          ]}
        >
          <div className="desc" style={{ 
            maxHeight: '150px', 
            overflowY: 'auto', 
            background: 'var(--bg-tertiary)', 
            padding: '8px', 
            borderRadius: '4px' 
          }}>
            <p className="theme-text-secondary" style={{ fontSize: '0.8rem', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
              {this.state.error ? String(this.state.error) : 'No error details available.'}
            </p>
          </div>
        </Result>
      );
    }
    return this.props.children;
  }
}

const ViewportContent: React.FC = () => {
  const { scene, camera, isReady, loadGLTF, addObject } = useThree();
  const { gizmoMode, setGizmoMode } = useComponentGizmo();
  
  // 使用新的视口状态管理
  const {
    activeTool,
    setActiveTool,
    toggleGrid,
    setRenderMode,
    resetCamera,
    fitView,
    grid,
    viewport
  } = useViewportStore();

  // 使用旧的网格设置作为后备（保持兼容性）
  const { 
    gridSettings, 
    toggleGridVisibility, 
    toggleGridSnap 
  } = useGridSettings();

  // 处理工具栏动作
  const handleToolbarAction = (action: ToolbarAction) => {
    switch (action) {
      case ToolbarAction.SELECT:
        setActiveTool(ToolbarAction.SELECT);
        break;
      case ToolbarAction.ORBIT:
        setActiveTool(ToolbarAction.ORBIT);
        break;
      case ToolbarAction.PAN:
        setActiveTool(ToolbarAction.PAN);
        break;
      case ToolbarAction.ZOOM:
        setActiveTool(ToolbarAction.ZOOM);
        break;
      case ToolbarAction.FIT:
        fitView();
        break;
      case ToolbarAction.RESET:
        resetCamera();
        break;
      case ToolbarAction.GRID:
        toggleGrid();
        break;
      case ToolbarAction.WIREFRAME:
        setRenderMode(viewport.renderMode === 'wireframe' ? 'solid' : 'wireframe');
        break;
      case ToolbarAction.MEASURE:
        setActiveTool(ToolbarAction.MEASURE);
        break;
      case ToolbarAction.SECTION_CUT:
        setActiveTool(ToolbarAction.SECTION_CUT);
        break;
      case ToolbarAction.SCREENSHOT:
        handleScreenshot();
        break;
      case ToolbarAction.SETTINGS:
        setActiveTool(ToolbarAction.SETTINGS);
        break;
      default:
        console.log('未处理的工具栏动作:', action);
    }
  };

  // 处理坐标轴点击
  const handleAxisClick = (axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z') => {
    if (!camera) return;

    const distance = 20;
    const positions = {
      'x': new THREE.Vector3(distance, 0, 0),
      '-x': new THREE.Vector3(-distance, 0, 0),
      'y': new THREE.Vector3(0, distance, 0),
      '-y': new THREE.Vector3(0, -distance, 0),
      'z': new THREE.Vector3(0, 0, distance),
      '-z': new THREE.Vector3(0, 0, -distance)
    };

    const newPosition = positions[axis];
    camera.position.copy(newPosition);
    camera.lookAt(0, 0, 0);
  };

  // 截图功能
  const handleScreenshot = () => {
    console.log('截图功能待实现');
    // TODO: 实现截图功能
  };

  // Demo: Load a test mesh when ready
  useEffect(() => {
    if (!isReady) return;

    // This would be replaced with actual mesh loading from the backend
    const addTestCube = () => {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x0077ff,
        metalness: 0.3,
        roughness: 0.4
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(0, 1, 0);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.name = 'demo-cube';
      addObject(cube);
    };

    // Add demo cube after a short delay
    const timer = setTimeout(addTestCube, 1000);
    return () => clearTimeout(timer);
  }, [isReady, addObject]);

  return (
    <>
      {/* 3D网格 */}
      <Grid3D scene={scene} />
      
      {/* 交互工具栏 */}
      <Toolbar onAction={handleToolbarAction} />
      
      {/* 坐标系 */}
      <CoordinateSystem camera={camera} onAxisClick={handleAxisClick} />
      
      {/* 保持原有的控制器（兼容性） */}
      <ViewportControls 
        gizmoMode={gizmoMode} 
        onGizmoModeChange={setGizmoMode}
        gridSettings={gridSettings}
        onToggleGridVisibility={toggleGridVisibility}
        onToggleGridSnap={toggleGridSnap}
      />
    </>
  );
};

const Viewport3D: React.FC<{ className?: string }> = ({ className }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [is3dEnabled, setIs3dEnabled] = useState(false);
  const { uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      uiMode: state.uiMode,
      particleEffectsEnabled: state.particleEffectsEnabled
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';

  const handleEnable3D = () => setIs3dEnabled(true);
  const handleReset = () => setIs3dEnabled(false);

  if (!is3dEnabled) {
    return (
      <div
        className={`viewport-3d-container theme-card ${className || ''}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          position: 'relative'
        }}
      >
        {isFusionMode && particleEffectsEnabled && <QuantumParticles />}
        
        <Result
          icon={<RocketOutlined style={{ color: 'var(--primary-color)' }} />}
          title={<span className={isFusionMode ? "quantum-text" : ""} data-text="3D渲染引擎已就绪">3D渲染引擎已就绪</span>}
          subTitle="为确保应用流畅，3D视图默认关闭。请在需要时手动开启。"
          className="theme-text-primary"
          extra={<Button type="primary" onClick={handleEnable3D} className="theme-btn-primary">开启3D可视化</Button>}
        />
      </div>
    );
  }

  return (
    <div 
      ref={viewportRef} 
      className={`viewport-3d-container theme-card ${className || ''}`} 
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {isFusionMode && particleEffectsEnabled && <QuantumParticles />}
      
      <ErrorBoundary onReset={handleReset}>
        <ThreeProvider viewportRef={viewportRef}>
          <ViewportContent />
        </ThreeProvider>
      </ErrorBoundary>
    </div>
  );
};

export default Viewport3D; 