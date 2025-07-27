import React, { useState } from 'react';
import { Button, Typography, Space, Switch, Progress, message } from 'antd';
import { 
  MenuOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  SafetyOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  BorderOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import ProfessionalViewport3D from '../components/ProfessionalViewport3D';
import StatusBar from '../components/layout/StatusBar';
import Toolbar, { ToolType } from '../components/geometry/Toolbar';
import GeologyModuleAdvanced from '../components/geology/GeologyModuleAdvanced';
import { GeologyParamsAdvanced } from '../schemas';

const { Title, Text } = Typography;

const GeometryViewSimple: React.FC = () => {
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [activeToolbarTool, setActiveToolbarTool] = useState<ToolType | undefined>();
  const [currentStep, setCurrentStep] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const [geologicalDataImported, setGeologicalDataImported] = useState(false);
  const [excavationDesigned, setExcavationDesigned] = useState(false);
  const [supportStructuresAdded, setSupportStructuresAdded] = useState(false);
  const [rbfPanelVisible, setRbfPanelVisible] = useState(false);
  const [geologyParams, setGeologyParams] = useState<GeologyParamsAdvanced>({
    boreholes: [],
    domain: {
      extension_method: 'convex_hull',
      x_extend: 100,
      y_extend: 100,
      bottom_elevation: -50,
      mesh_resolution: 2.0
    },
    algorithm: {
      core_radius: 50,
      transition_distance: 150,
      variogram_model: 'spherical',
      trend_order: 'linear',
      uncertainty_analysis: false
    },
    soil_model: {
      constitutive_model: 'mohr_coulomb',
      description: '莫尔-库伦本构模型，适用于一般土体分析',
      selected_materials: []
    },
    gmsh_params: {
      characteristic_length: 2.0,
      physical_groups: true,
      mesh_quality: 0.8
    }
  });
  const [geologyStatus, setGeologyStatus] = useState<'wait' | 'process' | 'finish' | 'error'>('wait');

  const handleToolbarToolSelect = (tool: ToolType) => {
    setActiveToolbarTool(tool);
    switch (tool) {
      case 'view_3d':
        message.info('切换到三维透视视图');
        break;
      case 'view_top':
        message.info('切换到俯视图 (XY平面)');
        break;
      case 'view_side':
        message.info('切换到侧视图 (YZ平面)');
        break;
      case 'view_front':
        message.info('切换到正视图 (XZ平面)');
        break;
      case 'select':
        message.info('选择工具已激活');
        break;
      case 'measure':
        message.info('测量工具已激活');
        break;
      case 'hide_show':
        message.info('显示/隐藏工具已激活');
        break;
      case 'settings':
        setRightPanelVisible(!rightPanelVisible);
        break;
      default:
        message.info(`${tool} 工具已激活`);
    }
  };

  // 调试信息
  React.useEffect(() => {
    console.log('GeometryViewSimple 组件已加载');
    console.log('左侧面板可见:', leftPanelVisible);
    console.log('右侧面板可见:', rightPanelVisible);
  }, [leftPanelVisible, rightPanelVisible]);

  // 几何建模工作流程步骤
  const geometrySteps = [
    {
      title: '地质建模',
      description: '导入地质数据，建立地层模型',
      icon: <EnvironmentOutlined />,
      key: 'geology'
    },
    {
      title: '开挖设计', 
      description: '定义开挖边界和分步施工',
      icon: <ToolOutlined />,
      key: 'excavation'
    },
    {
      title: '支护结构',
      description: '添加支护墙、锚杆和支撑',
      icon: <SafetyOutlined />,
      key: 'support'
    }
  ];

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  // 地质建模相关函数
  const handleGeologicalDataImport = () => {
    setRbfPanelVisible(true);
  };

  const handleBoreholeVisualization = () => {
    if (!geologicalDataImported) {
      message.warning('请先导入地质数据');
      return;
    }
    message.info('显示钻孔数据...');
  };

  // 地质建模参数更新处理函数
  const handleGeologyParamsChange = (params: GeologyParamsAdvanced) => {
    setGeologyParams(params);
  };

  const handleGeologyGenerate = async (validatedData: GeologyParamsAdvanced) => {
    setGeologyStatus('process');
    message.info('开始RBF地质建模...');
    
    try {
      // 模拟RBF地质建模过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setGeologyStatus('finish');
      setGeologicalDataImported(true);
      message.success('多层分段三区混合地质建模完成！生成.msh和.gltf文件');
      
      setTimeout(() => {
        setRbfPanelVisible(false);
        setGeologyStatus('wait');
      }, 2000);
    } catch (error) {
      setGeologyStatus('error');
      message.error('地质建模失败，请检查参数设置');
    }
  };

  // 实时预览函数
  const handleGeologyPreview = (params: GeologyParamsAdvanced) => {
    // 在3D视口中显示预览
    console.log('多层分段建模预览更新:', params);
    console.log('钻孔数量:', params.boreholes?.length || 0);
    console.log('计算域:', params.domain);
    console.log('三区混合算法:', params.algorithm);
    // 这里可以发送参数到3D视口进行实时预览
    // 例如：显示钻孔位置、计算域边界、三区分布等
  };

  // 开挖设计相关函数
  const handleExcavationDesign = () => {
    setExcavationDesigned(true);
    message.success('开挖设计已完成');
  };

  const handleStageConfiguration = () => {
    if (!excavationDesigned) {
      message.warning('请先完成开挖设计');
      return;
    }
    message.info('配置施工阶段...');
  };

  // 支护结构相关函数
  const handleSupportDesign = () => {
    setSupportStructuresAdded(true);
    message.success('支护结构添加成功');
  };

  const handleStructuralAnalysis = () => {
    if (!supportStructuresAdded) {
      message.warning('请先添加支护结构');
      return;
    }
    message.info('进行结构分析...');
  };

  const handleBuildGeometry = async () => {
    if (!geologicalDataImported || !excavationDesigned || !supportStructuresAdded) {
      message.error('请先完成所有建模步骤');
      return;
    }
    
    setIsBuilding(true);
    message.info('开始构建几何模型...');
    
    setTimeout(() => {
      setIsBuilding(false);
      message.success('几何模型构建完成！');
    }, 3000);
  };

  const handleSave = () => {
    console.log('几何保存');
  };

  const handleExport = () => {
    console.log('几何导出');
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
          title="智能几何建模 - 3D视口"
          description="三维地质建模与开挖设计"
          mode="geometry"
          onAction={(action) => console.log('几何视口操作:', action)}
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
          建模面板
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
          属性面板
        </Button>
      </div>

      {/* 底部中央几何工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 8500,
        background: 'rgba(26, 26, 46, 0.85)',
        border: '1px solid rgba(0, 217, 255, 0.4)',
        borderRadius: '16px',
        padding: '12px 24px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 0 25px rgba(0, 217, 255, 0.25)'
      }}>
        <Toolbar
          onToolSelect={handleToolbarToolSelect}
          activeTool={activeToolbarTool}
          disabled={isBuilding}
        />
      </div>

      {/* 悬浮左侧建模面板 */}
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
              几何建模工作流
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '12px', 
              margin: '6px 0 0 0',
              lineHeight: '1.3'
            }}>
              智能三维地质建模与开挖设计
            </p>
          </div>
          
          {/* 工作流程步骤 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {geometrySteps.map((step, index) => (
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
              {geometrySteps[currentStep]?.title} 配置
            </h4>
            
            {currentStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button 
                  size="small" 
                  onClick={handleGeologicalDataImport}
                  style={{ 
                    background: geologicalDataImported ? 'rgba(82, 196, 26, 0.2)' : 'rgba(0, 217, 255, 0.1)', 
                    borderColor: geologicalDataImported ? 'rgba(82, 196, 26, 0.5)' : 'rgba(0, 217, 255, 0.3)', 
                    color: 'rgba(255, 255, 255, 0.9)',
                    height: '32px',
                    fontSize: '12px'
                  }}
                >
                  🗺️ 地质建模 {geologicalDataImported && <CheckCircleOutlined style={{ marginLeft: '4px', color: '#52c41a' }} />}
                </Button>
                <Button 
                  size="small" 
                  onClick={handleBoreholeVisualization}
                  disabled={!geologicalDataImported}
                  style={{ 
                    background: 'rgba(0, 217, 255, 0.1)', 
                    borderColor: 'rgba(0, 217, 255, 0.3)', 
                    color: geologicalDataImported ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                    height: '32px',
                    fontSize: '12px'
                  }}
                >
                  🔍 钻孔可视化
                </Button>
              </div>
            )}
            
            {currentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button 
                  size="small" 
                  onClick={handleExcavationDesign}
                  style={{ 
                    background: excavationDesigned ? 'rgba(82, 196, 26, 0.2)' : 'rgba(0, 217, 255, 0.1)', 
                    borderColor: excavationDesigned ? 'rgba(82, 196, 26, 0.5)' : 'rgba(0, 217, 255, 0.3)', 
                    color: 'rgba(255, 255, 255, 0.9)',
                    height: '32px',
                    fontSize: '12px'
                  }}
                >
                  ⚡ 开挖轮廓设计 {excavationDesigned && <CheckCircleOutlined style={{ marginLeft: '4px', color: '#52c41a' }} />}
                </Button>
                <Button 
                  size="small" 
                  onClick={handleStageConfiguration}
                  disabled={!excavationDesigned}
                  style={{ 
                    background: 'rgba(0, 217, 255, 0.1)', 
                    borderColor: 'rgba(0, 217, 255, 0.3)', 
                    color: excavationDesigned ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                    height: '32px',
                    fontSize: '12px'
                  }}
                >
                  📊 施工阶段配置
                </Button>
              </div>
            )}
            
            {currentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Button 
                  size="small" 
                  onClick={handleSupportDesign}
                  style={{ 
                    background: supportStructuresAdded ? 'rgba(82, 196, 26, 0.2)' : 'rgba(0, 217, 255, 0.1)', 
                    borderColor: supportStructuresAdded ? 'rgba(82, 196, 26, 0.5)' : 'rgba(0, 217, 255, 0.3)', 
                    color: 'rgba(255, 255, 255, 0.9)',
                    height: '32px',
                    fontSize: '12px'
                  }}
                >
                  🏗️ 支护结构设计 {supportStructuresAdded && <CheckCircleOutlined style={{ marginLeft: '4px', color: '#52c41a' }} />}
                </Button>
                <Button 
                  size="small" 
                  onClick={handleStructuralAnalysis}
                  disabled={!supportStructuresAdded}
                  style={{ 
                    background: 'rgba(0, 217, 255, 0.1)', 
                    borderColor: 'rgba(0, 217, 255, 0.3)', 
                    color: supportStructuresAdded ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                    height: '32px',
                    fontSize: '12px'
                  }}
                >
                  🔧 结构稳定性分析
                </Button>
              </div>
            )}
          </div>

          {/* 构建进度 */}
          {isBuilding && (
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
                几何模型构建进度
              </h4>
              <Progress 
                percent={75} 
                status="active" 
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
                正在构建三维几何模型...
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
              loading={isBuilding}
              onClick={handleBuildGeometry}
              disabled={!geologicalDataImported || !excavationDesigned || !supportStructuresAdded}
              style={{
                background: (geologicalDataImported && excavationDesigned && supportStructuresAdded) ? 'rgba(0, 217, 255, 0.6)' : 'rgba(0, 217, 255, 0.2)',
                borderColor: 'rgba(0, 217, 255, 0.4)',
                color: (geologicalDataImported && excavationDesigned && supportStructuresAdded) ? '#000000' : 'rgba(255, 255, 255, 0.4)',
                height: '40px',
                fontSize: '14px',
                fontWeight: 'normal',
                boxShadow: (geologicalDataImported && excavationDesigned && supportStructuresAdded) ? '0 2px 8px rgba(0, 217, 255, 0.2)' : 'none'
              }}
            >
              {isBuilding ? '构建中...' : '🏗️ 构建几何模型'}
            </Button>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button 
                icon={<SaveOutlined />} 
                onClick={handleSave}
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
                icon={<SaveOutlined />} 
                onClick={handleExport}
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

      {/* 悬浮右侧属性面板 - 向外移动增加视口空间 */}
      {rightPanelVisible && (
        <div style={{
          position: 'absolute',
          top: '110px',
          right: '20px',
          bottom: '80px',
          width: '320px',
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
          {/* 属性面板标题 */}
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
              属性设置
            </h2>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '12px', 
              margin: '6px 0 0 0',
              lineHeight: '1.3'
            }}>
              视图控制与模型信息
            </p>
          </div>

          {/* 视图控制 */}
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
              视图显示控制
            </h4>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff' }}>显示网格</Text>
                <Switch defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff' }}>显示坐标轴</Text>
                <Switch defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff' }}>地质图层</Text>
                <Switch defaultChecked />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff' }}>开挖轮廓</Text>
                <Switch defaultChecked />
              </div>
            </Space>
          </div>

          {/* 模型信息统计 */}
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
              模型统计信息
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>地质图层:</span>
                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{geologicalDataImported ? '5' : '0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>开挖区域:</span>
                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{excavationDesigned ? '3' : '0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>支护结构:</span>
                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>{supportStructuresAdded ? '12' : '0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>几何体积:</span>
                <span style={{ color: '#00d9ff', fontFamily: 'monospace' }}>1,235 m³</span>
              </div>
            </div>
          </div>

          {/* 当前状态 */}
          <div style={{ 
            background: 'rgba(0, 217, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '12px',
            border: '1px solid rgba(0, 217, 255, 0.2)'
          }}>
            <h4 style={{ 
              color: 'rgba(0, 217, 255, 0.9)', 
              margin: '0 0 12px 0', 
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: 'normal'
            }}>
              建模进度状态
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ 
                background: 'rgba(0, 217, 255, 0.1)', 
                padding: '6px 10px', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>🌍 地质建模:</span>
                <span>{geologicalDataImported ? '✅ 完成' : '⏸️ 待完成'}</span>
              </div>
              <div style={{ 
                background: 'rgba(0, 217, 255, 0.1)', 
                padding: '6px 10px', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>⚡ 开挖设计:</span>
                <span>{excavationDesigned ? '✅ 完成' : '⏸️ 待完成'}</span>
              </div>
              <div style={{ 
                background: 'rgba(0, 217, 255, 0.1)', 
                padding: '6px 10px', 
                borderRadius: '4px',
                fontSize: '11px',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>🏗️ 支护结构:</span>
                <span>{supportStructuresAdded ? '✅ 完成' : '⏸️ 待完成'}</span>
              </div>
            </div>

            {/* 总体进度 */}
            <div style={{ 
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(0, 217, 255, 0.1)',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <Text style={{ 
                color: (geologicalDataImported && excavationDesigned && supportStructuresAdded) ? '#52c41a' : '#faad14',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                整体状态: {(geologicalDataImported && excavationDesigned && supportStructuresAdded) ? '✅ 准备就绪' : '🚧 建模中'}
              </Text>
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

      {/* 地质建模浮动面板 */}
      {rbfPanelVisible && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '20px',
          bottom: '80px',
          width: '420px',
          zIndex: 9000,
          background: 'rgba(26, 26, 46, 0.85)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          borderRadius: '12px',
          padding: '20px',
          color: '#ffffff',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 25px rgba(0, 217, 255, 0.3)',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 140px)'
        }}>
          <GeologyModuleAdvanced
            params={geologyParams}
            onParamsChange={handleGeologyParamsChange}
            onGenerate={handleGeologyGenerate}
            onPreview={handleGeologyPreview}
            status={geologyStatus}
          />
          
          {/* 关闭按钮 */}
          <div style={{ 
            position: 'absolute', 
            top: '15px', 
            right: '15px' 
          }}>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setRbfPanelVisible(false)}
              style={{ 
                color: '#ffffff', 
                fontSize: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                width: '32px',
                height: '32px'
              }}
            />
          </div>
        </div>
      )}

      {/* 状态栏 */}
      <StatusBar viewType="geometry" />
    </div>
  );
};

export default GeometryViewSimple;