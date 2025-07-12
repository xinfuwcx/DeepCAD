import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, Form, InputNumber, Button, Upload, message, Spin, Alert, 
  Row, Col, Card, Statistic, Tooltip, Typography, Select, Table, 
  Modal, Progress, Space, Tabs, Switch, Tag, Collapse
} from 'antd';
import { 
  UploadOutlined, BuildOutlined, DatabaseOutlined, LayersOutlined,
  FileTextOutlined, SettingOutlined, EyeOutlined, DeleteOutlined,
  EditOutlined, PlusOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SoilDomainCanvas2D } from '../components/SoilDomainCanvas2D';
import { apiClient } from '../api/client';

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

const GeologyView: React.FC = () => {
    const [form] = Form.useForm();
    const [boreholes, setBoreholes] = useState<any[]>(MOCK_BOREHOLES);
    const [boreholeExtents, setBoreholeExtents] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    const [loading, setLoading] = useState(false);
    const [gltfUrl, setGltfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('boreholes');
    const [selectedBorehole, setSelectedBorehole] = useState<string | null>(null);
    const [showLayerEditor, setShowLayerEditor] = useState(false);
    const [interpolationMethod, setInterpolationMethod] = useState('kriging');
    const [generationProgress, setGenerationProgress] = useState(0);

    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const rendererRef = useRef<THREE.WebGLRenderer>();

    useEffect(() => {
        if (boreholes.length > 0) {
            const xs = boreholes.map(p => p.x);
            const ys = boreholes.map(p => p.y);
            setBoreholeExtents({ minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
        }
    }, [boreholes]);

    useEffect(() => {
        // Three.js setup
        const mount = mountRef.current;
        if (!mount) return;

        // Scene
        sceneRef.current.background = new THREE.Color(0xf0f2f5);
        
        // Camera
        cameraRef.current = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        cameraRef.current.position.set(50, 50, 50);

        // Renderer
        rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current.setSize(mount.clientWidth, mount.clientHeight);
        rendererRef.current.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(rendererRef.current.domElement);
        
        // Controls
        const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
        controls.enableDamping = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        sceneRef.current.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        sceneRef.current.add(directionalLight);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(200, 20, 0xcccccc, 0xcccccc);
        sceneRef.current.add(gridHelper);

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            rendererRef.current?.render(sceneRef.current, cameraRef.current!);
        };
        animate();

        const handleResize = () => {
            if(cameraRef.current && rendererRef.current && mount){
                cameraRef.current.aspect = mount.clientWidth / mount.clientHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(mount.clientWidth, mount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            mount.removeChild(rendererRef.current!.domElement);
        };
    }, []);

    useEffect(() => {
        if (gltfUrl) {
            const loader = new GLTFLoader();
            const fullUrl = `${apiClient.defaults.baseURL}${gltfUrl}`;
            
            loader.load(
                fullUrl,
                (gltf) => {
                    // Clear previous model
                    const prevModel = sceneRef.current.getObjectByName('soil_model');
                    if (prevModel) sceneRef.current.remove(prevModel);

                    const model = gltf.scene;
                    model.name = 'soil_model';
                    sceneRef.current.add(model);
                    
                    // Center camera on the new model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const fov = cameraRef.current!.fov * (Math.PI / 180);
                    let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
                    cameraZ *= 1.5; // zoom out a bit
                    cameraRef.current!.position.set(center.x, center.y, center.z + cameraZ);
                    const minZ = box.min.z;
                    const cameraToFarEdge = minZ < 0 ? -minZ + size.z : size.z;
                    cameraRef.current!.far = cameraToFarEdge * 3;
                    cameraRef.current!.updateProjectionMatrix();
                },
                undefined,
                (error) => {
                    console.error('An error happened during GLTF loading', error);
                    setError('Failed to load the 3D model.');
                }
            );
        }
    }, [gltfUrl]);

    const onFinish = async (values: any) => {
        setLoading(true);
        setError(null);
        setGltfUrl(null);
        
        const requestPayload = {
            boreholes: boreholes,
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
                    // Add basic validation here if needed
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

    // 钻孔数据表格列定义
    const boreholeColumns = [
        {
            title: '钻孔编号',
            dataIndex: 'id',
            key: 'id',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'X坐标 (m)',
            dataIndex: 'x',
            key: 'x',
            render: (value: number) => value.toFixed(2)
        },
        {
            title: 'Y坐标 (m)',
            dataIndex: 'y',
            key: 'y',
            render: (value: number) => value.toFixed(2)
        },
        {
            title: '地面标高 (m)',
            dataIndex: 'groundLevel',
            key: 'groundLevel',
            render: (value: number) => value.toFixed(2)
        },
        {
            title: '地层数',
            dataIndex: 'layers',
            key: 'layerCount',
            render: (layers: any[]) => layers.length
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
                    >
                        查看
                    </Button>
                    <Button size="small" icon={<EditOutlined />}>编辑</Button>
                    <Button size="small" icon={<DeleteOutlined />} danger>删除</Button>
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
                title={`钻孔详情 - ${borehole.id}`}
                open={!!selectedBorehole}
                onCancel={() => setSelectedBorehole(null)}
                footer={null}
                width={600}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Statistic title="X坐标" value={borehole.x} suffix="m" />
                        </Col>
                        <Col span={8}>
                            <Statistic title="Y坐标" value={borehole.y} suffix="m" />
                        </Col>
                        <Col span={8}>
                            <Statistic title="地面标高" value={borehole.groundLevel} suffix="m" />
                        </Col>
                    </Row>
                    
                    <div style={{ marginTop: '16px' }}>
                        <Title level={5}>地层信息</Title>
                        {borehole.layers.map((layer: any, index: number) => (
                            <div 
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px',
                                    marginBottom: '4px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px'
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
                                    <Text strong>{layer.name}</Text>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
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
        <div className="geology-view fade-in">
            <div className="geology-header">
                <Title level={2} style={{ color: 'white', margin: 0 }}>地质建模</Title>
                <Space>
                    <Button icon={<DatabaseOutlined />}>材料库</Button>
                    <Button icon={<FileTextOutlined />}>导出报告</Button>
                    <Button type="primary" icon={<BuildOutlined />} loading={loading}>
                        生成模型
                    </Button>
                </Space>
            </div>

            <Row gutter={16} style={{ height: 'calc(100% - 48px)' }}>
                <Col span={8}>
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
                                tab={<span><DatabaseOutlined /> 钻孔数据</span>} 
                                key="boreholes"
                                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Dragger 
                                            name="file"
                                            multiple={false}
                                            beforeUpload={() => false}
                                            onChange={handleUploadChange}
                                            accept=".json,.csv"
                                            style={{ marginBottom: '16px' }}
                                        >
                                            <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                            <p className="ant-upload-text">上传钻孔数据文件</p>
                                            <p className="ant-upload-hint">支持JSON、CSV格式</p>
                                        </Dragger>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <Text strong>钻孔列表 ({boreholes.length})</Text>
                                            <Button size="small" icon={<PlusOutlined />}>添加</Button>
                                        </div>

                                        <Table
                                            dataSource={boreholes}
                                            columns={boreholeColumns}
                                            size="small"
                                            pagination={false}
                                            rowKey="id"
                                            scroll={{ y: 300 }}
                                        />
                                    </Space>
                                </div>
                            </TabPane>

                            <TabPane 
                                tab={<span><LayersOutlined /> 地层分析</span>} 
                                key="layers"
                                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <Collapse>
                                        <Panel header="地层统计信息" key="1">
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Statistic title="地层类型" value="5" />
                                                </Col>
                                                <Col span={12}>
                                                    <Statistic title="平均厚度" value="3.2" suffix="m" />
                                                </Col>
                                            </Row>
                                        </Panel>
                                        <Panel header="地层分布" key="2">
                                            {['填土', '粉质粘土', '淤泥质土', '砂土', '岩石'].map((layer, index) => (
                                                <div key={index} style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    padding: '4px 0' 
                                                }}>
                                                    <span>{layer}</span>
                                                    <Tag>{Math.round(Math.random() * 20 + 10)}%</Tag>
                                                </div>
                                            ))}
                                        </Panel>
                                    </Collapse>
                                </div>
                            </TabPane>

                            <TabPane 
                                tab={<span><SettingOutlined /> 生成设置</span>} 
                                key="settings"
                                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <Form
                                        form={form}
                                        layout="vertical"
                                        onFinish={onFinish}
                                        initialValues={{
                                            domain_dx: 50,
                                            domain_dy: 50,
                                            bottom_elevation: -30,
                                            transition_distance: 50,
                                            grid_resolution: 2.0
                                        }}
                                    >
                                        <Form.Item label="插值方法">
                                            <Select value={interpolationMethod} onChange={setInterpolationMethod}>
                                                <Option value="kriging">克里金插值</Option>
                                                <Option value="rbf">径向基函数</Option>
                                                <Option value="idw">反距离权重</Option>
                                                <Option value="triangulation">三角剖分</Option>
                                            </Select>
                                        </Form.Item>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item label="X方向扩展 (m)" name="domain_dx">
                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label="Y方向扩展 (m)" name="domain_dy">
                                                    <InputNumber style={{ width: '100%' }} min={0} />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        
                                        <Form.Item label="底部标高 (m)" name="bottom_elevation">
                                            <InputNumber style={{ width: '100%' }} />
                                        </Form.Item>

                                        <Form.Item label="过渡距离 (m)" name="transition_distance">
                                            <InputNumber style={{ width: '100%' }} min={1} />
                                        </Form.Item>

                                        <Form.Item label="网格分辨率 (m)" name="grid_resolution">
                                            <InputNumber style={{ width: '100%' }} min={0.1} max={10} step={0.1} />
                                        </Form.Item>
                                        
                                        <Form.Item>
                                            <Button 
                                                type="primary" 
                                                htmlType="submit" 
                                                loading={loading} 
                                                icon={<BuildOutlined />} 
                                                block
                                            >
                                                {loading ? '生成中...' : '生成地质模型'}
                                            </Button>
                                        </Form.Item>

                                        {loading && (
                                            <div style={{ marginTop: '16px' }}>
                                                <Text>生成进度</Text>
                                                <Progress 
                                                    percent={generationProgress} 
                                                    status="active"
                                                    strokeColor={{
                                                        '0%': '#108ee9',
                                                        '100%': '#87d068',
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {error && <Alert message={error} type="error" showIcon style={{ marginTop: '16px' }} />}
                                    </Form>
                                </div>
                            </TabPane>
                        </Tabs>
                    </Card>
                </Col>

                <Col span={16}>
                    <Card 
                        className="theme-card"
                        title="三维地质模型" 
                        bodyStyle={{ padding: 0, height: 'calc(100vh - 180px)' }}
                        extra={
                            <Space>
                                <Button size="small" icon={<EyeOutlined />}>视图</Button>
                                <Button size="small" icon={<SettingOutlined />}>设置</Button>
                            </Space>
                        }
                    >
                        <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
                            {loading && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 0, left: 0, right: 0, bottom: 0, 
                                    background: 'rgba(0,0,0,0.5)', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center', 
                                    zIndex: 10 
                                }}>
                                    <Space direction="vertical" style={{ textAlign: 'center' }}>
                                        <Spin size="large" />
                                        <Text style={{ color: 'white' }}>正在生成三维地质模型...</Text>
                                    </Space>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 钻孔详情模态框 */}
            {renderBoreholeDetailModal()}
        </div>
    );
};

export default GeologyView;
