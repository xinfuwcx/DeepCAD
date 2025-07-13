import React, { useState, useRef, useEffect } from 'react';
import { Button, Space, Dropdown, Menu, Slider, Card, Switch, Select, Divider } from 'antd';
import {
  FullscreenOutlined,
  SettingOutlined,
  BorderOutlined,
  ColumnHeightOutlined,
  AimOutlined,
  CameraOutlined,
  RotateLeftOutlined,
  ZoomInOutlined,
  EyeOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  BlockOutlined
} from '@ant-design/icons';
import { GlassCard, GlassButton } from '../ui/GlassComponents';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

const { Option } = Select;

interface CAE3DViewportProps {
  className?: string;
  showToolbar?: boolean;
  onViewChange?: (viewConfig: ViewConfig) => void;
}

interface ViewConfig {
  renderMode: 'wireframe' | 'solid' | 'transparent';
  showGrid: boolean;
  showAxes: boolean;
  showBoundingBox: boolean;
  backgroundColor: string;
  lighting: 'ambient' | 'directional' | 'point';
  cameraType: 'perspective' | 'orthographic';
  fieldOfView: number;
}

interface ViewportControls {
  zoom: number;
  rotation: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

const CAE3DViewport: React.FC<CAE3DViewportProps> = ({
  className,
  showToolbar = true,
  onViewChange
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 视口配置状态
  const [viewConfig, setViewConfig] = useState<ViewConfig>({
    renderMode: 'solid',
    showGrid: true,
    showAxes: true,
    showBoundingBox: false,
    backgroundColor: '#1a1a1a',
    lighting: 'directional',
    cameraType: 'perspective',
    fieldOfView: 45
  });

  // 视口控制状态
  const [controls, setControls] = useState<ViewportControls>({
    zoom: 1.0,
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 10 },
    target: { x: 0, y: 0, z: 0 }
  });

  // 交互状态
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);

  const { theme } = useUIStore(
    useShallow(state => ({
      theme: state.theme
    }))
  );

  // 预设视角
  const viewPresets = [
    { name: '前视图', rotation: { x: 0, y: 0, z: 0 } },
    { name: '后视图', rotation: { x: 0, y: 180, z: 0 } },
    { name: '左视图', rotation: { x: 0, y: -90, z: 0 } },
    { name: '右视图', rotation: { x: 0, y: 90, z: 0 } },
    { name: '顶视图', rotation: { x: -90, y: 0, z: 0 } },
    { name: '底视图', rotation: { x: 90, y: 0, z: 0 } },
    { name: '等轴视图', rotation: { x: -30, y: 45, z: 0 } }
  ];

  // 渲染模式选项
  const renderModes = [
    { value: 'wireframe', label: '线框模式', icon: <BorderOutlined /> },
    { value: 'solid', label: '实体模式', icon: <BlockOutlined /> },
    { value: 'transparent', label: '透明模式', icon: <EyeOutlined /> }
  ];

  // 更新视口配置
  const updateViewConfig = (updates: Partial<ViewConfig>) => {
    const newConfig = { ...viewConfig, ...updates };
    setViewConfig(newConfig);
    onViewChange?.(newConfig);
  };

  // 重置视角
  const resetView = () => {
    setControls({
      zoom: 1.0,
      rotation: { x: -30, y: 45, z: 0 },
      position: { x: 0, y: 0, z: 10 },
      target: { x: 0, y: 0, z: 0 }
    });
  };

