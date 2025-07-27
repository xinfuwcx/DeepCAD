import React, { useState, useEffect } from 'react';
import {
  Card,
  Space,
  Button,
  Slider,
  InputNumber,
  Switch,
  Select,
  Row,
  Col,
  Divider,
  Typography,
  Tooltip
} from 'antd';
import {
  CameraOutlined,
  AimOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateLeftOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons';
import * as THREE from 'three';

const { Text } = Typography;
const { Option } = Select;

export interface CameraSettings {
  type: 'perspective' | 'orthographic';
  fov: number;
  near: number;
  far: number;
  zoom: number;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  controls: {
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    enableRotate: boolean;
    enablePan: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
  };
}

interface CameraControllerProps {
  camera: THREE.Camera;
  controls?: any; // OrbitControls
  onSettingsChange?: (settings: CameraSettings) => void;
  initialSettings?: Partial<CameraSettings>;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  camera,
  controls,
  onSettingsChange,
  initialSettings = {}
}) => {
  const [settings, setSettings] = useState<CameraSettings>({
    type: camera instanceof THREE.PerspectiveCamera ? 'perspective' : 'orthographic',
    fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : 45,
    near: (camera as any).near || 0.1,
    far: (camera as any).far || 1000,
    zoom: (camera as any).zoom || 1,
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    target: {
      x: 0,
      y: 0,
      z: 0
    },
    controls: {
      enableDamping: true,
      dampingFactor: 0.05,
      enableZoom: true,
      enableRotate: true,
      enablePan: true,
      autoRotate: false,
      autoRotateSpeed: 2
    },
    ...initialSettings
  });

  // 预设视角
  const viewPresets = [
    { name: '前视图', position: { x: 0, y: 0, z: 20 }, target: { x: 0, y: 0, z: 0 } },
    { name: '后视图', position: { x: 0, y: 0, z: -20 }, target: { x: 0, y: 0, z: 0 } },
    { name: '左视图', position: { x: -20, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    { name: '右视图', position: { x: 20, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    { name: '顶视图', position: { x: 0, y: 20, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    { name: '底视图', position: { x: 0, y: -20, z: 0 }, target: { x: 0, y: 0, z: 0 } },
    { name: '等轴视图', position: { x: 14, y: 14, z: 14 }, target: { x: 0, y: 0, z: 0 } }
  ];

  // 应用设置
  useEffect(() => {
    applyCameraSettings();
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings]);

  // 应用相机设置
  const applyCameraSettings = () => {
    // 更新相机类型（需要重新创建相机）
    if (camera instanceof THREE.PerspectiveCamera && settings.type === 'perspective') {
      camera.fov = settings.fov;
      camera.updateProjectionMatrix();
    }

    // 更新基础属性
    (camera as any).near = settings.near;
    (camera as any).far = settings.far;
    (camera as any).zoom = settings.zoom;
    camera.position.set(settings.position.x, settings.position.y, settings.position.z);
    
    if ('updateProjectionMatrix' in camera) {
      (camera as any).updateProjectionMatrix();
    }

    // 更新控制器设置
    if (controls) {
      controls.enableDamping = settings.controls.enableDamping;
      controls.dampingFactor = settings.controls.dampingFactor;
      controls.enableZoom = settings.controls.enableZoom;
      controls.enableRotate = settings.controls.enableRotate;
      controls.enablePan = settings.controls.enablePan;
      controls.autoRotate = settings.controls.autoRotate;
      controls.autoRotateSpeed = settings.controls.autoRotateSpeed;
      
      controls.target.set(settings.target.x, settings.target.y, settings.target.z);
      controls.update();
    }
  };

  // 更新设置
  const updateSettings = (updates: Partial<CameraSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // 应用预设视角
  const applyPreset = (preset: typeof viewPresets[0]) => {
    updateSettings({
      position: preset.position,
      target: preset.target
    });
  };

  // 重置相机
  const resetCamera = () => {
    updateSettings({
      position: { x: 10, y: 10, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      zoom: 1
    });
  };

  // 渲染相机类型控制
  const renderCameraTypeControl = () => (
    <Card title="相机类型" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          value={settings.type}
          onChange={(type) => updateSettings({ type })}
          style={{ width: '100%' }}
        >
          <Option value="perspective">透视相机</Option>
          <Option value="orthographic">正交相机</Option>
        </Select>

        {settings.type === 'perspective' && (
          <div>
            <Text strong>视野角度 (FOV): {settings.fov}°</Text>
            <Slider
              min={10}
              max={120}
              value={settings.fov}
              onChange={(fov) => updateSettings({ fov })}
            />
          </div>
        )}

        <Row gutter={8}>
          <Col span={12}>
            <Text strong>近裁剪面:</Text>
            <InputNumber
              min={0.01}
              max={10}
              step={0.01}
              value={settings.near}
              onChange={(near) => near && updateSettings({ near })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
          <Col span={12}>
            <Text strong>远裁剪面:</Text>
            <InputNumber
              min={10}
              max={10000}
              step={10}
              value={settings.far}
              onChange={(far) => far && updateSettings({ far })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
        </Row>

        <div>
          <Text strong>缩放: {settings.zoom}</Text>
          <Slider
            min={0.1}
            max={5}
            step={0.1}
            value={settings.zoom}
            onChange={(zoom) => updateSettings({ zoom })}
          />
        </div>
      </Space>
    </Card>
  );

  // 渲染位置控制
  const renderPositionControl = () => (
    <Card title="相机位置" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={8}>
          <Col span={8}>
            <Text strong>X:</Text>
            <InputNumber
              value={settings.position.x}
              onChange={(x) => x !== null && updateSettings({
                position: { ...settings.position, x }
              })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
          <Col span={8}>
            <Text strong>Y:</Text>
            <InputNumber
              value={settings.position.y}
              onChange={(y) => y !== null && updateSettings({
                position: { ...settings.position, y }
              })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
          <Col span={8}>
            <Text strong>Z:</Text>
            <InputNumber
              value={settings.position.z}
              onChange={(z) => z !== null && updateSettings({
                position: { ...settings.position, z }
              })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
        </Row>

        <Divider />

        <Text strong>目标点:</Text>
        <Row gutter={8}>
          <Col span={8}>
            <InputNumber
              value={settings.target.x}
              onChange={(x) => x !== null && updateSettings({
                target: { ...settings.target, x }
              })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
          <Col span={8}>
            <InputNumber
              value={settings.target.y}
              onChange={(y) => y !== null && updateSettings({
                target: { ...settings.target, y }
              })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
          <Col span={8}>
            <InputNumber
              value={settings.target.z}
              onChange={(z) => z !== null && updateSettings({
                target: { ...settings.target, z }
              })}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
        </Row>
      </Space>
    </Card>
  );

  // 渲染预设视角
  const renderPresetViews = () => (
    <Card title="预设视角" size="small">
      <Row gutter={[4, 4]}>
        {viewPresets.map((preset, index) => (
          <Col span={8} key={index}>
            <Button
              size="small"
              onClick={() => applyPreset(preset)}
              block
            >
              {preset.name}
            </Button>
          </Col>
        ))}
      </Row>
      
      <Divider />
      
      <Button
        icon={<RotateLeftOutlined />}
        onClick={resetCamera}
        block
        size="small"
      >
        重置相机
      </Button>
    </Card>
  );

  // 渲染控制器设置
  const renderControlsSettings = () => (
    <Card title="控制器设置" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>阻尼:</Text>
          <Switch
            checked={settings.controls.enableDamping}
            onChange={(enableDamping) => updateSettings({
              controls: { ...settings.controls, enableDamping }
            })}
          />
        </div>

        {settings.controls.enableDamping && (
          <div>
            <Text>阻尼系数: {settings.controls.dampingFactor}</Text>
            <Slider
              min={0.01}
              max={0.2}
              step={0.01}
              value={settings.controls.dampingFactor}
              onChange={(dampingFactor) => updateSettings({
                controls: { ...settings.controls, dampingFactor }
              })}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>缩放:</Text>
          <Switch
            checked={settings.controls.enableZoom}
            onChange={(enableZoom) => updateSettings({
              controls: { ...settings.controls, enableZoom }
            })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>旋转:</Text>
          <Switch
            checked={settings.controls.enableRotate}
            onChange={(enableRotate) => updateSettings({
              controls: { ...settings.controls, enableRotate }
            })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>平移:</Text>
          <Switch
            checked={settings.controls.enablePan}
            onChange={(enablePan) => updateSettings({
              controls: { ...settings.controls, enablePan }
            })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>自动旋转:</Text>
          <Switch
            checked={settings.controls.autoRotate}
            onChange={(autoRotate) => updateSettings({
              controls: { ...settings.controls, autoRotate }
            })}
          />
        </div>

        {settings.controls.autoRotate && (
          <div>
            <Text>旋转速度: {settings.controls.autoRotateSpeed}</Text>
            <Slider
              min={0.1}
              max={10}
              step={0.1}
              value={settings.controls.autoRotateSpeed}
              onChange={(autoRotateSpeed) => updateSettings({
                controls: { ...settings.controls, autoRotateSpeed }
              })}
            />
          </div>
        )}
      </Space>
    </Card>
  );

  return (
    <div className="camera-controller">
      <Space direction="vertical" style={{ width: '100%' }}>
        {renderCameraTypeControl()}
        {renderPositionControl()}
        {renderPresetViews()}
        {renderControlsSettings()}
      </Space>
    </div>
  );
};