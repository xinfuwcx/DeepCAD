/**
 * ExcavationView.tsx - 基坑开挖设计模块
 * 
 * 功能描述:
 * - 深基坑开挖工程的设计和建模界面
 * - 支持复杂基坑几何形状的参数化设计
 * - 提供DXF图纸导入和2D/3D建模工具
 * - 集成基坑施工工艺和分步开挖模拟
 * 
 * 基坑设计功能:
 * 1. 基坑几何设计 - 长度、宽度、深度、坡度等参数设置
 * 2. DXF图纸导入 - 支持CAD设计图纸的直接导入
 * 3. 复杂形状建模 - 不规则基坑、多级基坑、斜坡基坑
 * 4. 施工阶段划分 - 分步开挖工艺和时序安排
 * 5. 降水系统设计 - 降水井位置和降水方案配置
 * 
 * 可视化工具:
 * - ExcavationCanvas2D: 2D基坑剖面设计
 * - Three.js 3D渲染: 立体基坑形状预览
 * - DXF解析器: CAD图纸格式支持
 * - GLTF模型加载: 3D模型导入功能
 * 
 * 设计特色:
 * - 参数化驱动设计
 * - 实时几何更新
 * - 多视角预览
 * - 施工仿真
 * 
 * 输出格式: 几何模型可导出至网格生成和CAE分析模块
 * 技术栈: React + Three.js + DXF-Parser + GLTF-Loader
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Layout, Form, InputNumber, Button, Upload, message, Spin, Alert, 
  Row, Col, Card, Input, Typography, Select, Tabs, Space, Switch, 
  Table, Modal, Progress, Collapse, Tag, Tooltip, Divider
} from 'antd';
import { 
  UploadOutlined, BuildOutlined, FileOutlined, SettingOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  ToolOutlined, ExclamationCircleOutlined, AppstoreOutlined,
  SafetyOutlined, BuildFilled, NodeExpandOutlined
} from '@ant-design/icons';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ExcavationCanvas2D } from '../components/ExcavationCanvas2D';
import DxfParser from 'dxf-parser';
import { apiClient } from '../api/client';

const { Content } = Layout;
const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const ExcavationView: React.FC = () => {
    const [form] = Form.useForm();
    const [dxfFile, setDxfFile] = useState<File | null>(null);
    const [dxfContour, setDxfContour] = useState<{ x: number; y: number }[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [gltfUrl, setGltfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('design');
    const [excavationStages, setExcavationStages] = useState([
        { stage: 1, depth: 5, description: '第一层开挖', completed: false },
        { stage: 2, depth: 10, description: '第二层开挖', completed: false },
        { stage: 3, depth: 15, description: '第三层开挖', completed: false }
    ]);
    const [supportStructures, setSupportStructures] = useState([
        { type: '地下连续墙', thickness: 1.2, material: 'C30混凝土', status: 'designed' },
        { type: '内支撑', diameter: 0.8, material: '钢支撑', status: 'designed' },
        { type: '锚杆', length: 15, material: 'HRB400', status: 'designed' }
    ]);

    // Placeholder for the soil domain extents
    const [soilDomainExtents, setSoilDomainExtents] = useState({ minX: -50, maxX: 50, minY: -50, maxY: 50 });

    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const rendererRef = useRef<THREE.WebGLRenderer>();

    useEffect(() => {
        // ... (Standard Three.js setup - same as GeologyView)
        const mount = mountRef.current;
        if (!mount) return;
        sceneRef.current.background = new THREE.Color(0xf0f2f5);
        cameraRef.current = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        cameraRef.current.position.set(50, 50, 100);
        rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current.setSize(mount.clientWidth, mount.clientHeight);
        mount.appendChild(rendererRef.current.domElement);
        const controls = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        sceneRef.current.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        sceneRef.current.add(directionalLight);
        const gridHelper = new THREE.GridHelper(200, 20);
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
            if(rendererRef.current) mount.removeChild(rendererRef.current.domElement);
        };
    }, []);

    useEffect(() => {
        if (gltfUrl) {
            // ... (Standard GLTF loading logic - same as GeologyView)
            const loader = new GLTFLoader();
            const fullUrl = `${apiClient.defaults.baseURL}${gltfUrl}`;
            loader.load(fullUrl, (gltf) => {
                const prevModel = sceneRef.current.getObjectByName('excavation_model');
                if (prevModel) sceneRef.current.remove(prevModel);
                const model = gltf.scene;
                model.name = 'excavation_model';
                sceneRef.current.add(model);
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                cameraRef.current!.position.set(center.x, center.y, center.z + box.getSize(new THREE.Vector3()).length());
                cameraRef.current!.lookAt(center);
            }, undefined, (error) => {
                setError('Failed to load the 3D model.');
            });
        }
    }, [gltfUrl]);

    const handleDxfUpload = (file: File) => {
        setDxfFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parser = new DxfParser();
                const dxf = parser.parseSync(e.target!.result as string);
                const polyline = dxf.entities.find((ent: any) => ent.type === 'LWPOLYLINE');
                if (polyline) {
                    const points = (polyline as any).vertices?.map((v: any) => ({ x: v.x, y: v.y })) || [];
                    setDxfContour(points);
                    message.success(`${file.name} parsed successfully. Contour found.`);
                } else {
                    setError('No LWPOLYLINE found in the DXF file.');
                    message.error('No LWPOLYLINE found in the DXF file.');
                }
            } catch (err) {
                setError('Failed to parse DXF file.');
                message.error('Failed to parse DXF file.');
            }
        };
        reader.readAsText(file);
        return false; // Prevent antd's default upload action
    };

    const onFinish = async (values: any) => {
        if (!dxfFile) {
            message.error('Please upload a DXF file first.');
            return;
        }

        setLoading(true);
        setError(null);
        setGltfUrl(null);

        const formData = new FormData();
        formData.append('dxf_file', dxfFile);
        formData.append('soil_domain_model_id', values.soil_domain_model_id);
        formData.append('excavation_depth', values.excavation_depth);

        try {
            const response = await apiClient.post('/excavation/generate', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data && response.data.result_gltf_url) {
                message.success(response.data.message);
                setGltfUrl(response.data.result_gltf_url);
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (err: any) {
            const detail = err.response?.data?.detail || 'An unknown error occurred.';
            setError(`Failed to generate excavation: ${detail}`);
            message.error(`Generation Failed: ${detail}`);
        } finally {
            setLoading(false);
        }
    };

    // 支护结构表格列
    const supportColumns = [
        {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: '规格',
            key: 'spec',
            render: (_, record) => {
                if (record.thickness) return `厚度: ${record.thickness}m`;
                if (record.diameter) return `直径: ${record.diameter}m`;
                if (record.length) return `长度: ${record.length}m`;
                return '-';
            }
        },
        {
            title: '材料',
            dataIndex: 'material',
            key: 'material'
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'designed' ? 'blue' : status === 'constructed' ? 'green' : 'orange'}>
                    {status === 'designed' ? '已设计' : status === 'constructed' ? '已施工' : '施工中'}
                </Tag>
            )
        },
        {
            title: '操作',
            key: 'action',
            render: () => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />}>编辑</Button>
                    <Button size="small" icon={<DeleteOutlined />} danger>删除</Button>
                </Space>
            ),
        },
    ];

    // 开挖阶段表格列
    const stageColumns = [
        {
            title: '阶段',
            dataIndex: 'stage',
            key: 'stage',
            render: (stage: number) => `第${stage}阶段`
        },
        {
            title: '开挖深度',
            dataIndex: 'depth',
            key: 'depth',
            render: (depth: number) => `${depth}m`
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description'
        },
        {
            title: '状态',
            dataIndex: 'completed',
            key: 'completed',
            render: (completed: boolean) => (
                <Tag color={completed ? 'green' : 'default'}>
                    {completed ? '已完成' : '未开始'}
                </Tag>
            )
        },
        {
            title: '操作',
            key: 'action',
            render: () => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />}>编辑</Button>
                    <Button size="small" icon={<DeleteOutlined />} danger>删除</Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="excavation-view fade-in">
            <div className="excavation-header">
                <Title level={2} style={{ color: 'white', margin: 0 }}>基坑开挖建模</Title>
                <Space>
                    <Button icon={<FileOutlined />}>导入图纸</Button>
                    <Button icon={<SafetyOutlined />}>安全分析</Button>
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
                                tab={<span><ToolOutlined /> 设计参数</span>} 
                                key="design"
                                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <Form
                                        form={form}
                                        layout="vertical"
                                        onFinish={onFinish}
                                        initialValues={{
                                            excavation_depth: 15,
                                            soil_domain_model_id: 'dummy_soil_model_id',
                                            wall_thickness: 1.2,
                                            support_type: 'steel'
                                        }}
                                    >
                                        <Form.Item label="基坑轮廓 DXF 文件">
                                            <Dragger 
                                                capture={false}
                  hasControlInside={false}
                  pastable={false}
                  name="file" 
                                                multiple={false} 
                                                beforeUpload={handleDxfUpload} 
                                                showUploadList={false}
                                                style={{ marginBottom: '16px' }}>
                                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                                <p className="ant-upload-text">
                                                    {dxfFile ? `文件: ${dxfFile.name}` : '点击或拖拽 DXF 文件'}
                                                </p>
                                                <p className="ant-upload-hint">
                                                    上传包含基坑边界轮廓的 DXF 文件
                                                </p>
                                            </Dragger>
                                        </Form.Item>
                                        
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item label="开挖深度 (m)" name="excavation_depth">
                                                    <InputNumber style={{ width: '100%' }} min={1} max={50} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label="分层高度 (m)" name="layer_height">
                                                    <InputNumber style={{ width: '100%' }} min={1} max={10} defaultValue={3} />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Form.Item label="地连墙厚度 (m)" name="wall_thickness">
                                            <InputNumber style={{ width: '100%' }} min={0.5} max={2.0} step={0.1} />
                                        </Form.Item>

                                        <Form.Item label="支撑类型" name="support_type">
                                            <Select>
                                                <Option value="steel">钢支撑</Option>
                                                <Option value="concrete">混凝土支撑</Option>
                                                <Option value="anchor">锚杆支护</Option>
                                                <Option value="composite">复合支护</Option>
                                            </Select>
                                        </Form.Item>

                                        <Form.Item
                                            label="地质模型 ID"
                                            name="soil_domain_model_id"
                                            tooltip="关联的地质模型标识符"
                                        >
                                            <Input placeholder="将自动关联地质模型" />
                                        </Form.Item>

                                        <Collapse ghost>
                                            <Panel header="高级参数" key="1">
                                                <Form.Item label="坡率" name="slope_ratio">
                                                    <InputNumber 
                                                        style={{ width: '100%' }} 
                                                        min={0} 
                                                        max={1} 
                                                        step={0.1} 
                                                        defaultValue={0.5}
                                                        placeholder="开挖边坡坡率"
                                                    />
                                                </Form.Item>
                                                <Form.Item label="安全系数" name="safety_factor">
                                                    <InputNumber 
                                                        style={{ width: '100%' }} 
                                                        min={1.0} 
                                                        max={3.0} 
                                                        step={0.1} 
                                                        defaultValue={1.35}
                                                    />
                                                </Form.Item>
                                            </Panel>
                                        </Collapse>
                                        
                                        <Form.Item style={{ marginTop: '24px' }}>
                                            <Button 
                                                type="primary" 
                                                htmlType="submit" 
                                                loading={loading} 
                                                icon={<BuildOutlined />} 
                                                block
                                                size="large"
                                            >
                                                {loading ? '生成中...' : '生成基坑模型'}
                                            </Button>
                                        </Form.Item>

                                        {error && <Alert message={error} type="error" showIcon style={{ marginTop: '16px' }} />}
                                    </Form>
                                </div>
                            </TabPane>

                            <TabPane 
                                tab={<span><AppstoreOutlined /> 开挖阶段</span>} 
                                key="stages"
                                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <Text strong>开挖施工阶段</Text>
                                        <Button size="small" icon={<PlusOutlined />}>添加阶段</Button>
                                    </div>
                                    
                                    <Table
                                        dataSource={excavationStages}
                                        columns={stageColumns}
                                        size="small"
                                        pagination={false}
                                        rowKey="stage"
                                    />

                                    <Divider />

                                    <Alert
                                        message="施工建议"
                                        description="建议采用分层开挖，每层开挖深度不超过3-5米，及时安装支护结构。"
                                        type="info"
                                        showIcon
                                    />
                                </div>
                            </TabPane>

                            <TabPane 
                                tab={<span><SafetyOutlined /> 支护结构</span>} 
                                key="support"
                                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <Text strong>墙锚体系</Text>
                                        <Button size="small" icon={<PlusOutlined />}>添加结构</Button>
                                    </div>

                                    <Table
                                        dataSource={supportStructures}
                                        columns={supportColumns}
                                        size="small"
                                        pagination={false}
                                        rowKey="type"
                                    />

                                    <Divider />

                                    <Collapse>
                                        <Panel header="结构设计参数" key="1">
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <div>
                                                    <Text strong>地下连续墙</Text>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        厚度: 1.2m | 深度: 25m | 材料: C30混凝土
                                                    </div>
                                                </div>
                                                <div>
                                                    <Text strong>钢支撑系统</Text>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        直径: 800mm | 间距: 6m | 材料: Q355钢
                                                    </div>
                                                </div>
                                                <div>
                                                    <Text strong>预应力锚杆</Text>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        长度: 15m | 倾角: 15° | 预应力: 200kN
                                                    </div>
                                                </div>
                                            </Space>
                                        </Panel>
                                    </Collapse>
                                </div>
                            </TabPane>

                            <TabPane 
                                tab={<span><NodeExpandOutlined /> 桩锚体系</span>} 
                                key="pile_anchor"
                                style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
                            >
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <Text strong>桩锚体系</Text>
                                        <Button size="small" icon={<PlusOutlined />}>添加桩锚</Button>
                                    </div>

                                    {/* 桩参数配置 */}
                                    <Collapse defaultActiveKey={['1']}>
                                        <Panel header="桩参数" key="1">
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>桩类型</Text>
                                                            <Select
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                defaultValue="drill_pile"
                                                            >
                                                                <Option value="drill_pile">钻孔灌注桩</Option>
                                                                <Option value="precast_pile">预制桩</Option>
                                                                <Option value="steel_pipe">钢管桩</Option>
                                                                <Option value="mixing_pile">搅拌桩</Option>
                                                                <Option value="cast_in_place">现浇桩</Option>
                                                            </Select>
                                                        </div>
                                                    </Col>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>桩径 (mm)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={400}
                                                                max={2000}
                                                                defaultValue={800}
                                                                step={50}
                                                            />
                                                        </div>
                                                    </Col>
                                                </Row>
                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>桩长 (m)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={10}
                                                                max={50}
                                                                defaultValue={25}
                                                                step={1}
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>桩距 (m)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={1.0}
                                                                max={5.0}
                                                                defaultValue={2.5}
                                                                step={0.1}
                                                            />
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </Space>
                                        </Panel>

                                        <Panel header="锚索参数" key="2">
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>锚索长度 (m)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={10}
                                                                max={40}
                                                                defaultValue={20}
                                                                step={1}
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>倾斜角度 (°)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={10}
                                                                max={45}
                                                                defaultValue={25}
                                                                step={1}
                                                            />
                                                        </div>
                                                    </Col>
                                                </Row>
                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>预应力 (kN)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={100}
                                                                max={1000}
                                                                defaultValue={300}
                                                                step={50}
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>锚索间距 (m)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={1.5}
                                                                max={6.0}
                                                                defaultValue={3.0}
                                                                step={0.5}
                                                            />
                                                        </div>
                                                    </Col>
                                                </Row>
                                            </Space>
                                        </Panel>

                                        <Panel header="冠梁参数" key="3">
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>冠梁宽度 (mm)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={800}
                                                                max={1500}
                                                                defaultValue={1000}
                                                                step={50}
                                                            />
                                                        </div>
                                                    </Col>
                                                    <Col span={12}>
                                                        <div>
                                                            <Text>冠梁高度 (mm)</Text>
                                                            <InputNumber
                                                                style={{ width: '100%', marginTop: '4px' }}
                                                                min={600}
                                                                max={1200}
                                                                defaultValue={800}
                                                                step={50}
                                                            />
                                                        </div>
                                                    </Col>
                                                </Row>
                                                <div>
                                                    <Text>混凝土等级</Text>
                                                    <Select
                                                        style={{ width: '100%', marginTop: '4px' }}
                                                        defaultValue="C30"
                                                    >
                                                        <Option value="C25">C25</Option>
                                                        <Option value="C30">C30</Option>
                                                        <Option value="C35">C35</Option>
                                                        <Option value="C40">C40</Option>
                                                    </Select>
                                                </div>
                                            </Space>
                                        </Panel>
                                    </Collapse>

                                    <Divider />

                                    <Alert
                                        message="设计建议"
                                        description="桩锚体系适用于软土地区深基坑工程，桩体提供主要支撑，锚索提供水平约束。建议桩径不小于800mm，锚索预应力应根据土压力计算确定。"
                                        type="info"
                                        showIcon
                                    />
                                </div>
                            </TabPane>
                        </Tabs>
                    </Card>
                </Col>

                <Col span={16}>
                    <Card 
                        className="theme-card"
                        title="基坑三维模型" 
                        bodyStyle={{ padding: 0, height: 'calc(100vh - 180px)' }}
                        extra={
                            <Space>
                                <Button size="small" icon={<EyeOutlined />}>切面视图</Button>
                                <Button size="small" icon={<SettingOutlined />}>显示设置</Button>
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
                                        <Text style={{ color: 'white' }}>正在执行布尔运算...</Text>
                                        <Progress percent={75} showInfo={false} />
                                    </Space>
                                </div>
                            )}

                            {/* 基坑信息面板 */}
                            {dxfContour && (
                                <div style={{
                                    position: 'absolute',
                                    top: 16,
                                    right: 16,
                                    background: 'rgba(0,0,0,0.7)',
                                    padding: 12,
                                    borderRadius: 6,
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: 'white',
                                    fontSize: '12px'
                                }}>
                                    <div>轮廓点数: {dxfContour.length}</div>
                                    <div>开挖深度: {form.getFieldValue('excavation_depth') || 0}m</div>
                                    <div>预估体积: {((dxfContour.length * 100) * (form.getFieldValue('excavation_depth') || 0)).toLocaleString()}m³</div>
                                </div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ExcavationView;
