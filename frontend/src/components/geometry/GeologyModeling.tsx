import React, { useState, useEffect } from 'react';
import { 
  Layout, Form, InputNumber, Button, Upload, message, Spin, Alert, 
  Row, Col, Card, Statistic, Tooltip, Typography, Select, Table, 
  Modal, Progress, Space, Tabs, Switch, Tag, Collapse, Divider, 
  Radio, Slider, notification, Badge
} from 'antd';
import { 
  UploadOutlined, BuildOutlined, DatabaseOutlined, AppstoreOutlined,
  FileTextOutlined, SettingOutlined, EyeOutlined, DeleteOutlined,
  EditOutlined, PlusOutlined, ExclamationCircleOutlined, BarChartOutlined,
  LineChartOutlined, ThunderboltOutlined, ExperimentOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import GeologyThreeViewer from '../geology/GeologyThreeViewer';
import { apiClient } from '../../api/client';

const { Content } = Layout;
const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Mock borehole data with detailed geological information
const MOCK_BOREHOLES = [
    { 
      id: 'ZK001', 
      x: 10, y: 15, groundLevel: 2.5,
      layers: [
        { name: '填土', depth: 0, thickness: 2.0, type: 'fill', color: '#8B4513' },
        { name: '粉质粘土', depth: 2.0, thickness: 5.5, type: 'clay', color: '#A0522D' },
        { name: '淤泥质土', depth: 7.5, thickness: 3.0, type: 'silt', color: '#2F4F4F' },
        { name: '砂土', depth: 10.5, thickness: 4.5, type: 'sand', color: '#DEB887' },
        { name: '岩石', depth: 15.0, thickness: 10.0, type: 'rock', color: '#696969' }
      ]
    },
    { 
      id: 'ZK002', 
      x: 45, y: 30, groundLevel: 2.8,
      layers: [
        { name: '填土', depth: 0, thickness: 1.5, type: 'fill', color: '#8B4513' },
        { name: '粉质粘土', depth: 1.5, thickness: 6.0, type: 'clay', color: '#A0522D' },
        { name: '淤泥质土', depth: 7.5, thickness: 2.5, type: 'silt', color: '#2F4F4F' },
        { name: '砂土', depth: 10.0, thickness: 5.0, type: 'sand', color: '#DEB887' },
        { name: '岩石', depth: 15.0, thickness: 10.0, type: 'rock', color: '#696969' }
      ]
    },
    { 
      id: 'ZK003', 
      x: 70, y: 45, groundLevel: 3.2,
      layers: [
        { name: '填土', depth: 0, thickness: 2.5, type: 'fill', color: '#8B4513' },
        { name: '粉质粘土', depth: 2.5, thickness: 4.5, type: 'clay', color: '#A0522D' },
        { name: '淤泥质土', depth: 7.0, thickness: 4.0, type: 'silt', color: '#2F4F4F' },
        { name: '砂土', depth: 11.0, thickness: 4.0, type: 'sand', color: '#DEB887' },
        { name: '岩石', depth: 15.0, thickness: 10.0, type: 'rock', color: '#696969' }
      ]
    }
];

const GeologyModeling: React.FC = () => {
    console.log('🌍 GeologyModeling 重新渲染 - 深色主题版本');
    
    const [form] = Form.useForm();
    const [boreholes, setBoreholes] = useState<any[]>(MOCK_BOREHOLES);
    const [boreholeExtents, setBoreholeExtents] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    const [loading, setLoading] = useState(false);
    const [gltfUrl, setGltfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('boreholes');
    const [selectedBorehole, setSelectedBorehole] = useState<string | null>(null);
    const [interpolationMethod, setInterpolationMethod] = useState('ordinary_kriging');
    const [variogramModel, setVariogramModel] = useState('exponential');
    const [generationProgress, setGenerationProgress] = useState(0);
    const [useRBFModeling, setUseRBFModeling] = useState(true);
    const [variogramAnalysis, setVariogramAnalysis] = useState<any>(null);
    const [uncertaintyAnalysis, setUncertaintyAnalysis] = useState<any>(null);
    const [autoFitVariogram, setAutoFitVariogram] = useState(true);

    useEffect(() => {
        if (boreholes.length > 0) {
            const xs = boreholes.map(p => p.x);
            const ys = boreholes.map(p => p.y);
            setBoreholeExtents({ minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
        }
    }, [boreholes]);

    const onFinish = async (values: any) => {
        setLoading(true);
        setError(null);
        setGltfUrl(null);
        setVariogramAnalysis(null);
        setUncertaintyAnalysis(null);
        
        if (useRBFModeling) {
            // 使用RBF高级建模
            const enhancedBoreholes = boreholes.map((bh: any) => ({
                id: bh.id,
                x: bh.x,
                y: bh.y,
                z: bh.groundLevel || 0,
                soil_type: bh.layers?.[0]?.type || 'unknown',
                layer_id: 1,
                description: `钻孔${bh.id}`
            }));

            const rbfPayload = {
                boreholes: enhancedBoreholes,
                soil_layers: [],
                interpolation_method: interpolationMethod,
                variogram_model: variogramModel,
                grid_resolution: values.grid_resolution,
                domain_expansion: [values.domain_dx, values.domain_dy],
                auto_fit_variogram: autoFitVariogram,
                colormap: values.colormap || 'terrain',
                uncertainty_analysis: true
            };

            try {
                const response = await apiClient.post('/geology/rbf-geology', rbfPayload);
                if (response.data && response.data.gltf_url) {
                    notification.success({
                        message: '地质建模成功',
                        description: response.data.message,
                        duration: 3
                    });
                    setGltfUrl(response.data.gltf_url);
                    setVariogramAnalysis(response.data.variogram_analysis);
                    setUncertaintyAnalysis(response.data.uncertainty_analysis);
                } else {
                    throw new Error("Invalid response from RBF modeling service");
                }
            } catch (err: any) {
                console.error(err);
                const detail = err.response?.data?.detail || '地质建模失败';
                setError(`地质建模失败: ${detail}`);
                message.error(`地质建模失败: ${detail}`);
            }
        } else {
            // 使用基础土层生成
            const requestPayload = {
                boreholes: boreholes.map((bh: any) => ({ x: bh.x, y: bh.y, z: bh.groundLevel || 0 })),
                domain_expansion: [values.domain_dx, values.domain_dy],
                bottom_elevation: values.bottom_elevation,
                transition_distance: values.transition_distance,
                grid_resolution: values.grid_resolution
            };

            try {
                const response = await apiClient.post('/geology/generate-soil-domain', requestPayload);
                if (response.data && response.data.gltf_url) {
                    message.success(response.data.message);
                    setGltfUrl(response.data.gltf_url);
                } else {
                    throw new Error("Invalid response from server");
                }
            } catch (err: any) {
                console.error(err);
                const detail = err.response?.data?.detail || 'An unknown error occurred.';
                setError(`Failed to generate soil domain: ${detail}`);
                message.error(`Generation Failed: ${detail}`);
            }
        }
        
        setLoading(false);
    };
    
    // 获取变差函数分析
    const performVariogramAnalysis = async () => {
        if (boreholes.length < 3) {
            message.warning('至少需要3个钻孔点进行变差函数分析');
            return;
        }

        try {
            setLoading(true);
            const response = await apiClient.get(`/geology/variogram-analysis/${variogramModel}`);
            if (response.data && response.data.status === 'success') {
                setVariogramAnalysis(response.data);
                notification.success({
                    message: '变差函数分析完成',
                    description: `数据质量: ${response.data.recommendations.data_quality}`,
                    duration: 3
                });
            }
        } catch (err: any) {
            message.error('变差函数分析失败');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadChange = (info: any) => {
        if (info.file.status === 'done') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsedBoreholes = JSON.parse(e.target!.result as string);
                    setBoreholes(parsedBoreholes);
                    message.success(`${info.file.name} file uploaded and parsed successfully.`);
                } catch (jsonError) {
                    message.error("Failed to parse JSON file. Please ensure it's a valid JSON array of boreholes.");
                }
            };
            reader.readAsText(info.file.originFileObj);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} file upload failed.`);
        }
    };

    // 添加新钻孔
    const addBorehole = () => {
        const newBorehole = {
            id: `ZK${String(boreholes.length + 1).padStart(3, '0')}`,
            x: 0,
            y: 0,
            groundLevel: 0,
            layers: [
                { name: '填土', depth: 0, thickness: 2.0, type: 'fill', color: '#8B4513' }
            ]
        };
        setBoreholes([...boreholes, newBorehole]);
        message.success('新钻孔已添加');
    };

    // 删除钻孔
    const deleteBorehole = (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除钻孔 ${id} 吗？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                setBoreholes(boreholes.filter(bh => bh.id !== id));
                message.success('钻孔已删除');
            }
        });
    };

    // 编辑钻孔
    const editBorehole = (id: string) => {
        const borehole = boreholes.find(bh => bh.id === id);
        if (!borehole) return;
        
        setSelectedBorehole(id);
        message.info(`编辑钻孔 ${id} 功能开发中`);
    };

    // 钻孔数据表格列定义
    const boreholeColumns = [
        {
            title: '钻孔编号',
            dataIndex: 'id',
            key: 'id',
            render: (text: string) => <Text strong style={{ color: '#ffffff' }}>{text}</Text>
        },
        {
            title: 'X坐标 (m)',
            dataIndex: 'x',
            key: 'x',
            render: (value: number) => <span style={{ color: '#ffffff' }}>{value.toFixed(2)}</span>
        },
        {
            title: 'Y坐标 (m)',
            dataIndex: 'y',
            key: 'y',
            render: (value: number) => <span style={{ color: '#ffffff' }}>{value.toFixed(2)}</span>
        },
        {
            title: '地面标高 (m)',
            dataIndex: 'groundLevel',
            key: 'groundLevel',
            render: (value: number) => <span style={{ color: '#ffffff' }}>{value.toFixed(2)}</span>
        },
        {
            title: '地层数',
            dataIndex: 'layers',
            key: 'layerCount',
            render: (layers: any[]) => <span style={{ color: '#ffffff' }}>{layers.length}</span>
        },
        {
            title: '操作',
            key: 'action',
            render: (_, record) => (
                <Space size="small">
                    <Button 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => setSelectedBorehole(record.id)}
                        style={{ background: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.3)', color: '#00d9ff' }}
                    >
                        查看
                    </Button>
                    <Button 
                        size="small" 
                        icon={<EditOutlined />}
                        onClick={() => editBorehole(record.id)}
                        style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#8b5cf6' }}
                    >
                        编辑
                    </Button>
                    <Button 
                        size="small" 
                        icon={<DeleteOutlined />} 
                        danger
                        onClick={() => deleteBorehole(record.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    // 渲染钻孔详情模态框
    const renderBoreholeDetailModal = () => {
        const borehole = boreholes.find(b => b.id === selectedBorehole);
        if (!borehole) return null;

        return (
            <Modal
                title={<span style={{ color: '#00d9ff' }}>钻孔详情 - {borehole.id}</span>}
                open={!!selectedBorehole}
                onCancel={() => setSelectedBorehole(null)}
                footer={null}
                width={600}
                style={{ background: '#1a1a2e' }}
                styles={{
                    content: { background: '#1a1a2e', color: '#ffffff' },
                    header: { background: '#1a1a2e', borderBottom: '1px solid rgba(0, 217, 255, 0.3)' }
                }}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Statistic title={<span style={{ color: '#a0a0a0' }}>X坐标</span>} value={borehole.x} suffix="m" valueStyle={{ color: '#ffffff' }} />
                        </Col>
                        <Col span={8}>
                            <Statistic title={<span style={{ color: '#a0a0a0' }}>Y坐标</span>} value={borehole.y} suffix="m" valueStyle={{ color: '#ffffff' }} />
                        </Col>
                        <Col span={8}>
                            <Statistic title={<span style={{ color: '#a0a0a0' }}>地面标高</span>} value={borehole.groundLevel} suffix="m" valueStyle={{ color: '#ffffff' }} />
                        </Col>
                    </Row>
                    
                    <div style={{ marginTop: '16px' }}>
                        <Title level={5} style={{ color: '#00d9ff' }}>地层信息</Title>
                        {borehole.layers.map((layer: any, index: number) => (
                            <div 
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px',
                                    marginBottom: '4px',
                                    border: '1px solid rgba(0, 217, 255, 0.3)',
                                    borderRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.05)'
                                }}
                            >
                                <div 
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: layer.color,
                                        marginRight: '12px',
                                        borderRadius: '2px'
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <Text strong style={{ color: '#ffffff' }}>{layer.name}</Text>
                                    <div style={{ fontSize: '12px', color: '#a0a0a0' }}>
                                        深度: {layer.depth}m - {layer.depth + layer.thickness}m (厚度: {layer.thickness}m)
                                    </div>
                                </div>
                                <Tag color={layer.type === 'rock' ? 'red' : layer.type === 'sand' ? 'orange' : 'blue'}>
                                    {layer.type}
                                </Tag>
                            </div>
                        ))}
                    </div>
                </Space>
            </Modal>
        );
    };

    return (
        <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            background: '#1a1a2e',
            overflow: 'hidden',
            borderRadius: '12px'
        }}>
            <Row gutter={[16, 16]} style={{ height: '100%', padding: '16px' }}>
                {/* 左侧数据面板 */}
                <Col span={8}>
                    <Card 
                        className="glass-card"
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ExperimentOutlined style={{ color: '#00d9ff', fontSize: '20px' }} />
                                <span style={{ color: '#00d9ff', fontSize: '16px', fontWeight: 'bold' }}>地质建模</span>
                                {useRBFModeling && <Tag color="blue" style={{ background: '#10b981', border: 'none' }}>高级模式</Tag>}
                            </div>
                        }
                        style={{ 
                            height: '100%',
                            background: 'rgba(26, 26, 46, 0.8)',
                            border: '1px solid rgba(0, 217, 255, 0.3)',
                            backdropFilter: 'blur(10px)'
                        }}
                        bodyStyle={{ padding: '16px', height: 'calc(100% - 60px)', overflow: 'auto' }}
                    >
                        <Tabs 
                            activeKey={activeTab} 
                            onChange={setActiveTab}
                            type="card"
                            style={{ height: '100%' }}
                            items={[
                                {
                                    key: 'boreholes',
                                    label: <span style={{ color: '#ffffff' }}><DatabaseOutlined style={{ color: '#00d9ff' }} /> 钻孔数据</span>,
                                    children: (
                                        <div style={{ height: 'calc(100% - 50px)', overflow: 'auto' }}>
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <Dragger 
                                                    name="file"
                                                    multiple={false}
                                                    beforeUpload={() => false}
                                                    onChange={handleUploadChange}
                                                    accept=".json,.csv"
                                                    style={{ 
                                                        marginBottom: '16px',
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        borderColor: 'rgba(0, 217, 255, 0.3)'
                                                    }}
                                                >
                                                    <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: '#00d9ff' }} /></p>
                                                    <p className="ant-upload-text" style={{ color: '#ffffff' }}>上传钻孔数据文件</p>
                                                    <p className="ant-upload-hint" style={{ color: '#a0a0a0' }}>支持JSON、CSV格式</p>
                                                </Dragger>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <Text strong style={{ color: '#ffffff' }}>钻孔列表 ({boreholes.length})</Text>
                                                    <Space>
                                                        <Button 
                                                            size="small" 
                                                            icon={<PlusOutlined />} 
                                                            onClick={addBorehole}
                                                            style={{ 
                                                                background: 'linear-gradient(45deg, #00d9ff, #10b981)', 
                                                                border: 'none', 
                                                                color: 'white' 
                                                            }}
                                                        >
                                                            添加
                                                        </Button>
                                                        <Button 
                                                            size="small" 
                                                            icon={<BarChartOutlined />} 
                                                            onClick={performVariogramAnalysis}
                                                            style={{ 
                                                                background: 'linear-gradient(45deg, #8b5cf6, #00d9ff)', 
                                                                border: 'none', 
                                                                color: 'white' 
                                                            }}
                                                        >
                                                            分析
                                                        </Button>
                                                    </Space>
                                                </div>

                                                <Table
                                                    dataSource={boreholes}
                                                    columns={boreholeColumns}
                                                    size="small"
                                                    pagination={false}
                                                    rowKey="id"
                                                    scroll={{ y: 200 }}
                                                    style={{ 
                                                        background: 'rgba(255, 255, 255, 0.05)'
                                                    }}
                                                />
                                            </Space>
                                        </div>
                                    )
                                },
                                {
                                    key: 'settings',
                                    label: <span style={{ color: '#ffffff' }}><SettingOutlined style={{ color: '#00d9ff' }} /> 生成设置</span>,
                                    children: (
                                        <div style={{ height: 'calc(100% - 50px)', overflow: 'auto' }}>
                                            <Form
                                                form={form}
                                                layout="vertical"
                                                onFinish={onFinish}
                                                initialValues={{
                                                    domain_dx: 50,
                                                    domain_dy: 50,
                                                    bottom_elevation: -30,
                                                    transition_distance: 50,
                                                    grid_resolution: 2.0,
                                                    colormap: 'terrain'
                                                }}
                                            >
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    <Card 
                                                        size="small" 
                                                        title={<span style={{ color: '#00d9ff' }}>建模方式</span>} 
                                                        style={{ 
                                                            marginBottom: '16px', 
                                                            border: '1px solid rgba(0, 217, 255, 0.3)', 
                                                            background: 'rgba(255, 255, 255, 0.05)' 
                                                        }}
                                                        styles={{
                                                            header: { background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(0, 217, 255, 0.3)' },
                                                            body: { background: 'rgba(255, 255, 255, 0.05)' }
                                                        }}
                                                    >
                                                        <Radio.Group 
                                                            value={useRBFModeling} 
                                                            onChange={(e) => setUseRBFModeling(e.target.value)}
                                                            style={{ width: '100%' }}
                                                        >
                                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                                <Radio value={true} style={{ color: '#ffffff' }}>
                                                                    <Space>
                                                                        <ExperimentOutlined style={{ color: '#00d9ff' }} />
                                                                        <span style={{ color: '#ffffff' }}>高级地质建模</span>
                                                                        <Tag color="blue">推荐</Tag>
                                                                    </Space>
                                                                </Radio>
                                                                <Radio value={false} style={{ color: '#ffffff' }}>
                                                                    <Space>
                                                                        <AppstoreOutlined style={{ color: '#00d9ff' }} />
                                                                        <span style={{ color: '#ffffff' }}>基础土层生成</span>
                                                                    </Space>
                                                                </Radio>
                                                            </Space>
                                                        </Radio.Group>
                                                    </Card>

                                                    <Card 
                                                        size="small" 
                                                        title={<span style={{ color: '#00d9ff' }}>网格设置</span>} 
                                                        style={{ 
                                                            border: '1px solid rgba(0, 217, 255, 0.3)', 
                                                            background: 'rgba(255, 255, 255, 0.05)' 
                                                        }}
                                                        styles={{
                                                            header: { background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(0, 217, 255, 0.3)' },
                                                            body: { background: 'rgba(255, 255, 255, 0.05)' }
                                                        }}
                                                    >
                                                        <Row gutter={16}>
                                                            <Col span={12}>
                                                                <Form.Item 
                                                                    label={<span style={{ color: '#ffffff' }}>X方向扩展 (m)</span>} 
                                                                    name="domain_dx"
                                                                >
                                                                    <InputNumber 
                                                                        style={{ 
                                                                            width: '100%',
                                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                                            borderColor: 'rgba(0, 217, 255, 0.3)',
                                                                            color: '#ffffff'
                                                                        }} 
                                                                        min={0} 
                                                                    />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={12}>
                                                                <Form.Item 
                                                                    label={<span style={{ color: '#ffffff' }}>Y方向扩展 (m)</span>} 
                                                                    name="domain_dy"
                                                                >
                                                                    <InputNumber 
                                                                        style={{ 
                                                                            width: '100%',
                                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                                            borderColor: 'rgba(0, 217, 255, 0.3)',
                                                                            color: '#ffffff'
                                                                        }} 
                                                                        min={0} 
                                                                    />
                                                                </Form.Item>
                                                            </Col>
                                                        </Row>
                                                        
                                                        <Form.Item 
                                                            label={<span style={{ color: '#ffffff' }}>网格分辨率 (m)</span>} 
                                                            name="grid_resolution"
                                                        >
                                                            <InputNumber 
                                                                style={{ 
                                                                    width: '100%',
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    borderColor: 'rgba(0, 217, 255, 0.3)',
                                                                    color: '#ffffff'
                                                                }} 
                                                                min={0.1} 
                                                                max={10} 
                                                                step={0.1} 
                                                            />
                                                        </Form.Item>
                                                    </Card>
                                                </Space>
                                                
                                                <Form.Item style={{ marginTop: '16px' }}>
                                                    <Button 
                                                        type="primary" 
                                                        htmlType="submit" 
                                                        loading={loading} 
                                                        icon={useRBFModeling ? <ExperimentOutlined /> : <BuildOutlined />} 
                                                        block
                                                        size="large"
                                                        style={{ 
                                                            background: useRBFModeling ? 'linear-gradient(45deg, #00d9ff, #10b981)' : 'linear-gradient(45deg, #00d9ff, #8b5cf6)',
                                                            border: 'none',
                                                            color: 'white',
                                                            boxShadow: useRBFModeling ? '0 0 20px rgba(16, 185, 129, 0.5)' : '0 0 20px rgba(0, 217, 255, 0.5)',
                                                            height: '40px',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        {loading ? (
                                                            useRBFModeling ? '地质建模中...' : '生成中...'
                                                        ) : (
                                                            useRBFModeling ? '启动高级建模' : '生成地质模型'
                                                        )}
                                                    </Button>
                                                </Form.Item>

                                                {loading && (
                                                    <div style={{ marginTop: '16px' }}>
                                                        <Text style={{ color: '#ffffff' }}>生成进度</Text>
                                                        <Progress 
                                                            percent={generationProgress} 
                                                            status="active"
                                                            strokeColor={{
                                                                '0%': '#00d9ff',
                                                                '100%': '#10b981',
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {error && (
                                                    <Alert 
                                                        message={error} 
                                                        type="error" 
                                                        showIcon 
                                                        style={{ 
                                                            marginTop: '16px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            color: '#ef4444'
                                                        }} 
                                                    />
                                                )}
                                            </Form>
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </Card>
                </Col>

                {/* 右侧3D视口 */}
                <Col span={16}>
                    <Card 
                        className="glass-card"
                        title={
                            <Space>
                                <ThunderboltOutlined style={{ color: '#00d9ff' }} />
                                <span style={{ color: '#00d9ff', textShadow: '0 0 5px #00d9ff' }}>三维地质模型</span>
                                {gltfUrl && <Badge status="success" text="已加载" style={{ color: '#10b981' }} />}
                                {useRBFModeling && <Tag style={{ background: '#00d9ff', border: 'none', color: 'white' }}>RBF</Tag>}
                            </Space>
                        }
                        bodyStyle={{ padding: 0, height: 'calc(100% - 60px)' }}
                        style={{
                            height: '100%',
                            background: 'rgba(26, 26, 46, 0.8)',
                            border: '1px solid rgba(0, 217, 255, 0.3)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: uncertaintyAnalysis ? '0 0 20px rgba(16, 185, 129, 0.5)' : '0 0 15px rgba(0, 217, 255, 0.5)'
                        }}
                        extra={
                            <Space>
                                {uncertaintyAnalysis && (
                                    <Tooltip title="不确定性分析可用">
                                        <Button 
                                            size="small" 
                                            icon={<BarChartOutlined />} 
                                            style={{ background: 'linear-gradient(45deg, #f59e0b, #10b981)', border: 'none', color: 'white' }}
                                        >
                                            不确定性
                                        </Button>
                                    </Tooltip>
                                )}
                            </Space>
                        }
                    >
                        <GeologyThreeViewer 
                            modelUrl={gltfUrl ? `${apiClient.defaults.baseURL}${gltfUrl}` : undefined}
                            boreholeData={boreholes.map(bh => ({
                                id: bh.id,
                                x: bh.x,
                                y: bh.y,
                                z: bh.groundLevel || 0,
                                soil_type: bh.layers?.[0]?.type || 'unknown',
                                description: `钻孔${bh.id}`
                            }))}
                            onModelLoad={(mesh) => {
                                console.log('地质模型已加载:', mesh);
                            }}
                            onBoreholeSelect={(borehole) => {
                                setSelectedBorehole(borehole.id);
                            }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 钻孔详情模态框 */}
            {renderBoreholeDetailModal()}
        </div>
    );
};

export default GeologyModeling;