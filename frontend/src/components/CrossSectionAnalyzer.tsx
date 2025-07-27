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
  Spin
} from 'antd';
import { 
  ScissorOutlined,
  LineChartOutlined,
  SaveOutlined,
  RotateLeftOutlined,
  ExportOutlined,
  DownloadOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useResultsStore } from '../stores/useResultsStore';
import { useShallow } from 'zustand/react/shallow';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface CrossSectionAnalyzerProps {
  onSectionGenerated?: (sectionData: any) => void;
}

interface PlaneConfig {
  type: 'xy' | 'xz' | 'yz' | 'custom';
  position: number;
  normal?: [number, number, number];
  origin?: [number, number, number];
}

interface CrossSectionData {
  id: string;
  name: string;
  plane: PlaneConfig;
  data: any;
  created: Date;
}

const CrossSectionAnalyzer: React.FC<CrossSectionAnalyzerProps> = ({ onSectionGenerated }) => {
  const {
    currentResult,
    contour,
    updateContourSettings
  } = useResultsStore(useShallow(state => ({
    currentResult: state.currentResult,
    contour: state.contour,
    updateContourSettings: state.updateContourSettings
  })));

  const [activeTab, setActiveTab] = useState('slice');
  const [isGenerating, setIsGenerating] = useState(false);
  const [crossSections, setCrossSections] = useState<CrossSectionData[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  
  // 切面配置
  const [planeConfig, setPlaneConfig] = useState<PlaneConfig>({
    type: 'xy',
    position: 0.5
  });

  // 分析设置
  const [analysisSettings, setAnalysisSettings] = useState({
    variable: 'displacement',
    component: 'magnitude',
    smoothing: false,
    interpolation: 'linear',
    resolution: 100
  });

  // 可视化设置
  const [visualSettings, setVisualSettings] = useState({
    showContours: true,
    showVectors: false,
    contourLevels: 10,
    colormap: 'viridis',
    opacity: 0.8
  });

  const availableVariables = [
    { label: '位移', value: 'displacement', components: ['X', 'Y', 'Z', '模长'] },
    { label: '应力', value: 'stress', components: ['XX', 'YY', 'ZZ', 'XY', 'Von Mises'] },
    { label: '应变', value: 'strain', components: ['XX', 'YY', 'ZZ', 'XY', '体积应变'] },
  ];

  const planeTypes = [
    { label: 'XY平面', value: 'xy' },
    { label: 'XZ平面', value: 'xz' },
    { label: 'YZ平面', value: 'yz' },
    { label: '自定义平面', value: 'custom' }
  ];

  const handleGenerateCrossSection = async () => {
    if (!currentResult) {
      console.warn('No current result available for cross-section analysis');
      return;
    }

    setIsGenerating(true);
    
    try {
      // 构建请求数据
      const requestData = {
        result_id: currentResult.id,
        plane_config: planeConfig,
        analysis_settings: analysisSettings,
        visual_settings: visualSettings
      };

      // 调用后端API生成剖面
      const response = await fetch('/api/visualization/cross-section/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate cross section: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 创建新的剖面记录
      const newSection: CrossSectionData = {
        id: `section_${Date.now()}`,
        name: `${planeConfig.type.toUpperCase()}切面 - ${analysisSettings.variable}`,
        plane: { ...planeConfig },
        data: result.section_data,
        created: new Date()
      };

      setCrossSections(prev => [...prev, newSection]);
      setSelectedSection(newSection.id);
      
      if (onSectionGenerated) {
        onSectionGenerated(result);
      }

      console.log('Cross section generated successfully:', newSection);
      
    } catch (error) {
      console.error('Failed to generate cross section:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportSection = async (sectionId: string) => {
    const section = crossSections.find(s => s.id === sectionId);
    if (!section) return;

    try {
      const response = await fetch('/api/visualization/cross-section/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section_id: sectionId,
          format: 'svg'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${section.name}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export section:', error);
    }
  };

  const renderSlicePanel = () => (
    <Form layout="vertical" size="small">
      <Row gutter={[12, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>切面类型</Text>}>
            <Select
              value={planeConfig.type}
              onChange={(value) => setPlaneConfig(prev => ({ ...prev, type: value }))}
              style={{ width: '100%' }}
            >
              {planeTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>位置</Text>}>
            <Slider
              value={planeConfig.position}
              onChange={(value) => setPlaneConfig(prev => ({ ...prev, position: value }))}
              min={0}
              max={1}
              step={0.01}
              tooltip={{ formatter: (value) => `${(value * 100).toFixed(0)}%` }}
            />
          </Form.Item>
        </Col>
      </Row>

      {planeConfig.type === 'custom' && (
        <Row gutter={[8, 8]}>
          <Col span={24}>
            <Text style={{ color: 'white', fontSize: '12px' }}>法向量 (X, Y, Z)</Text>
            <Row gutter={4}>
              <Col span={8}>
                <InputNumber 
                  size="small" 
                  placeholder="X"
                  style={{ width: '100%' }}
                  value={planeConfig.normal?.[0] || 0}
                  onChange={(value) => setPlaneConfig(prev => ({
                    ...prev,
                    normal: [value || 0, prev.normal?.[1] || 0, prev.normal?.[2] || 1]
                  }))}
                />
              </Col>
              <Col span={8}>
                <InputNumber 
                  size="small" 
                  placeholder="Y"
                  style={{ width: '100%' }}
                  value={planeConfig.normal?.[1] || 0}
                  onChange={(value) => setPlaneConfig(prev => ({
                    ...prev,
                    normal: [prev.normal?.[0] || 0, value || 0, prev.normal?.[2] || 1]
                  }))}
                />
              </Col>
              <Col span={8}>
                <InputNumber 
                  size="small" 
                  placeholder="Z"
                  style={{ width: '100%' }}
                  value={planeConfig.normal?.[2] || 1}
                  onChange={(value) => setPlaneConfig(prev => ({
                    ...prev,
                    normal: [prev.normal?.[0] || 0, prev.normal?.[1] || 0, value || 1]
                  }))}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      )}

      <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '12px 0' }} />

      <Row gutter={[12, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>分析变量</Text>}>
            <Select
              value={analysisSettings.variable}
              onChange={(value) => setAnalysisSettings(prev => ({ ...prev, variable: value }))}
              style={{ width: '100%' }}
            >
              {availableVariables.map(v => (
                <Option key={v.value} value={v.value}>{v.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>分量</Text>}>
            <Select
              value={analysisSettings.component}
              onChange={(value) => setAnalysisSettings(prev => ({ ...prev, component: value }))}
              style={{ width: '100%' }}
            >
              {availableVariables
                .find(v => v.value === analysisSettings.variable)?.components
                .map(c => (
                  <Option key={c} value={c.toLowerCase().replace(/\s+/g, '_')}>
                    {c}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 8]}>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>分辨率</Text>}>
            <InputNumber
              value={analysisSettings.resolution}
              onChange={(value) => setAnalysisSettings(prev => ({ ...prev, resolution: value || 100 }))}
              min={50}
              max={500}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text style={{ color: 'white' }}>平滑</Text>}>
            <Switch
              checked={analysisSettings.smoothing}
              onChange={(checked) => setAnalysisSettings(prev => ({ ...prev, smoothing: checked }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Button
            type="primary"
            icon={<ScissorOutlined />}
            onClick={handleGenerateCrossSection}
            loading={isGenerating}
            disabled={!currentResult}
            style={{ width: '100%' }}
          >
            {isGenerating ? '生成中...' : '生成剖面'}
          </Button>
        </Col>
      </Row>
    </Form>
  );

  const renderAnalysisPanel = () => (
    <div>
      {crossSections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
            请先生成剖面数据
          </Text>
        </div>
      ) : (
        <Form layout="vertical" size="small">
          <Form.Item label={<Text style={{ color: 'white' }}>选择剖面</Text>}>
            <Select
              value={selectedSection}
              onChange={setSelectedSection}
              style={{ width: '100%' }}
              placeholder="选择要分析的剖面"
            >
              {crossSections.map(section => (
                <Option key={section.id} value={section.id}>
                  {section.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedSection && (
            <>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Button
                    size="small"
                    icon={<LineChartOutlined />}
                    style={{ width: '100%' }}
                  >
                    曲线图
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    size="small"
                    icon={<ExportOutlined />}
                    onClick={() => handleExportSection(selectedSection)}
                    style={{ width: '100%' }}
                  >
                    导出
                  </Button>
                </Col>
              </Row>

              <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '12px 0' }} />

              <Form.Item label={<Text style={{ color: 'white' }}>等值线数量</Text>}>
                <Slider
                  value={visualSettings.contourLevels}
                  onChange={(value) => setVisualSettings(prev => ({ ...prev, contourLevels: value }))}
                  min={5}
                  max={50}
                  step={1}
                />
              </Form.Item>

              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text style={{ color: 'white', fontSize: '12px' }}>显示等值线</Text>
                  <Switch
                    checked={visualSettings.showContours}
                    onChange={(checked) => setVisualSettings(prev => ({ ...prev, showContours: checked }))}
                    size="small"
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ color: 'white', fontSize: '12px' }}>显示矢量</Text>
                  <Switch
                    checked={visualSettings.showVectors}
                    onChange={(checked) => setVisualSettings(prev => ({ ...prev, showVectors: checked }))}
                    size="small"
                  />
                </Col>
              </Row>
            </>
          )}
        </Form>
      )}
    </div>
  );

  return (
    <Card 
      className="cross-section-analyzer theme-card result-card" 
      title={<Text style={{ color: 'white' }}>剖面分析工具</Text>}
      style={{ height: '100%' }}
      extra={
        <Space>
          <Tooltip title="重置设置">
            <Button 
              size="small"
              icon={<RotateLeftOutlined />} 
              onClick={() => {
                setPlaneConfig({ type: 'xy', position: 0.5 });
                setAnalysisSettings({
                  variable: 'displacement',
                  component: 'magnitude',
                  smoothing: false,
                  interpolation: 'linear',
                  resolution: 100
                });
              }}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button 
              size="small"
              icon={<SettingOutlined />} 
            />
          </Tooltip>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="small">
        <TabPane tab={<span><ScissorOutlined />切面</span>} key="slice">
          {renderSlicePanel()}
        </TabPane>
        <TabPane tab={<span><LineChartOutlined />分析</span>} key="analysis">
          {renderAnalysisPanel()}
        </TabPane>
      </Tabs>

      {crossSections.length > 0 && (
        <>
          <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0 8px 0' }} />
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            已生成 {crossSections.length} 个剖面
          </div>
        </>
      )}
    </Card>
  );
};

export default CrossSectionAnalyzer;