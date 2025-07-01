import React, { useState } from 'react';

// 参数类型定义
interface Parameter {
  id: string;
  name: string;
  value: number | string | boolean;
  type: 'number' | 'string' | 'boolean' | 'select';
  options?: string[]; // 用于select类型
  unit?: string;      // 用于数值类型
  min?: number;       // 数值类型的最小值
  max?: number;       // 数值类型的最大值
}

// 参数组类型定义
interface ParameterGroup {
  id: string;
  name: string;
  parameters: Parameter[];
}

// 面板属性
interface ParametersPanelProps {
  onParameterChange: (paramId: string, value: any) => void;
}

const ParametersPanel: React.FC<ParametersPanelProps> = ({ onParameterChange }) => {
  // 示例参数组
  const [parameterGroups, setParameterGroups] = useState<ParameterGroup[]>([
    {
      id: 'geometry',
      name: '几何参数',
      parameters: [
        { id: 'width', name: '宽度', value: 10, type: 'number', unit: 'm', min: 0, max: 100 },
        { id: 'height', name: '高度', value: 5, type: 'number', unit: 'm', min: 0, max: 50 },
        { id: 'depth', name: '深度', value: 8, type: 'number', unit: 'm', min: 0, max: 100 },
        { id: 'shape', name: '形状', value: 'rectangular', type: 'select', options: ['rectangular', 'circular', 'irregular'] }
      ]
    },
    {
      id: 'material',
      name: '材料参数',
      parameters: [
        { id: 'density', name: '密度', value: 2500, type: 'number', unit: 'kg/m³', min: 1000, max: 5000 },
        { id: 'youngModulus', name: '弹性模量', value: 25, type: 'number', unit: 'GPa', min: 1, max: 100 },
        { id: 'poissonRatio', name: '泊松比', value: 0.25, type: 'number', min: 0, max: 0.5 },
        { id: 'isHomogeneous', name: '是否均质', value: true, type: 'boolean' }
      ]
    }
  ]);

  // 处理参数变化
  const handleParameterChange = (groupId: string, paramId: string, value: any) => {
    // 更新参数值
    const updatedGroups = parameterGroups.map(group => {
      if (group.id === groupId) {
        const updatedParams = group.parameters.map(param => {
          if (param.id === paramId) {
            return { ...param, value };
          }
          return param;
        });
        return { ...group, parameters: updatedParams };
      }
      return group;
    });

    setParameterGroups(updatedGroups);
    onParameterChange(paramId, value);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: '#2A2A42',
      borderRadius: '5px',
      width: '250px',
      maxHeight: 'calc(100% - 20px)',
      overflowY: 'auto',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 100
    }}>
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #444',
        fontWeight: 'bold',
        backgroundColor: '#1E1E32'
      }}>
        参数设置
      </div>

      {parameterGroups.map(group => (
        <div key={group.id} style={{ margin: '10px 0' }}>
          <div style={{ 
            padding: '5px 12px', 
            backgroundColor: '#1E1E32', 
            color: '#ccc',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            {group.name}
          </div>
          <div style={{ padding: '8px 12px' }}>
            {group.parameters.map(param => (
              <div key={param.id} style={{ marginBottom: '10px' }}>
                <label 
                  htmlFor={`param-${group.id}-${param.id}`}
                  style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    color: '#ccc',
                    fontSize: '0.85rem'
                  }}
                >
                  {param.name}{param.unit ? ` (${param.unit})` : ''}
                </label>
                
                {param.type === 'number' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id={`param-range-${group.id}-${param.id}`}
                      type="range"
                      min={param.min || 0}
                      max={param.max || 100}
                      step={(param.max && param.min && (param.max - param.min) > 100) ? 1 : 0.1}
                      value={param.value as number}
                      onChange={e => handleParameterChange(group.id, param.id, parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                      aria-labelledby={`param-${group.id}-${param.id}`}
                      title={`${param.name}滑块调整`}
                    />
                    <input
                      id={`param-${group.id}-${param.id}`}
                      type="number"
                      value={param.value as number}
                      onChange={e => handleParameterChange(group.id, param.id, parseFloat(e.target.value))}
                      style={{ 
                        width: '60px', 
                        backgroundColor: '#1A1A2E',
                        color: '#fff',
                        border: '1px solid #444',
                        borderRadius: '3px',
                        padding: '4px'
                      }}
                      title={`${param.name}数值输入`}
                      aria-label={`${param.name}数值输入`}
                    />
                  </div>
                )}
                
                {param.type === 'string' && (
                  <input
                    id={`param-${group.id}-${param.id}`}
                    type="text"
                    value={param.value as string}
                    onChange={e => handleParameterChange(group.id, param.id, e.target.value)}
                    style={{ 
                      width: '100%', 
                      backgroundColor: '#1A1A2E',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '3px',
                      padding: '5px'
                    }}
                    title={`${param.name}文本输入`}
                    aria-label={`${param.name}文本输入`}
                  />
                )}
                
                {param.type === 'boolean' && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      id={`param-${group.id}-${param.id}`}
                      type="checkbox"
                      checked={param.value as boolean}
                      onChange={e => handleParameterChange(group.id, param.id, e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    <label htmlFor={`param-${group.id}-${param.id}`} style={{ color: '#ddd' }}>
                      {(param.value as boolean) ? '是' : '否'}
                    </label>
                  </div>
                )}
                
                {param.type === 'select' && param.options && (
                  <select
                    id={`param-${group.id}-${param.id}`}
                    value={param.value as string}
                    onChange={e => handleParameterChange(group.id, param.id, e.target.value)}
                    style={{ 
                      width: '100%', 
                      backgroundColor: '#1A1A2E',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '3px',
                      padding: '5px'
                    }}
                    title={`${param.name}选择`}
                    aria-label={`${param.name}选择`}
                  >
                    {param.options.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ParametersPanel; 