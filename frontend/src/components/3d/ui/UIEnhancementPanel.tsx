import React, { useState } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Space,
  Button,
  Typography,
  Alert
} from 'antd';
import {
  SettingOutlined,
  BgColorsOutlined,
  CameraOutlined,
  EyeOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { MaterialEditor, MaterialSettings } from './MaterialEditor';
import { RenderModeController, RenderSettings } from './RenderModeController';
import { CameraController, CameraSettings } from './CameraController';
import * as THREE from 'three';

const { TabPane } = Tabs;
const { Title } = Typography;

interface UIEnhancementPanelProps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  controls?: any;
  selectedObjects?: THREE.Object3D[];
  visible?: boolean;
  onClose?: () => void;
}

export const UIEnhancementPanel: React.FC<UIEnhancementPanelProps> = ({
  scene,
  camera,
  renderer,
  controls,
  selectedObjects = [],
  visible = false,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('material');
  
  // 获取选中对象的材质
  const getSelectedMaterial = (): THREE.Material | undefined => {
    if (selectedObjects.length === 0) return undefined;
    
    const firstMesh = selectedObjects.find(obj => obj instanceof THREE.Mesh) as THREE.Mesh;
    return firstMesh?.material as THREE.Material;
  };

  // 应用材质到选中对象
  const handleMaterialChange = (material: THREE.Material) => {
    selectedObjects.forEach(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.material = material;
      }
    });
  };

  // 渲染材质编辑器
  const renderMaterialEditor = () => {
    const selectedMaterial = getSelectedMaterial();
    
    return (
      <div>
        {selectedObjects.length === 0 ? (
          <Alert
            message="未选择对象"
            description="请先选择一个或多个3D对象来编辑材质。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            message={`已选择 ${selectedObjects.length} 个对象`}
            description="材质更改将应用到所有选中的对象。"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <MaterialEditor
          material={selectedMaterial}
          onMaterialChange={handleMaterialChange}
          showPreview={true}
        />
      </div>
    );
  };

  // 渲染模式控制器
  const renderModeController = () => (
    <RenderModeController
      scene={scene}
      renderer={renderer}
      camera={camera}
      onSettingsChange={(settings: RenderSettings) => {
        console.log('渲染设置已更新:', settings);
      }}
    />
  );

  // 相机控制器
  const renderCameraController = () => (
    <CameraController
      camera={camera}
      controls={controls}
      onSettingsChange={(settings: CameraSettings) => {
        console.log('相机设置已更新:', settings);
      }}
    />
  );

  // 性能优化建议
  const renderPerformanceTips = () => (
    <Card title="性能优化建议" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="材质优化"
          description="使用MeshBasicMaterial或MeshLambertMaterial可以提高性能，避免过多的MeshStandardMaterial。"
          type="info"
          showIcon
        />
        
        <Alert
          message="纹理优化"
          description="使用适当大小的纹理（2的幂次方），避免过大的纹理文件。"
          type="info"
          showIcon
        />
        
        <Alert
          message="几何体优化"
          description="减少不必要的顶点和面，使用LOD系统处理复杂模型。"
          type="info"
          showIcon
        />
        
        <Alert
          message="光照优化"
          description="限制光源数量，合理使用阴影，考虑使用光照贴图。"
          type="warning"
          showIcon
        />
      </Space>
    </Card>
  );

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>界面增强控制面板</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 材质编辑 */}
        <TabPane 
          tab={<span><BgColorsOutlined />材质编辑</span>} 
          key="material"
        >
          {renderMaterialEditor()}
        </TabPane>

        {/* 渲染模式 */}
        <TabPane 
          tab={<span><EyeOutlined />渲染模式</span>} 
          key="render"
        >
          {renderModeController()}
        </TabPane>

        {/* 相机控制 */}
        <TabPane 
          tab={<span><CameraOutlined />相机控制</span>} 
          key="camera"
        >
          {renderCameraController()}
        </TabPane>

        {/* 性能优化 */}
        <TabPane 
          tab={<span><ThunderboltOutlined />性能优化</span>} 
          key="performance"
        >
          {renderPerformanceTips()}
        </TabPane>
      </Tabs>
    </Modal>
  );
};