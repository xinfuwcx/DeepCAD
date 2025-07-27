import React, { useState } from 'react';
import { Space, Button, Select, InputNumber, Row, Col, Typography, Upload, Progress, Alert, Form, Tabs } from 'antd';
import { UploadOutlined, EnvironmentOutlined, CheckCircleOutlined, BorderOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GeologyParamsSchema, type GeologyParams } from '../../schemas';

const { Text, Title } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

interface GeologyModuleProps {
  params: GeologyParams;
  onParamsChange: (key: string, value: any) => void;
  onGenerate: (validatedData: GeologyParams) => void;
  onPreview?: (params: GeologyParams) => void; // 实时预览回调
  status: 'wait' | 'process' | 'finish' | 'error';
}

const GeologyModuleSimplified: React.FC<GeologyModuleProps> = ({ 
  params, 
  onParamsChange, 
  onGenerate, 
  onPreview,
  status 
}) => {
  const [uploadStatus, setUploadStatus] = useState<'none' | 'uploading' | 'success' | 'error'>('none');
  const [boreholeData, setBoreholeData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('1'); // 管理当前活动Tab

  // React Hook Form with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
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

  // 实时预览逻辑
  React.useEffect(() => {
    if (onPreview && uploadStatus === 'success' && isValid) {
      const previewTimer = setTimeout(() => {
        onPreview(watchedValues as GeologyParams);
      }, 500); // 延迟500ms避免频繁更新
      
      return () => clearTimeout(previewTimer);
    }
  }, [watchedValues, onPreview, uploadStatus, isValid]);

  const uploadProps = {
    name: 'borehole_data',
    multiple: false,
    accept: '.json,.csv,.xlsx',
    beforeUpload: (file: any) => {
      setUploadStatus('uploading');
      setTimeout(() => {
        setUploadStatus('success');
        setBoreholeData({
          filename: file.name,
          boreholes: 12,
          layers: 6,
          totalDepth: 45.5
        });
      }, 2000);
      return false;
    },
    showUploadList: false
  };

  const onSubmit = (data: GeologyParams) => {
    onGenerate(data);
  };

  const getFieldError = (fieldName: keyof GeologyParams) => {
    return errors[fieldName]?.message;
  };

  const tabItems = [
    {
      key: '1',
      label: (
        <span style={{ color: '#ffffff', fontSize: '13px' }}>
          <BorderOutlined style={{ marginRight: '6px' }} />
          几何参数
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* 几何参数配置 */}
          <div style={{ 
            background: 'rgba(0, 217, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '16px',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            marginBottom: '20px'
          }}>
            <Text strong style={{ color: '#ffffff', fontSize: '14px', display: 'block', marginBottom: '12px' }}>
              📐 几何尺寸
            </Text>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#ffffff', fontSize: '12px' }}>长度 (m)</span>}
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
                        max={2000}
                        placeholder="100"
                        disabled={uploadStatus !== 'success'}
                        size="middle"
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#ffffff', fontSize: '12px' }}>宽度 (m)</span>}
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
                        max={2000}
                        placeholder="80"
                        disabled={uploadStatus !== 'success'}
                        size="middle"
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#ffffff', fontSize: '12px' }}>深度 (m)</span>}
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
                        size="middle"
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: '#ffffff', fontSize: '12px' }}>网格分辨率 (m)</span>}
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
                        size="middle"
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <span style={{ color: '#ffffff', fontSize: '13px' }}>
          <ThunderboltOutlined style={{ marginRight: '6px' }} />
          三维重建
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* 钻孔数据上传 */}
          <div style={{ 
            background: 'rgba(0, 217, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '16px',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            marginBottom: '20px'
          }}>
            <Text strong style={{ color: '#ffffff', fontSize: '14px', display: 'block', marginBottom: '12px' }}>
              📊 钻孔数据导入
            </Text>
            <Dragger 
              {...uploadProps} 
              style={{ 
                padding: '16px',
                background: 'rgba(0, 217, 255, 0.02)',
                border: '1px dashed rgba(0, 217, 255, 0.4)',
                borderRadius: '6px'
              }}
            >
              <p style={{ margin: 0, fontSize: '24px', color: '#00d9ff' }}>
                <UploadOutlined />
              </p>
              <p style={{ color: '#ffffff', fontSize: '14px', margin: '6px 0' }}>
                点击或拖拽文件上传
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', margin: 0 }}>
                支持 JSON、CSV、Excel 格式
              </p>
            </Dragger>
            
            {uploadStatus === 'uploading' && (
              <div style={{ marginTop: '8px' }}>
                <Progress percent={Math.random() * 100} size="small" strokeColor="#00d9ff" />
                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  正在解析钻孔数据...
                </Text>
              </div>
            )}
            
            {uploadStatus === 'success' && boreholeData && (
              <Alert
                style={{ 
                  marginTop: '8px',
                  background: 'rgba(82, 196, 26, 0.1)',
                  border: '1px solid rgba(82, 196, 26, 0.3)'
                }}
                message={<span style={{ color: '#52c41a', fontSize: '12px' }}>钻孔数据导入成功</span>}
                description={
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px' }}>
                    <div>文件: {boreholeData.filename}</div>
                    <div>钻孔: {boreholeData.boreholes} 个 | 地层: {boreholeData.layers} 层 | 深度: {boreholeData.totalDepth}m</div>
                  </div>
                }
                type="success"
                showIcon
              />
            )}
          </div>

          {/* 插值方法配置 */}
          <div style={{ 
            background: 'rgba(0, 217, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '16px',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            marginBottom: '20px'
          }}>
            <Form.Item 
              label={<Text strong style={{ color: '#ffffff', fontSize: '14px' }}>🧮 插值方法</Text>}
              validateStatus={getFieldError('interpolationMethod') ? 'error' : ''}
              help={
                <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px' }}>
                  {getFieldError('interpolationMethod') || '选择适合的地质空间插值算法'}
                </Text>
              }
              style={{ marginBottom: 0 }}
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
                    size="middle"
                  >
                    <Option value="kriging">克里金插值 (Kriging) - 推荐</Option>
                    <Option value="idw">反距离权重 (IDW)</Option>
                    <Option value="spline">样条插值 (Spline)</Option>
                    <Option value="linear">线性插值 (Linear)</Option>
                  </Select>
                )}
              />
            </Form.Item>
          </div>

          {/* 高级设置 */}
          <div style={{ 
            background: 'rgba(0, 217, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '16px',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            marginBottom: '20px'
          }}>
            <Text strong style={{ color: '#ffffff', fontSize: '14px', display: 'block', marginBottom: '12px' }}>
              ⚙️ 高级设置
            </Text>
            <Row gutter={12}>
              <Col span={12}>
                <Text style={{ fontSize: '12px', color: '#ffffff', display: 'block', marginBottom: '4px' }}>变差函数模型</Text>
                <Select
                  style={{ width: '100%' }}
                  defaultValue="spherical"
                  size="small"
                  disabled={uploadStatus !== 'success'}
                >
                  <Option value="spherical">球形模型</Option>
                  <Option value="exponential">指数模型</Option>
                  <Option value="gaussian">高斯模型</Option>
                  <Option value="matern">Matern模型</Option>
                </Select>
              </Col>
              <Col span={12}>
                <Text style={{ fontSize: '12px', color: '#ffffff', display: 'block', marginBottom: '4px' }}>不确定性分析</Text>
                <Select
                  style={{ width: '100%' }}
                  defaultValue="standard"
                  size="small"
                  disabled={uploadStatus !== 'success'}
                >
                  <Option value="none">关闭</Option>
                  <Option value="standard">标准误差</Option>
                  <Option value="confidence">置信区间</Option>
                </Select>
              </Col>
            </Row>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        {/* 标题区域 */}
        <div style={{ 
          textAlign: 'center', 
          borderBottom: '1px solid rgba(0, 217, 255, 0.3)',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <EnvironmentOutlined style={{ fontSize: '24px', color: '#00d9ff', marginRight: '8px' }} />
          <Title level={4} style={{ color: '#00d9ff', margin: 0, display: 'inline', fontWeight: 'normal' }}>
            地质建模
          </Title>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '12px', 
            display: 'block', 
            marginTop: '6px',
            lineHeight: '1.3'
          }}>
            智能地质空间插值与三维建模
          </Text>
        </div>

        {/* Tab 内容 */}
        <Tabs
          items={tabItems}
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{
            marginBottom: '20px'
          }}
          tabBarStyle={{
            marginBottom: '0px'
          }}
          tabBarGutter={16}
        />

        {/* 生成按钮 */}
        <Button
          type="primary"
          size="large"
          style={{
            width: '100%',
            height: '40px',
            fontSize: '14px',
            background: status === 'finish' ? 'rgba(82, 196, 26, 0.8)' :
                       status === 'process' ? 'rgba(250, 173, 20, 0.8)' :
                       'rgba(0, 217, 255, 0.8)',
            border: 'none',
            borderRadius: '6px',
            boxShadow: status !== 'wait' ? 'none' : '0 2px 8px rgba(0, 217, 255, 0.3)'
          }}
          loading={status === 'process'}
          disabled={status === 'finish' || uploadStatus !== 'success' || !isValid || activeTab !== '2'}
          icon={status === 'finish' ? <CheckCircleOutlined /> : <EnvironmentOutlined />}
          onClick={handleSubmit(onSubmit)}
        >
          {status === 'finish' ? '地质模型已生成' : 
           status === 'process' ? '正在生成地质模型...' : 
           activeTab !== '2' ? '请切换到三维重建Tab' :
           uploadStatus !== 'success' ? '请先上传钻孔数据' : '生成地质模型'}
        </Button>

        {/* 状态提示 */}
        {status === 'finish' && (
          <Alert
            style={{
              background: 'rgba(82, 196, 26, 0.1)',
              border: '1px solid rgba(82, 196, 26, 0.3)',
              marginTop: '16px'
            }}
            message={<span style={{ color: '#52c41a', fontSize: '12px' }}>地质建模完成</span>}
            description={
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px' }}>
                已成功生成三维地质模型，可进行下一步开挖设计
              </span>
            }
            type="success"
            showIcon
          />
        )}
        
        {status === 'error' && (
          <Alert
            style={{
              background: 'rgba(255, 77, 79, 0.1)',
              border: '1px solid rgba(255, 77, 79, 0.3)',
              marginTop: '16px'
            }}
            message={<span style={{ color: '#ff4d4f', fontSize: '12px' }}>地质建模失败</span>}
            description={
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px' }}>
                请检查钻孔数据格式或调整插值参数后重试
              </span>
            }
            type="error"
            showIcon
          />
        )}
      </Form>
    </div>
  );
};

export default GeologyModuleSimplified;