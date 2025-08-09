import React, { useState, useMemo } from 'react';
import { Button, Space, Typography, Form, Input, InputNumber, Select, Tag, Modal, Tabs, Slider } from 'antd';
import { ExperimentOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import UnifiedModuleLayout from '../ui/layout/UnifiedModuleLayout';
import Panel from '../ui/layout/Panel';
import MetricCard from '../ui/layout/MetricCard';

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

  // 统计指标
  const metrics = useMemo(() => {
    const total = materialData.length;
    const concrete = materialData.filter(m => m.type === 'concrete').length;
    const steel = materialData.filter(m => m.type === 'steel').length;
    const soil = materialData.filter(m => m.type === 'soil').length;
    const rock = materialData.filter(m => m.type === 'rock').length;
    return [
      { label: '总数', value: String(total), accent: 'blue' as const },
      { label: '混凝土', value: String(concrete), accent: 'purple' as const },
      { label: '钢材', value: String(steel), accent: 'orange' as const },
      { label: '土体', value: String(soil), accent: 'green' as const },
      { label: '岩石', value: String(rock), accent: 'red' as const }
    ];
  }, [materialData]);

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
    <>
      <UnifiedModuleLayout
        left={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ExperimentOutlined /> 材料库</span>} dense>
              <Tabs size="small" defaultActiveKey="list" items={[
                { key: 'list', label: '列表', children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Select value={materialType} onChange={setMaterialType} size="small">
                      {materialTypes.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                    </Select>
                    <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                      {filteredMaterials.map(mat => (
                        <div key={mat.id} onClick={() => setSelectedMaterial(mat)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            marginBottom: 6,
                            cursor: 'pointer',
                            background: selectedMaterial?.id === mat.id ? 'rgba(139,92,246,0.18)' : 'var(--bg-tertiary)',
                            border: `1px solid ${selectedMaterial?.id === mat.id ? 'rgba(139,92,246,0.45)' : 'var(--border-color)'}`
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: 600 }}>{mat.name}</Text>
                            <Tag color={mat.type === 'concrete' ? 'blue' : mat.type === 'steel' ? 'orange' : mat.type === 'soil' ? 'green' : 'purple'} style={{ margin: 0 }}>{materialTypes.find(t=>t.value===mat.type)?.label}</Tag>
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.7 }}>ρ {mat.density} • E {mat.elasticModulus}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )},
                { key: 'ops', label: '操作', children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>新建</Button>
                    <Button size="small" icon={<UploadOutlined />}>导入</Button>
                    <Button size="small" icon={<DownloadOutlined />}>导出</Button>
                    <Button size="small" icon={<SearchOutlined />}>搜索</Button>
                  </div>
                )}
              ]} />
            </Panel>
            {selectedMaterial && (
              <Panel title="材料详情" dense>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: 600 }}>{selectedMaterial.name}</Text>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{selectedMaterial.description}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 6 }}>
                  {materialProperties.map(p => (
                    <div key={p.property} style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ fontSize: 10, opacity: 0.6 }}>{p.property}</div>
                      <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}>{p.value} {p.unit}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        }
        right={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel title="统计" dense>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8 }}>
                {metrics.map(m => <MetricCard key={m.label} label={m.label} value={m.value} accent={m.accent} />)}
              </div>
            </Panel>
            <Panel title="当前选择" dense>
              {selectedMaterial ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Text style={{ fontSize: 12 }}><strong>{selectedMaterial.name}</strong></Text>
                  <Text style={{ fontSize: 11, opacity: 0.7 }}>{selectedMaterial.description}</Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 6 }}>
                    <MetricCard label="密度" value={selectedMaterial.density+''} accent="blue" />
                    <MetricCard label="E" value={selectedMaterial.elasticModulus+''} accent="purple" />
                    <MetricCard label="泊松比" value={selectedMaterial.poissonRatio+''} accent="orange" />
                  </div>
                  <Space size={4} wrap>
                    <Button size="small" icon={<EditOutlined />} onClick={() => setIsModalVisible(true)}>编辑</Button>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Space>
                </div>
              ) : <div style={{ fontSize: 12, opacity: 0.6 }}>未选择材料</div>}
            </Panel>
          </div>
        }
        overlay={null}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(26,26,26,0.95), rgba(40,40,40,0.95))' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(139,92,246,0.12), transparent 55%), radial-gradient(circle at 75% 70%, rgba(0,217,255,0.12), transparent 55%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: .35 }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 58, opacity: .25, marginBottom: 18 }}>🧪</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>材料 3D 视口占位</div>
            <div style={{ fontSize: 13, opacity: .55, lineHeight: 1.5 }}>待集成: 分子结构 / 应力应变曲线 / 微观结构</div>
          </div>
        </div>
      </UnifiedModuleLayout>

      <Modal title="编辑材料" open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
        <Form layout="vertical" size="small">
          <Form.Item label="材料名称"><Input /></Form.Item>
            <Form.Item label="材料类型">
              <Select>
                {materialTypes.slice(1).map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="密度 (kg/m³)"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="弹性模量 (MPa)"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="泊松比"><InputNumber style={{ width: '100%' }} step={0.01} /></Form.Item>
            <Form.Item label="描述"><TextArea rows={3} /></Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary">保存</Button>
                <Button onClick={() => setIsModalVisible(false)}>取消</Button>
              </Space>
            </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MaterialsModule;