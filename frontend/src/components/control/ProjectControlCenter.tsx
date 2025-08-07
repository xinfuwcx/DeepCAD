/**
 * 深基坑项目控制中心 - 炫酷大屏版本
 * 🚀 全新设计的项目管理大屏界面
 *
 * 特性:
 * - 炫酷的大屏设计
 * - 实时数据展示
 * - 项目状态监控
 * - 响应式布局
 *
 * @author DeepCAD Team
 * @date 2025-01-29
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectMarkerData } from '../../services/GeoThreeMapController';

// ======================= 接口定义 =======================

interface ControlCenterProps {
  width?: number;
  height?: number;
  onExit: () => void;
  onSwitchToControlCenter?: () => void;
  projects?: ProjectMarkerData[];
  onProjectSelect?: (projectId: string) => void;
}

// ======================= 项目数据 =======================

const defaultProjects = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑项目',
    location: { lat: 31.2304, lng: 121.4737 },
    depth: 19.5,
    area: 2200,
    status: 'active' as const,
    progress: 76,
    temperature: 24,
    humidity: 65,
    windSpeed: 12,
    riskLevel: 'low' as const,
    workers: 45,
    equipment: 12
  },
  {
    id: 'beijing-cbd',
    name: '北京CBD深基坑项目',
    location: { lat: 39.9042, lng: 116.4074 },
    depth: 22,
    area: 1800,
    status: 'active' as const,
    progress: 58,
    temperature: 18,
    humidity: 45,
    windSpeed: 8,
    riskLevel: 'medium' as const,
    workers: 38,
    equipment: 9
  },
  {
    id: 'shenzhen-bay',
    name: '深圳湾金融中心',
    location: { lat: 22.5431, lng: 113.9339 },
    depth: 25.5,
    area: 3200,
    status: 'planning' as const,
    progress: 23,
    temperature: 28,
    humidity: 78,
    windSpeed: 15,
    riskLevel: 'high' as const,
    workers: 52,
    equipment: 15
  }
];
// ======================= 主组件 =======================

export const ProjectControlCenter: React.FC<ControlCenterProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  onExit,
  onSwitchToControlCenter,
  projects,
  onProjectSelect
}) => {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 处理项目选择
  const handleProjectSelect = useCallback((project: any) => {
    setSelectedProject(project);
    onProjectSelect?.(project.id);
  }, [onProjectSelect]);

  // 获取风险等级颜色
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#00ff88';
      case 'medium': return '#ffaa00';
      case 'high': return '#ff4444';
      default: return '#888';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#00ff88';
      case 'planning': return '#ffaa00';
      case 'completed': return '#4488ff';
      default: return '#888';
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 顶部标题栏 */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
          zIndex: 1000
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            margin: 0,
            background: 'linear-gradient(45deg, #00ff88, #0088ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🏗️ DeepCAD 项目管理中心
          </h1>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(0, 255, 136, 0.2)',
            borderRadius: '20px',
            fontSize: '14px',
            border: '1px solid rgba(0, 255, 136, 0.5)'
          }}>
            实时监控中
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {currentTime.toLocaleTimeString()}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              {currentTime.toLocaleDateString()}
            </div>
          </div>

          <button
            onClick={onExit}
            style={{
              background: 'rgba(255, 68, 68, 0.2)',
              border: '1px solid rgba(255, 68, 68, 0.5)',
              borderRadius: '8px',
              color: '#ff4444',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)';
            }}
          >
            退出
          </button>
        </div>
      </motion.div>

      {/* 主要内容区域 */}
      <div style={{
        marginTop: '80px',
        padding: '40px',
        height: 'calc(100vh - 80px)',
        overflow: 'auto'
      }}>
        {/* 项目概览统计 */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginBottom: '40px'
          }}
        >
          <div style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00ff88' }}>
              {defaultProjects.length}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>总项目数</div>
          </div>

          <div style={{
            background: 'rgba(0, 136, 255, 0.1)',
            border: '1px solid rgba(0, 136, 255, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0088ff' }}>
              {defaultProjects.filter(p => p.status === 'active').length}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>进行中</div>
          </div>

          <div style={{
            background: 'rgba(255, 170, 0, 0.1)',
            border: '1px solid rgba(255, 170, 0, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffaa00' }}>
              {defaultProjects.reduce((sum, p) => sum + p.workers, 0)}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>总人员</div>
          </div>

          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4444' }}>
              {defaultProjects.filter(p => p.riskLevel === 'high').length}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>高风险项目</div>
          </div>
        </motion.div>

        {/* 项目卡片网格 */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '30px'
          }}
        >
          {defaultProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => handleProjectSelect(project)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: `2px solid ${selectedProject?.id === project.id ? getStatusColor(project.status) : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '16px',
                padding: '30px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 项目状态指示器 */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getStatusColor(project.status),
                boxShadow: `0 0 10px ${getStatusColor(project.status)}`
              }} />

              {/* 项目标题 */}
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0 0 20px 0',
                color: '#ffffff'
              }}>
                {project.name}
              </h3>

              {/* 项目信息网格 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>深度</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00ff88' }}>
                    {project.depth}m
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>面积</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0088ff' }}>
                    {project.area}m²
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>人员</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffaa00' }}>
                    {project.workers}人
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '5px' }}>设备</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff88aa' }}>
                    {project.equipment}台
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>进度</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{project.progress}%</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${getStatusColor(project.status)}, ${getStatusColor(project.status)}88)`,
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              {/* 环境数据 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '15px',
                marginBottom: '20px',
                padding: '15px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>温度</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff8844' }}>
                    {project.temperature}°C
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>湿度</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#44aaff' }}>
                    {project.humidity}%
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>风速</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#88ff44' }}>
                    {project.windSpeed}km/h
                  </div>
                </div>
              </div>

              {/* 风险等级 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  padding: '8px 16px',
                  background: `${getRiskColor(project.riskLevel)}20`,
                  border: `1px solid ${getRiskColor(project.riskLevel)}`,
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: getRiskColor(project.riskLevel)
                }}>
                  {project.riskLevel === 'low' ? '低风险' :
                   project.riskLevel === 'medium' ? '中风险' : '高风险'}
                </div>

                <div style={{
                  padding: '8px 16px',
                  background: `${getStatusColor(project.status)}20`,
                  border: `1px solid ${getStatusColor(project.status)}`,
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: getStatusColor(project.status)
                }}>
                  {project.status === 'active' ? '进行中' :
                   project.status === 'planning' ? '规划中' : '已完成'}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectControlCenter;
