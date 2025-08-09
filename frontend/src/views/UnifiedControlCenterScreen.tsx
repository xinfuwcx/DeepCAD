/**
 * DeepCAD 统一控制中心界面
 * 使用 UnifiedMapService 替代 iTowns 占位符系统
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedMapView } from '../components/map/UnifiedMapView';
import { useControlCenterStore } from '../stores/controlCenterStore';
import { ProjectMarker, MapStyleType } from '../services/UnifiedMapService';

// 示例项目数据
const SAMPLE_PROJECTS: ProjectMarker[] = [
  {
    id: 'proj-001',
    name: '北京CBD深基坑',
    coordinates: [116.4591, 39.9187],
    status: 'active',
    progress: 75,
    depth: 35,
    area: 8500,
    manager: '张工'
  },
  {
    id: 'proj-002', 
    name: '上海陆家嘴项目',
    coordinates: [121.5057, 31.2453],
    status: 'planning',
    progress: 15,
    depth: 42,
    area: 12000,
    manager: '李工'
  },
  {
    id: 'proj-003',
    name: '广州天河基坑',
    coordinates: [113.3265, 23.1291],
    status: 'completed',
    progress: 100,
    depth: 28,
    area: 6500,
    manager: '王工'
  },
  {
    id: 'proj-004',
    name: '深圳南山项目',
    coordinates: [113.9308, 22.5322],
    status: 'risk',
    progress: 45,
    depth: 38,
    area: 9200,
    manager: '赵工'
  }
];

export const UnifiedControlCenterScreen: React.FC = () => {
  const {
    activeMapMode,
    darkMode,
    showWeatherPanel,
    handleNavigationClick
  } = useControlCenterStore();

  const [selectedProject, setSelectedProject] = useState<ProjectMarker | null>(null);
  // const [hoveredProject, setHoveredProject] = useState<ProjectMarker | null>(null); // 未使用暂注释
  const [mapReady, setMapReady] = useState(false);

  // 地图样式映射
  const getMapStyle = (): MapStyleType => {
    switch (activeMapMode) {
      case 'satellite': return 'satellite';
      case 'street': return 'street';
      case 'terrain': return 'terrain';
      case 'dark': return 'dark-tech';
      default: return darkMode ? 'dark-tech' : 'street';
    }
  };

  // 导航按钮配置
  const navigationButtons = [
    { key: 'street', icon: '🗺️', label: '街道' },
    { key: 'satellite', icon: '🛰️', label: '卫星' },
    { key: 'terrain', icon: '🏔️', label: '地形' },
    { key: 'dark', icon: '🌙', label: '暗色' },
    { key: 'weather', icon: '🌤️', label: '天气' },
    { key: 'project-management', icon: '🏗️', label: '项目' },
    { key: 'monitor', icon: '📊', label: '监控' },
    { key: 'ai', icon: '🤖', label: 'AI' },
    { key: 'exit', icon: '🚪', label: '退出' }
  ];

  return (
    <div className="unified-control-center">
      {/* 主地图区域 */}
      <div className="map-container">
        <UnifiedMapView
          style={getMapStyle()}
          projects={SAMPLE_PROJECTS}
          onProjectSelect={setSelectedProject}
          // onProjectHover removed (hover logic暂未启用)
          onMapReady={() => setMapReady(true)}
          className="main-unified-map"
        />
      </div>

      {/* 左侧导航面板 */}
      <motion.div 
        className="navigation-panel"
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="nav-header">
          <h2>🌍 DeepCAD 统一控制台</h2>
          <div className="system-status">
            <span className="status-indicator online"></span>
            <span>系统在线</span>
          </div>
        </div>

        <div className="nav-buttons">
          {navigationButtons.map((button) => (
            <motion.button
              key={button.key}
              className={`nav-button ${activeMapMode === button.key ? 'active' : ''}`}
              onClick={() => handleNavigationClick(button.key as any)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="nav-icon">{button.icon}</span>
              <span className="nav-label">{button.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* 顶部状态栏 */}
      <motion.div 
        className="top-status-bar"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="status-info">
          <span className="map-service-info">
            🗺️ DeepCAD 统一地图服务 | 当前样式: {getMapStyle()}
          </span>
          {mapReady && (
            <span className="project-count">
              📍 {SAMPLE_PROJECTS.length} 个活跃项目
            </span>
          )}
        </div>
      </motion.div>

      {/* 项目详情面板 */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div 
            className="project-details-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="panel-header">
              <h3>项目详情</h3>
              <button 
                className="close-button"
                onClick={() => setSelectedProject(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="project-info">
              <h4>{selectedProject.name}</h4>
              <div className="project-meta">
                <div className="meta-item">
                  <span className="label">状态:</span>
                  <span className={`status ${selectedProject.status}`}>
                    {selectedProject.status}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="label">进度:</span>
                  <span className="value">{selectedProject.progress}%</span>
                </div>
                <div className="meta-item">
                  <span className="label">深度:</span>
                  <span className="value">{selectedProject.depth}m</span>
                </div>
                <div className="meta-item">
                  <span className="label">面积:</span>
                  <span className="value">{selectedProject.area}m²</span>
                </div>
                <div className="meta-item">
                  <span className="label">负责人:</span>
                  <span className="value">{selectedProject.manager}</span>
                </div>
              </div>
              
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${selectedProject.progress}%` }}
                ></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 天气面板 */}
      <AnimatePresence>
        {showWeatherPanel && (
          <motion.div 
            className="weather-panel"
            initial={{ y: -200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -200, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3>🌤️ 天气状况</h3>
            <p>实时天气数据将在此显示</p>
          </motion.div>
        )}
      </AnimatePresence>

  <style>{`
        .unified-control-center {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: #0a0f1a;
          overflow: hidden;
        }
        
        .map-container {
          width: 100%;
          height: 100%;
        }
        
        .navigation-panel {
          position: absolute;
          top: 20px;
          left: 20px;
          width: 280px;
          background: rgba(26, 35, 50, 0.95);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          z-index: 1000;
        }
        
        .nav-header h2 {
          color: white;
          margin: 0 0 10px 0;
          font-size: 18px;
          font-weight: bold;
        }
        
        .system-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          margin-bottom: 20px;
        }
        
        .status-indicator.online {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff88;
          box-shadow: 0 0 10px #00ff88;
          animation: pulse 2s infinite;
        }
        
        .nav-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .nav-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'JetBrains Mono', monospace;
        }
        
        .nav-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(0, 217, 255, 0.5);
          transform: translateX(4px);
        }
        
        .nav-button.active {
          background: rgba(0, 217, 255, 0.2);
          border-color: #00d9ff;
          color: white;
        }
        
        .nav-icon {
          font-size: 16px;
        }
        
        .nav-label {
          font-size: 13px;
        }
        
        .top-status-bar {
          position: absolute;
          top: 20px;
          right: 20px;
          left: 320px;
          height: 60px;
          background: rgba(26, 35, 50, 0.95);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 1000;
        }
        
        .status-info {
          display: flex;
          align-items: center;
          gap: 20px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
        }
        
        .project-details-panel {
          position: absolute;
          top: 100px;
          right: 20px;
          width: 320px;
          background: rgba(26, 35, 50, 0.95);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          z-index: 1000;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .panel-header h3 {
          color: white;
          margin: 0;
          font-size: 16px;
        }
        
        .close-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        
        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        .project-info h4 {
          color: white;
          margin: 0 0 15px 0;
          font-size: 18px;
        }
        
        .project-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }
        
        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        
        .label {
          color: rgba(255, 255, 255, 0.6);
        }
        
        .value {
          color: white;
          font-weight: bold;
        }
        
        .status {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status.active { background: rgba(0, 217, 255, 0.3); color: #00d9ff; }
        .status.planning { background: rgba(139, 92, 246, 0.3); color: #8b5cf6; }
        .status.completed { background: rgba(0, 255, 136, 0.3); color: #00ff88; }
        .status.risk { background: rgba(255, 107, 53, 0.3); color: #ff6b35; }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00d9ff, #0099cc);
          transition: width 0.3s ease;
        }
        
        .weather-panel {
          position: absolute;
          top: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(26, 35, 50, 0.95);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          z-index: 1000;
          color: white;
          text-align: center;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default UnifiedControlCenterScreen;