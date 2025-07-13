import React from 'react';
import { 
  Card, 
  Typography, 
  Tabs, 
  Select, 
  Slider, 
  Switch, 
  Button, 
  Row, 
  Col, 
  Divider, 
  Space,
  InputNumber,
  Collapse,
  Badge,
  Form,
  Tooltip
} from 'antd';
import { 
  BarChartOutlined, 
  PlayCircleOutlined, 
  PauseCircleOutlined,
  StepForwardOutlined,
  ReloadOutlined,
  ScissorOutlined,
  SettingOutlined,
  SaveOutlined,
  CameraOutlined,
  VideoCameraOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  FilePdfOutlined // 引入新图标
} from '@ant-design/icons';
import { useResultsStore } from '../stores/useResultsStore';
import { useShallow } from 'zustand/react/shallow';

const { Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface PostProcessingControlsProps {
  onGenerateReport: () => void;
}

const PostProcessingControls: React.FC<PostProcessingControlsProps> = ({ onGenerateReport }) => {
  const {
    currentResult, // 获取当前结果
    contour,
    animation,
    updateContourSettings,
    updateAnimationSettings,
    fetchVisualizationData, // 获取action
    resetVisualization
  } = useResultsStore(useShallow(state => ({
    currentResult: state.currentResult,
    contour: state.contour,
    animation: state.animation,
    updateContourSettings: state.updateContourSettings,
    updateAnimationSettings: state.updateAnimationSettings,
    fetchVisualizationData: state.fetchVisualizationData,
    resetVisualization: state.resetVisualization,
  })));

  const [activeTab, setActiveTab] = React.useState('contour');
  
    // Available result variables and colormaps
  const availableVariables = [
    { label: '位移', value: 'displacement', components: ['X', 'Y', 'Z', 'Magnitude'] },
    { label: '应力', value: 'stress', components: ['XX', 'YY', 'ZZ', 'XY', 'Von Mises'] },
    { label: '应变', value: 'strain', components: ['XX', 'YY', 'ZZ', 'XY', 'Volumetric'] },
  ];

  const colormapOptions = [
    { label: '彩虹', value: 'rainbow' },
    { label: '热图', value: 'hot' },
    { label: '冷图', value: 'cool' },
  ];

  const renderContourPanel = () => (
    <Form layout="vertical" size="small">
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>变量</Text>}>
            <Select
              value={contour.variable}
              onChange={(value) => {
                if (currentResult) {
                  // 当变量改变时，调用action获取新的可视化数据
                  fetchVisualizationData(currentResult.id, value);
                }
                // 同时更新设置
                updateContourSettings({ variable: value });
              }}
              style={{ width: '100%' }}
            >
              {availableVariables.map(v => <Option key={v.value} value={v.value}>{v.label}</Option>)}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>分量</Text>}>
            <Select
              value={contour.component}
              onChange={(value) => updateContourSettings({ component: value })}
              style={{ width: '100%' }}
            >
              {availableVariables.find(v => v.value === contour.variable)?.components.map(c => <Option key={c} value={c.toLowerCase()}>{c}</Option>)}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label={<Text style={{ color: 'white' }}>透明度</Text>}>
        <Slider
          value={contour.opacity}
          onChange={(value) => updateContourSettings({ opacity: value })}
          min={0} max={1} step={0.1}
        />
      </Form.Item>
    </Form>
  );

  const renderAnimationPanel = () => (
    <Form layout="vertical" size="small">
      <Form.Item label={<Text style={{ color: 'white' }}>时间步</Text>}>
        <Slider
          value={animation.currentTimeStep}
          onChange={(value) => updateAnimationSettings({ currentTimeStep: value })}
          max={animation.maxTimeSteps - 1}
        />
      </Form.Item>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <Button
          type="primary"
          icon={animation.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={() => updateAnimationSettings({ isPlaying: !animation.isPlaying })}
        >
          {animation.isPlaying ? '暂停' : '播放'}
        </Button>
      </div>
    </Form>
  );

  return (
    <Card 
      className="postprocessing-card theme-card result-card" 
      title={<Text style={{ color: 'white' }}>高级后处理</Text>}
      style={{ height: '100%' }}
      extra={
        <Tooltip title="生成PDF分析报告">
          <Button 
            icon={<FilePdfOutlined />} 
            onClick={onGenerateReport}
            type="primary"
            ghost
          />
        </Tooltip>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="small">
        <TabPane tab={<span><DashboardOutlined />云图</span>} key="contour">
          {renderContourPanel()}
        </TabPane>
        <TabPane tab={<span><PlayCircleOutlined />动画</span>} key="animation">
          {renderAnimationPanel()}
        </TabPane>
      </Tabs>
      <Divider style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
      <Button size="small" icon={<ReloadOutlined />} onClick={resetVisualization}>
        重置设置
      </Button>
    </Card>
  );
};

export default PostProcessingControls;