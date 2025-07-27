/**
 * 钻孔建模界面
 * 重点：钻孔数据导入 → RBF三维重建 → 钻孔模型生成
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, Form, InputNumber, Select, Slider, Switch, 
  Button, Space, Typography, Row, Col, Divider, Upload, message
} from 'antd';
import { 
  ThunderboltOutlined, EyeOutlined, UploadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface GeologyParams {
  // 钻孔数据
  boreholeFile: string | null;
  boreholeCount: number;
  
  // 三维重建参数
  reconstruction: {
    gridResolution: number; // 网格分辨率
    rbfFunction: 'multiquadric' | 'gaussian' | 'cubic';
    surfaceType: 'bspline' | 'nurbs'; // 曲面类型
    enableExtrapolation: boolean; // 启用外推
  };
}

interface GeologyModelingSimpleProps {
  onParamsChange?: (params: GeologyParams) => void;
}

const GeologyModelingSimple: React.FC<GeologyModelingSimpleProps> = ({ 
  onParamsChange 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState<GeologyParams>({
    boreholeFile: "boreholes_with_undulation.csv", // 默认加载新数据
    boreholeCount: 100, // 默认100个钻孔
    reconstruction: {
      gridResolution: 8.0, // 网格分辨率8m
      rbfFunction: 'multiquadric', // 推荐的RBF函数
      surfaceType: 'nurbs', // 默认使用NURBS曲面
      enableExtrapolation: true // 启用外推优化
    }
  });

  // 实时传递参数变化并更新主3D视口
  useEffect(() => {
    if (onParamsChange) {
      onParamsChange(params);
    }
    
    // 通知主3D视口更新地质预览
    window.dispatchEvent(new CustomEvent('update-geology-preview', { 
      detail: params 
    }));
  }, [params, onParamsChange]);

  const updateParams = (path: string, value: any) => {
    setParams(prev => {
      const newParams = { ...prev };
      const keys = path.split('.');
      let current: any = newParams;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newParams;
    });
  };

  // 生成地质模型
  const handleGenerateModel = async () => {
    if (!params.boreholeFile) {
      message.warning('请先导入钻孔数据！');
      return;
    }

    setIsGenerating(true);
    try {
      message.loading('正在生成三维地质模型...', 2);
      
      // 模拟模型生成过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 触发3D视口更新
      console.log('🚀 即将发送地质模型生成事件，参数:', params);
      window.dispatchEvent(new CustomEvent('generate-geology-model', { 
        detail: params 
      }));
      console.log('📡 地质模型生成事件已发送');
      
      message.success('地质模型生成成功！');
    } catch (error) {
      message.error('模型生成失败，请检查参数设置');
    } finally {
      setIsGenerating(false);
    }
  };

  // 钻孔建模界面

  return (
    <div style={{ padding: '16px' }}>
      {/* 地质建模参数 */}
      <Card title="地质建模参数" size="small" style={{ marginBottom: '16px' }}>
        {/* 钻孔数据导入 */}
        <Upload
          accept=".csv,.xlsx,.json"
          showUploadList={false}
          beforeUpload={(file) => {
            updateParams('boreholeFile', file.name);
            // 根据文件名确定钻孔数量
            if (file.name.includes('boreholes_with_undulation')) {
              updateParams('boreholeCount', 100); // 新的CSV文件有100个钻孔
            } else {
              updateParams('boreholeCount', Math.floor(Math.random() * 10) + 5); // 其他文件模拟数量
            }
            return false; // 阻止自动上传
          }}
          style={{ width: '100%', marginBottom: '12px' }}
        >
          <Button 
            icon={<UploadOutlined />} 
            size="small" 
            style={{ width: '100%' }}
          >
            导入钻孔数据 (.csv/.xlsx/.json)
          </Button>
        </Upload>
        {params.boreholeFile && (
          <Text style={{ color: 'var(--success-color)', fontSize: '11px', display: 'block', marginBottom: '12px' }}>
            已导入: {params.boreholeFile} ({params.boreholeCount} 个钻孔)
          </Text>
        )}

        <Form.Item label="RBF函数" style={{ marginBottom: '12px' }}>
          <Select
            value={params.reconstruction.rbfFunction}
            onChange={(value) => updateParams('reconstruction.rbfFunction', value)}
            style={{ width: '100%' }}
            size="small"
          >
            <Option value="multiquadric">多二次</Option>
            <Option value="gaussian">高斯函数</Option>
            <Option value="cubic">三次函数</Option>
          </Select>
        </Form.Item>
        
        <Form.Item label="曲面类型" style={{ marginBottom: '12px' }}>
          <Select
            value={params.reconstruction.surfaceType}
            onChange={(value) => updateParams('reconstruction.surfaceType', value)}
            style={{ width: '100%' }}
            size="small"
          >
            <Option value="bspline">B样条曲面</Option>
            <Option value="nurbs">NURBS曲面</Option>
          </Select>
        </Form.Item>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: '12px' }}>外推优化</Text>
          <Switch
            checked={params.reconstruction.enableExtrapolation}
            onChange={(checked) => updateParams('reconstruction.enableExtrapolation', checked)}
            size="small"
          />
        </div>
      </Card>

      {/* 土体计算域参数 */}
      <Card title="土体计算域参数" size="small" style={{ marginBottom: '16px' }}>
        <Form.Item label="网格分辨率 (m)" style={{ marginBottom: '12px' }}>
          <Slider
            value={params.reconstruction.gridResolution}
            onChange={(value) => updateParams('reconstruction.gridResolution', value)}
            min={2.0}
            max={15.0}
            step={1.0}
            marks={{ 2.0: '精细', 8.0: '标准', 15.0: '粗糙' }}
            tooltip={{ formatter: (value) => `${value}m` }}
          />
        </Form.Item>
      </Card>

      {/* 快捷操作按钮 */}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">        
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleGenerateModel}
          loading={isGenerating}
          disabled={!params.boreholeFile}
          style={{ width: '100%' }}
          size="large"
        >
          {isGenerating ? '生成中...' : '生成钻孔模型'}
        </Button>
        
        <Button
          icon={<EyeOutlined />}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('section-geology-view', { 
              detail: params 
            }));
          }}
          style={{ width: '100%' }}
          size="large"
        >
          剖切视图
        </Button>
      </Space>

      {/* 参数摘要 */}
      {params.boreholeFile && (
        <div style={{ 
          marginTop: '16px',
          padding: '8px',
          background: 'var(--component-bg)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)'
        }}>
          <Text style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            {params.boreholeCount}个钻孔 | {params.reconstruction.rbfFunction} | {params.reconstruction.surfaceType} | {params.reconstruction.gridResolution}m分辨率
          </Text>
        </div>
      )}
    </div>
  );
};

export default GeologyModelingSimple;