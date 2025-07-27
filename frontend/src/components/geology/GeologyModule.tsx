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
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 标题区域 */}
          <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <EnvironmentOutlined style={{ fontSize: '24px', color: '#00d9ff', marginRight: '12px' }} />
            <Text strong style={{ fontSize: '18px', color: '#fff' }}>地质建模控制</Text>
          </div>

        {/* 钻孔数据上传 - 紧凑版 */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
          <Text strong style={{ color: '#00d9ff', marginBottom: '12px', display: 'block' }}>钻孔数据导入</Text>
          <div style={{ marginTop: '8px' }}>
            <Dragger {...uploadProps} style={{ padding: '16px', background: 'rgba(0,217,255,0.1)', border: '1px dashed #00d9ff' }}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ color: '#00d9ff' }} />
              </p>
              <p className="ant-upload-text" style={{ color: '#fff', fontSize: '14px' }}>拖拽文件或点击上传</p>
              <p className="ant-upload-hint" style={{ color: '#ffffff80', fontSize: '12px' }}>
                支持 JSON、CSV、Excel 格式
              </p>
            </Dragger>
            
            {uploadStatus === 'uploading' && (
              <div style={{ marginTop: '8px' }}>
                <Progress percent={Math.random() * 100} size="small" />
                <Text type="secondary" style={{ fontSize: '12px' }}>正在解析钻孔数据...</Text>
              </div>
            )}
            
            {uploadStatus === 'success' && boreholeData && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                background: 'rgba(82, 196, 26, 0.1)', 
                border: '1px solid rgba(82, 196, 26, 0.3)',
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong style={{ color: '#52c41a' }}>数据导入成功</Text>
                </div>
                <Row gutter={[12, 4]}>
                  <Col span={12}><Text style={{ fontSize: '12px', color: '#fff' }}>钻孔: {boreholeData.boreholes}个</Text></Col>
                  <Col span={12}><Text style={{ fontSize: '12px', color: '#fff' }}>地层: {boreholeData.layers}层</Text></Col>
                  <Col span={24}><Text style={{ fontSize: '12px', color: '#ffffff80' }}>文件: {boreholeData.filename}</Text></Col>
                </Row>
              </div>
            )}
          </div>
        </div>
        
        {/* 参数配置区域 */}
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
          <Text strong style={{ color: '#00d9ff', fontSize: '16px', marginBottom: '16px', display: 'block' }}>建模参数设置</Text>
          
          {/* 插值方法配置 */}
          <Form.Item 
            label={<Text strong style={{ color: '#fff' }}>地质插值算法</Text>}
            validateStatus={getFieldError('interpolationMethod') ? 'error' : ''}
            help={getFieldError('interpolationMethod') || <Text style={{ color: '#ffffff80', fontSize: '12px' }}>推荐RBF插值，适合复杂地质结构</Text>}
            style={{ marginBottom: '20px' }}
          >
            <Controller
              name="interpolationMethod"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  style={{ width: '100%' }}
                  disabled={uploadStatus !== 'success'}
                  placeholder="选择插值算法"
                  size="large"
                >
                  <Option value="kriging">RBF径向基函数 (推荐)</Option>
                  <Option value="idw">反距离权重 (IDW)</Option>
                  <Option value="spline">样条插值 (Spline)</Option>
                  <Option value="linear">线性插值 (Linear)</Option>
                </Select>
              )}
            />
          </Form.Item>
          
          {/* 几何参数配置 - 网格化布局 */}
          <div style={{ marginTop: '20px' }}>
            <Text strong style={{ color: '#fff', marginBottom: '12px', display: 'block' }}>几何范围设置</Text>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <Text style={{ color: '#ffffff80', fontSize: '12px', display: 'block', marginBottom: '6px' }}>网格分辨率 (m)</Text>
                  <Controller
                    name="gridResolution"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={0.5}
                        max={5.0}
                        step={0.1}
                        placeholder="1.75"
                        disabled={uploadStatus !== 'success'}
                        size="large"
                      />
                    )}
                  />
                  <Text style={{ color: '#ffffff60', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    推荐值: 1.5-2.0m (3号验证标准)
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <Text style={{ color: '#ffffff80', fontSize: '12px', display: 'block', marginBottom: '6px' }}>底部标高 (m)</Text>
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
                        size="large"
                      />
                    )}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <Text style={{ color: '#ffffff80', fontSize: '12px', display: 'block', marginBottom: '6px' }}>X向扩展 (m)</Text>
                  <Controller
                    name="xExtend"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={20}
                        max={200}
                        placeholder="50"
                        disabled={uploadStatus !== 'success'}
                        size="large"
                      />
                    )}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <Text style={{ color: '#ffffff80', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Y向扩展 (m)</Text>
                  <Controller
                    name="yExtend"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={20}
                        max={200}
                        placeholder="50"
                        disabled={uploadStatus !== 'success'}
                        size="large"
                      />
                    )}
                  />
                </div>
              </Col>
            </Row>
          </div>

          
          {/* 质量控制设置 */}
          <div style={{ marginTop: '20px' }}>
            <Text strong style={{ color: '#fff', marginBottom: '12px', display: 'block' }}>质量控制</Text>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <Text style={{ color: '#ffffff80', fontSize: '12px', display: 'block', marginBottom: '6px' }}>边界平滑</Text>
                  <Select
                    style={{ width: '100%' }}
                    defaultValue="auto"
                    size="large"
                    disabled={uploadStatus !== 'success'}
                  >
                    <Option value="none">锐利边界</Option>
                    <Option value="auto">自动平滑 (推荐)</Option>
                    <Option value="manual">手动调节</Option>
                  </Select>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                  <Text style={{ color: '#ffffff80', fontSize: '12px', display: 'block', marginBottom: '6px' }}>质量检查</Text>
                  <Select
                    style={{ width: '100%' }}
                    defaultValue="standard"
                    size="large"
                    disabled={uploadStatus !== 'success'}
                  >
                    <Option value="basic">基础检查</Option>
                    <Option value="standard">标准检查 (推荐)</Option>
                    <Option value="strict">严格检查</Option>
                  </Select>
                </div>
              </Col>
            </Row>
          </div>
        </div>
        
        {/* 实时预览统计 */}
        {uploadStatus === 'success' && boreholeData && (
          <div style={{ background: 'rgba(0,217,255,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,217,255,0.3)' }}>
            <Text strong style={{ color: '#00d9ff', marginBottom: '12px', display: 'block' }}>建模预览</Text>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                    {Math.floor((watchedValues.xExtend || 50) * (watchedValues.yExtend || 50) / (watchedValues.gridResolution || 1.75) ** 2 / 1000)}K
                  </div>
                  <div style={{ fontSize: '11px', color: '#ffffff80' }}>预估网格点</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                    {((watchedValues.xExtend || 50) * (watchedValues.yExtend || 50) * Math.abs(watchedValues.bottomElevation || -30) / 1000000).toFixed(1)}M
                  </div>
                  <div style={{ fontSize: '11px', color: '#ffffff80' }}>体积(m³)</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                    {boreholeData.layers}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ffffff80' }}>地层数</div>
                </div>
              </Col>
            </Row>
          </div>
        )}
        
        {/* 生成按钮 */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <GlassButton
            variant="primary"
            size="lg"
            style={{ 
              width: '100%', 
              height: '48px', 
              fontSize: '16px',
              background: uploadStatus === 'success' && isValid ? 
                'linear-gradient(45deg, #00d9ff, #0099cc)' : 
                'rgba(255,255,255,0.1)',
              border: uploadStatus === 'success' && isValid ? 
                '1px solid #00d9ff' : 
                '1px solid rgba(255,255,255,0.2)'
            }}
            loading={status === 'process'}
            disabled={status === 'finish' || uploadStatus !== 'success' || !isValid}
            icon={status === 'finish' ? <CheckCircleOutlined /> : <EnvironmentOutlined />}
          >
            {status === 'finish' ? '✅ 地质模型已生成' : 
             status === 'process' ? '🔄 正在执行RBF插值...' : 
             uploadStatus !== 'success' ? '📁 请先导入钻孔数据' : '🚀 开始地质建模'}
          </GlassButton>
        </div>

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