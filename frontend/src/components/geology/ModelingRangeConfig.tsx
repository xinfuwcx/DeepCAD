/**
 * 土体计算域参数配置
 * 专业地质力学建模的计算域定义界面
 */

import React, { useState } from 'react';
import DomainConfigPanel from './DomainConfigPanel';

interface BoreholeExtent {
  x_range: [number, number];
  y_range: [number, number];
  z_range: [number, number];
}

interface ComputationDomain {
  x_range: [number, number];
  y_range: [number, number];
  z_range: [number, number];
  volume?: number;
}

interface ModelingRangeConfigProps {
  boreholeExtent?: BoreholeExtent;
  onDomainChange?: (domain: ComputationDomain) => void;
  isLoading?: boolean;
}

const ModelingRangeConfig: React.FC<ModelingRangeConfigProps> = ({
  boreholeExtent,
  onDomainChange,
  isLoading = false
}) => {
  // 土体计算域配置状态
  const [domainConfig, setDomainConfig] = useState({
    domain: {
      xExtend: 100,
      yExtend: 80,
      depth: 30,
      bufferRatio: 20
    },
    display: {
      showBoreholes: true,
      showSoilBody: false, // 暂时禁用，因为还没有土体域
      showBoundary: true,
      showGrid: false
    }
  });

  // 当配置变化时，通知父组件
  const handleConfigChange = (newConfig: typeof domainConfig) => {
    setDomainConfig(newConfig);
    
    // 转换为父组件期望的格式
    const { domain } = newConfig;
    const computationDomain: ComputationDomain = {
      x_range: [-domain.xExtend/2, domain.xExtend/2],
      y_range: [-domain.yExtend/2, domain.yExtend/2],
      z_range: [-domain.depth, 0],
      volume: domain.xExtend * domain.yExtend * domain.depth
    };
    
    onDomainChange?.(computationDomain);
  };

  return (
    <DomainConfigPanel 
      config={domainConfig} 
      onChange={handleConfigChange} 
    />
  );
};

export default ModelingRangeConfig;