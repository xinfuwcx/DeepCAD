/** 物理AI工具栏 */
import React from 'react';
import { Button, Tooltip, Space } from 'antd';
import { RobotOutlined, PlayCircleOutlined, StopOutlined, LineChartOutlined, RocketOutlined, ReloadOutlined } from '@ant-design/icons';
import { dispatchCommand } from '../../core/eventBus';

export interface PhysicsAIToolbarProps {
  aiOptimizationActive?: boolean;
  aiAnalysisComplete?: boolean;
  currentRecommendations?: any[];
  analysisDataReady?: boolean;
  onStartAIOptimization?: () => void;
  onShowAISuggestions?: () => void;
  onOpenParameterTuning?: () => void;
  onToggleAIAssistant?: (enabled: boolean) => void;
}

const PhysicsAIToolbar: React.FC<PhysicsAIToolbarProps> = ({
  aiOptimizationActive=false,
  aiAnalysisComplete=false,
  analysisDataReady=true,
  onStartAIOptimization,
  onShowAISuggestions,
  onOpenParameterTuning,
  onToggleAIAssistant
}) => {
  const disabled = !analysisDataReady;
  return (
    <div className="physics-ai-toolbar">
      <style>{`
        .physics-ai-toolbar { background:rgba(255,255,255,0.05); border:1px solid rgba(82,196,26,0.3); border-radius:8px; padding:8px; backdrop-filter:blur(10px); display:flex; flex-direction:column; gap:8px; }
        .physics-ai-toolbar .ant-btn { background:rgba(82,196,26,0.12)!important; border:1px solid rgba(82,196,26,0.35)!important; color:#52c41a!important; }
        .physics-ai-toolbar .ant-btn:hover:not(:disabled){ background:rgba(82,196,26,0.25)!important; border-color:#52c41a!important; box-shadow:0 0 10px rgba(82,196,26,0.35);}        
        .physics-ai-toolbar .ant-btn:disabled { background:rgba(255,255,255,0.05)!important; border-color:rgba(255,255,255,0.12)!important; color:rgba(255,255,255,0.35)!important; }
      `}</style>
      <Space direction="vertical" size={6} style={{ width:'100%' }}>
        <Tooltip title={aiOptimizationActive? '停止优化' : '启动优化'}>
          <Button size="small" icon={aiOptimizationActive? <StopOutlined /> : <PlayCircleOutlined />} onClick={() => {
            if (aiOptimizationActive) {
              dispatchCommand('physicsAI:stop');
              onToggleAIAssistant?.(false);
            } else {
              dispatchCommand('physicsAI:start');
              onStartAIOptimization?.();
              onToggleAIAssistant?.(true);
            }
          }} disabled={disabled} />
        </Tooltip>
        <Tooltip title="调参面板">
          <Button size="small" icon={<RobotOutlined />} onClick={() => { dispatchCommand('physicsAI:params'); onOpenParameterTuning?.(); }} disabled={disabled || aiOptimizationActive} />
        </Tooltip>
        <Tooltip title="推荐建议">
          <Button size="small" icon={<LineChartOutlined />} onClick={() => { dispatchCommand('physicsAI:suggestions'); onShowAISuggestions?.(); }} disabled={disabled} />
        </Tooltip>
        <Tooltip title="快速预设">
          <Button size="small" icon={<RocketOutlined />} onClick={() => dispatchCommand('physicsAI:quickPreset')} disabled={disabled || aiOptimizationActive} />
        </Tooltip>
        <Tooltip title="重置">
          <Button size="small" icon={<ReloadOutlined />} onClick={() => dispatchCommand('physicsAI:reset')} disabled={aiOptimizationActive} />
        </Tooltip>
      </Space>
    </div>
  );
};

export default PhysicsAIToolbar;
