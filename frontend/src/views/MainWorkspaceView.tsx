import React, { useState } from 'react';
import { Layout, Card, Tabs, Row, Col } from 'antd';
import CAE3DViewport from '../components/3d/CAE3DViewport';
import OptimizedCAE3DViewport from '../components/3d/OptimizedCAE3DViewport';
import CAEThreeEngineComponent from '../components/3d/CAEThreeEngine';
import UnifiedToolbar from '../components/layout/UnifiedToolbar';
import GeologyModule from '../components/geology/GeologyModule';
import ExcavationModule from '../components/excavation/ExcavationModule';
import SupportModule from '../components/support/SupportModule';
import MaterialLibrary from '../components/MaterialLibrary';
import PropertyEditor from '../components/PropertyEditor';
import SceneTree from '../components/SceneTree';
import SafePyVistaViewer from '../components/visualization/SafePyVistaViewer';
import SafePostProcessingPanel from '../components/visualization/SafePostProcessingPanel';
import VisualizationControlPanel from '../components/visualization/VisualizationControlPanel';
import AdvancedMeshConfig from '../components/meshing/AdvancedMeshConfig';
import PhysicalGroupManager from '../components/meshing/PhysicalGroupManager';
import BoundaryConditionConfigPanel from '../components/computation/BoundaryConditionConfigPanel';
import LoadConfigPanel from '../components/computation/LoadConfigPanel';
import RealtimeProgressMonitor from '../components/computation/RealtimeProgressMonitor.simple';
import MeshInterface from '../components/computation/MeshInterface.simple';
import { ModuleErrorBoundary } from '../core/ErrorBoundary';

// 2号几何专家开发的高级几何建模组件
import DiaphragmWallOffsetPanel from '../components/advanced/DiaphragmWallOffsetPanel';
import PileModelingIntegrationPanel from '../components/advanced/PileModelingIntegrationPanel';
import { GeometryToFEMMapper } from '../core/modeling/GeometryToFEMMapper';
import BoreholeDataVisualization from '../components/geology/BoreholeDataVisualization';

const { Content } = Layout;

interface MainWorkspaceViewProps {
  activeModule?: string;
}

