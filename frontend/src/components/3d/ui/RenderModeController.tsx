import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Switch,
  Slider,
  Select,
  Space,
  Divider,
  Typography,
  Tooltip,
  InputNumber,
  ColorPicker,
  Alert
} from 'antd';
import {
  EyeOutlined,
  BorderOutlined,
  BlockOutlined,
  BulbOutlined,
  ScanOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  ApiOutlined
} from '@ant-design/icons';
import * as THREE from 'three';

const { Text, Title } = Typography;
const { Option } = Select;

export interface RenderSettings {
  // 渲染模式
  renderMode: 'solid' | 'wireframe' | 'points' | 'transparent' | 'x-ray';
  
  // 材质覆盖
  materialOverride: boolean;
  overrideMaterial: {
    type: 'basic' | 'normal' | 'depth' | 'lambert' | 'phong' | 'standard';
    color: string;
    opacity: number;
    wireframe: boolean;
  };
  
  // 光照设置
  lighting: {
    enabled: boolean;
    ambientIntensity: number;
    directionalIntensity: number;
    shadowsEnabled: boolean;
    shadowMapSize: number;
  };
  
  // 环境设置
  environment: {
    showBackground: boolean;
    backgroundColor: string;
    fog: {
      enabled: boolean;
      color: string;
      near: number;
      far: number;
    };
  };
  
  // 渲染选项
  renderOptions: {
    antialias: boolean;
    pixelRatio: number;
    colorSpace: 'Linear' | 'sRGB';
    toneMapping: 'None' | 'Linear' | 'Reinhard' | 'Cineon' | 'ACESFilmic';
    toneMappingExposure: number;
  };
  
  // 性能设置
  performance: {
    enableFrustumCulling: boolean;
    enableDistanceCulling: boolean;
    maxDistance: number;
    enableLOD: boolean;
    lodDistances: number[];
  };
}

interface RenderModeControllerProps {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera;
  onSettingsChange?: (settings: RenderSettings) => void;
  initialSettings?: Partial<RenderSettings>;
}

