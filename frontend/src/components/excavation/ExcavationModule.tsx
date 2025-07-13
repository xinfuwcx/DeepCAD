import React, { useState } from 'react';
import { Space, Button, Row, Col, Typography, Divider, Upload, Progress, Alert, Select } from 'antd';
import { UploadOutlined, ToolOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExcavationParamsSchema, type ExcavationParams } from '../../schemas';
import { GlassCard, GlassButton } from '../ui/GlassComponents';
import { FormInputNumber, FormSliderInput, FormSelect, FormGroup } from '../forms';

const { Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

interface ExcavationModuleProps {
  params: ExcavationParams;
  onParamsChange: (key: string, value: any) => void;
  onGenerate: (validatedData: ExcavationParams) => void;
  status: 'wait' | 'process' | 'finish' | 'error';
  disabled: boolean;
}

const ExcavationModule: React.FC<ExcavationModuleProps> = ({ 
  params, 
  onParamsChange, 
  onGenerate, 
  status,
  disabled 
}) => {
  const [dxfUploadStatus, setDxfUploadStatus] = useState<'none' | 'uploading' | 'success' | 'error'>('none');
  const [dxfData, setDxfData] = useState<any>(null);
  const [booleanOperation, setBooleanOperation] = useState<'difference' | 'union' | 'intersection'>('difference');

  // React Hook Form with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm<ExcavationParams>({
    resolver: zodResolver(ExcavationParamsSchema),
    defaultValues: params,
    mode: 'onChange'
  });

  // Watch form values to sync with parent component
  const watchedValues = watch();
  React.useEffect(() => {
    Object.entries(watchedValues).forEach(([key, value]) => {
      if (value !== undefined && value !== params[key as keyof ExcavationParams]) {
        onParamsChange(key, value);
      }
    });
  }, [watchedValues, onParamsChange, params]);

  // Form submission handler
  const onSubmit = (data: ExcavationParams) => {
    onGenerate(data);
  };

  // Handle form submission via button
  const handleFormSubmit = () => {
    handleSubmit(onSubmit)();
  };

  const dxfUploadProps = {
    name: 'dxf_file',
    multiple: false,
    accept: '.dxf,.dwg',
    beforeUpload: (file: any) => {
      setDxfUploadStatus('uploading');
      // 模拟DXF解析过程
      setTimeout(() => {
        setDxfUploadStatus('success');
        setDxfData({
          filename: file.name,
          entities: 156,
          layers: 8,
          area: 2400.5,
          perimeter: 185.2
        });
      }, 2500);
      return false; // 阻止自动上传
    },
    showUploadList: false
  };

  const calculateExcavationVolume = () => {
    if (dxfData) {
      return (dxfData.area * params.depth / 1000).toFixed(1); // 转换为千立方米
    }
    return '0';
  };

  const calculateLayerCount = () => {
    return Math.ceil(params.depth / params.layerHeight);
  };

  return (
    <div className="p-4">
      <Space direction="vertical" className="w-full" size="middle">
        {/* 标题区域 */}
        <div className="text-center">
          <ToolOutlined className="text-xl text-primary mr-2" />
          <Text strong className="text-lg">基坑开挖</Text>
        </div>

        {/* 前置条件检查 */}
        {disabled && (
          <Alert
            message="请先完成地质建模"
            description="基坑开挖需要基于已生成的地质模型进行布尔运算"
            type="warning"
            showIcon
          />
        )}

        {/* DXF图纸导入 */}
        <FormGroup title="基坑轮廓导入" description="导入CAD图纸定义开挖边界">
          <Dragger {...dxfUploadProps} className="p-5" disabled={disabled}>
            <p className="ant-upload-drag-icon">
              <FileTextOutlined />
            </p>
            <p className="ant-upload-text">导入基坑轮廓 DXF 图纸</p>
            <p className="ant-upload-hint">
              支持 DXF、DWG 格式的 CAD 图纸
            </p>
          </Dragger>
          
          {dxfUploadStatus === 'uploading' && (
            <div className="mt-2">
              <Progress percent={Math.random() * 100} size="small" />
              <Text type="secondary" className="text-xs block mt-1">正在解析 DXF 图纸...</Text>
            </div>
          )}
          
          {dxfUploadStatus === 'success' && dxfData && (
            <Alert
              className="mt-2"
              message="DXF 图纸导入成功"
              description={
                <div className="space-y-1">
                  <div>文件: {dxfData.filename}</div>
                  <div>图元数: {dxfData.entities} 个</div>
                  <div>图层数: {dxfData.layers} 层</div>
                  <div>基坑面积: {dxfData.area} m²</div>
                  <div>周长: {dxfData.perimeter} m</div>
                </div>
              }
              type="success"
              showIcon
            />
          )}
        </FormGroup>
        
        
        {/* 开挖参数配置 */}
        <FormGroup title="开挖参数" description="配置基坑开挖的几何参数">
          <Row gutter={16}>
            <Col span={12}>
              <FormInputNumber<ExcavationParams>
                name="depth"
                control={control}
                label="开挖深度"
                unit="m"
                min={1}
                max={50}
                step={1}
                disabled={disabled || dxfUploadStatus !== 'success'}
                required
              />
            </Col>
            <Col span={12}>
              <FormInputNumber<ExcavationParams>
                name="layerHeight"
                control={control}
                label="分层高度"
                unit="m"
                min={1}
                max={10}
                step={0.5}
                disabled={disabled || dxfUploadStatus !== 'success'}
                required
              />
            </Col>
          </Row>
          
          <FormSliderInput<ExcavationParams>
            name="slopeRatio"
            control={control}
            label="坡率系数"
            description="0 = 垂直开挖，1 = 45°坡角开挖"
            min={0}
            max={1}
            step={0.1}
            precision={1}
            disabled={disabled || dxfUploadStatus !== 'success'}
          />
        </FormGroup>

        {/* 开挖统计信息 */}
        {dxfUploadStatus === 'success' && dxfData && (
          <FormGroup title="开挖统计" description="实时计算的开挖信息">
            <GlassCard variant="subtle" className="p-3">
              <Row gutter={16}>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-base font-bold text-primary">
                      {calculateLayerCount()}
                    </div>
                    <div className="text-xs text-secondary">开挖层数</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-base font-bold text-success">
                      {calculateExcavationVolume()} K
                    </div>
                    <div className="text-xs text-secondary">开挖体积(m³)</div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <div className="text-base font-bold text-warning">
                      {dxfData.area}
                    </div>
                    <div className="text-xs text-secondary">基坑面积(m²)</div>
                  </div>
                </Col>
              </Row>
            </GlassCard>
          </FormGroup>
        )}

        {/* 布尔运算设置 */}
        <FormGroup title="布尔运算" description="配置土体与开挖体的几何运算">
          <div className="space-y-2">
            <Text className="text-sm font-medium">操作类型</Text>
            <Select
              className="w-full"
              value={booleanOperation}
              onChange={setBooleanOperation}
              disabled={disabled || dxfUploadStatus !== 'success'}
            >
              <Option value="difference">差集运算 (土体 - 开挖体)</Option>
              <Option value="union">并集运算 (土体 + 开挖体)</Option>
              <Option value="intersection">交集运算 (土体 ∩ 开挖体)</Option>
            </Select>
            <Text type="secondary" className="text-xs block">
              推荐使用差集运算生成开挖后的土体几何
            </Text>
          </div>
        </FormGroup>

        {/* 高级设置 */}
        <FormGroup title="高级设置" description="精细控制几何生成质量">
          <Row gutter={16}>
            <Col span={12}>
              <div className="space-y-2">
                <Text className="text-sm font-medium">几何精度</Text>
                <Select
                  className="w-full"
                  defaultValue="standard"
                  size="small"
                  disabled={disabled || dxfUploadStatus !== 'success'}
                >
                  <Option value="coarse">粗糙 (快速)</Option>
                  <Option value="standard">标准</Option>
                  <Option value="fine">精细 (慢速)</Option>
                </Select>
              </div>
            </Col>
            <Col span={12}>
              <div className="space-y-2">
                <Text className="text-sm font-medium">边界处理</Text>
                <Select
                  className="w-full"
                  defaultValue="smooth"
                  size="small"
                  disabled={disabled || dxfUploadStatus !== 'success'}
                >
                  <Option value="sharp">锐利边界</Option>
                  <Option value="smooth">平滑边界</Option>
                  <Option value="blend">融合边界</Option>
                </Select>
              </div>
            </Col>
          </Row>
        </FormGroup>
        
        {/* 生成按钮 */}
        <GlassButton
          variant="primary"
          size="lg"
          loading={status === 'process'}
          disabled={status === 'finish' || disabled || dxfUploadStatus !== 'success' || !isValid}
          onClick={handleFormSubmit}
          icon={status === 'finish' ? <CheckCircleOutlined /> : <ToolOutlined />}
          className="w-full"
        >
          {status === 'finish' ? '开挖体已生成' : 
           status === 'process' ? '正在执行布尔运算...' : '生成开挖体 (布尔运算)'}
        </GlassButton>

        {/* 状态提示 */}
        {status === 'finish' && (
          <Alert
            message="基坑开挖完成"
            description="已成功生成开挖体并完成与土体的布尔运算，可以进行支护结构设计"
            type="success"
            showIcon
          />
        )}
        
        {status === 'error' && (
          <Alert
            message="基坑开挖失败"
            description="布尔运算失败，请检查DXF图纸格式或调整开挖参数后重试"
            type="error"
            showIcon
          />
        )}
        </Space>
    </div>
  );
};

export default ExcavationModule;