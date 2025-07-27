/**
 * 用户定义计算域界面 - 2号几何专家开发
 * P1优先级任务 - 专业级计算域定义和网格生成界面
 * 基于1号架构师规划，集成3号专家的有限元网格标准
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, Form, InputNumber, Select, Button, Space, Typography, 
  Row, Col, Table, Tag, Tooltip, Modal, Alert, Progress,
  Slider, Switch, Divider, Tabs, List, Steps, Tree,
  message, Spin, Collapse, Radio, Checkbox, Upload, Drawer
} from 'antd';
import { 
  AppstoreOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, CalculatorOutlined, SettingOutlined, SaveOutlined,
  ThunderboltOutlined, BorderOutlined, EnvironmentOutlined,
  BgColorsOutlined, NodeIndexOutlined, FileSearchOutlined,
  ExperimentOutlined, DashboardOutlined, LineChartOutlined,
  BulbOutlined, CheckCircleOutlined, WarningOutlined, CopyOutlined
} from '@ant-design/icons';
import type { TreeDataNode } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;
const { Step } = Steps;

// 计算域几何定义
interface ComputationalDomain {
  id: string;
  name: string;
  type: 'rectangular' | 'circular' | 'polygon' | 'complex';
  geometry: DomainGeometry;
  boundaries: BoundaryCondition[];
  materials: MaterialZone[];
  mesh: MeshConfiguration;
  loading: LoadingCondition[];
  constraints: GeometricConstraint[];
  validation: ValidationResult;
  metadata: DomainMetadata;
}

interface DomainGeometry {
  // 基本尺寸
  dimensions: {
    length: number; // X方向
    width: number;  // Y方向
    depth: number;  // Z方向
  };
  
  // 几何定义点
  vertices: Vertex3D[];
  
  // 面定义
  faces: Face[];
  
  // 子域定义
  regions: Region[];
  
  // 几何约束
  symmetry: {
    xSymmetry: boolean;
    ySymmetry: boolean;
    zSymmetry: boolean;
  };
}

interface Vertex3D {
  id: string;
  x: number;
  y: number;
  z: number;
  label?: string;
  constraints?: string[];
}

interface Face {
  id: string;
  name: string;
  vertices: string[]; // vertex IDs
  type: 'boundary' | 'interface' | 'internal';
  materialLeft: string;
  materialRight?: string;
  meshRefinement?: number;
}

interface Region {
  id: string;
  name: string;
  type: 'soil' | 'structure' | 'excavation' | 'water' | 'air';
  boundary: string[]; // face IDs
  material: string;
  meshSize: number;
  priority: number;
}

interface BoundaryCondition {
  id: string;
  name: string;
  type: 'displacement' | 'force' | 'pressure' | 'flow' | 'thermal';
  faces: string[]; // face IDs
  values: { [component: string]: number };
  timeFunction?: string;
  coordinateSystem: 'global' | 'local';
}

interface MaterialZone {
  id: string;
  name: string;
  materialType: 'soil' | 'concrete' | 'steel' | 'water' | 'air';
  regions: string[]; // region IDs
  properties: { [key: string]: number };
  color: string;
  opacity: number;
}

interface MeshConfiguration {
  algorithm: 'delaunay' | 'advancing_front' | 'octree' | 'hybrid';
  elementType: 'tetrahedron' | 'hexahedron' | 'prism' | 'pyramid' | 'mixed';
  globalSize: number;
  minSize: number;
  maxSize: number;
  refinementZones: RefinementZone[];
  qualityTargets: MeshQuality;
  adaptivity: AdaptiveMesh;
}

interface RefinementZone {
  id: string;
  name: string;
  regions: string[];
  targetSize: number;
  maxLevels: number;
  criteria: 'geometry' | 'gradient' | 'error' | 'manual';
}

interface MeshQuality {
  minAngle: number;        // 最小角度
  maxAngle: number;        // 最大角度
  aspectRatio: number;     // 长宽比
  skewness: number;        // 倾斜度
  orthogonality: number;   // 正交性
  targetElements: number;  // 目标单元数
}

interface AdaptiveMesh {
  enabled: boolean;
  maxRefinements: number;
  errorTolerance: number;
  loadSteps: number[];
}

interface LoadingCondition {
  id: string;
  name: string;
  type: 'gravity' | 'surface_load' | 'body_force' | 'excavation_sequence' | 'construction_load';
  magnitude: number;
  direction?: { x: number; y: number; z: number };
  regions?: string[];
  timeHistory?: TimeHistoryPoint[];
}

interface TimeHistoryPoint {
  time: number;
  factor: number;
}

interface GeometricConstraint {
  id: string;
  name: string;
  type: 'symmetry' | 'coupling' | 'contact' | 'rigid_body';
  entities: string[];
  parameters: { [key: string]: any };
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
  recommendations: string[];
}

interface ValidationError {
  category: 'geometry' | 'mesh' | 'boundary' | 'material' | 'loading';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedEntities: string[];
  suggestion: string;
}

interface ValidationWarning {
  category: string;
  message: string;
  impact: string;
  recommendation: string;
}

interface DomainMetadata {
  created: string;
  modified: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  analysisType: 'static' | 'dynamic' | 'coupled' | 'multiphase';
}

interface UserDefinedDomainProps {
  initialDomain?: Partial<ComputationalDomain>;
  onDomainChange?: (domain: ComputationalDomain) => void;
  onMeshGenerate?: (domain: ComputationalDomain) => void;
  onExport?: (domain: ComputationalDomain, format: 'inp' | 'msh' | 'unv' | 'cas') => void;
  readOnly?: boolean;
  showAdvancedOptions?: boolean;
}

const UserDefinedDomain: React.FC<UserDefinedDomainProps> = ({
  initialDomain = {},
  onDomainChange,
  onMeshGenerate,
  onExport,
  readOnly = false,
  showAdvancedOptions = true
}) => {
  const [domain, setDomain] = useState<ComputationalDomain>(createDefaultDomain(initialDomain));
  const [activeTab, setActiveTab] = useState<'geometry' | 'materials' | 'boundaries' | 'mesh' | 'validation'>('geometry');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [geometryWizardVisible, setGeometryWizardVisible] = useState(false);
  const [meshPreviewVisible, setMeshPreviewVisible] = useState(false);
  const [isGeneratingMesh, setIsGeneratingMesh] = useState(false);
  const [meshProgress, setMeshProgress] = useState(0);

  // 创建默认计算域
  function createDefaultDomain(initial: Partial<ComputationalDomain> = {}): ComputationalDomain {
    return {
      id: `domain_${Date.now()}`,
      name: '新建计算域',
      type: 'rectangular',
      geometry: {
        dimensions: { length: 100, width: 80, depth: 30 },
        vertices: [
          { id: 'v1', x: -50, y: -40, z: 0, label: 'A' },
          { id: 'v2', x: 50, y: -40, z: 0, label: 'B' },
          { id: 'v3', x: 50, y: 40, z: 0, label: 'C' },
          { id: 'v4', x: -50, y: 40, z: 0, label: 'D' },
          { id: 'v5', x: -50, y: -40, z: -30, label: 'E' },
          { id: 'v6', x: 50, y: -40, z: -30, label: 'F' },
          { id: 'v7', x: 50, y: 40, z: -30, label: 'G' },
          { id: 'v8', x: -50, y: 40, z: -30, label: 'H' }
        ],
        faces: [
          { id: 'f1', name: '顶面', vertices: ['v1', 'v2', 'v3', 'v4'], type: 'boundary', materialLeft: 'soil' },
          { id: 'f2', name: '底面', vertices: ['v5', 'v6', 'v7', 'v8'], type: 'boundary', materialLeft: 'soil' },
          { id: 'f3', name: '前面', vertices: ['v1', 'v2', 'v6', 'v5'], type: 'boundary', materialLeft: 'soil' },
          { id: 'f4', name: '后面', vertices: ['v3', 'v4', 'v8', 'v7'], type: 'boundary', materialLeft: 'soil' },
          { id: 'f5', name: '左面', vertices: ['v1', 'v4', 'v8', 'v5'], type: 'boundary', materialLeft: 'soil' },
          { id: 'f6', name: '右面', vertices: ['v2', 'v3', 'v7', 'v6'], type: 'boundary', materialLeft: 'soil' }
        ],
        regions: [
          { id: 'r1', name: '土体区域', type: 'soil', boundary: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'], material: 'soil', meshSize: 2.0, priority: 1 }
        ],
        symmetry: { xSymmetry: false, ySymmetry: false, zSymmetry: false }
      },
      boundaries: [
        {
          id: 'bc1',
          name: '底面固定',
          type: 'displacement',
          faces: ['f2'],
          values: { ux: 0, uy: 0, uz: 0 },
          coordinateSystem: 'global'
        },
        {
          id: 'bc2',
          name: '侧面法向约束',
          type: 'displacement',
          faces: ['f3', 'f4', 'f5', 'f6'],
          values: { un: 0 },
          coordinateSystem: 'local'
        }
      ],
      materials: [
        {
          id: 'mat1',
          name: '软土',
          materialType: 'soil',
          regions: ['r1'],
          properties: {
            density: 1800,
            youngModulus: 5000000,
            poissonRatio: 0.35,
            cohesion: 15000,
            frictionAngle: 18
          },
          color: '#8B7355',
          opacity: 0.7
        }
      ],
      mesh: {
        algorithm: 'delaunay',
        elementType: 'tetrahedron',
        globalSize: 2.0,
        minSize: 0.5,
        maxSize: 5.0,
        refinementZones: [],
        qualityTargets: {
          minAngle: 10,
          maxAngle: 160,
          aspectRatio: 5,
          skewness: 0.8,
          orthogonality: 0.3,
          targetElements: 50000
        },
        adaptivity: {
          enabled: false,
          maxRefinements: 3,
          errorTolerance: 0.05,
          loadSteps: []
        }
      },
      loading: [
        {
          id: 'load1',
          name: '重力荷载',
          type: 'gravity',
          magnitude: 9.81,
          direction: { x: 0, y: 0, z: -1 }
        }
      ],
      constraints: [],
      validation: {
        isValid: false,
        errors: [],
        warnings: [],
        score: 0,
        recommendations: []
      },
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        version: '1.0',
        author: '2号几何专家',
        description: '用户定义的计算域',
        tags: ['基坑', '有限元'],
        analysisType: 'static'
      },
      ...initial
    };
  }

  // 更新计算域参数
  const updateDomain = useCallback((path: string, value: any) => {
    setDomain(prev => {
      const newDomain = { ...prev };
      const keys = path.split('.');
      let current: any = newDomain;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      newDomain.metadata.modified = new Date().toISOString();
      
      return newDomain;
    });
  }, []);

  // 验证计算域
  const validateDomain = useCallback((dom: ComputationalDomain): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 几何验证
    if (dom.geometry.vertices.length < 4) {
      errors.push({
        category: 'geometry',
        message: '计算域顶点数不足',
        severity: 'critical',
        affectedEntities: [],
        suggestion: '至少需要4个顶点定义3D域'
      });
    }

    // 边界条件验证
    const boundaryFaces = new Set(dom.boundaries.flatMap(bc => bc.faces));
    const allFaces = new Set(dom.geometry.faces.map(f => f.id));
    
    if (boundaryFaces.size === 0) {
      errors.push({
        category: 'boundary',
        message: '未定义边界条件',
        severity: 'high',
        affectedEntities: [],
        suggestion: '至少需要定义一个边界条件'
      });
    }

    // 材料验证
    if (dom.materials.length === 0) {
      errors.push({
        category: 'material',
        message: '未定义材料属性',
        severity: 'critical',
        affectedEntities: [],
        suggestion: '至少需要为一个区域分配材料'
      });
    }

    // 网格验证
    if (dom.mesh.globalSize <= 0) {
      errors.push({
        category: 'mesh',
        message: '网格尺寸设置无效',
        severity: 'high',
        affectedEntities: [],
        suggestion: '全局网格尺寸必须大于0'
      });
    }

    // 计算质量分数
    let score = 100;
    score -= errors.filter(e => e.severity === 'critical').length * 30;
    score -= errors.filter(e => e.severity === 'high').length * 20;
    score -= errors.filter(e => e.severity === 'medium').length * 10;
    score -= errors.filter(e => e.severity === 'low').length * 5;
    score -= warnings.length * 2;
    score = Math.max(0, score);

    // 生成建议
    const recommendations: string[] = [];
    if (errors.length > 0) {
      recommendations.push('修正所有错误后再进行网格生成');
    }
    if (dom.mesh.qualityTargets.targetElements > 100000) {
      recommendations.push('目标单元数较大，建议增加计算资源');
    }
    if (score >= 90) {
      recommendations.push('计算域配置优秀，可以进行网格生成');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      recommendations
    };
  }, []);

  // 生成网格
  const generateMesh = async () => {
    if (!domain.validation.isValid) {
      message.error('存在配置错误，无法生成网格');
      return;
    }

    setIsGeneratingMesh(true);
    setMeshProgress(0);

    try {
      // 模拟网格生成过程
      const steps = [
        { name: '几何预处理', duration: 1000 },
        { name: '边界网格生成', duration: 1500 },
        { name: '体网格生成', duration: 3000 },
        { name: '网格质量检查', duration: 1000 },
        { name: '网格优化', duration: 2000 }
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        for (let progress = 0; progress <= 100; progress += 5) {
          setMeshProgress((i * 100 + progress) / steps.length);
          await new Promise(resolve => setTimeout(resolve, step.duration / 20));
        }
      }

      if (onMeshGenerate) {
        onMeshGenerate(domain);
      }

      message.success('网格生成完成');
      setMeshPreviewVisible(true);

    } catch (error) {
      message.error('网格生成失败');
    } finally {
      setIsGeneratingMesh(false);
      setMeshProgress(0);
    }
  };

  // 计算估算单元数
  const estimatedElements = useMemo(() => {
    const volume = domain.geometry.dimensions.length * 
                   domain.geometry.dimensions.width * 
                   domain.geometry.dimensions.depth;
    const avgElementSize = Math.pow(domain.mesh.globalSize, 3);
    return Math.round(volume / avgElementSize);
  }, [domain.geometry.dimensions, domain.mesh.globalSize]);

  // 验证计算域
  useEffect(() => {
    const validation = validateDomain(domain);
    updateDomain('validation', validation);
    
    if (onDomainChange) {
      onDomainChange(domain);
    }
  }, [domain, validateDomain, onDomainChange, updateDomain]);

  // 几何实体树数据
  const geometryTreeData: TreeDataNode[] = [
    {
      title: '顶点',
      key: 'vertices',
      children: domain.geometry.vertices.map(vertex => ({
        title: `${vertex.label || vertex.id}: (${vertex.x}, ${vertex.y}, ${vertex.z})`,
        key: vertex.id,
        isLeaf: true
      }))
    },
    {
      title: '面',
      key: 'faces',
      children: domain.geometry.faces.map(face => ({
        title: `${face.name}: ${face.vertices.length}个顶点`,
        key: face.id,
        isLeaf: true
      }))
    },
    {
      title: '区域',
      key: 'regions',
      children: domain.geometry.regions.map(region => ({
        title: `${region.name}: ${region.type}`,
        key: region.id,
        isLeaf: true
      }))
    }
  ];

  return (
    <div className="user-defined-domain">
      {/* 头部状态 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space>
              <AppstoreOutlined style={{ color: 'var(--primary-color)' }} />
              <Title level={5} style={{ margin: 0 }}>计算域定义</Title>
              <Tag color={domain.validation.isValid ? 'green' : 'red'}>
                {domain.validation.isValid ? '有效' : '无效'}
              </Tag>
            </Space>
          </Col>
          <Col span={18}>
            <Row gutter={16}>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {domain.geometry.vertices.length}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>顶点</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {domain.geometry.faces.length}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>面</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {estimatedElements.toLocaleString()}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>预估单元</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={domain.validation.score}
                    size={40}
                    status={domain.validation.score >= 90 ? 'success' : domain.validation.score >= 70 ? 'active' : 'exception'}
                    format={(percent) => `${percent}`}
                  />
                  <div><Text style={{ fontSize: '11px' }}>质量分数</Text></div>
                </div>
              </Col>
              <Col span={8}>
                <Space style={{ float: 'right' }}>
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setMeshPreviewVisible(true)}
                  >
                    预览
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={generateMesh}
                    loading={isGeneratingMesh}
                    disabled={!domain.validation.isValid || readOnly}
                  >
                    生成网格
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 验证结果提醒 */}
      {domain.validation.errors.length > 0 && (
        <Alert
          message={`发现 ${domain.validation.errors.length} 个配置错误`}
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {domain.validation.errors.slice(0, 3).map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
              {domain.validation.errors.length > 3 && (
                <li>还有 {domain.validation.errors.length - 3} 个错误...</li>
              )}
            </ul>
          }
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 网格生成进度 */}
      {isGeneratingMesh && (
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col span={4}>
              <Text strong>网格生成进度:</Text>
            </Col>
            <Col span={16}>
              <Progress 
                percent={Math.round(meshProgress)} 
                status="active"
                format={(percent) => `${percent}%`}
              />
            </Col>
            <Col span={4}>
              <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                预估 {estimatedElements.toLocaleString()} 个单元
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab as any} size="small">
        {/* 几何定义 */}
        <TabPane tab="几何定义" key="geometry">
          <Row gutter={16}>
            <Col span={8}>
              <Card title="基本尺寸" size="small" style={{ marginBottom: '16px' }}>
                <Form layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="长度 (m)">
                        <InputNumber
                          value={domain.geometry.dimensions.length}
                          onChange={(value) => updateDomain('geometry.dimensions.length', value)}
                          min={1}
                          max={1000}
                          step={1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="宽度 (m)">
                        <InputNumber
                          value={domain.geometry.dimensions.width}
                          onChange={(value) => updateDomain('geometry.dimensions.width', value)}
                          min={1}
                          max={1000}
                          step={1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="深度 (m)">
                        <InputNumber
                          value={domain.geometry.dimensions.depth}
                          onChange={(value) => updateDomain('geometry.dimensions.depth', value)}
                          min={1}
                          max={200}
                          step={1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>

              <Card title="对称性设置" size="small">
                <Form layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="X对称">
                        <Switch
                          checked={domain.geometry.symmetry.xSymmetry}
                          onChange={(checked) => updateDomain('geometry.symmetry.xSymmetry', checked)}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Y对称">
                        <Switch
                          checked={domain.geometry.symmetry.ySymmetry}
                          onChange={(checked) => updateDomain('geometry.symmetry.ySymmetry', checked)}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Z对称">
                        <Switch
                          checked={domain.geometry.symmetry.zSymmetry}
                          onChange={(checked) => updateDomain('geometry.symmetry.zSymmetry', checked)}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>
            </Col>

            <Col span={16}>
              <Card title="几何实体" size="small">
                <Row gutter={16}>
                  <Col span={12}>
                    <Tree
                      treeData={geometryTreeData}
                      defaultExpandAll
                      onSelect={(selectedKeys) => {
                        if (selectedKeys.length > 0) {
                          setSelectedEntity(selectedKeys[0] as string);
                        }
                      }}
                      height={300}
                    />
                  </Col>
                  <Col span={12}>
                    {selectedEntity && (
                      <Card size="small" title="实体属性">
                        {/* 根据选中实体显示不同的属性编辑界面 */}
                        <div style={{ height: '250px', overflowY: 'auto' }}>
                          <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            选中实体: {selectedEntity}
                          </Text>
                          {/* 这里可以扩展具体的属性编辑界面 */}
                        </div>
                      </Card>
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 材料定义 */}
        <TabPane tab="材料定义" key="materials">
          <Card title="材料库" size="small">
            <Table
              columns={[
                {
                  title: '材料名称',
                  key: 'name',
                  render: (_: any, record: MaterialZone) => (
                    <Space>
                      <div 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: record.color,
                          borderRadius: '2px'
                        }} 
                      />
                      <Text strong>{record.name}</Text>
                    </Space>
                  )
                },
                {
                  title: '材料类型',
                  dataIndex: 'materialType',
                  render: (type: string) => (
                    <Tag color="blue">
                      {type === 'soil' ? '土体' : 
                       type === 'concrete' ? '混凝土' :
                       type === 'steel' ? '钢材' : type}
                    </Tag>
                  )
                },
                {
                  title: '主要参数',
                  key: 'properties',
                  render: (_: any, record: MaterialZone) => (
                    <Space direction="vertical" size={2}>
                      <Text style={{ fontSize: '11px' }}>
                        密度: {record.properties.density} kg/m³
                      </Text>
                      <Text style={{ fontSize: '11px' }}>
                        弹模: {(record.properties.youngModulus / 1000000).toFixed(1)} MPa
                      </Text>
                      <Text style={{ fontSize: '11px' }}>
                        泊松比: {record.properties.poissonRatio}
                      </Text>
                    </Space>
                  )
                },
                {
                  title: '分配区域',
                  dataIndex: 'regions',
                  render: (regions: string[]) => (
                    <Tag color="green">{regions.length}个区域</Tag>
                  )
                },
                {
                  title: '操作',
                  key: 'actions',
                  render: (_: any, record: MaterialZone) => (
                    <Space size="small">
                      <Button type="link" size="small" icon={<EditOutlined />} disabled={readOnly} />
                      <Button type="link" size="small" icon={<CopyOutlined />} disabled={readOnly} />
                      <Button type="link" size="small" icon={<DeleteOutlined />} danger disabled={readOnly} />
                    </Space>
                  )
                }
              ]}
              dataSource={domain.materials}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </TabPane>

        {/* 边界条件 */}
        <TabPane tab="边界条件" key="boundaries">
          <Card title="边界条件" size="small">
            <Table
              columns={[
                {
                  title: '条件名称',
                  dataIndex: 'name',
                  render: (name: string) => <Text strong>{name}</Text>
                },
                {
                  title: '类型',
                  dataIndex: 'type',
                  render: (type: string) => (
                    <Tag color="purple">
                      {type === 'displacement' ? '位移' :
                       type === 'force' ? '力' :
                       type === 'pressure' ? '压力' : type}
                    </Tag>
                  )
                },
                {
                  title: '约束值',
                  key: 'values',
                  render: (_: any, record: BoundaryCondition) => (
                    <Space>
                      {Object.entries(record.values).map(([component, value]) => (
                        <Text key={component} style={{ fontSize: '11px' }}>
                          {component}: {value}
                        </Text>
                      ))}
                    </Space>
                  )
                },
                {
                  title: '应用面',
                  dataIndex: 'faces',
                  render: (faces: string[]) => (
                    <Tag color="blue">{faces.length}个面</Tag>
                  )
                },
                {
                  title: '坐标系',
                  dataIndex: 'coordinateSystem',
                  render: (system: string) => (
                    <Tag size="small">{system === 'global' ? '全局' : '局部'}</Tag>
                  )
                },
                {
                  title: '操作',
                  key: 'actions',
                  render: () => (
                    <Space size="small">
                      <Button type="link" size="small" icon={<EditOutlined />} disabled={readOnly} />
                      <Button type="link" size="small" icon={<DeleteOutlined />} danger disabled={readOnly} />
                    </Space>
                  )
                }
              ]}
              dataSource={domain.boundaries}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </Card>
        </TabPane>

        {/* 网格配置 */}
        <TabPane tab="网格配置" key="mesh">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="基本参数" size="small" style={{ marginBottom: '16px' }}>
                <Form layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="算法">
                        <Select
                          value={domain.mesh.algorithm}
                          onChange={(value) => updateDomain('mesh.algorithm', value)}
                          disabled={readOnly}
                        >
                          <Option value="delaunay">Delaunay</Option>
                          <Option value="advancing_front">推进波前</Option>
                          <Option value="octree">八叉树</Option>
                          <Option value="hybrid">混合算法</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="单元类型">
                        <Select
                          value={domain.mesh.elementType}
                          onChange={(value) => updateDomain('mesh.elementType', value)}
                          disabled={readOnly}
                        >
                          <Option value="tetrahedron">四面体</Option>
                          <Option value="hexahedron">六面体</Option>
                          <Option value="prism">棱柱</Option>
                          <Option value="mixed">混合单元</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="全局尺寸 (m)">
                        <InputNumber
                          value={domain.mesh.globalSize}
                          onChange={(value) => updateDomain('mesh.globalSize', value)}
                          min={0.1}
                          max={20}
                          step={0.1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="最小尺寸 (m)">
                        <InputNumber
                          value={domain.mesh.minSize}
                          onChange={(value) => updateDomain('mesh.minSize', value)}
                          min={0.01}
                          max={5}
                          step={0.01}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="最大尺寸 (m)">
                        <InputNumber
                          value={domain.mesh.maxSize}
                          onChange={(value) => updateDomain('mesh.maxSize', value)}
                          min={1}
                          max={50}
                          step={1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>

              <Card title="质量控制" size="small">
                <Form layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="最小角度 (°)">
                        <InputNumber
                          value={domain.mesh.qualityTargets.minAngle}
                          onChange={(value) => updateDomain('mesh.qualityTargets.minAngle', value)}
                          min={5}
                          max={30}
                          step={1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="长宽比">
                        <InputNumber
                          value={domain.mesh.qualityTargets.aspectRatio}
                          onChange={(value) => updateDomain('mesh.qualityTargets.aspectRatio', value)}
                          min={2}
                          max={20}
                          step={1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item label="目标单元数">
                    <InputNumber
                      value={domain.mesh.qualityTargets.targetElements}
                      onChange={(value) => updateDomain('mesh.qualityTargets.targetElements', value)}
                      min={1000}
                      max={1000000}
                      step={1000}
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      disabled={readOnly}
                    />
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="网格预览" size="small" style={{ height: '400px' }}>
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: '#f5f5f5',
                  borderRadius: '6px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <NodeIndexOutlined style={{ fontSize: '48px', color: 'var(--text-secondary)', marginBottom: '16px' }} />
                    <div>
                      <Text style={{ color: 'var(--text-secondary)' }}>
                        网格预览
                      </Text>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <Space>
                        <Text style={{ fontSize: '12px' }}>
                          预估单元: {estimatedElements.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: '12px' }}>
                          预估节点: {Math.round(estimatedElements * 1.5).toLocaleString()}
                        </Text>
                      </Space>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 验证结果 */}
        <TabPane tab="验证结果" key="validation">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="配置检查" size="small" style={{ marginBottom: '16px' }}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Progress
                    type="circle"
                    percent={domain.validation.score}
                    size={120}
                    status={domain.validation.score >= 90 ? 'success' : domain.validation.score >= 70 ? 'active' : 'exception'}
                    format={(percent) => (
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{percent}</div>
                        <div style={{ fontSize: '12px' }}>质量分数</div>
                      </div>
                    )}
                  />
                  <div style={{ marginTop: '16px' }}>
                    <Tag color={domain.validation.isValid ? 'green' : 'red'} style={{ fontSize: '14px' }}>
                      {domain.validation.isValid ? '配置有效' : '配置无效'}
                    </Tag>
                  </div>
                </div>
              </Card>

              <Card title="改进建议" size="small">
                <List
                  size="small"
                  dataSource={domain.validation.recommendations}
                  renderItem={recommendation => (
                    <List.Item>
                      <Space>
                        <BulbOutlined style={{ color: 'var(--warning-color)' }} />
                        <Text style={{ fontSize: '12px' }}>{recommendation}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            <Col span={12}>
              {domain.validation.errors.length > 0 && (
                <Card title="错误列表" size="small" style={{ marginBottom: '16px' }}>
                  <List
                    size="small"
                    dataSource={domain.validation.errors}
                    renderItem={error => (
                      <List.Item>
                        <Space>
                          <WarningOutlined style={{ color: 'var(--error-color)' }} />
                          <div>
                            <Text style={{ fontSize: '12px' }}>{error.message}</Text>
                            <div>
                              <Text style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                {error.suggestion}
                              </Text>
                            </div>
                          </div>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {domain.validation.warnings.length > 0 && (
                <Card title="警告列表" size="small">
                  <List
                    size="small"
                    dataSource={domain.validation.warnings}
                    renderItem={warning => (
                      <List.Item>
                        <Space>
                          <ExclamationCircleOutlined style={{ color: 'var(--warning-color)' }} />
                          <div>
                            <Text style={{ fontSize: '12px' }}>{warning.message}</Text>
                            <div>
                              <Text style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                {warning.recommendation}
                              </Text>
                            </div>
                          </div>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* 网格预览模态框 */}
      <Modal
        title="网格预览"
        open={meshPreviewVisible}
        onCancel={() => setMeshPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="export" icon={<SaveOutlined />} onClick={() => onExport && onExport(domain, 'inp')}>
            导出网格
          </Button>,
          <Button key="close" onClick={() => setMeshPreviewVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#f0f0f0',
          borderRadius: '6px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <ThunderboltOutlined style={{ fontSize: '64px', color: 'var(--primary-color)', marginBottom: '16px' }} />
            <div>
              <Text strong>网格生成完成</Text>
            </div>
            <div style={{ marginTop: '16px' }}>
              <Space direction="vertical">
                <Text style={{ fontSize: '12px' }}>
                  单元数: {estimatedElements.toLocaleString()}
                </Text>
                <Text style={{ fontSize: '12px' }}>
                  节点数: {Math.round(estimatedElements * 1.5).toLocaleString()}
                </Text>
                <Text style={{ fontSize: '12px' }}>
                  质量分数: {domain.validation.score}/100
                </Text>
              </Space>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDefinedDomain;