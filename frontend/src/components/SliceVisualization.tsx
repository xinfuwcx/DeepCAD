import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Tabs, 
  Select, 
  Slider, 
  Button, 
  Row, 
  Col, 
  Space,
  InputNumber,
  Form,
  Tooltip,
  Switch,
  Divider,
  Spin,
  List,
  ColorPicker,
  Checkbox
} from 'antd';
import { 
  ScissorOutlined,
  EyeOutlined,
  SettingOutlined,
  RotateLeftOutlined,
  SaveOutlined,
  AppstoreOutlined,
  CompressOutlined,
  ExpandOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepForwardOutlined,
  BackwardOutlined
} from '@ant-design/icons';
import { useResultsStore } from '../stores/useResultsStore';
import { useShallow } from 'zustand/react/shallow';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface SliceVisualizationProps {
  onSliceGenerated?: (sliceData: any) => void;
}

interface SliceConfig {
  direction: 'x' | 'y' | 'z';
  position: number;
  thickness: number;
  visible: boolean;
  opacity: number;
  color: string;
  variable?: string;
  component?: string;
}

interface MultiSliceConfig {
  direction: 'x' | 'y' | 'z';
  count: number;
  spacing: number;
  startPosition: number;
  endPosition: number;
}

interface AnimationConfig {
  isPlaying: boolean;
  speed: number;
  direction: 'forward' | 'backward' | 'pingpong';
  currentFrame: number;
  totalFrames: number;
}

