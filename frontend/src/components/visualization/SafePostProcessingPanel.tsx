import React, { useState } from 'react';
import {
  Card,
  Select,
  Slider,
  Switch,
  Button,
  Radio,
  InputNumber,
  Tabs,
  Row,
  Col,
  Space,
  Alert,
  Typography,
  Divider,
  Tag
} from 'antd';
import {
  ThunderboltOutlined,
  EyeOutlined,
  SettingOutlined,
  BgColorsOutlined,
  LineChartOutlined,
  HeatMapOutlined,
  CompressOutlined,
  ReloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

interface SafePostProcessingPanelProps {
  className?: string;
  sessionId?: string;
  onFieldChange?: (field: string) => void;
  onDeformationChange?: (show: boolean, scale: number) => void;
}

export const SafePostProcessingPanel: React.FC<SafePostProcessingPanelProps> = ({
  className,
  sessionId,
  onFieldChange,
  onDeformationChange
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<string>('structural');
  const [currentField, setCurrentField] = useState<string>('von_mises_stress');
  
  // 可视化设置
  const [colormap, setColormap] = useState<string>('viridis');
  const [showDeformation, setShowDeformation] = useState<boolean>(true);
  const [deformationScale, setDeformationScale] = useState<number>(1.0);
  const [dataRange, setDataRange] = useState<[number, number]>([0, 100]);
  const [opacity, setOpacity] = useState<number>(1.0);

  // 模拟数据
  const mockFields = [
    { name: 'von_mises_stress', display_name: '冯·米塞斯应力', unit: 'Pa' },
    { name: 'displacement', display_name: '位移', unit: 'm' },
    { name: 'principal_stress_1', display_name: '第一主应力', unit: 'Pa' },
    { name: 'shear_strain', display_name: '剪应变', unit: '-' },
    { name: 'pore_pressure', display_name: '孔隙水压力', unit: 'Pa' }
  ];

  const mockColormaps = [
    { name: 'viridis', display_name: 'Viridis' },
    { name: 'plasma', display_name: 'Plasma' },
    { name: 'jet', display_name: 'Jet' },
    { name: 'coolwarm', display_name: 'CoolWarm' },
    { name: 'rainbow', display_name: 'Rainbow' }
  ];

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <div className={className}>
      <Tabs defaultActiveKey="field-selection" size="small">
        <TabPane 
          tab={
            <span>
              <ThunderboltOutlined />
              场变量选择
            </span>
          } 
          key="field-selection"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong style={{ color: '#00d9ff' }}>分析类型</Text>
              <Select
                value={analysisType}
                onChange={setAnalysisType}
                style={{ width: '100%', marginTop: 8 }}
                size="small"
              >
                <Option value="structural">结构分析</Option>
                <Option value="seepage">渗流分析</Option>
                <Option value="thermal">热传导分析</Option>
                <Option value="dynamic">动力分析</Option>
              </Select>
            </div>

            <div>
              <Text strong style={{ color: '#00d9ff' }}>场变量</Text>
              <Select
                value={currentField}
                onChange={(value) => {
                  setCurrentField(value);
                  onFieldChange?.(value);
                }}
                style={{ width: '100%', marginTop: 8 }}
                size="small"
              >
                {mockFields.map(field => (
                  <Option key={field.name} value={field.name}>
                    {field.display_name} ({field.unit})
                  </Option>
                ))}
              </Select>
            </div>

            <Alert
              message="场变量信息"
              description={`当前选择: ${mockFields.find(f => f.name === currentField)?.display_name || '未知'}`}
              type="info"
              showIcon
              size="small"
            />
          </Space>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <BgColorsOutlined />
              颜色映射
            </span>
          } 
          key="colormap"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text strong style={{ color: '#00d9ff' }}>颜色映射方案</Text>
              <Select
                value={colormap}
                onChange={setColormap}
                style={{ width: '100%', marginTop: 8 }}
                size="small"
              >
                {mockColormaps.map(cm => (
                  <Option key={cm.name} value={cm.name}>
                    {cm.display_name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong style={{ color: '#00d9ff' }}>数据范围</Text>
              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <InputNumber
                    placeholder="最小值"
                    value={dataRange[0]}
                    onChange={(val) => setDataRange([val || 0, dataRange[1]])}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={12}>
                  <InputNumber
                    placeholder="最大值"
                    value={dataRange[1]}
                    onChange={(val) => setDataRange([dataRange[0], val || 100])}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </div>

            <div>
              <Text strong style={{ color: '#00d9ff' }}>透明度: {opacity.toFixed(2)}</Text>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={opacity}
                onChange={setOpacity}
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <CompressOutlined />
              变形显示
            </span>
          } 
          key="deformation"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ color: '#00d9ff' }}>显示变形</Text>
              <Switch
                checked={showDeformation}
                onChange={(checked) => {
                  setShowDeformation(checked);
                  onDeformationChange?.(checked, deformationScale);
                }}
              />
            </div>

            {showDeformation && (
              <div>
                <Text strong style={{ color: '#00d9ff' }}>变形缩放: {deformationScale.toFixed(1)}x</Text>
                <Slider
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={deformationScale}
                  onChange={(value) => {
                    setDeformationScale(value);
                    onDeformationChange?.(showDeformation, value);
                  }}
                  style={{ marginTop: 8 }}
                />
              </div>
            )}

            <Alert
              message="变形设置"
              description={showDeformation ? `变形缩放: ${deformationScale}倍` : '变形显示已关闭'}
              type={showDeformation ? 'success' : 'warning'}
              showIcon
              size="small"
            />
          </Space>
        </TabPane>
      </Tabs>

      <Divider style={{ margin: '16px 0' }} />

      <Button
        type="primary"
        icon={<PlayCircleOutlined />}
        loading={loading}
        onClick={handleGenerate}
        style={{ width: '100%' }}
      >
        {loading ? '生成中...' : '生成可视化'}
      </Button>
    </div>
  );
};

export default SafePostProcessingPanel;