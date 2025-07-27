/**
 * 开挖设计面板 - 临时占位组件
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export interface ExcavationDesignPanelProps {
  state: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    stages: number;
    volume: number;
  };
  onStateUpdate: (updates: any) => void;
}

export const ExcavationDesignPanel: React.FC<ExcavationDesignPanelProps> = ({ state, onStateUpdate }) => {
  return (
    <Card title="开挖设计面板">
      <Title level={4}>开挖设计功能开发中...</Title>
    </Card>
  );
};

export default ExcavationDesignPanel;