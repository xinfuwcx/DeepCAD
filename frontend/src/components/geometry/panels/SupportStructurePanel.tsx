/**
 * 支护结构面板 - 临时占位组件
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export interface SupportStructurePanelProps {
  state: {
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    diaphragmWalls: number;
    anchors: number;
    steelStruts: number;
  };
  onStateUpdate: (updates: any) => void;
}

export const SupportStructurePanel: React.FC<SupportStructurePanelProps> = ({ state, onStateUpdate }) => {
  return (
    <Card title="支护结构面板">
      <Title level={4}>支护结构功能开发中...</Title>
    </Card>
  );
};

export default SupportStructurePanel;