import React from 'react';
import { Button, Tooltip, Radio, Space, Switch } from 'antd';
import { 
  ArrowsAltOutlined, 
  RotateRightOutlined, 
  ColumnWidthOutlined, 
  BorderOuterOutlined, 
  EnvironmentOutlined
} from '@ant-design/icons';
import { GizmoMode } from '../hooks/useComponentGizmo';
import { GridSettings } from '../hooks/useGridSettings';

interface ViewportControlsProps {
  gizmoMode: GizmoMode;
  onGizmoModeChange: (mode: GizmoMode) => void;
  gridSettings: GridSettings;
  onToggleGridVisibility: () => void;
  onToggleGridSnap: () => void;
}

const ViewportControls: React.FC<ViewportControlsProps> = ({ 
  gizmoMode, 
  onGizmoModeChange,
  gridSettings,
  onToggleGridVisibility,
  onToggleGridSnap
}) => {
  const styles = {
    viewportControls: {
      position: 'absolute' as const,
      bottom: '20px',
      left: '20px',
      backgroundColor: 'var(--bg-secondary)',
      padding: '10px',
      borderRadius: '8px',
      zIndex: 100,
      boxShadow: '0 4px 12px var(--shadow-color)',
      border: '1px solid var(--border-color)'
    },
    controlGroup: {
      marginBottom: '10px',
    },
    heading: {
      margin: '0 0 5px 0',
      fontSize: '14px',
    },
    switchLabel: {
      marginLeft: '8px',
    }
  };

  return (
    <div style={styles.viewportControls} className="theme-card">
      <div style={styles.controlGroup}>
        <h4 style={styles.heading} className="theme-text-primary">变换工具</h4>
        <Radio.Group 
          value={gizmoMode} 
          onChange={e => onGizmoModeChange(e.target.value)}
          buttonStyle="solid"
          className="theme-form"
        >
          <Tooltip title="移动 (G)">
            <Radio.Button value={GizmoMode.TRANSLATE} className="theme-btn">
              <ArrowsAltOutlined />
            </Radio.Button>
          </Tooltip>
          <Tooltip title="旋转 (R)">
            <Radio.Button value={GizmoMode.ROTATE} className="theme-btn">
              <RotateRightOutlined />
            </Radio.Button>
          </Tooltip>
          <Tooltip title="缩放 (S)">
            <Radio.Button value={GizmoMode.SCALE} className="theme-btn">
              <ColumnWidthOutlined />
            </Radio.Button>
          </Tooltip>
        </Radio.Group>
      </div>
      
      <div style={styles.controlGroup}>
        <h4 style={styles.heading} className="theme-text-primary">网格选项</h4>
        <Space direction="vertical" size={8}>
          <div>
            <Switch 
              size="small" 
              checked={gridSettings.visible} 
              onChange={onToggleGridVisibility}
            />
            <span style={styles.switchLabel} className="theme-text-secondary">显示网格</span>
          </div>
          <div>
            <Switch 
              size="small" 
              checked={gridSettings.snapEnabled} 
              onChange={onToggleGridSnap}
            />
            <span style={styles.switchLabel} className="theme-text-secondary">吸附到网格</span>
          </div>
        </Space>
      </div>
      
      <div style={styles.controlGroup}>
        <h4 style={styles.heading} className="theme-text-primary">视图选项</h4>
        <Space>
          <Tooltip title="显示坐标轴">
            <Button icon={<EnvironmentOutlined />} className="theme-btn" />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

export default ViewportControls; 