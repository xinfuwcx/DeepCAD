import React from 'react';
import { Badge, Tag, Space } from 'antd';

interface StatusBarProps {
  className?: string;
  viewType?: 'dashboard' | 'geometry' | 'materials' | 'meshing' | 'analysis' | 'results';
}

const StatusBar: React.FC<StatusBarProps> = ({ className, viewType = 'dashboard' }) => {
  // 根据视图类型获取状态数据
  const getStatusForView = () => {
    const baseStatus = {
      memory: { used: '2.3GB', total: '16GB' },
      gpu: { usage: 45, model: 'RTX 4080' },
      time: new Date().toLocaleTimeString('zh-CN')
    };

    switch (viewType) {
      case 'dashboard':
        return {
          ...baseStatus,
          project: { name: '上海某基坑工程', components: 12 },
          stats: { modules: 4, projects: 3 }
        };
      case 'geometry':
        return {
          ...baseStatus,
          modeling: { mode: '几何建模', step: '地质建模', progress: 75 },
          coordinates: { x: 125.5, y: 89.2, z: -15.8 }
        };
      case 'materials':
        return {
          ...baseStatus,
          library: { total: 45, active: 12, category: '混凝土' }
        };
      case 'meshing':
        return {
          ...baseStatus,
          mesh: { nodes: '125,483', elements: '89,762', quality: 85 }
        };
      case 'analysis':
        return {
          ...baseStatus,
          solver: { type: 'Terra', status: 'running', progress: 75 }
        };
      case 'results':
        return {
          ...baseStatus,
          visualization: { variable: '位移', contours: 20, scale: 'auto' }
        };
      default:
        return baseStatus;
    }
  };

  const statusData = getStatusForView();

  const getViewTitle = () => {
    const titles = {
      dashboard: '控制中心',
      geometry: '几何建模',
      materials: '材料库',
      meshing: '网格生成',
      analysis: '仿真分析',
      results: '结果可视化'
    };
    return titles[viewType];
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '32px',
        background: 'rgba(26, 26, 46, 0.95)',
        borderTop: '1px solid rgba(0, 217, 255, 0.3)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: '11px'
      }}
    >
      {/* 左侧状态 */}
      <Space size="middle">
        {/* 当前视图 */}
        <Badge status="processing" text={getViewTitle()} style={{ color: '#00d9ff' }} />

        {/* 视图相关状态 */}
        {viewType === 'dashboard' && 'project' in statusData && statusData.project && (
          <Space size="small">
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>项目:</span>
            <Tag color="cyan" style={{ fontSize: '10px', margin: 0 }}>{statusData.project.name}</Tag>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>组件: {statusData.project.components}</span>
          </Space>
        )}

        {viewType === 'geometry' && 'modeling' in statusData && statusData.modeling && (
          <Space size="small">
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>模式:</span>
            <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>{statusData.modeling.mode}</Tag>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>步骤: {statusData.modeling.step}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>进度: {statusData.modeling.progress}%</span>
          </Space>
        )}

        {viewType === 'materials' && 'library' in statusData && statusData.library && (
          <Space size="small">
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>材料库: {statusData.library.total}个</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>已激活: {statusData.library.active}个</span>
            <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>{statusData.library.category}</Tag>
          </Space>
        )}

        {viewType === 'meshing' && 'mesh' in statusData && statusData.mesh && (
          <Space size="small">
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>节点: {statusData.mesh.nodes}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>单元: {statusData.mesh.elements}</span>
            <Tag color="green" style={{ fontSize: '10px', margin: 0 }}>质量: {statusData.mesh.quality}%</Tag>
          </Space>
        )}

        {viewType === 'analysis' && 'solver' in statusData && statusData.solver && (
          <Space size="small">
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>求解器:</span>
            <Tag color="purple" style={{ fontSize: '10px', margin: 0 }}>{statusData.solver.type}</Tag>
            <Badge 
              status={statusData.solver.status === 'running' ? 'processing' : 'success'} 
              text={statusData.solver.status === 'running' ? '计算中' : '就绪'}
              style={{ color: statusData.solver.status === 'running' ? '#00d9ff' : '#52c41a' }}
            />
            {statusData.solver.status === 'running' && (
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{statusData.solver.progress}%</span>
            )}
          </Space>
        )}

        {viewType === 'results' && 'visualization' in statusData && statusData.visualization && (
          <Space size="small">
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>变量:</span>
            <Tag color="magenta" style={{ fontSize: '10px', margin: 0 }}>{statusData.visualization.variable}</Tag>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>等值线: {statusData.visualization.contours}层</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>缩放: {statusData.visualization.scale}</span>
          </Space>
        )}
      </Space>

      {/* 右侧状态 */}
      <Space size="middle">
        {/* 系统性能 */}
        <Space size="small">
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>内存: {statusData.memory.used}</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>GPU: {statusData.gpu.usage}%</span>
        </Space>

        {/* 坐标系 (仅几何和结果视图) */}
        {(viewType === 'geometry' || viewType === 'results') && 'coordinates' in statusData && statusData.coordinates && (
          <Space size="small">
            <span style={{ color: '#ff4d4f' }}>X: {statusData.coordinates.x}</span>
            <span style={{ color: '#52c41a' }}>Y: {statusData.coordinates.y}</span>
            <span style={{ color: '#1890ff' }}>Z: {statusData.coordinates.z}</span>
          </Space>
        )}

        {/* 时间和缩放 */}
        <Space size="small">
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{statusData.time}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>100%</span>
        </Space>
      </Space>
    </div>
  );
};

export default StatusBar;