/**
 * 3D视口交互工具栏
 */

import React, { useState, useMemo } from 'react';
import { Button, Tooltip, Dropdown, Space, Divider } from 'antd';
import {
  SelectOutlined,
  RedditOutlined,
  DragOutlined,
  ZoomInOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
  ColumnWidthOutlined,
  ScissorOutlined,
  BorderOutlined,
  AppstoreAddOutlined,
  CameraOutlined,
  SettingOutlined,
  MenuOutlined,
  MoreOutlined,
  // 新增更炫酷的图标
  AimOutlined,
  ScanOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CompressOutlined,
  UndoOutlined,
  BlockOutlined,
  BuildOutlined,
  GoldOutlined,
  FireOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useViewportStore } from '../../stores/useViewportStore';
import { useViewportHotkeys, getHotkeyText } from '../../hooks/useHotkeys';
import { ToolbarAction, ToolbarButton, ToolbarPosition, ToolbarDisplay } from '../../types/viewport';
import './Toolbar.css';

interface ToolbarProps {
  onAction: (action: ToolbarAction) => void;
  className?: string;
  style?: React.CSSProperties;
}

// 工具栏按钮配置
const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    action: ToolbarAction.SELECT,
    icon: 'AimOutlined',
    label: '选择',
    tooltip: '精准选择工具 - 点击选择对象',
    hotkey: 'S',
    group: 'primary'
  },
  {
    action: ToolbarAction.ORBIT,
    icon: 'ScanOutlined',
    label: '旋转',
    tooltip: '360°环绕视图 - 拖拽旋转观察角度',
    hotkey: 'O',
    group: 'primary'
  },
  {
    action: ToolbarAction.PAN,
    icon: 'DragOutlined',
    label: '平移',
    tooltip: '平移视图 - 拖拽移动画面',
    hotkey: 'P',
    group: 'primary'
  },
  {
    action: ToolbarAction.ZOOM,
    icon: 'ThunderboltOutlined',
    label: '缩放',
    tooltip: '智能缩放 - 滚轮或拖拽缩放',
    hotkey: 'Z',
    group: 'primary'
  },
  {
    action: ToolbarAction.FIT,
    icon: 'CompressOutlined',
    label: '适应',
    tooltip: '自动适应视图 - 显示全部内容',
    hotkey: 'F',
    group: 'primary'
  },
  {
    action: ToolbarAction.RESET,
    icon: 'UndoOutlined',
    label: '重置',
    tooltip: '重置到初始视角',
    hotkey: 'R',
    group: 'primary'
  },
  {
    action: ToolbarAction.MEASURE,
    icon: 'BorderOutlined', // 使用BorderOutlined代替
    label: '测量',
    tooltip: '精密测量工具 - 距离/角度/面积',
    hotkey: 'M',
    group: 'secondary'
  },
  {
    action: ToolbarAction.SECTION_CUT,
    icon: 'BlockOutlined',
    label: '剖切',
    tooltip: '剖面切割 - 查看内部结构',
    hotkey: 'C',
    group: 'secondary'
  },
  {
    action: ToolbarAction.WIREFRAME,
    icon: 'BuildOutlined',
    label: '线框',
    tooltip: '线框模式 - 查看几何结构',
    hotkey: 'W',
    group: 'secondary'
  },
  {
    action: ToolbarAction.GRID,
    icon: 'GoldOutlined',
    label: '网格',
    tooltip: '参考网格 - 辅助定位和对齐',
    hotkey: 'G',
    group: 'secondary'
  },
  {
    action: ToolbarAction.SCREENSHOT,
    icon: 'FireOutlined',
    label: '截图',
    tooltip: '高清截图 - 保存当前视图',
    group: 'secondary'
  },
  {
    action: ToolbarAction.SETTINGS,
    icon: 'RocketOutlined',
    label: '设置',
    tooltip: '视口设置 - 自定义显示效果',
    group: 'secondary'
  }
];

// 图标映射
const ICON_MAP: Record<string, React.ComponentType> = {
  // 新的炫酷图标
  AimOutlined,
  ScanOutlined,
  DragOutlined,
  ThunderboltOutlined,
  CompressOutlined,
  UndoOutlined,
  BlockOutlined,
  BuildOutlined,
  GoldOutlined,
  FireOutlined,
  RocketOutlined,
  // 保留旧图标作为后备
  SelectOutlined,
  RedditOutlined,
  ZoomInOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
  ColumnWidthOutlined,
  ScissorOutlined,
  BorderOutlined,
  AppstoreAddOutlined,
  CameraOutlined,
  SettingOutlined,
  EyeOutlined
};

