import React from 'react';

// 定义深基坑专业工具类型
export interface ExcavationTool {
  id: string;
  name: string;
  icon?: string;
  description: string;
}

// 工具栏属性
interface ExcavationToolsProps {
  onToolSelect: (toolId: string) => void;
  selectedTool?: string;
}

const ExcavationTools: React.FC<ExcavationToolsProps> = ({ onToolSelect, selectedTool }) => {
  // 深基坑专业工具定义
  const excavationTools: ExcavationTool[] = [
    {
      id: 'soil_layer',
      name: '土层建模',
      description: '创建多层土体模型'
    },
    {
      id: 'diaphragm_wall',
      name: '地下连续墙',
      description: '创建地下连续墙支护结构'
    },
    {
      id: 'pile_wall',
      name: '桩墙',
      description: '创建桩墙支护结构'
    },
    {
      id: 'anchor',
      name: '锚杆',
      description: '添加锚杆支撑'
    },
    {
      id: 'strut',
      name: '支撑',
      description: '添加水平支撑'
    },
    {
      id: 'excavation_stage',
      name: '开挖分段',
      description: '定义开挖阶段'
    },
    {
      id: 'water_level',
      name: '地下水位',
      description: '设置地下水位'
    }
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '70px', // 位于基本工具栏下方
      left: '10px',
      backgroundColor: '#2A2A42',
      borderRadius: '5px',
      padding: '5px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 100,
      width: '180px'
    }}>
      <div style={{ 
        color: '#fff', 
        fontSize: '0.9rem', 
        padding: '5px', 
        borderBottom: '1px solid #444',
        fontWeight: 'bold'
      }}>
        深基坑专业工具
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {excavationTools.map(tool => (
          <button
            key={tool.id}
            style={{
              backgroundColor: selectedTool === tool.id ? '#4A90E2' : 'transparent',
              color: selectedTool === tool.id ? '#fff' : '#ddd',
              border: 'none',
              borderRadius: '3px',
              padding: '8px 10px',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            onClick={() => onToolSelect(tool.id)}
            title={tool.description}
          >
            <span>{tool.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExcavationTools; 