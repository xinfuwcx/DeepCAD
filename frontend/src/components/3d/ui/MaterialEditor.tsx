import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Slider,
  Select,
  ColorPicker,
  Switch,
  InputNumber,
  Divider,
  Space,
  Button,
  Upload,
  message,
  Tabs,
  Collapse,
  Typography,
  Tag
} from 'antd';
import {
  UploadOutlined,
  ReloadOutlined,
  SaveOutlined,
  EyeOutlined,
  SettingOutlined,
  BgColorsOutlined,
  BulbOutlined
} from '@ant-design/icons';
import * as THREE from 'three';

const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Text, Title } = Typography;

export interface MaterialSettings {
  // 基础属性
  type: 'MeshBasicMaterial' | 'MeshLambertMaterial' | 'MeshPhongMaterial' | 'MeshStandardMaterial' | 'MeshPhysicalMaterial';
  color: string;
  opacity: number;
  transparent: boolean;
  
  // PBR属性
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  
  // 物理材质属性
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
  ior: number;
  
  // 贴图
  map?: string;
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  aoMap?: string;
  emissiveMap?: string;
  
  // 其他属性
  wireframe: boolean;
  side: 'FrontSide' | 'BackSide' | 'DoubleSide';
  alphaTest: number;
  depthTest: boolean;
  depthWrite: boolean;
}

interface MaterialEditorProps {
  material?: THREE.Material;
  onMaterialChange?: (material: THREE.Material) => void;
  presets?: Record<string, MaterialSettings>;
  showPreview?: boolean;
}