const SliceVisualization: React.FC<SliceVisualizationProps> = ({ onSliceGenerated }) => {
  const {
    currentResult,
    slice,
    updateSliceSettings
  } = useResultsStore(useShallow(state => ({
    currentResult: state.currentResult,
    slice: state.slice,
    updateSliceSettings: state.updateSliceSettings
  })));

  const [activeTab, setActiveTab] = useState('single');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sliceConfigs, setSliceConfigs] = useState<SliceConfig[]>([
    { direction: 'x', position: 0.5, thickness: 0.01, visible: true, opacity: 0.8, color: '#ff4d4f' },
    { direction: 'y', position: 0.5, thickness: 0.01, visible: false, opacity: 0.8, color: '#52c41a' },
    { direction: 'z', position: 0.5, thickness: 0.01, visible: false, opacity: 0.8, color: '#1890ff' }
  ]);

  const [multiSliceConfig, setMultiSliceConfig] = useState<MultiSliceConfig>({
    direction: 'z',
    count: 5,
    spacing: 0.2,
    startPosition: 0.1,
    endPosition: 0.9
  });

  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>({
    isPlaying: false,
    speed: 1,
    direction: 'forward',
    currentFrame: 0,
    totalFrames: 50
  });

  const [visualSettings, setVisualSettings] = useState({
    showBoundingBox: true,
    showAxes: true,
    showSliceIntersections: true,
    enableShadows: false,
    backgroundTransparency: 0.1,
    sliceInterpolation: 'linear'
  });

  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (animationConfig.isPlaying) {
      animationIntervalRef.current = setInterval(() => {
        setAnimationConfig(prev => {
          let nextFrame = prev.currentFrame;
          
          if (prev.direction === 'forward') {
            nextFrame = (prev.currentFrame + 1) % prev.totalFrames;
          } else if (prev.direction === 'backward') {
            nextFrame = prev.currentFrame === 0 ? prev.totalFrames - 1 : prev.currentFrame - 1;
          } else if (prev.direction === 'pingpong') {
            // 实现来回运动
            const halfFrames = Math.floor(prev.totalFrames / 2);
            if (prev.currentFrame < halfFrames) {
              nextFrame = prev.currentFrame + 1;
            } else {
              nextFrame = prev.currentFrame - 1;
              if (nextFrame < 0) nextFrame = 0;
            }
          }
          
          return { ...prev, currentFrame: nextFrame };
        });
      }, 1000 / animationConfig.speed);
    } else {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [animationConfig.isPlaying, animationConfig.speed, animationConfig.direction]);

  const handleGenerateSingleSlice = async (sliceIndex: number) => {
    if (!currentResult) {
      console.warn('No current result available for slice visualization');
      return;
    }

    setIsGenerating(true);
    
    try {
      const sliceConfig = sliceConfigs[sliceIndex];
      const requestData = {
        result_id: currentResult.id,
        slice_config: {
          direction: sliceConfig.direction,
          position: sliceConfig.position,
          thickness: sliceConfig.thickness,
          variable: sliceConfig.variable || 'displacement',
          component: sliceConfig.component || 'magnitude'
        },
        visual_settings: {
          opacity: sliceConfig.opacity,
          color: sliceConfig.color,
          interpolation: visualSettings.sliceInterpolation
        }
      };

      const response = await fetch('/api/visualization/3d-slice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate slice: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (onSliceGenerated) {
        onSliceGenerated(result);
      }

      console.log('3D slice generated successfully:', result);
      
    } catch (error) {
      console.error('Failed to generate 3D slice:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMultiSlice = async () => {
    if (!currentResult) return;

    setIsGenerating(true);
    
    try {
      const requestData = {
        result_id: currentResult.id,
        multi_slice_config: {
          ...multiSliceConfig,
          variable: sliceConfigs[0]?.variable || 'displacement',
          component: sliceConfigs[0]?.component || 'magnitude'
        },
        visual_settings: visualSettings
      };

      const response = await fetch('/api/visualization/3d-slice/generate-multi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate multi-slice: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (onSliceGenerated) {
        onSliceGenerated(result);
      }

      console.log('Multi-slice generated successfully:', result);
      
    } catch (error) {
      console.error('Failed to generate multi-slice:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSlicePositionChange = (sliceIndex: number, position: number) => {
    setSliceConfigs(prev => prev.map((config, index) => 
      index === sliceIndex ? { ...config, position } : config
    ));
  };

  const handleSliceVisibilityChange = (sliceIndex: number, visible: boolean) => {
    setSliceConfigs(prev => prev.map((config, index) => 
      index === sliceIndex ? { ...config, visible } : config
    ));
  };

  const handlePlayAnimation = () => {
    setAnimationConfig(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleStepFrame = (direction: 'forward' | 'backward') => {
    setAnimationConfig(prev => {
      let nextFrame = prev.currentFrame;
      if (direction === 'forward') {
        nextFrame = (prev.currentFrame + 1) % prev.totalFrames;
      } else {
        nextFrame = prev.currentFrame === 0 ? prev.totalFrames - 1 : prev.currentFrame - 1;
      }
      return { ...prev, currentFrame: nextFrame };
    });
  };

  const renderSingleSlicePanel = () => (
    <Form layout="vertical" size="small">
      {sliceConfigs.map((config, index) => {
        const directionLabel = config.direction.toUpperCase();
        const colorStyle = { color: config.color };
        
        return (
          <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}>
            <Row align="middle" justify="space-between" style={{ marginBottom: '8px' }}>
              <Col>
                <Text style={{ ...colorStyle, fontWeight: 'bold' }}>{directionLabel} 切面</Text>
              </Col>
              <Col>
                <Switch
                  checked={config.visible}
                  onChange={(checked) => handleSliceVisibilityChange(index, checked)}
                  size="small"
                />
              </Col>
            </Row>

            {config.visible && (
              <>
                <Form.Item label={<Text style={{ color: 'white' }}>位置</Text>}>
                  <Slider
                    value={config.position}
                    onChange={(value) => handleSlicePositionChange(index, value)}
                    min={0}
                    max={1}
                    step={0.01}
                    tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
                  />
                </Form.Item>

                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Form.Item label={<Text style={{ color: 'white', fontSize: '12px' }}>厚度</Text>}>
                      <InputNumber
                        value={config.thickness}
                        onChange={(value) => setSliceConfigs(prev => prev.map((c, i) => 
                          i === index ? { ...c, thickness: value || 0.01 } : c
                        ))}
                        min={0.001}
                        max={0.1}
                        step={0.001}
                        size="small"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<Text style={{ color: 'white', fontSize: '12px' }}>透明度</Text>}>
                      <Slider
                        value={config.opacity}
                        onChange={(value) => setSliceConfigs(prev => prev.map((c, i) => 
                          i === index ? { ...c, opacity: value } : c
                        ))}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Button
                  size="small"
                  type="primary"
                  icon={<ScissorOutlined />}
                  onClick={() => handleGenerateSingleSlice(index)}
                  loading={isGenerating}
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  生成 {directionLabel} 切面
                </Button>
              </>
            )}
          </div>
        );
      })}
    </Form>
  );

  const renderMultiSlicePanel = () => (
    <Form layout="vertical" size="small">
      <Form.Item label={<Text style={{ color: 'white' }}>切面方向</Text>}>
        <Select
          value={multiSliceConfig.direction}
          onChange={(value) => setMultiSliceConfig(prev => ({ ...prev, direction: value }))}
          style={{ width: '100%' }}
        >
          <Option value="x">X 方向</Option>
          <Option value="y">Y 方向</Option>
          <Option value="z">Z 方向</Option>
        </Select>
      </Form.Item>

      <Row gutter={[12, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>切面数量</Text>}>
            <InputNumber
              value={multiSliceConfig.count}
              onChange={(value) => setMultiSliceConfig(prev => ({ ...prev, count: value || 5 }))}
              min={2}
              max={20}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>间距</Text>}>
            <InputNumber
              value={multiSliceConfig.spacing}
              onChange={(value) => setMultiSliceConfig(prev => ({ ...prev, spacing: value || 0.1 }))}
              min={0.01}
              max={0.5}
              step={0.01}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>起始位置</Text>}>
            <Slider
              value={multiSliceConfig.startPosition}
              onChange={(value) => setMultiSliceConfig(prev => ({ ...prev, startPosition: value }))}
              min={0}
              max={1}
              step={0.01}
              tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>结束位置</Text>}>
            <Slider
              value={multiSliceConfig.endPosition}
              onChange={(value) => setMultiSliceConfig(prev => ({ ...prev, endPosition: value }))}
              min={0}
              max={1}
              step={0.01}
              tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Button
        type="primary"
        icon={<AppstoreOutlined />}
        onClick={handleGenerateMultiSlice}
        loading={isGenerating}
        style={{ width: '100%', marginTop: '16px' }}
      >
        生成多切面
      </Button>
    </Form>
  );

  const renderAnimationPanel = () => (
    <Form layout="vertical" size="small">
      <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
        <Col span={8}>
          <Button
            size="small"
            icon={animationConfig.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handlePlayAnimation}
            type={animationConfig.isPlaying ? "primary" : "default"}
            style={{ width: '100%' }}
          >
            {animationConfig.isPlaying ? '暂停' : '播放'}
          </Button>
        </Col>
        <Col span={8}>
          <Button
            size="small"
            icon={<BackwardOutlined />}
            onClick={() => handleStepFrame('backward')}
            style={{ width: '100%' }}
          >
            上一帧
          </Button>
        </Col>
        <Col span={8}>
          <Button
            size="small"
            icon={<StepForwardOutlined />}
            onClick={() => handleStepFrame('forward')}
            style={{ width: '100%' }}
          >
            下一帧
          </Button>
        </Col>
      </Row>

      <Form.Item label={<Text style={{ color: 'white' }}>当前帧</Text>}>
        <Slider
          value={animationConfig.currentFrame}
          onChange={(value) => setAnimationConfig(prev => ({ ...prev, currentFrame: value }))}
          min={0}
          max={animationConfig.totalFrames - 1}
          tooltip={{ formatter: (value) => `${value + 1}/${animationConfig.totalFrames}` }}
        />
      </Form.Item>

      <Row gutter={[12, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>播放速度</Text>}>
            <Slider
              value={animationConfig.speed}
              onChange={(value) => setAnimationConfig(prev => ({ ...prev, speed: value }))}
              min={0.1}
              max={5}
              step={0.1}
              tooltip={{ formatter: (value) => `${value}x` }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>播放方向</Text>}>
            <Select
              value={animationConfig.direction}
              onChange={(value) => setAnimationConfig(prev => ({ ...prev, direction: value }))}
              style={{ width: '100%' }}
              size="small"
            >
              <Option value="forward">正向</Option>
              <Option value="backward">反向</Option>
              <Option value="pingpong">往返</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={<Text style={{ color: 'white' }}>总帧数</Text>}>
        <InputNumber
          value={animationConfig.totalFrames}
          onChange={(value) => setAnimationConfig(prev => ({ ...prev, totalFrames: value || 50 }))}
          min={10}
          max={200}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </Form>
  );

  const renderSettingsPanel = () => (
    <Form layout="vertical" size="small">
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>显示边界框</Text>
          <Switch
            checked={visualSettings.showBoundingBox}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, showBoundingBox: checked }))}
            size="small"
          />
        </Col>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>显示坐标轴</Text>
          <Switch
            checked={visualSettings.showAxes}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, showAxes: checked }))}
            size="small"
          />
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>切面交线</Text>
          <Switch
            checked={visualSettings.showSliceIntersections}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, showSliceIntersections: checked }))}
            size="small"
          />
        </Col>
        <Col span={12}>
          <Text style={{ color: 'white', fontSize: '12px' }}>阴影效果</Text>
          <Switch
            checked={visualSettings.enableShadows}
            onChange={(checked) => setVisualSettings(prev => ({ ...prev, enableShadows: checked }))}
            size="small"
          />
        </Col>
      </Row>

      <Form.Item label={<Text style={{ color: 'white' }}>背景透明度</Text>}>
        <Slider
          value={visualSettings.backgroundTransparency}
          onChange={(value) => setVisualSettings(prev => ({ ...prev, backgroundTransparency: value }))}
          min={0}
          max={1}
          step={0.1}
        />
      </Form.Item>

      <Form.Item label={<Text style={{ color: 'white' }}>插值方式</Text>}>
        <Select
          value={visualSettings.sliceInterpolation}
          onChange={(value) => setVisualSettings(prev => ({ ...prev, sliceInterpolation: value }))}
          style={{ width: '100%' }}
          size="small"
        >
          <Option value="linear">线性插值</Option>
          <Option value="cubic">三次插值</Option>
          <Option value="nearest">最近邻</Option>
        </Select>
      </Form.Item>
    </Form>
  );

  return (
    <Card 
      className="slice-visualization theme-card result-card" 
      title={<Text style={{ color: 'white' }}>3D切片可视化</Text>}
      style={{ height: '100%' }}
      extra={
        <Space>
          <Tooltip title="重置设置">
            <Button 
              size="small"
              icon={<RotateLeftOutlined />} 
              onClick={() => {
                setSliceConfigs([
                  { direction: 'x', position: 0.5, thickness: 0.01, visible: true, opacity: 0.8, color: '#ff4d4f' },
                  { direction: 'y', position: 0.5, thickness: 0.01, visible: false, opacity: 0.8, color: '#52c41a' },
                  { direction: 'z', position: 0.5, thickness: 0.01, visible: false, opacity: 0.8, color: '#1890ff' }
                ]);
                setAnimationConfig({
                  isPlaying: false,
                  speed: 1,
                  direction: 'forward',
                  currentFrame: 0,
                  totalFrames: 50
                });
              }}
            />
          </Tooltip>
          <Tooltip title="保存配置">
            <Button 
              size="small"
              icon={<SaveOutlined />} 
            />
          </Tooltip>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="small">
        <TabPane tab={<span><ScissorOutlined />单切面</span>} key="single">
          {renderSingleSlicePanel()}
        </TabPane>
        <TabPane tab={<span><AppstoreOutlined />多切面</span>} key="multi">
          {renderMultiSlicePanel()}
        </TabPane>
        <TabPane tab={<span><PlayCircleOutlined />动画</span>} key="animation">
          {renderAnimationPanel()}
        </TabPane>
        <TabPane tab={<span><SettingOutlined />设置</span>} key="settings">
          {renderSettingsPanel()}
        </TabPane>
      </Tabs>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0 8px 0' }} />
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
        活跃切面: {sliceConfigs.filter(c => c.visible).length} / {sliceConfigs.length}
      </div>
    </Card>
  );
};

export default SliceVisualization;