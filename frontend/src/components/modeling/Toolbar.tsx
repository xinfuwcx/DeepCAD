import React from 'react';

// 工具按钮类型
interface ToolButton {
  id: string;
  label: string;
  icon?: string;
}

// 工具按钮分组
interface ToolGroup {
  name: string;
  tools: ToolButton[];
}

// 工具栏属性
interface ToolbarProps {
  onToolSelect: (toolId: string) => void;
  selectedTool?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({ onToolSelect, selectedTool }) => {
  // 定义工具组
  const toolGroups: ToolGroup[] = [
    {
      name: '基本工具',
      tools: [
        { id: 'select', label: '选择' },
        { id: 'move', label: '移动' },
        { id: 'rotate', label: '旋转' },
        { id: 'scale', label: '缩放' }
      ]
    },
    {
      name: '基本形状',
      tools: [
        { id: 'box', label: '立方体' },
        { id: 'cylinder', label: '圆柱体' },
        { id: 'sphere', label: '球体' },
        { id: 'cone', label: '圆锥体' }
      ]
    },
    {
      name: '操作',
      tools: [
        { id: 'extrude', label: '拉伸' },
        { id: 'revolve', label: '旋转体' },
        { id: 'sweep', label: '扫描' },
        { id: 'boolean', label: '布尔运算' }
      ]
    }
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      backgroundColor: '#2A2A42',
      borderRadius: '5px',
      padding: '5px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 100
    }}>
      {toolGroups.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} style={{ marginBottom: '10px' }}>
          <div style={{ 
            color: '#999', 
            fontSize: '0.8rem', 
            padding: '5px', 
            borderBottom: '1px solid #444'
          }}>
            {group.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {group.tools.map(tool => (
              <button
                key={tool.id}
                style={{
                  backgroundColor: selectedTool === tool.id ? '#4A90E2' : 'transparent',
                  color: selectedTool === tool.id ? '#fff' : '#ddd',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '5px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  width: '100%',
                }}
                onClick={() => onToolSelect(tool.id)}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Toolbar; 