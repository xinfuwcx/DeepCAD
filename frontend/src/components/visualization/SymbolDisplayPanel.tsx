/**
 * 符号显示配置面板
 * 管理约束和荷载符号的显示、样式和可视化设置
 */

import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Select, InputNumber, Input, Space, Tag, 
  Divider, Row, Col, Switch, Alert, Tooltip, Popconfirm, Tabs, Slider,
  Typography, ColorPicker, Collapse, Radio, Badge, Progress
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined,
  SettingOutlined, BgColorsOutlined, AimOutlined, ThunderboltOutlined,
  CompressOutlined, ExpandOutlined, ControlOutlined, BorderOutlined,
  LockOutlined, UnlockOutlined, VerticalAlignBottomOutlined, ArrowRightOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

// 符号类型定义
export enum SymbolType {
  CONSTRAINT = 'constraint',
  LOAD = 'load'
}

export enum ConstraintSymbolType {
  FIXED = 'fixed',
  PINNED = 'pinned', 
  ROLLER = 'roller',
  ELASTIC = 'elastic',
  DISPLACEMENT_X = 'displacement_x',
  DISPLACEMENT_Y = 'displacement_y',
  DISPLACEMENT_Z = 'displacement_z'
}

export enum LoadSymbolType {
  POINT_FORCE = 'point_force',
  DISTRIBUTED_FORCE = 'distributed_force',
  MOMENT = 'moment',
  PRESSURE = 'pressure',
  SURFACE_LOAD = 'surface_load',
  TEMPERATURE_LOAD = 'temperature_load'
}

export enum SymbolStyle {
  STANDARD = 'standard',
  ENGINEERING = 'engineering', 
  SIMPLIFIED = 'simplified',
  DETAILED = 'detailed'
}

// 符号定义接口
export interface SymbolDefinition {
  id: string;
  name: string;
  type: SymbolType;
  symbol_type: ConstraintSymbolType | LoadSymbolType;
  position: number[];
  orientation?: number[];
  direction?: number[];
  magnitude?: number;
  unit?: string;
  scale: number;
  color: string;
  style: SymbolStyle;
  is_visible: boolean;
  show_label: boolean;
  show_value?: boolean;
  created_at: string;
}

interface SymbolDisplayPanelProps {
  sessionId: string;
  onSymbolChange?: (symbols: SymbolDefinition[]) => void;
}

