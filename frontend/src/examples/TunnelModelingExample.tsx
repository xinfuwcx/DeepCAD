/**
 * 隧道建模组件使用示例
 */

import React, { useState } from 'react';
import { Card, Row, Col, message } from 'antd';
import TunnelModelingModule from '../components/tunnel/TunnelModelingModule';
import { TunnelParameters, TunnelModelingResult } from '../types/tunnel';

const TunnelModelingExample: React.FC = () => {
  const [tunnelParams, setTunnelParams] = useState<TunnelParameters | null>(null);
  const [modelingStatus, setModelingStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');

  const handleParametersChange = (params: TunnelParameters) => {
    setTunnelParams(params);
    console.log('隧道参数更新:', params);
  };

  const handleGenerate = async (params: TunnelParameters) => {
    setModelingStatus('processing');
    
    try {
      // 模拟建模过程
      console.log('开始生成隧道模型...', params);
      
      // 这里可以调用实际的隧道建模服务
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟建模结果
      const result: TunnelModelingResult = {
        success: true,
        modelId: `tunnel_${Date.now()}`,
        parameters: params,
        statistics: {
          volume: calculateVolume(params),
          surfaceArea: calculateSurfaceArea(params),
          liningVolume: calculateLiningVolume(params),
          excavationCost: calculateCost(params)
        },
        quality: {
          score: 85,
          issues: [],
          recommendations: ['建议优化衬砌厚度配置', '考虑增加排水设施']
        }
      };
      
      console.log('隧道建模完成:', result);
      setModelingStatus('completed');
      message.success('隧道模型生成成功！');
      
    } catch (error) {
      console.error('隧道建模失败:', error);
      setModelingStatus('error');
      message.error('隧道建模过程中发生错误');
    }
  };

  // 计算开挖体积
  const calculateVolume = (params: TunnelParameters): number => {
    const { crossSection, tunnel } = params;
    let crossSectionArea = 0;
    
    switch (crossSection.type) {
      case 'circular':
        const radius = (crossSection.dimensions.diameter || 6) / 2;
        crossSectionArea = Math.PI * radius * radius;
        break;
      case 'horseshoe':
        // 简化计算：近似为椭圆
        const width = crossSection.dimensions.width || 7;
        const height = crossSection.dimensions.height || 8;
        crossSectionArea = Math.PI * (width / 2) * (height / 2) * 0.85; // 马蹄形系数
        break;
      case 'rectangular':
        crossSectionArea = (crossSection.dimensions.width || 6) * (crossSection.dimensions.height || 5);
        break;
    }
    
    return crossSectionArea * tunnel.length;
  };

  // 计算表面积
  const calculateSurfaceArea = (params: TunnelParameters): number => {
    const { crossSection, tunnel } = params;
    let perimeter = 0;
    
    switch (crossSection.type) {
      case 'circular':
        const diameter = crossSection.dimensions.diameter || 6;
        perimeter = Math.PI * diameter;
        break;
      case 'horseshoe':
        const width = crossSection.dimensions.width || 7;
        const height = crossSection.dimensions.height || 8;
        perimeter = Math.PI * (width + height) * 0.6; // 马蹄形周长近似
        break;
      case 'rectangular':
        const w = crossSection.dimensions.width || 6;
        const h = crossSection.dimensions.height || 5;
        perimeter = 2 * (w + h);
        break;
    }
    
    return perimeter * tunnel.length;
  };

  // 计算衬砌体积
  const calculateLiningVolume = (params: TunnelParameters): number => {
    const surfaceArea = calculateSurfaceArea(params);
    return surfaceArea * params.lining.thickness;
  };

  // 计算估算成本
  const calculateCost = (params: TunnelParameters): number => {
    const volume = calculateVolume(params);
    const liningVolume = calculateLiningVolume(params);
    
    // 简化的成本计算（单位：万元）
    const excavationCost = volume * 0.5; // 开挖成本
    const liningCost = liningVolume * getMaterialCostFactor(params.lining.material);
    
    return excavationCost + liningCost;
  };

  // 获取材料成本系数
  const getMaterialCostFactor = (material: string): number => {
    switch (material) {
      case 'concrete': return 2.0;
      case 'steel': return 8.0;
      case 'composite': return 12.0;
      case 'shotcrete': return 1.5;
      default: return 2.0;
    }
  };

  return (
    <div style={{ height: '100vh', padding: '16px' }}>
      <Row gutter={16} style={{ height: '100%' }}>
        {/* 左侧：隧道建模界面 */}
        <Col span={16} style={{ height: '100%' }}>
          <Card 
            title="隧道建模系统" 
            style={{ height: '100%' }}
            bodyStyle={{ height: 'calc(100% - 60px)', padding: '16px' }}
          >
            <TunnelModelingModule
              onParametersChange={handleParametersChange}
              onGenerate={handleGenerate}
              status={modelingStatus}
            />
          </Card>
        </Col>
        
        {/* 右侧：参数显示和预览 */}
        <Col span={8} style={{ height: '100%' }}>
          <Card 
            title="参数预览" 
            style={{ height: '100%' }}
            bodyStyle={{ height: 'calc(100% - 60px)', overflow: 'auto' }}
          >
            {tunnelParams ? (
              <div>
                <h4>截面参数</h4>
                <p>类型: {tunnelParams.crossSection.type}</p>
                <p>尺寸: {JSON.stringify(tunnelParams.crossSection.dimensions)}</p>
                
                <h4>衬砌参数</h4>
                <p>材料: {tunnelParams.lining.material}</p>
                <p>厚度: {tunnelParams.lining.thickness}m</p>
                
                <h4>隧道参数</h4>
                <p>长度: {tunnelParams.tunnel.length}m</p>
                <p>埋深: {tunnelParams.tunnel.depth}m</p>
                <p>纵坡: {tunnelParams.tunnel.gradient}%</p>
                
                {modelingStatus === 'completed' && (
                  <>
                    <h4>计算结果</h4>
                    <p>开挖体积: {calculateVolume(tunnelParams).toFixed(2)}m³</p>
                    <p>衬砌体积: {calculateLiningVolume(tunnelParams).toFixed(2)}m³</p>
                    <p>估算成本: {calculateCost(tunnelParams).toFixed(2)}万元</p>
                  </>
                )}
              </div>
            ) : (
              <p>请配置隧道参数...</p>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TunnelModelingExample;