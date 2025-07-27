/**
 * 多层锚杆支护系统组件 - 基于2号专家技术文档
 * 实现智能自动布置、预应力分析等先进功能
 * 0号架构师 - 集成2号专家多层锚杆支护系统技术
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Card, Row, Col, Button, Space, Typography, Form, 
  InputNumber, Select, Switch, Alert, Steps,
  Table, Descriptions, Progress, Modal, Spin,
  Tabs, Collapse, Tooltip, Badge, Divider
} from 'antd';
import { 
  PlusOutlined, SettingOutlined, ThunderboltOutlined,
  SafetyOutlined, ExperimentOutlined, EyeOutlined,
  DeleteOutlined, CopyOutlined, PlayCircleOutlined,
  StopOutlined, CheckCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;
const { Step } = Steps;

// ==================== 接口定义 ====================

// 锚杆类型枚举
export enum AnchorType {
  SOIL_ANCHOR = 'soil_anchor',           // 土层锚杆
  ROCK_ANCHOR = 'rock_anchor',           // 岩石锚杆
  PRESTRESSED_ANCHOR = 'prestressed_anchor', // 预应力锚杆
  COMPOSITE_ANCHOR = 'composite_anchor'   // 复合锚杆
}

// 锚固机理枚举
export enum AnchorageMechanism {
  FRICTION_TYPE = 'friction_type',       // 摩擦型锚固
  EXPANSION_TYPE = 'expansion_type',     // 扩张型锚固
  CHEMICAL_TYPE = 'chemical_type',       // 化学锚固
  MECHANICAL_TYPE = 'mechanical_type'    // 机械锚固
}

// 预应力状态枚举
export enum PrestressState {
  PASSIVE_ANCHOR = 'passive_anchor',     // 被动锚杆
  ACTIVE_ANCHOR = 'active_anchor',       // 主动锚杆
  SEMI_ACTIVE_ANCHOR = 'semi_active_anchor' // 半主动锚杆
}

// 单层锚杆配置接口
interface AnchorLayer {
  // 层级信息
  layerId: string;
  layerIndex: number;          // 层序号 (从上到下)
  layerName: string;           // 层名称
  elevationRange: {
    topElevation: number;      // 顶部标高
    bottomElevation: number;   // 底部标高
    centerElevation: number;   // 中心标高
  };
  
  // 锚杆几何参数
  geometry: {
    totalLength: number;       // 锚杆总长度 (m)
    freeLength: number;        // 自由段长度 (m)
    anchorageLength: number;   // 锚固段长度 (m)
    inclination: number;       // 倾斜角度 (度, 与水平面夹角)
    azimuth?: number;          // 方位角 (度, 可选)
    diameter: number;          // 锚杆直径 (mm)
  };
  
  // 材料参数
  materials: {
    tendonType: 'steel_strand' | 'steel_bar' | 'fiber_composite';
    tendonDiameter: number;    // 拉索直径 (mm)
    tendonQuantity: number;    // 拉索根数
    groutStrength: number;     // 注浆强度 (MPa)
    corrosionProtection: 'basic' | 'enhanced' | 'severe_environment';
  };
  
  // 预应力参数
  prestress: {
    designTension: number;     // 设计拉力 (kN)
    lockOffLoad: number;       // 锁定荷载 (kN)
    tensioningMethod: 'single_stage' | 'multi_stage';
    tensioningSequence: number[]; // 张拉程序
    longTermLoss: number;      // 长期损失系数
  };
  
  // 布置参数
  layout: {
    horizontalSpacing: number; // 水平间距 (m)
    verticalSpacing: number;   // 垂直间距 (m)
    edgeDistance: number;      // 边距 (m)
    staggeredArrangement: boolean; // 是否交错布置
    minimumClearance: number;  // 最小净距 (m)
  };
  
  // 锚固参数
  anchorage: {
    anchorageType: AnchorageMechanism;
    groutPressure: number;     // 注浆压力 (MPa)
    groutTakeVolume: number;   // 注浆量 (L/m)
    anchorageBondStrength: number; // 锚固段粘结强度 (MPa)
    pulloutResistance: number; // 抗拔阻力 (kN)
  };
  
  // 质量控制参数
  qualityControl: {
    acceptanceTestLoad: number; // 验收试验荷载
    creepTestLoad: number;     // 蠕变试验荷载
    testingPercentage: number; // 检测比例 (%)
    qualityGrade: 'A' | 'B' | 'C'; // 质量等级
  };
}

// 自动布置配置接口
interface AutoLayoutConfiguration {
  // 基础布置策略
  layoutStrategy: {
    pattern: 'regular_grid' | 'staggered_grid' | 'adaptive_density';
    optimization: 'uniform_stress' | 'minimum_quantity' | 'construction_efficiency';
    boundary_treatment: 'uniform' | 'reinforced' | 'tapered';
  };
  
  // 间距控制
  spacingControl: {
    baseHorizontalSpacing: number;  // 基准水平间距
    baseVerticalSpacing: number;    // 基准垂直间距
    spacingTolerance: number;       // 间距容差 (±)
    adaptiveSpacing: boolean;       // 自适应间距
    minSpacing: number;             // 最小间距
    maxSpacing: number;             // 最大间距
  };
}

// 锚杆布置结果接口
interface AnchorLayoutResult {
  systemId: string;
  totalAnchorCount: number;
  totalLength: number;
  layoutQuality: number;
  
  layers: {
    layerId: string;
    layerName: string;
    layerIndex: number;
    anchorCount: number;
    averageSpacing: number;
    totalTension: number;
    anchorInstances: AnchorInstance[];
  }[];
  
  analysisResults?: {
    overallStability: number;
    maxDeformation: number;
    constructionSequence: ConstructionStep[];
  };
}

// 锚杆实例接口
interface AnchorInstance {
  instanceId: string;
  layerId: string;
  geometry: any;
  mechanics: any;
  materials: any;
  construction: any;
  coordinates: any;
}

interface MultiLayerAnchorSystemProps {
  excavationGeometry?: any;
  soilProfile?: any;
  onConfigurationChange?: (config: any) => void;
  onLayoutComplete?: (result: AnchorLayoutResult) => void;
  style?: React.CSSProperties;
}

// ==================== 模拟服务类 ====================

class MultiLayerAnchorAutoLayout {
  async generateAnchorLayout(
    anchorLayers: AnchorLayer[],
    excavationGeometry: any,
    layoutConfig: AutoLayoutConfiguration
  ): Promise<AnchorLayoutResult> {
    
    console.log('🔄 开始多层锚杆自动布置计算');
    
    // 模拟计算延时
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 生成模拟结果
    const layers = anchorLayers.map((layer, index) => ({
      layerId: layer.layerId,
      layerName: layer.layerName,
      layerIndex: layer.layerIndex,
      anchorCount: Math.floor(20 + Math.random() * 10), // 20-30根锚杆
      averageSpacing: layer.layout.horizontalSpacing + (Math.random() - 0.5) * 0.2,
      totalTension: layer.prestress.designTension * (20 + Math.random() * 10),
      anchorInstances: [] // 简化，实际应包含详细锚杆实例
    }));
    
    const totalAnchorCount = layers.reduce((sum, layer) => sum + layer.anchorCount, 0);
    const totalLength = layers.reduce((sum, layer) => sum + layer.anchorCount * anchorLayers[layer.layerIndex].geometry.totalLength, 0);
    
    return {
      systemId: `anchor_system_${Date.now()}`,
      totalAnchorCount,
      totalLength,
      layoutQuality: 0.85 + Math.random() * 0.15, // 85-100%
      layers,
      analysisResults: {
        overallStability: 1.8 + Math.random() * 0.4, // 1.8-2.2
        maxDeformation: 15 + Math.random() * 10, // 15-25mm
        constructionSequence: []
      }
    };
  }
}

// ==================== 主组件 ====================

const MultiLayerAnchorSystem: React.FC<MultiLayerAnchorSystemProps> = ({
  excavationGeometry,
  soilProfile,
  onConfigurationChange,
  onLayoutComplete,
  style
}) => {
  // 状态管理
  const [anchorLayers, setAnchorLayers] = useState<AnchorLayer[]>([]);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [autoLayoutConfig, setAutoLayoutConfig] = useState<AutoLayoutConfiguration>({
    layoutStrategy: {
      pattern: 'regular_grid',
      optimization: 'uniform_stress',
      boundary_treatment: 'uniform'
    },
    spacingControl: {
      baseHorizontalSpacing: 2.0,
      baseVerticalSpacing: 0.5,
      spacingTolerance: 0.1,
      adaptiveSpacing: true,
      minSpacing: 1.5,
      maxSpacing: 3.0
    }
  });
  
  const [layoutResult, setLayoutResult] = useState<AnchorLayoutResult | null>(null);
  const [layoutProgress, setLayoutProgress] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // 服务引用
  const layoutEngineRef = useRef<MultiLayerAnchorAutoLayout | null>(null);

  // 初始化布置引擎
  useEffect(() => {
    layoutEngineRef.current = new MultiLayerAnchorAutoLayout();
  }, []);

  // ==================== 事件处理函数 ====================

  // 添加新锚杆层
  const addAnchorLayer = useCallback(() => {
    const newLayer: AnchorLayer = {
      layerId: `layer_${anchorLayers.length + 1}`,
      layerIndex: anchorLayers.length,
      layerName: `第${anchorLayers.length + 1}层锚杆`,
      elevationRange: {
        topElevation: -3 - anchorLayers.length * 3,
        bottomElevation: -6 - anchorLayers.length * 3,
        centerElevation: -4.5 - anchorLayers.length * 3
      },
      
      // 默认几何参数
      geometry: {
        totalLength: 25,           // 总长25m
        freeLength: 15,            // 自由段15m
        anchorageLength: 10,       // 锚固段10m
        inclination: 15,           // 下倾15°
        diameter: 150              // 钻孔直径150mm
      },
      
      // 默认材料参数
      materials: {
        tendonType: 'steel_strand',
        tendonDiameter: 15.2,      // 钢绞线直径15.2mm
        tendonQuantity: 4,         // 4根钢绞线
        groutStrength: 30,         // 注浆强度C30
        corrosionProtection: 'enhanced'
      },
      
      // 默认预应力参数
      prestress: {
        designTension: 200,        // 设计拉力200kN
        lockOffLoad: 220,          // 锁定荷载220kN
        tensioningMethod: 'single_stage',
        tensioningSequence: [0, 0.5, 1.0], // 张拉程序
        longTermLoss: 0.15         // 长期损失15%
      },
      
      // 默认布置参数
      layout: {
        horizontalSpacing: 2.0,    // 水平间距2.0m
        verticalSpacing: 0.5,      // 垂直间距0.5m
        edgeDistance: 1.0,         // 边距1.0m
        staggeredArrangement: false,
        minimumClearance: 0.3      // 最小净距0.3m
      },
      
      // 默认锚固参数
      anchorage: {
        anchorageType: AnchorageMechanism.FRICTION_TYPE,
        groutPressure: 0.5,        // 注浆压力0.5MPa
        groutTakeVolume: 100,      // 注浆量100L/m
        anchorageBondStrength: 1.5, // 粘结强度1.5MPa
        pulloutResistance: 400     // 抗拔阻力400kN
      },
      
      // 质量控制参数
      qualityControl: {
        acceptanceTestLoad: 400,   // 验收试验荷载400kN
        creepTestLoad: 220,        // 蠕变试验荷载220kN
        testingPercentage: 100,    // 检测比例100%
        qualityGrade: 'A'          // 质量等级A级
      }
    };
    
    setAnchorLayers([...anchorLayers, newLayer]);
    setActiveLayerIndex(anchorLayers.length);
  }, [anchorLayers]);

  // 删除锚杆层
  const removeAnchorLayer = useCallback((index: number) => {
    const newLayers = anchorLayers.filter((_, i) => i !== index);
    setAnchorLayers(newLayers);
    if (activeLayerIndex >= newLayers.length) {
      setActiveLayerIndex(Math.max(0, newLayers.length - 1));
    }
  }, [anchorLayers, activeLayerIndex]);

  // 复制锚杆层
  const duplicateAnchorLayer = useCallback((index: number) => {
    const layerToCopy = anchorLayers[index];
    const newLayer: AnchorLayer = {
      ...layerToCopy,
      layerId: `layer_${anchorLayers.length + 1}`,
      layerIndex: anchorLayers.length,
      layerName: `${layerToCopy.layerName}_副本`,
      elevationRange: {
        ...layerToCopy.elevationRange,
        topElevation: layerToCopy.elevationRange.topElevation - 3,
        bottomElevation: layerToCopy.elevationRange.bottomElevation - 3,
        centerElevation: layerToCopy.elevationRange.centerElevation - 3
      }
    };
    
    setAnchorLayers([...anchorLayers, newLayer]);
  }, [anchorLayers]);

  // 更新锚杆层
  const updateAnchorLayer = useCallback((index: number, updatedLayer: AnchorLayer) => {
    const newLayers = [...anchorLayers];
    newLayers[index] = updatedLayer;
    setAnchorLayers(newLayers);
    
    // 通知上层组件配置变化
    onConfigurationChange?.({
      anchorLayers: newLayers,
      layoutResult
    });
  }, [anchorLayers, layoutResult, onConfigurationChange]);

  // 执行自动布置
  const performAutoLayout = useCallback(async () => {
    if (anchorLayers.length === 0) {
      message.error('请先添加锚杆层配置');
      return;
    }
    
    setIsCalculating(true);
    setLayoutProgress(0);
    setCurrentStep(0);
    
    try {
      const layoutEngine = layoutEngineRef.current!;
      
      // 模拟计算步骤
      const steps = [
        { name: '几何分析', duration: 500 },
        { name: '土压力计算', duration: 800 },
        { name: '分层布置生成', duration: 1000 },
        { name: '整体协调优化', duration: 700 },
        { name: '冲突检测解决', duration: 600 },
        { name: '施工可行性验证', duration: 400 }
      ];
      
      let totalProgress = 0;
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, steps[i].duration));
        totalProgress += 100 / steps.length;
        setLayoutProgress(Math.round(totalProgress));
      }
      
      const result = await layoutEngine.generateAnchorLayout(
        anchorLayers,
        excavationGeometry || {},
        autoLayoutConfig
      );
      
      setLayoutResult(result);
      setCurrentStep(steps.length);
      
      // 通知上层组件
      onLayoutComplete?.(result);
      onConfigurationChange?.({
        anchorLayers,
        layoutResult: result
      });
      
      message.success('多层锚杆自动布置完成！');
      
    } catch (error) {
      console.error('自动布置失败:', error);
      message.error('锚杆自动布置失败，请检查参数设置');
    } finally {
      setIsCalculating(false);
    }
  }, [anchorLayers, excavationGeometry, autoLayoutConfig, onLayoutComplete, onConfigurationChange]);

  // ==================== 渲染函数 ====================

  // 渲染锚杆层项目
  const renderLayerItem = (layer: AnchorLayer, index: number) => (
    <motion.div
      key={layer.layerId}
      className={`layer-item ${activeLayerIndex === index ? 'active' : ''}`}
      style={{
        padding: '12px',
        margin: '8px 0',
        borderRadius: '8px',
        border: `2px solid ${activeLayerIndex === index ? '#00d9ff' : '#404040'}`,
        background: activeLayerIndex === index ? 'rgba(0, 217, 255, 0.1)' : '#2d2d2d',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onClick={() => setActiveLayerIndex(index)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <Badge 
              count={index + 1} 
              style={{ backgroundColor: '#00d9ff', marginRight: '8px' }}
            />
            <Text strong style={{ color: '#ffffff' }}>{layer.layerName}</Text>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <Text style={{ color: '#a0a0a0', fontSize: '12px' }}>
              标高: {layer.elevationRange.centerElevation}m
            </Text>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ color: '#a0a0a0', fontSize: '12px' }}>
              长度: {layer.geometry.totalLength}m
            </span>
            <span style={{ color: '#a0a0a0', fontSize: '12px' }}>
              间距: {layer.layout.horizontalSpacing}m
            </span>
            <span style={{ color: '#a0a0a0', fontSize: '12px' }}>
              拉力: {layer.prestress.designTension}kN
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <Tooltip title="复制层">
            <Button
              size="small"
              type="text"
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                duplicateAnchorLayer(index);
              }}
            />
          </Tooltip>
          
          <Tooltip title="删除层">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                removeAnchorLayer(index);
              }}
            />
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );

  // 渲染层配置表单
  const renderLayerConfiguration = () => {
    if (anchorLayers.length === 0 || activeLayerIndex >= anchorLayers.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text style={{ color: '#999' }}>请先添加锚杆层</Text>
        </div>
      );
    }

    const activeLayer = anchorLayers[activeLayerIndex];

    return (
      <Tabs defaultActiveKey="geometry">
        <TabPane tab="几何参数" key="geometry">
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="锚杆总长度 (m)">
                  <InputNumber
                    value={activeLayer.geometry.totalLength}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        geometry: { ...activeLayer.geometry, totalLength: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={10}
                    max={50}
                    step={0.5}
                  />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item label="自由段长度 (m)">
                  <InputNumber
                    value={activeLayer.geometry.freeLength}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        geometry: { ...activeLayer.geometry, freeLength: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={5}
                    max={30}
                    step={0.5}
                  />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item label="锚固段长度 (m)">
                  <InputNumber
                    value={activeLayer.geometry.anchorageLength}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        geometry: { ...activeLayer.geometry, anchorageLength: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={3}
                    max={20}
                    step={0.5}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="倾斜角度 (度)">
                  <InputNumber
                    value={activeLayer.geometry.inclination}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        geometry: { ...activeLayer.geometry, inclination: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={5}
                    max={45}
                    step={1}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item label="钻孔直径 (mm)">
                  <InputNumber
                    value={activeLayer.geometry.diameter}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        geometry: { ...activeLayer.geometry, diameter: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={100}
                    max={200}
                    step={10}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </TabPane>

        <TabPane tab="预应力参数" key="prestress">
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="设计拉力 (kN)">
                  <InputNumber
                    value={activeLayer.prestress.designTension}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        prestress: { ...activeLayer.prestress, designTension: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={100}
                    max={500}
                    step={10}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item label="锁定荷载 (kN)">
                  <InputNumber
                    value={activeLayer.prestress.lockOffLoad}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        prestress: { ...activeLayer.prestress, lockOffLoad: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={100}
                    max={600}
                    step={10}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="张拉方式">
                  <Select
                    value={activeLayer.prestress.tensioningMethod}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        prestress: { ...activeLayer.prestress, tensioningMethod: value }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                  >
                    <Option value="single_stage">一次张拉</Option>
                    <Option value="multi_stage">分级张拉</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item label="长期损失系数">
                  <InputNumber
                    value={activeLayer.prestress.longTermLoss}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        prestress: { ...activeLayer.prestress, longTermLoss: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={0.1}
                    max={0.3}
                    step={0.01}
                    formatter={(value) => `${(value * 100).toFixed(0)}%`}
                    parser={(value) => (parseFloat(value?.replace('%', '') || '0') / 100)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </TabPane>

        <TabPane tab="布置参数" key="layout">
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="水平间距 (m)">
                  <InputNumber
                    value={activeLayer.layout.horizontalSpacing}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        layout: { ...activeLayer.layout, horizontalSpacing: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={1.0}
                    max={4.0}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item label="垂直间距 (m)">
                  <InputNumber
                    value={activeLayer.layout.verticalSpacing}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        layout: { ...activeLayer.layout, verticalSpacing: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={0.3}
                    max={1.0}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item label="边距 (m)">
                  <InputNumber
                    value={activeLayer.layout.edgeDistance}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        layout: { ...activeLayer.layout, edgeDistance: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="交错布置">
                  <Switch
                    checked={activeLayer.layout.staggeredArrangement}
                    onChange={(checked) => {
                      const updatedLayer = {
                        ...activeLayer,
                        layout: { ...activeLayer.layout, staggeredArrangement: checked }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item label="最小净距 (m)">
                  <InputNumber
                    value={activeLayer.layout.minimumClearance}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        layout: { ...activeLayer.layout, minimumClearance: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={0.2}
                    max={0.5}
                    step={0.05}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </TabPane>

        <TabPane tab="材料锚固" key="materials">
          <Form layout="vertical" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="拉索类型">
                  <Select
                    value={activeLayer.materials.tendonType}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        materials: { ...activeLayer.materials, tendonType: value }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                  >
                    <Option value="steel_strand">钢绞线</Option>
                    <Option value="steel_bar">钢筋</Option>
                    <Option value="fiber_composite">纤维复合材料</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item label="拉索直径 (mm)">
                  <InputNumber
                    value={activeLayer.materials.tendonDiameter}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        materials: { ...activeLayer.materials, tendonDiameter: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={12}
                    max={20}
                    step={0.1}
                  />
                </Form.Item>
              </Col>
              
              <Col span={8}>
                <Form.Item label="拉索根数">
                  <InputNumber
                    value={activeLayer.materials.tendonQuantity}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        materials: { ...activeLayer.materials, tendonQuantity: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={2}
                    max={8}
                    step={1}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="注浆强度 (MPa)">
                  <InputNumber
                    value={activeLayer.materials.groutStrength}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        materials: { ...activeLayer.materials, groutStrength: value || 0 }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                    min={25}
                    max={40}
                    step={5}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item label="防腐等级">
                  <Select
                    value={activeLayer.materials.corrosionProtection}
                    onChange={(value) => {
                      const updatedLayer = {
                        ...activeLayer,
                        materials: { ...activeLayer.materials, corrosionProtection: value }
                      };
                      updateAnchorLayer(activeLayerIndex, updatedLayer);
                    }}
                  >
                    <Option value="basic">基本防腐</Option>
                    <Option value="enhanced">增强防腐</Option>
                    <Option value="severe_environment">严酷环境防腐</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </TabPane>
      </Tabs>    
    );
  };

  return (
    <div className="multi-layer-anchor-system" style={style}>
      {/* 系统标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={4} style={{ 
          color: '#ffffff',
          margin: 0,
          display: 'flex',
          alignItems: 'center'
        }}>
          <ThunderboltOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
          多层锚杆支护系统
        </Title>
        <Text style={{ color: '#a0a0a0' }}>
          智能自动布置 · 预应力分析 · 质量控制
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        {/* 左侧：锚杆层管理 */}
        <Col xs={24} lg={8}>
          <Card 
            title="锚杆层配置" 
            size="small"
            extra={
              <Button 
                type="primary" 
                size="small"
                icon={<PlusOutlined />}
                onClick={addAnchorLayer}
              >
                添加层
              </Button>
            }
            style={{ 
              background: '#1f1f1f',
              border: '1px solid #404040'
            }}
          >
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <AnimatePresence>
                {anchorLayers.map((layer, index) => (
                  <motion.div
                    key={layer.layerId}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {renderLayerItem(layer, index)}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {anchorLayers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <ThunderboltOutlined style={{ 
                    fontSize: '48px', 
                    color: '#404040', 
                    marginBottom: '16px' 
                  }} />
                  <Text style={{ color: '#666' }}>暂无锚杆层配置</Text>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 右侧：详细配置和结果 */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 层详细配置 */}
            <Card 
              title={anchorLayers.length > 0 ? `${anchorLayers[activeLayerIndex]?.layerName} - 详细配置` : '层配置详情'}
              size="small"
              style={{ 
                background: '#1f1f1f',
                border: '1px solid #404040'
              }}
            >
              {renderLayerConfiguration()}
            </Card>

            {/* 自动布置控制 */}
            <Card 
              title="自动布置配置" 
              size="small"
              style={{ 
                background: '#1f1f1f',
                border: '1px solid #404040'
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text style={{ color: '#a0a0a0', marginBottom: '8px', display: 'block' }}>
                      布置策略
                    </Text>
                    <Select 
                      value={autoLayoutConfig.layoutStrategy.pattern}
                      onChange={(value) => setAutoLayoutConfig(prev => ({
                        ...prev,
                        layoutStrategy: { ...prev.layoutStrategy, pattern: value }
                      }))}
                      style={{ width: '100%' }}
                    >
                      <Option value="regular_grid">规则网格</Option>
                      <Option value="staggered_grid">交错网格</Option>
                      <Option value="adaptive_density">自适应密度</Option>
                    </Select>
                  </div>
                </Col>
                
                <Col span={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text style={{ color: '#a0a0a0', marginBottom: '8px', display: 'block' }}>
                      优化目标
                    </Text>
                    <Select 
                      value={autoLayoutConfig.layoutStrategy.optimization}
                      onChange={(value) => setAutoLayoutConfig(prev => ({
                        ...prev,
                        layoutStrategy: { ...prev.layoutStrategy, optimization: value }
                      }))}
                      style={{ width: '100%' }}
                    >
                      <Option value="uniform_stress">应力均匀</Option>
                      <Option value="minimum_quantity">用量最少</Option>
                      <Option value="construction_efficiency">施工高效</Option>
                    </Select>
                  </div>
                </Col>
                
                <Col span={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text style={{ color: '#a0a0a0', marginBottom: '8px', display: 'block' }}>
                      执行布置
                    </Text>
                    <Button 
                      type="primary" 
                      block
                      size="large"
                      icon={isCalculating ? <StopOutlined /> : <PlayCircleOutlined />}
                      onClick={performAutoLayout}
                      disabled={anchorLayers.length === 0}
                      loading={isCalculating}
                    >
                      {isCalculating ? '计算中...' : '自动布置'}
                    </Button>
                  </div>
                </Col>
              </Row>
              
              {/* 计算进度 */}
              <AnimatePresence>
                {isCalculating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: '16px' }}
                  >
                    <Alert
                      message="正在执行多层锚杆自动布置计算"
                      description={
                        <div>
                          <Progress 
                            percent={layoutProgress} 
                            status="active"
                            strokeColor={{
                              '0%': '#108ee9',
                              '100%': '#87d068',
                            }}
                            style={{ marginBottom: '12px' }}
                          />
                          
                          <Steps 
                            size="small" 
                            current={currentStep}
                            items={[
                              { title: '几何分析' },
                              { title: '土压力计算' },
                              { title: '分层布置' },
                              { title: '整体优化' },
                              { title: '冲突检测' },
                              { title: '可行性验证' }
                            ]}
                          />
                        </div>
                      }
                      type="info"
                      showIcon
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* 布置结果显示 */}
            {layoutResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card 
                  title="布置结果" 
                  size="small"
                  extra={
                    <Space>
                      <Badge 
                        status="success" 
                        text={`质量评分: ${(layoutResult.layoutQuality * 100).toFixed(1)}%`} 
                      />
                      <Button size="small" icon={<EyeOutlined />}>
                        3D预览
                      </Button>
                    </Space>
                  }
                  style={{ 
                    background: '#1f1f1f',
                    border: '1px solid #404040'
                  }}
                >
                  <Row gutter={16} style={{ marginBottom: '16px' }}>
                    <Col span={8}>
                      <Statistic
                        title="总锚杆数量"
                        value={layoutResult.totalAnchorCount}
                        suffix="根"
                        valueStyle={{ color: '#00d9ff' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="总锚杆长度"
                        value={layoutResult.totalLength}
                        suffix="m"
                        precision={1}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="整体稳定性"
                        value={layoutResult.analysisResults?.overallStability}
                        precision={2}
                        valueStyle={{ 
                          color: layoutResult.analysisResults?.overallStability! >= 2.0 ? '#52c41a' : '#faad14'
                        }}
                      />
                    </Col>
                  </Row>
                  
                  {/* 分层统计表格 */}
                  <Table 
                    dataSource={layoutResult.layers}
                    columns={[
                      { 
                        title: '层号', 
                        dataIndex: 'layerIndex', 
                        key: 'layerIndex',
                        width: 60,
                        render: (val) => <Badge count={val + 1} style={{ backgroundColor: '#00d9ff' }} />
                      },
                      { title: '层名称', dataIndex: 'layerName', key: 'layerName' },
                      { 
                        title: '锚杆数量', 
                        dataIndex: 'anchorCount', 
                        key: 'anchorCount',
                        render: (val) => `${val}根`
                      },
                      { 
                        title: '平均间距', 
                        dataIndex: 'averageSpacing', 
                        key: 'averageSpacing', 
                        render: (val) => `${val.toFixed(2)}m`
                      },
                      { 
                        title: '总拉力', 
                        dataIndex: 'totalTension', 
                        key: 'totalTension', 
                        render: (val) => `${(val / 1000).toFixed(1)}MN`
                      }
                    ]}
                    pagination={false}
                    size="small"
                    style={{ marginTop: '16px' }}
                  />
                </Card>
              </motion.div>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default MultiLayerAnchorSystem;