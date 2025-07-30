import React, { useState } from 'react';
import { 
    Typography, 
    Button, 
    Select, 
    Slider, 
    Switch, 
    Progress, 
    Tag, 
    Badge, 
    Space,
    Modal,
    Form,
    InputNumber,
    Upload,
    Tabs,
    Table,
    message,
    Divider
} from 'antd';
import { 
    BarChartOutlined, 
    PlayCircleOutlined,
    SaveOutlined,
    UploadOutlined,
    CloseOutlined,
    MenuOutlined,
    InfoCircleOutlined,
    BorderOutlined,
    ColumnHeightOutlined,
    AimOutlined,
    FullscreenOutlined,
    EyeOutlined,
    DownloadOutlined,
    LineChartOutlined,
    PieChartOutlined,
    HeatMapOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    ThunderboltOutlined,
    CameraOutlined,
    PrinterOutlined,
    ShareAltOutlined
} from '@ant-design/icons';
import ProfessionalViewport3D from '../components/ProfessionalViewport3D';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const ResultsView: React.FC = () => {
    const [leftPanelVisible, setLeftPanelVisible] = useState(true);
    const [rightPanelVisible, setRightPanelVisible] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [viewMode, setViewMode] = useState('contour');
    const [contourVariable, setContourVariable] = useState('displacement');
    const [resultsImported, setResultsImported] = useState(false);
    const [visualizationConfigured, setVisualizationConfigured] = useState(false);
    const [reportGenerated, setReportGenerated] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'import' | 'contour' | 'animation' | 'slice' | 'report' | 'export' | 'chart' | null>(null);
    const [form] = Form.useForm();
    const [processingProgress, setProcessingProgress] = useState(0);
    const [selectedResults, setSelectedResults] = useState<string[]>([]);
    const [animationSettings, setAnimationSettings] = useState({
        speed: 1.0,
        steps: 50,
        autoReverse: true
    });
    const [contourSettings, setContourSettings] = useState({
        levels: 20,
        smoothing: true,
        range: 'auto'
    });

    // 调试信息
    React.useEffect(() => {
        console.log('ResultsView 组件已加载');
        console.log('左侧面板可见:', leftPanelVisible);
        console.log('右侧面板可见:', rightPanelVisible);
    }, [leftPanelVisible, rightPanelVisible]);

    // 结果可视化工作流程步骤
    const resultsSteps = [
        {
            title: '结果导入',
            description: '载入计算结果和后处理数据',
            icon: <UploadOutlined />,
            key: 'import'
        },
        {
            title: '可视化设置', 
            description: '配置云图、动画和显示参数',
            icon: <BarChartOutlined />,
            key: 'visualization'
        },
        {
            title: '分析报告',
            description: '生成分析报告和数据导出',
            icon: <SaveOutlined />,
            key: 'report'
        }
    ];

    // 模拟计算结果数据
    const mockResultsData = {
        maxDisplacement: 15.6,
        maxStress: 2.34,
        minSafetyFactor: 1.67,
        analysisTime: '08:24:15',
        convergenceSteps: 156,
        totalSteps: 200
    };

    const handleStepChange = (step: number) => {
        setCurrentStep(step);
    };

    // 结果导入相关函数
    const handleResultsImport = () => {
        setModalType('import');
        setModalVisible(true);
    };

    const handleResultsCheck = () => {
        if (!resultsImported) {
            message.warning('请先导入计算结果');
            return;
        }
        message.success('结果质量检查完成 - 数据完整性良好');
    };

    const handleDataPreview = () => {
        if (!resultsImported) {
            message.warning('请先导入计算结果');
            return;
        }
        message.info('打开数据预览窗口...');
    };

    // 可视化设置相关函数
    const handleContourConfig = () => {
        setModalType('contour');
        setModalVisible(true);
    };

    const handleAnimationSettings = () => {
        setModalType('animation');
        setModalVisible(true);
    };

    const handleSliceAnalysis = () => {
        setModalType('slice');
        setModalVisible(true);
    };

    // 分析报告相关函数
    const handleGenerateReport = () => {
        setModalType('report');
        setModalVisible(true);
    };

    const handleExportData = () => {
        setModalType('export');
        setModalVisible(true);
    };

    const handleGenerateCharts = () => {
        setModalType('chart');
        setModalVisible(true);
    };

    // 后处理执行函数
    const handleProcessResults = async () => {
        if (!resultsImported) {
            message.error('请先完成结果导入步骤');
            return;
        }
        
        setIsProcessing(true);
        setProcessingProgress(0);
        message.info('开始后处理计算...');
        
        // 模拟真实的后处理进度
        const progressInterval = setInterval(() => {
            setProcessingProgress(prev => {
                const newProgress = Math.min(prev + Math.random() * 8, 95);
                if (newProgress >= 95) {
                    clearInterval(progressInterval);
                    setTimeout(() => {
                        setIsProcessing(false);
                        setProcessingProgress(100);
                        setVisualizationConfigured(true);
                        message.success('后处理计算完成！');
                    }, 1000);
                }
                return newProgress;
            });
        }, 150);
    };

    // 文件上传相关函数
    const handleFileUpload = (file: any) => {
        const isValidFormat = file.name.endsWith('.res') || file.name.endsWith('.post') || file.name.endsWith('.vtk') || file.name.endsWith('.h5');
        if (!isValidFormat) {
            message.error('请上传有效的结果文件格式 (.res, .post, .vtk, .h5)');
            return false;
        }
        
        setResultsImported(true);
        setModalVisible(false);
        message.success(`结果文件 ${file.name} 导入成功！`);
        return false; // 阻止自动上传
    };

    const renderConfigModal = () => {
        switch (modalType) {
            case 'import':
                return (
                    <Modal
                        title="导入计算结果"
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        footer={null}
                        width={500}
                    >
                        <div style={{ padding: '20px' }}>
                            <Upload.Dragger
                                capture={false}
                                hasControlInside={false}
                                pastable={false}
                                beforeUpload={handleFileUpload}
                                showUploadList={false}
                                accept=".res,.post,.vtk,.h5"
                                multiple
                            >
                                <p className="ant-upload-drag-icon">
                                    <FileTextOutlined style={{ fontSize: '48px', color: '#00d9ff' }} />
                                </p>
                                <p className="ant-upload-text" style={{ color: '#ffffff' }}>
                                    点击或拖拽结果文件到此区域上传
                                </p>
                                <p className="ant-upload-hint" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                    支持格式: .res, .post, .vtk, .h5 (可多选)
                                </p>
                            </Upload.Dragger>
                            {resultsImported && (
                                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                                    <span style={{ color: '#ffffff' }}>结果文件已导入完成</span>
                                </div>
                            )}
                        </div>
                    </Modal>
                );
            case 'contour':
                return (
                    <Modal
                        title="云图配置"
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => {
                            setVisualizationConfigured(true);
                            setModalVisible(false);
                            message.success('云图配置已保存');
                        }}
                        width={500}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item label="显示变量">
                                <Select value={contourVariable} onChange={setContourVariable}>
                                    <Option value="displacement">位移 (mm)</Option>
                                    <Option value="stress">应力 (MPa)</Option>
                                    <Option value="strain">应变</Option>
                                    <Option value="safety_factor">安全系数</Option>
                                    <Option value="plastic_strain">塑性应变</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="等值线数量">
                                <Slider
                                    min={5}
                                    max={50}
                                    value={contourSettings.levels}
                                    onChange={(value) => setContourSettings({...contourSettings, levels: value})}
                                    marks={{ 5: '5', 20: '20', 50: '50' }}
                                />
                                <div style={{ textAlign: 'center', color: '#00d9ff' }}>当前: {contourSettings.levels} 级</div>
                            </Form.Item>
                            <Form.Item label="数值范围">
                                <Select value={contourSettings.range} onChange={(value) => setContourSettings({...contourSettings, range: value})}>
                                    <Option value="auto">自动范围</Option>
                                    <Option value="custom">自定义范围</Option>
                                    <Option value="symmetric">对称范围</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="平滑插值" valuePropName="checked">
                                <Switch
                                    checked={contourSettings.smoothing}
                                    onChange={(checked) => setContourSettings({...contourSettings, smoothing: checked})}
                                />
                            </Form.Item>
                            <Form.Item label="颜色映射">
                                <Select defaultValue="rainbow">
                                    <Option value="rainbow">彩虹色</Option>
                                    <Option value="hot">热力图</Option>
                                    <Option value="cool">冷色调</Option>
                                    <Option value="jet">Jet色彩</Option>
                                    <Option value="viridis">Viridis</Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>
                );
            case 'animation':
                return (
                    <Modal
                        title="动画设置"
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => {
                            setModalVisible(false);
                            message.success('动画设置已保存');
                        }}
                        width={450}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item label="动画速度">
                                <Slider
                                    min={0.1}
                                    max={5.0}
                                    step={0.1}
                                    value={animationSettings.speed}
                                    onChange={(value) => setAnimationSettings({...animationSettings, speed: value})}
                                    marks={{ 0.1: '慢', 1.0: '正常', 5.0: '快' }}
                                />
                                <div style={{ textAlign: 'center', color: '#00d9ff' }}>速度: {animationSettings.speed}x</div>
                            </Form.Item>
                            <Form.Item label="动画帧数">
                                <InputNumber
                                    min={10}
                                    max={200}
                                    value={animationSettings.steps}
                                    onChange={(value) => setAnimationSettings({...animationSettings, steps: value || 50})}
                                    addonAfter="帧"
                                />
                            </Form.Item>
                            <Form.Item label="自动反向播放" valuePropName="checked">
                                <Switch
                                    checked={animationSettings.autoReverse}
                                    onChange={(checked) => setAnimationSettings({...animationSettings, autoReverse: checked})}
                                />
                            </Form.Item>
                            <Form.Item label="缩放系数">
                                <Slider
                                    min={0.1}
                                    max={10.0}
                                    step={0.1}
                                    defaultValue={1.0}
                                    marks={{ 0.1: '0.1', 1.0: '1.0', 10.0: '10.0' }}
                                />
                            </Form.Item>
                        </Form>
                    </Modal>
                );
            case 'slice':
                return (
                    <Modal
                        title="剖面分析"
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => {
                            setModalVisible(false);
                            message.success('剖面分析设置已保存');
                        }}
                        width={500}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item label="剖面方向">
                                <Select defaultValue="XY">
                                    <Option value="XY">XY 平面</Option>
                                    <Option value="XZ">XZ 平面</Option>
                                    <Option value="YZ">YZ 平面</Option>
                                    <Option value="custom">自定义平面</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="剖面位置">
                                <Slider
                                    min={0}
                                    max={100}
                                    defaultValue={50}
                                    marks={{ 0: '0%', 50: '50%', 100: '100%' }}
                                />
                            </Form.Item>
                            <Form.Item label="显示变量">
                                <Select defaultValue="displacement">
                                    <Option value="displacement">位移云图</Option>
                                    <Option value="stress">应力云图</Option>
                                    <Option value="strain">应变云图</Option>
                                    <Option value="velocity">速度矢量</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="等值线显示" valuePropName="checked">
                                <Switch defaultChecked />
                            </Form.Item>
                        </Form>
                    </Modal>
                );
            case 'report':
                return (
                    <Modal
                        title="生成技术报告"
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => {
                            setReportGenerated(true);
                            setModalVisible(false);
                            message.success('技术报告生成完成');
                        }}
                        width={550}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item label="报告模板">
                                <Select defaultValue="standard">
                                    <Option value="standard">标准技术报告</Option>
                                    <Option value="detailed">详细分析报告</Option>
                                    <Option value="summary">摘要报告</Option>
                                    <Option value="custom">自定义模板</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="包含内容">
                                <Select mode="multiple" defaultValue={['results', 'charts', 'analysis']}>
                                    <Option value="results">计算结果</Option>
                                    <Option value="charts">图表分析</Option>
                                    <Option value="analysis">分析说明</Option>
                                    <Option value="images">三维图像</Option>
                                    <Option value="recommendations">建议措施</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="输出格式">
                                <Select defaultValue="pdf">
                                    <Option value="pdf">PDF 文档</Option>
                                    <Option value="word">Word 文档</Option>
                                    <Option value="html">HTML 网页</Option>
                                    <Option value="markdown">Markdown</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="图表质量">
                                <Select defaultValue="high">
                                    <Option value="draft">草图质量</Option>
                                    <Option value="normal">标准质量</Option>
                                    <Option value="high">高质量</Option>
                                    <Option value="publication">出版质量</Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    </Modal>
                );
            case 'export':
                return (
                    <Modal
                        title="导出数据"
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => {
                            setModalVisible(false);
                            message.success('数据导出任务已启动');
                        }}
                        width={500}
                    >
                        <Form form={form} layout="vertical">
                            <Form.Item label="导出类型">
                                <Select defaultValue="results">
                                    <Option value="results">计算结果</Option>
                                    <Option value="images">图像文件</Option>
                                    <Option value="animation">动画视频</Option>
                                    <Option value="data">原始数据</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="文件格式">
                                <Select defaultValue="csv">
                                    <Option value="csv">CSV 表格</Option>
                                    <Option value="excel">Excel 工作簿</Option>
                                    <Option value="txt">文本文件</Option>
                                    <Option value="vtk">VTK 格式</Option>
                                    <Option value="hdf5">HDF5 格式</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="数据范围">
                                <Select defaultValue="all">
                                    <Option value="all">所有数据</Option>
                                    <Option value="selected">选中区域</Option>
                                    <Option value="surface">表面数据</Option>
                                    <Option value="points">关键点</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="包含时间步" valuePropName="checked">
                                <Switch defaultChecked />
                            </Form.Item>
                        </Form>
                    </Modal>
                );
            case 'chart':
                return (
                    <Modal
                        title="生成图表"
                        open={modalVisible}
                        onCancel={() => setModalVisible(false)}
                        onOk={() => {
                            setModalVisible(false);
                            message.success('图表生成完成');
                        }}
                        width={500}
                    >
                        <Tabs defaultActiveKey="1">
                            <TabPane tab="时程图表" key="1">
                                <Form form={form} layout="vertical">
                                    <Form.Item label="Y轴变量">
                                        <Select defaultValue="displacement">
                                            <Option value="displacement">位移</Option>
                                            <Option value="stress">应力</Option>
                                            <Option value="force">力</Option>
                                            <Option value="energy">能量</Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item label="监测点">
                                        <Select mode="multiple" placeholder="选择监测点">
                                            <Option value="point1">关键点 1</Option>
                                            <Option value="point2">关键点 2</Option>
                                            <Option value="point3">关键点 3</Option>
                                            <Option value="max">最大值点</Option>
                                        </Select>
                                    </Form.Item>
                                </Form>
                            </TabPane>
                            <TabPane tab="统计图表" key="2">
                                <Form form={form} layout="vertical">
                                    <Form.Item label="图表类型">
                                        <Select defaultValue="histogram">
                                            <Option value="histogram">直方图</Option>
                                            <Option value="pie">饼图</Option>
                                            <Option value="scatter">散点图</Option>
                                            <Option value="box">箱线图</Option>
                                        </Select>
                                    </Form.Item>
                                    <Form.Item label="统计变量">
                                        <Select defaultValue="stress">
                                            <Option value="stress">应力分布</Option>
                                            <Option value="strain">应变分布</Option>
                                            <Option value="quality">网格质量</Option>
                                        </Select>
                                    </Form.Item>
                                </Form>
                            </TabPane>
                        </Tabs>
                    </Modal>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            background: '#1a1a2e',
            overflow: 'hidden'
        }}>

            {/* 全屏3D视口 - 作为主要内容 */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <ProfessionalViewport3D 
                    title="结果可视化 - 3D视口"
                    description="高级后处理与数据分析"
                    mode="results"
                    onAction={(action) => console.log('结果视口操作:', action)}
                />
            </div>

            {/* 悬浮控制按钮 - 左上角 */}
            <div style={{ 
                position: 'absolute', 
                top: '60px', 
                left: '20px', 
                zIndex: 9000,
                display: 'flex',
                gap: '10px'
            }}>
                <Button
                    type={leftPanelVisible ? "primary" : "default"}
                    icon={<MenuOutlined />}
                    onClick={() => {
                        console.log('切换左侧面板，当前状态:', leftPanelVisible);
                        setLeftPanelVisible(!leftPanelVisible);
                    }}
                    style={{
                        background: leftPanelVisible ? 'rgba(0, 217, 255, 0.8)' : 'rgba(26, 26, 46, 0.8)',
                        borderColor: 'rgba(0, 217, 255, 0.6)',
                        color: '#ffffff',
                        fontWeight: 'normal',
                        fontSize: '14px',
                        padding: '6px 12px',
                        height: '36px',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    可视化面板
                </Button>
                <Button
                    type={rightPanelVisible ? "primary" : "default"}
                    icon={<InfoCircleOutlined />}
                    onClick={() => setRightPanelVisible(!rightPanelVisible)}
                    style={{
                        background: rightPanelVisible ? 'rgba(0, 217, 255, 0.8)' : 'rgba(26, 26, 46, 0.8)',
                        borderColor: 'rgba(0, 217, 255, 0.6)',
                        color: '#ffffff',
                        fontWeight: 'normal',
                        fontSize: '14px',
                        padding: '6px 12px',
                        height: '36px',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    分析面板
                </Button>
            </div>

            {/* 3D视口工具栏 - 右下角横向布局 */}
            <div style={{ 
                position: 'absolute', 
                bottom: '20px', 
                right: '20px', 
                zIndex: 9000,
                display: 'flex',
                gap: '6px'
            }}>
                <Button 
                    size="small" 
                    icon={<BorderOutlined />}
                    style={{
                        background: 'rgba(26, 26, 46, 0.8)',
                        borderColor: 'rgba(0, 217, 255, 0.4)',
                        color: '#ffffff',
                        fontSize: '11px',
                        height: '32px',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    云图
                </Button>
                <Button 
                    size="small" 
                    icon={<ColumnHeightOutlined />}
                    style={{
                        background: 'rgba(26, 26, 46, 0.8)',
                        borderColor: 'rgba(0, 217, 255, 0.4)',
                        color: '#ffffff',
                        fontSize: '11px',
                        height: '32px',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    剖面
                </Button>
                <Button 
                    size="small" 
                    icon={<AimOutlined />}
                    style={{
                        background: 'rgba(26, 26, 46, 0.8)',
                        borderColor: 'rgba(0, 217, 255, 0.4)',
                        color: '#ffffff',
                        fontSize: '11px',
                        height: '32px',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    动画
                </Button>
                <Button 
                    size="small" 
                    icon={<FullscreenOutlined />}
                    style={{
                        background: 'rgba(26, 26, 46, 0.8)',
                        borderColor: 'rgba(0, 217, 255, 0.4)',
                        color: '#ffffff',
                        fontSize: '11px',
                        height: '32px',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    全屏
                </Button>
            </div>

            {/* 悬浮左侧可视化面板 */}
            {leftPanelVisible && (
                <div style={{
                    position: 'absolute',
                    top: '110px',
                    left: '20px',
                    bottom: '80px',
                    width: '350px',
                    zIndex: 8000,
                    background: 'rgba(26, 26, 46, 0.75)',
                    border: '1px solid rgba(0, 217, 255, 0.4)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#ffffff',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 150px)'
                }}>
                    {/* 面板标题 */}
                    <div style={{ 
                        borderBottom: '1px solid rgba(0, 217, 255, 0.3)', 
                        paddingBottom: '12px', 
                        marginBottom: '18px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ 
                            color: '#00d9ff', 
                            margin: 0, 
                            fontSize: '18px', 
                            fontWeight: 'normal',
                            lineHeight: '1.2'
                        }}>
                            后处理工作流
                        </h2>
                        <p style={{ 
                            color: 'rgba(255, 255, 255, 0.7)', 
                            fontSize: '12px', 
                            margin: '6px 0 0 0',
                            lineHeight: '1.3'
                        }}>
                            结果可视化与分析报告
                        </p>
                    </div>
                    
                    {/* 工作流程步骤 */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {resultsSteps.map((step, index) => (
                                <Button 
                                    key={step.key}
                                    type={currentStep === index ? "primary" : "default"}
                                    size="large" 
                                    icon={step.icon}
                                    onClick={() => setCurrentStep(index)}
                                    style={{ 
                                        background: currentStep === index ? 'rgba(0, 217, 255, 0.8)' : 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: 'rgba(0, 217, 255, 0.4)',
                                        color: currentStep === index ? '#000000' : '#ffffff',
                                        height: '60px',
                                        fontSize: '14px',
                                        fontWeight: 'normal',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        textAlign: 'left',
                                        transition: 'all 0.3s ease',
                                        boxShadow: currentStep === index ? '0 0 10px rgba(0, 217, 255, 0.3)' : 'none',
                                        padding: '8px 16px'
                                    }}
                                >
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'flex-start',
                                        marginLeft: '8px',
                                        lineHeight: '1.4'
                                    }}>
                                        <div style={{ 
                                            fontWeight: 'bold',
                                            marginBottom: '2px',
                                            fontSize: '14px'
                                        }}>
                                            {step.title}
                                        </div>
                                        <div style={{ 
                                            fontSize: '11px', 
                                            opacity: 0.8,
                                            color: currentStep === index ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.7)',
                                            lineHeight: '1.2'
                                        }}>
                                            {step.description}
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* 当前步骤的详细配置 */}
                    <div style={{ 
                        background: 'rgba(0, 217, 255, 0.05)', 
                        borderRadius: '8px', 
                        padding: '12px',
                        border: '1px solid rgba(0, 217, 255, 0.2)',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ 
                            color: 'rgba(0, 217, 255, 0.9)', 
                            margin: '0 0 12px 0', 
                            fontSize: '14px',
                            textAlign: 'center',
                            fontWeight: 'normal'
                        }}>
                            {resultsSteps[currentStep]?.title} 配置
                        </h4>
                        
                        {currentStep === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Button 
                                    size="small" 
                                    onClick={handleResultsImport}
                                    style={{ 
                                        background: resultsImported ? 'rgba(82, 196, 26, 0.2)' : 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: resultsImported ? 'rgba(82, 196, 26, 0.5)' : 'rgba(0, 217, 255, 0.3)', 
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    📂 导入计算结果 {resultsImported && <CheckCircleOutlined style={{ marginLeft: '4px', color: '#52c41a' }} />}
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={handleResultsCheck}
                                    disabled={!resultsImported}
                                    style={{ 
                                        background: 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: 'rgba(0, 217, 255, 0.3)', 
                                        color: resultsImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    🔍 结果质量检查
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={handleDataPreview}
                                    disabled={!resultsImported}
                                    style={{ 
                                        background: 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: 'rgba(0, 217, 255, 0.3)', 
                                        color: resultsImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    📊 数据预览
                                </Button>
                            </div>
                        )}
                        
                        {currentStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Button 
                                    size="small" 
                                    onClick={handleContourConfig}
                                    disabled={!resultsImported}
                                    style={{ 
                                        background: visualizationConfigured ? 'rgba(82, 196, 26, 0.2)' : 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: visualizationConfigured ? 'rgba(82, 196, 26, 0.5)' : 'rgba(0, 217, 255, 0.3)', 
                                        color: resultsImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    🌈 云图配置 {visualizationConfigured && <CheckCircleOutlined style={{ marginLeft: '4px', color: '#52c41a' }} />}
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={handleAnimationSettings}
                                    disabled={!resultsImported}
                                    style={{ 
                                        background: 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: 'rgba(0, 217, 255, 0.3)', 
                                        color: resultsImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    🎬 动画设置
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={handleSliceAnalysis}
                                    disabled={!resultsImported}
                                    style={{ 
                                        background: 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: 'rgba(0, 217, 255, 0.3)', 
                                        color: resultsImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    📐 剖面分析
                                </Button>
                            </div>
                        )}
                        
                        {currentStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Button 
                                    size="small" 
                                    onClick={handleGenerateReport}
                                    disabled={!resultsImported || !visualizationConfigured}
                                    style={{ 
                                        background: reportGenerated ? 'rgba(82, 196, 26, 0.2)' : 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: reportGenerated ? 'rgba(82, 196, 26, 0.5)' : 'rgba(0, 217, 255, 0.3)', 
                                        color: (resultsImported && visualizationConfigured) ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    📋 生成技术报告 {reportGenerated && <CheckCircleOutlined style={{ marginLeft: '4px', color: '#52c41a' }} />}
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={handleExportData}
                                    disabled={!resultsImported}
                                    style={{ 
                                        background: 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: 'rgba(0, 217, 255, 0.3)', 
                                        color: resultsImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    📤 导出数据
                                </Button>
                                <Button 
                                    size="small" 
                                    onClick={handleGenerateCharts}
                                    disabled={!resultsImported}
                                    style={{ 
                                        background: 'rgba(0, 217, 255, 0.1)', 
                                        borderColor: 'rgba(0, 217, 255, 0.3)', 
                                        color: resultsImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                        height: '32px',
                                        fontSize: '12px'
                                    }}
                                >
                                    🖼️ 生成图表
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* 处理进度 */}
                    {isProcessing && (
                        <div style={{ 
                            background: 'rgba(0, 217, 255, 0.05)', 
                            borderRadius: '8px', 
                            padding: '12px',
                            border: '1px solid rgba(0, 217, 255, 0.2)',
                            marginBottom: '15px'
                        }}>
                            <h4 style={{ 
                                color: 'rgba(0, 217, 255, 0.9)', 
                                margin: '0 0 8px 0', 
                                fontSize: '14px',
                                textAlign: 'center',
                                fontWeight: 'normal'
                            }}>
                                后处理进度 - {processingProgress.toFixed(1)}%
                            </h4>
                            <Progress 
                                percent={processingProgress} 
                                status={processingProgress >= 100 ? "success" : "active"} 
                                strokeColor={{
                                    '0%': '#00d9ff',
                                    '100%': '#52c41a',
                                }}
                                size="small"
                            />
                            <Text style={{ 
                                color: 'rgba(255, 255, 255, 0.7)', 
                                fontSize: '11px',
                                display: 'block',
                                textAlign: 'center',
                                marginTop: '6px'
                            }}>
                                {processingProgress < 25 ? '载入结果数据...' :
                                 processingProgress < 50 ? '生成云图和等值线...' :
                                 processingProgress < 75 ? '渲染三维可视化...' :
                                 processingProgress < 95 ? '优化显示效果...' :
                                 '后处理即将完成...'}
                            </Text>
                        </div>
                    )}

                    {/* 底部操作按钮 */}
                    <div style={{ 
                        marginTop: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        borderTop: '1px solid rgba(0, 217, 255, 0.2)',
                        paddingTop: '12px'
                    }}>
                        <Button 
                            type="primary" 
                            icon={<PlayCircleOutlined />}
                            loading={isProcessing}
                            onClick={handleProcessResults}
                            disabled={!resultsImported}
                            style={{
                                background: resultsImported ? 'rgba(0, 217, 255, 0.6)' : 'rgba(0, 217, 255, 0.2)',
                                borderColor: 'rgba(0, 217, 255, 0.4)',
                                color: resultsImported ? '#000000' : 'rgba(255, 255, 255, 0.4)',
                                height: '40px',
                                fontSize: '14px',
                                fontWeight: 'normal',
                                boxShadow: resultsImported ? '0 2px 8px rgba(0, 217, 255, 0.2)' : 'none'
                            }}
                        >
                            {isProcessing ? `处理中... ${processingProgress.toFixed(0)}%` : '🚀 开始后处理'}
                        </Button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <Button 
                                icon={<SaveOutlined />} 
                                onClick={() => message.info('保存当前视图配置')}
                                style={{ 
                                    flex: 1,
                                    background: 'rgba(0, 217, 255, 0.1)', 
                                    borderColor: 'rgba(0, 217, 255, 0.3)', 
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    height: '34px',
                                    fontSize: '12px'
                                }}
                            >
                                💾 保存
                            </Button>
                            <Button 
                                icon={<UploadOutlined />} 
                                onClick={() => message.info('导出当前结果')}
                                style={{ 
                                    flex: 1,
                                    background: 'rgba(0, 217, 255, 0.1)', 
                                    borderColor: 'rgba(0, 217, 255, 0.3)', 
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    height: '34px',
                                    fontSize: '12px'
                                }}
                            >
                                📤 导出
                            </Button>
                        </div>
                    </div>
                    
                    {/* 关闭按钮 */}
                    <div style={{ 
                        position: 'absolute', 
                        top: '10px', 
                        right: '10px' 
                    }}>
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => setLeftPanelVisible(false)}
                            style={{ color: '#ffffff', fontSize: '16px' }}
                        />
                    </div>
                </div>
            )}

            {/* 悬浮右侧分析面板 */}
            {rightPanelVisible && (
                <div style={{
                    position: 'absolute',
                    top: '110px',
                    right: '20px',
                    bottom: '80px',
                    width: '280px',
                    zIndex: 8000,
                    background: 'rgba(26, 26, 46, 0.75)',
                    border: '1px solid rgba(0, 217, 255, 0.4)',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#ffffff',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 150px)'
                }}>
                    {/* 分析面板标题 */}
                    <div style={{ 
                        borderBottom: '1px solid rgba(0, 217, 255, 0.3)', 
                        paddingBottom: '12px', 
                        marginBottom: '18px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ 
                            color: '#00d9ff', 
                            margin: 0, 
                            fontSize: '18px', 
                            fontWeight: 'normal',
                            lineHeight: '1.2'
                        }}>
                            数据分析
                        </h2>
                        <p style={{ 
                            color: 'rgba(255, 255, 255, 0.7)', 
                            fontSize: '12px', 
                            margin: '6px 0 0 0',
                            lineHeight: '1.3'
                        }}>
                            实时数据统计与分析
                        </p>
                    </div>

                    {/* 结果统计 */}
                    <div style={{ 
                        background: 'rgba(0, 217, 255, 0.05)', 
                        borderRadius: '8px', 
                        padding: '12px',
                        border: '1px solid rgba(0, 217, 255, 0.2)',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ 
                            color: 'rgba(0, 217, 255, 0.9)', 
                            margin: '0 0 12px 0', 
                            fontSize: '14px',
                            textAlign: 'center',
                            fontWeight: 'normal'
                        }}>
                            计算结果统计
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>最大位移:</span>
                                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{mockResultsData.maxDisplacement} mm</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>最大应力:</span>
                                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{mockResultsData.maxStress} MPa</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>最小安全系数:</span>
                                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{mockResultsData.minSafetyFactor}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>分析时间:</span>
                                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{mockResultsData.analysisTime}</span>
                            </div>
                        </div>
                    </div>

                    {/* 图表分析 */}
                    <div style={{ 
                        background: 'rgba(0, 217, 255, 0.05)', 
                        borderRadius: '8px', 
                        padding: '12px',
                        border: '1px solid rgba(0, 217, 255, 0.2)',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ 
                            color: 'rgba(0, 217, 255, 0.9)', 
                            margin: '0 0 12px 0', 
                            fontSize: '14px',
                            textAlign: 'center',
                            fontWeight: 'normal'
                        }}>
                            图表分析工具
                        </h4>
                        
                        {/* 图表类型 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ 
                                background: 'rgba(0, 217, 255, 0.1)', 
                                padding: '6px 10px', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#ffffff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Space>
                                    <LineChartOutlined />
                                    <span>时程曲线图</span>
                                </Space>
                                <Button 
                                    size="small" 
                                    onClick={() => handleGenerateCharts()}
                                    style={{ height: '20px', fontSize: '10px' }}
                                >
                                    查看
                                </Button>
                            </div>
                            <div style={{ 
                                background: 'rgba(0, 217, 255, 0.1)', 
                                padding: '6px 10px', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#ffffff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Space>
                                    <PieChartOutlined />
                                    <span>统计分布图</span>
                                </Space>
                                <Button 
                                    size="small" 
                                    onClick={() => handleGenerateCharts()}
                                    style={{ height: '20px', fontSize: '10px' }}
                                >
                                    查看
                                </Button>
                            </div>
                            <div style={{ 
                                background: 'rgba(0, 217, 255, 0.1)', 
                                padding: '6px 10px', 
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#ffffff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <Space>
                                    <HeatMapOutlined />
                                    <span>热力分布图</span>
                                </Space>
                                <Button 
                                    size="small" 
                                    onClick={() => handleGenerateCharts()}
                                    style={{ height: '20px', fontSize: '10px' }}
                                >
                                    查看
                                </Button>
                            </div>
                        </div>

                        {/* 状态评估 */}
                        <div style={{ 
                            marginTop: '12px',
                            padding: '8px',
                            background: 'rgba(0, 217, 255, 0.1)',
                            borderRadius: '4px',
                            textAlign: 'center'
                        }}>
                            <Badge status={resultsImported ? "success" : "default"} />
                            <Text style={{ 
                                color: resultsImported ? '#52c41a' : '#8c8c8c',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                marginLeft: '8px'
                            }}>
                                {resultsImported ? '分析完成 ✅' : '等待结果 ⏳'}
                            </Text>
                        </div>
                    </div>

                    {/* 快捷操作 */}
                    <div style={{ 
                        background: 'rgba(0, 217, 255, 0.05)', 
                        borderRadius: '8px', 
                        padding: '12px',
                        border: '1px solid rgba(0, 217, 255, 0.2)',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ 
                            color: 'rgba(0, 217, 255, 0.9)', 
                            margin: '0 0 12px 0', 
                            fontSize: '14px',
                            textAlign: 'center',
                            fontWeight: 'normal'
                        }}>
                            快捷操作
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <Button 
                                size="small"
                                icon={<CameraOutlined />}
                                onClick={() => message.info('截图已保存')}
                                style={{
                                    background: 'rgba(0, 217, 255, 0.1)',
                                    borderColor: 'rgba(0, 217, 255, 0.3)',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    height: '28px'
                                }}
                            >
                                截图
                            </Button>
                            <Button 
                                size="small"
                                icon={<PrinterOutlined />}
                                onClick={() => message.info('打印预览')}
                                style={{
                                    background: 'rgba(0, 217, 255, 0.1)',
                                    borderColor: 'rgba(0, 217, 255, 0.3)',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    height: '28px'
                                }}
                            >
                                打印
                            </Button>
                            <Button 
                                size="small"
                                icon={<ShareAltOutlined />}
                                onClick={() => message.info('分享链接已复制')}
                                style={{
                                    background: 'rgba(0, 217, 255, 0.1)',
                                    borderColor: 'rgba(0, 217, 255, 0.3)',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    height: '28px'
                                }}
                            >
                                分享
                            </Button>
                            <Button 
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleExportData()}
                                style={{
                                    background: 'rgba(0, 217, 255, 0.1)',
                                    borderColor: 'rgba(0, 217, 255, 0.3)',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    height: '28px'
                                }}
                            >
                                下载
                            </Button>
                        </div>
                    </div>

                    {/* 关闭按钮 */}
                    <div style={{ 
                        position: 'absolute', 
                        top: '10px', 
                        right: '10px' 
                    }}>
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => setRightPanelVisible(false)}
                            style={{ color: '#ffffff', fontSize: '16px' }}
                        />
                    </div>
                </div>
            )}
            
            {/* 配置模态框 */}
            {renderConfigModal()}
        </div>
    );
};

export default ResultsView;