const MainWorkspaceView: React.FC<MainWorkspaceViewProps> = ({ 
  activeModule = 'geometry' 
}) => {
  const [rightPanelTab, setRightPanelTab] = useState('properties');
  
  // 模块状态管理
  const [geologyParams, setGeologyParams] = useState({
    interpolationMethod: 'kriging' as const,
    gridResolution: 2.0,
    xExtend: 50,
    yExtend: 50,
    bottomElevation: -30
  });
  const [geologyStatus, setGeologyStatus] = useState<'wait' | 'process' | 'finish' | 'error'>('wait');
  
  const [excavationParams, setExcavationParams] = useState({
    depth: 10,
    width: 20,
    length: 30,
    type: 'rectangular'
  });
  const [excavationStatus, setExcavationStatus] = useState<'wait' | 'process' | 'finish' | 'error'>('wait');
  
  const [supportParams, setSupportParams] = useState({
    diaphragmWall: {
      thickness: 0.8,
      depth: 25,
      enabled: true
    },
    pilePile: {
      diameter: 1.0,
      spacing: 2.0,
      length: 20,
      embedDepth: 5,
      enabled: false
    },
    anchor: {
      length: 15,
      angle: 15,
      hSpacing: 3,
      vSpacing: 3,
      enabled: false
    },
    steelSupport: {
      layers: 2,
      spacing: 6,
      sectionType: 'H500x200' as const,
      preload: 500,
      enabled: false
    }
  });
  const [supportStatus, setSupportStatus] = useState<'wait' | 'process' | 'finish' | 'error'>('wait');
  
  // 面板可见性状态
  const [materialLibraryVisible, setMaterialLibraryVisible] = useState(false);
  
  // 2号几何专家的高级建模功能状态
  const [diaphragmOffsetVisible, setDiaphragmOffsetVisible] = useState(false);
  const [pileModelingVisible, setPileModelingVisible] = useState(false);
  const [selectedGeometry, setSelectedGeometry] = useState<any>(null);
  const [femMapper] = useState(() => new GeometryToFEMMapper());
  
  // 工具栏状态
  const [currentTool, setCurrentTool] = useState<'pan' | 'rotate' | 'zoom'>('pan');
  
  // 通用处理函数
  const handleParamsChange = (moduleType: string, key: string, value: any) => {
    switch (moduleType) {
      case 'geology':
        setGeologyParams(prev => ({ ...prev, [key]: value }));
        break;
      case 'excavation':
        setExcavationParams(prev => ({ ...prev, [key]: value }));
        break;
      case 'support':
        setSupportParams(prev => ({ ...prev, [key]: value }));
        break;
    }
  };
  
  const handleGenerate = (moduleType: string, data: any) => {
    console.log(`生成${moduleType}模型:`, data);
    // 设置处理状态
    switch (moduleType) {
      case 'geology':
        setGeologyStatus('process');
        setTimeout(() => setGeologyStatus('finish'), 2000);
        break;
      case 'excavation':
        setExcavationStatus('process');
        setTimeout(() => setExcavationStatus('finish'), 2000);
        break;
      case 'support':
        setSupportStatus('process');
        setTimeout(() => setSupportStatus('finish'), 2000);
        break;
    }
  };

  const renderModulePanel = () => {
    switch (activeModule) {
      case 'geology':
        return (
          <ModuleErrorBoundary moduleName="地质建模">
            <GeologyModule 
              params={geologyParams}
              onParamsChange={(key, value) => handleParamsChange('geology', key, value)}
              onGenerate={(data) => handleGenerate('geology', data)}
              status={geologyStatus}
            />
          </ModuleErrorBoundary>
        );
      case 'geometry':
        return (
          <ModuleErrorBoundary moduleName="几何建模">
            <Tabs defaultActiveKey="geology" size="small">
              <Tabs.TabPane tab="地质建模" key="geology">
                <div style={{ marginBottom: '16px' }}>
                  <GeologyModule 
                    params={geologyParams}
                    onParamsChange={(key, value) => handleParamsChange('geology', key, value)}
                    onGenerate={(data) => handleGenerate('geology', data)}
                    status={geologyStatus}
                  />
                </div>
                <div style={{ marginTop: '16px', padding: '12px', background: '#1a2332', borderRadius: '8px', border: '1px solid #00d9ff30' }}>
                  <h4 style={{ color: '#00d9ff', margin: '0 0 12px 0', fontSize: '14px' }}>📊 钻孔数据可视化</h4>
                  <BoreholeDataVisualization 
                    boreholes={[]} // 这里可以传入实际的钻孔数据
                    onBoreholeSelect={(borehole) => console.log('选中钻孔:', borehole)}
                  />
                </div>
              </Tabs.TabPane>
              <Tabs.TabPane tab="基坑设计" key="excavation">
                <ExcavationModule 
                  params={excavationParams}
                  onParamsChange={(key, value) => handleParamsChange('excavation', key, value)}
                  onGenerate={(data) => handleGenerate('excavation', data)}
                  status={excavationStatus}
                  disabled={geologyStatus !== 'finish'}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="支护结构" key="support">
                <SupportModule 
                  params={supportParams}
                  onParamsChange={(key, value) => handleParamsChange('support', key, value)}
                  onGenerate={(data) => handleGenerate('support', data)}
                  status={supportStatus}
                  disabled={excavationStatus !== 'finish'}
                />
              </Tabs.TabPane>
              <Tabs.TabPane tab="高级建模" key="advanced">
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ padding: '12px', background: '#1a2332', borderRadius: '8px', border: '1px solid #00d9ff30', marginBottom: '12px' }}>
                    <h4 style={{ color: '#00d9ff', margin: '0 0 12px 0', fontSize: '14px' }}>🔧 地连墙偏移处理</h4>
                    <button 
                      onClick={() => setDiaphragmOffsetVisible(!diaphragmOffsetVisible)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        background: diaphragmOffsetVisible ? '#ff6b35' : '#00d9ff',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {diaphragmOffsetVisible ? '关闭偏移面板' : '打开偏移面板'}
                    </button>
                  </div>
                  
                  <div style={{ padding: '12px', background: '#1a2332', borderRadius: '8px', border: '1px solid #7c3aed30' }}>
                    <h4 style={{ color: '#7c3aed', margin: '0 0 12px 0', fontSize: '14px' }}>🏗️ 桩基智能建模</h4>
                    <button 
                      onClick={() => setPileModelingVisible(!pileModelingVisible)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        background: pileModelingVisible ? '#ff6b35' : '#7c3aed',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {pileModelingVisible ? '关闭桩基面板' : '打开桩基建模'}
                    </button>
                    <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '8px' }}>
                      支持钻孔灌注桩、预制桩、SWM工法桩等专业建模策略
                    </div>
                  </div>
                </div>
              </Tabs.TabPane>
            </Tabs>
          </ModuleErrorBoundary>
        );
      case 'materials':
        return <MaterialLibrary visible={materialLibraryVisible} onClose={() => setMaterialLibraryVisible(false)} />;
      case 'results':
        return (
          <Tabs defaultActiveKey="postprocessing" size="small">
            <Tabs.TabPane tab="后处理" key="postprocessing">
              <SafePostProcessingPanel />
            </Tabs.TabPane>
            <Tabs.TabPane tab="可视化控制" key="visualization">
              <VisualizationControlPanel sessionId="main-workspace-session" />
            </Tabs.TabPane>
          </Tabs>
        );
      case 'meshing':
        return (
          <ModuleErrorBoundary moduleName="网格生成">
            <Tabs defaultActiveKey="interface" size="small">
              <Tabs.TabPane tab="网格接口" key="interface">
                <MeshInterface />
              </Tabs.TabPane>
              <Tabs.TabPane tab="网格配置" key="config">
                <AdvancedMeshConfig />
              </Tabs.TabPane>
              <Tabs.TabPane tab="物理组管理" key="groups">
                <PhysicalGroupManager />
              </Tabs.TabPane>
              <Tabs.TabPane tab="FEM映射" key="fem-mapping">
                <div style={{ padding: '16px', background: '#1a2332', borderRadius: '8px', border: '1px solid #00d9ff30' }}>
                  <h4 style={{ color: '#00d9ff', margin: '0 0 16px 0', fontSize: '16px' }}>🔄 几何到有限元自动映射</h4>
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#16213e', borderRadius: '6px' }}>
                    <div style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '8px' }}>映射策略：</div>
                    <ul style={{ fontSize: '13px', color: '#ffffff', listStyle: 'none', padding: 0, margin: 0 }}>
                      <li style={{ marginBottom: '4px' }}>• 地连墙 → 壳元 (支持偏移建模)</li>
                      <li style={{ marginBottom: '4px' }}>• 桩基 → 梁元/壳元 (基于工程类型自动选择)</li>
                      <li style={{ marginBottom: '4px' }}>• 土体 → 实体元 (自动挤密区处理)</li>
                      <li style={{ marginBottom: '4px' }}>• 支撑锚杆 → 梁元</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => {
                      console.log('🔄 开始FEM映射...');
                      // 这里可以触发实际的映射过程
                      const mappingResult = femMapper.mapGeometryToFEM([]);
                      console.log('映射结果:', mappingResult);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'linear-gradient(90deg, #00d9ff, #0099cc)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    🚀 执行自动映射
                  </button>
                  <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '12px', textAlign: 'center' }}>
                    2号几何专家 • 专业CAE建模技术
                  </div>
                </div>
              </Tabs.TabPane>
            </Tabs>
          </ModuleErrorBoundary>
        );
      case 'analysis':
        return (
          <Tabs defaultActiveKey="boundary" size="small">
            <Tabs.TabPane tab="边界条件" key="boundary">
              <BoundaryConditionConfigPanel projectId="main-workspace-project" />
            </Tabs.TabPane>
            <Tabs.TabPane tab="载荷配置" key="load">
              <LoadConfigPanel projectId="main-workspace-project" />
            </Tabs.TabPane>
            <Tabs.TabPane tab="计算监控" key="monitor">
              <RealtimeProgressMonitor 
                title="计算进度监控" 
                showControls={true}
              />
            </Tabs.TabPane>
          </Tabs>
        );
      default:
        return (
          <GeologyModule 
            params={geologyParams}
            onParamsChange={(key, value) => handleParamsChange('geology', key, value)}
            onGenerate={(data) => handleGenerate('geology', data)}
            status={geologyStatus}
          />
        );
    }
  };

  const rightPanelItems = [
    {
      key: 'properties',
      label: '属性编辑',
      children: <PropertyEditor />
    },
    {
      key: 'scene',
      label: '场景树',
      children: <SceneTree />
    },
    {
      key: 'materials',
      label: '材料库',
      children: <MaterialLibrary visible={materialLibraryVisible} onClose={() => setMaterialLibraryVisible(false)} />
    }
  ];

  return (
    <Layout style={{ height: '100vh', background: '#0a0a0a' }}>
      <Content style={{ padding: 0, height: '100%' }}>
        <div style={{ display: 'flex', height: '100%' }}>
          {/* 左侧控制面板 */}
          <div style={{ width: '300px', minWidth: '250px', maxWidth: '400px' }}>
            <Card 
              title={`${activeModule === 'geometry' ? '几何建模' : 
                      activeModule === 'geology' ? '地质建模' :
                      activeModule === 'materials' ? '材料库' :
                      activeModule === 'results' ? '结果可视化' :
                      activeModule === 'meshing' ? '网格生成' :
                      activeModule === 'analysis' ? '计算分析' : '控制面板'}`}
              size="small"
              style={{ 
                height: '100%',
                background: '#16213e',
                border: '1px solid #00d9ff20'
              }}
              bodyStyle={{ 
                padding: '12px',
                height: 'calc(100% - 60px)',
                overflowY: 'auto'
              }}
            >
              {renderModulePanel()}
            </Card>
          </div>

          {/* 中央3D视口区域 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* 3D视口 */}
            <div style={{ 
              flex: 1,
              background: '#000',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {activeModule === 'results' ? (
                <SafePyVistaViewer showControls={true} />
              ) : (
                <CAEThreeEngineComponent 
                  onSelection={(objects) => console.log('Selected:', objects)}
                  onMeasurement={(measurement) => console.log('Measurement:', measurement)}
                />
              )}
            </div>
            
            {/* 底部工具栏 */}
            <div style={{
              height: '60px',
              background: 'linear-gradient(90deg, #16213e, #1a1a2e)',
              borderTop: '1px solid #00d9ff30',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px'
            }}>
              <UnifiedToolbar 
                currentModule={activeModule as any}
                currentTool={currentTool as any}
                onToolChange={(tool) => setCurrentTool(tool as any)}
              />
            </div>
          </div>

          {/* 右侧属性面板 */}
          <div style={{ width: '280px', minWidth: '250px', maxWidth: '350px' }}>
            <Card
              size="small"
              style={{ 
                height: '100%',
                background: '#16213e',
                border: '1px solid #00d9ff20'
              }}
              bodyStyle={{ 
                padding: 0,
                height: 'calc(100% - 40px)'
              }}
            >
              <Tabs
                activeKey={rightPanelTab}
                onChange={setRightPanelTab}
                items={rightPanelItems}
                size="small"
                style={{ height: '100%' }}
                tabBarStyle={{
                  margin: 0,
                  padding: '0 12px',
                  background: '#1a1a2e'
                }}
              />
            </Card>
          </div>
        </div>
        
        {/* 2号几何专家的高级建模面板 */}
        <DiaphragmWallOffsetPanel
          isVisible={diaphragmOffsetVisible}
          selectedGeometry={selectedGeometry}
          onOffsetProcessed={(result) => {
            console.log('🔧 地连墙偏移处理完成:', result);
            // 可以在这里更新场景或执行其他操作
          }}
          onDataTransferToKratos={(dataPackage) => {
            console.log('📤 数据传递给3号计算专家:', dataPackage);
            // 这里可以集成实际的Kratos求解器接口
          }}
        />
        
        <PileModelingIntegrationPanel
          isVisible={pileModelingVisible}
          onClose={() => setPileModelingVisible(false)}
          onPileConfigured={(pileData) => {
            console.log('🏗️ 桩基配置完成:', pileData);
            // 可以使用FEM映射器进行建模
            const femResult = femMapper.mapGeometryToFEM([pileData as any]);
            console.log('FEM映射结果:', femResult);
          }}
        />
      </Content>
    </Layout>
  );
};

export default MainWorkspaceView;