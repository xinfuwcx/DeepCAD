/**
 * 地质建模面板 - 临时占位组件
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export interface GeologyModelingPanelProps {
  state: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    boreholeCount: number;
    layerCount: number;
  };
  onStateUpdate: (updates: any) => void;
}

export const GeologyModelingPanel: React.FC<GeologyModelingPanelProps> = ({ state, onStateUpdate }) => {
  return (
    <Card title="地质建模面板">
      <Title level={4}>地质建模功能开发中...</Title>
    </Card>
  );
};

export default GeologyModelingPanel;