export const MaterialEditor: React.FC<MaterialEditorProps> = ({
  material,
  onMaterialChange,
  presets = {},
  showPreview = true
}) => {
  const [settings, setSettings] = useState<MaterialSettings>({
    type: 'MeshStandardMaterial',
    color: '#ffffff',
    opacity: 1,
    transparent: false,
    metalness: 0,
    roughness: 0.5,
    emissive: '#000000',
    emissiveIntensity: 0,
    clearcoat: 0,
    clearcoatRoughness: 0,
    transmission: 0,
    thickness: 1,
    ior: 1.5,
    wireframe: false,
    side: 'FrontSide',
    alphaTest: 0,
    depthTest: true,
    depthWrite: true
  });

  const [previewMaterial, setPreviewMaterial] = useState<THREE.Material>();
  const [textureUploading, setTextureUploading] = useState(false);

  // 材质类型选项
  const materialTypes = [
    { value: 'MeshBasicMaterial', label: '基础材质', description: '无光照，适合UI' },
    { value: 'MeshLambertMaterial', label: 'Lambert材质', description: '漫反射，性能好' },
    { value: 'MeshPhongMaterial', label: 'Phong材质', description: '镜面反射' },
    { value: 'MeshStandardMaterial', label: '标准PBR材质', description: '物理准确' },
    { value: 'MeshPhysicalMaterial', label: '物理材质', description: '最真实效果' }
  ];

  // 侧面渲染选项
  const sideOptions = [
    { value: 'FrontSide', label: '正面' },
    { value: 'BackSide', label: '背面' },
    { value: 'DoubleSide', label: '双面' }
  ];

  // 预设材质
  const defaultPresets: Record<string, MaterialSettings> = {
    metal: {
      ...settings,
      type: 'MeshStandardMaterial',
      color: '#C0C0C0',
      metalness: 1,
      roughness: 0.1,
      emissive: '#000000'
    },
    plastic: {
      ...settings,
      type: 'MeshStandardMaterial',
      color: '#FF6B6B',
      metalness: 0,
      roughness: 0.7,
      emissive: '#000000'
    },
    glass: {
      ...settings,
      type: 'MeshPhysicalMaterial',
      color: '#ffffff',
      metalness: 0,
      roughness: 0,
      transmission: 1,
      transparent: true,
      opacity: 0.8,
      ior: 1.5
    },
    wood: {
      ...settings,
      type: 'MeshStandardMaterial',
      color: '#8B4513',
      metalness: 0,
      roughness: 0.8,
      emissive: '#000000'
    },
    ceramic: {
      ...settings,
      type: 'MeshStandardMaterial',
      color: '#F5F5DC',
      metalness: 0,
      roughness: 0.2,
      emissive: '#000000'
    },
    emissive: {
      ...settings,
      type: 'MeshStandardMaterial',
      color: '#000000',
      emissive: '#00ff00',
      emissiveIntensity: 1,
      metalness: 0,
      roughness: 0.5
    }
  };

  // 从Three.js材质初始化设置
  useEffect(() => {
    if (material) {
      const newSettings = extractMaterialSettings(material);
      setSettings(newSettings);
    }
  }, [material]);

  // 更新预览材质
  useEffect(() => {
    const newMaterial = createMaterialFromSettings(settings);
    setPreviewMaterial(newMaterial);
    
    if (onMaterialChange) {
      onMaterialChange(newMaterial);
    }
  }, [settings, onMaterialChange]);

  // 从Three.js材质提取设置
  const extractMaterialSettings = (mat: THREE.Material): MaterialSettings => {
    const extracted: any = {
      type: mat.constructor.name,
      opacity: mat.opacity,
      transparent: mat.transparent,
      wireframe: (mat as any).wireframe || false,
      side: mat.side === THREE.FrontSide ? 'FrontSide' : 
            mat.side === THREE.BackSide ? 'BackSide' : 'DoubleSide',
      alphaTest: mat.alphaTest,
      depthTest: mat.depthTest,
      depthWrite: mat.depthWrite
    };

    // 颜色
    if ('color' in mat) {
      extracted.color = `#${(mat as any).color.getHexString()}`;
    }

    // PBR属性
    if ('metalness' in mat) {
      extracted.metalness = (mat as any).metalness;
    }
    if ('roughness' in mat) {
      extracted.roughness = (mat as any).roughness;
    }
    if ('emissive' in mat) {
      extracted.emissive = `#${(mat as any).emissive.getHexString()}`;
      extracted.emissiveIntensity = (mat as any).emissiveIntensity || 0;
    }

    // 物理材质属性
    if ('clearcoat' in mat) {
      extracted.clearcoat = (mat as any).clearcoat;
      extracted.clearcoatRoughness = (mat as any).clearcoatRoughness;
    }
    if ('transmission' in mat) {
      extracted.transmission = (mat as any).transmission;
      extracted.thickness = (mat as any).thickness;
      extracted.ior = (mat as any).ior;
    }

    return { ...settings, ...extracted };
  };

  // 从设置创建Three.js材质
  const createMaterialFromSettings = (settings: MaterialSettings): THREE.Material => {
    let material: THREE.Material;

    switch (settings.type) {
      case 'MeshBasicMaterial':
        material = new THREE.MeshBasicMaterial();
        break;
      case 'MeshLambertMaterial':
        material = new THREE.MeshLambertMaterial();
        break;
      case 'MeshPhongMaterial':
        material = new THREE.MeshPhongMaterial();
        break;
      case 'MeshStandardMaterial':
        material = new THREE.MeshStandardMaterial();
        break;
      case 'MeshPhysicalMaterial':
        material = new THREE.MeshPhysicalMaterial();
        break;
      default:
        material = new THREE.MeshStandardMaterial();
    }

    // 应用基础属性
    if ('color' in material) {
      (material as any).color = new THREE.Color(settings.color);
    }
    material.opacity = settings.opacity;
    material.transparent = settings.transparent;
    
    if ('wireframe' in material) {
      (material as any).wireframe = settings.wireframe;
    }

    material.side = settings.side === 'FrontSide' ? THREE.FrontSide :
                    settings.side === 'BackSide' ? THREE.BackSide : THREE.DoubleSide;
    
    material.alphaTest = settings.alphaTest;
    material.depthTest = settings.depthTest;
    material.depthWrite = settings.depthWrite;

    // 应用PBR属性
    if ('metalness' in material) {
      (material as any).metalness = settings.metalness;
    }
    if ('roughness' in material) {
      (material as any).roughness = settings.roughness;
    }
    if ('emissive' in material) {
      (material as any).emissive = new THREE.Color(settings.emissive);
      (material as any).emissiveIntensity = settings.emissiveIntensity;
    }

    // 应用物理材质属性
    if (settings.type === 'MeshPhysicalMaterial') {
      const physMat = material as THREE.MeshPhysicalMaterial;
      physMat.clearcoat = settings.clearcoat;
      physMat.clearcoatRoughness = settings.clearcoatRoughness;
      physMat.transmission = settings.transmission;
      physMat.thickness = settings.thickness;
      physMat.ior = settings.ior;
    }

    return material;
  };

  // 更新设置
  const updateSettings = (updates: Partial<MaterialSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // 应用预设
  const applyPreset = (presetName: string) => {
    const preset = { ...defaultPresets, ...presets }[presetName];
    if (preset) {
      setSettings(preset);
      message.success(`已应用 ${presetName} 材质预设`);
    }
  };

  // 重置材质
  const resetMaterial = () => {
    setSettings({
      type: 'MeshStandardMaterial',
      color: '#ffffff',
      opacity: 1,
      transparent: false,
      metalness: 0,
      roughness: 0.5,
      emissive: '#000000',
      emissiveIntensity: 0,
      clearcoat: 0,
      clearcoatRoughness: 0,
      transmission: 0,
      thickness: 1,
      ior: 1.5,
      wireframe: false,
      side: 'FrontSide',
      alphaTest: 0,
      depthTest: true,
      depthWrite: true
    });
  };

  // 纹理上传
  const handleTextureUpload = (textureType: string) => ({
    capture: false,
    hasControlInside: false,
    pastable: false,
    beforeUpload: (file: File) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
        return false;
      }
      
      setTextureUploading(true);
      
      // 创建纹理
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataURL = e.target?.result as string;
        updateSettings({ [textureType]: dataURL });
        setTextureUploading(false);
        message.success('纹理上传成功');
      };
      reader.readAsDataURL(file);
      
      return false; // 阻止自动上传
    }
  });

  // 渲染基础属性
  const renderBasicProperties = () => (
    <Card title="基础属性" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>材质类型:</Text>
          <Select
            value={settings.type}
            onChange={(type) => updateSettings({ type })}
            style={{ width: '100%', marginTop: 4 }}
          >
            {materialTypes.map(type => (
              <Option key={type.value} value={type.value}>
                <div>
                  <div>{type.label}</div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {type.description}
                  </Text>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong>颜色:</Text>
          <ColorPicker
            value={settings.color}
            onChange={(color) => updateSettings({ color: color.toHexString() })}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>

        <div>
          <Text strong>不透明度: {settings.opacity}</Text>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={settings.opacity}
            onChange={(opacity) => updateSettings({ opacity })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>透明:</Text>
          <Switch
            checked={settings.transparent}
            onChange={(transparent) => updateSettings({ transparent })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>线框模式:</Text>
          <Switch
            checked={settings.wireframe}
            onChange={(wireframe) => updateSettings({ wireframe })}
          />
        </div>

        <div>
          <Text strong>渲染面:</Text>
          <Select
            value={settings.side}
            onChange={(side) => updateSettings({ side })}
            style={{ width: '100%', marginTop: 4 }}
          >
            {sideOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </div>
      </Space>
    </Card>
  );

  // 渲染PBR属性
  const renderPBRProperties = () => {
    if (!['MeshStandardMaterial', 'MeshPhysicalMaterial'].includes(settings.type)) {
      return null;
    }

    return (
      <Card title="PBR属性" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>金属度: {settings.metalness}</Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={settings.metalness}
              onChange={(metalness) => updateSettings({ metalness })}
            />
          </div>

          <div>
            <Text strong>粗糙度: {settings.roughness}</Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={settings.roughness}
              onChange={(roughness) => updateSettings({ roughness })}
            />
          </div>

          <div>
            <Text strong>自发光颜色:</Text>
            <ColorPicker
              value={settings.emissive}
              onChange={(color) => updateSettings({ emissive: color.toHexString() })}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>

          <div>
            <Text strong>自发光强度: {settings.emissiveIntensity}</Text>
            <Slider
              min={0}
              max={2}
              step={0.01}
              value={settings.emissiveIntensity}
              onChange={(emissiveIntensity) => updateSettings({ emissiveIntensity })}
            />
          </div>
        </Space>
      </Card>
    );
  };

  // 渲染物理属性
  const renderPhysicalProperties = () => {
    if (settings.type !== 'MeshPhysicalMaterial') {
      return null;
    }

    return (
      <Card title="物理属性" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>清漆: {settings.clearcoat}</Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={settings.clearcoat}
              onChange={(clearcoat) => updateSettings({ clearcoat })}
            />
          </div>

          <div>
            <Text strong>清漆粗糙度: {settings.clearcoatRoughness}</Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={settings.clearcoatRoughness}
              onChange={(clearcoatRoughness) => updateSettings({ clearcoatRoughness })}
            />
          </div>

          <div>
            <Text strong>透射: {settings.transmission}</Text>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={settings.transmission}
              onChange={(transmission) => updateSettings({ transmission })}
            />
          </div>

          <div>
            <Text strong>厚度: {settings.thickness}</Text>
            <Slider
              min={0}
              max={5}
              step={0.01}
              value={settings.thickness}
              onChange={(thickness) => updateSettings({ thickness })}
            />
          </div>

          <div>
            <Text strong>折射率:</Text>
            <InputNumber
              min={1}
              max={3}
              step={0.01}
              value={settings.ior}
              onChange={(ior) => ior && updateSettings({ ior })}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </Space>
      </Card>
    );
  };

  // 渲染纹理设置
  const renderTextureSettings = () => (
    <Card title="纹理贴图" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        {[
          { key: 'map', label: '漫反射贴图' },
          { key: 'normalMap', label: '法线贴图' },
          { key: 'roughnessMap', label: '粗糙度贴图' },
          { key: 'metalnessMap', label: '金属度贴图' },
          { key: 'aoMap', label: 'AO贴图' },
          { key: 'emissiveMap', label: '自发光贴图' }
        ].map(texture => (
          <div key={texture.key}>
            <Text strong>{texture.label}:</Text>
            <Upload {...handleTextureUpload(texture.key)} showUploadList={false}>
              <Button 
                icon={<UploadOutlined />} 
                loading={textureUploading}
                style={{ width: '100%', marginTop: 4 }}
              >
                {(settings as any)[texture.key] ? '更换' : '上传'}
              </Button>
            </Upload>
            {(settings as any)[texture.key] && (
              <Tag 
                color="green" 
                closable 
                onClose={() => updateSettings({ [texture.key]: undefined })}
                style={{ marginTop: 4 }}
              >
                已上传
              </Tag>
            )}
          </div>
        ))}
      </Space>
    </Card>
  );

  // 渲染预设材质
  const renderPresets = () => {
    const allPresets = { ...defaultPresets, ...presets };
    
    return (
      <Card title="材质预设" size="small">
        <Row gutter={[8, 8]}>
          {Object.keys(allPresets).map(presetName => (
            <Col span={12} key={presetName}>
              <Button
                size="small"
                onClick={() => applyPreset(presetName)}
                block
              >
                {presetName}
              </Button>
            </Col>
          ))}
        </Row>
        
        <Divider />
        
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={resetMaterial}
            size="small"
          >
            重置
          </Button>
          <Button
            icon={<SaveOutlined />}
            onClick={() => message.info('保存功能待实现')}
            size="small"
          >
            保存预设
          </Button>
        </Space>
      </Card>
    );
  };

  return (
    <div className="material-editor">
      <Tabs defaultActiveKey="basic">
        <TabPane tab={<span><BgColorsOutlined />基础</span>} key="basic">
          <Space direction="vertical" style={{ width: '100%' }}>
            {renderBasicProperties()}
            {renderPresets()}
          </Space>
        </TabPane>

        <TabPane tab={<span><BulbOutlined />PBR</span>} key="pbr">
          <Space direction="vertical" style={{ width: '100%' }}>
            {renderPBRProperties()}
            {renderPhysicalProperties()}
          </Space>
        </TabPane>

        <TabPane tab={<span><UploadOutlined />纹理</span>} key="texture">
          {renderTextureSettings()}
        </TabPane>
      </Tabs>
    </div>
  );
};