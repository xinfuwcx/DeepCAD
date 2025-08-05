/**
 * 基坑开挖模块
 * 支持轮廓导入和开挖参数配置
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Card, Row, Col, Button, Typography, Form, InputNumber, Select, 
  Alert, Slider
} from 'antd';
import {
  FileTextOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 开挖参数接口
interface ExcavationParameters {
  // 轮廓导入
  contourImport: {
    fileName: string | null;
    fileData: any | null;
    rotationAngle: number; // 旋转角度 (度)
  };
  
  // 开挖参数
  excavationParams: {
    depth: number;           // 开挖深度 (m)
    layerDepth: number;      // 分层深度 (m)
    layerCount: number;      // 开挖层数
    stressReleaseCoefficient: number; // 应力释放系数
  };
  

}

interface ExcavationModuleProps {
  onParametersChange?: (params: ExcavationParameters) => void;
  onGenerate?: (params: ExcavationParameters) => void;
  status?: 'idle' | 'processing' | 'completed' | 'error';
  disabled?: boolean;
}

const ExcavationModule: React.FC<ExcavationModuleProps> = ({
  onParametersChange,
  onGenerate,
  status = 'idle',
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [excavationParams, setExcavationParams] = useState<ExcavationParameters>({
    contourImport: {
      fileName: null,
      fileData: null,
      rotationAngle: 0
    },
    excavationParams: {
      depth: 10.0,
      layerDepth: 2.0,
      layerCount: 5,
      stressReleaseCoefficient: 0.7
    }
  });



  // 更新参数的通用函数
  const updateParams = useCallback((newParams: Partial<ExcavationParameters>) => {
    setExcavationParams(prev => {
      const updated = { ...prev, ...newParams };
      onParametersChange?.(updated);
      return updated;
    });
  }, [onParametersChange]);

  // 处理轮廓导入变化
  const handleContourChange = useCallback((field: string, value: any) => {
    const newContour = { ...excavationParams.contourImport, [field]: value };
    updateParams({ contourImport: newContour });
  }, [excavationParams.contourImport, updateParams]);

  // 处理开挖参数变化
  const handleExcavationChange = useCallback((field: string, value: any) => {
    const newExcavation = { ...excavationParams.excavationParams, [field]: value };
    updateParams({ excavationParams: newExcavation });
  }, [excavationParams.excavationParams, updateParams]);



  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    handleContourChange('fileName', file.name);
    handleContourChange('fileData', file);
    console.log('选择的文件:', file.name);
  }, [handleContourChange]);

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', paddingBottom: '40px' }}>
        <Form layout="vertical" size="large">
          {/* 基坑轮廓导入 */}
          <Card
            title="基坑轮廓导入"
            size="small"
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          >
            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Text style={{ color: '#ffffff80', fontSize: '13px', marginBottom: '16px', display: 'block' }}>
                  导入CAD图纸定义开挖边界，支持复杂异形基坑
                </Text>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dxf,.dwg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                    // 清空输入，允许重复选择同一文件
                    if (e.target) {
                      e.target.value = '';
                    }
                  }}
                  style={{ display: 'none' }}
                />
                
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    console.log('按钮被点击');
                    fileInputRef.current?.click();
                  }}
                  style={{
                    width: '100%',
                    height: '60px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  点击选择 DXF/DWG 文件
                </Button>
                
                <Text style={{ color: '#ffffff60', fontSize: '12px', marginTop: '8px', display: 'block', textAlign: 'center' }}>
                  支持 DXF、DWG 格式，推荐AutoCAD 2018+版本
                </Text>
                
                {excavationParams.contourImport.fileName && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(82, 196, 26, 0.1)', borderRadius: '8px', border: '1px solid #52c41a' }}>
                    <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      已选择文件: {excavationParams.contourImport.fileName}
                    </Text>
                  </div>
                )}
              </Col>
              <Col span={24}>
                <Form.Item
                  label="旋转角度 (度)"
                  tooltip="导入轮廓的旋转角度，0-360度"
                  style={{ marginTop: '16px' }}
                >
                  <InputNumber
                    value={excavationParams.contourImport.rotationAngle}
                    onChange={(value) => handleContourChange('rotationAngle', value || 0)}
                    min={0}
                    max={360}
                    step={1}
                    precision={0}
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="请输入旋转角度"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 开挖参数配置 */}
          <Card
            title="开挖参数"
            size="small"
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Form.Item
                  label="开挖深度 (m)"
                  tooltip="基坑的开挖深度"
                >
                  <InputNumber
                    value={excavationParams.excavationParams.depth}
                    onChange={(value) => handleExcavationChange('depth', value || 10.0)}
                    min={1}
                    max={50}
                    step={0.5}
                    precision={1}
                    size="large"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="分层深度 (m)"
                  tooltip="每层开挖的深度"
                >
                  <InputNumber
                    value={excavationParams.excavationParams.layerDepth}
                    onChange={(value) => handleExcavationChange('layerDepth', value || 2.0)}
                    min={0.5}
                    max={10}
                    step={0.5}
                    precision={1}
                    size="large"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="开挖层数"
                  tooltip="基坑分层开挖的层数"
                >
                  <InputNumber
                    value={excavationParams.excavationParams.layerCount}
                    onChange={(value) => handleExcavationChange('layerCount', value || 5)}
                    min={1}
                    max={20}
                    step={1}
                    size="large"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="应力释放系数"
                  tooltip="开挖过程中土体应力释放的系数，0表示无应力释放，1表示完全释放"
                >
                  <InputNumber
                    value={excavationParams.excavationParams.stressReleaseCoefficient}
                    onChange={(value) => handleExcavationChange('stressReleaseCoefficient', value || 0)}
                    min={0}
                    max={1}
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

      {/* 状态提示 */}
      {status === 'processing' && (
        <Alert
          message="正在进行基坑开挖..."
          description="请稍候，开挖过程可能需要几分钟时间。"
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
      {status === 'completed' && (
        <Alert
          message="基坑开挖完成"
          description="开挖已成功完成，您可以查看结果。"
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
      {status === 'error' && (
        <Alert
          message="基坑开挖失败"
          description="开挖过程中发生错误，请检查参数设置后重试。"
          type="error"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </div>
  );
};

export default ExcavationModule;