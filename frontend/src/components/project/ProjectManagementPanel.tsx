/**
 * 项目管理浮动面板组件
 * 浮动在3D视图上的项目管理界面
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  CloseOutlined,
  DragOutlined,
  ExpandOutlined,
  CompressOutlined,
  ProjectOutlined,
  CalendarOutlined,
  UserOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';

// 项目数据接口
interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  progress: number;
  startDate: string;
  endDate: string;
  manager: string;
  depth: number;
  area: number;
  thumbnail?: string;
}

// 组件属性接口
interface ProjectManagementPanelProps {
  visible: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
  onProjectSelect?: (project: Project) => void;
  projects?: Project[];
}

// 示例项目数据
const defaultProjects: Project[] = [
  {
    id: '1',
    name: '上海中心深基坑项目',
    description: '大型商业综合体深基坑工程',
    location: '上海市浦东新区',
    status: 'active',
    progress: 75,
    startDate: '2024-01-15',
    endDate: '2024-12-30',
    manager: '张工',
    depth: 18.5,
    area: 2500
  },
  {
    id: '2', 
    name: '北京CBD地铁站基坑',
    description: '地铁换乘站深基坑施工',
    location: '北京市朝阳区',
    status: 'planning',
    progress: 25,
    startDate: '2024-03-01',
    endDate: '2025-06-15',
    manager: '李工',
    depth: 22.0,
    area: 1800
  },
  {
    id: '3',
    name: '深圳前海金融中心',
    description: '超高层建筑深基坑工程',
    location: '深圳市南山区',
    status: 'completed',
    progress: 100,
    startDate: '2023-05-20',
    endDate: '2024-02-10',
    manager: '王工',
    depth: 25.5,
    area: 3200
  }
];

const ProjectManagementPanel: React.FC<ProjectManagementPanelProps> = ({
  visible,
  onClose,
  position = { x: 100, y: 100 },
  onProjectSelect,
  projects = defaultProjects
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dragPosition, setDragPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);

  // 状态颜色映射
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'planning': return '#1890ff';
      case 'active': return '#52c41a';
      case 'completed': return '#722ed1';
      case 'paused': return '#fa8c16';
      default: return '#d9d9d9';
    }
  };

  // 状态文本映射
  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'planning': return '规划中';
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'paused': return '暂停';
      default: return '未知';
    }
  };

  // 处理项目选择
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  // 面板动画变体
  const panelVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8, 
      x: dragPosition.x, 
      y: dragPosition.y 
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      x: dragPosition.x, 
      y: dragPosition.y,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 25 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          drag
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(event, info) => {
            setIsDragging(false);
            setDragPosition({
              x: dragPosition.x + info.offset.x,
              y: dragPosition.y + info.offset.y
            });
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 1000,
            width: isExpanded ? 420 : 60,
            maxHeight: '80vh',
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 30, 60, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
            border: '2px solid transparent',
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)),
              linear-gradient(135deg, #00ffff, #0080ff, #ff00ff, #00ffff)
            `,
            backgroundOrigin: 'border-box',
            backgroundClip: 'content-box, border-box',
            borderRadius: '20px',
            backdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: `
              0 0 40px rgba(0, 255, 255, 0.3),
              0 0 80px rgba(0, 255, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
            cursor: isDragging ? 'grabbing' : 'grab',
            overflow: 'hidden'
          }}
        >
          {/* 标题栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
            background: 'linear-gradient(90deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))',
            backgroundSize: '200% 100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity }
                }}
              >
                <ProjectOutlined style={{ fontSize: '20px', color: '#00ffff' }} />
              </motion.div>
              {isExpanded && (
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    margin: 0,
                    color: 'transparent',
                    background: 'linear-gradient(90deg, #00ffff, #ffffff, #ff00ff)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  项目管理中心
                </motion.h3>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(0, 255, 255, 0.2)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#00ffff',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 0, 0, 0.2)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '6px',
                  color: '#ff4d4f',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <CloseOutlined />
              </motion.button>
            </div>
          </div>

          {/* 内容区域 */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  maxHeight: 'calc(80vh - 80px)',
                  overflowY: 'auto',
                  padding: '16px'
                }}
              >
                {/* 操作按钮栏 */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  flexWrap: 'wrap'
                }}>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(0, 255, 0, 0.5)' }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '8px 12px',
                      background: 'linear-gradient(45deg, rgba(0, 255, 0, 0.3), rgba(0, 200, 0, 0.2))',
                      border: '1px solid rgba(0, 255, 0, 0.4)',
                      borderRadius: '6px',
                      color: '#00ff00',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <PlusOutlined /> 新建项目
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(0, 150, 255, 0.5)' }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '8px 12px',
                      background: 'linear-gradient(45deg, rgba(0, 150, 255, 0.3), rgba(0, 100, 200, 0.2))',
                      border: '1px solid rgba(0, 150, 255, 0.4)',
                      borderRadius: '6px',
                      color: '#0096ff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FolderOutlined /> 导入项目
                  </motion.button>
                </div>

                {/* 项目列表 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                      }}
                      onClick={() => handleProjectSelect(project)}
                      style={{
                        background: selectedProject?.id === project.id 
                          ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(255, 0, 255, 0.1))'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(0, 150, 255, 0.05))',
                        border: `2px solid ${selectedProject?.id === project.id ? '#00ffff' : 'rgba(255, 255, 255, 0.15)'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* 项目状态指示器 */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getStatusColor(project.status),
                        boxShadow: `0 0 10px ${getStatusColor(project.status)}`
                      }} />
                      
                      {/* 项目基本信息 */}
                      <div style={{ marginBottom: '8px' }}>
                        <h4 style={{
                          margin: '0 0 4px 0',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {project.name}
                        </h4>
                        <p style={{
                          margin: '0 0 8px 0',
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '12px',
                          lineHeight: '1.4'
                        }}>
                          {project.description}
                        </p>
                      </div>
                      
                      {/* 项目详情 */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <EnvironmentOutlined style={{ color: '#00ffff' }} />
                          {project.location}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UserOutlined style={{ color: '#ff00ff' }} />
                          {project.manager}
                        </div>
                        <div>深度: <span style={{ color: '#ffaa00' }}>{project.depth}m</span></div>
                        <div>面积: <span style={{ color: '#00ff88' }}>{project.area}m²</span></div>
                      </div>
                      
                      {/* 进度条 */}
                      <div style={{
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          flex: 1,
                          height: '4px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress}%` }}
                            transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                            style={{
                              height: '100%',
                              background: `linear-gradient(90deg, ${getStatusColor(project.status)}, ${getStatusColor(project.status)}aa)`,
                              borderRadius: '2px'
                            }}
                          />
                        </div>
                        <span style={{
                          fontSize: '11px',
                          color: getStatusColor(project.status),
                          minWidth: '40px'
                        }}>
                          {project.progress}%
                        </span>
                      </div>
                      
                      {/* 状态标签 */}
                      <div style={{
                        marginTop: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          padding: '2px 8px',
                          background: `${getStatusColor(project.status)}20`,
                          border: `1px solid ${getStatusColor(project.status)}50`,
                          borderRadius: '4px',
                          color: getStatusColor(project.status),
                          fontSize: '10px'
                        }}>
                          {getStatusText(project.status)}
                        </span>
                        
                        {/* 操作按钮 */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('查看项目:', project.name);
                            }}
                            style={{
                              background: 'rgba(0, 150, 255, 0.2)',
                              border: '1px solid rgba(0, 150, 255, 0.3)',
                              borderRadius: '4px',
                              color: '#0096ff',
                              padding: '4px',
                              cursor: 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            <EyeOutlined />
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('编辑项目:', project.name);
                            }}
                            style={{
                              background: 'rgba(255, 165, 0, 0.2)',
                              border: '1px solid rgba(255, 165, 0, 0.3)',
                              borderRadius: '4px',
                              color: '#ffa500',
                              padding: '4px',
                              cursor: 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            <EditOutlined />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* 底部统计信息 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 150, 255, 0.05))',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textAlign: 'center'
                  }}
                >
                  <div>总计 <span style={{ color: '#00ffff' }}>{projects.length}</span> 个项目</div>
                  <div style={{ marginTop: '4px' }}>
                    活跃: <span style={{ color: '#52c41a' }}>{projects.filter(p => p.status === 'active').length}</span> | 
                    规划: <span style={{ color: '#1890ff' }}>{projects.filter(p => p.status === 'planning').length}</span> | 
                    完成: <span style={{ color: '#722ed1' }}>{projects.filter(p => p.status === 'completed').length}</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProjectManagementPanel;