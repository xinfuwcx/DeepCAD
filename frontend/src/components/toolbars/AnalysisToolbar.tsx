/**
 * 计算分析工具栏 (AnalysisToolbar)
 * 3号计算专家 - 提供求解控制与监视入口
 */
import React from 'react';
import { Button, Space, Tooltip, Progress, Popover, InputNumber, Divider } from 'antd';
import {
  PlayCircleOutlined,
  StopOutlined,
  SettingOutlined,
  MonitorOutlined,
  BarChartOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

export interface AnalysisToolbarProps {
  computationStatus?: 'idle' | 'running' | 'completed' | 'error';
  meshingStatus?: string;
  analysisProgress?: number;
  onStartComputation?: () => void;
  onStopComputation?: () => void;
  onShowMonitor?: () => void;
  onOpenSolverConfig?: () => void;
  onShowResultsOverview?: () => void;
  onResetComputation?: () => void;
  disabled?: boolean;
  className?: string;
  throttleMs?: number;
  onThrottleChange?: (v:number)=>void;
  iteration?: number;
  estRemainingSec?: number;
}

const statusColor: Record<string,string> = {
  idle: 'rgba(255,255,255,0.25)',
  running: '#faad14',
  completed: '#52c41a',
  error: '#ff4d4f'
};

const AnalysisToolbar: React.FC<AnalysisToolbarProps> = ({
  computationStatus='idle',
  analysisProgress=0,
  onStartComputation,
  onStopComputation,
  onShowMonitor,
  onOpenSolverConfig,
  onShowResultsOverview,
  onResetComputation,
  disabled=false,
  className='',
  throttleMs,
  onThrottleChange,
  iteration,
  estRemainingSec
}) => {
  const isRunning = computationStatus === 'running';
  const isCompleted = computationStatus === 'completed';

  return (
    <div className={`analysis-toolbar ${className}`}>      
      <style>{`
        .analysis-toolbar {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(250,173,20,0.25);
          border-radius: 8px;
          padding: 8px;
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .analysis-toolbar .ant-btn {
          background: rgba(250,173,20,0.12) !important;
          border: 1px solid rgba(250,173,20,0.35) !important;
          color: #faad14 !important;
        }
        .analysis-toolbar .ant-btn:hover:not(:disabled) {
          background: rgba(250,173,20,0.25) !important;
          border-color: #faad14 !important;
          box-shadow: 0 0 10px rgba(250,173,20,0.35);
        }
        .analysis-toolbar .ant-btn:disabled {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.12) !important;
          color: rgba(255,255,255,0.35) !important;
        }
        .analysis-toolbar .progress-wrap { display:flex; flex-direction:column; gap:4px; }
        .analysis-toolbar .status-dot { width:8px; height:8px; border-radius:50%; background:${statusColor[computationStatus]||'#999'}; box-shadow:0 0 4px ${statusColor[computationStatus]||'#999'}; }
      `}</style>

      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#fff', opacity:.85, justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span className="status-dot" />
          <span style={{ letterSpacing: '.5px' }}>分析</span>
        </div>
        <Popover trigger="click" content={(<div style={{ width:150 }}>
          <div style={{ fontSize:12, marginBottom:4 }}>进度节流(ms)</div>
            <InputNumber min={16} max={2000} step={16} size="small" value={throttleMs} style={{ width:'100%' }} onChange={(v)=>{ if(typeof v==='number') onThrottleChange?.(v); }} />
            <div style={{ fontSize:10, color:'#999', marginTop:4 }}>调高可减轻刷新负担</div>
        </div>)}>
          <Button size="small" style={{ fontSize:10, padding:'0 6px', height:22 }}>节流</Button>
        </Popover>
      </div>

      <Space direction="vertical" size={6} style={{ width:'100%' }}>
        <Space wrap size={4} style={{ display:'flex', justifyContent:'center' }}>
          {!isRunning && !isCompleted && (
            <Tooltip title="开始分析">
              <Button size="small" icon={<PlayCircleOutlined />} onClick={onStartComputation} disabled={disabled} />
            </Tooltip>
          )}
          {isRunning && (
            <Tooltip title="停止">
              <Button size="small" icon={<StopOutlined />} onClick={onStopComputation} disabled={disabled} />
            </Tooltip>
          )}
          {isCompleted && (
            <Tooltip title="重新开始">
              <Button size="small" icon={<ThunderboltOutlined />} onClick={onStartComputation} disabled={disabled} />
            </Tooltip>
          )}
          <Tooltip title="求解器配置">
            <Button size="small" icon={<SettingOutlined />} onClick={onOpenSolverConfig} disabled={disabled || isRunning} />
          </Tooltip>
          <Tooltip title="监视进度">
            <Button size="small" icon={<MonitorOutlined />} onClick={onShowMonitor} disabled={disabled} />
          </Tooltip>
          <Tooltip title="结果概览">
            <Button size="small" icon={<BarChartOutlined />} onClick={onShowResultsOverview} disabled={disabled} />
          </Tooltip>
          <Tooltip title="重置">
            <Button size="small" icon={<ReloadOutlined />} onClick={onResetComputation} disabled={disabled || isRunning} />
          </Tooltip>
        </Space>
        <div className="progress-wrap">
          <Progress percent={Math.min(100, Math.round(analysisProgress))} size="small" showInfo={false} strokeColor="#faad14" trailColor="rgba(255,255,255,0.08)" />
          <div style={{ fontSize:10, textAlign:'center', color:'#faad14', opacity:.8 }}>{isRunning?`运行 ${Math.round(analysisProgress)}%`: isCompleted? '已完成' : '待机'}</div>
          {(iteration!==undefined || estRemainingSec!==undefined) && (
            <div style={{ fontSize:9, textAlign:'center', color:'#ffffff80' }}>
              {iteration!==undefined && <span>Iter {iteration}</span>} {estRemainingSec!==undefined && <span style={{ marginLeft:4 }}>剩余~{estRemainingSec}s</span>}
            </div>
          )}
        </div>
      </Space>
    </div>
  );
};

export default AnalysisToolbar;
