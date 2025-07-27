/**
 * 地层参数编辑面板 - 2号几何专家开发
 * P0优先级任务 - 专业级土层物理参数编辑界面
 * 基于1号架构师UI开发规划和3号专家的计算标准
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Form, InputNumber, Select, Table, Button, Space, 
  Typography, Row, Col, Tag, Switch, Modal, Alert, Tabs,
  Tooltip, Progress, Divider, message, Popconfirm, Upload
} from 'antd';
import { 
  EditOutlined, SaveOutlined, UndoOutlined, DeleteOutlined,
  PlusOutlined, CopyOutlined, DownloadOutlined, UploadOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, SettingOutlined,
  ExperimentOutlined, DatabaseOutlined, CalculatorOutlined
} from '@ant-design/icons';
import type { SoilLayer } from '../../types/GeologyDataTypes';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 扩展的土层参数接口
interface EnhancedSoilProperties {
  // 基本物理参数
  density: number;           // 密度 (g/cm³)
  waterContent: number;      // 含水率 (%)
  voidRatio: number;         // 孔隙比
  liquidLimit: number;       // 液限 (%)
  plasticLimit: number;      // 塑限 (%)
  plasticityIndex: number;   // 塑性指数

  // 力学参数
  cohesion: number;          // 黏聚力 (kPa)
  friction: number;          // 内摩擦角 (°)
  elasticModulus: number;    // 弹性模量 (MPa)
  poissonRatio: number;      // 泊松比
  compressionIndex: number;  // 压缩指数
  swellingIndex: number;     // 回弹指数

  // 渗透参数
  permeability: number;      // 渗透系数 (cm/s)
  permeabilityK: number;     // K值渗透系数 (m/s)

  // 动力参数
  dampingRatio: number;      // 阻尼比
  maxShearModulus: number;   // 最大剪切模量 (MPa)
}

interface EnhancedSoilLayer extends Omit<SoilLayer, 'properties'> {
  properties: EnhancedSoilProperties;
  isEditing?: boolean;
  isModified?: boolean;
  validationErrors?: string[];
}

interface GeologyParameterEditorProps {
  layers?: EnhancedSoilLayer[];
  onLayersChange?: (layers: EnhancedSoilLayer[]) => void;
  onSaveAll?: (layers: EnhancedSoilLayer[]) => void;
  onExport?: (layers: EnhancedSoilLayer[], format: 'json' | 'csv' | 'excel') => void;
  readOnly?: boolean;
  showAdvancedParams?: boolean;
}

const GeologyParameterEditor: React.FC<GeologyParameterEditorProps> = ({
  layers = [],
  onLayersChange,
  onSaveAll,
  onExport,
  readOnly = false,
  showAdvancedParams = true
}) => {
  const [form] = Form.useForm();
  const [editingLayers, setEditingLayers] = useState<EnhancedSoilLayer[]>(layers);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'mechanical' | 'hydraulic' | 'dynamic'>('basic');
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, string[]>>(new Map());

  // 标准土层参数模板
  const soilTypeTemplates = {
    '填土': {
      density: 1.8, waterContent: 25, voidRatio: 0.8, liquidLimit: 35, plasticLimit: 18, plasticityIndex: 17,
      cohesion: 10, friction: 15, elasticModulus: 5, poissonRatio: 0.35, compressionIndex: 0.3, swellingIndex: 0.05,
      permeability: 1e-5, permeabilityK: 1e-7, dampingRatio: 0.05, maxShearModulus: 20
    },
    '软土': {
      density: 1.7, waterContent: 45, voidRatio: 1.2, liquidLimit: 50, plasticLimit: 25, plasticityIndex: 25,
      cohesion: 15, friction: 8, elasticModulus: 3, poissonRatio: 0.4, compressionIndex: 0.5, swellingIndex: 0.08,
      permeability: 1e-7, permeabilityK: 1e-9, dampingRatio: 0.06, maxShearModulus: 12
    },
    '粘土': {
      density: 1.9, waterContent: 30, voidRatio: 0.9, liquidLimit: 40, plasticLimit: 20, plasticityIndex: 20,
      cohesion: 25, friction: 18, elasticModulus: 8, poissonRatio: 0.3, compressionIndex: 0.25, swellingIndex: 0.04,
      permeability: 1e-8, permeabilityK: 1e-10, dampingRatio: 0.04, maxShearModulus: 35
    },
    '砂土': {
      density: 2.0, waterContent: 20, voidRatio: 0.6, liquidLimit: 0, plasticLimit: 0, plasticityIndex: 0,
      cohesion: 0, friction: 35, elasticModulus: 25, poissonRatio: 0.25, compressionIndex: 0.1, swellingIndex: 0.02,
      permeability: 1e-3, permeabilityK: 1e-5, dampingRatio: 0.03, maxShearModulus: 80
    },
    '砾石': {
      density: 2.2, waterContent: 15, voidRatio: 0.4, liquidLimit: 0, plasticLimit: 0, plasticityIndex: 0,
      cohesion: 0, friction: 42, elasticModulus: 50, poissonRatio: 0.2, compressionIndex: 0.05, swellingIndex: 0.01,
      permeability: 1e-2, permeabilityK: 1e-4, dampingRatio: 0.02, maxShearModulus: 120
    }
  };

  // 参数验证规则
  const validateLayer = (layer: EnhancedSoilLayer): string[] => {
    const errors: string[] = [];
    const props = layer.properties;

    // 基本参数验证
    if (props.density < 1.3 || props.density > 2.5) {
      errors.push('密度应在1.3-2.5 g/cm³范围内');
    }
    if (props.waterContent < 0 || props.waterContent > 100) {
      errors.push('含水率应在0-100%范围内');
    }
    if (props.voidRatio < 0.2 || props.voidRatio > 3.0) {
      errors.push('孔隙比应在0.2-3.0范围内');
    }

    // 力学参数验证
    if (props.cohesion < 0 || props.cohesion > 200) {
      errors.push('黏聚力应在0-200 kPa范围内');
    }
    if (props.friction < 0 || props.friction > 50) {
      errors.push('内摩擦角应在0-50°范围内');
    }
    if (props.elasticModulus <= 0 || props.elasticModulus > 500) {
      errors.push('弹性模量应在0-500 MPa范围内');
    }
    if (props.poissonRatio < 0.1 || props.poissonRatio > 0.45) {
      errors.push('泊松比应在0.1-0.45范围内');
    }

    // 渗透参数验证
    if (props.permeability <= 0 || props.permeability > 1) {
      errors.push('渗透系数应在0-1 cm/s范围内');
    }

    // 特殊组合验证
    if (props.plasticityIndex > 0 && (props.liquidLimit <= props.plasticLimit)) {
      errors.push('液限应大于塑限');
    }

    return errors;
  };

  // 更新验证结果
  const updateValidation = (layers: EnhancedSoilLayer[]) => {
    const newValidationResults = new Map<string, string[]>();
    layers.forEach(layer => {
      const errors = validateLayer(layer);
      if (errors.length > 0) {
        newValidationResults.set(layer.id, errors);
      }
    });
    setValidationResults(newValidationResults);
  };

  // 应用标准模板
  const applyTemplate = (layerId: string, soilType: keyof typeof soilTypeTemplates) => {
    const template = soilTypeTemplates[soilType];
    if (!template) return;

    const updatedLayers = editingLayers.map(layer => {
      if (layer.id === layerId) {
        return {
          ...layer,
          properties: { ...template },
          isModified: true
        };
      }
      return layer;
    });

    setEditingLayers(updatedLayers);
    updateValidation(updatedLayers);
    
    if (onLayersChange) {
      onLayersChange(updatedLayers);
    }
  };

  // 更新单个参数
  const updateParameter = (layerId: string, paramPath: string, value: number) => {
    const updatedLayers = editingLayers.map(layer => {
      if (layer.id === layerId) {
        const newProperties = { ...layer.properties };
        (newProperties as any)[paramPath] = value;
        
        return {
          ...layer,
          properties: newProperties,
          isModified: true
        };
      }
      return layer;
    });

    setEditingLayers(updatedLayers);
    updateValidation(updatedLayers);
    
    if (onLayersChange) {
      onLayersChange(updatedLayers);
    }
  };

  // 计算参数完整性评分
  const calculateCompletenessScore = (layer: EnhancedSoilLayer): number => {
    const props = layer.properties;
    const requiredParams = [
      'density', 'cohesion', 'friction', 'elasticModulus', 
      'poissonRatio', 'permeability'
    ];
    
    let score = 0;
    requiredParams.forEach(param => {
      if ((props as any)[param] > 0) score += 1;
    });
    
    return Math.round((score / requiredParams.length) * 100);
  };

  // 保存所有修改
  const handleSaveAll = () => {
    const hasErrors = Array.from(validationResults.values()).some(errors => errors.length > 0);
    if (hasErrors) {
      message.error('存在参数验证错误，请修正后再保存');
      return;
    }

    const modifiedLayers = editingLayers.map(layer => ({
      ...layer,
      isModified: false,
      isEditing: false
    }));

    setEditingLayers(modifiedLayers);
    
    if (onSaveAll) {
      onSaveAll(modifiedLayers);
    }
    
    message.success('所有参数已保存');
  };

  // 表格列定义
  const tableColumns = [
    {
      title: '土层信息',
      key: 'layerInfo',
      width: 200,
      fixed: 'left' as const,
      render: (_: any, record: EnhancedSoilLayer) => (
        <Space direction="vertical" size={2}>
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
          <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {record.topDepth.toFixed(1)}m - {record.bottomDepth.toFixed(1)}m
          </Text>
          <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            厚度: {record.thickness.toFixed(1)}m
          </Text>
        </Space>
      )
    },
    {
      title: '土层类型',
      dataIndex: 'soilType',
      key: 'soilType',
      width: 120,
      render: (soilType: string, record: EnhancedSoilLayer) => (
        <Space direction="vertical" size={4}>
          <Tag color="blue">{soilType}</Tag>
          <Select
            size="small"
            placeholder="应用模板"
            style={{ width: '100px' }}
            onChange={(value) => applyTemplate(record.id, value)}
            disabled={readOnly}
          >
            {Object.keys(soilTypeTemplates).map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
        </Space>
      )
    },
    {
      title: '完整性',
      key: 'completeness',
      width: 100,
      render: (_: any, record: EnhancedSoilLayer) => {
        const score = calculateCompletenessScore(record);
        return (
          <div style={{ textAlign: 'center' }}>
            <Progress
              type="circle"
              percent={score}
              size={40}
              status={score >= 80 ? 'success' : score >= 60 ? 'active' : 'exception'}
              format={(percent) => `${percent}%`}
            />
          </div>
        );
      }
    },
    {
      title: '基本参数',
      key: 'basicParams',
      width: 250,
      render: (_: any, record: EnhancedSoilLayer) => (
        <Row gutter={[8, 4]}>
          <Col span={12}>
            <Text style={{ fontSize: '10px' }}>密度:</Text>
            <InputNumber
              size="small"
              value={record.properties.density}
              onChange={(value) => updateParameter(record.id, 'density', value || 0)}
              min={1.0}
              max={3.0}
              step={0.1}
              style={{ width: '60px', marginLeft: '4px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={12}>
            <Text style={{ fontSize: '10px' }}>含水率:</Text>
            <InputNumber
              size="small"
              value={record.properties.waterContent}
              onChange={(value) => updateParameter(record.id, 'waterContent', value || 0)}
              min={0}
              max={100}
              step={1}
              style={{ width: '60px', marginLeft: '4px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={12}>
            <Text style={{ fontSize: '10px' }}>孔隙比:</Text>
            <InputNumber
              size="small"
              value={record.properties.voidRatio}
              onChange={(value) => updateParameter(record.id, 'voidRatio', value || 0)}
              min={0.1}
              max={5.0}
              step={0.1}
              style={{ width: '60px', marginLeft: '4px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={12}>
            <Text style={{ fontSize: '10px' }}>塑性指数:</Text>
            <InputNumber
              size="small"
              value={record.properties.plasticityIndex}
              onChange={(value) => updateParameter(record.id, 'plasticityIndex', value || 0)}
              min={0}
              max={50}
              step={1}
              style={{ width: '60px', marginLeft: '4px' }}
              disabled={readOnly}
            />
          </Col>
        </Row>
      )
    },
    {
      title: '力学参数',
      key: 'mechanicalParams',
      width: 300,
      render: (_: any, record: EnhancedSoilLayer) => (
        <Row gutter={[8, 4]}>
          <Col span={8}>
            <Text style={{ fontSize: '10px' }}>黏聚力:</Text>
            <InputNumber
              size="small"
              value={record.properties.cohesion}
              onChange={(value) => updateParameter(record.id, 'cohesion', value || 0)}
              min={0}
              max={200}
              step={1}
              style={{ width: '55px', marginLeft: '2px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={8}>
            <Text style={{ fontSize: '10px' }}>摩擦角:</Text>
            <InputNumber
              size="small"
              value={record.properties.friction}
              onChange={(value) => updateParameter(record.id, 'friction', value || 0)}
              min={0}
              max={50}
              step={1}
              style={{ width: '55px', marginLeft: '2px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={8}>
            <Text style={{ fontSize: '10px' }}>弹模:</Text>
            <InputNumber
              size="small"
              value={record.properties.elasticModulus}
              onChange={(value) => updateParameter(record.id, 'elasticModulus', value || 0)}
              min={1}
              max={500}
              step={1}
              style={{ width: '55px', marginLeft: '2px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={8}>
            <Text style={{ fontSize: '10px' }}>泊松比:</Text>
            <InputNumber
              size="small"
              value={record.properties.poissonRatio}
              onChange={(value) => updateParameter(record.id, 'poissonRatio', value || 0)}
              min={0.1}
              max={0.45}
              step={0.01}
              style={{ width: '55px', marginLeft: '2px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={8}>
            <Text style={{ fontSize: '10px' }}>压缩指数:</Text>
            <InputNumber
              size="small"
              value={record.properties.compressionIndex}
              onChange={(value) => updateParameter(record.id, 'compressionIndex', value || 0)}
              min={0.01}
              max={1.0}
              step={0.01}
              style={{ width: '55px', marginLeft: '2px' }}
              disabled={readOnly}
            />
          </Col>
          <Col span={8}>
            <Text style={{ fontSize: '10px' }}>回弹指数:</Text>
            <InputNumber
              size="small"
              value={record.properties.swellingIndex}
              onChange={(value) => updateParameter(record.id, 'swellingIndex', value || 0)}
              min={0.001}
              max={0.2}
              step={0.001}
              style={{ width: '55px', marginLeft: '2px' }}
              disabled={readOnly}
            />
          </Col>
        </Row>
      )
    },
    {
      title: '渗透参数',
      key: 'hydraulicParams',
      width: 150,
      render: (_: any, record: EnhancedSoilLayer) => (
        <Space direction="vertical" size={2}>
          <Space>
            <Text style={{ fontSize: '10px' }}>渗透系数:</Text>
            <InputNumber
              size="small"
              value={record.properties.permeability}
              onChange={(value) => updateParameter(record.id, 'permeability', value || 0)}
              min={1e-10}
              max={1}
              step={1e-6}
              style={{ width: '80px' }}
              disabled={readOnly}
              formatter={(value) => `${value}`.replace(/^0\./, '.')}
            />
          </Space>
          <Text style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
            (cm/s)
          </Text>
        </Space>
      )
    },
    {
      title: '验证状态',
      key: 'validation',
      width: 120,
      render: (_: any, record: EnhancedSoilLayer) => {
        const errors = validationResults.get(record.id) || [];
        const hasErrors = errors.length > 0;
        
        return (
          <div style={{ textAlign: 'center' }}>
            {hasErrors ? (
              <Tooltip title={errors.join('; ')}>
                <ExclamationCircleOutlined 
                  style={{ color: 'var(--error-color)', fontSize: '16px' }} 
                />
              </Tooltip>
            ) : (
              <CheckCircleOutlined 
                style={{ color: 'var(--success-color)', fontSize: '16px' }} 
              />
            )}
            <div style={{ marginTop: '4px' }}>
              <Text style={{ fontSize: '10px' }}>
                {hasErrors ? `${errors.length}个错误` : '验证通过'}
              </Text>
            </div>
          </div>
        );
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: EnhancedSoilLayer) => (
        <Space size="small">
          <Tooltip title="详细编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setSelectedLayer(record.id)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="复制参数">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyLayer(record)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="重置参数">
            <Popconfirm
              title="确定要重置此土层的所有参数吗？"
              onConfirm={() => handleResetLayer(record.id)}
              disabled={readOnly}
            >
              <Button
                type="link"
                size="small"
                icon={<UndoOutlined />}
                disabled={readOnly}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  const handleCopyLayer = (layer: EnhancedSoilLayer) => {
    console.log('复制土层参数:', layer.name);
    message.info('参数已复制到剪贴板');
  };

  const handleResetLayer = (layerId: string) => {
    const updatedLayers = editingLayers.map(layer => {
      if (layer.id === layerId) {
        const template = soilTypeTemplates[layer.soilType as keyof typeof soilTypeTemplates];
        if (template) {
          return {
            ...layer,
            properties: { ...template },
            isModified: true
          };
        }
      }
      return layer;
    });

    setEditingLayers(updatedLayers);
    updateValidation(updatedLayers);
    message.success('参数已重置');
  };

  // 统计信息
  const statistics = useMemo(() => {
    const totalLayers = editingLayers.length;
    const modifiedLayers = editingLayers.filter(layer => layer.isModified).length;
    const errorLayers = Array.from(validationResults.keys()).length;
    const avgCompleteness = editingLayers.reduce((sum, layer) => 
      sum + calculateCompletenessScore(layer), 0) / totalLayers;

    return {
      totalLayers,
      modifiedLayers,
      errorLayers,
      avgCompleteness: Math.round(avgCompleteness) || 0
    };
  }, [editingLayers, validationResults]);

  useEffect(() => {
    setEditingLayers(layers);
    updateValidation(layers);
  }, [layers]);

  return (
    <div className="geology-parameter-editor">
      {/* 头部统计 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space>
              <DatabaseOutlined style={{ color: 'var(--primary-color)' }} />
              <Title level={5} style={{ margin: 0 }}>地层参数编辑</Title>
            </Space>
          </Col>
          <Col span={18}>
            <Row gutter={16}>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {statistics.totalLayers}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>总土层数</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {statistics.modifiedLayers}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>已修改</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--error-color)' }}>
                    {statistics.errorLayers}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>验证错误</Text></div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    percent={statistics.avgCompleteness}
                    size="small"
                    status={statistics.avgCompleteness >= 80 ? 'success' : 'active'}
                    format={(percent) => `${percent}%`}
                  />
                  <div><Text style={{ fontSize: '11px' }}>平均完整性</Text></div>
                </div>
              </Col>
              <Col span={6}>
                <Space style={{ float: 'right' }}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={handleSaveAll}
                    disabled={readOnly || statistics.errorLayers > 0}
                  >
                    保存全部
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => onExport && onExport(editingLayers, 'csv')}
                  >
                    导出
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 验证错误提醒 */}
      {statistics.errorLayers > 0 && (
        <Alert
          message={`发现 ${statistics.errorLayers} 个土层存在参数验证错误`}
          description="请检查并修正标红的参数，确保所有参数都在合理范围内"
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 参数编辑表格 */}
      <Card size="small">
        <Table
          columns={tableColumns}
          dataSource={editingLayers}
          rowKey="id"
          size="small"
          scroll={{ x: 1400, y: 500 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个土层`
          }}
          rowClassName={(record) => {
            const hasErrors = validationResults.has(record.id);
            const isModified = record.isModified;
            return `${hasErrors ? 'row-error' : ''} ${isModified ? 'row-modified' : ''}`;
          }}
        />
      </Card>

      {/* 详细编辑模态框 */}
      <Modal
        title={
          <Space>
            <CalculatorOutlined />
            <span>详细参数编辑</span>
            {selectedLayer && (
              <Tag color="blue">
                {editingLayers.find(l => l.id === selectedLayer)?.name}
              </Tag>
            )}
          </Space>
        }
        open={!!selectedLayer}
        onCancel={() => setSelectedLayer(null)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setSelectedLayer(null)}>
            取消
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={() => {
              setSelectedLayer(null);
              message.success('参数已保存');
            }}
            disabled={readOnly}
          >
            保存
          </Button>
        ]}
      >
        {selectedLayer && (() => {
          const layer = editingLayers.find(l => l.id === selectedLayer);
          if (!layer) return null;

          return (
            <Tabs activeKey={activeTab} onChange={setActiveTab as any}>
              <TabPane tab="基本参数" key="basic">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>密度 (g/cm³)</Text>
                      <InputNumber
                        value={layer.properties.density}
                        onChange={(value) => updateParameter(layer.id, 'density', value || 0)}
                        min={1.0}
                        max={3.0}
                        step={0.01}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>含水率 (%)</Text>
                      <InputNumber
                        value={layer.properties.waterContent}
                        onChange={(value) => updateParameter(layer.id, 'waterContent', value || 0)}
                        min={0}
                        max={100}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>孔隙比</Text>
                      <InputNumber
                        value={layer.properties.voidRatio}
                        onChange={(value) => updateParameter(layer.id, 'voidRatio', value || 0)}
                        min={0.1}
                        max={5.0}
                        step={0.01}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>液限 (%)</Text>
                      <InputNumber
                        value={layer.properties.liquidLimit}
                        onChange={(value) => updateParameter(layer.id, 'liquidLimit', value || 0)}
                        min={0}
                        max={100}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>塑限 (%)</Text>
                      <InputNumber
                        value={layer.properties.plasticLimit}
                        onChange={(value) => updateParameter(layer.id, 'plasticLimit', value || 0)}
                        min={0}
                        max={100}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>塑性指数</Text>
                      <InputNumber
                        value={layer.properties.plasticityIndex}
                        onChange={(value) => updateParameter(layer.id, 'plasticityIndex', value || 0)}
                        min={0}
                        max={50}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                </Row>
              </TabPane>
              
              <TabPane tab="力学参数" key="mechanical">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>黏聚力 (kPa)</Text>
                      <InputNumber
                        value={layer.properties.cohesion}
                        onChange={(value) => updateParameter(layer.id, 'cohesion', value || 0)}
                        min={0}
                        max={200}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>内摩擦角 (°)</Text>
                      <InputNumber
                        value={layer.properties.friction}
                        onChange={(value) => updateParameter(layer.id, 'friction', value || 0)}
                        min={0}
                        max={50}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>弹性模量 (MPa)</Text>
                      <InputNumber
                        value={layer.properties.elasticModulus}
                        onChange={(value) => updateParameter(layer.id, 'elasticModulus', value || 0)}
                        min={1}
                        max={500}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>泊松比</Text>
                      <InputNumber
                        value={layer.properties.poissonRatio}
                        onChange={(value) => updateParameter(layer.id, 'poissonRatio', value || 0)}
                        min={0.1}
                        max={0.45}
                        step={0.001}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>压缩指数</Text>
                      <InputNumber
                        value={layer.properties.compressionIndex}
                        onChange={(value) => updateParameter(layer.id, 'compressionIndex', value || 0)}
                        min={0.01}
                        max={1.0}
                        step={0.001}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>回弹指数</Text>
                      <InputNumber
                        value={layer.properties.swellingIndex}
                        onChange={(value) => updateParameter(layer.id, 'swellingIndex', value || 0)}
                        min={0.001}
                        max={0.2}
                        step={0.0001}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="渗透参数" key="hydraulic">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>渗透系数 (cm/s)</Text>
                      <InputNumber
                        value={layer.properties.permeability}
                        onChange={(value) => updateParameter(layer.id, 'permeability', value || 0)}
                        min={1e-10}
                        max={1}
                        step={1e-6}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                        formatter={(value) => value ? value.toExponential(2) : '0'}
                      />
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>K值渗透系数 (m/s)</Text>
                      <InputNumber
                        value={layer.properties.permeabilityK}
                        onChange={(value) => updateParameter(layer.id, 'permeabilityK', value || 0)}
                        min={1e-12}
                        max={1e-2}
                        step={1e-8}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                        formatter={(value) => value ? value.toExponential(2) : '0'}
                      />
                    </Space>
                  </Col>
                </Row>
              </TabPane>

              {showAdvancedParams && (
                <TabPane tab="动力参数" key="dynamic">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>阻尼比</Text>
                        <InputNumber
                          value={layer.properties.dampingRatio}
                          onChange={(value) => updateParameter(layer.id, 'dampingRatio', value || 0)}
                          min={0.01}
                          max={0.2}
                          step={0.001}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Space>
                    </Col>
                    <Col span={12}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>最大剪切模量 (MPa)</Text>
                        <InputNumber
                          value={layer.properties.maxShearModulus}
                          onChange={(value) => updateParameter(layer.id, 'maxShearModulus', value || 0)}
                          min={1}
                          max={200}
                          step={1}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Space>
                    </Col>
                  </Row>
                </TabPane>
              )}
            </Tabs>
          );
        })()}
      </Modal>

      <style jsx>{`
        .geology-parameter-editor .row-error {
          background-color: rgba(255, 107, 107, 0.1) !important;
        }
        .geology-parameter-editor .row-modified {
          background-color: rgba(255, 193, 7, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default GeologyParameterEditor;