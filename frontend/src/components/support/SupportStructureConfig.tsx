/**
 * 支护结构配置面板 - 2号几何专家开发
 * P1优先级任务 - 专业级基坑支护结构设计和配置
 * 基于1号架构师规划，集成3号专家的结构计算标准
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, Form, InputNumber, Select, Button, Space, Typography, 
  Row, Col, Table, Tag, Tooltip, Modal, Alert, Progress,
  Slider, Switch, Divider, Tabs, List, Timeline, Collapse,
  Popconfirm, message, Drawer, Radio, Checkbox, Upload
} from 'antd';
import { 
  SafetyCertificateOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, CalculatorOutlined, SettingOutlined, SaveOutlined,
  ThunderboltOutlined, BuildOutlined, EnvironmentOutlined,
  ExperimentOutlined, WarningOutlined, CheckCircleOutlined,
  LineChartOutlined, CopyOutlined, UploadOutlined, DownloadOutlined,
  AppstoreOutlined, BarsOutlined, DashboardOutlined
} from '@ant-design/icons';
import type { SupportStructure } from '../../types/GeologyDataTypes';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;

// 扩展的支护结构接口
interface EnhancedSupportStructure extends SupportStructure {
  designCode: string; // 设计规范
  loadCapacity: LoadCapacity;
  structuralAnalysis: StructuralAnalysis;
  constructionDetails: ConstructionDetails;
  qualityControl: QualityControl;
  monitoring: MonitoringPlan;
  costEstimate: CostEstimate;
  riskAssessment: RiskAssessment[];
  status: 'designed' | 'approved' | 'constructed' | 'monitored';
}

interface LoadCapacity {
  axialLoad: number;        // 轴向荷载 (kN)
  shearLoad: number;        // 剪切荷载 (kN)
  bendingMoment: number;    // 弯矩 (kN·m)
  lateralLoad: number;      // 侧向荷载 (kN/m)
  safetyFactor: number;     // 安全系数
  designLife: number;       // 设计使用年限
}

interface StructuralAnalysis {
  method: 'elastic' | 'plastic' | 'finite_element';
  displacement: {
    horizontal: number;     // 水平位移 (mm)
    vertical: number;       // 竖向位移 (mm)
    rotation: number;       // 转角 (rad)
  };
  stress: {
    maximum: number;        // 最大应力 (MPa)
    allowable: number;      // 允许应力 (MPa)
    utilization: number;    // 应力比
  };
  stability: {
    overturning: number;    // 抗倾覆安全系数
    sliding: number;        // 抗滑移安全系数
    bearing: number;        // 地基承载力安全系数
  };
}

interface ConstructionDetails {
  installationMethod: string;
  equipment: string[];
  personnel: number;
  duration: number; // 天数
  sequence: number;
  prerequisites: string[];
  qualityCheckpoints: string[];
  specialRequirements: string[];
}

interface QualityControl {
  materialTests: MaterialTest[];
  constructionChecks: ConstructionCheck[];
  performanceTests: PerformanceTest[];
  acceptance: AcceptanceCriteria;
}

interface MaterialTest {
  parameter: string;
  standard: string;
  frequency: string;
  tolerance: string;
}

interface ConstructionCheck {
  checkpoint: string;
  criteria: string;
  method: string;
  responsible: string;
}

interface PerformanceTest {
  testType: string;
  loading: number;
  duration: number;
  acceptance: string;
}

interface AcceptanceCriteria {
  geometryTolerance: number;
  strengthRequirement: number;
  deflectionLimit: number;
  visualInspection: string[];
}

interface MonitoringPlan {
  sensors: SensorConfig[];
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
  duration: number; // 监测期 (月)
  alertLevels: AlertLevel[];
  reportingSchedule: string;
}

interface SensorConfig {
  type: 'inclinometer' | 'strain_gauge' | 'displacement' | 'pressure' | 'settlement';
  location: { x: number; y: number; z: number };
  range: { min: number; max: number };
  accuracy: number;
  alertThreshold: number;
}

interface AlertLevel {
  level: 'green' | 'yellow' | 'orange' | 'red';
  threshold: number;
  action: string;
  responsible: string;
}

interface CostEstimate {
  material: number;
  labor: number;
  equipment: number;
  testing: number;
  monitoring: number;
  contingency: number;
  total: number;
  currency: string;
}

interface RiskAssessment {
  category: 'structural' | 'construction' | 'environmental' | 'schedule' | 'cost';
  description: string;
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'minor' | 'moderate' | 'major' | 'catastrophic';
  mitigation: string[];
  contingency: string;
  owner: string;
}

interface SupportStructureConfigProps {
  structures?: EnhancedSupportStructure[];
  onStructuresChange?: (structures: EnhancedSupportStructure[]) => void;
  onExport?: (structures: EnhancedSupportStructure[], format: 'dxf' | 'json' | 'report') => void;
  excavationGeometry?: any; // 基坑几何参数
  soilParameters?: any; // 土体参数
  readOnly?: boolean;
  showAdvancedAnalysis?: boolean;
}

const SupportStructureConfig: React.FC<SupportStructureConfigProps> = ({
  structures = [],
  onStructuresChange,
  onExport,
  excavationGeometry,
  soilParameters,
  readOnly = false,
  showAdvancedAnalysis = true
}) => {
  const [supportStructures, setSupportStructures] = useState<EnhancedSupportStructure[]>(structures);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'design' | 'analysis' | 'monitoring'>('overview');
  const [designWizardVisible, setDesignWizardVisible] = useState(false);
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);

  // 支护结构类型模板
  const structureTemplates = {
    retaining_wall: {
      name: '挡土墙',
      defaultProperties: {
        material: 'reinforced_concrete',
        diameter: 0,
        length: 0,
        capacity: 500
      },
      loadCapacity: {
        axialLoad: 1000,
        shearLoad: 300,
        bendingMoment: 800,
        lateralLoad: 50,
        safetyFactor: 2.0,
        designLife: 50
      }
    },
    anchor: {
      name: '锚杆',
      defaultProperties: {
        material: 'steel',
        diameter: 32,
        length: 12,
        capacity: 200
      },
      loadCapacity: {
        axialLoad: 200,
        shearLoad: 60,
        bendingMoment: 0,
        lateralLoad: 0,
        safetyFactor: 2.5,
        designLife: 20
      }
    },
    strut: {
      name: '支撑',
      defaultProperties: {
        material: 'steel',
        diameter: 500,
        length: 20,
        capacity: 800
      },
      loadCapacity: {
        axialLoad: 800,
        shearLoad: 200,
        bendingMoment: 400,
        lateralLoad: 100,
        safetyFactor: 2.2,
        designLife: 5
      }
    },
    pile: {
      name: '桩',
      defaultProperties: {
        material: 'reinforced_concrete',
        diameter: 600,
        length: 25,
        capacity: 1500
      },
      loadCapacity: {
        axialLoad: 1500,
        shearLoad: 400,
        bendingMoment: 1200,
        lateralLoad: 80,
        safetyFactor: 2.0,
        designLife: 50
      }
    }
  };

  // 创建新的支护结构
  const createNewStructure = (type: keyof typeof structureTemplates): EnhancedSupportStructure => {
    const template = structureTemplates[type];
    const id = `support_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      type,
      name: `${template.name}_${supportStructures.length + 1}`,
      position: {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: -5 }
      },
      properties: template.defaultProperties,
      installationStage: 1,
      designCode: 'GB50330-2013',
      loadCapacity: template.loadCapacity,
      structuralAnalysis: {
        method: 'elastic',
        displacement: { horizontal: 0, vertical: 0, rotation: 0 },
        stress: { maximum: 0, allowable: 0, utilization: 0 },
        stability: { overturning: 0, sliding: 0, bearing: 0 }
      },
      constructionDetails: {
        installationMethod: '预制安装',
        equipment: ['吊车', '钻机'],
        personnel: 8,
        duration: 3,
        sequence: supportStructures.length + 1,
        prerequisites: [],
        qualityCheckpoints: ['材料检验', '安装定位', '连接检查'],
        specialRequirements: []
      },
      qualityControl: {
        materialTests: [
          { parameter: '强度', standard: 'GB/T228', frequency: '每批', tolerance: '±5%' }
        ],
        constructionChecks: [
          { checkpoint: '定位', criteria: '±10mm', method: '测量', responsible: '质检员' }
        ],
        performanceTests: [
          { testType: '静载试验', loading: template.loadCapacity.axialLoad * 1.2, duration: 24, acceptance: '无异常变形' }
        ],
        acceptance: {
          geometryTolerance: 10,
          strengthRequirement: template.loadCapacity.axialLoad,
          deflectionLimit: 20,
          visualInspection: ['表面质量', '连接完整性']
        }
      },
      monitoring: {
        sensors: [
          {
            type: 'strain_gauge',
            location: { x: 5, y: 0, z: -2.5 },
            range: { min: -1000, max: 1000 },
            accuracy: 1,
            alertThreshold: 800
          }
        ],
        frequency: 'daily',
        duration: 12,
        alertLevels: [
          { level: 'green', threshold: 0.5, action: '正常监测', responsible: '监测员' },
          { level: 'yellow', threshold: 0.7, action: '加密监测', responsible: '技术员' },
          { level: 'orange', threshold: 0.85, action: '现场检查', responsible: '工程师' },
          { level: 'red', threshold: 1.0, action: '紧急处理', responsible: '项目经理' }
        ],
        reportingSchedule: '每日报告'
      },
      costEstimate: {
        material: 15000,
        labor: 8000,
        equipment: 5000,
        testing: 2000,
        monitoring: 3000,
        contingency: 3300,
        total: 36300,
        currency: 'CNY'
      },
      riskAssessment: [
        {
          category: 'structural',
          description: '支护结构承载力不足',
          probability: 'low',
          impact: 'major',
          mitigation: ['增加安全系数', '加强监测'],
          contingency: '应急加固方案',
          owner: '结构工程师'
        }
      ],
      status: 'designed'
    };
  };

  // 添加支护结构
  const addStructure = (type: keyof typeof structureTemplates) => {
    const newStructure = createNewStructure(type);
    const updatedStructures = [...supportStructures, newStructure];
    setSupportStructures(updatedStructures);
    
    if (onStructuresChange) {
      onStructuresChange(updatedStructures);
    }
    
    message.success(`已添加${structureTemplates[type].name}`);
    setDesignWizardVisible(false);
  };

  // 删除支护结构
  const removeStructure = (structureId: string) => {
    const updatedStructures = supportStructures.filter(s => s.id !== structureId);
    setSupportStructures(updatedStructures);
    
    if (onStructuresChange) {
      onStructuresChange(updatedStructures);
    }
    
    message.success('支护结构已删除');
  };

  // 更新结构参数
  const updateStructure = (structureId: string, path: string, value: any) => {
    const updatedStructures = supportStructures.map(structure => {
      if (structure.id === structureId) {
        const newStructure = { ...structure };
        const keys = path.split('.');
        let current: any = newStructure;
        
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        
        return newStructure;
      }
      return structure;
    });
    
    setSupportStructures(updatedStructures);
    
    if (onStructuresChange) {
      onStructuresChange(updatedStructures);
    }
  };

  // 运行结构分析
  const runStructuralAnalysis = async (structureId: string) => {
    setIsCalculating(true);
    setAnalysisModalVisible(true);
    setCalculationProgress(0);
    
    try {
      // 模拟计算过程
      for (let i = 0; i <= 100; i += 5) {
        setCalculationProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 模拟分析结果
      const mockAnalysis = {
        displacement: {
          horizontal: Math.random() * 15 + 5,
          vertical: Math.random() * 10 + 2,
          rotation: Math.random() * 0.01
        },
        stress: {
          maximum: Math.random() * 200 + 100,
          allowable: 300,
          utilization: 0
        },
        stability: {
          overturning: Math.random() * 0.5 + 2.0,
          sliding: Math.random() * 0.5 + 1.8,
          bearing: Math.random() * 0.5 + 2.2
        }
      };
      
      mockAnalysis.stress.utilization = mockAnalysis.stress.maximum / mockAnalysis.stress.allowable;
      
      // 更新分析结果
      updateStructure(structureId, 'structuralAnalysis.displacement', mockAnalysis.displacement);
      updateStructure(structureId, 'structuralAnalysis.stress', mockAnalysis.stress);
      updateStructure(structureId, 'structuralAnalysis.stability', mockAnalysis.stability);
      
      message.success('结构分析完成');
      
    } catch (error) {
      message.error('分析计算失败');
    } finally {
      setIsCalculating(false);
    }
  };

  // 计算总成本
  const totalCost = useMemo(() => {
    return supportStructures.reduce((sum, structure) => sum + structure.costEstimate.total, 0);
  }, [supportStructures]);

  // 表格列定义
  const structureTableColumns = [
    {
      title: '支护结构',
      key: 'structure',
      width: 200,
      render: (_: any, record: EnhancedSupportStructure) => (
        <Space direction="vertical" size={2}>
          <Space>
            <SafetyCertificateOutlined style={{ color: 'var(--primary-color)' }} />
            <Text strong>{record.name}</Text>
          </Space>
          <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {structureTemplates[record.type]?.name || record.type}
          </Text>
          <Tag 
            color={
              record.status === 'constructed' ? 'green' :
              record.status === 'approved' ? 'blue' :
              record.status === 'monitored' ? 'purple' : 'orange'
            }
            size="small"
          >
            {record.status === 'designed' ? '设计中' :
             record.status === 'approved' ? '已审核' :
             record.status === 'constructed' ? '已施工' : '监测中'}
          </Tag>
        </Space>
      )
    },
    {
      title: '基本参数',
      key: 'parameters',
      width: 200,
      render: (_: any, record: EnhancedSupportStructure) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '11px' }}>
            材料: {record.properties.material === 'reinforced_concrete' ? '钢筋混凝土' : 
                  record.properties.material === 'steel' ? '钢材' : record.properties.material}
          </Text>
          {record.properties.diameter > 0 && (
            <Text style={{ fontSize: '11px' }}>
              直径: {record.properties.diameter}mm
            </Text>
          )}
          {record.properties.length > 0 && (
            <Text style={{ fontSize: '11px' }}>
              长度: {record.properties.length}m
            </Text>
          )}
          <Text style={{ fontSize: '11px' }}>
            承载力: {record.properties.capacity}kN
          </Text>
        </Space>
      )
    },
    {
      title: '设计荷载',
      key: 'loads',
      width: 180,
      render: (_: any, record: EnhancedSupportStructure) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '11px' }}>
            轴力: {record.loadCapacity.axialLoad}kN
          </Text>
          <Text style={{ fontSize: '11px' }}>
            剪力: {record.loadCapacity.shearLoad}kN
          </Text>
          {record.loadCapacity.bendingMoment > 0 && (
            <Text style={{ fontSize: '11px' }}>
              弯矩: {record.loadCapacity.bendingMoment}kN·m
            </Text>
          )}
          <Text style={{ fontSize: '11px' }}>
            安全系数: {record.loadCapacity.safetyFactor}
          </Text>
        </Space>
      )
    },
    {
      title: '应力状态',
      key: 'stress',
      width: 120,
      render: (_: any, record: EnhancedSupportStructure) => {
        const utilization = record.structuralAnalysis.stress.utilization;
        const hasAnalysis = utilization > 0;
        
        return (
          <div style={{ textAlign: 'center' }}>
            {hasAnalysis ? (
              <Progress
                type="circle"
                percent={Math.round(utilization * 100)}
                size={50}
                status={utilization > 0.9 ? 'exception' : utilization > 0.7 ? 'active' : 'success'}
                format={(percent) => `${percent}%`}
              />
            ) : (
              <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                未分析
              </Text>
            )}
            {hasAnalysis && (
              <div style={{ marginTop: '4px' }}>
                <Text style={{ fontSize: '10px' }}>
                  {utilization > 0.9 ? '超载' : utilization > 0.7 ? '高载' : '正常'}
                </Text>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: '施工信息',
      key: 'construction',
      width: 150,
      render: (_: any, record: EnhancedSupportStructure) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '11px' }}>
            阶段: {record.installationStage}
          </Text>
          <Text style={{ fontSize: '11px' }}>
            工期: {record.constructionDetails.duration}天
          </Text>
          <Text style={{ fontSize: '11px' }}>
            人员: {record.constructionDetails.personnel}人
          </Text>
          <Text style={{ fontSize: '11px' }}>
            成本: ¥{(record.costEstimate.total / 10000).toFixed(1)}万
          </Text>
        </Space>
      )
    },
    {
      title: '监测状态',
      key: 'monitoring',
      width: 100,
      render: (_: any, record: EnhancedSupportStructure) => (
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size={2}>
            <Tag color="blue" size="small">
              {record.monitoring.sensors.length}个传感器
            </Tag>
            <Text style={{ fontSize: '10px' }}>
              {record.monitoring.frequency === 'continuous' ? '连续' :
               record.monitoring.frequency === 'daily' ? '每日' :
               record.monitoring.frequency === 'weekly' ? '每周' : '每月'}监测
            </Text>
            <Text style={{ fontSize: '10px' }}>
              {record.monitoring.duration}个月
            </Text>
          </Space>
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: EnhancedSupportStructure) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setSelectedStructure(record.id)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="结构分析">
            <Button
              type="link"
              size="small"
              icon={<CalculatorOutlined />}
              onClick={() => runStructuralAnalysis(record.id)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定删除此支护结构？"
              onConfirm={() => removeStructure(record.id)}
              disabled={readOnly}
            >
              <Button
                type="link"
                size="small"
                icon={<DeleteOutlined />}
                danger
                disabled={readOnly}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="support-structure-config">
      {/* 头部统计 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space>
              <SafetyCertificateOutlined style={{ color: 'var(--primary-color)' }} />
              <Title level={5} style={{ margin: 0 }}>支护结构配置</Title>
            </Space>
          </Col>
          <Col span={18}>
            <Row gutter={16}>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {supportStructures.length}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>支护结构</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {supportStructures.filter(s => s.status === 'constructed').length}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>已施工</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {(totalCost / 10000).toFixed(1)}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>总成本(万元)</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--info-color)' }}>
                    {supportStructures.reduce((sum, s) => sum + s.monitoring.sensors.length, 0)}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>监测点</Text></div>
                </div>
              </Col>
              <Col span={8}>
                <Space style={{ float: 'right' }}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setDesignWizardVisible(true)}
                    disabled={readOnly}
                  >
                    新增支护
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => onExport && onExport(supportStructures, 'json')}
                  >
                    导出配置
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab as any} size="small">
        {/* 概览 */}
        <TabPane tab="结构概览" key="overview">
          <Card size="small">
            <Table
              columns={structureTableColumns}
              dataSource={supportStructures}
              rowKey="id"
              size="small"
              scroll={{ x: 1200, y: 400 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个支护结构`
              }}
            />
          </Card>
        </TabPane>

        {/* 设计参数 */}
        <TabPane tab="设计参数" key="design">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="荷载设计" size="small" style={{ marginBottom: '16px' }}>
                <List
                  size="small"
                  dataSource={supportStructures}
                  renderItem={structure => (
                    <List.Item>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <Text strong>{structure.name}</Text>
                          <Tag color="blue">{structureTemplates[structure.type]?.name}</Tag>
                        </Space>
                        <Space>
                          <Text style={{ fontSize: '11px' }}>
                            轴力: {structure.loadCapacity.axialLoad}kN
                          </Text>
                          <Text style={{ fontSize: '11px' }}>
                            安全系数: {structure.loadCapacity.safetyFactor}
                          </Text>
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>

              <Card title="材料参数" size="small">
                <Collapse size="small">
                  {supportStructures.map(structure => (
                    <Panel 
                      key={structure.id}
                      header={
                        <Space>
                          <Text strong>{structure.name}</Text>
                          <Tag size="small">
                            {structure.properties.material === 'reinforced_concrete' ? '钢筋混凝土' : 
                             structure.properties.material === 'steel' ? '钢材' : structure.properties.material}
                          </Tag>
                        </Space>
                      }
                    >
                      <Row gutter={12}>
                        <Col span={8}>
                          <Text style={{ fontSize: '11px' }}>直径: {structure.properties.diameter}mm</Text>
                        </Col>
                        <Col span={8}>
                          <Text style={{ fontSize: '11px' }}>长度: {structure.properties.length}m</Text>
                        </Col>
                        <Col span={8}>
                          <Text style={{ fontSize: '11px' }}>承载力: {structure.properties.capacity}kN</Text>
                        </Col>
                      </Row>
                    </Panel>
                  ))}
                </Collapse>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="施工计划" size="small" style={{ marginBottom: '16px' }}>
                <Timeline
                  items={supportStructures
                    .sort((a, b) => a.installationStage - b.installationStage)
                    .map(structure => ({
                      children: (
                        <div>
                          <Space>
                            <Text strong>{structure.name}</Text>
                            <Tag color="blue">阶段 {structure.installationStage}</Tag>
                            <Tag color="green">{structure.constructionDetails.duration}天</Tag>
                          </Space>
                          <div style={{ marginTop: '4px' }}>
                            <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {structure.constructionDetails.installationMethod} | 
                              {structure.constructionDetails.personnel}人 | 
                              ¥{(structure.costEstimate.total / 10000).toFixed(1)}万
                            </Text>
                          </div>
                        </div>
                      ),
                      color: structure.status === 'constructed' ? 'green' : 'blue'
                    }))}
                />
              </Card>

              <Card title="成本分析" size="small">
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={100}
                        size={100}
                        format={() => `¥${(totalCost / 10000).toFixed(1)}万`}
                      />
                      <div style={{ marginTop: '8px' }}>
                        <Text style={{ fontSize: '12px' }}>总成本</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {supportStructures.length > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: '11px' }}>材料费用:</Text>
                            <Text style={{ fontSize: '11px' }}>
                              ¥{(supportStructures.reduce((sum, s) => sum + s.costEstimate.material, 0) / 10000).toFixed(1)}万
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: '11px' }}>人工费用:</Text>
                            <Text style={{ fontSize: '11px' }}>
                              ¥{(supportStructures.reduce((sum, s) => sum + s.costEstimate.labor, 0) / 10000).toFixed(1)}万
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: '11px' }}>设备费用:</Text>
                            <Text style={{ fontSize: '11px' }}>
                              ¥{(supportStructures.reduce((sum, s) => sum + s.costEstimate.equipment, 0) / 10000).toFixed(1)}万
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: '11px' }}>检测费用:</Text>
                            <Text style={{ fontSize: '11px' }}>
                              ¥{(supportStructures.reduce((sum, s) => sum + s.costEstimate.testing, 0) / 10000).toFixed(1)}万
                            </Text>
                          </div>
                        </>
                      )}
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 结构分析 */}
        <TabPane tab="结构分析" key="analysis">
          <Row gutter={16}>
            {supportStructures.map(structure => (
              <Col span={12} key={structure.id} style={{ marginBottom: '16px' }}>
                <Card 
                  title={
                    <Space>
                      <Text strong>{structure.name}</Text>
                      <Tag color="blue">{structureTemplates[structure.type]?.name}</Tag>
                    </Space>
                  }
                  size="small"
                  extra={
                    <Button
                      size="small"
                      icon={<CalculatorOutlined />}
                      onClick={() => runStructuralAnalysis(structure.id)}
                      disabled={readOnly}
                    >
                      重新分析
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ textAlign: 'center' }}>
                        <Progress
                          type="circle"
                          percent={Math.round(structure.structuralAnalysis.stress.utilization * 100)}
                          size={60}
                          status={
                            structure.structuralAnalysis.stress.utilization > 0.9 ? 'exception' :
                            structure.structuralAnalysis.stress.utilization > 0.7 ? 'active' : 'success'
                          }
                          format={(percent) => `${percent}%`}
                        />
                        <div style={{ marginTop: '4px' }}>
                          <Text style={{ fontSize: '10px' }}>应力比</Text>
                        </div>
                      </div>
                    </Col>
                    <Col span={16}>
                      <Space direction="vertical" style={{ width: '100%' }} size={2}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: '11px' }}>水平位移:</Text>
                          <Text style={{ fontSize: '11px' }}>
                            {structure.structuralAnalysis.displacement.horizontal.toFixed(1)}mm
                          </Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: '11px' }}>竖向位移:</Text>
                          <Text style={{ fontSize: '11px' }}>
                            {structure.structuralAnalysis.displacement.vertical.toFixed(1)}mm
                          </Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: '11px' }}>最大应力:</Text>
                          <Text style={{ fontSize: '11px' }}>
                            {structure.structuralAnalysis.stress.maximum.toFixed(1)}MPa
                          </Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: '11px' }}>抗倾覆:</Text>
                          <Text style={{ fontSize: '11px', color: structure.structuralAnalysis.stability.overturning >= 2.0 ? 'var(--success-color)' : 'var(--warning-color)' }}>
                            {structure.structuralAnalysis.stability.overturning.toFixed(2)}
                          </Text>
                        </div>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        {/* 监测管理 */}
        <TabPane tab="监测管理" key="monitoring">
          <Card title="监测配置" size="small">
            <List
              dataSource={supportStructures}
              renderItem={structure => (
                <List.Item>
                  <Card size="small" style={{ width: '100%' }}>
                    <Row>
                      <Col span={6}>
                        <Space direction="vertical" size={2}>
                          <Text strong>{structure.name}</Text>
                          <Tag color="blue">{structure.monitoring.sensors.length}个传感器</Tag>
                          <Text style={{ fontSize: '11px' }}>
                            监测期: {structure.monitoring.duration}个月
                          </Text>
                        </Space>
                      </Col>
                      <Col span={6}>
                        <Space direction="vertical" size={2}>
                          <Text style={{ fontSize: '11px' }}>监测频率:</Text>
                          <Tag color="green">
                            {structure.monitoring.frequency === 'continuous' ? '连续监测' :
                             structure.monitoring.frequency === 'daily' ? '每日监测' :
                             structure.monitoring.frequency === 'weekly' ? '每周监测' : '每月监测'}
                          </Tag>
                        </Space>
                      </Col>
                      <Col span={12}>
                        <Space direction="vertical" size={2}>
                          <Text style={{ fontSize: '11px' }}>预警级别设置:</Text>
                          <div>
                            {structure.monitoring.alertLevels.map(alert => (
                              <Tag 
                                key={alert.level}
                                color={
                                  alert.level === 'green' ? 'green' :
                                  alert.level === 'yellow' ? 'gold' :
                                  alert.level === 'orange' ? 'orange' : 'red'
                                }
                                size="small"
                                style={{ marginBottom: '2px' }}
                              >
                                {alert.level}: {(alert.threshold * 100).toFixed(0)}%
                              </Tag>
                            ))}
                          </div>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 设计向导模态框 */}
      <Modal
        title="新增支护结构"
        open={designWizardVisible}
        onCancel={() => setDesignWizardVisible(false)}
        footer={null}
        width={600}
      >
        <Row gutter={16}>
          {Object.entries(structureTemplates).map(([type, template]) => (
            <Col span={12} key={type} style={{ marginBottom: '16px' }}>
              <Card
                size="small"
                hoverable
                onClick={() => addStructure(type as keyof typeof structureTemplates)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <SafetyCertificateOutlined style={{ fontSize: '32px', color: 'var(--primary-color)', marginBottom: '8px' }} />
                  <div>
                    <Text strong>{template.name}</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        承载力: {template.loadCapacity.axialLoad}kN
                      </Text>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        安全系数: {template.loadCapacity.safetyFactor}
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      {/* 分析进度模态框 */}
      <Modal
        title="结构分析进行中"
        open={analysisModalVisible}
        onCancel={() => setAnalysisModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setAnalysisModalVisible(false)} disabled={isCalculating}>
            {isCalculating ? '分析中...' : '关闭'}
          </Button>
        ]}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Progress
            type="circle"
            percent={calculationProgress}
            size={120}
            format={(percent) => `${percent}%`}
          />
          <div style={{ marginTop: '16px' }}>
            <Text>
              {isCalculating ? '正在进行有限元分析...' : '分析完成'}
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SupportStructureConfig;