import React, { useState } from 'react';
import { Card, Button, Space, Typography, Form, Input, InputNumber, Select, Table, Tag, Modal, Tabs } from 'antd';
import {
  ExperimentOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  SettingOutlined,
  BugOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

export const MaterialsModule: React.FC = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [materialType, setMaterialType] = useState('all');

  const materialData = [
    {
      id: 1,
      name: 'C30混凝土',
      type: 'concrete',
      density: 2500,
      elasticModulus: 30000,
      poissonRatio: 0.2,
      compressiveStrength: 30,
      tensileStrength: 2.5,
      description: '普通结构混凝土',
      status: 'active'
    },
    {
      id: 2,
      name: 'Q345钢材',
      type: 'steel',
      density: 7850,
      elasticModulus: 206000,
      poissonRatio: 0.3,
      yieldStrength: 345,
      tensileStrength: 490,
      description: '低合金高强度结构钢',
      status: 'active'
    },
    {
      id: 3,
      name: '粉质粘土',
      type: 'soil',
      density: 1880,
      elasticModulus: 15,
      poissonRatio: 0.35,
      cohesion: 25,
      frictionAngle: 22,
      description: '可塑状态土层',
      status: 'active'
    },
    {
      id: 4,
      name: 'HRB400钢筋',
      type: 'steel',
      density: 7850,
      elasticModulus: 200000,
      poissonRatio: 0.3,
      yieldStrength: 400,
      tensileStrength: 540,
      description: '热轧带肋钢筋',
      status: 'active'
    },
    {
      id: 5,
      name: '岩石',
      type: 'rock',
      density: 2650,
      elasticModulus: 50000,
      poissonRatio: 0.25,
      compressiveStrength: 100,
      tensileStrength: 8,
      description: '中等强度岩石',
      status: 'draft'
    }
  ];

  const materialTypes = [
    { value: 'all', label: '全部材料' },
    { value: 'concrete', label: '混凝土' },
    { value: 'steel', label: '钢材' },
    { value: 'soil', label: '土体' },
    { value: 'rock', label: '岩石' }
  ];

  const filteredMaterials = materialType === 'all' 
    ? materialData 
    : materialData.filter(material => material.type === materialType);

  const columns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Button type="link" style={{ color: 'var(--primary-color)', padding: 0 }} onClick={() => setSelectedMaterial(record)}>
          {text}
        </Button>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={
          type === 'concrete' ? 'blue' :
          type === 'steel' ? 'orange' :
          type === 'soil' ? 'green' :
          type === 'rock' ? 'purple' : 'default'
        }>
          {materialTypes.find(t => t.value === type)?.label}
        </Tag>
      )
    },
    {
      title: '密度 (kg/m³)',
      dataIndex: 'density',
      key: 'density',
      render: (value: number) => value.toLocaleString()
    },
    {
      title: '弹性模量 (MPa)',
      dataIndex: 'elasticModulus',
      key: 'elasticModulus',
      render: (value: number) => value.toLocaleString()
    },
    {
      title: '泊松比',
      dataIndex: 'poissonRatio',
      key: 'poissonRatio'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'warning'}>
          {status === 'active' ? '激活' : '草稿'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button type="text"  icon={<EyeOutlined />} onClick={() => setSelectedMaterial(record)} />
          <Button type="text"  icon={<EditOutlined />} onClick={() => setIsModalVisible(true)} />
          <Button type="text"  icon={<DeleteOutlined />} danger />
        </Space>
      )
    }
  ];

  const materialProperties = selectedMaterial ? [
    { property: '密度', value: selectedMaterial.density, unit: 'kg/m³' },
    { property: '弹性模量', value: selectedMaterial.elasticModulus, unit: 'MPa' },
    { property: '泊松比', value: selectedMaterial.poissonRatio, unit: '-' },
    ...(selectedMaterial.type === 'concrete' ? [
      { property: '抗压强度', value: selectedMaterial.compressiveStrength, unit: 'MPa' },
      { property: '抗拉强度', value: selectedMaterial.tensileStrength, unit: 'MPa' }
    ] : []),
    ...(selectedMaterial.type === 'steel' ? [
      { property: '屈服强度', value: selectedMaterial.yieldStrength, unit: 'MPa' },
      { property: '抗拉强度', value: selectedMaterial.tensileStrength, unit: 'MPa' }
    ] : []),
    ...(selectedMaterial.type === 'soil' ? [
      { property: '粘聚力', value: selectedMaterial.cohesion, unit: 'kPa' },
      { property: '内摩擦角', value: selectedMaterial.frictionAngle, unit: '°' }
    ] : [])
  ] : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 全屏3D视口背景 */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)',
        zIndex: 1
      }}>
        {/* 材料科学背景效果 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(0, 217, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(52, 199, 89, 0.1) 0%, transparent 50%)
          `,
          opacity: 0.6
        }} />

        {/* 分子结构网格背景 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '25px 25px',
          opacity: 0.4
        }} />

        {/* 3D视口中心提示 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          zIndex: 2,
          userSelect: 'none'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>🧪</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', opacity: 0.6 }}>3D材料模型视口</div>
          <div style={{ fontSize: '16px', opacity: 0.4 }}>
            ✅ 分子结构可视化
            <br />
            ✅ 材料性能分析
            <br />
            ✅ 应力-应变曲线
            <br />
            ✅ 微观结构建模
          </div>
        </div>
      </div>

      {/* 悬浮左侧工具面板 */}
      <div style={{ 
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '380px',
        maxHeight: 'calc(100% - 40px)',
        zIndex: 10
      }}>
        <Card 
          className="glass-card" 
          title={
            <Space>
              <ExperimentOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>材料库管理</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1)'
          }}
          styles={{ 
            body: { 
              padding: '16px', 
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              background: 'transparent'
            },
            header: {
              background: 'transparent',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 16px'
            }
          }}
        >
          <Tabs defaultActiveKey="1" >
            <TabPane tab="材料列表" key="1">
              <div style={{ marginBottom: '16px' }}>
                <Select
                  value={materialType}
                  onChange={setMaterialType}
                  style={{ width: '100%' }}
                  
                >
                  {materialTypes.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredMaterials.map((material, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      marginBottom: '8px',
                      padding: '10px',
                      background: selectedMaterial?.id === material.id ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      border: `1px solid ${selectedMaterial?.id === material.id ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-color)'}`,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedMaterial(material)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <Text style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>{material.name}</Text>
                      <Tag 
                        
                        color={
                          material.type === 'concrete' ? 'blue' :
                          material.type === 'steel' ? 'orange' :
                          material.type === 'soil' ? 'green' : 'purple'
                        }
                      >
                        {materialTypes.find(t => t.value === material.type)?.label}
                      </Tag>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      密度: {material.density} kg/m³ • E: {material.elasticModulus} MPa
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {material.description}
                    </div>
                  </div>
                ))}
              </div>
            </TabPane>
            
            <TabPane tab="材料详情" key="2">
              {selectedMaterial ? (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Title level={5} style={{ color: 'var(--primary-color)', marginBottom: '8px' }}>
                      {selectedMaterial.name}
                    </Title>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {selectedMaterial.description}
                    </Text>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                      力学性能
                    </Text>
                    {materialProperties.map((prop, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                        padding: '6px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '4px'
                      }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{prop.property}</span>
                        <span style={{ color: 'var(--primary-color)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                          {prop.value} {prop.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    选择材料查看详细信息
                  </Text>
                </div>
              )}
            </TabPane>

            <TabPane tab="材料库操作" key="3">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  快速操作
                </Text>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <Button icon={<PlusOutlined />} style={{ justifyContent: 'flex-start' }} onClick={() => setIsModalVisible(true)}>
                  新建材料
                </Button>
                <Button icon={<UploadOutlined />} style={{ justifyContent: 'flex-start' }}>
                  导入材料库
                </Button>
                <Button icon={<DownloadOutlined />} style={{ justifyContent: 'flex-start' }}>
                  导出材料数据
                </Button>
                <Button icon={<SearchOutlined />} style={{ justifyContent: 'flex-start' }}>
                  材料搜索
                </Button>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                  材料统计
                </Text>
                {materialTypes.slice(1).map((type, index) => {
                  const count = materialData.filter(m => m.type === type.value).length;
                  return (
                    <div key={index} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                      padding: '6px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '4px'
                    }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{type.label}</span>
                      <span style={{ color: 'var(--primary-color)', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                        {count} 个
                      </span>
                    </div>
                  );
                })}
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </div>

      {/* 悬浮右侧材料性能指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '160px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          材料性能
        </div>
        {selectedMaterial ? (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--primary-color)', marginBottom: '6px', textAlign: 'center' }}>
              {selectedMaterial.name}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              密度: {selectedMaterial.density} kg/m³
            </div>
            <div style={{ fontSize: '10px', color: 'var(--accent-color)', marginBottom: '6px' }}>
              弹性模量: {selectedMaterial.elasticModulus} MPa
            </div>
            <div style={{ fontSize: '10px', color: 'var(--success-color)' }}>
              泊松比: {selectedMaterial.poissonRatio}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
            未选择材料
          </div>
        )}
      </div>

      {/* 悬浮底部工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          🧪 材料
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📊 性能
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🔬 分析
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📋 库存
        </Button>
      </div>

      {/* 材料编辑模态框 */}
      <Modal
        title="编辑材料"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        style={{ color: 'white' }}
      >
        <Form layout="vertical" >
          <Form.Item label="材料名称">
            <Input placeholder="请输入材料名称" />
          </Form.Item>
          <Form.Item label="材料类型">
            <Select placeholder="请选择材料类型">
              {materialTypes.slice(1).map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="密度 (kg/m³)">
            <InputNumber style={{ width: '100%' }} placeholder="请输入密度" />
          </Form.Item>
          <Form.Item label="弹性模量 (MPa)">
            <InputNumber style={{ width: '100%' }} placeholder="请输入弹性模量" />
          </Form.Item>
          <Form.Item label="泊松比">
            <InputNumber style={{ width: '100%' }} step={0.01} placeholder="请输入泊松比" />
          </Form.Item>
          <Form.Item label="描述">
            <TextArea rows={3} placeholder="请输入材料描述" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary">保存</Button>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialsModule;