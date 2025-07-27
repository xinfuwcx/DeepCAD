/**
 * Fragment土体切割配置面板
 * 专门用于配置Fragment操作，支持基坑开挖、桩基等土体域切割
 */

import React, { useState, useEffect } from 'react';
import {
  Card, Form, Row, Col, Space, Button, Table, Select, InputNumber, Input,
  Alert, Divider, Typography, Tag, Popconfirm, Modal, Tooltip, Switch,
  Collapse, Steps, Timeline, Drawer, Tabs
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  ScissorOutlined, AppstoreOutlined, SettingOutlined,
  ExclamationOutlined, BuildOutlined, GlobalOutlined,
  SaveOutlined, PlayCircleOutlined, StopOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Panel } = Collapse;
const { Step } = Steps;
const { TabPane } = Tabs;

// 定义接口
interface FragmentGeometry {
  type: 'box' | 'cylinder' | 'polygon' | 'complex';
  geometry: {
    [key: string]: any;
  };
}

interface DomainFragment {
  id: string;
  name: string;
  fragment_type: 'excavation' | 'structure' | 'soil_domain';
  geometry: FragmentGeometry;
  mesh_properties: {
    element_size: number;
    element_type: string;
    mesh_density: string;
  };
  enabled: boolean;
  priority: number;
}

interface FragmentRequest {
  boundingBoxMin: number[];
  boundingBoxMax: number[];
  meshSize: number;
  clientId: string;
  enable_fragment: boolean;
  domain_fragments: DomainFragment[];
  global_mesh_settings: {
    element_type: string;
    default_element_size: number;
    mesh_quality: string;
    mesh_smoothing: boolean;
  };
}

interface FragmentConfigPanelProps {
  onFragmentConfigChange?: (config: FragmentRequest) => void;
}

