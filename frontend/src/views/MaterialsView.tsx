import React, { useState, useCallback } from 'react';
import { 
  Layout, Card, Typography, Space, Tabs, Button, Upload, message, 
  Table, Modal, Form, Input, Select, InputNumber, Row, Col, 
  Statistic, Tag, Progress, Alert, Tooltip, Badge, Divider,
  Tree, Collapse, Switch, Slider
} from 'antd';
import { 
  DatabaseOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  UploadOutlined, DownloadOutlined, FolderOutlined, 
  ExperimentOutlined, SettingOutlined, SearchOutlined,
  EyeOutlined, CopyOutlined, ShareAltOutlined,
  BulbOutlined, LineChartOutlined, BuildOutlined
} from '@ant-design/icons';
import { useDropzone } from 'react-dropzone';
import MaterialList from '../components/MaterialList';
import '../styles/materials.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Dragger } = Upload;

// 模拟材料库数据
const MATERIAL_CATEGORIES = [
  {
    key: 'concrete',
    title: '混凝土材料',
    icon: '🏗️',
    children: [
      { key: 'c20', title: 'C20混凝土', count: 8 },
      { key: 'c30', title: 'C30混凝土', count: 12 },
      { key: 'c40', title: 'C40混凝土', count: 6 }
    ]
  },
  {
    key: 'steel',
    title: '钢材',
    icon: '🔩',
    children: [
      { key: 'hrb400', title: 'HRB400钢筋', count: 15 },
      { key: 'q235', title: 'Q235钢材', count: 10 },
      { key: 'q355', title: 'Q355钢材', count: 8 }
    ]
  },
  {
    key: 'soil',
    title: '土壤材料',
    icon: '🌱',
    children: [
      { key: 'clay', title: '粘土', count: 20 },
      { key: 'sand', title: '砂土', count: 18 },
      { key: 'rock', title: '岩石', count: 12 }
    ]
  }
];

const MATERIAL_TEMPLATES = [
  {
    id: 'template_1',
    name: 'C30混凝土标准模板',
    category: 'concrete',
    properties: {
      elasticModulus: 30000,
      poissonRatio: 0.2,
      density: 2500,
      compressiveStrength: 30,
      tensileStrength: 2.4
    },
    description: '标准C30混凝土材料参数'
  },
  {
    id: 'template_2', 
    name: 'HRB400钢筋模板',
    category: 'steel',
    properties: {
      elasticModulus: 210000,
      poissonRatio: 0.3,
      density: 7850,
      yieldStrength: 400,
      ultimateStrength: 540
    },
    description: 'HRB400级钢筋标准参数'
  }
];

const MaterialsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [materialStats, setMaterialStats] = useState({
    total: 156,
    categories: 8,
    customized: 45,
    imported: 23
  });

  // 文件拖拽处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // 模拟材料库导入
      message.success(`${file.name} 材料库文件导入成功！`);
      setMaterialStats(prev => ({
        ...prev,
        imported: prev.imported + 1,
        total: prev.total + 1
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/xml': ['.xml']
    },
    multiple: false
  });

  // 材料模板表格列
  const templateColumns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const cat = MATERIAL_CATEGORIES.find(c => c.key === category);
        return <Tag color="blue">{cat?.title || category}</Tag>;
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />}>预览</Button>
          <Button size="small" icon={<CopyOutlined />}>应用</Button>
          <Button size="small" icon={<EditOutlined />}>编辑</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="materials-view fade-in">
      <div className="materials-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>材料库管理</Title>
        <Space>
          <Button icon={<UploadOutlined />}>导入材料</Button>
          <Button icon={<DownloadOutlined />}>导出材料</Button>
          <Button icon={<ExperimentOutlined />} onClick={() => setShowAnalysisModal(true)}>性能分析</Button>
          <Button type="primary" icon={<PlusOutlined />}>
            创建材料
          </Button>
        </Space>
      </div>

      {/* 材料库统计信息 */}
      <div style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <Statistic
                title="总材料数"
                value={materialStats.total}
                prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <Statistic
                title="材料类别"
                value={materialStats.categories}
                prefix={<FolderOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <Statistic
                title="自定义材料"
                value={materialStats.customized}
                prefix={<BulbOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <Statistic
                title="导入材料"
                value={materialStats.imported}
                prefix={<UploadOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Row gutter={16} style={{ height: 'calc(100% - 140px)' }}>
        <Col span={6}>
          {/* 材料分类树 */}
          <Card 
            className="theme-card" 
            title="材料分类" 
            size="small"
            style={{ height: '100%' }}
            extra={<SettingOutlined />}
          >
            <div style={{ marginBottom: '8px' }}>
              <Input.Search 
                placeholder="搜索材料..." 
                size="small"
                prefix={<SearchOutlined />}
              />
            </div>
            
            <div 
              style={{ 
                padding: '8px 0', 
                cursor: 'pointer',
                background: selectedCategory === 'all' ? 'var(--primary-color-light)' : 'transparent',
                borderRadius: '4px',
                marginBottom: '8px'
              }}
              onClick={() => setSelectedCategory('all')}
            >
              <Space>
                <DatabaseOutlined />
                <Text strong>全部材料</Text>
                <Badge count={materialStats.total} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            </div>

            {MATERIAL_CATEGORIES.map(category => (
              <div key={category.key} style={{ marginBottom: '4px' }}>
                <div 
                  style={{ 
                    padding: '8px 0', 
                    cursor: 'pointer',
                    background: selectedCategory === category.key ? 'var(--primary-color-light)' : 'transparent',
                    borderRadius: '4px'
                  }}
                  onClick={() => setSelectedCategory(category.key)}
                >
                  <Space>
                    <span>{category.icon}</span>
                    <Text>{category.title}</Text>
                    <Badge 
                      count={category.children.reduce((sum, child) => sum + child.count, 0)} 
                      style={{ backgroundColor: '#1890ff' }} 
                    />
                  </Space>
                </div>
                {selectedCategory === category.key && (
                  <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                    {category.children.map(child => (
                      <div key={child.key} style={{ padding: '4px 0' }}>
                        <Space>
                          <Text style={{ fontSize: '12px' }}>{child.title}</Text>
                          <Badge count={child.count} size="small" />
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </Col>

        <Col span={18}>
          <Card 
            className="theme-card"
            style={{ height: '100%' }}
            bodyStyle={{ padding: 0 }}
          >
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
              style={{ height: '100%' }}
            >
              <TabPane 
                tab={<span><DatabaseOutlined /> 材料库</span>} 
                key="library"
                style={{ height: 'calc(100vh - 260px)', overflow: 'auto' }}
              >
                <div style={{ padding: '16px' }}>
                  <MaterialList />
                </div>
              </TabPane>

              <TabPane 
                tab={<span><BuildOutlined /> 材料模板</span>} 
                key="templates"
                style={{ height: 'calc(100vh - 260px)', overflow: 'auto' }}
              >
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Text strong>预定义材料模板</Text>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => setShowTemplateModal(true)}>
                      创建模板
                    </Button>
                  </div>
                  
                  <Table
                    dataSource={MATERIAL_TEMPLATES}
                    columns={templateColumns}
                    size="small"
                    pagination={false}
                    rowKey="id"
                  />

                  <Divider />

                  <Alert
                    message="模板说明"
                    description="材料模板可以快速创建标准材料，包含预定义的材料参数和属性设置。"
                    type="info"
                    showIcon
                  />
                </div>
              </TabPane>

              <TabPane 
                tab={<span><UploadOutlined /> 导入导出</span>} 
                key="import_export"
                style={{ height: 'calc(100vh - 260px)', overflow: 'auto' }}
              >
                <div style={{ padding: '16px' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Card title="导入材料库" size="small">
                        <div {...getRootProps()} style={{
                          border: `2px dashed ${isDragActive ? '#1890ff' : '#d9d9d9'}`,
                          borderRadius: '8px',
                          padding: '40px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'border-color 0.3s'
                        }}>
                          <input {...getInputProps()} />
                          <p style={{ fontSize: '32px', color: '#1890ff', margin: 0 }}>
                            <UploadOutlined />
                          </p>
                          <p>拖拽材料库文件到此处</p>
                          <Text type="secondary">支持JSON、CSV、XML格式</Text>
                        </div>
                        
                        <div style={{ marginTop: '16px' }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Button block icon={<UploadOutlined />}>选择文件</Button>
                            <Button block>从在线库导入</Button>
                          </Space>
                        </div>
                      </Card>
                    </Col>
                    
                    <Col span={12}>
                      <Card title="导出材料库" size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                            <Text strong>导出选项</Text>
                            <div style={{ marginTop: '8px' }}>
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Text>包含自定义材料</Text>
                                  <Switch defaultChecked />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Text>包含模板</Text>
                                  <Switch defaultChecked />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Text>压缩导出</Text>
                                  <Switch />
                                </div>
                              </Space>
                            </div>
                          </div>
                          
                          <Select defaultValue="json" style={{ width: '100%' }}>
                            <Select.Option value="json">JSON格式</Select.Option>
                            <Select.Option value="csv">CSV格式</Select.Option>
                            <Select.Option value="xml">XML格式</Select.Option>
                            <Select.Option value="xlsx">Excel格式</Select.Option>
                          </Select>
                          
                          <Button type="primary" block icon={<DownloadOutlined />}>
                            导出材料库
                          </Button>
                          
                          <Button block icon={<ShareAltOutlined />}>
                            分享到在线库
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  </Row>
                </div>
              </TabPane>

              <TabPane 
                tab={<span><SettingOutlined /> 库设置</span>} 
                key="settings"
                style={{ height: 'calc(100vh - 260px)', overflow: 'auto' }}
              >
                <div style={{ padding: '16px' }}>
                  <Collapse>
                    <Panel header="显示设置" key="1">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text>显示材料图标</Text>
                          <Switch defaultChecked />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text>自动分类</Text>
                          <Switch defaultChecked />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text>显示使用统计</Text>
                          <Switch />
                        </div>
                      </Space>
                    </Panel>
                    
                    <Panel header="缓存设置" key="2">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text>缓存大小限制 (MB)</Text>
                          <Slider defaultValue={100} max={500} style={{ margin: '8px 0' }} />
                        </div>
                        <Button>清理缓存</Button>
                      </Space>
                    </Panel>
                    
                    <Panel header="同步设置" key="3">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text>自动同步</Text>
                          <Switch />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text>云端备份</Text>
                          <Switch defaultChecked />
                        </div>
                        <Text type="secondary">上次同步: 2024-12-12 14:30</Text>
                      </Space>
                    </Panel>
                  </Collapse>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* 材料模板创建模态框 */}
      <Modal
        title="创建材料模板"
        open={showTemplateModal}
        onCancel={() => setShowTemplateModal(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="模板名称" required>
            <Input placeholder="输入材料模板名称" />
          </Form.Item>
          <Form.Item label="材料类别" required>
            <Select placeholder="选择材料类别">
              {MATERIAL_CATEGORIES.map(cat => (
                <Select.Option key={cat.key} value={cat.key}>{cat.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="描述">
            <Input.TextArea rows={3} placeholder="描述材料模板的用途和特点" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary">创建模板</Button>
              <Button onClick={() => setShowTemplateModal(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 材料性能分析模态框 */}
      <Modal
        title="材料性能分析"
        open={showAnalysisModal}
        onCancel={() => setShowAnalysisModal(false)}
        footer={null}
        width={800}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <LineChartOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <Title level={4} style={{ marginTop: '16px' }}>材料性能对比分析</Title>
          <Text type="secondary">选择材料进行力学性能、耐久性等多维度对比分析</Text>
          <div style={{ marginTop: '24px' }}>
            <Button type="primary">开始分析</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MaterialsView; 