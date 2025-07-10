import React, { useState } from 'react';
import { Button, Tooltip, Popover, Space, Divider, Switch, Slider, Select, Radio } from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  CameraOutlined,
  VideoCameraOutlined,
  EyeOutlined,
  BorderOutlined,
  DragOutlined,
  ScissorOutlined,
  LineOutlined,
  ColumnWidthOutlined,
  BgColorsOutlined,
  SettingOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';

const { Option } = Select;

interface ViewportControlsProps {
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  viewportRef: React.RefObject<HTMLDivElement>;
}

const ViewportControls: React.FC<ViewportControlsProps> = ({
  onToggleFullscreen,
  isFullscreen,
  viewportRef,
}) => {
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { 
    viewSettings, 
    updateViewSettings,
    resetView,
  } = useSceneStore(
    useShallow(state => ({
      viewSettings: state.viewSettings,
      updateViewSettings: state.updateViewSettings,
      resetView: state.resetView,
    }))
  );

  // 截图功能
  const handleScreenshot = () => {
    if (!viewportRef.current) return;
    
    // 这里是一个简单的示例，实际实现可能需要使用 html2canvas 或其他库
    try {
      const canvas = viewportRef.current.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `deepcad-screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  // 开始录制功能
  const handleStartRecording = () => {
    // 实际实现需要使用 MediaRecorder API
    setActiveControl('recording');
    // 这里应该有录制逻辑
  };

  // 停止录制功能
  const handleStopRecording = () => {
    setActiveControl(null);
    // 这里应该有停止录制逻辑
  };

  // 切换测量工具
  const handleToggleMeasure = (tool: string) => {
    if (activeControl === tool) {
      setActiveControl(null);
    } else {
      setActiveControl(tool);
    }
  };

  // 渲染设置面板
  const renderSettingsPanel = () => (
    <div style={{ width: 250 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>渲染模式</div>
        <Radio.Group
          value={viewSettings.renderMode}
          onChange={(e) => updateViewSettings({ renderMode: e.target.value })}
          buttonStyle="solid"
          size="small"
          style={{ width: '100%' }}
        >
          <Radio.Button value="solid" style={{ width: '33%', textAlign: 'center' }}>实体</Radio.Button>
          <Radio.Button value="wireframe" style={{ width: '33%', textAlign: 'center' }}>线框</Radio.Button>
          <Radio.Button value="points" style={{ width: '34%', textAlign: 'center' }}>点云</Radio.Button>
        </Radio.Group>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>背景颜色</div>
        <Select 
          value={viewSettings.backgroundColor} 
          onChange={(value) => updateViewSettings({ backgroundColor: value })}
          style={{ width: '100%' }}
          size="small"
        >
          <Option value="dark">深色</Option>
          <Option value="light">浅色</Option>
          <Option value="gradient">渐变</Option>
          <Option value="transparent">透明</Option>
        </Select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>环境光强度</div>
        <Slider 
          min={0} 
          max={2} 
          step={0.1} 
          value={viewSettings.ambientIntensity} 
          onChange={(value) => updateViewSettings({ ambientIntensity: value })}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>阴影</span>
          <Switch 
            checked={viewSettings.shadows} 
            onChange={(checked) => updateViewSettings({ shadows: checked })}
            size="small"
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>抗锯齿</span>
          <Switch 
            checked={viewSettings.antialiasing} 
            onChange={(checked) => updateViewSettings({ antialiasing: checked })}
            size="small"
          />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>坐标轴</span>
          <Switch 
            checked={viewSettings.showAxes} 
            onChange={(checked) => updateViewSettings({ showAxes: checked })}
            size="small"
          />
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <Button 
        icon={<ReloadOutlined />} 
        onClick={resetView} 
        size="small" 
        block
      >
        重置视图
      </Button>
    </div>
  );

  return (
    <div className="viewport-controls" style={{ 
      position: 'absolute', 
      top: 16, 
      right: 16, 
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* 主要控制按钮 */}
      <Space direction="vertical" size={8}>
        <Tooltip title={isFullscreen ? "退出全屏" : "全屏"} placement="left">
          <Button
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={onToggleFullscreen}
            type="default"
            shape="circle"
            className="glass-effect"
          />
        </Tooltip>

        <Tooltip title="截图" placement="left">
          <Button
            icon={<CameraOutlined />}
            onClick={handleScreenshot}
            type="default"
            shape="circle"
            className="glass-effect"
          />
        </Tooltip>

        <Tooltip title={activeControl === 'recording' ? "停止录制" : "开始录制"} placement="left">
          <Button
            icon={<VideoCameraOutlined />}
            onClick={activeControl === 'recording' ? handleStopRecording : handleStartRecording}
            type={activeControl === 'recording' ? "primary" : "default"}
            shape="circle"
            danger={activeControl === 'recording'}
            className="glass-effect"
          />
        </Tooltip>

        <Divider style={{ margin: '4px 0', borderColor: 'rgba(255,255,255,0.2)' }} />

        <Tooltip title="视图设置" placement="left">
          <Popover
            content={renderSettingsPanel}
            title="视图设置"
            trigger="click"
            placement="leftTop"
            open={showSettings}
            onOpenChange={setShowSettings}
          >
            <Button
              icon={<SettingOutlined />}
              type={showSettings ? "primary" : "default"}
              shape="circle"
              className="glass-effect"
            />
          </Popover>
        </Tooltip>
      </Space>

      {/* 测量工具按钮组 */}
      <Space direction="vertical" size={8} style={{ marginTop: 8 }}>
        <Tooltip title="距离测量" placement="left">
          <Button
            icon={<LineOutlined />}
            onClick={() => handleToggleMeasure('distance')}
            type={activeControl === 'distance' ? "primary" : "default"}
            shape="circle"
            className="glass-effect"
          />
        </Tooltip>

        <Tooltip title="角度测量" placement="left">
          <Button
            icon={<ColumnWidthOutlined />}
            onClick={() => handleToggleMeasure('angle')}
            type={activeControl === 'angle' ? "primary" : "default"}
            shape="circle"
            className="glass-effect"
          />
        </Tooltip>

        <Tooltip title="区域测量" placement="left">
          <Button
            icon={<BorderOutlined />}
            onClick={() => handleToggleMeasure('area')}
            type={activeControl === 'area' ? "primary" : "default"}
            shape="circle"
            className="glass-effect"
          />
        </Tooltip>

        <Tooltip title="剖切平面" placement="left">
          <Button
            icon={<ScissorOutlined />}
            onClick={() => handleToggleMeasure('section')}
            type={activeControl === 'section' ? "primary" : "default"}
            shape="circle"
            className="glass-effect"
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default ViewportControls; 