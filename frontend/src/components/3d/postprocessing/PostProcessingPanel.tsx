import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Row,
  Col,
  Slider,
  Switch,
  Select,
  Button,
  Space,
  Divider,
  Typography,
  Alert,
  Tooltip,
  Collapse,
  Descriptions
} from 'antd';
import {
  EyeOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  BgColorsOutlined,
  AimOutlined,
  StarOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { PostProcessingManager, PostProcessingSettings } from './PostProcessingManager';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

interface PostProcessingPanelProps {
  postProcessingManager: PostProcessingManager;
  visible?: boolean;
  onClose?: () => void;
}

export const PostProcessingPanel: React.FC<PostProcessingPanelProps> = ({
  postProcessingManager,
  visible = false,
  onClose
}) => {
  const [settings, setSettings] = useState<PostProcessingSettings>(
    postProcessingManager.getSettings()
  );
  const [currentProfile, setCurrentProfile] = useState('medium');
  const [performanceStats, setPerformanceStats] = useState(
    postProcessingManager.getPerformanceStats()
  );

  // 自动更新性能统计
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceStats(postProcessingManager.getPerformanceStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [postProcessingManager]);

  // 更新设置
  const updateSettings = (newSettings: Partial<PostProcessingSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    postProcessingManager.updateSettings(updatedSettings);
  };

  // 应用预设
  const handleProfileChange = (profile: string) => {
    setCurrentProfile(profile);
    postProcessingManager.applyProfile(profile);
    setSettings(postProcessingManager.getSettings());
  };

  // 重置设置
  const resetSettings = () => {
    postProcessingManager.applyProfile(currentProfile);
    setSettings(postProcessingManager.getSettings());
  };

  // 渲染SSAO设置
  const renderSSAOSettings = () => (
    <Card title="屏幕空间环境光遮蔽 (SSAO)" size="small">
      <Row gutter={16}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用 SSAO</Text>
              <Switch
                checked={settings.ssao.enabled}
                onChange={(enabled) => updateSettings({
                  ssao: { ...settings.ssao, enabled }
                })}
              />
            </div>
            
            {settings.ssao.enabled && (
              <>
                <div>
                  <Text>强度: {settings.ssao.intensity}</Text>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={settings.ssao.intensity}
                    onChange={(intensity) => updateSettings({
                      ssao: { ...settings.ssao, intensity }
                    })}
                  />
                </div>
                
                <div>
                  <Text>半径: {settings.ssao.radius}</Text>
                  <Slider
                    min={0.01}
                    max={0.5}
                    step={0.01}
                    value={settings.ssao.radius}
                    onChange={(radius) => updateSettings({
                      ssao: { ...settings.ssao, radius }
                    })}
                  />
                </div>
                
                <div>
                  <Text>偏移: {settings.ssao.bias}</Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={settings.ssao.bias}
                    onChange={(bias) => updateSettings({
                      ssao: { ...settings.ssao, bias }
                    })}
                  />
                </div>
                
                <div>
                  <Text>采样数: {settings.ssao.kernelSize}</Text>
                  <Select
                    value={settings.ssao.kernelSize}
                    onChange={(kernelSize) => updateSettings({
                      ssao: { ...settings.ssao, kernelSize }
                    })}
                    style={{ width: '100%' }}
                  >
                    <Option value={8}>8 (快)</Option>
                    <Option value={16}>16 (平衡)</Option>
                    <Option value={32}>32 (高质量)</Option>
                    <Option value={64}>64 (最高质量)</Option>
                  </Select>
                </div>
              </>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染Bloom设置
  const renderBloomSettings = () => (
    <Card title="辉光效果 (Bloom)" size="small">
      <Row gutter={16}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用 Bloom</Text>
              <Switch
                checked={settings.bloom.enabled}
                onChange={(enabled) => updateSettings({
                  bloom: { ...settings.bloom, enabled }
                })}
              />
            </div>
            
            {settings.bloom.enabled && (
              <>
                <div>
                  <Text>强度: {settings.bloom.strength}</Text>
                  <Slider
                    min={0}
                    max={3}
                    step={0.1}
                    value={settings.bloom.strength}
                    onChange={(strength) => updateSettings({
                      bloom: { ...settings.bloom, strength }
                    })}
                  />
                </div>
                
                <div>
                  <Text>半径: {settings.bloom.radius}</Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.bloom.radius}
                    onChange={(radius) => updateSettings({
                      bloom: { ...settings.bloom, radius }
                    })}
                  />
                </div>
                
                <div>
                  <Text>阈值: {settings.bloom.threshold}</Text>
                  <Slider
                    min={0}
                    max={2}
                    step={0.05}
                    value={settings.bloom.threshold}
                    onChange={(threshold) => updateSettings({
                      bloom: { ...settings.bloom, threshold }
                    })}
                  />
                </div>
              </>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染抗锯齿设置
  const renderAntialiasingSettings = () => (
    <Card title="抗锯齿 (Anti-aliasing)" size="small">
      <Row gutter={16}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用抗锯齿</Text>
              <Switch
                checked={settings.antialiasing.enabled}
                onChange={(enabled) => updateSettings({
                  antialiasing: { ...settings.antialiasing, enabled }
                })}
              />
            </div>
            
            {settings.antialiasing.enabled && (
              <div>
                <Text>类型</Text>
                <Select
                  value={settings.antialiasing.type}
                  onChange={(type) => updateSettings({
                    antialiasing: { ...settings.antialiasing, type }
                  })}
                  style={{ width: '100%' }}
                >
                  <Option value="FXAA">FXAA (快速)</Option>
                  <Option value="SMAA">SMAA (高质量)</Option>
                  <Option value="MSAA">MSAA (最高质量)</Option>
                </Select>
              </div>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染色调映射设置
  const renderTonemapSettings = () => (
    <Card title="色调映射 (Tone Mapping)" size="small">
      <Row gutter={16}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用色调映射</Text>
              <Switch
                checked={settings.tonemap.enabled}
                onChange={(enabled) => updateSettings({
                  tonemap: { ...settings.tonemap, enabled }
                })}
              />
            </div>
            
            {settings.tonemap.enabled && (
              <>
                <div>
                  <Text>曝光: {settings.tonemap.exposure}</Text>
                  <Slider
                    min={0.1}
                    max={3}
                    step={0.1}
                    value={settings.tonemap.exposure}
                    onChange={(exposure) => updateSettings({
                      tonemap: { ...settings.tonemap, exposure }
                    })}
                  />
                </div>
                
                <div>
                  <Text>白点: {settings.tonemap.whitepoint}</Text>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={settings.tonemap.whitepoint}
                    onChange={(whitepoint) => updateSettings({
                      tonemap: { ...settings.tonemap, whitepoint }
                    })}
                  />
                </div>
              </>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染颜色校正设置
  const renderColorCorrectionSettings = () => (
    <Card title="颜色校正" size="small">
      <Row gutter={16}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用颜色校正</Text>
              <Switch
                checked={settings.colorCorrection.enabled}
                onChange={(enabled) => updateSettings({
                  colorCorrection: { ...settings.colorCorrection, enabled }
                })}
              />
            </div>
            
            {settings.colorCorrection.enabled && (
              <>
                <div>
                  <Text>对比度: {settings.colorCorrection.contrast}</Text>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={settings.colorCorrection.contrast}
                    onChange={(contrast) => updateSettings({
                      colorCorrection: { ...settings.colorCorrection, contrast }
                    })}
                  />
                </div>
                
                <div>
                  <Text>亮度: {settings.colorCorrection.brightness}</Text>
                  <Slider
                    min={-0.5}
                    max={0.5}
                    step={0.05}
                    value={settings.colorCorrection.brightness}
                    onChange={(brightness) => updateSettings({
                      colorCorrection: { ...settings.colorCorrection, brightness }
                    })}
                  />
                </div>
                
                <div>
                  <Text>饱和度: {settings.colorCorrection.saturation}</Text>
                  <Slider
                    min={0}
                    max={2}
                    step={0.05}
                    value={settings.colorCorrection.saturation}
                    onChange={(saturation) => updateSettings({
                      colorCorrection: { ...settings.colorCorrection, saturation }
                    })}
                  />
                </div>
              </>
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // 渲染高级效果设置
  const renderAdvancedEffects = () => {
    const collapseItems = [
      {
        key: 'vignette',
        label: '晕影效果',
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用晕影</Text>
              <Switch
                checked={settings.vignette.enabled}
                onChange={(enabled) => updateSettings({
                  vignette: { ...settings.vignette, enabled }
                })}
              />
            </div>
            
            {settings.vignette.enabled && (
              <>
                <div>
                  <Text>强度: {settings.vignette.intensity}</Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.vignette.intensity}
                    onChange={(intensity) => updateSettings({
                      vignette: { ...settings.vignette, intensity }
                    })}
                  />
                </div>
                
                <div>
                  <Text>平滑度: {settings.vignette.smoothness}</Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.vignette.smoothness}
                    onChange={(smoothness) => updateSettings({
                      vignette: { ...settings.vignette, smoothness }
                    })}
                  />
                </div>
              </>
            )}
          </Space>
        )
      },
      {
        key: 'chromaticAberration',
        label: '色差效果',
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用色差</Text>
              <Switch
                checked={settings.chromaticAberration.enabled}
                onChange={(enabled) => updateSettings({
                  chromaticAberration: { ...settings.chromaticAberration, enabled }
                })}
              />
            </div>
            
            {settings.chromaticAberration.enabled && (
              <div>
                <Text>强度: {settings.chromaticAberration.intensity}</Text>
                <Slider
                  min={0}
                  max={0.1}
                  step={0.005}
                  value={settings.chromaticAberration.intensity}
                  onChange={(intensity) => updateSettings({
                    chromaticAberration: { ...settings.chromaticAberration, intensity }
                  })}
                />
              </div>
            )}
          </Space>
        )
      },
      {
        key: 'filmGrain',
        label: '胶片颗粒',
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用胶片颗粒</Text>
              <Switch
                checked={settings.filmGrain.enabled}
                onChange={(enabled) => updateSettings({
                  filmGrain: { ...settings.filmGrain, enabled }
                })}
              />
            </div>
            
            {settings.filmGrain.enabled && (
              <>
                <div>
                  <Text>强度: {settings.filmGrain.intensity}</Text>
                  <Slider
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={settings.filmGrain.intensity}
                    onChange={(intensity) => updateSettings({
                      filmGrain: { ...settings.filmGrain, intensity }
                    })}
                  />
                </div>
                
                <div>
                  <Text>大小: {settings.filmGrain.size}</Text>
                  <Slider
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={settings.filmGrain.size}
                    onChange={(size) => updateSettings({
                      filmGrain: { ...settings.filmGrain, size }
                    })}
                  />
                </div>
              </>
            )}
          </Space>
        )
      }
    ];

    return <Collapse items={collapseItems} />;
  };

  return (
    <Modal
      title={
        <Space>
          <EyeOutlined />
          <span>后期处理效果</span>
          <Switch
            checked={settings.enabled}
            onChange={(enabled) => {
              updateSettings({ enabled });
              postProcessingManager.setEnabled(enabled);
            }}
            checkedChildren="开"
            unCheckedChildren="关"
            size="small"
          />
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      {/* 性能警告 */}
      {performanceStats.renderTime > 10 && (
        <Alert
          message="性能警告"
          description={`后期处理渲染时间较长 (${performanceStats.renderTime.toFixed(2)}ms)，建议降低效果质量或禁用部分效果。`}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 控制栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Select
            value={currentProfile}
            onChange={handleProfileChange}
            style={{ width: '100%' }}
            prefix={<SettingOutlined />}
          >
            <Option value="low">低端设备</Option>
            <Option value="medium">中端设备</Option>
            <Option value="high">高端设备</Option>
          </Select>
        </Col>
        <Col span={8}>
          <Button
            icon={<ReloadOutlined />}
            onClick={resetSettings}
            block
          >
            重置设置
          </Button>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">渲染时间: {performanceStats.renderTime.toFixed(2)}ms</Text>
          </div>
        </Col>
      </Row>

      <Tabs defaultActiveKey="basic">
        {/* 基础效果 */}
        <TabPane tab={<span><ThunderboltOutlined />基础效果</span>} key="basic">
          <Row gutter={16}>
            <Col span={12}>
              {renderSSAOSettings()}
            </Col>
            <Col span={12}>
              {renderBloomSettings()}
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              {renderAntialiasingSettings()}
            </Col>
            <Col span={12}>
              {renderTonemapSettings()}
            </Col>
          </Row>
        </TabPane>

        {/* 颜色调整 */}
        <TabPane tab={<span><BgColorsOutlined />颜色调整</span>} key="color">
          <Row gutter={16}>
            <Col span={24}>
              {renderColorCorrectionSettings()}
            </Col>
          </Row>
        </TabPane>

        {/* 高级效果 */}
        <TabPane tab={<span><StarOutlined />高级效果</span>} key="advanced">
          {renderAdvancedEffects()}
        </TabPane>

        {/* 性能信息 */}
        <TabPane tab={<span><AimOutlined />性能信息</span>} key="performance">
          <Card title="性能统计" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4}>{performanceStats.renderTime.toFixed(2)}</Title>
                  <Text type="secondary">渲染时间 (ms)</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4}>{performanceStats.passCount}</Title>
                  <Text type="secondary">渲染通道数</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4} style={{ color: performanceStats.enabled ? 'green' : 'red' }}>
                    {performanceStats.enabled ? '启用' : '禁用'}
                  </Title>
                  <Text type="secondary">后期处理状态</Text>
                </div>
              </Col>
            </Row>

            <Divider />

            <Alert
              message="性能建议"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {performanceStats.renderTime > 16 && (
                    <li>渲染时间过长，建议降低效果质量</li>
                  )}
                  {performanceStats.passCount > 8 && (
                    <li>渲染通道过多，建议禁用不必要的效果</li>
                  )}
                  {performanceStats.renderTime < 5 && (
                    <li>性能充足，可以提高效果质量</li>
                  )}
                </ul>
              }
              type="info"
              showIcon
            />
          </Card>
        </TabPane>
      </Tabs>
    </Modal>
  );
};