const SymbolDisplayPanel: React.FC<SymbolDisplayPanelProps> = ({
  sessionId,
  onSymbolChange
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('constraint-symbols');
  
  // 状态管理
  const [symbols, setSymbols] = useState<SymbolDefinition[]>([]);
  const [editingSymbol, setEditingSymbol] = useState<SymbolDefinition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalStyle, setGlobalStyle] = useState<SymbolStyle>(SymbolStyle.STANDARD);
  const [globalScale, setGlobalScale] = useState(1.0);
  
  // 约束符号配置
  const getConstraintSymbolConfig = () => [
    { 
      value: ConstraintSymbolType.FIXED, 
      label: '固定支座', 
      icon: <LockOutlined />, 
      color: '#FF4D4F',
      description: '限制所有平移和转动自由度'
    },
    { 
      value: ConstraintSymbolType.PINNED, 
      label: '铰支座', 
      icon: <AimOutlined />, 
      color: '#52C41A',
      description: '限制平移自由度，允许转动'
    },
    { 
      value: ConstraintSymbolType.ROLLER, 
      label: '滚支座', 
      icon: <ControlOutlined />, 
      color: '#1890FF',
      description: '限制法向平移，允许切向移动'
    },
    { 
      value: ConstraintSymbolType.ELASTIC, 
      label: '弹性支座', 
      icon: <CompressOutlined />, 
      color: '#FA8C16',
      description: '提供弹性约束力'
    },
    { 
      value: ConstraintSymbolType.DISPLACEMENT_X, 
      label: 'X向约束', 
      icon: <ArrowRightOutlined style={{ transform: 'rotate(0deg)' }} />, 
      color: '#F759AB',
      description: '限制X方向位移'
    },
    { 
      value: ConstraintSymbolType.DISPLACEMENT_Y, 
      label: 'Y向约束', 
      icon: <ArrowRightOutlined style={{ transform: 'rotate(90deg)' }} />, 
      color: '#13C2C2',
      description: '限制Y方向位移'
    },
    { 
      value: ConstraintSymbolType.DISPLACEMENT_Z, 
      label: 'Z向约束', 
      icon: <VerticalAlignBottomOutlined />, 
      color: '#722ED1',
      description: '限制Z方向位移'
    }
  ];

  // 荷载符号配置
  const getLoadSymbolConfig = () => [
    { 
      value: LoadSymbolType.POINT_FORCE, 
      label: '集中力', 
      icon: <ThunderboltOutlined />, 
      color: '#1890FF',
      description: '作用在点上的集中力'
    },
    { 
      value: LoadSymbolType.DISTRIBUTED_FORCE, 
      label: '分布力', 
      icon: <ExpandOutlined />, 
      color: '#52C41A',
      description: '沿线或面分布的力'
    },
    { 
      value: LoadSymbolType.MOMENT, 
      label: '力矩', 
      icon: <ControlOutlined style={{ transform: 'rotate(45deg)' }} />, 
      color: '#FA8C16',
      description: '产生转动效应的力偶'
    },
    { 
      value: LoadSymbolType.PRESSURE, 
      label: '压力', 
      icon: <CompressOutlined />, 
      color: '#F759AB',
      description: '垂直于表面的压力荷载'
    },
    { 
      value: LoadSymbolType.SURFACE_LOAD, 
      label: '面荷载', 
      icon: <BorderOutlined />, 
      color: '#13C2C2',
      description: '作用在表面上的分布荷载'
    },
    { 
      value: LoadSymbolType.TEMPERATURE_LOAD, 
      label: '温度荷载', 
      icon: <BgColorsOutlined />, 
      color: '#722ED1',
      description: '由温度变化引起的荷载'
    }
  ];

  // 获取符号类型信息
  const getSymbolTypeInfo = (type: ConstraintSymbolType | LoadSymbolType, symbolCategory: SymbolType) => {
    if (symbolCategory === SymbolType.CONSTRAINT) {
      return getConstraintSymbolConfig().find(config => config.value === type);
    } else {
      return getLoadSymbolConfig().find(config => config.value === type);
    }
  };

  // 添加新符号
  const handleAddSymbol = (symbolType: SymbolType) => {
    const newSymbol: SymbolDefinition = {
      id: `${symbolType}_${Date.now()}`,
      name: `${symbolType === SymbolType.CONSTRAINT ? '约束' : '荷载'} ${symbols.filter(s => s.type === symbolType).length + 1}`,
      type: symbolType,
      symbol_type: symbolType === SymbolType.CONSTRAINT ? 
        ConstraintSymbolType.FIXED : LoadSymbolType.POINT_FORCE,
      position: [0, 0, 0],
      orientation: [0, 0, 0],
      direction: symbolType === SymbolType.LOAD ? [0, 0, -1] : undefined,
      magnitude: symbolType === SymbolType.LOAD ? 1000 : undefined,
      unit: symbolType === SymbolType.LOAD ? 'N' : undefined,
      scale: 1.0,
      color: symbolType === SymbolType.CONSTRAINT ? '#FF4D4F' : '#1890FF',
      style: globalStyle,
      is_visible: true,
      show_label: true,
      show_value: symbolType === SymbolType.LOAD,
      created_at: new Date().toISOString()
    };
    
    setEditingSymbol(newSymbol);
    setModalVisible(true);
  };

  // 编辑符号
  const handleEditSymbol = (symbol: SymbolDefinition) => {
    setEditingSymbol({...symbol});
    form.setFieldsValue(symbol);
    setModalVisible(true);
  };

  // 保存符号
  const handleSaveSymbol = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingSymbol) {
        const updatedSymbol = { ...editingSymbol, ...values };
        
        const updatedSymbols = editingSymbol.id.includes('_' + Date.now().toString().slice(-6))
          ? [...symbols, updatedSymbol]  // 新符号
          : symbols.map(s => s.id === editingSymbol.id ? updatedSymbol : s);  // 更新现有符号
        
        setSymbols(updatedSymbols);
        onSymbolChange?.(updatedSymbols);
        
        setModalVisible(false);
        setEditingSymbol(null);
        form.resetFields();
      }
    } catch (error) {
      console.error('保存符号失败:', error);
    }
  };

  // 删除符号
  const handleDeleteSymbol = (symbolId: string) => {
    const updatedSymbols = symbols.filter(s => s.id !== symbolId);
    setSymbols(updatedSymbols);
    onSymbolChange?.(updatedSymbols);
  };

  // 切换符号可见性
  const handleToggleVisibility = (symbolId: string, visible: boolean) => {
    const updatedSymbols = symbols.map(s => 
      s.id === symbolId ? { ...s, is_visible: visible } : s
    );
    setSymbols(updatedSymbols);
    onSymbolChange?.(updatedSymbols);
  };

  // 应用全局样式
  const applyGlobalStyle = () => {
    const updatedSymbols = symbols.map(s => ({ ...s, style: globalStyle, scale: s.scale * globalScale }));
    setSymbols(updatedSymbols);
    onSymbolChange?.(updatedSymbols);
  };

  // 渲染符号表格
  const renderSymbolTable = (symbolType: SymbolType) => {
    const filteredSymbols = symbols.filter(s => s.type === symbolType);
    
    const columns = [
      {
        title: '显示',
        dataIndex: 'is_visible',
        width: 60,
        render: (visible: boolean, record: SymbolDefinition) => (
          <Switch
            size="small"
            checked={visible}
            onChange={(checked) => handleToggleVisibility(record.id, checked)}
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
          />
        )
      },
      {
        title: '名称',
        dataIndex: 'name',
        width: 120,
        render: (name: string, record: SymbolDefinition) => (
          <Space>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: record.color,
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            />
            <Text strong={record.is_visible}>{name}</Text>
          </Space>
        )
      },
      {
        title: '类型',
        dataIndex: 'symbol_type',
        width: 100,
        render: (type: ConstraintSymbolType | LoadSymbolType, record: SymbolDefinition) => {
          const typeInfo = getSymbolTypeInfo(type, record.type);
          return (
            <Tag color={typeInfo?.color} icon={typeInfo?.icon}>
              {typeInfo?.label}
            </Tag>
          );
        }
      },
      {
        title: '位置',
        width: 120,
        render: (_, record: SymbolDefinition) => (
          <Text style={{ fontSize: '11px' }}>
            [{record.position.map(p => p.toFixed(1)).join(', ')}]
          </Text>
        )
      },
      ...(symbolType === SymbolType.LOAD ? [{
        title: '数值',
        width: 80,
        render: (_, record: SymbolDefinition) => (
          <Space>
            <Text>{record.magnitude?.toFixed(0)}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>{record.unit}</Text>
          </Space>
        )
      }] : []),
      {
        title: '样式',
        dataIndex: 'style',
        width: 60,
        render: (style: SymbolStyle) => (
          <Tag>{style}</Tag>
        )
      },
      {
        title: '操作',
        width: 100,
        render: (_, record: SymbolDefinition) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditSymbol(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此符号？"
              onConfirm={() => handleDeleteSymbol(record.id)}
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Space>
        )
      }
    ];

    return (
      <Table
        dataSource={filteredSymbols}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: `暂无${symbolType === SymbolType.CONSTRAINT ? '约束' : '荷载'}符号` }}
      />
    );
  };

  // 渲染编辑模态框
  const renderEditModal = () => (
    <Modal
      title={`${editingSymbol?.id.includes(Date.now().toString().slice(-6)) ? '添加' : '编辑'}${editingSymbol?.type === SymbolType.CONSTRAINT ? '约束' : '荷载'}符号`}
      open={modalVisible}
      onOk={handleSaveSymbol}
      onCancel={() => {
        setModalVisible(false);
        setEditingSymbol(null);
        form.resetFields();
      }}
      width={800}
      okText="保存"
      cancelText="取消"
    >
      {editingSymbol && (
        <Form
          form={form}
          layout="vertical"
          initialValues={editingSymbol}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="符号名称"
                rules={[{ required: true, message: '请输入符号名称' }]}
              >
                <Input placeholder="输入符号名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="symbol_type" label="符号类型">
                <Select
                  onChange={(value) => {
                    const typeInfo = getSymbolTypeInfo(value, editingSymbol.type);
                    setEditingSymbol({
                      ...editingSymbol,
                      symbol_type: value,
                      color: typeInfo?.color || editingSymbol.color
                    });
                  }}
                >
                  {(editingSymbol.type === SymbolType.CONSTRAINT ? 
                    getConstraintSymbolConfig() : getLoadSymbolConfig()).map(config => (
                    <Option key={config.value} value={config.value}>
                      <Space>
                        {config.icon}
                        {config.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={['position', 0]} label="X坐标">
                <InputNumber
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="X"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['position', 1]} label="Y坐标">
                <InputNumber
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="Y"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['position', 2]} label="Z坐标">
                <InputNumber
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="Z"
                />
              </Form.Item>
            </Col>
          </Row>

          {editingSymbol.type === SymbolType.LOAD && (
            <>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="magnitude" label="荷载大小">
                    <InputNumber
                      min={0}
                      step={100}
                      style={{ width: '100%' }}
                      placeholder="大小"
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="unit" label="单位">
                    <Select>
                      <Option value="N">N</Option>
                      <Option value="kN">kN</Option>
                      <Option value="MN">MN</Option>
                      <Option value="N/m">N/m</Option>
                      <Option value="kN/m">kN/m</Option>
                      <Option value="Pa">Pa</Option>
                      <Option value="kPa">kPa</Option>
                      <Option value="MPa">MPa</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Text>方向矢量</Text>
                  <Row gutter={8}>
                    <Col span={8}>
                      <Form.Item name={['direction', 0]} label="X">
                        <InputNumber
                          min={-1}
                          max={1}
                          step={0.1}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['direction', 1]} label="Y">
                        <InputNumber
                          min={-1}
                          max={1}
                          step={0.1}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={['direction', 2]} label="Z">
                        <InputNumber
                          min={-1}
                          max={1}
                          step={0.1}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="scale" label="缩放比例">
                <Slider
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  marks={{ 0.1: '0.1', 1: '1.0', 3: '3.0' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="color" label="颜色">
                <ColorPicker 
                  value={editingSymbol.color}
                  onChange={(color) => setEditingSymbol({
                    ...editingSymbol,
                    color: color.toHexString()
                  })}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="style" label="显示样式">
                <Select>
                  <Option value={SymbolStyle.STANDARD}>标准</Option>
                  <Option value={SymbolStyle.ENGINEERING}>工程</Option>
                  <Option value={SymbolStyle.SIMPLIFIED}>简化</Option>
                  <Option value={SymbolStyle.DETAILED}>详细</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="show_label" valuePropName="checked">
                <Switch /> 显示标签
              </Form.Item>
            </Col>
            {editingSymbol.type === SymbolType.LOAD && (
              <Col span={8}>
                <Form.Item name="show_value" valuePropName="checked">
                  <Switch /> 显示数值
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
      )}
    </Modal>
  );

  return (
    <div style={{ fontSize: '12px' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        tabBarStyle={{ marginBottom: '8px' }}
      >
        <TabPane
          tab={
            <Space size={4}>
              <LockOutlined style={{ fontSize: '12px' }} />
              约束符号
              <Badge count={symbols.filter(s => s.type === SymbolType.CONSTRAINT && s.is_visible).length} size="small" />
            </Space>
          }
          key="constraint-symbols"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card
              title="约束符号管理"
              size="small"
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddSymbol(SymbolType.CONSTRAINT)}
                >
                  添加约束符号
                </Button>
              }
            >
              {renderSymbolTable(SymbolType.CONSTRAINT)}
            </Card>
          </Space>
        </TabPane>

        <TabPane
          tab={
            <Space size={4}>
              <ThunderboltOutlined style={{ fontSize: '12px' }} />
              荷载符号
              <Badge count={symbols.filter(s => s.type === SymbolType.LOAD && s.is_visible).length} size="small" />
            </Space>
          }
          key="load-symbols"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card
              title="荷载符号管理"
              size="small"
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddSymbol(SymbolType.LOAD)}
                >
                  添加荷载符号
                </Button>
              }
            >
              {renderSymbolTable(SymbolType.LOAD)}
            </Card>
          </Space>
        </TabPane>

        <TabPane
          tab={<Space size={4}><SettingOutlined style={{ fontSize: '12px' }} />全局设置</Space>}
          key="global-settings"
        >
          <Card title="全局符号设置" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>全局显示样式</Text>
                    <Select
                      value={globalStyle}
                      onChange={setGlobalStyle}
                      style={{ width: '100%', marginTop: '8px' }}
                    >
                      <Option value={SymbolStyle.STANDARD}>标准样式</Option>
                      <Option value={SymbolStyle.ENGINEERING}>工程样式</Option>
                      <Option value={SymbolStyle.SIMPLIFIED}>简化样式</Option>
                      <Option value={SymbolStyle.DETAILED}>详细样式</Option>
                    </Select>
                  </div>
                  
                  <div>
                    <Text>全局缩放比例: {globalScale.toFixed(1)}</Text>
                    <Slider
                      value={globalScale}
                      onChange={setGlobalScale}
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      marks={{ 0.1: '0.1', 1: '1.0', 3: '3.0' }}
                      style={{ marginTop: '8px' }}
                    />
                  </div>
                  
                  <Button
                    type="primary"
                    icon={<SettingOutlined />}
                    onClick={applyGlobalStyle}
                    style={{ marginTop: '16px' }}
                  >
                    应用全局设置
                  </Button>
                </Space>
              </Col>
              
              <Col span={12}>
                <Alert
                  message="符号显示统计"
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text>约束符号: </Text>
                        <Tag color="red">
                          {symbols.filter(s => s.type === SymbolType.CONSTRAINT).length} 个
                        </Tag>
                        <Text>（{symbols.filter(s => s.type === SymbolType.CONSTRAINT && s.is_visible).length} 可见）</Text>
                      </div>
                      <div>
                        <Text>荷载符号: </Text>
                        <Tag color="blue">
                          {symbols.filter(s => s.type === SymbolType.LOAD).length} 个
                        </Tag>
                        <Text>（{symbols.filter(s => s.type === SymbolType.LOAD && s.is_visible).length} 可见）</Text>
                      </div>
                      <div>
                        <Text>总计: </Text>
                        <Tag color="green">{symbols.length} 个符号</Tag>
                      </div>
                    </Space>
                  }
                  type="info"
                  showIcon
                />
              </Col>
            </Row>
          </Card>
        </TabPane>
      </Tabs>

      {renderEditModal()}
    </div>
  );
};

export default SymbolDisplayPanel;