export const Toolbar: React.FC<ToolbarProps> = ({ onAction, className, style }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  const {
    activeTool,
    toolbar: toolbarConfig,
    grid,
    viewport
  } = useViewportStore();

  // 注册快捷键
  useViewportHotkeys(onAction);

  // 检查窗口大小来决定是否自动折叠
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 根据屏幕尺寸自动调整显示模式
  const isCollapsed = useMemo(() => {
    if (toolbarConfig.display === ToolbarDisplay.HIDDEN) return true;
    if (toolbarConfig.display === ToolbarDisplay.COLLAPSED) return true;
    if (toolbarConfig.display === ToolbarDisplay.AUTO_HIDE) {
      return windowWidth <= 1024;
    }
    return false;
  }, [toolbarConfig.display, windowWidth]);

  const isMobile = windowWidth <= 600;

  // 过滤移动端显示的工具
  const visibleButtons = useMemo(() => {
    let buttons = TOOLBAR_BUTTONS.filter(btn => 
      toolbarConfig.visibleTools.includes(btn.action)
    );

    // 移动端只显示核心工具
    if (isMobile) {
      buttons = buttons.filter(btn => 
        [ToolbarAction.RESET, ToolbarAction.FIT, ToolbarAction.MEASURE].includes(btn.action)
      );
    }

    return buttons;
  }, [toolbarConfig.visibleTools, isMobile]);

  // 分组按钮
  const primaryButtons = visibleButtons.filter(btn => btn.group === 'primary');
  const secondaryButtons = visibleButtons.filter(btn => btn.group === 'secondary');

  // 渲染按钮
  const renderButton = (button: ToolbarButton) => {
    const Icon = ICON_MAP[button.icon];
    const isActive = activeTool === button.action;
    
    // 特殊状态处理
    let specialActive = false;
    if (button.action === ToolbarAction.GRID && grid.visible) {
      specialActive = true;
    }
    if (button.action === ToolbarAction.WIREFRAME && viewport.renderMode === 'wireframe') {
      specialActive = true;
    }

    const buttonClass = `viewport-toolbar-button ${isActive ? 'active' : ''} ${specialActive ? 'special-active' : ''}`;

    return (
      <Tooltip 
        key={button.action}
        title={
          <div>
            <div>{button.tooltip}</div>
            {button.hotkey && <div style={{ fontSize: '12px', opacity: 0.8 }}>快捷键: {button.hotkey}</div>}
          </div>
        }
        placement="bottom"
      >
        <Button
          className={buttonClass}
          icon={Icon && <Icon />}
          onClick={() => onAction(button.action)}
          size="small"
          type={isActive || specialActive ? 'primary' : 'default'}
        />
      </Tooltip>
    );
  };

  // 获取工具栏位置样式
  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      zIndex: 100
    };

    if (isMobile) {
      return {
        ...baseStyles,
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)'
      };
    }

    switch (toolbarConfig.position) {
      case ToolbarPosition.TOP_LEFT:
        return { ...baseStyles, top: '12px', left: '12px' };
      case ToolbarPosition.TOP_RIGHT:
        return { ...baseStyles, top: '12px', right: '12px' };
      case ToolbarPosition.BOTTOM_LEFT:
        return { ...baseStyles, bottom: '12px', left: '12px' };
      case ToolbarPosition.BOTTOM_RIGHT:
        return { ...baseStyles, bottom: '12px', right: '12px' };
      case ToolbarPosition.TOP_CENTER:
        return { 
          ...baseStyles, 
          top: '12px', 
          left: '50%', 
          transform: 'translateX(-50%)' 
        };
      case ToolbarPosition.BOTTOM_CENTER:
        return { 
          ...baseStyles, 
          bottom: '12px', 
          left: '50%', 
          transform: 'translateX(-50%)' 
        };
      default:
        return { ...baseStyles, top: '12px', left: '12px' };
    }
  };

  // 折叠模式渲染
  if (isCollapsed) {
    const dropdownItems = visibleButtons.map(button => ({
      key: button.action,
      label: (
        <Space>
          {React.createElement(ICON_MAP[button.icon])}
          <span>{button.label}</span>
          {button.hotkey && <span style={{ opacity: 0.6 }}>{button.hotkey}</span>}
        </Space>
      ),
      onClick: () => onAction(button.action)
    }));

    return (
      <div 
        className={`viewport-toolbar collapsed ${className || ''}`}
        style={{
          ...getPositionStyles(),
          ...style
        }}
      >
        <Dropdown
          menu={{ items: dropdownItems }}
          placement="bottomLeft"
          open={dropdownVisible}
          onOpenChange={setDropdownVisible}
          trigger={['click']}
        >
          <Button
            className="viewport-toolbar-toggle"
            icon={<MenuOutlined />}
            size="large"
            type="primary"
          />
        </Dropdown>
      </div>
    );
  }

  // 展开模式渲染
  return (
    <div 
      className={`viewport-toolbar expanded ${toolbarConfig.orientation} ${className || ''}`}
      style={{
        ...getPositionStyles(),
        ...style
      }}
    >
      <Space.Compact 
        direction={toolbarConfig.orientation === 'horizontal' ? 'horizontal' : 'vertical'}
        size="small"
      >
        {/* 主要工具 */}
        {primaryButtons.map(renderButton)}
        
        {/* 分隔线 */}
        {primaryButtons.length > 0 && secondaryButtons.length > 0 && (
          <Divider 
            type={toolbarConfig.orientation === 'horizontal' ? 'vertical' : 'horizontal'} 
            style={{ margin: '0 4px' }}
          />
        )}
        
        {/* 次要工具 */}
        {secondaryButtons.length <= 3 ? (
          // 直接显示
          secondaryButtons.map(renderButton)
        ) : (
          // 使用更多按钮
          <>
            {secondaryButtons.slice(0, 2).map(renderButton)}
            <Dropdown
              menu={{
                items: secondaryButtons.slice(2).map(button => ({
                  key: button.action,
                  label: (
                    <Space>
                      {React.createElement(ICON_MAP[button.icon])}
                      <span>{button.label}</span>
                      {button.hotkey && <span style={{ opacity: 0.6 }}>{button.hotkey}</span>}
                    </Space>
                  ),
                  onClick: () => onAction(button.action)
                }))
              }}
              placement="bottomLeft"
            >
              <Button
                className="viewport-toolbar-button"
                icon={<MoreOutlined />}
                size="small"
              />
            </Dropdown>
          </>
        )}
      </Space.Compact>
    </div>
  );
};

export default Toolbar;