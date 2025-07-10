import React, { useRef, useState, useEffect } from 'react';
import { useFullscreen } from 'ahooks';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import ViewportControls from './ViewportControls';
import { useVtkLayer } from '../hooks/useVtkLayer';

interface Viewport3DProps {
  className?: string;
}

const Viewport3D: React.FC<Viewport3DProps> = ({ className }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, { toggleFullscreen }] = useFullscreen(viewportRef);
  
  const { layers, viewSettings } = useSceneStore(
    useShallow(state => ({
      layers: state.layers,
      viewSettings: state.viewSettings
    }))
  );

  // 使用VTK渲染钩子
  const { initializeRenderer, updateLayers, updateViewSettings } = useVtkLayer(viewportRef);

  // 初始化渲染器
  useEffect(() => {
    if (viewportRef.current) {
      initializeRenderer();
    }
    
    return () => {
      // 清理渲染器
    };
  }, [initializeRenderer]);

  // 当图层或视图设置变化时更新渲染
  useEffect(() => {
    updateLayers(layers);
  }, [layers, updateLayers]);

  useEffect(() => {
    updateViewSettings(viewSettings);
  }, [viewSettings, updateViewSettings]);

  return (
    <div 
      ref={viewportRef} 
      className={`viewport3d ${className || ''} ${isFullscreen ? 'fullscreen' : ''}`}
      style={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
        borderRadius: isFullscreen ? 0 : 8,
      }}
    >
      {/* VTK渲染容器 */}
      <div 
        id="vtk-container" 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      
      {/* 视口控制组件 */}
      <ViewportControls
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        viewportRef={viewportRef}
      />
      
      {/* 视口状态指示器 */}
      <div className="viewport-status" style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        padding: '4px 8px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: 'white',
        borderRadius: 4,
        fontSize: 12,
        pointerEvents: 'none',
      }}>
        {layers.mesh.isLoading && <div>正在加载网格...</div>}
        {layers.result.isLoading && <div>正在加载计算结果...</div>}
        {layers.mesh.error && <div className="error">网格加载错误: {layers.mesh.error}</div>}
        {layers.result.error && <div className="error">结果加载错误: {layers.result.error}</div>}
      </div>
    </div>
  );
};

export default Viewport3D; 