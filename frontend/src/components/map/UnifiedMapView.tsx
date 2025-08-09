/**
 * DeepCAD 统一地图视图组件
 * 基于 UnifiedMapService 的 React 集成组件
 */

import React, { useRef, useEffect, useState } from 'react';
import { unifiedMapService, ProjectMarker, MapStyleType, initLazyMap } from '../../services/UnifiedMapService';
import { eventBus } from '../../core/eventBus';
import '../../styles/maplibre.css';

export interface UnifiedMapViewProps {
  style?: MapStyleType;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  projects?: ProjectMarker[];
  onProjectSelect?: (project: ProjectMarker) => void;
  onProjectHover?: (project: ProjectMarker | null) => void;
  onMapReady?: () => void;
  className?: string;
}

export const UnifiedMapView: React.FC<UnifiedMapViewProps> = ({
  style = 'dark-tech',
  center = [116.4074, 39.9042],
  zoom = 5,
  pitch = 0,
  bearing = 0,
  projects = [],
  onProjectSelect,
  onProjectHover,
  onMapReady,
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 初始化地图
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        setMapStatus('loading');
        
  await initLazyMap(mapContainerRef.current!, {
          style,
          center,
          zoom,
          pitch,
          bearing
        });
        
        setMapStatus('ready');
        onMapReady?.();
        
      } catch (error) {
        console.error('❌ UnifiedMapView 初始化失败:', error);
        setMapStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '地图初始化失败');
      }
    };

    initializeMap();

    return () => {
      // 组件卸载时不销毁服务，因为它是单例
      console.log('🔄 UnifiedMapView 组件卸载');
    };
  }, []);

  // 更新项目数据
  useEffect(() => {
    if (mapStatus === 'ready' && projects.length > 0) {
      unifiedMapService.updateProjects(projects);
    }
  }, [projects, mapStatus]);

  // 设置事件监听
  useEffect(() => {
    const handleProjectSelected = (data: { project: ProjectMarker }) => {
      onProjectSelect?.(data.project);
    };

    const handleProjectHovered = (data: { project: ProjectMarker | null }) => {
      onProjectHover?.(data.project);
    };

    eventBus.on('project:selected', handleProjectSelected);
    eventBus.on('project:hovered', handleProjectHovered);

    return () => {
      eventBus.off('project:selected', handleProjectSelected);
      eventBus.off('project:hovered', handleProjectHovered);
    };
  }, [onProjectSelect, onProjectHover]);

  // 样式变更
  useEffect(() => {
    if (mapStatus === 'ready') {
      unifiedMapService.setStyle(style);
    }
  }, [style, mapStatus]);

  return (
    <div className={`unified-map-container ${className}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 地图容器 */}
      <div 
        ref={mapContainerRef} 
        className="unified-map"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* 加载状态 */}
      {mapStatus === 'loading' && (
        <div className="map-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>正在初始化地图...</span>
          </div>
        </div>
      )}
      
      {/* 错误状态 */}
      {mapStatus === 'error' && (
        <div className="map-error-overlay">
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <h3>地图加载失败</h3>
            <p>{errorMessage}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              重新加载
            </button>
          </div>
        </div>
      )}
      
      {/* 地图控件 */}
      {mapStatus === 'ready' && (
        <div className="map-controls">
          <div className="map-info">
            <span className="map-status-indicator online"></span>
            <span className="map-status-text">DeepCAD 统一地图服务</span>
          </div>
        </div>
      )}
      
  <style>{`
        .map-loading-overlay,
        .map-error-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(26, 35, 50, 0.9);
          backdrop-filter: blur(10px);
          z-index: 1000;
        }
        
        .loading-spinner {
          text-align: center;
          color: white;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top: 3px solid #00d9ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px auto;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-message {
          text-align: center;
          color: white;
          max-width: 300px;
        }
        
        .error-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }
        
        .retry-button {
          background: #00d9ff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 15px;
          transition: background 0.3s ease;
        }
        
        .retry-button:hover {
          background: #0099cc;
        }
        
        .map-controls {
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 100;
        }
        
        .map-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(26, 35, 50, 0.8);
          border-radius: 6px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .map-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff88;
          box-shadow: 0 0 10px #00ff88;
          animation: pulse 2s infinite;
        }
        
        .map-status-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default UnifiedMapView;