/**
 * 项目标记管理组件 - Epic控制中心项目管理系统
 * 基于1号专家技术规范实现
 * 0号架构师 - 完成1号专家开发指令
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// ==================== 接口定义 ====================

export interface ProjectMarkerData {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  depth: number; // 基坑深度(m)
  status: 'active' | 'completed' | 'planning';
  progress: number; // 完成进度(0-100%)
  description?: string;
  weatherData?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    description: string;
  };
}

export interface ProjectMarkerManagerProps {
  projects?: ProjectMarkerData[];
  onProjectSelect?: (project: ProjectMarkerData) => void;
  onProjectClick?: (project: ProjectMarkerData) => void;
  selectedProjectId?: string;
  showWeatherData?: boolean;
  enableFlightNavigation?: boolean;
}

// ==================== 默认项目数据 ====================

const DEFAULT_PROJECTS: ProjectMarkerData[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    location: { lat: 31.2304, lng: 121.4737 },
    depth: 70,
    status: 'completed',
    progress: 100,
    description: '上海中心大厦深基坑工程，深度70m，已完成施工',
    weatherData: {
      temperature: 18,
      humidity: 65,
      windSpeed: 12,
      description: '多云'
    }
  },
  {
    id: 'beijing-daxing-airport',
    name: '北京大兴机场T1',
    location: { lat: 39.5098, lng: 116.4105 },
    depth: 45,
    status: 'active',
    progress: 85,
    description: '北京大兴国际机场T1航站楼深基坑，深度45m，施工进行中',
    weatherData: {
      temperature: 8,
      humidity: 45,
      windSpeed: 18,
      description: '晴朗'
    }
  },
  {
    id: 'shenzhen-qianhai',
    name: '深圳前海金融区',
    location: { lat: 22.5431, lng: 113.9339 },
    depth: 35,
    status: 'planning',
    progress: 15,
    description: '深圳前海金融中心深基坑项目，深度35m，规划设计中',
    weatherData: {
      temperature: 25,
      humidity: 78,
      windSpeed: 8,
      description: '小雨'
    }
  },
  {
    id: 'guangzhou-zhujiang',
    name: '广州珠江新城CBD',
    location: { lat: 23.1291, lng: 113.3240 },
    depth: 55,
    status: 'completed',
    progress: 100,
    description: '广州珠江新城CBD商务中心深基坑，深度55m，已完成',
    weatherData: {
      temperature: 22,
      humidity: 82,
      windSpeed: 6,
      description: '多云'
    }
  }
];

// ==================== 样式常量 ====================

const MARKER_COLORS = {
  active: '#ff6b35',      // 进行中 - 橙色
  completed: '#52c41a',   // 已完成 - 绿色
  planning: '#8c8c8c'     // 规划中 - 灰色
};

const STATUS_LABELS = {
  active: '进行中',
  completed: '已完成',
  planning: '规划中'
};

// ==================== 主组件 ====================

const ProjectMarkerManager: React.FC<ProjectMarkerManagerProps> = ({
  projects = DEFAULT_PROJECTS,
  onProjectSelect,
  onProjectClick,
  selectedProjectId,
  showWeatherData = true,
  enableFlightNavigation = true
}) => {
  // ==================== 状态管理 ====================
  
  const [selectedProject, setSelectedProject] = useState<ProjectMarkerData | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [markerElements, setMarkerElements] = useState<Map<string, THREE.Mesh>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // ==================== 计算属性 ====================

  const projectStats = useMemo(() => {
    const stats = {
      total: projects.length,
      active: 0,
      completed: 0,
      planning: 0,
      averageProgress: 0,
      totalDepth: 0
    };

    projects.forEach(project => {
      stats[project.status]++;
      stats.averageProgress += project.progress;
      stats.totalDepth += project.depth;
    });

    stats.averageProgress = Math.round(stats.averageProgress / projects.length);
    
    return stats;
  }, [projects]);

  // ==================== 事件处理 ====================

  const handleProjectClick = useCallback((project: ProjectMarkerData) => {
    setSelectedProject(project);
    onProjectSelect?.(project);
    onProjectClick?.(project);
    
    if (enableFlightNavigation) {
      // 触发Epic飞行导航
      const flightEvent = new CustomEvent('epic-flight-to-project', {
        detail: { project }
      });
      window.dispatchEvent(flightEvent);
    }
  }, [onProjectSelect, onProjectClick, enableFlightNavigation]);

  const handleProjectHover = useCallback((projectId: string | null) => {
    setHoveredProject(projectId);
  }, []);

  // ==================== 3D标记生成 ====================

  const createProjectMarker = useCallback((project: ProjectMarkerData) => {
    // 创建3D圆柱体标记
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, project.depth / 10);
    const material = new THREE.MeshPhongMaterial({
      color: MARKER_COLORS[project.status],
      transparent: true,
      opacity: 0.8
    });
    
    const marker = new THREE.Mesh(geometry, material);
    
    // 设置位置（需要根据地图坐标系转换）
    const worldPosition = convertLatLngToWorld(project.location);
    marker.position.copy(worldPosition);
    
    // 添加用户数据
    marker.userData = {
      projectId: project.id,
      type: 'project-marker'
    };
    
    return marker;
  }, []);

  // ==================== 坐标转换工具 ====================

  const convertLatLngToWorld = useCallback((location: { lat: number; lng: number }) => {
    // 简化的地理坐标到世界坐标转换
    // 实际实现中需要根据地图投影系统调整
    return new THREE.Vector3(
      location.lng * 111320, // 经度转米（近似）
      0,
      location.lat * 110540  // 纬度转米（近似）
    );
  }, []);

  // ==================== 组件效果 ====================

  useEffect(() => {
    // 创建所有项目的3D标记
    const newMarkers = new Map<string, THREE.Mesh>();
    
    projects.forEach(project => {
      const marker = createProjectMarker(project);
      newMarkers.set(project.id, marker);
    });
    
    setMarkerElements(newMarkers);
  }, [projects, createProjectMarker]);

  // ==================== 渲染函数 ====================

  const renderProjectCard = (project: ProjectMarkerData) => {
    const isSelected = selectedProjectId === project.id || selectedProject?.id === project.id;
    const isHovered = hoveredProject === project.id;
    
    return (
      <motion.div
        key={project.id}
        className="project-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleProjectClick(project)}
        onHoverStart={() => handleProjectHover(project.id)}
        onHoverEnd={() => handleProjectHover(null)}
        style={{
          background: isSelected ? 
            'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 128, 255, 0.1))' :
            'rgba(30, 30, 30, 0.8)',
          border: isSelected ? 
            '2px solid rgba(0, 255, 255, 0.5)' : 
            '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          margin: '8px 0',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
        }}
      >
        {/* 项目基本信息 */}
        <div className="project-header">
          <div className="project-title">
            <h3 style={{ 
              color: '#fff', 
              margin: '0 0 8px 0', 
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              {project.name}
            </h3>
            <div className="project-status">
              <span 
                className="status-indicator"
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: MARKER_COLORS[project.status],
                  marginRight: '6px'
                }}
              />
              <span style={{ color: MARKER_COLORS[project.status], fontSize: '12px' }}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
          </div>
        </div>

        {/* 项目详细信息 */}
        <div className="project-details" style={{ margin: '12px 0' }}>
          <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
            <span style={{ color: '#ccc', fontSize: '12px' }}>坐标位置:</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>
              {project.location.lat.toFixed(3)}°N, {project.location.lng.toFixed(3)}°E
            </span>
          </div>
          <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
            <span style={{ color: '#ccc', fontSize: '12px' }}>基坑深度:</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>{project.depth}m</span>
          </div>
          <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}>
            <span style={{ color: '#ccc', fontSize: '12px' }}>完成进度:</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>{project.progress}%</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="progress-bar" style={{ margin: '8px 0' }}>
          <div 
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                height: '100%',
                backgroundColor: MARKER_COLORS[project.status],
                borderRadius: '2px'
              }}
            />
          </div>
        </div>

        {/* 天气信息（可选） */}
        {showWeatherData && project.weatherData && (
          <div className="weather-info" style={{ 
            marginTop: '12px', 
            padding: '8px', 
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#ccc', fontSize: '11px' }}>实时天气:</span>
              <span style={{ color: '#fff', fontSize: '11px' }}>
                {project.weatherData.temperature}°C, {project.weatherData.description}
              </span>
            </div>
          </div>
        )}

        {/* 项目描述 */}
        {project.description && (
          <div className="project-description" style={{ 
            marginTop: '8px', 
            color: '#aaa', 
            fontSize: '11px',
            lineHeight: '1.4'
          }}>
            {project.description}
          </div>
        )}
      </motion.div>
    );
  };

  const renderStatsPanel = () => (
    <div className="stats-panel" style={{
      background: 'rgba(20, 20, 20, 0.9)',
      backdropFilter: 'blur(15px)',
      borderRadius: '12px',
      padding: '16px',
      margin: '0 0 16px 0',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h4 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '14px' }}>项目统计</h4>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div className="stat-item">
          <span style={{ color: '#ccc', fontSize: '11px' }}>总项目数</span>
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{projectStats.total}</span>
        </div>
        <div className="stat-item">
          <span style={{ color: '#ccc', fontSize: '11px' }}>平均进度</span>
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{projectStats.averageProgress}%</span>
        </div>
        <div className="stat-item">
          <span style={{ color: MARKER_COLORS.active, fontSize: '11px' }}>进行中</span>
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{projectStats.active}</span>
        </div>
        <div className="stat-item">
          <span style={{ color: MARKER_COLORS.completed, fontSize: '11px' }}>已完成</span>
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{projectStats.completed}</span>
        </div>
      </div>
    </div>
  );

  // ==================== 主渲染 ====================

  return (
    <div className="project-marker-manager" style={{
      width: '100%',
      height: '100%',
      position: 'relative'
    }}>
      {/* 统计面板 */}
      {renderStatsPanel()}

      {/* 项目列表 */}
      <div className="projects-list" style={{
        maxHeight: 'calc(100% - 120px)',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        <AnimatePresence>
          {projects.map(project => renderProjectCard(project))}
        </AnimatePresence>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="loading-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <div className="loading-spinner" style={{
              width: '24px',
              height: '24px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid #00d9ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 8px auto'
            }} />
            <span style={{ fontSize: '12px' }}>加载项目数据...</span>
          </div>
        </div>
      )}

      {/* CSS动画 */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .project-marker-manager::-webkit-scrollbar {
          width: 6px;
        }
        
        .project-marker-manager::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .project-marker-manager::-webkit-scrollbar-thumb {
          background: rgba(0, 217, 255, 0.5);
          border-radius: 3px;
        }
        
        .project-marker-manager::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 217, 255, 0.8);
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default ProjectMarkerManager;