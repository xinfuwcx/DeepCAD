/**
 * 隧道建模模块
 * 支持隧道衬砌参数配置和截面类型选择
 */

import React, { useState, useCallback } from 'react';
import {
  Card, Row, Col, Button, Space, Typography, Form, Select, InputNumber, 
  Radio, Slider, Divider, Alert, Tabs
} from 'antd';
import {
  SettingOutlined, EyeOutlined, 
  CheckCircleOutlined, BuildOutlined, DashboardOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// 隧道截面类型
type TunnelCrossSection = 'circular' | 'horseshoe' | 'rectangular';

// 衬砌材料类型
type LiningMaterial = 'concrete' | 'steel' | 'composite' | 'shotcrete';

// 混凝土等级
type ConcreteGrade = 'C20' | 'C25' | 'C30' | 'C35' | 'C40' | 'C45' | 'C50' | 'C55' | 'C60';

// 钢结构等级
type SteelGrade = 'Q235' | 'Q345' | 'Q390' | 'Q420' | 'Q460' | 'S355' | 'S420' | 'S460';

// 隧道参数接口
interface TunnelParameters {
  // 截面参数
  crossSection: {
    type: TunnelCrossSection;
    dimensions: {
      diameter?: number;        // 圆形直径
      width?: number;          // 矩形宽度 / 马蹄形宽度
      height?: number;         // 矩形高度 / 马蹄形高度
      archRadius?: number;     // 马蹄形拱部半径
    };
  };
  
  // 衬砌参数
  lining: {
    material: LiningMaterial;
    materialGrade?: ConcreteGrade | SteelGrade | string; // 材料等级
    thickness: number;
  };
  
  // 隧道基本参数
  tunnel: {
    depth: number;           // 埋深 (m)
    gradient: number;        // 纵坡 (%)
    lateralSlope: number;    // 横向坡度 (%)
    margin: number;          // 边距 (m)
  };
}

interface TunnelModelingModuleProps {
  onParametersChange?: (params: TunnelParameters) => void;
  onGenerate?: (params: TunnelParameters) => void;
  status?: 'idle' | 'processing' | 'completed' | 'error';
}

const TunnelModelingModule: React.FC<TunnelModelingModuleProps> = ({
  onParametersChange,
  onGenerate,
  status = 'idle'
}) => {
  const [tunnelParams, setTunnelParams] = useState<TunnelParameters>({
    crossSection: {
      type: 'circular',
      dimensions: {
        diameter: 6.0
      }
    },
    lining: {
      material: 'concrete',
      materialGrade: 'C30',
      thickness: 0.3,
      reinforcement: {
        enabled: true,
        steelGrade: 'HRB400',
        spacing: 0.2
      }
    },
    tunnel: {
      depth: 20,
      gradient: 2.0,
      lateralSlope: 0.0,
      margin: 1.0
    }
  });

  const [activeTab, setActiveTab] = useState('cross-section');

  // 更新参数的通用函数
  const updateParams = useCallback((newParams: Partial<TunnelParameters>) => {
    setTunnelParams(prev => {
      const updated = { ...prev, ...newParams };
      onParametersChange?.(updated);
      return updated;
    });
  }, [onParametersChange]);

  // 处理截面类型变化
  const handleCrossSectionChange = useCallback((type: TunnelCrossSection) => {
    const newDimensions = (() => {
      switch (type) {
        case 'circular':
          return { diameter: 6.0 };
        case 'horseshoe':
          return { width: 7.0, height: 6.5, archRadius: 3.5 };
        case 'rectangular':
          return { width: 8.0, height: 6.0 };
        default:
          return {};
      }
    })();

    updateParams({
      crossSection: {
        type,
        dimensions: newDimensions
      }
    });
  }, [updateParams]);

  // 处理衬砌参数变化
  const handleLiningChange = useCallback((field: string, value: any) => {
    const newLining = { ...tunnelParams.lining };
    
    if (field === 'material') {
      newLining.material = value;
      // 根据材料类型重置等级
      if (value === 'concrete') {
        newLining.materialGrade = 'C30';
      } else if (value === 'steel') {
        newLining.materialGrade = 'Q345';
      } else {
        newLining.materialGrade = undefined;
      }
    } else if (field === 'materialGrade') {
      newLining.materialGrade = value;
    } else if (field === 'thickness') {
      newLining.thickness = value;
    } else if (field.startsWith('reinforcement.')) {
      const reinforcementField = field.split('.')[1];
      newLining.reinforcement = {
        ...newLining.reinforcement!,
        [reinforcementField]: value
      };
    }

    updateParams({ lining: newLining });
  }, [tunnelParams.lining, updateParams]);

  // 获取材料等级选项
  const getMaterialGradeOptions = useCallback(() => {
    switch (tunnelParams.lining.material) {
      case 'concrete':
        return [
          { value: 'C20', label: 'C20 - 普通混凝土' },
          { value: 'C25', label: 'C25 - 普通混凝土' },
          { value: 'C30', label: 'C30 - 常用混凝土' },
          { value: 'C35', label: 'C35 - 高强混凝土' },
          { value: 'C40', label: 'C40 - 高强混凝土' },
          { value: 'C45', label: 'C45 - 超高强混凝土' },
          { value: 'C50', label: 'C50 - 超高强混凝土' },
          { value: 'C55', label: 'C55 - 特高强混凝土' },
          { value: 'C60', label: 'C60 - 特高强混凝土' }
        ];
      case 'steel':
        return [
          { value: 'Q235', label: 'Q235 - 普通碳素钢' },
          { value: 'Q345', label: 'Q345 - 低合金高强度钢' },
          { value: 'Q390', label: 'Q390 - 低合金高强度钢' },
          { value: 'Q420', label: 'Q420 - 低合金高强度钢' },
          { value: 'Q460', label: 'Q460 - 低合金高强度钢' },
          { value: 'S355', label: 'S355 - 欧标结构钢' },
          { value: 'S420', label: 'S420 - 欧标高强钢' },
          { value: 'S460', label: 'S460 - 欧标高强钢' }
        ];
      case 'composite':
        return [
          { value: 'FRP-I', label: 'FRP-I 级复合材料' },
          { value: 'FRP-II', label: 'FRP-II 级复合材料' },
          { value: 'GFRP', label: 'GFRP 玻璃纤维复合材料' },
          { value: 'CFRP', label: 'CFRP 碳纤维复合材料' }
        ];
      case 'shotcrete':
        return [
          { value: 'SC-20', label: 'SC-20 喷射混凝土' },
          { value: 'SC-25', label: 'SC-25 喷射混凝土' },
          { value: 'SC-30', label: 'SC-30 喷射混凝土' },
          { value: 'SC-35', label: 'SC-35 高强喷射混凝土' }
        ];
      default:
        return [];
    }
  }, [tunnelParams.lining.material]);

  // 处理隧道参数变化
  const handleTunnelChange = useCallback((field: string, value: any) => {
    const newTunnel = { ...tunnelParams.tunnel, [field]: value };
    updateParams({ tunnel: newTunnel });
  }, [tunnelParams.tunnel, updateParams]);



  // 获取截面参数输入组件
  const renderDimensionInputs = () => {
    const { type, dimensions } = tunnelParams.crossSection;
    
    switch (type) {
      case 'circular':
        return (
          <Col span={24}>
            <Form.Item
              label="直径 (m)"
              tooltip="隧道圆形截面的直径"
            >
              <InputNumber
                value={dimensions.diameter}
                onChange={(value) => updateParams({
                  crossSection: {
                    ...tunnelParams.crossSection,
                    dimensions: { diameter: value || 6.0 }
                  }
                })}
                min={3}
                max={20}
                step={0.1}
                precision={1}
                size="large"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        );
      case 'horseshoe':
        return (
          <>
            {/* 宽度 - 第一行 */}
            <Col span={24}>
              <Form.Item
                label="宽度 (m)"
                tooltip="马蹄形截面的底部宽度"
                style={{ marginBottom: '12px' }}
              >
                <InputNumber
                  value={dimensions.width}
                  onChange={(value) => updateParams({
                    crossSection: {
                      ...tunnelParams.crossSection,
                      dimensions: { ...dimensions, width: value || 7.0 }
                    }
                  })}
                  min={4}
                  max={15}
                  step={0.1}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            {/* 高度 - 第二行 */}
            <Col span={24}>
              <Form.Item
                label="高度 (m)"
                tooltip="马蹄形截面的总高度"
                style={{ marginBottom: '12px' }}
              >
                <InputNumber
                  value={dimensions.height}
                  onChange={(value) => updateParams({
                    crossSection: {
                      ...tunnelParams.crossSection,
                      dimensions: { ...dimensions, height: value || 6.5 }
                    }
                  })}
                  min={3}
                  max={12}
                  step={0.1}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            {/* 拱半径 - 第三行 */}
            <Col span={24}>
              <Form.Item
                label="拱半径 (m)"
                tooltip="马蹄形拱部的半径"
              >
                <InputNumber
                  value={dimensions.archRadius}
                  onChange={(value) => updateParams({
                    crossSection: {
                      ...tunnelParams.crossSection,
                      dimensions: { ...dimensions, archRadius: value || 3.5 }
                    }
                  })}
                  min={2}
                  max={8}
                  step={0.1}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </>
        );
      case 'rectangular':
        return (
          <>
            <Col span={12}>
              <Form.Item
                label="宽度 (m)"
                tooltip="矩形截面的宽度"
              >
                <InputNumber
                  value={dimensions.width}
                  onChange={(value) => updateParams({
                    crossSection: {
                      ...tunnelParams.crossSection,
                      dimensions: { ...dimensions, width: value || 8.0 }
                    }
                  })}
                  min={3}
                  max={20}
                  step={0.1}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="高度 (m)"
                tooltip="矩形截面的高度"
              >
                <InputNumber
                  value={dimensions.height}
                  onChange={(value) => updateParams({
                    crossSection: {
                      ...tunnelParams.crossSection,
                      dimensions: { ...dimensions, height: value || 6.0 }
                    }
                  })}
                  min={2}
                  max={15}
                  step={0.1}
                  precision={1}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ flex: 'none' }}
      >
        {/* 截面设计 */}
        <TabPane 
          tab={
            <span>
              <BuildOutlined />
              截面设计
            </span>
          } 
          key="cross-section"
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', paddingBottom: '40px' }}>
            <Form layout="vertical" size="large">
              {/* 截面类型选择 */}
              <Card
                title="截面类型"
                size="small"
                style={{ marginBottom: '16px', borderRadius: '8px' }}
              >
                <Radio.Group
                  value={tunnelParams.crossSection.type}
                  onChange={(e) => handleCrossSectionChange(e.target.value)}
                  style={{ width: '100%', display: 'flex' }}
                >
                  <Radio.Button 
                    value="circular"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      fontSize: '13px'
                    }}
                  >
                    圆形
                  </Radio.Button>
                  <Radio.Button 
                    value="horseshoe"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      fontSize: '13px'
                    }}
                  >
                    马蹄形
                  </Radio.Button>
                  <Radio.Button 
                    value="rectangular"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      fontSize: '13px'
                    }}
                  >
                    矩形
                  </Radio.Button>
                </Radio.Group>
              </Card>

              {/* 截面尺寸 */}
              <Card
                title="截面尺寸"
                size="small"
                style={{ marginBottom: '16px', borderRadius: '8px' }}
              >
                <Row gutter={[16, 8]}>
                  {renderDimensionInputs()}
                </Row>
              </Card>
            </Form>
          </div>
        </TabPane>

        {/* 衬砌设计 */}
        <TabPane 
          tab={
            <span>
              <SettingOutlined />
              衬砌设计
            </span>
          } 
          key="lining"
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', paddingBottom: '40px' }}>
            <Form layout="vertical" size="large">
              {/* 衬砌材料 */}
              <Card
                title="衬砌材料"
                size="small"
                style={{ marginBottom: '16px', borderRadius: '8px' }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={24}>
                    <Form.Item
                      label="衬砌材料"
                      tooltip="选择隧道衬砌的主要材料类型"
                    >
                      <Select
                        value={tunnelParams.lining.material}
                        onChange={(value) => handleLiningChange('material', value)}
                        size="large"
                        style={{ width: '100%' }}
                      >
                        <Option value="concrete">混凝土</Option>
                        <Option value="steel">钢结构</Option>
                        <Option value="composite">复合材料</Option>
                        <Option value="shotcrete">喷射混凝土</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="材料等级"
                      tooltip="选择材料的强度等级"
                    >
                      <Select
                        value={tunnelParams.lining.materialGrade}
                        onChange={(value) => handleLiningChange('materialGrade', value)}
                        size="large"
                        style={{ width: '100%' }}
                        placeholder="请选择材料等级"
                      >
                        {getMaterialGradeOptions().map(option => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="衬砌厚度 (m)"
                      tooltip="隧道衬砌的厚度，影响结构强度和成本"
                    >
                      <InputNumber
                        value={tunnelParams.lining.thickness}
                        onChange={(value) => handleLiningChange('thickness', value || 0.3)}
                        min={0.1}
                        max={2.0}
                        step={0.05}
                        precision={2}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>


            </Form>
          </div>
        </TabPane>

        {/* 隧道参数 */}
        <TabPane 
          tab={
            <span>
              <DashboardOutlined />
              隧道参数
            </span>
          } 
          key="tunnel-params"
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', paddingBottom: '40px' }}>
            <Form layout="vertical" size="large">
              {/* 基本参数 */}
              <Card
                title="基本参数"
                size="small"
                style={{ marginBottom: '16px', borderRadius: '8px' }}
              >
                <Row gutter={[16, 8]}>

                  <Col span={24}>
                    <Form.Item
                      label="埋深 (m)"
                      tooltip="隧道顶部距离地表的深度"
                    >
                      <InputNumber
                        value={tunnelParams.tunnel.depth}
                        onChange={(value) => handleTunnelChange('depth', value || 20)}
                        min={5}
                        max={200}
                        step={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                        label="边距 (m)"
                        tooltip="隧道边缘到开挖边界的距离"
                    >
                      <InputNumber
                          value={tunnelParams.tunnel.margin}
                          onChange={(value) => handleTunnelChange('margin', value || 1.0)}
                          min={0.5}
                          max={5.0}
                          step={0.1}
                          precision={1}
                          size="large"
                          style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="纵坡 (%)"
                      tooltip="隧道轴线在纵向的坡度"
                    >
                      <InputNumber
                        value={tunnelParams.tunnel.gradient}
                        onChange={(value) => handleTunnelChange('gradient', value || 2.0)}
                        min={-5}
                        max={5}
                        step={0.1}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="横向坡度 (%)"
                      tooltip="隧道横断面的坡度"
                    >
                      <InputNumber
                        value={tunnelParams.tunnel.lateralSlope}
                        onChange={(value) => handleTunnelChange('lateralSlope', value || 0.0)}
                        min={-3}
                        max={3}
                        step={0.1}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>

                </Row>
              </Card>






            </Form>
          </div>
        </TabPane>


      </Tabs>

      {/* 状态提示 */}
      {status === 'processing' && (
        <Alert
          message="正在生成隧道模型..."
          description="请稍候，模型生成过程可能需要几分钟时间。"
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
      {status === 'completed' && (
        <Alert
          message="隧道模型生成完成"
          description="模型已成功生成，您可以在3D视图中查看结果。"
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
      {status === 'error' && (
        <Alert
          message="隧道建模失败"
          description="建模过程中发生错误，请检查参数设置后重试。"
          type="error"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </div>
  );
};

export default TunnelModelingModule;