const FragmentConfigPanel: React.FC<FragmentConfigPanelProps> = ({
  onFragmentConfigChange
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('fragments');
  
  // 状态管理
  const [fragments, setFragments] = useState<DomainFragment[]>([]);
  const [enableFragment, setEnableFragment] = useState(false);
  const [editingFragment, setEditingFragment] = useState<DomainFragment | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewDrawerVisible, setPreviewDrawerVisible] = useState(false);
  
  // 全局设置
  const [globalSettings, setGlobalSettings] = useState({
    boundingBoxMin: [-25, -25, -15],
    boundingBoxMax: [25, 25, 5],
    meshSize: 2.0,
    element_type: 'tetrahedral',
    default_element_size: 2.0,
    mesh_quality: 'medium',
    mesh_smoothing: true
  });

  // 预设模板
  const getFragmentTemplates = () => [
    {
      key: 'excavation_box',
      name: '基坑开挖(立方体)',
      description: '标准基坑开挖区域',
      template: {
        fragment_type: 'excavation' as const,
        geometry: {
          type: 'box' as const,
          geometry: {
            x: -10, y: -8, z: -5,
            width: 20, length: 16, depth: 5
          }
        },
        mesh_properties: {
          element_size: 1.0,
          element_type: 'tetrahedral',
          mesh_density: 'fine'
        }
      }
    },
    {
      key: 'pile_cylinder',
      name: '圆形桩基',
      description: '钻孔灌注桩或预制桩',
      template: {
        fragment_type: 'structure' as const,
        geometry: {
          type: 'cylinder' as const,
          geometry: {
            x: 0, y: 0, center_z: -10,
            radius: 0.6, height: 15
          }
        },
        mesh_properties: {
          element_size: 0.5,
          element_type: 'tetrahedral',
          mesh_density: 'very_fine'
        }
      }
    },
    {
      key: 'diaphragm_wall',
      name: '地下连续墙',
      description: '地下连续墙结构',
      template: {
        fragment_type: 'structure' as const,
        geometry: {
          type: 'box' as const,
          geometry: {
            x: -15, y: -0.6, z: -20,
            width: 30, length: 1.2, depth: 20
          }
        },
        mesh_properties: {
          element_size: 0.8,
          element_type: 'tetrahedral',
          mesh_density: 'fine'
        }
      }
    }
  ];

  // 添加Fragment
  const addFragment = (template?: any) => {
    const newFragment: DomainFragment = {
      id: `fragment_${Date.now()}`,
      name: template ? template.name : `Fragment ${fragments.length + 1}`,
      fragment_type: template ? template.template.fragment_type : 'excavation',
      geometry: template ? template.template.geometry : {
        type: 'box',
        geometry: {
          x: 0, y: 0, z: 0,
          width: 10, length: 10, depth: 5
        }
      },
      mesh_properties: template ? template.template.mesh_properties : {
        element_size: 2.0,
        element_type: 'tetrahedral',
        mesh_density: 'medium'
      },
      enabled: true,
      priority: fragments.length + 1
    };
    
    setFragments([...fragments, newFragment]);
    notifyConfigChange([...fragments, newFragment]);
  };

  // 更新Fragment
  const updateFragment = (id: string, updates: Partial<DomainFragment>) => {
    const updatedFragments = fragments.map(fragment => 
      fragment.id === id ? { ...fragment, ...updates } : fragment
    );
    setFragments(updatedFragments);
    notifyConfigChange(updatedFragments);
  };

  // 删除Fragment
  const removeFragment = (id: string) => {
    const updatedFragments = fragments.filter(fragment => fragment.id !== id);
    setFragments(updatedFragments);
    notifyConfigChange(updatedFragments);
  };

  // 编辑Fragment
  const editFragment = (fragment: DomainFragment) => {
    setEditingFragment({...fragment});
    setEditModalVisible(true);
  };

  // 保存编辑
  const saveFragmentEdit = () => {
    if (editingFragment) {
      updateFragment(editingFragment.id, editingFragment);
      setEditModalVisible(false);
      setEditingFragment(null);
    }
  };

  // 通知配置变化
  const notifyConfigChange = (updatedFragments: DomainFragment[]) => {
    if (onFragmentConfigChange) {
      const config: FragmentRequest = {
        boundingBoxMin: globalSettings.boundingBoxMin,
        boundingBoxMax: globalSettings.boundingBoxMax,
        meshSize: globalSettings.meshSize,
        clientId: 'fragment_client',
        enable_fragment: enableFragment,
        domain_fragments: updatedFragments,
        global_mesh_settings: {
          element_type: globalSettings.element_type,
          default_element_size: globalSettings.default_element_size,
          mesh_quality: globalSettings.mesh_quality,
          mesh_smoothing: globalSettings.mesh_smoothing
        }
      };
      onFragmentConfigChange(config);
    }
  };

  // 获取Fragment类型颜色
  const getFragmentTypeColor = (type: string) => {
    switch (type) {
      case 'excavation': return 'red';
      case 'structure': return 'blue';
      case 'soil_domain': return 'green';
      default: return 'default';
    }
  };

  // 获取Fragment类型名称
  const getFragmentTypeName = (type: string) => {
    switch (type) {
      case 'excavation': return '开挖区域';
      case 'structure': return '结构体';
      case 'soil_domain': return '土体域';
      default: return '未知';
    }
  };

  // 渲染Fragment列表
  const renderFragmentList = () => {
    const columns = [
      {
        title: '启用',
        dataIndex: 'enabled',
        width: 60,
        render: (enabled: boolean, record: DomainFragment) => (
          <Switch
            size="small"
            checked={enabled}
            onChange={(checked) => updateFragment(record.id, { enabled: checked })}
          />
        )
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        width: 70,
        render: (priority: number, record: DomainFragment) => (
          <InputNumber
            size="small"
            value={priority}
            min={1}
            max={99}
            onChange={(value) => updateFragment(record.id, { priority: value || 1 })}
            style={{ width: '100%' }}
          />
        )
      },
      {
        title: '名称',
        dataIndex: 'name',
        width: 150,
        render: (name: string, record: DomainFragment) => (
          <Input
            size="small"
            value={name}
            onChange={(e) => updateFragment(record.id, { name: e.target.value })}
            bordered={false}
          />
        )
      },
      {
        title: '类型',
        dataIndex: 'fragment_type',
        width: 120,
        render: (type: string) => (
          <Tag color={getFragmentTypeColor(type)}>
            {getFragmentTypeName(type)}
          </Tag>
        )
      },
      {
        title: '几何类型',
        dataIndex: ['geometry', 'type'],
        width: 100,
        render: (type: string) => (
          <Tag>{type === 'box' ? '立方体' : type === 'cylinder' ? '圆柱体' : type}</Tag>
        )
      },
      {
        title: '单元尺寸',
        dataIndex: ['mesh_properties', 'element_size'],
        width: 100,
        render: (size: number, record: DomainFragment) => (
          <InputNumber
            size="small"
            value={size}
            min={0.1}
            step={0.1}
            onChange={(value) => updateFragment(record.id, {
              mesh_properties: { 
                ...record.mesh_properties, 
                element_size: value || 1.0 
              }
            })}
            addonAfter="m"
            style={{ width: '100%' }}
          />
        )
      },
      {
        title: '操作',
        width: 120,
        render: (_: any, record: DomainFragment) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => editFragment(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此Fragment？"
              onConfirm={() => removeFragment(record.id)}
              okText="确定"
              cancelText="取消"
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
      <Card
        title={
          <Space>
            <ScissorOutlined />
            Fragment切割配置
            <Tag color="blue">{fragments.length} 个</Tag>
          </Space>
        }
        size="small"
        extra={
          <Space>
            <Switch
              checked={enableFragment}
              onChange={setEnableFragment}
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => addFragment()}
            >
              添加Fragment
            </Button>
          </Space>
        }
      >
        {!enableFragment && (
          <Alert
            message="Fragment功能已禁用"
            description="启用Fragment功能以配置土体域切割操作"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Table
          dataSource={fragments}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无Fragment配置' }}
        />
      </Card>
    );
  };

  // 渲染模板选择
  const renderTemplateSelection = () => (
    <Card title={<Space><AppstoreOutlined />Fragment模板</Space>} size="small">
      <Alert
        message="快速创建常用Fragment"
        description="选择预设模板可以快速创建常用的基坑、桩基等Fragment配置"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={[16, 16]}>
        {getFragmentTemplates().map((template) => (
          <Col span={8} key={template.key}>
            <Card
              size="small"
              hoverable
              onClick={() => addFragment(template)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'center' }}>
                <Title level={5} style={{ margin: '0 0 8px 0' }}>
                  {template.name}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {template.description}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );

  // 渲染全局设置
  const renderGlobalSettings = () => (
    <Card title={<Space><SettingOutlined />全局设置</Space>} size="small">
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="土体域范围 - 最小点">
            <Space.Compact>
              <InputNumber
                placeholder="X"
                value={globalSettings.boundingBoxMin[0]}
                onChange={(value) => setGlobalSettings({
                  ...globalSettings,
                  boundingBoxMin: [value || -25, globalSettings.boundingBoxMin[1], globalSettings.boundingBoxMin[2]]
                })}
                style={{ width: '33%' }}
              />
              <InputNumber
                placeholder="Y"
                value={globalSettings.boundingBoxMin[1]}
                onChange={(value) => setGlobalSettings({
                  ...globalSettings,
                  boundingBoxMin: [globalSettings.boundingBoxMin[0], value || -25, globalSettings.boundingBoxMin[2]]
                })}
                style={{ width: '33%' }}
              />
              <InputNumber
                placeholder="Z"
                value={globalSettings.boundingBoxMin[2]}
                onChange={(value) => setGlobalSettings({
                  ...globalSettings,
                  boundingBoxMin: [globalSettings.boundingBoxMin[0], globalSettings.boundingBoxMin[1], value || -15]
                })}
                style={{ width: '34%' }}
              />
            </Space.Compact>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="土体域范围 - 最大点">
            <Space.Compact>
              <InputNumber
                placeholder="X"
                value={globalSettings.boundingBoxMax[0]}
                onChange={(value) => setGlobalSettings({
                  ...globalSettings,
                  boundingBoxMax: [value || 25, globalSettings.boundingBoxMax[1], globalSettings.boundingBoxMax[2]]
                })}
                style={{ width: '33%' }}
              />
              <InputNumber
                placeholder="Y"
                value={globalSettings.boundingBoxMax[1]}
                onChange={(value) => setGlobalSettings({
                  ...globalSettings,
                  boundingBoxMax: [globalSettings.boundingBoxMax[0], value || 25, globalSettings.boundingBoxMax[2]]
                })}
                style={{ width: '33%' }}
              />
              <InputNumber
                placeholder="Z"
                value={globalSettings.boundingBoxMax[2]}
                onChange={(value) => setGlobalSettings({
                  ...globalSettings,
                  boundingBoxMax: [globalSettings.boundingBoxMax[0], globalSettings.boundingBoxMax[1], value || 5]
                })}
                style={{ width: '34%' }}
              />
            </Space.Compact>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="默认网格尺寸">
            <InputNumber
              value={globalSettings.meshSize}
              onChange={(value) => setGlobalSettings({...globalSettings, meshSize: value || 2.0})}
              min={0.1}
              step={0.1}
              addonAfter="m"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // 渲染编辑模态框
  const renderEditModal = () => (
    <Modal
      title={`编辑 Fragment: ${editingFragment?.name}`}
      open={editModalVisible}
      onOk={saveFragmentEdit}
      onCancel={() => setEditModalVisible(false)}
      width={600}
      okText="保存"
      cancelText="取消"
    >
      {editingFragment && (
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Fragment名称">
                <Input
                  value={editingFragment.name}
                  onChange={(e) => setEditingFragment({
                    ...editingFragment,
                    name: e.target.value
                  })}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Fragment类型">
                <Select
                  value={editingFragment.fragment_type}
                  onChange={(value) => setEditingFragment({
                    ...editingFragment,
                    fragment_type: value
                  })}
                >
                  <Select.Option value="excavation">开挖区域</Select.Option>
                  <Select.Option value="structure">结构体</Select.Option>
                  <Select.Option value="soil_domain">土体域</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Divider />
          
          {editingFragment.geometry.type === 'box' && (
            <div>
              <Text strong>立方体几何参数</Text>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Form.Item label="X坐标">
                    <InputNumber
                      value={editingFragment.geometry.geometry.x}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, x: value || 0 }
                        }
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Y坐标">
                    <InputNumber
                      value={editingFragment.geometry.geometry.y}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, y: value || 0 }
                        }
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Z坐标">
                    <InputNumber
                      value={editingFragment.geometry.geometry.z}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, z: value || 0 }
                        }
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="宽度">
                    <InputNumber
                      value={editingFragment.geometry.geometry.width}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, width: value || 1 }
                        }
                      })}
                      min={0.1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="长度">
                    <InputNumber
                      value={editingFragment.geometry.geometry.length}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, length: value || 1 }
                        }
                      })}
                      min={0.1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="深度">
                    <InputNumber
                      value={editingFragment.geometry.geometry.depth}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, depth: value || 1 }
                        }
                      })}
                      min={0.1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}
          
          {editingFragment.geometry.type === 'cylinder' && (
            <div>
              <Text strong>圆柱体几何参数</Text>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Form.Item label="中心X">
                    <InputNumber
                      value={editingFragment.geometry.geometry.x}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, x: value || 0 }
                        }
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="中心Y">
                    <InputNumber
                      value={editingFragment.geometry.geometry.y}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, y: value || 0 }
                        }
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="中心Z">
                    <InputNumber
                      value={editingFragment.geometry.geometry.center_z}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, center_z: value || 0 }
                        }
                      })}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="半径">
                    <InputNumber
                      value={editingFragment.geometry.geometry.radius}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, radius: value || 0.5 }
                        }
                      })}
                      min={0.1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="高度">
                    <InputNumber
                      value={editingFragment.geometry.geometry.height}
                      onChange={(value) => setEditingFragment({
                        ...editingFragment,
                        geometry: {
                          ...editingFragment.geometry,
                          geometry: { ...editingFragment.geometry.geometry, height: value || 1 }
                        }
                      })}
                      min={0.1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}
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
          tab={<Space size={4}><ScissorOutlined style={{ fontSize: '12px' }} />Fragment</Space>} 
          key="fragments"
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {renderFragmentList()}
            {renderTemplateSelection()}
          </Space>
        </TabPane>
        
        <TabPane 
          tab={<Space size={4}><SettingOutlined style={{ fontSize: '12px' }} />设置</Space>} 
          key="settings"
        >
          {renderGlobalSettings()}
        </TabPane>
      </Tabs>

      {renderEditModal()}
    </div>
  );
};

export default FragmentConfigPanel;