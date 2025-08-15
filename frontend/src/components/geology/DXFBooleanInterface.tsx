/**
 * DXF导入与土体布尔运算界面 - 2号几何专家开发
 * P0优先级任务 - 专业级CAD文件导入和几何布尔运算集成
 * 基于1号架构师规划和3号专家的几何算法要求
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Upload, Button, Space, Typography, Row, Col, 
  Select, Switch, Progress, Alert, Table, Tag, Tooltip,
  Modal, Form, InputNumber, Divider, Tree, Checkbox,
  message, Steps, List, Timeline, Tabs
} from 'antd';
import { 
  UploadOutlined, FolderOpenOutlined, ScissorOutlined,
  BorderOutlined, InteractionOutlined, NodeIndexOutlined,
  EyeOutlined, SettingOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, PlayCircleOutlined,
  PauseCircleOutlined, RedoOutlined, FileSearchOutlined,
  ThunderboltOutlined, BulbOutlined, CalculatorOutlined
} from '@ant-design/icons';
import type { UploadFile, TreeDataNode } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Step } = Steps;

// DXF文件解析结果
interface DXFParseResult {
  fileName: string;
  fileSize: number;
  entities: DXFEntity[];
  layers: DXFLayer[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ?: number;
    maxZ?: number;
  };
  units: string;
  version: string;
  parseTime: number;
  warnings: string[];
  errors: string[];
}

interface DXFEntity {
  id: string;
  type: 'LINE' | 'POLYLINE' | 'CIRCLE' | 'ARC' | 'SPLINE' | 'SOLID' | 'REGION';
  layer: string;
  color: string;
  coordinates: number[][];
  properties: Record<string, any>;
  isValid: boolean;
  isClosed?: boolean;
}

interface DXFLayer {
  name: string;
  color: string;
  visible: boolean;
  frozen: boolean;
  entityCount: number;
  entityTypes: string[];
}

// 布尔运算配置
interface BooleanOperationConfig {
  operation: 'union' | 'intersection' | 'difference' | 'xor';
  operandA: string[]; // 实体ID列表
  operandB: string[]; // 实体ID列表
  tolerance: number;
  preserveOriginal: boolean;
  generateMesh: boolean;
  meshResolution: number;
  quality: 'draft' | 'standard' | 'precision';
}

// 土体布尔运算结果
interface SoilBooleanResult {
  id: string;
  operationType: string;
  resultEntities: DXFEntity[];
  volume?: number;
  area?: number;
  processingTime: number;
  meshQuality?: {
    elementCount: number;
    averageQuality: number;
    minAngle: number;
    maxAngle: number;
  };
  warnings: string[];
  success: boolean;
}

interface DXFBooleanInterfaceProps {
  onDXFImported?: (result: DXFParseResult) => void;
  onBooleanCompleted?: (result: SoilBooleanResult) => void;
  onGeometryExport?: (entities: DXFEntity[], format: 'dxf' | 'step' | 'iges') => void;
  showAdvancedOptions?: boolean;
}

const DXFBooleanInterface: React.FC<DXFBooleanInterfaceProps> = ({
  onDXFImported,
  onBooleanCompleted,
  onGeometryExport,
  showAdvancedOptions = true
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [dxfFiles, setDxfFiles] = useState<DXFParseResult[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [booleanConfig, setBooleanConfig] = useState<BooleanOperationConfig>({
    operation: 'union',
    operandA: [],
    operandB: [],
    tolerance: 0.001,
    preserveOriginal: true,
    generateMesh: true,
    meshResolution: 2.0,
    quality: 'standard'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [booleanResults, setBooleanResults] = useState<SoilBooleanResult[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('2d');
  const [operationHistory, setOperationHistory] = useState<string[]>([]);

  // DXF文件上传处理
  const handleDXFUpload = async (file: UploadFile) => {
    if (!file.originFileObj) return false;

    const formData = new FormData();
    formData.append('dxf', file.originFileObj);

    setIsProcessing(true);
    setProcessingProgress(10);

    try {
      // 模拟DXF解析过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingProgress(50);

      // 模拟解析结果
      const mockResult: DXFParseResult = {
        fileName: file.name!,
        fileSize: file.size!,
        entities: generateMockEntities(),
        layers: generateMockLayers(),
        bounds: { minX: -100, maxX: 100, minY: -100, maxY: 100, minZ: 0, maxZ: 50 },
        units: 'meters',
        version: 'AutoCAD R14',
        parseTime: 1.5,
        warnings: ['部分实体缺少Z坐标，已设为0'],
        errors: []
      };

      setProcessingProgress(100);
      setDxfFiles(prev => [...prev, mockResult]);
      
      if (onDXFImported) {
        onDXFImported(mockResult);
      }

      message.success(`DXF文件解析成功: ${mockResult.entities.length}个实体`);
      setActiveStep(1);
      
    } catch (error) {
      message.error('DXF文件解析失败');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }

    return false; // 阻止自动上传
  };

  // 生成模拟实体数据
  const generateMockEntities = (): DXFEntity[] => {
    const entities: DXFEntity[] = [];
    const types: DXFEntity['type'][] = ['POLYLINE', 'CIRCLE', 'LINE', 'REGION'];
    
    for (let i = 0; i < 15; i++) {
      entities.push({
        id: `entity_${i + 1}`,
        type: types[i % types.length],
        layer: `Layer_${Math.floor(i / 3) + 1}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        coordinates: generateMockCoordinates(types[i % types.length]),
        properties: {
          area: Math.random() * 100 + 10,
          perimeter: Math.random() * 50 + 20
        },
        isValid: Math.random() > 0.1,
        isClosed: types[i % types.length] === 'POLYLINE' || types[i % types.length] === 'CIRCLE'
      });
    }
    
    return entities;
  };

  const generateMockCoordinates = (type: DXFEntity['type']): number[][] => {
    switch (type) {
      case 'CIRCLE':
        return [[Math.random() * 100 - 50, Math.random() * 100 - 50, 0, Math.random() * 20 + 5]];
      case 'LINE':
        return [
          [Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
          [Math.random() * 100 - 50, Math.random() * 100 - 50, 0]
        ];
      case 'POLYLINE':
        const points = [];
        for (let i = 0; i < 6; i++) {
          points.push([Math.random() * 100 - 50, Math.random() * 100 - 50, 0]);
        }
        return points;
      default:
        return [[0, 0, 0]];
    }
  };

  const generateMockLayers = (): DXFLayer[] => {
    return [
      { name: 'Layer_1', color: '#FF6B6B', visible: true, frozen: false, entityCount: 5, entityTypes: ['POLYLINE', 'CIRCLE'] },
      { name: 'Layer_2', color: '#4ECDC4', visible: true, frozen: false, entityCount: 4, entityTypes: ['LINE', 'REGION'] },
      { name: 'Layer_3', color: '#45B7D1', visible: true, frozen: false, entityCount: 3, entityTypes: ['POLYLINE'] },
      { name: 'Layer_4', color: '#96CEB4', visible: false, frozen: false, entityCount: 2, entityTypes: ['CIRCLE'] },
      { name: 'Layer_5', color: '#FECA57', visible: true, frozen: true, entityCount: 1, entityTypes: ['REGION'] }
    ];
  };

  // 执行布尔运算
  const executeBooleanOperation = async () => {
    if (booleanConfig.operandA.length === 0 || booleanConfig.operandB.length === 0) {
      message.warning('请至少选择两组实体进行布尔运算');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      // 模拟运算过程
      for (let i = 0; i <= 100; i += 10) {
        setProcessingProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const mockResult: SoilBooleanResult = {
        id: `bool_${Date.now()}`,
        operationType: booleanConfig.operation,
        resultEntities: generateMockEntities().slice(0, 3),
        volume: Math.random() * 1000 + 100,
        area: Math.random() * 500 + 50,
        processingTime: 2.3,
        meshQuality: booleanConfig.generateMesh ? {
          elementCount: Math.floor(Math.random() * 10000 + 5000),
          averageQuality: Math.random() * 0.3 + 0.7,
          minAngle: Math.random() * 20 + 30,
          maxAngle: Math.random() * 30 + 120
        } : undefined,
        warnings: ['部分边界可能需要手动调整'],
        success: true
      };

      setBooleanResults(prev => [...prev, mockResult]);
      
      // 记录操作历史
      const historyEntry = `${booleanConfig.operation}: ${booleanConfig.operandA.length}个实体 ${booleanConfig.operation} ${booleanConfig.operandB.length}个实体`;
      setOperationHistory(prev => [...prev, historyEntry]);

      if (onBooleanCompleted) {
        onBooleanCompleted(mockResult);
      }

      message.success('布尔运算完成');
      setActiveStep(2);
      
    } catch (error) {
      message.error('布尔运算失败');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // 实体选择树数据
  const entityTreeData: TreeDataNode[] = useMemo(() => {
    if (dxfFiles.length === 0) return [];

    return dxfFiles.map(file => ({
      title: (
        <Space>
          <FileSearchOutlined />
          <Text strong>{file.fileName}</Text>
          <Tag color="blue">{file.entities.length}个实体</Tag>
        </Space>
      ),
      key: file.fileName,
      children: file.layers
        .filter(layer => selectedLayer === 'all' || layer.name === selectedLayer)
        .map(layer => ({
          title: (
            <Space>
              <div 
                style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: layer.color,
                  borderRadius: '2px'
                }} 
              />
              <Text>{layer.name}</Text>
              <Tag>{layer.entityCount}</Tag>
            </Space>
          ),
          key: `${file.fileName}-${layer.name}`,
          children: file.entities
            .filter(entity => entity.layer === layer.name)
            .map(entity => ({
              title: (
                <Space>
                  <Text style={{ fontSize: '12px' }}>{entity.type}</Text>
                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    ID: {entity.id}
                  </Text>
                  {!entity.isValid && (
                    <ExclamationCircleOutlined style={{ color: 'var(--error-color)' }} />
                  )}
                </Space>
              ),
              key: entity.id,
              isLeaf: true
            }))
        }))
    }));
  }, [dxfFiles, selectedLayer]);

  // 实体表格列
  const entityTableColumns = [
    {
      title: '实体ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Text code style={{ fontSize: '11px' }}>{id}</Text>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
  <Tag color="purple">{type}</Tag>
      )
    },
    {
      title: '图层',
      dataIndex: 'layer',
      key: 'layer',
      width: 100,
      render: (layer: string, record: DXFEntity) => (
        <Space>
          <div 
            style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: record.color,
              borderRadius: '2px'
            }} 
          />
          <Text style={{ fontSize: '11px' }}>{layer}</Text>
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: any, record: DXFEntity) => (
        <Space>
          {record.isValid ? (
            <CheckCircleOutlined style={{ color: 'var(--success-color)' }} />
          ) : (
            <ExclamationCircleOutlined style={{ color: 'var(--error-color)' }} />
          )}
          {record.isClosed && (
            <Tooltip title="闭合实体">
              <BorderOutlined style={{ color: 'var(--primary-color)' }} />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '属性',
      key: 'properties',
      render: (_: any, record: DXFEntity) => (
        <Space direction="vertical" size={0}>
          {record.properties.area && (
            <Text style={{ fontSize: '10px' }}>
              面积: {record.properties.area.toFixed(1)}
            </Text>
          )}
          {record.properties.perimeter && (
            <Text style={{ fontSize: '10px' }}>
              周长: {record.properties.perimeter.toFixed(1)}
            </Text>
          )}
        </Space>
      )
    }
  ];

  // 获取所有实体（用于表格显示）
  const allEntities = useMemo(() => {
    return dxfFiles.flatMap(file => 
      file.entities.filter(entity => 
        selectedLayer === 'all' || entity.layer === selectedLayer
      )
    );
  }, [dxfFiles, selectedLayer]);

  return (
    <div className="dxf-boolean-interface">
      {/* 头部进度 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Steps 
          current={activeStep} 
          size="small"
          items={[
            {
              title: 'DXF导入',
              description: 'CAD文件解析',
              icon: <UploadOutlined />
            },
            {
              title: '实体选择',
              description: '几何实体筛选',
              icon: <FolderOpenOutlined />
            },
            {
              title: '布尔运算',
              description: '土体几何运算',
              icon: <ScissorOutlined />
            }
          ]}
        />
      </Card>

      {/* 处理进度 */}
      {isProcessing && (
        <Alert
          message="正在处理"
          description={
            <Progress 
              percent={processingProgress} 
              size="small"
              format={(percent) => `${percent}%`}
            />
          }
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Row gutter={16}>
        {/* 左侧：文件管理和实体选择 */}
        <Col span={12}>
          {/* DXF文件导入 */}
          <Card 
            title={
              <Space>
                <UploadOutlined />
                <span>DXF文件导入</span>
                <Tag color="green">{dxfFiles.length}个文件</Tag>
              </Space>
            }
            size="small" 
            style={{ marginBottom: '16px' }}
          >
            <Upload.Dragger
              capture={false}
                                hasControlInside={false}
                                pastable={false}
                                accept=".dxf,.dwg"
              multiple
              showUploadList={false}
              beforeUpload={handleDXFUpload}
              disabled={isProcessing}>
              <p className="ant-upload-drag-icon">
                <FolderOpenOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽DXF/DWG文件到此区域</p>
              <p className="ant-upload-hint">
                支持AutoCAD R12-R2021格式，单个文件不超过50MB
              </p>
            </Upload.Dragger>

            {dxfFiles.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <Text strong>已导入文件:</Text>
                <List
                  size="small"
                  dataSource={dxfFiles}
                  renderItem={file => (
                    <List.Item>
                      <Space>
                        <FileSearchOutlined style={{ color: 'var(--primary-color)' }} />
                        <Text>{file.fileName}</Text>
                        <Tag color="blue">{file.entities.length}个实体</Tag>
                        <Tag color="green">{file.layers.length}个图层</Tag>
                        {file.warnings.length > 0 && (
                          <Tooltip title={file.warnings.join('; ')}>
                            <ExclamationCircleOutlined style={{ color: 'var(--warning-color)' }} />
                          </Tooltip>
                        )}
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Card>

          {/* 实体选择和筛选 */}
          {dxfFiles.length > 0 && (
            <Card 
              title={
                <Space>
                  <FolderOpenOutlined />
                  <span>实体选择</span>
                  <Tag color="purple">{selectedEntities.length}个已选</Tag>
                </Space>
              }
              size="small"
              extra={
                <Space>
                  <Text style={{ fontSize: '12px' }}>图层筛选:</Text>
                  <Select
                    size="small"
                    value={selectedLayer}
                    onChange={setSelectedLayer}
                    style={{ width: 120 }}
                  >
                    <Option value="all">全部图层</Option>
                    {dxfFiles.flatMap(file => file.layers).map(layer => (
                      <Option key={layer.name} value={layer.name}>
                        <Space>
                          <div 
                            style={{ 
                              width: '8px', 
                              height: '8px', 
                              backgroundColor: layer.color,
                              borderRadius: '2px'
                            }} 
                          />
                          {layer.name}
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Space>
              }
            >
              <Tabs size="small" items={[
                {
                  key: 'tree',
                  label: '树形视图',
                  children: (
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <Tree
                        checkable
                        treeData={entityTreeData}
                        checkedKeys={selectedEntities}
                        onCheck={(checkedKeys) => {
                          setSelectedEntities(checkedKeys as string[]);
                        }}
                        height={250}
                      />
                    </div>
                  )
                },
                {
                  key: 'table',
                  label: '表格视图',
                  children: (
                    <Table
                      columns={entityTableColumns}
                      dataSource={allEntities}
                      rowKey="id"
                      size="small"
                      scroll={{ y: 250 }}
                      pagination={{ pageSize: 10, size: 'small' }}
                      rowSelection={{
                        selectedRowKeys: selectedEntities,
                        onChange: (selectedRowKeys) => {
                          setSelectedEntities(selectedRowKeys as string[]);
                        }
                      }}
                    />
                  )
                }
              ]} />
            </Card>
          )}
        </Col>

        {/* 右侧：布尔运算配置和结果 */}
        <Col span={12}>
          {/* 布尔运算配置 */}
          <Card 
            title={
              <Space>
                <ScissorOutlined />
                <span>布尔运算配置</span>
              </Space>
            }
            size="small" 
            style={{ marginBottom: '16px' }}
          >
            <Form layout="vertical" size="small">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="运算类型">
                    <Select
                      value={booleanConfig.operation}
                      onChange={(value) => setBooleanConfig(prev => ({...prev, operation: value}))}
                    >
                      <Option value="union">
                        <Space><NodeIndexOutlined />并集</Space>
                      </Option>
                      <Option value="intersection">
                        <Space><InteractionOutlined />交集</Space>
                      </Option>
                      <Option value="difference">
                        <Space><ScissorOutlined />差集</Space>
                      </Option>
                      <Option value="xor">
                        <Space><BorderOutlined />异或</Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="质量等级">
                    <Select
                      value={booleanConfig.quality}
                      onChange={(value) => setBooleanConfig(prev => ({...prev, quality: value}))}
                    >
                      <Option value="draft">草图</Option>
                      <Option value="standard">标准</Option>
                      <Option value="precision">精密</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="计算容差">
                    <InputNumber
                      value={booleanConfig.tolerance}
                      onChange={(value) => setBooleanConfig(prev => ({...prev, tolerance: value || 0.001}))}
                      min={0.0001}
                      max={1}
                      step={0.0001}
                      style={{ width: '100%' }}
                      formatter={(value) => `${value} mm`}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="网格分辨率">
                    <InputNumber
                      value={booleanConfig.meshResolution}
                      onChange={(value) => setBooleanConfig(prev => ({...prev, meshResolution: value || 2.0}))}
                      min={0.5}
                      max={10}
                      step={0.5}
                      style={{ width: '100%' }}
                      formatter={(value) => `${value} m`}
                      disabled={!booleanConfig.generateMesh}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item>
                    <Checkbox
                      checked={booleanConfig.preserveOriginal}
                      onChange={(e) => setBooleanConfig(prev => ({...prev, preserveOriginal: e.target.checked}))}
                    >
                      保留原始实体
                    </Checkbox>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item>
                    <Checkbox
                      checked={booleanConfig.generateMesh}
                      onChange={(e) => setBooleanConfig(prev => ({...prev, generateMesh: e.target.checked}))}
                    >
                      生成有限元网格
                    </Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Divider style={{ margin: '12px 0' }} />

            {/* 操作数配置 */}
            <Row gutter={12}>
              <Col span={12}>
                <Card size="small" title="操作数A" style={{ height: '120px' }}>
                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    已选择 {booleanConfig.operandA.length} 个实体
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <Button 
                      size="small" 
                      block
                      onClick={() => setBooleanConfig(prev => ({
                        ...prev, 
                        operandA: selectedEntities.slice(0, Math.ceil(selectedEntities.length / 2))
                      }))}
                    >
                      使用选中实体（前半部分）
                    </Button>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="操作数B" style={{ height: '120px' }}>
                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    已选择 {booleanConfig.operandB.length} 个实体
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <Button 
                      size="small" 
                      block
                      onClick={() => setBooleanConfig(prev => ({
                        ...prev, 
                        operandB: selectedEntities.slice(Math.ceil(selectedEntities.length / 2))
                      }))}
                    >
                      使用选中实体（后半部分）
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 执行按钮 */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={executeBooleanOperation}
                  loading={isProcessing}
                  disabled={selectedEntities.length < 2}
                  size="large"
                >
                  执行布尔运算
                </Button>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => message.info('预览功能开发中')}
                  disabled={selectedEntities.length === 0}
                >
                  预览
                </Button>
              </Space>
            </div>
          </Card>

          {/* 运算结果和历史 */}
          {(booleanResults.length > 0 || operationHistory.length > 0) && (
            <Card 
              title={
                <Space>
                  <CalculatorOutlined />
                  <span>运算结果</span>
                  <Tag color="green">{booleanResults.length}个结果</Tag>
                </Space>
              }
              size="small"
            >
              <Tabs size="small" items={[
                {
                  key: 'results',
                  label: '结果详情',
                  children: (
                    <List
                      size="small"
                      dataSource={booleanResults}
                      renderItem={result => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <Space>
                                <CheckCircleOutlined style={{ color: 'var(--success-color)' }} />
                                <Text strong>{result.operationType.toUpperCase()}</Text>
                                <Tag>{result.resultEntities.length}个实体</Tag>
                              </Space>
                              <Text style={{ fontSize: '11px' }}>
                                {result.processingTime.toFixed(1)}s
                              </Text>
                            </Space>
                            <Row gutter={16} style={{ marginTop: '8px' }}>
                              <Col span={8}>
                                <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  体积: {result.volume?.toFixed(1)} m³
                                </Text>
                              </Col>
                              <Col span={8}>
                                <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  面积: {result.area?.toFixed(1)} m²
                                </Text>
                              </Col>
                              <Col span={8}>
                                {result.meshQuality && (
                                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    网格: {result.meshQuality.elementCount}个单元
                                  </Text>
                                )}
                              </Col>
                            </Row>
                          </div>
                        </List.Item>
                      )}
                    />
                  )
                },
                {
                  key: 'history',
                  label: '操作历史',
                  children: (
                    <Timeline
                      size="small"
                      items={operationHistory.map((entry, index) => ({
                        children: (
                          <Text style={{ fontSize: '12px' }}>{entry}</Text>
                        )
                      }))}
                    />
                  )
                }
              ]} />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default DXFBooleanInterface;