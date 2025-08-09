/**
 * 网格生成工具栏
 * 3号计算专家 - 网格控制工具集
 */

import React from 'react';
import { Tooltip, Button, Space, Progress, Popover, InputNumber, Divider } from 'antd';
import {
  AppstoreAddOutlined,
  SettingOutlined,
  BugOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

interface MeshingToolbarProps {
  onGenerateMesh?: () => void;
  onMeshSettings?: () => void;
  onMeshValidation?: () => void;
  onMeshPreview?: () => void;
  onMeshStart?: () => void;
  onMeshPause?: () => void;
  onMeshReset?: () => void;
  disabled?: boolean;
  className?: string;
  geometryLoaded?: boolean;
  meshGenerated?: boolean;
  onOpenAlgorithmConfig?: () => void;
  onShowQualityAnalysis?: () => void;
  onOpenPhysicalGroups?: () => void;
  onExportMesh?: (format: any) => void;
  onRefreshGeometry?: () => void;
  onShowMeshStatistics?: () => void;
  meshProgress?: number;
  meshQualityScore?: number;
  throttleMs?: number;
  onThrottleChange?: (v:number)=>void;
  onRefineMesh?: ()=>void;
}

export const MeshingToolbar: React.FC<MeshingToolbarProps> = ({
  onGenerateMesh,
  onMeshSettings,
  onMeshValidation,
  onMeshPreview,
  onMeshStart,
  onMeshPause,
  onMeshReset,
  disabled = false,
  className = '',
  meshProgress,
  meshQualityScore,
  throttleMs,
  onThrottleChange,
  onRefineMesh
}) => {
  const quality = typeof meshQualityScore === 'number' ? meshQualityScore : undefined;
  return (
    <div className={`meshing-toolbar ${className}`}>
      <style>{`
        .meshing-toolbar {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(0, 217, 255, 0.2);
          border-radius: 8px;
          padding: 8px;
          backdrop-filter: blur(10px);
        }
        
        .meshing-toolbar .ant-btn {
          background: rgba(0, 217, 255, 0.1) !important;
          border: 1px solid rgba(0, 217, 255, 0.3) !important;
          color: #00d9ff !important;
        }
        
        .meshing-toolbar .ant-btn:hover {
          background: rgba(0, 217, 255, 0.2) !important;
          border-color: #00d9ff !important;
          box-shadow: 0 0 10px rgba(0, 217, 255, 0.3);
        }
        
        .meshing-toolbar .ant-btn:disabled {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.3) !important;
        }
      `}</style>

      <Space size="small" direction="vertical" style={{ width: 56 }}>
        <div style={{ textAlign:'center', fontSize:10, color:'#00d9ff', letterSpacing:.5 }}>MESH</div>
        {typeof meshProgress === 'number' && (
          <div style={{ width:'100%' }}>
            <Progress
              percent={Math.min(100, Math.round(meshProgress))}
              size="small"
              showInfo={false}
              strokeColor="#00d9ff"
              trailColor="rgba(255,255,255,0.08)"
              style={{ marginBottom:4 }}
            />
            <div style={{ fontSize:10, textAlign:'center', color:'#00d9ffaa' }}>{Math.round(meshProgress)}%</div>
          </div>
        )}
        {quality !== undefined && (
          <div style={{ fontSize:10, textAlign:'center', color: quality>80? '#52c41a':'#faad14' }}>Q{quality}</div>
        )}
        <Divider style={{ margin:'4px 0', borderColor:'rgba(255,255,255,0.12)' }} />
        <Tooltip title="生成网格">
          <Button
            type="primary"
            icon={<AppstoreAddOutlined />}
            onClick={onGenerateMesh}
            disabled={disabled}
            size="small"
          >
            生成
          </Button>
        </Tooltip>

        <Tooltip title="网格设置">
          <Button
            icon={<SettingOutlined />}
            onClick={onMeshSettings}
            disabled={disabled}
            size="small"
          >
            设置
          </Button>
        </Tooltip>

        <Tooltip title="网格验证">
          <Button
            icon={<BugOutlined />}
            onClick={onMeshValidation}
            disabled={disabled}
            size="small"
          >
            验证
          </Button>
        </Tooltip>

        <Tooltip title="预览">
          <Button
            icon={<CheckCircleOutlined />}
            onClick={onMeshPreview}
            disabled={disabled}
            size="small"
          >
            预览
          </Button>
        </Tooltip>

        <Tooltip title="开始生成">
          <Button
            icon={<PlayCircleOutlined />}
            onClick={onMeshStart}
            disabled={disabled}
            size="small"
          />
        </Tooltip>

        <Tooltip title="暂停生成">
          <Button
            icon={<PauseCircleOutlined />}
            onClick={onMeshPause}
            disabled={disabled}
            size="small"
          />
        </Tooltip>

        <Tooltip title="重置网格">
          <Button
            icon={<ReloadOutlined />}
            onClick={onMeshReset}
            disabled={disabled}
            size="small"
          />
        </Tooltip>
        <Tooltip title="网格细化 (Refine)">
          <Button
            icon={<CheckCircleOutlined />}
            onClick={onRefineMesh}
            disabled={disabled}
            size="small"
          />
        </Tooltip>
        <Popover
          trigger="click"
          content={(<div style={{ width:140 }}>
            <div style={{ fontSize:12, marginBottom:4 }}>进度节流(ms)</div>
            <InputNumber min={16} max={2000} step={16} size="small" value={throttleMs} style={{ width:'100%' }} onChange={(v)=>{ if(typeof v==='number') onThrottleChange?.(v); }} />
            <div style={{ fontSize:10, color:'#999', marginTop:4 }}>降低可减少 UI 刷新</div>
          </div>)}
        >
          <Button size="small">节流</Button>
        </Popover>
      </Space>
    </div>
  );
};

export default MeshingToolbar;