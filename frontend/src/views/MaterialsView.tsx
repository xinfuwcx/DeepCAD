import React, { useState } from 'react';
import { 
  Typography, 
  Button, 
  Select, 
  InputNumber, 
  Switch, 
  Progress, 
  Tag, 
  Badge,
  Modal,
  Form,
  Input,
  Upload,
  Table,
  message,
  Space,
  Popconfirm,
  Row,
  Col,
  Card
} from 'antd';
import { 
  DatabaseOutlined, 
  PlayCircleOutlined,
  SaveOutlined,
  UploadOutlined,
  ExperimentOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  PlusOutlined,
  FileExcelOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import StatusBar from '../components/layout/StatusBar';

const { Title, Text } = Typography;
const { Option } = Select;

interface Material {
  id: string;
  name: string;
  category: string;
  elasticModulus: number;
  poissonRatio: number;
  density: number;
  strength: number;
  description: string;
  isActive: boolean;
}

const MaterialsView: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [materialCategory, setMaterialCategory] = useState('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit' | 'import' | 'view' | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [form] = Form.useForm();

    // 材料数据
    const [materials, setMaterials] = useState<Material[]>([
        {
            id: '1',
            name: 'C30混凝土',
            category: 'concrete',
            elasticModulus: 30000,
            poissonRatio: 0.2,
            density: 2500,
            strength: 30,
            description: '普通强度混凝土，适用于一般结构',
            isActive: true
        },
        {
            id: '2', 
            name: 'Q345钢材',
            category: 'steel',
            elasticModulus: 206000,
            poissonRatio: 0.3,
            density: 7850,
            strength: 345,
            description: '低合金高强度结构钢',
            isActive: true
        },
        {
            id: '3',
            name: '粘土',
            category: 'soil',
            elasticModulus: 50,
            poissonRatio: 0.35,
            density: 1800,
            strength: 0.05,
            description: '软土地基材料',
            isActive: true
        },
        {
            id: '4',
            name: 'C50混凝土',
            category: 'concrete',
            elasticModulus: 34500,
            poissonRatio: 0.2,
            density: 2500,
            strength: 50,
            description: '高强度混凝土，适用于重要结构',
            isActive: false
        }
    ]);

    const handleCreateMaterial = () => {
        form.validateFields().then(values => {
            const newMaterial: Material = {
                id: Date.now().toString(),
                ...values,
                isActive: true
            };
            setMaterials([...materials, newMaterial]);
            setModalVisible(false);
            form.resetFields();
            message.success('材料创建成功！');
        });
    };

    const handleEditMaterial = () => {
        if (!selectedMaterial) return;
        
        form.validateFields().then(values => {
            setMaterials(materials.map(material => 
                material.id === selectedMaterial.id ? { ...material, ...values } : material
            ));
            setModalVisible(false);
            form.resetFields();
            message.success('材料编辑成功！');
        });
    };

    const renderModal = () => {
        if (!modalVisible) return null;

        return (
            <Modal
                title={
                    modalType === 'create' ? '新建材料' : 
                    modalType === 'edit' ? '编辑材料' : 
                    modalType === 'view' ? '查看材料' : '导入材料'
                }
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                }}
                footer={
                    modalType === 'view' ? [
                        <Button key="close" onClick={() => setModalVisible(false)}>
                            关闭
                        </Button>
                    ] : [
                        <Button key="cancel" onClick={() => setModalVisible(false)}>
                            取消
                        </Button>,
                        <Button 
                            key="submit" 
                            type="primary" 
                            onClick={modalType === 'create' ? handleCreateMaterial : handleEditMaterial}
                            loading={isProcessing}
                        >
                            {modalType === 'create' ? '创建' : '保存'}
                        </Button>
                    ]
                }
                width={600}
            >
                {modalType === 'import' ? (
                    <Upload.Dragger 
                        capture={false}
                        hasControlInside={false}
                        pastable={false}
                        accept=".json,.csv,.xlsx"
                    >
                        <p><UploadOutlined style={{ fontSize: 48 }} /></p>
                        <p>拖拽或点击上传材料库文件</p>
                        <p style={{ color: '#999' }}>支持 JSON, CSV, Excel 格式</p>
                    </Upload.Dragger>
                ) : (
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={selectedMaterial || {}}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="材料名称"
                                    name="name"
                                    rules={[{ required: true, message: '请输入材料名称' }]}
                                >
                                    <Input disabled={modalType === 'view'} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="材料类型"
                                    name="category"
                                    rules={[{ required: true, message: '请选择材料类型' }]}
                                >
                                    <Select disabled={modalType === 'view'}>
                                        <Option value="concrete">混凝土</Option>
                                        <Option value="steel">钢材</Option>
                                        <Option value="soil">土体</Option>
                                        <Option value="composite">复合材料</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="弹性模量 (MPa)"
                                    name="elasticModulus"
                                    rules={[{ required: true, message: '请输入弹性模量' }]}
                                >
                                    <InputNumber 
                                        min={0} 
                                        style={{ width: '100%' }} 
                                        disabled={modalType === 'view'}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="泊松比"
                                    name="poissonRatio"
                                    rules={[{ required: true, message: '请输入泊松比' }]}
                                >
                                    <InputNumber 
                                        min={0} 
                                        max={0.5} 
                                        step={0.01} 
                                        style={{ width: '100%' }} 
                                        disabled={modalType === 'view'}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="密度 (kg/m³)"
                                    name="density"
                                    rules={[{ required: true, message: '请输入密度' }]}
                                >
                                    <InputNumber 
                                        min={0} 
                                        style={{ width: '100%' }} 
                                        disabled={modalType === 'view'}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="强度 (MPa)"
                                    name="strength"
                                    rules={[{ required: true, message: '请输入强度' }]}
                                >
                                    <InputNumber 
                                        min={0} 
                                        style={{ width: '100%' }} 
                                        disabled={modalType === 'view'}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item
                            label="描述"
                            name="description"
                        >
                            <Input.TextArea 
                                rows={3} 
                                disabled={modalType === 'view'}
                            />
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        );
    };

    return (
        <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a2e 100%)',
            minHeight: '100vh',
            paddingBottom: '50px'
        }}>
            {/* 头部标题 */}
            <div style={{ marginBottom: '24px' }}>
                <Title level={1} style={{ 
                    color: '#00d9ff', 
                    margin: 0, 
                    fontSize: '36px',
                    fontWeight: 300,
                    letterSpacing: '2px'
                }}>
                    材料库管理
                </Title>
                <Text style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '14px',
                    display: 'block',
                    marginTop: '8px'
                }}>
                    管理和配置工程材料参数
                </Text>
            </div>

            {/* 操作工具栏 */}
            <div style={{ 
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(26, 26, 46, 0.6)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '12px',
                padding: '16px 24px'
            }}>
                <Space size="middle">
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setSelectedMaterial(null);
                            setModalType('create');
                            setModalVisible(true);
                        }}
                        style={{ 
                            background: '#00d9ff',
                            borderColor: '#00d9ff'
                        }}
                    >
                        新建材料
                    </Button>
                    <Button 
                        icon={<UploadOutlined />}
                        onClick={() => {
                            setModalType('import');
                            setModalVisible(true);
                        }}
                        style={{ 
                            background: 'rgba(0, 217, 255, 0.1)',
                            borderColor: 'rgba(0, 217, 255, 0.3)',
                            color: '#ffffff'
                        }}
                    >
                        导入材料库
                    </Button>
                    <Button 
                        icon={<FileExcelOutlined />}
                        style={{ 
                            background: 'rgba(0, 217, 255, 0.1)',
                            borderColor: 'rgba(0, 217, 255, 0.3)',
                            color: '#ffffff'
                        }}
                    >
                        导出Excel
                    </Button>
                </Space>
                
                <Space size="middle">
                    <Select
                        value={materialCategory}
                        onChange={setMaterialCategory}
                        style={{ width: 120 }}
                        size="small"
                    >
                        <Option value="all">全部类型</Option>
                        <Option value="concrete">混凝土</Option>
                        <Option value="steel">钢材</Option>
                        <Option value="soil">土体</Option>
                        <Option value="composite">复合材料</Option>
                    </Select>
                    <Input.Search
                        placeholder="搜索材料"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        style={{ width: 200 }}
                        size="small"
                    />
                </Space>
            </div>

            {/* 材料表格 */}
            <div style={{
                background: 'rgba(26, 26, 46, 0.6)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '12px',
                padding: '20px'
            }}>
                <Table
                    columns={[
                        {
                            title: '材料名称',
                            dataIndex: 'name',
                            key: 'name',
                            render: (text: string, record: Material) => (
                                <div>
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{text}</Text>
                                    <br />
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{record.description}</Text>
                                </div>
                            )
                        },
                        {
                            title: '类型',
                            dataIndex: 'category',
                            key: 'category',
                            render: (category: string) => {
                                const categoryMap = {
                                    concrete: { color: 'blue', text: '混凝土' },
                                    steel: { color: 'orange', text: '钢材' },
                                    soil: { color: 'green', text: '土体' },
                                    composite: { color: 'purple', text: '复合材料' }
                                };
                                const info = categoryMap[category as keyof typeof categoryMap] || { color: 'default', text: category };
                                return <Tag color={info.color}>{info.text}</Tag>;
                            }
                        },
                        {
                            title: '弹性模量 (MPa)',
                            dataIndex: 'elasticModulus',
                            key: 'elasticModulus',
                            render: (value: number) => (
                                <Text style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{value.toLocaleString()}</Text>
                            )
                        },
                        {
                            title: '泊松比',
                            dataIndex: 'poissonRatio',
                            key: 'poissonRatio',
                            render: (value: number) => (
                                <Text style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{value}</Text>
                            )
                        },
                        {
                            title: '密度 (kg/m³)',
                            dataIndex: 'density',
                            key: 'density',
                            render: (value: number) => (
                                <Text style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{value.toLocaleString()}</Text>
                            )
                        },
                        {
                            title: '强度 (MPa)',
                            dataIndex: 'strength',
                            key: 'strength',
                            render: (value: number) => (
                                <Text style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{value}</Text>
                            )
                        },
                        {
                            title: '状态',
                            dataIndex: 'isActive',
                            key: 'isActive',
                            render: (isActive: boolean) => (
                                <Badge 
                                    status={isActive ? 'success' : 'default'} 
                                    text={isActive ? '启用' : '禁用'}
                                    style={{ color: isActive ? '#52c41a' : 'rgba(255,255,255,0.5)' }}
                                />
                            )
                        },
                        {
                            title: '操作',
                            key: 'action',
                            render: (_, record: Material) => (
                                <Space size="small">
                                    <Button 
                                        type="link" 
                                        icon={<EyeOutlined />} 
                                        size="small"
                                        style={{ color: '#00d9ff' }}
                                        onClick={() => {
                                            setSelectedMaterial(record);
                                            setModalType('view');
                                            setModalVisible(true);
                                        }}
                                    >
                                        查看
                                    </Button>
                                    <Button 
                                        type="link" 
                                        icon={<EditOutlined />} 
                                        size="small"
                                        style={{ color: '#52c41a' }}
                                        onClick={() => {
                                            setSelectedMaterial(record);
                                            setModalType('edit');
                                            setModalVisible(true);
                                        }}
                                    >
                                        编辑
                                    </Button>
                                    <Button 
                                        type="link" 
                                        icon={<CopyOutlined />} 
                                        size="small"
                                        style={{ color: '#faad14' }}
                                        onClick={() => {
                                            const newMaterial = { ...record, id: Date.now().toString(), name: record.name + ' 副本' };
                                            setMaterials([...materials, newMaterial]);
                                            message.success('材料复制成功');
                                        }}
                                    >
                                        复制
                                    </Button>
                                    <Popconfirm
                                        title="确定删除此材料吗？"
                                        onConfirm={() => {
                                            setMaterials(materials.filter(m => m.id !== record.id));
                                            message.success('材料删除成功');
                                        }}
                                        okText="删除"
                                        cancelText="取消"
                                    >
                                        <Button 
                                            type="link" 
                                            icon={<DeleteOutlined />} 
                                            size="small"
                                            style={{ color: '#ff4d4f' }}
                                        >
                                            删除
                                        </Button>
                                    </Popconfirm>
                                </Space>
                            )
                        }
                    ]}
                    dataSource={materials.filter(material => {
                        const matchCategory = materialCategory === 'all' || material.category === materialCategory;
                        const matchKeyword = !searchKeyword || material.name.toLowerCase().includes(searchKeyword.toLowerCase());
                        return matchCategory && matchKeyword;
                    })}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
                    }}
                    style={{
                        background: 'transparent'
                    }}
                />
            </div>

            {/* 渲染模态框 */}
            {renderModal()}
            
            {/* 状态栏 */}
            <StatusBar viewType="materials" />
        </div>
    );
};

export default MaterialsView;