  // 适配视口
  const fitToScreen = () => {
    // 计算包围盒并调整相机位置
    setControls(prev => ({
      ...prev,
      zoom: 0.8,
      position: { x: 0, y: 0, z: 15 }
    }));
  };

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewportRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 截图功能
  const takeScreenshot = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `cae-screenshot-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  // 设置面板菜单
  const settingsMenu = (
    <Card className="viewport-settings-panel" style={{ width: 300 }}>
      <div className="space-y-4">
        {/* 渲染模式 */}
        <div>
          <label className="text-sm font-medium text-secondary mb-2 block">渲染模式</label>
          <Select
            value={viewConfig.renderMode}
            onChange={(value) => updateViewConfig({ renderMode: value })}
            className="w-full"
          >
            {renderModes.map(mode => (
              <Option key={mode.value} value={mode.value}>
                <Space>
                  {mode.icon}
                  {mode.label}
                </Space>
              </Option>
            ))}
          </Select>
        </div>

        {/* 显示选项 */}
        <div>
          <label className="text-sm font-medium text-secondary mb-2 block">显示选项</label>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">网格线</span>
              <Switch
                size="small"
                checked={viewConfig.showGrid}
                onChange={(checked) => updateViewConfig({ showGrid: checked })}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">坐标轴</span>
              <Switch
                size="small"
                checked={viewConfig.showAxes}
                onChange={(checked) => updateViewConfig({ showAxes: checked })}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">边界框</span>
              <Switch
                size="small"
                checked={viewConfig.showBoundingBox}
                onChange={(checked) => updateViewConfig({ showBoundingBox: checked })}
              />
            </div>
          </div>
        </div>

        {/* 相机设置 */}
        <div>
          <label className="text-sm font-medium text-secondary mb-2 block">相机类型</label>
          <Select
            value={viewConfig.cameraType}
            onChange={(value) => updateViewConfig({ cameraType: value })}
            className="w-full"
          >
            <Option value="perspective">透视相机</Option>
            <Option value="orthographic">正交相机</Option>
          </Select>
        </div>

        {/* 视场角 */}
        {viewConfig.cameraType === 'perspective' && (
          <div>
            <label className="text-sm font-medium text-secondary mb-2 block">
              视场角: {viewConfig.fieldOfView}°
            </label>
            <Slider
              min={10}
              max={120}
              value={viewConfig.fieldOfView}
              onChange={(value) => updateViewConfig({ fieldOfView: value })}
            />
          </div>
        )}

        {/* 光照设置 */}
        <div>
          <label className="text-sm font-medium text-secondary mb-2 block">光照模式</label>
          <Select
            value={viewConfig.lighting}
            onChange={(value) => updateViewConfig({ lighting: value })}
            className="w-full"
          >
            <Option value="ambient">环境光</Option>
            <Option value="directional">方向光</Option>
            <Option value="point">点光源</Option>
          </Select>
        </div>

        {/* 性能模式 */}
        <div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-secondary">性能模式</span>
            <Switch
              size="small"
              checked={performanceMode}
              onChange={setPerformanceMode}
            />
          </div>
          <p className="text-xs text-secondary mt-1">
            启用后将降低渲染质量以提高性能
          </p>
        </div>
      </div>
    </Card>
  );

  // 快捷视角菜单
  const viewPresetsMenu = (
    <Menu
      items={viewPresets.map((preset, index) => ({
        key: index,
        label: preset.name,
        onClick: () => {
          setControls(prev => ({
            ...prev,
            rotation: preset.rotation
          }));
        }
      }))}
    />
  );

  // 初始化WebGL上下文和渲染器
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // 设置画布尺寸
    const resizeCanvas = () => {
      const container = viewportRef.current;
      if (!container) return;
      
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 基础渲染循环
    const render = () => {
      gl.clearColor(0.1, 0.1, 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      // 这里会集成实际的3D渲染逻辑
      requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`cae-3d-viewport relative w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 ${className}`}
    >
      {/* 主渲染画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* 工具栏 */}
      {showToolbar && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {/* 主要控制按钮 */}
          <GlassCard variant="subtle" className="p-2">
            <Space direction="vertical" size="small">
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<RotateLeftOutlined />}
                title="重置视角"
                onClick={resetView}
              >
                重置
              </GlassButton>
              
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<ZoomInOutlined />}
                title="适配视口"
                onClick={fitToScreen}
              >
                适配
              </GlassButton>
              
              <Dropdown overlay={viewPresetsMenu} trigger={['click']}>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  icon={<AppstoreOutlined />}
                  title="预设视角"
                >
                  视角
                </GlassButton>
              </Dropdown>
              
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<CameraOutlined />}
                title="截图"
                onClick={takeScreenshot}
              >
                截图
              </GlassButton>
              
              <Dropdown overlay={settingsMenu} trigger={['click']} placement="leftTop">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  icon={<SettingOutlined />}
                  title="视口设置"
                >
                  设置
                </GlassButton>
              </Dropdown>
              
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<FullscreenOutlined />}
                title="全屏"
                onClick={toggleFullscreen}
              >
                全屏
              </GlassButton>
            </Space>
          </GlassCard>

          {/* 渲染模式快捷切换 */}
          <GlassCard variant="subtle" className="p-2">
            <Space direction="vertical" size="small">
              {renderModes.map(mode => (
                <GlassButton
                  key={mode.value}
                  variant={viewConfig.renderMode === mode.value ? 'primary' : 'ghost'}
                  size="sm"
                  icon={mode.icon}
                  title={mode.label}
                  onClick={() => updateViewConfig({ renderMode: mode.value as any })}
                >
                  {mode.value === 'wireframe' ? '线框' : 
                   mode.value === 'solid' ? '实体' : '透明'}
                </GlassButton>
              ))}
            </Space>
          </GlassCard>
        </div>
      )}

      {/* 状态指示器 */}
      <div className="absolute bottom-4 left-4">
        <GlassCard variant="subtle" className="p-3">
          <div className="text-xs text-secondary space-y-1">
            <div>相机: {viewConfig.cameraType === 'perspective' ? '透视' : '正交'}</div>
            <div>渲染: {renderModes.find(m => m.value === viewConfig.renderMode)?.label}</div>
            <div>缩放: {(controls.zoom * 100).toFixed(0)}%</div>
            {performanceMode && (
              <div className="text-yellow-500 flex items-center gap-1">
                <ThunderboltOutlined />
                性能模式
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* 鼠标操作提示 */}
      <div className="absolute bottom-4 right-4">
        <GlassCard variant="subtle" className="p-2">
          <div className="text-xs text-secondary space-y-1">
            <div>左键: 旋转</div>
            <div>右键: 平移</div>
            <div>滚轮: 缩放</div>
          </div>
        </GlassCard>
      </div>

      {/* 加载状态 */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <GlassCard variant="elevated" className="p-4">
              <div className="text-primary font-medium">视角调整中...</div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default CAE3DViewport;