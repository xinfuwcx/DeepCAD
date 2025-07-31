/**
 * 网格生成工具栏
 * 3号计算专家 - 网格控制工具集
 */

import React from 'react';
import { Tooltip, Button, Space } from 'antd';
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
  className = ''
}) => {
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

      <Space size="small">
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
      </Space>
    </div>
  );
};

export default MeshingToolbar;