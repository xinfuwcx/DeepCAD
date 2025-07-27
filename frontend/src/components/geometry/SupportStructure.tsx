import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, message, Card, Modal, Space, Typography } from 'antd';
import { 
  SafetyOutlined, 
  BorderOutlined, 
  ApartmentOutlined,
  AimOutlined,
  SettingOutlined,
  PlusOutlined,
  SaveOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

interface DiaphragmWallGeometry {
  id: string;
  name: string;
  thickness: number;      // 地连墙厚度(m)
  depth: number;         // 入土深度(m)
  length: number;        // 长度(m)
  concreteGrade: string; // 混凝土强度等级
  reinforcement: string; // 钢筋等级
  crownBeamWidth?: number;   // 冠梁宽度(m)
  crownBeamHeight?: number;  // 冠梁高度(m)
  materialId?: string;   // 材料库ID
  wallSegments: Array<{
    startPoint: {x: number, y: number};
    endPoint: {x: number, y: number};
    segmentLength: number;
  }>;
}

interface PileSystemGeometry {
  id: string;
  name: string;
  diameter: number;      // 桩径(m)
  depth: number;         // 桩长(m)
  spacing: number;       // 桩间距(m)
  concreteGrade: string; // 混凝土强度等级
  reinforcement: string; // 钢筋等级
  pileType: 'bored_cast_in_place' | 'steel_pipe' | 'precast'; // 桩型
  crownBeamWidth?: number;   // 冠梁宽度(m)
  crownBeamHeight?: number;  // 冠梁高度(m)
  materialId?: string;   // 材料库ID
  pileRows: Array<{
    rowId: number;
    startPoint: {x: number, y: number};
    endPoint: {x: number, y: number};
    pileCount: number;
    pilePositions: Array<{x: number, y: number}>;
  }>;
}

interface AnchorSystemGeometry {
  id: string;
  name: string;
  angle: number;         // 锚杆倾角(度)
  length: number;        // 锚杆长度(m)
  diameter: number;      // 锚杆直径(mm)
  prestress: number;     // 预应力(kN)
  rowCount: number;      // 锚杆排数
  verticalSpacing: number; // 竖向排间距(m)
  horizontalSpacing: number; // 水平间距(m)
  waleBeamWidth?: number;    // 腰梁宽度(m)
  waleBeamHeight?: number;   // 腰梁高度(m)
  materialId?: string;   // 材料库ID
  anchorPositions: Array<{x: number, y: number, level: number, row: number}>;
}

type SupportStructureType = 'diaphragm_wall' | 'pile_system' | 'anchor_system';

const SupportStructure: React.FC = () => {
  const [parameterForm] = Form.useForm();
  const [activeStructureType, setActiveStructureType] = useState<SupportStructureType | null>(null);
  const [parameterModalVisible, setParameterModalVisible] = useState(false);
  const [generatedGeometries, setGeneratedGeometries] = useState<{
    diaphragmWalls: DiaphragmWallGeometry[];
    pileSystems: PileSystemGeometry[];
    anchorSystems: AnchorSystemGeometry[];
  }>({
    diaphragmWalls: [],
    pileSystems: [],
    anchorSystems: []
  });

  const handleStructureTypeSelect = (type: SupportStructureType) => {
    setActiveStructureType(type);
    setParameterModalVisible(true);
    parameterForm.resetFields();
    
    // 根据类型设置默认值
    switch(type) {
      case 'diaphragm_wall':
        parameterForm.setFieldsValue({
          name: '地连墙-1',
          thickness: 1.2,
          depth: 25,
          length: 50,
          concreteGrade: 'C30',
          reinforcement: 'HRB400',
          crownBeamWidth: 0.8,
          crownBeamHeight: 1.0
        });
        break;
      case 'pile_system':
        parameterForm.setFieldsValue({
          name: '钻孔灌注桩-1',
          diameter: 1.0,
          depth: 20,
          spacing: 1.5,
          pileType: 'bored_cast_in_place',
          concreteGrade: 'C30',
          reinforcement: 'HRB400',
          crownBeamWidth: 0.8,
          crownBeamHeight: 1.0
        });
        break;
      case 'anchor_system':
        parameterForm.setFieldsValue({
          name: '锚杆系统-1',
          angle: 15,
          length: 12,
          diameter: 32,
          prestress: 300,
          rowCount: 2,
          verticalSpacing: 3.0,
          horizontalSpacing: 2.0,
          waleBeamWidth: 0.3,
          waleBeamHeight: 0.6
        });
        break;
    }
  };

  const handleParameterSubmit = async () => {
    try {
      const values = await parameterForm.validateFields();
      
      if (activeStructureType) {
        message.loading('正在生成支护结构3D几何模型...', 2);
        
        try {
          // 调用后端API生成3D几何模型
          const response = await fetch('/api/geometry/support-structure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              structure_type: activeStructureType,
              name: values.name,
              parameters: values
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            const newGeometry = {
              id: result.geometry.id,
              ...values,
              volume: result.geometry.volume,
              surface_area: result.geometry.surface_area,
              vertices: result.geometry.vertices,
              faces: result.geometry.faces
            };
            
            // 更新对应的几何体列表
            if (activeStructureType === 'diaphragm_wall') {
              setGeneratedGeometries(prev => ({
                ...prev,
                diaphragmWalls: [...prev.diaphragmWalls, newGeometry as DiaphragmWallGeometry]
              }));
            } else if (activeStructureType === 'pile_system') {
              setGeneratedGeometries(prev => ({
                ...prev,
                pileSystems: [...prev.pileSystems, newGeometry as PileSystemGeometry]
              }));
            } else if (activeStructureType === 'anchor_system') {
              setGeneratedGeometries(prev => ({
                ...prev,
                anchorSystems: [...prev.anchorSystems, newGeometry as AnchorSystemGeometry]
              }));
            }
            
            message.success(`${getStructureTypeName(activeStructureType)}几何模型生成完成！体积: ${result.geometry.volume.toFixed(2)}m³`);
            setParameterModalVisible(false);
          } else {
            message.error(`几何模型生成失败: ${result.message}`);
          }
        } catch (error) {
          console.error('API调用失败:', error);
          message.error('网络连接失败，请检查后端服务');
        }
      }
    } catch (error) {
      message.error('请完善参数信息');
    }
  };

  const getStructureTypeName = (type: SupportStructureType) => {
    const nameMap = {
      'diaphragm_wall': '支护墙设计',
      'pile_system': '排桩设计', 
      'anchor_system': '锚杆设计'
    };
    return nameMap[type];
  };
  
  const getStructureTypeIcon = (type: SupportStructureType) => {
    const iconMap = {
      'diaphragm_wall': <BorderOutlined />,
      'pile_system': <ApartmentOutlined />,
      'anchor_system': <AimOutlined />
    };
    return iconMap[type];
  };
  
  const getStructureTypeDescription = (type: SupportStructureType) => {
    const descMap = {
      'diaphragm_wall': '地连墙支护结构几何建模',
      'pile_system': '钻孔灌注桩系统几何建模',
      'anchor_system': '预应力锚杆系统几何建模'
    };
    return descMap[type];
  };

  const renderParameterForm = () => {
    if (!activeStructureType) return null;
    
    switch(activeStructureType) {
      case 'diaphragm_wall':
        return (
          <>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="墙体厚度 (m)" name="thickness" rules={[{ required: true }]}>
              <InputNumber min={0.6} max={2.0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="入土深度 (m)" name="depth" rules={[{ required: true }]}>
              <InputNumber min={10} max={50} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="墙体长度 (m)" name="length" rules={[{ required: true }]}>
              <InputNumber min={10} max={200} step={5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="混凝土强度等级" name="concreteGrade" rules={[{ required: true }]}>
              <Select>
                <Option value="C25">C25</Option>
                <Option value="C30">C30</Option>
                <Option value="C35">C35</Option>
                <Option value="C40">C40</Option>
              </Select>
            </Form.Item>
            <Form.Item label="钢筋等级" name="reinforcement" rules={[{ required: true }]}>
              <Select>
                <Option value="HRB335">HRB335</Option>
                <Option value="HRB400">HRB400</Option>
                <Option value="HRB500">HRB500</Option>
              </Select>
            </Form.Item>
            <Form.Item label="冠梁宽度 (m)" name="crownBeamWidth">
              <InputNumber min={0.5} max={1.5} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="冠梁高度 (m)" name="crownBeamHeight">
              <InputNumber min={0.6} max={2.0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </>
        );
      case 'pile_system':
        return (
          <>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="桩型" name="pileType" rules={[{ required: true }]}>
              <Select>
                <Option value="bored_cast_in_place">钻孔灌注桩</Option>
                <Option value="steel_pipe">钢管桩</Option>
                <Option value="precast">预制桩</Option>
              </Select>
            </Form.Item>
            <Form.Item label="桩径 (m)" name="diameter" rules={[{ required: true }]}>
              <InputNumber min={0.6} max={2.0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="桩长 (m)" name="depth" rules={[{ required: true }]}>
              <InputNumber min={10} max={50} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="桩间距 (m)" name="spacing" rules={[{ required: true }]}>
              <InputNumber min={1.0} max={3.0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="混凝土强度等级" name="concreteGrade" rules={[{ required: true }]}>
              <Select>
                <Option value="C25">C25</Option>
                <Option value="C30">C30</Option>
                <Option value="C35">C35</Option>
                <Option value="C40">C40</Option>
              </Select>
            </Form.Item>
            <Form.Item label="钢筋等级" name="reinforcement" rules={[{ required: true }]}>
              <Select>
                <Option value="HRB335">HRB335</Option>
                <Option value="HRB400">HRB400</Option>
                <Option value="HRB500">HRB500</Option>
              </Select>
            </Form.Item>
            <Form.Item label="冠梁宽度 (m)" name="crownBeamWidth">
              <InputNumber min={0.5} max={1.5} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="冠梁高度 (m)" name="crownBeamHeight">
              <InputNumber min={0.6} max={2.0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </>
        );
      case 'anchor_system':
        return (
          <>
            <Form.Item label="名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="锚杆倾角 (度)" name="angle" rules={[{ required: true }]}>
              <InputNumber min={10} max={30} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="锚杆长度 (m)" name="length" rules={[{ required: true }]}>
              <InputNumber min={8} max={25} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="锚杆直径 (mm)" name="diameter" rules={[{ required: true }]}>
              <InputNumber min={20} max={50} step={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="预应力 (kN)" name="prestress" rules={[{ required: true }]}>
              <InputNumber min={100} max={800} step={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="锚杆排数" name="rowCount" rules={[{ required: true }]}>
              <InputNumber min={1} max={5} step={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="竖向排间距 (m)" name="verticalSpacing" rules={[{ required: true }]}>
              <InputNumber min={2.0} max={6.0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="水平间距 (m)" name="horizontalSpacing" rules={[{ required: true }]}>
              <InputNumber min={1.5} max={3.0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="腰梁宽度 (m)" name="waleBeamWidth">
              <InputNumber min={0.2} max={0.5} step={0.05} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="腰梁高度 (m)" name="waleBeamHeight">
              <InputNumber min={0.4} max={1.0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* 头部信息 */}
      <div style={{ marginBottom: '40px' }}>
        <Title level={3} style={{ color: '#00d9ff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SafetyOutlined />
          支护结构几何建模
        </Title>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0', fontSize: '14px' }}>
          创建支护墙、排桩、锚杆等深基坑支护结构的三维几何模型
        </p>
      </div>

      {/* 三个竖向大按钮 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
        {(['diaphragm_wall', 'pile_system', 'anchor_system'] as SupportStructureType[]).map((type) => (
          <Card 
            key={type}
            style={{ 
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            hoverable
            bodyStyle={{ padding: '24px' }}
            onClick={() => handleStructureTypeSelect(type)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                fontSize: '32px', 
                color: '#00d9ff',
                minWidth: '48px',
                textAlign: 'center'
              }}>
                {getStructureTypeIcon(type)}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  color: '#ffffff', 
                  margin: '0 0 8px 0', 
                  fontSize: '18px', 
                  fontWeight: 'bold'
                }}>
                  {getStructureTypeName(type)}
                </h4>
                <p style={{ 
                  color: 'rgba(255,255,255,0.6)', 
                  margin: 0, 
                  fontSize: '14px'
                }}>
                  {getStructureTypeDescription(type)}
                </p>
              </div>
              <div style={{ color: '#00d9ff', fontSize: '16px' }}>
                <PlusOutlined />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 已生成的几何体统计 */}
      <div style={{ marginBottom: '20px' }}>
        <Title level={4} style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
          已生成几何模型统计
        </Title>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ 
            background: 'rgba(26, 26, 46, 0.4)',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 217, 255, 0.2)'
          }}>
            <span style={{ color: '#00d9ff' }}>
              <BorderOutlined /> 支护墙: {generatedGeometries.diaphragmWalls.length}
            </span>
          </div>
          <div style={{ 
            background: 'rgba(26, 26, 46, 0.4)',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 217, 255, 0.2)'
          }}>
            <span style={{ color: '#00d9ff' }}>
              <ApartmentOutlined /> 排桩: {generatedGeometries.pileSystems.length}
            </span>
          </div>
          <div style={{ 
            background: 'rgba(26, 26, 46, 0.4)',
            padding: '12px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 217, 255, 0.2)'
          }}>
            <span style={{ color: '#00d9ff' }}>
              <AimOutlined /> 锚杆: {generatedGeometries.anchorSystems.length}
            </span>
          </div>
        </div>
      </div>

      {/* 参数输入模态框 */}
      <Modal
        title={activeStructureType ? `${getStructureTypeName(activeStructureType)} - 几何参数` : ''}
        open={parameterModalVisible}
        onCancel={() => setParameterModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setParameterModalVisible(false)}>取消</Button>,
          <Button 
            key="generate" 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleParameterSubmit}
            style={{ background: '#00d9ff', borderColor: '#00d9ff' }}
          >
            生成3D几何模型
          </Button>
        ]}
        width={600}
      >
        <Form 
          form={parameterForm} 
          layout="vertical"
          style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}
        >
          {renderParameterForm()}
        </Form>
      </Modal>
    </div>
  );
};

export default SupportStructure;