export const RenderModeController: React.FC<RenderModeControllerProps> = ({
  scene,
  renderer,
  camera,
  onSettingsChange,
  initialSettings = {}
}) => {
  const [settings, setSettings] = useState<RenderSettings>({
    renderMode: 'solid',
    materialOverride: false,
    overrideMaterial: {
      type: 'standard',
      color: '#ffffff',
      opacity: 1,
      wireframe: false
    },
    lighting: {
      enabled: true,
      ambientIntensity: 0.4,
      directionalIntensity: 0.8,
      shadowsEnabled: true,
      shadowMapSize: 2048
    },
    environment: {
      showBackground: true,
      backgroundColor: '#2c3e50',
      fog: {
        enabled: false,
        color: '#ffffff',
        near: 1,
        far: 1000
      }
    },
    renderOptions: {
      antialias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      colorSpace: 'sRGB',
      toneMapping: 'ACESFilmic',
      toneMappingExposure: 1.0
    },
    performance: {
      enableFrustumCulling: true,
      enableDistanceCulling: false,
      maxDistance: 1000,
      enableLOD: false,
      lodDistances: [10, 50, 200]
    },
    ...initialSettings
  });

  const [originalMaterials, setOriginalMaterials] = useState<Map<THREE.Object3D, THREE.Material | THREE.Material[]>>(new Map());

  // 渲染模式选项
  const renderModes = [
    { key: 'solid', label: '实体', icon: <BlockOutlined />, description: '标准实体渲染' },
    { key: 'wireframe', label: '线框', icon: <BorderOutlined />, description: '显示模型线框' },
    { key: 'points', label: '点云', icon: <ScanOutlined />, description: '显示顶点' },
    { key: 'transparent', label: '透明', icon: <EyeOutlined />, description: '半透明显示' },
    { key: 'x-ray', label: 'X光', icon: <ApiOutlined />, description: 'X光透视效果' }
  ];

  // 材质类型选项
  const materialTypes = [
    { key: 'basic', label: '基础', material: THREE.MeshBasicMaterial },
    { key: 'normal', label: '法线', material: THREE.MeshNormalMaterial },
    { key: 'depth', label: '深度', material: THREE.MeshDepthMaterial },
    { key: 'lambert', label: 'Lambert', material: THREE.MeshLambertMaterial },
    { key: 'phong', label: 'Phong', material: THREE.MeshPhongMaterial },
    { key: 'standard', label: '标准PBR', material: THREE.MeshStandardMaterial }
  ];

  // 色调映射选项
  const toneMappingOptions = [
    { key: 'None', label: '无', value: THREE.NoToneMapping },
    { key: 'Linear', label: '线性', value: THREE.LinearToneMapping },
    { key: 'Reinhard', label: 'Reinhard', value: THREE.ReinhardToneMapping },
    { key: 'Cineon', label: 'Cineon', value: THREE.CineonToneMapping },
    { key: 'ACESFilmic', label: 'ACES胶片', value: THREE.ACESFilmicToneMapping }
  ];

  // 输出编码选项 (Three.js r150+ 使用ColorSpace)
  const colorSpaceOptions = [
    { key: 'Linear', label: '线性空间', value: THREE.LinearSRGBColorSpace },
    { key: 'sRGB', label: 'sRGB', value: THREE.SRGBColorSpace }
  ];

  // 应用设置
  useEffect(() => {
    applyRenderSettings();
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings]);

  // 应用渲染设置
  const applyRenderSettings = () => {
    // 应用渲染模式
    applyRenderMode();
    
    // 应用光照设置
    applyLightingSettings();
    
    // 应用环境设置
    applyEnvironmentSettings();
    
    // 应用渲染器设置
    applyRendererSettings();
  };

  // 应用渲染模式
  const applyRenderMode = () => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // 保存原始材质
        if (!originalMaterials.has(object)) {
          setOriginalMaterials(prev => new Map(prev.set(object, object.material)));
        }

        if (settings.materialOverride) {
          // 应用材质覆盖
          object.material = createOverrideMaterial();
        } else {
          // 恢复原始材质
          const original = originalMaterials.get(object);
          if (original) {
            object.material = original;
          }
        }

        // 应用渲染模式效果
        switch (settings.renderMode) {
          case 'wireframe':
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => (mat as any).wireframe = true);
            } else {
              (object.material as any).wireframe = true;
            }
            break;
            
          case 'points':
            // 转换为点云显示（需要创建Points对象）
            break;
            
          case 'transparent':
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => {
                mat.transparent = true;
                mat.opacity = 0.5;
              });
            } else {
              object.material.transparent = true;
              object.material.opacity = 0.5;
            }
            break;
            
          case 'x-ray':
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => {
                mat.transparent = true;
                mat.opacity = 0.3;
                mat.depthTest = false;
              });
            } else {
              object.material.transparent = true;
              object.material.opacity = 0.3;
              object.material.depthTest = false;
            }
            break;
        }
      }
    });
  };

  // 创建覆盖材质
  const createOverrideMaterial = (): THREE.Material => {
    const MaterialClass = materialTypes.find(t => t.key === settings.overrideMaterial.type)?.material || THREE.MeshStandardMaterial;
    
    const material = new MaterialClass({
      color: new THREE.Color(settings.overrideMaterial.color),
      transparent: settings.overrideMaterial.opacity < 1,
      opacity: settings.overrideMaterial.opacity,
      wireframe: settings.overrideMaterial.wireframe
    });

    return material;
  };

  // 应用光照设置
  const applyLightingSettings = () => {
    // 查找或创建环境光
    let ambientLight = scene.children.find(child => child instanceof THREE.AmbientLight) as THREE.AmbientLight;
    if (!ambientLight) {
      ambientLight = new THREE.AmbientLight(0xffffff, settings.lighting.ambientIntensity);
      scene.add(ambientLight);
    } else {
      ambientLight.intensity = settings.lighting.ambientIntensity;
    }

    // 查找或创建方向光
    let directionalLight = scene.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
    if (!directionalLight) {
      directionalLight = new THREE.DirectionalLight(0xffffff, settings.lighting.directionalIntensity);
      directionalLight.position.set(10, 10, 5);
      directionalLight.castShadow = settings.lighting.shadowsEnabled;
      scene.add(directionalLight);
    } else {
      directionalLight.intensity = settings.lighting.directionalIntensity;
      directionalLight.castShadow = settings.lighting.shadowsEnabled;
    }

    // 配置阴影
    if (settings.lighting.shadowsEnabled) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      if (directionalLight.shadow) {
        directionalLight.shadow.mapSize.setScalar(settings.lighting.shadowMapSize);
      }
    } else {
      renderer.shadowMap.enabled = false;
    }

    // 启用/禁用光照
    if (!settings.lighting.enabled) {
      scene.children.forEach(child => {
        if (child instanceof THREE.Light) {
          child.intensity = 0;
        }
      });
    }
  };

  // 应用环境设置
  const applyEnvironmentSettings = () => {
    // 背景设置
    if (settings.environment.showBackground) {
      scene.background = new THREE.Color(settings.environment.backgroundColor);
    } else {
      scene.background = null;
    }

    // 雾效设置
    if (settings.environment.fog.enabled) {
      scene.fog = new THREE.Fog(
        new THREE.Color(settings.environment.fog.color),
        settings.environment.fog.near,
        settings.environment.fog.far
      );
    } else {
      scene.fog = null;
    }
  };

  // 应用渲染器设置
  const applyRendererSettings = () => {
    // 像素比
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.renderOptions.pixelRatio));

    // 输出编码
    const colorSpaceOption = colorSpaceOptions.find(o => o.key === settings.renderOptions.colorSpace);
    if (colorSpaceOption) {
      renderer.outputColorSpace = colorSpaceOption.value;
    }

    // 色调映射
    const toneMappingOption = toneMappingOptions.find(o => o.key === settings.renderOptions.toneMapping);
    if (toneMappingOption) {
      renderer.toneMapping = toneMappingOption.value;
      renderer.toneMappingExposure = settings.renderOptions.toneMappingExposure;
    }
  };

  // 更新设置
  const updateSettings = (updates: Partial<RenderSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // 渲染模式控制
  const renderModeControl = () => (
    <Card title="渲染模式" size="small">
      <Row gutter={[8, 8]}>
        {renderModes.map(mode => (
          <Col span={12} key={mode.key}>
            <Tooltip title={mode.description}>
              <Button
                icon={mode.icon}
                type={settings.renderMode === mode.key ? 'primary' : 'default'}
                onClick={() => updateSettings({ renderMode: mode.key as any })}
                size="small"
                block
              >
                {mode.label}
              </Button>
            </Tooltip>
          </Col>
        ))}
      </Row>

      <Divider />

      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>材质覆盖:</Text>
          <Switch
            checked={settings.materialOverride}
            onChange={(materialOverride) => updateSettings({ materialOverride })}
          />
        </div>

        {settings.materialOverride && (
          <>
            <div>
              <Text strong>材质类型:</Text>
              <Select
                value={settings.overrideMaterial.type}
                onChange={(type) => updateSettings({
                  overrideMaterial: { ...settings.overrideMaterial, type }
                })}
                style={{ width: '100%', marginTop: 4 }}
                size="small"
              >
                {materialTypes.map(type => (
                  <Option key={type.key} value={type.key}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong>颜色:</Text>
              <ColorPicker
                value={settings.overrideMaterial.color}
                onChange={(color) => updateSettings({
                  overrideMaterial: { ...settings.overrideMaterial, color: color.toHexString() }
                })}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div>
              <Text strong>不透明度: {settings.overrideMaterial.opacity}</Text>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={settings.overrideMaterial.opacity}
                onChange={(opacity) => updateSettings({
                  overrideMaterial: { ...settings.overrideMaterial, opacity }
                })}
              />
            </div>
          </>
        )}
      </Space>
    </Card>
  );

  // 光照控制
  const lightingControl = () => (
    <Card title="光照设置" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>启用光照:</Text>
          <Switch
            checked={settings.lighting.enabled}
            onChange={(enabled) => updateSettings({
              lighting: { ...settings.lighting, enabled }
            })}
          />
        </div>

        {settings.lighting.enabled && (
          <>
            <div>
              <Text strong>环境光强度: {settings.lighting.ambientIntensity}</Text>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={settings.lighting.ambientIntensity}
                onChange={(ambientIntensity) => updateSettings({
                  lighting: { ...settings.lighting, ambientIntensity }
                })}
              />
            </div>

            <div>
              <Text strong>方向光强度: {settings.lighting.directionalIntensity}</Text>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={settings.lighting.directionalIntensity}
                onChange={(directionalIntensity) => updateSettings({
                  lighting: { ...settings.lighting, directionalIntensity }
                })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>阴影:</Text>
              <Switch
                checked={settings.lighting.shadowsEnabled}
                onChange={(shadowsEnabled) => updateSettings({
                  lighting: { ...settings.lighting, shadowsEnabled }
                })}
              />
            </div>

            {settings.lighting.shadowsEnabled && (
              <div>
                <Text strong>阴影质量:</Text>
                <Select
                  value={settings.lighting.shadowMapSize}
                  onChange={(shadowMapSize) => updateSettings({
                    lighting: { ...settings.lighting, shadowMapSize }
                  })}
                  style={{ width: '100%', marginTop: 4 }}
                  size="small"
                >
                  <Option value={512}>低 (512)</Option>
                  <Option value={1024}>中 (1024)</Option>
                  <Option value={2048}>高 (2048)</Option>
                  <Option value={4096}>超高 (4096)</Option>
                </Select>
              </div>
            )}
          </>
        )}
      </Space>
    </Card>
  );

  // 环境控制
  const environmentControl = () => (
    <Card title="环境设置" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>显示背景:</Text>
          <Switch
            checked={settings.environment.showBackground}
            onChange={(showBackground) => updateSettings({
              environment: { ...settings.environment, showBackground }
            })}
          />
        </div>

        {settings.environment.showBackground && (
          <div>
            <Text strong>背景颜色:</Text>
            <ColorPicker
              value={settings.environment.backgroundColor}
              onChange={(color) => updateSettings({
                environment: { ...settings.environment, backgroundColor: color.toHexString() }
              })}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>雾效:</Text>
          <Switch
            checked={settings.environment.fog.enabled}
            onChange={(enabled) => updateSettings({
              environment: {
                ...settings.environment,
                fog: { ...settings.environment.fog, enabled }
              }
            })}
          />
        </div>

        {settings.environment.fog.enabled && (
          <>
            <div>
              <Text strong>雾颜色:</Text>
              <ColorPicker
                value={settings.environment.fog.color}
                onChange={(color) => updateSettings({
                  environment: {
                    ...settings.environment,
                    fog: { ...settings.environment.fog, color: color.toHexString() }
                  }
                })}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div>
              <Text strong>近距离:</Text>
              <InputNumber
                min={0.1}
                max={100}
                step={0.1}
                value={settings.environment.fog.near}
                onChange={(near) => near && updateSettings({
                  environment: {
                    ...settings.environment,
                    fog: { ...settings.environment.fog, near }
                  }
                })}
                style={{ width: '100%', marginTop: 4 }}
                size="small"
              />
            </div>

            <div>
              <Text strong>远距离:</Text>
              <InputNumber
                min={1}
                max={10000}
                step={1}
                value={settings.environment.fog.far}
                onChange={(far) => far && updateSettings({
                  environment: {
                    ...settings.environment,
                    fog: { ...settings.environment.fog, far }
                  }
                })}
                style={{ width: '100%', marginTop: 4 }}
                size="small"
              />
            </div>
          </>
        )}
      </Space>
    </Card>
  );

  // 渲染器控制
  const rendererControl = () => (
    <Card title="渲染器设置" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>像素比: {settings.renderOptions.pixelRatio}</Text>
          <Slider
            min={0.5}
            max={3}
            step={0.1}
            value={settings.renderOptions.pixelRatio}
            onChange={(pixelRatio) => updateSettings({
              renderOptions: { ...settings.renderOptions, pixelRatio }
            })}
          />
        </div>

        <div>
          <Text strong>输出编码:</Text>
          <Select
            value={settings.renderOptions.colorSpace}
            onChange={(colorSpace) => updateSettings({
              renderOptions: { ...settings.renderOptions, colorSpace }
            })}
            style={{ width: '100%', marginTop: 4 }}
            size="small"
          >
            {colorSpaceOptions.map(option => (
              <Option key={option.key} value={option.key}>
                {option.label}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong>色调映射:</Text>
          <Select
            value={settings.renderOptions.toneMapping}
            onChange={(toneMapping) => updateSettings({
              renderOptions: { ...settings.renderOptions, toneMapping }
            })}
            style={{ width: '100%', marginTop: 4 }}
            size="small"
          >
            {toneMappingOptions.map(option => (
              <Option key={option.key} value={option.key}>
                {option.label}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong>曝光度: {settings.renderOptions.toneMappingExposure}</Text>
          <Slider
            min={0.1}
            max={3}
            step={0.1}
            value={settings.renderOptions.toneMappingExposure}
            onChange={(toneMappingExposure) => updateSettings({
              renderOptions: { ...settings.renderOptions, toneMappingExposure }
            })}
          />
        </div>
      </Space>
    </Card>
  );

  return (
    <div className="render-mode-controller">
      <Space direction="vertical" style={{ width: '100%' }}>
        {renderModeControl()}
        {lightingControl()}
        {environmentControl()}
        {rendererControl()}
        
        <Alert
          message="提示"
          description="某些设置可能会影响渲染性能，请根据设备性能合理调整。"
          type="info"
          showIcon
        />
      </Space>
    </div>
  );
};