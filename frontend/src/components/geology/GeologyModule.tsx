import React, { useState } from 'react';
import { Space, Button, Select, InputNumber, Row, Col, Typography, Divider, Upload, Progress, Alert, Form } from 'antd';
import { UploadOutlined, EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GeologyParamsSchema, type GeologyParams } from '../../schemas';
import { GlassCard, GlassButton } from '../ui/GlassComponents';

const { Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

interface GeologyModuleProps {
  params: GeologyParams;
  onParamsChange: (key: string, value: any) => void;
  onGenerate: (validatedData: GeologyParams) => void;
  status: 'wait' | 'process' | 'finish' | 'error';
}

const GeologyModule: React.FC<GeologyModuleProps> = ({ 
  params, 
  onParamsChange, 
  onGenerate, 
  status 
}) => {
  const [uploadStatus, setUploadStatus] = useState<'none' | 'uploading' | 'success' | 'error'>('none');
  const [boreholeData, setBoreholeData] = useState<any>(null);

  // React Hook Form with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm<GeologyParams>({
    resolver: zodResolver(GeologyParamsSchema),
    defaultValues: params,
    mode: 'onChange'
  });

  // Watch form values to sync with parent component
  const watchedValues = watch();
  React.useEffect(() => {
    Object.entries(watchedValues).forEach(([key, value]) => {
      if (value !== undefined && value !== params[key as keyof GeologyParams]) {
        onParamsChange(key, value);
      }
    });
  }, [watchedValues, onParamsChange, params]);

  const uploadProps = {
    name: 'borehole_data',
    multiple: false,
    accept: '.json,.csv,.xlsx',
    beforeUpload: (file: any) => {
      setUploadStatus('uploading');
      // 模拟上传过程
      setTimeout(() => {
        setUploadStatus('success');
        setBoreholeData({
          filename: file.name,
          boreholes: 12,
          layers: 6,
          totalDepth: 45.5
        });
      }, 2000);
      return false; // 阻止自动上传
    },
    showUploadList: false
  };

  // Form submission handler
  const onSubmit = (data: GeologyParams) => {
    onGenerate(data);
  };

  // Validation helper
  const getFieldError = (fieldName: keyof GeologyParams) => {
    return errors[fieldName]?.message;
  };

  return (
    <GlassCard className="p-4" variant="subtle">
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 标题区域 */}
          <div className="text-center">
            <EnvironmentOutlined className="text-xl text-success mr-2" />
            <Text strong className="text-lg">地质建模</Text>
          </div>

        {/* 钻孔数据上传 */}
        <div>
          <Text strong>钻孔数据导入</Text>
          <div style={{ marginTop: '8px' }}>
            <Dragger {...uploadProps} style={{ padding: '20px' }}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 JSON、CSV、Excel 格式的钻孔数据
              </p>
            </Dragger>
            
            {uploadStatus === 'uploading' && (
              <div style={{ marginTop: '8px' }}>
                <Progress percent={Math.random() * 100} size="small" />
                <Text type="secondary" style={{ fontSize: '12px' }}>正在解析钻孔数据...</Text>
              </div>
            )}
            
            {uploadStatus === 'success' && boreholeData && (
              <Alert
                style={{ marginTop: '8px' }}
                message="钻孔数据导入成功"
                description={
                  <div>
                    <div>文件: {boreholeData.filename}</div>
                    <div>钻孔数: {boreholeData.boreholes} 个</div>
                    <div>地层数: {boreholeData.layers} 层</div>
                    <div>最大深度: {boreholeData.totalDepth} m</div>
                  </div>
                }
                type="success"
                showIcon
              />
            )}
          </div>
        </div>
        
        <Divider />
        
        {/* 插值方法配置 */}
        <Form.Item 
          label={<Text strong>地质插值方法</Text>}
          validateStatus={getFieldError('interpolationMethod') ? 'error' : ''}
          help={getFieldError('interpolationMethod') || '推荐使用克里金插值，适用于地质数据的空间分析'}
        >
          <Controller
            name="interpolationMethod"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: '100%' }}
                disabled={uploadStatus !== 'success'}
                placeholder="选择插值方法"
              >
                <Option value="kriging">克里金插值 (Kriging)</Option>
                <Option value="idw">反距离权重 (IDW)</Option>
                <Option value="spline">样条插值 (Spline)</Option>
                <Option value="linear">线性插值 (Linear)</Option>
              </Select>
            )}
          />
        </Form.Item>
        
        {/* 几何参数配置 */}
        <div>
          <Text strong className="block mb-3">几何参数</Text>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="网格分辨率 (m)"
                validateStatus={getFieldError('gridResolution') ? 'error' : ''}
                help={getFieldError('gridResolution')}
              >
                <Controller
                  name="gridResolution"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      style={{ width: '100%' }}
                      min={0.1}
                      max={10}
                      step={0.1}
                      placeholder="2.0"
                      disabled={uploadStatus !== 'success'}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="底部标高 (m)"
                validateStatus={getFieldError('bottomElevation') ? 'error' : ''}
                help={getFieldError('bottomElevation')}
              >
                <Controller
                  name="bottomElevation"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      style={{ width: '100%' }}
                      min={-100}
                      max={0}
                      placeholder="-30"
                      disabled={uploadStatus !== 'success'}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="X向扩展 (m)"
                validateStatus={getFieldError('xExtend') ? 'error' : ''}
                help={getFieldError('xExtend')}
              >
                <Controller
                  name="xExtend"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      style={{ width: '100%' }}
                      min={10}
                      max={200}
                      placeholder="50"
                      disabled={uploadStatus !== 'success'}
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Y向扩展 (m)"
                validateStatus={getFieldError('yExtend') ? 'error' : ''}
                help={getFieldError('yExtend')}
              >
                <Controller
                  name="yExtend"
                  control={control}
                  render={({ field }) => (
                    <InputNumber
                      {...field}
                      style={{ width: '100%' }}
                      min={10}
                      max={200}
                      placeholder="50"
                      disabled={uploadStatus !== 'success'}
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* 高级设置 */}
        <div>
          <Text strong>高级设置</Text>
          <div style={{ 
            marginTop: '8px', 
            padding: '12px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '6px' 
          }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text style={{ fontSize: '12px' }}>边界平滑</Text>
                <Select
                  style={{ width: '100%', marginTop: '4px' }}
                  defaultValue="auto"
                  size="small"
                  disabled={uploadStatus !== 'success'}
                >
                  <Option value="none">无</Option>
                  <Option value="auto">自动</Option>
                  <Option value="manual">手动</Option>
                </Select>
              </Col>
              <Col span={12}>
                <Text style={{ fontSize: '12px' }}>质量检查</Text>
                <Select
                  style={{ width: '100%', marginTop: '4px' }}
                  defaultValue="standard"
                  size="small"
                  disabled={uploadStatus !== 'success'}
                >
                  <Option value="basic">基础</Option>
                  <Option value="standard">标准</Option>
                  <Option value="strict">严格</Option>
                </Select>
              </Col>
            </Row>
          </div>
        </div>
        
        {/* 生成按钮 */}
        <GlassButton
          variant="primary"
          size="lg"
          className="w-full"
          loading={status === 'process'}
          disabled={status === 'finish' || uploadStatus !== 'success' || !isValid}
          htmlType="submit"
          icon={status === 'finish' ? <CheckCircleOutlined /> : <EnvironmentOutlined />}
        >
          {status === 'finish' ? '地质模型已生成' : 
           status === 'process' ? '正在生成地质模型...' : '生成地质模型'}
        </GlassButton>

        {/* 状态提示 */}
        {status === 'finish' && (
          <Alert
            message="地质建模完成"
            description="已成功生成三维地质模型，可以进行下一步基坑开挖建模"
            type="success"
            showIcon
          />
        )}
        
        {status === 'error' && (
          <Alert
            message="地质建模失败"
            description="请检查钻孔数据格式或调整插值参数后重试"
            type="error"
            showIcon
          />
        )}
        </Space>
      </Form>
    </GlassCard>
  );
};

export default GeologyModule;