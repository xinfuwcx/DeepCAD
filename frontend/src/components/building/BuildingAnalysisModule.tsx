/**
 * 建筑分析模块
 * 支持相邻间距、底板参数和桩参数配置
 */

import React, { useState, useCallback } from 'react';
import {
  Card, Row, Col, Button, Space, Typography, Form, Select, InputNumber, 
  Radio, Slider, Divider, Alert, Tabs
} from 'antd';
import {
  BuildOutlined, SettingOutlined, DashboardOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// 桩材料类型
type PileMaterial = 'concrete' | 'steel' | 'composite';

// 建筑分析参数接口
interface BuildingAnalysisParameters {
  // 相邻间距参数
  adjacentSpacing: {
    northDistance: number;    // 北侧距离 (m)
    southDistance: number;    // 南侧距离 (m)
    eastDistance: number;     // 东侧距离 (m)
    westDistance: number;     // 西侧距离 (m)
  };
  
  // 底板参数
  floorParameters: {
    length: number;           // 长度 (m)
    width: number;            // 宽度 (m)
    elevation: number;        // 标高 (m)
    lengthDistance: number;   // 长度距离 (m)
    widthDistance: number;    // 宽度距离 (m)
  };
  
  // 桩参数
  pileParameters: {
    margin: number;           // 边距 (m)
    count: number;            // 根数
    length: number;           // 桩长 (m)
    diameter: number;         // 桩径 (m)
    material: PileMaterial;   // 材料
  };
}

interface BuildingAnalysisModuleProps {
  onParametersChange?: (params: BuildingAnalysisParameters) => void;
  onAnalyze?: (params: BuildingAnalysisParameters) => void;
  status?: 'idle' | 'processing' | 'completed' | 'error';
}

const BuildingAnalysisModule: React.FC<BuildingAnalysisModuleProps> = ({
  onParametersChange,
  onAnalyze,
  status = 'idle'
}) => {
  const [buildingParams, setBuildingParams] = useState<BuildingAnalysisParameters>({
    adjacentSpacing: {
      northDistance: 15.0,
      southDistance: 12.0,
      eastDistance: 18.0,
      westDistance: 10.0
    },
    floorParameters: {
      length: 50.0,
      width: 30.0,
      elevation: -2.0,
      lengthDistance: 5.0,
      widthDistance: 3.0
    },
    pileParameters: {
      margin: 2.0,
      count: 24,
      length: 25.0,
      diameter: 0.8,
      material: 'concrete'
    }
  });

  const [activeTab, setActiveTab] = useState('spacing');

  // 更新参数的通用函数
  const updateParams = useCallback((newParams: Partial<BuildingAnalysisParameters>) => {
    setBuildingParams(prev => {
      const updated = { ...prev, ...newParams };
      onParametersChange?.(updated);
      return updated;
    });
  }, [onParametersChange]);

  // 处理相邻间距变化
  const handleSpacingChange = useCallback((field: string, value: number) => {
    const newSpacing = { ...buildingParams.adjacentSpacing, [field]: value };
    updateParams({ adjacentSpacing: newSpacing });
  }, [buildingParams.adjacentSpacing, updateParams]);

  // 处理底板参数变化
  const handleFloorChange = useCallback((field: string, value: number) => {
    const newFloor = { ...buildingParams.floorParameters, [field]: value };
    updateParams({ floorParameters: newFloor });
  }, [buildingParams.floorParameters, updateParams]);

  // 处理桩参数变化
  const handlePileChange = useCallback((field: string, value: any) => {
    const newPile = { ...buildingParams.pileParameters, [field]: value };
    updateParams({ pileParameters: newPile });
  }, [buildingParams.pileParameters, updateParams]);

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ flex: 'none' }}
      >
        {/* 相邻间距 */}
        <TabPane 
          tab={
            <span>
              <SettingOutlined />
              相邻间距
            </span>
          } 
          key="spacing"
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', paddingBottom: '40px' }}>
            <Form layout="vertical" size="large">
              {/* 间距配置 */}
              <Card
                title="建筑物间距"
                size="small"
                style={{ marginBottom: '16px', borderRadius: '8px' }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Form.Item
                      label="北侧距离 (m)"
                      tooltip="建筑物北侧与相邻建筑的距离"
                    >
                      <InputNumber
                        value={buildingParams.adjacentSpacing.northDistance}
                        onChange={(value) => handleSpacingChange('northDistance', value || 15.0)}
                        min={5}
                        max={100}
                        step={0.5}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="南侧距离 (m)"
                      tooltip="建筑物南侧与相邻建筑的距离"
                    >
                      <InputNumber
                        value={buildingParams.adjacentSpacing.southDistance}
                        onChange={(value) => handleSpacingChange('southDistance', value || 12.0)}
                        min={5}
                        max={100}
                        step={0.5}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="东侧距离 (m)"
                      tooltip="建筑物东侧与相邻建筑的距离"
                    >
                      <InputNumber
                        value={buildingParams.adjacentSpacing.eastDistance}
                        onChange={(value) => handleSpacingChange('eastDistance', value || 18.0)}
                        min={5}
                        max={100}
                        step={0.5}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="西侧距离 (m)"
                      tooltip="建筑物西侧与相邻建筑的距离"
                    >
                      <InputNumber
                        value={buildingParams.adjacentSpacing.westDistance}
                        onChange={(value) => handleSpacingChange('westDistance', value || 10.0)}
                        min={5}
                        max={100}
                        step={0.5}
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

        {/* 底板参数 */}
        <TabPane 
          tab={
            <span>
              <BuildOutlined />
              底板参数
            </span>
          } 
          key="floor"
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', paddingBottom: '40px' }}>
            <Form layout="vertical" size="large">
              {/* 地板尺寸 */}
              <Card
                title="地板尺寸"
                size="small"
                style={{ marginBottom: '16px', borderRadius: '8px' }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={24}>
                    <Form.Item
                      label="长度 (m)"
                      tooltip="地板的长度尺寸"
                    >
                      <InputNumber
                        value={buildingParams.floorParameters.length}
                        onChange={(value) => handleFloorChange('length', value || 50.0)}
                        min={10}
                        max={200}
                        step={1}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="宽度 (m)"
                      tooltip="地板的宽度尺寸"
                    >
                      <InputNumber
                        value={buildingParams.floorParameters.width}
                        onChange={(value) => handleFloorChange('width', value || 30.0)}
                        min={10}
                        max={100}
                        step={1}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                                     <Col span={24}>
                     <Form.Item
                       label="标高 (m)"
                       tooltip="地板相对于基准面的高程"
                     >
                       <InputNumber
                         value={buildingParams.floorParameters.elevation}
                         onChange={(value) => handleFloorChange('elevation', value || -2.0)}
                         min={-20}
                         max={10}
                         step={0.1}
                         precision={1}
                         size="large"
                         style={{ width: '100%' }}
                       />
                     </Form.Item>
                   </Col>
                   <Col span={24}>
                     <Form.Item
                       label="长度距离 (m)"
                       tooltip="底板长度方向距离基坑边界的距离"
                     >
                       <InputNumber
                         value={buildingParams.floorParameters.lengthDistance}
                         onChange={(value) => handleFloorChange('lengthDistance', value || 5.0)}
                         min={1}
                         max={20}
                         step={0.5}
                         precision={1}
                         size="large"
                         style={{ width: '100%' }}
                       />
                     </Form.Item>
                   </Col>
                   <Col span={24}>
                     <Form.Item
                       label="宽度距离 (m)"
                       tooltip="底板宽度方向距离基坑边界的距离"
                     >
                       <InputNumber
                         value={buildingParams.floorParameters.widthDistance}
                         onChange={(value) => handleFloorChange('widthDistance', value || 3.0)}
                         min={1}
                         max={15}
                         step={0.5}
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

        {/* 桩参数 */}
        <TabPane 
          tab={
            <span>
              <DashboardOutlined />
              桩参数
            </span>
          } 
          key="pile"
          style={{ flex: 1, overflow: 'hidden' }}
        >
          <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', paddingBottom: '40px' }}>
            <Form layout="vertical" size="large">
              {/* 桩基配置 */}
              <Card
                title="桩基配置"
                size="small"
                style={{ marginBottom: '16px', borderRadius: '8px' }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={24}>
                    <Form.Item
                      label="边距 (m)"
                      tooltip="桩基距离地板边缘的距离"
                    >
                      <InputNumber
                        value={buildingParams.pileParameters.margin}
                        onChange={(value) => handlePileChange('margin', value || 2.0)}
                        min={1.0}
                        max={10.0}
                        step={0.1}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="根数"
                      tooltip="桩基的总数量"
                    >
                      <InputNumber
                        value={buildingParams.pileParameters.count}
                        onChange={(value) => handlePileChange('count', value || 24)}
                        min={4}
                        max={100}
                        step={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="桩长 (m)"
                      tooltip="桩基的长度"
                    >
                      <InputNumber
                        value={buildingParams.pileParameters.length}
                        onChange={(value) => handlePileChange('length', value || 25.0)}
                        min={5}
                        max={80}
                        step={1}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="桩径 (m)"
                      tooltip="桩基的直径"
                    >
                      <InputNumber
                        value={buildingParams.pileParameters.diameter}
                        onChange={(value) => handlePileChange('diameter', value || 0.8)}
                        min={0.3}
                        max={2.0}
                        step={0.1}
                        precision={1}
                        size="large"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      label="材料"
                      tooltip="桩基材料类型"
                    >
                      <Select
                        value={buildingParams.pileParameters.material}
                        onChange={(value) => handlePileChange('material', value)}
                        size="large"
                        style={{ width: '100%' }}
                      >
                        <Option value="concrete">混凝土</Option>
                        <Option value="steel">钢材</Option>
                        <Option value="composite">复合材料</Option>
                      </Select>
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
          message="正在进行建筑分析..."
          description="请稍候，分析过程可能需要几分钟时间。"
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
      {status === 'completed' && (
        <Alert
          message="建筑分析完成"
          description="分析已成功完成，您可以查看结果。"
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
      {status === 'error' && (
        <Alert
          message="建筑分析失败"
          description="分析过程中发生错误，请检查参数设置后重试。"
          type="error"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </div>
  );
};

export default BuildingAnalysisModule;