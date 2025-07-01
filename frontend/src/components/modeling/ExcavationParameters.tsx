import React, { useState } from 'react';

// 土体参数接口
interface SoilParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
}

// 土层接口
interface SoilLayer {
  id: string;
  name: string;
  thickness: number;
  color: string;
  parameters: SoilParameter[];
}

// 支护结构接口
interface SupportStructure {
  id: string;
  type: string;
  parameters: Record<string, number | string>;
}

// 开挖阶段接口
interface ExcavationStage {
  id: string;
  name: string;
  depth: number;
  supports: string[]; // 支护结构ID列表
}

// 深基坑项目接口
interface ExcavationProject {
  name: string;
  width: number;
  length: number;
  maxDepth: number;
  soilLayers: SoilLayer[];
  supportStructures: SupportStructure[];
  excavationStages: ExcavationStage[];
  waterLevel: number;
}

interface ExcavationParametersProps {
  onParameterChange: (project: ExcavationProject) => void;
}

const ExcavationParameters: React.FC<ExcavationParametersProps> = ({ onParameterChange }) => {
  // 示例项目数据
  const [project, setProject] = useState<ExcavationProject>({
    name: '示例深基坑',
    width: 30,
    length: 40,
    maxDepth: 15,
    waterLevel: -5,
    soilLayers: [
      {
        id: 'layer1',
        name: '填土层',
        thickness: 2,
        color: '#A0522D',
        parameters: [
          { id: 'cohesion1', name: '黏聚力', value: 10, unit: 'kPa' },
          { id: 'phi1', name: '内摩擦角', value: 18, unit: '°' },
          { id: 'density1', name: '密度', value: 1800, unit: 'kg/m³' },
        ]
      },
      {
        id: 'layer2',
        name: '粘土层',
        thickness: 5,
        color: '#CD853F',
        parameters: [
          { id: 'cohesion2', name: '黏聚力', value: 25, unit: 'kPa' },
          { id: 'phi2', name: '内摩擦角', value: 22, unit: '°' },
          { id: 'density2', name: '密度', value: 1950, unit: 'kg/m³' },
        ]
      },
      {
        id: 'layer3',
        name: '砂质粘土',
        thickness: 8,
        color: '#D2B48C',
        parameters: [
          { id: 'cohesion3', name: '黏聚力', value: 15, unit: 'kPa' },
          { id: 'phi3', name: '内摩擦角', value: 28, unit: '°' },
          { id: 'density3', name: '密度', value: 2050, unit: 'kg/m³' },
        ]
      }
    ],
    supportStructures: [
      {
        id: 'wall1',
        type: 'diaphragm_wall',
        parameters: {
          thickness: 0.8,
          depth: 25,
          elasticModulus: 30,
          strength: 30
        }
      },
      {
        id: 'anchor1',
        type: 'anchor',
        parameters: {
          level: -4,
          length: 15,
          angle: 15,
          spacing: 3,
          preload: 200
        }
      }
    ],
    excavationStages: [
      {
        id: 'stage1',
        name: '第一阶段开挖',
        depth: 5,
        supports: []
      },
      {
        id: 'stage2',
        name: '安装第一道支撑',
        depth: 5,
        supports: ['anchor1']
      },
      {
        id: 'stage3',
        name: '第二阶段开挖',
        depth: 10,
        supports: ['anchor1']
      }
    ]
  });

  // 更新项目常规参数
  const updateProjectGeneral = (field: keyof ExcavationProject, value: any) => {
    setProject(prev => {
      const updated = { ...prev, [field]: value };
      onParameterChange(updated);
      return updated;
    });
  };

  // 更新土层参数
  const updateSoilLayer = (layerId: string, field: keyof SoilLayer, value: any) => {
    setProject(prev => {
      const updatedLayers = prev.soilLayers.map(layer => {
        if (layer.id === layerId) {
          return { ...layer, [field]: value };
        }
        return layer;
      });

      const updated = { ...prev, soilLayers: updatedLayers };
      onParameterChange(updated);
      return updated;
    });
  };

  // 更新土体参数
  const updateSoilParameter = (layerId: string, paramId: string, value: number) => {
    setProject(prev => {
      const updatedLayers = prev.soilLayers.map(layer => {
        if (layer.id === layerId) {
          const updatedParams = layer.parameters.map(param => {
            if (param.id === paramId) {
              return { ...param, value };
            }
            return param;
          });
          return { ...layer, parameters: updatedParams };
        }
        return layer;
      });

      const updated = { ...prev, soilLayers: updatedLayers };
      onParameterChange(updated);
      return updated;
    });
  };

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: '#2A2A42',
      borderRadius: '5px',
      width: '280px',
      maxHeight: 'calc(100% - 20px)',
      overflowY: 'auto',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 100
    }}>
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #444',
        fontWeight: 'bold',
        backgroundColor: '#1E1E32',
        color: '#fff'
      }}>
        深基坑工程参数
      </div>

      {/* 项目基本参数 */}
      <div style={{ margin: '10px 0' }}>
        <div style={{ 
          padding: '5px 12px', 
          backgroundColor: '#1E1E32', 
          color: '#ccc',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          基本参数
        </div>
        <div style={{ padding: '8px 12px' }}>
          {/* 项目名称 */}
          <div style={{ marginBottom: '10px' }}>
            <label
              htmlFor="project-name"
              style={{
                display: 'block',
                marginBottom: '5px',
                color: '#ccc',
                fontSize: '0.85rem'
              }}
            >
              项目名称
            </label>
            <input
              id="project-name"
              type="text"
              value={project.name}
              onChange={(e) => updateProjectGeneral('name', e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#1A1A2E',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '3px',
                padding: '5px'
              }}
            />
          </div>

          {/* 基坑尺寸 */}
          <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="project-width"
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: '#ccc',
                  fontSize: '0.85rem'
                }}
              >
                宽度 (m)
              </label>
              <input
                id="project-width"
                type="number"
                value={project.width}
                onChange={(e) => updateProjectGeneral('width', Number(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: '#1A1A2E',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '3px',
                  padding: '5px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="project-length"
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: '#ccc',
                  fontSize: '0.85rem'
                }}
              >
                长度 (m)
              </label>
              <input
                id="project-length"
                type="number"
                value={project.length}
                onChange={(e) => updateProjectGeneral('length', Number(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: '#1A1A2E',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '3px',
                  padding: '5px'
                }}
              />
            </div>
          </div>

          {/* 开挖深度和水位 */}
          <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="project-depth"
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: '#ccc',
                  fontSize: '0.85rem'
                }}
              >
                开挖深度 (m)
              </label>
              <input
                id="project-depth"
                type="number"
                value={project.maxDepth}
                onChange={(e) => updateProjectGeneral('maxDepth', Number(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: '#1A1A2E',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '3px',
                  padding: '5px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="water-level"
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: '#ccc',
                  fontSize: '0.85rem'
                }}
              >
                水位 (m)
              </label>
              <input
                id="water-level"
                type="number"
                value={project.waterLevel}
                onChange={(e) => updateProjectGeneral('waterLevel', Number(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: '#1A1A2E',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '3px',
                  padding: '5px'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 土层参数 */}
      <div style={{ margin: '10px 0' }}>
        <div style={{ 
          padding: '5px 12px', 
          backgroundColor: '#1E1E32', 
          color: '#ccc',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          土层参数
        </div>
        
        {project.soilLayers.map((layer, index) => (
          <div key={layer.id} style={{ 
            padding: '8px 12px',
            marginBottom: '5px',
            backgroundColor: index % 2 === 0 ? '#2A2A42' : '#232338'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '5px'
            }}>
              <label
                htmlFor={`layer-name-${layer.id}`}
                style={{
                  color: '#ccc',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                {`土层 ${index + 1}`}
              </label>
              <div 
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: layer.color,
                  border: '1px solid #666',
                  borderRadius: '2px'
                }}
              />
            </div>
            
            {/* 土层名称 */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor={`layer-name-${layer.id}`}
                style={{
                  display: 'block',
                  marginBottom: '3px',
                  color: '#ccc',
                  fontSize: '0.85rem'
                }}
              >
                名称
              </label>
              <input
                id={`layer-name-${layer.id}`}
                type="text"
                value={layer.name}
                onChange={(e) => updateSoilLayer(layer.id, 'name', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1A1A2E',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '3px',
                  padding: '5px',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            
            {/* 土层厚度 */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor={`layer-thickness-${layer.id}`}
                style={{
                  display: 'block',
                  marginBottom: '3px',
                  color: '#ccc',
                  fontSize: '0.85rem'
                }}
              >
                厚度 (m)
              </label>
              <input
                id={`layer-thickness-${layer.id}`}
                type="number"
                value={layer.thickness}
                onChange={(e) => updateSoilLayer(layer.id, 'thickness', Number(e.target.value))}
                style={{
                  width: '100%',
                  backgroundColor: '#1A1A2E',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '3px',
                  padding: '5px',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            
            {/* 土体参数 */}
            <div style={{ marginTop: '10px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: '#ccc',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}
              >
                物理参数
              </label>
              
              {layer.parameters.map(param => (
                <div key={param.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                  <label
                    htmlFor={`param-${param.id}`}
                    style={{
                      width: '80px',
                      color: '#ccc',
                      fontSize: '0.8rem'
                    }}
                  >
                    {`${param.name} (${param.unit})`}
                  </label>
                  <input
                    id={`param-${param.id}`}
                    type="number"
                    value={param.value}
                    onChange={(e) => updateSoilParameter(layer.id, param.id, Number(e.target.value))}
                    style={{
                      flex: 1,
                      backgroundColor: '#1A1A2E',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '3px',
                      padding: '3px 5px',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 支护结构 */}
      <div style={{ margin: '10px 0' }}>
        <div style={{ 
          padding: '5px 12px', 
          backgroundColor: '#1E1E32', 
          color: '#ccc',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          支护结构
        </div>
        <div style={{ padding: '8px 12px', textAlign: 'center' }}>
          <button
            style={{
              backgroundColor: '#4A90E2',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              padding: '8px 15px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
            onClick={() => console.log('添加支护结构')}
          >
            添加支护结构
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcavationParameters; 