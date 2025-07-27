/**
 * 隧道集成面板 - 临时占位组件
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export interface TunnelIntegrationPanelProps {
  state: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    length: number;
    inclination: number;
  };
  onStateUpdate: (updates: any) => void;
}

export const TunnelIntegrationPanel: React.FC<TunnelIntegrationPanelProps> = ({ state, onStateUpdate }) => {
  return (
    <Card title="隧道集成面板">
      <Title level={4}>隧道集成功能开发中...</Title>
    </Card>
  );
};

export default TunnelIntegrationPanel;