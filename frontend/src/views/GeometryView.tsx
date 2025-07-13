import React, { useState } from 'react';
import { Steps, Button, Space, Typography, Card, Row, Col, Progress, Tag } from 'antd';
import Viewport3D from '../components/Viewport3D';
import SceneTree from '../components/SceneTree';
import PropertyEditor from '../components/PropertyEditor';
import GeologyModule from '../components/geology/GeologyModule';
import ExcavationModule from '../components/excavation/ExcavationModule';
import SupportModule from '../components/support/SupportModule';
import CollapsibleSidebar from '../components/layout/CollapsibleSidebar';
import MainContent from '../components/layout/MainContent';
import { GlassCard, GlassButton } from '../components/ui/GlassComponents';
import { 
  EnvironmentOutlined,
  ToolOutlined,
  SafetyOutlined,
  SaveOutlined,
  CameraOutlined,
  FullscreenOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  BorderOutlined,
  ColumnHeightOutlined,
  AimOutlined,
  TableOutlined
} from '@ant-design/icons';
import { useUIStore } from '../stores/useUIStore';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';

const { Title, Text } = Typography;

const GeometryView: React.FC = () => {
  // 工作流程步骤状态
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState<Record<string, 'wait' | 'process' | 'finish' | 'error'>>({
    geology: 'wait',
    excavation: 'wait',
    support: 'wait'
  });
  
  // 左侧面板控制
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  
  // 几何模型参数状态
  const [geologyParams, setGeologyParams] = useState({
    interpolationMethod: 'kriging',
    gridResolution: 2.0,
    xExtend: 50,
    yExtend: 50,
    bottomElevation: -30
  });
  
  const [excavationParams, setExcavationParams] = useState({
    depth: 15,
    layerHeight: 3,
    slopeRatio: 0.5
  });
  
  const [supportParams, setSupportParams] = useState({
    // 地连墙参数
    diaphragmWall: {
      thickness: 1.2,
      depth: 25,
      enabled: true
    },
    // 排桩参数
    pilePile: {
      diameter: 1.0,
      spacing: 1.5,
      length: 20,
      embedDepth: 5,
      enabled: false
    },
    // 锚杆参数
    anchor: {
      length: 15,
      angle: 15,
      hSpacing: 3,
      vSpacing: 3,
      enabled: false
    },
    // 钢支撑参数
    steelSupport: {
      layers: 3,
      spacing: 4,
      sectionType: 'H600x200' as const,
      preload: 500,
      enabled: false
    }
  });
  
  const { theme: appTheme } = useUIStore(
    useShallow(state => ({
      theme: state.theme
    }))
  );

  const { scene } = useSceneStore(
    useShallow(state => ({
      scene: state.scene
    }))
  );
  
  const isDarkMode = appTheme === 'dark';

  // 工作流程步骤定义
  const workflowSteps = [
    {
      title: '地质建模',
      description: '导入钻孔数据，生成地质模型',
      icon: <EnvironmentOutlined />,
      key: 'geology'
    },
    {
      title: '基坑开挖',
      description: '导入DXF图纸，定义开挖体',
      icon: <ToolOutlined />,
      key: 'excavation'
    },
    {
      title: '支护结构',
      description: '设计地连墙、排桩、锚杆等',
      icon: <SafetyOutlined />,
      key: 'support'
    }
  ];

  // 几何模型统计信息
  const geometryStats = {
    geology: {
      boreholes: 12,
      layers: 6,
      volume: '2.5M m³'
    },
    excavation: {
      depth: excavationParams.depth,
      volume: '180K m³',
      area: '12K m²'
    },
    support: {
      components: Object.values(supportParams).filter(p => p.enabled).length,
      totalLength: '1.2K m',
      materials: 3
    }
  };

  // 工作流程处理函数
  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleStepComplete = (stepKey: string) => {
    setStepStatus(prev => ({
      ...prev,
      [stepKey]: 'finish'
    }));
    
    // 自动跳转到下一步
    if (stepKey === 'geology' && currentStep === 0) {
      setCurrentStep(1);
    } else if (stepKey === 'excavation' && currentStep === 1) {
      setCurrentStep(2);
    }
  };

  // 地质建模参数更新
  const updateGeologyParams = (key: string, value: any) => {
    setGeologyParams(prev => ({ ...prev, [key]: value }));
  };

  // 开挖参数更新
  const updateExcavationParams = (key: string, value: any) => {
    setExcavationParams(prev => ({ ...prev, [key]: value }));
  };

  // 支护结构参数更新
  const updateSupportParams = (category: string, key: string, value: any) => {
    setSupportParams(prev => ({
      ...prev,
      [category]: { ...prev[category], [key]: value }
    }));
  };

  // 几何生成和验证
  const handleGenerateGeometry = async (type: string, validatedData?: any) => {
    console.log(`Generating ${type} geometry`, validatedData);
    setStepStatus(prev => ({ ...prev, [type]: 'process' }));
    
    // 模拟异步生成过程
    setTimeout(() => {
      handleStepComplete(type);
    }, 2000);
  };

  const handleSaveModel = () => {
    console.log('Saving complete geometry model');
  };

  const handleExportModel = () => {
    console.log('Exporting geometry model');
  };

  return (
    <>
      {/* 左侧工作流程面板 */}
      <CollapsibleSidebar
        side="left"
        title="几何建模工作流程"
        defaultWidth={400}
        minWidth={300}
        maxWidth={500}
      >
        <div className="flex flex-col h-full">
          {/* 工作流程进度 */}
          <div className="p-4 border-b border-glass-border/50">
            <GlassCard variant="subtle" className="p-4">
              <Steps
                current={currentStep}
                onChange={handleStepChange}
                direction="vertical"
                size="small"
                items={workflowSteps.map((step, index) => ({
                  title: step.title,
                  description: step.description,
                  icon: step.icon,
                  status: stepStatus[step.key] === 'finish' ? 'finish' : 
                         stepStatus[step.key] === 'process' ? 'process' : 
                         currentStep === index ? 'process' : 'wait'
                }))}
              />
            </GlassCard>
          </div>

          {/* 步骤内容 */}
          <div className="flex-1 overflow-auto">
            {currentStep === 0 && (
              <GeologyModule
                params={geologyParams}
                onParamsChange={updateGeologyParams}
                onGenerate={(data) => handleGenerateGeometry('geology', data)}
                status={stepStatus.geology}
              />
            )}
            {currentStep === 1 && (
              <ExcavationModule
                params={excavationParams}
                onParamsChange={updateExcavationParams}
                onGenerate={(data) => handleGenerateGeometry('excavation', data)}
                status={stepStatus.excavation}
                disabled={stepStatus.geology !== 'finish'}
              />
            )}
            {currentStep === 2 && (
              <SupportModule
                params={supportParams}
                onParamsChange={updateSupportParams}
                onGenerate={(data) => handleGenerateGeometry('support', data)}
                status={stepStatus.support}
                disabled={stepStatus.excavation !== 'finish'}
              />
            )}
          </div>
        </div>
      </CollapsibleSidebar>

      {/* 主内容区域 */}
      <MainContent className="flex flex-col" padding={false}>
        {/* 工具栏 */}
        <div className="p-4 border-b border-glass-border/30">
          <div className="flex justify-between items-center">
            <Title level={3} className="m-0 text-gradient">深基坑几何建模</Title>
            <Space>
              <GlassButton variant="ghost" icon={<CheckCircleOutlined />}>
                验证模型
              </GlassButton>
              <GlassButton variant="ghost" icon={<CameraOutlined />}>
                截图
              </GlassButton>
              <GlassButton variant="ghost" icon={<SaveOutlined />} onClick={handleSaveModel}>
                保存
              </GlassButton>
              <GlassButton variant="primary" icon={<TableOutlined />} onClick={handleExportModel}>
                导出几何
              </GlassButton>
            </Space>
          </div>
        </div>

        {/* 几何统计信息 */}
        <div className="p-4 border-b border-glass-border/30">
          <Row gutter={16}>
            <Col span={8}>
              <GlassCard variant="subtle" className="text-center p-4 hover-lift">
                <div className="text-lg font-bold text-success mb-2">
                  <EnvironmentOutlined /> 地质模型
                </div>
                <Row gutter={8}>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.geology.boreholes}</div>
                    <div className="text-xs text-secondary">钻孔</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.geology.layers}</div>
                    <div className="text-xs text-secondary">地层</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.geology.volume}</div>
                    <div className="text-xs text-secondary">体积</div>
                  </Col>
                </Row>
              </GlassCard>
            </Col>
            <Col span={8}>
              <GlassCard variant="subtle" className="text-center p-4 hover-lift">
                <div className="text-lg font-bold text-primary mb-2">
                  <ToolOutlined /> 基坑开挖
                </div>
                <Row gutter={8}>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.excavation.depth}m</div>
                    <div className="text-xs text-secondary">深度</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.excavation.area}</div>
                    <div className="text-xs text-secondary">面积</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.excavation.volume}</div>
                    <div className="text-xs text-secondary">体积</div>
                  </Col>
                </Row>
              </GlassCard>
            </Col>
            <Col span={8}>
              <GlassCard variant="subtle" className="text-center p-4 hover-lift">
                <div className="text-lg font-bold text-warning mb-2">
                  <SafetyOutlined /> 支护结构
                </div>
                <Row gutter={8}>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.support.components}</div>
                    <div className="text-xs text-secondary">构件</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.support.totalLength}</div>
                    <div className="text-xs text-secondary">总长</div>
                  </Col>
                  <Col span={8}>
                    <div className="text-base font-bold">{geometryStats.support.materials}</div>
                    <div className="text-xs text-secondary">材料</div>
                  </Col>
                </Row>
              </GlassCard>
            </Col>
          </Row>
        </div>

        {/* 3D视口 */}
        <div className="flex-1 relative p-4">
          <GlassCard variant="subtle" className="h-full relative overflow-hidden" padding="none">
            <Viewport3D 
              className="w-full h-full" 
              mode="geometry"
              showToolbar={true}
            />
            
            {/* 视口工具栏 */}
            <div className="absolute top-4 right-4 flex gap-2">
              <GlassButton variant="ghost" size="sm" icon={<BorderOutlined />} title="网格线">网格</GlassButton>
              <GlassButton variant="ghost" size="sm" icon={<ColumnHeightOutlined />} title="坐标轴">轴</GlassButton>
              <GlassButton variant="ghost" size="sm" icon={<AimOutlined />} title="边界框">框</GlassButton>
              <GlassButton variant="ghost" size="sm" icon={<SettingOutlined />} title="视图设置">设置</GlassButton>
            </div>
            
            {/* 进度指示器 */}
            {(stepStatus.geology === 'process' || stepStatus.excavation === 'process' || stepStatus.support === 'process') && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <GlassCard variant="elevated" className="flex items-center gap-3 p-4">
                  <Progress type="circle" size={32} percent={75} showInfo={false} />
                  <span className="text-primary font-medium">正在生成几何模型...</span>
                </GlassCard>
              </div>
            )}
          </GlassCard>
        </div>
      </MainContent>

      {/* 右侧组件管理面板 */}
      <CollapsibleSidebar
        side="right"
        title="组件管理"
        defaultWidth={350}
        minWidth={250}
        maxWidth={450}
      >
        <div className="flex flex-col h-full">
          {/* 组件树 */}
          <div className="flex-1 overflow-auto border-b border-glass-border/50">
            <SceneTree />
          </div>
          
          {/* 属性编辑器 */}
          <div className="flex-1 overflow-auto border-b border-glass-border/50">
            <PropertyEditor />
          </div>
          
          {/* 几何状态 */}
          <div className="p-4">
            <GlassCard variant="subtle" className="p-3">
              <Text className="text-sm font-semibold mb-2 block">几何状态</Text>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs">地质模型</span>
                  <Tag color={stepStatus.geology === 'finish' ? 'success' : 'default'}>
                    {stepStatus.geology === 'finish' ? '已完成' : '未生成'}
                  </Tag>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">开挖体</span>
                  <Tag color={stepStatus.excavation === 'finish' ? 'success' : 'default'}>
                    {stepStatus.excavation === 'finish' ? '已完成' : '未生成'}
                  </Tag>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">支护结构</span>
                  <Tag color={stepStatus.support === 'finish' ? 'success' : 'default'}>
                    {stepStatus.support === 'finish' ? '已完成' : '未生成'}
                  </Tag>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </CollapsibleSidebar>
    </>
  );
};

export default GeometryView;