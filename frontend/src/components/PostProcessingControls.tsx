import React from 'react';
import { Card, Select, Typography, Form, Slider, Switch, Divider, Tooltip, InputNumber, Space, Row, Col } from 'antd';
import { BgColorsOutlined, LineChartOutlined, ColumnHeightOutlined, EyeOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';

const { Option } = Select;
const { Text } = Typography;

const PostProcessingControls: React.FC = () => {
  const { 
    layers, 
    postProcessing, 
    updateLayer, 
    setLoadsScale, 
    updatePostProcessing 
  } = useSceneStore(
    useShallow(state => ({
      layers: state.layers,
      postProcessing: state.postProcessing,
      updateLayer: state.updateLayer,
      setLoadsScale: state.setLoadsScale,
      updatePostProcessing: state.updatePostProcessing,
    }))
  );
  
  const hasResults = !!layers.result.url;
  
  const handleCustomRangeValuesChange = (newRange: [number, number]) => {
    // Only update if the values have actually changed to avoid unnecessary re-renders
    if (newRange[0] !== postProcessing.customRange[0] || newRange[1] !== postProcessing.customRange[1]) {
      updatePostProcessing({ customRange: newRange });
    }
  };
  
  const resetSettings = () => {
    updatePostProcessing({
      resultType: 'displacement',
      colorMap: 'cool_to_warm',
      useCustomRange: false,
      showWireframe: false,
      showScalarBar: true,
    });
    updateLayer('constraints', { isVisible: true });
    updateLayer('loads', { isVisible: true });
    setLoadsScale(1.0);
  };

  return (
    <Card 
        title={
          <Space>
            <span>后处理控制</span>
            <Tooltip title="重置所有设置">
              <ReloadOutlined onClick={resetSettings} style={{ cursor: 'pointer' }} />
            </Tooltip>
          </Space>
        }
        headStyle={{ color: 'white', borderBottom: '1px solid #424242' }}
        style={{ 
          background: '#2c2c2c', 
          borderColor: '#424242', 
          height: '100%',
          opacity: hasResults ? 1 : 0.6,
          pointerEvents: hasResults ? 'auto' : 'none'
        }}
        bodyStyle={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}
    >
      {!hasResults ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>
          请先运行计算以获取结果
        </div>
      ) : (
        <Form layout="vertical">
          <Form.Item 
            label={<Text style={{color: 'white'}}><LineChartOutlined /> 结果类型</Text>}
          >
            <Select 
              value={postProcessing.resultType} 
              onChange={(value) => updatePostProcessing({ resultType: value })}
            >
              <Option value="displacement">位移</Option>
              <Option value="displacement_x">位移 X</Option>
              <Option value="displacement_y">位移 Y</Option>
              <Option value="displacement_z">位移 Z</Option>
              <Option value="stress_von_mises">应力 (von Mises)</Option>
              <Option value="stress_xx">应力 XX</Option>
              <Option value="stress_yy">应力 YY</Option>
              <Option value="stress_zz">应力 ZZ</Option>
              <Option value="strain">应变</Option>
              <Option value="pressure">压力</Option>
            </Select>
          </Form.Item>
          
          <Divider style={{ margin: '12px 0', borderColor: '#424242' }} />
          
          <Form.Item 
            label={<Text style={{color: 'white'}}><BgColorsOutlined /> 颜色映射</Text>}
          >
            <Select 
              value={postProcessing.colorMap} 
              onChange={(value) => updatePostProcessing({ colorMap: value })}
            >
              <Option value="cool_to_warm">冷暖色</Option>
              <Option value="rainbow">彩虹色</Option>
              <Option value="jet">Jet</Option>
              <Option value="viridis">Viridis</Option>
              <Option value="plasma">Plasma</Option>
              <Option value="inferno">Inferno</Option>
              <Option value="magma">Magma</Option>
              <Option value="grayscale">灰度</Option>
              <Option value="blue_to_red">蓝红</Option>
              <Option value="black_body_radiation">黑体辐射</Option>
            </Select>
          </Form.Item>
          
          <Form.Item 
            label={<Text style={{color: 'white'}}><ColumnHeightOutlined /> 颜色范围</Text>}
          >
            <Switch 
              style={{ marginBottom: '10px' }}
              checkedChildren="自定义" 
              unCheckedChildren="自动" 
              checked={postProcessing.useCustomRange}
              onChange={(checked) => updatePostProcessing({ useCustomRange: checked })}
            />
            
            {postProcessing.useCustomRange && (
              <>
                <Row gutter={8}>
                  <Col span={11}>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={postProcessing.customRange[0]}
                      onChange={(value) => handleCustomRangeValuesChange([value as number, postProcessing.customRange[1]])}
                    />
                  </Col>
                  <Col span={2} style={{ textAlign: 'center', color: 'white' }}>
                    -
                  </Col>
                  <Col span={11}>
                    <InputNumber
                      style={{ width: '100%' }}
                      value={postProcessing.customRange[1]}
                      onChange={(value) => handleCustomRangeValuesChange([postProcessing.customRange[0], value as number])}
                    />
                  </Col>
                </Row>
                <Slider
                  range
                  min={postProcessing.customRange[0]}
                  max={postProcessing.customRange[1]}
                  value={postProcessing.customRange}
                  onChange={(values) => handleCustomRangeValuesChange(values as [number, number])}
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </Form.Item>
          
          <Divider style={{ margin: '12px 0', borderColor: '#424242' }} />
          
          <Form.Item 
            label={<Text style={{color: 'white'}}><EyeOutlined /> 显示选项</Text>}
          >
            <Row align="middle" style={{ marginTop: 8 }}>
               <Col span={12}>
                <Text style={{color: '#ccc'}}>显示标量条</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Switch 
                  checked={postProcessing.showScalarBar} 
                  onChange={(checked) => updatePostProcessing({ showScalarBar: checked })}
                />
              </Col>
            </Row>

            <Row align="middle" style={{ marginTop: 8 }}>
              <Col span={12}>
                <Text style={{color: '#ccc'}}>显示网格线</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Switch 
                  checked={postProcessing.showWireframe} 
                  onChange={(checked) => updatePostProcessing({ showWireframe: checked })}
                />
              </Col>
            </Row>

            <Row align="middle" style={{ marginTop: 8 }}>
              <Col span={12}>
                <Text style={{color: '#ccc'}}>显示约束</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Switch 
                  checked={layers.constraints.isVisible}
                  onChange={(checked) => updateLayer('constraints', { isVisible: checked })}
                />
              </Col>
            </Row>

            <Row align="middle" style={{ marginTop: 8 }}>
              <Col span={12}>
                <Text style={{color: '#ccc'}}>显示荷载</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Switch 
                  checked={layers.loads.isVisible}
                  onChange={(checked) => updateLayer('loads', { isVisible: checked })}
                />
              </Col>
            </Row>

            <Row align="middle" style={{ marginTop: 8, opacity: layers.loads.isVisible ? 1 : 0.4 }}>
              <Col span={12}>
                <Text style={{color: '#ccc'}}>荷载缩放</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                 <Slider 
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={layers.loadsScale}
                    onChange={setLoadsScale}
                    style={{width: '100px'}}
                    disabled={!layers.loads.isVisible}
                 />
              </Col>
            </Row>
          </Form.Item>
        </Form>
      )}
    </Card>
  );
};

export default PostProcessingControls; 