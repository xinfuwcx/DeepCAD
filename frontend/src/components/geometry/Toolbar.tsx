import React, { useState } from 'react';
import { Button, Tooltip, Space, message } from 'antd';
import {
  // 视图控制图标
  EyeOutlined,         // 三维视图
  CaretDownOutlined,   // 俯视图 (XY平面，从Z轴正方向看)
  CaretRightOutlined,  // 侧视图 (YZ平面，从X轴正方向看)  
  CaretUpOutlined,     // 正视图 (XZ平面，从Y轴负方向看)
  
  // 布尔运算图标
  MergeCellsOutlined,  // 合并
  ScissorOutlined,     // 切割
  BorderInnerOutlined, // 相交
  SplitCellsOutlined,  // 分割
  
  // 变换操作图标
  DragOutlined,        // 移动
  ReloadOutlined,      // 旋转
  CopyOutlined,        // 复制
  SwapOutlined,        // 镜像
  ExpandOutlined,      // 缩放
  
  // 工具图标
  LineOutlined,        // 测量
  AimOutlined,         // 选择
  EyeInvisibleOutlined,// 显示/隐藏
  LockOutlined,        // 锁定
  
  // 其他工具
  AppstoreOutlined,    // 图层
  SettingOutlined,     // 设置
  SaveOutlined,        // 保存
  ExportOutlined,      // 导出
  DeleteOutlined,      // 删除
  UndoOutlined,        // 撤销
  RedoOutlined         // 重做
} from '@ant-design/icons';

// 工具栏工具类型定义
export type ToolType = 
  // 视图控制
  | 'view_3d' | 'view_top' | 'view_side' | 'view_front'
  // 布尔运算  
  | 'fuse' | 'cut' | 'intersect' | 'fragment'
  // 变换操作
  | 'translate' | 'rotate' | 'copy' | 'mirror' | 'scale'
  // 选择和测量
  | 'select' | 'measure' | 'hide_show' | 'lock'
  // 其他工具
  | 'layers' | 'settings' | 'save' | 'export' | 'delete' | 'undo' | 'redo';

export interface ToolbarProps {
  onToolSelect: (tool: ToolType) => void;
  activeTool?: ToolType;
  disabled?: boolean;
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onToolSelect,
  activeTool,
  disabled = false,
  className = ''
}) => {
  const [selectedObjects, setSelectedObjects] = useState<number[]>([]);

  // 工具定义
  const viewTools = [
    { key: 'view_3d' as ToolType, icon: <EyeOutlined />, tooltip: '三维视图', shortcut: '3' },
    { key: 'view_top' as ToolType, icon: <CaretDownOutlined />, tooltip: '俯视图 (XY平面)', shortcut: 'T' },
    { key: 'view_side' as ToolType, icon: <CaretRightOutlined />, tooltip: '侧视图 (YZ平面)', shortcut: 'R' },
    { key: 'view_front' as ToolType, icon: <CaretUpOutlined />, tooltip: '正视图 (XZ平面)', shortcut: 'F' }
  ];

  const booleanTools = [
    { key: 'fuse' as ToolType, icon: <MergeCellsOutlined />, tooltip: '合并几何体', shortcut: 'F' },
    { key: 'cut' as ToolType, icon: <ScissorOutlined />, tooltip: '切割几何体', shortcut: 'X' },
    { key: 'intersect' as ToolType, icon: <BorderInnerOutlined />, tooltip: '几何体相交', shortcut: 'I' },
    { key: 'fragment' as ToolType, icon: <SplitCellsOutlined />, tooltip: '几何体分割', shortcut: 'G' }
  ];

  const transformTools = [
    { key: 'translate' as ToolType, icon: <DragOutlined />, tooltip: '移动几何体', shortcut: 'T' },
    { key: 'rotate' as ToolType, icon: <ReloadOutlined />, tooltip: '旋转几何体', shortcut: 'R' },
    { key: 'copy' as ToolType, icon: <CopyOutlined />, tooltip: '复制几何体', shortcut: 'Ctrl+C' },
    { key: 'mirror' as ToolType, icon: <SwapOutlined />, tooltip: '镜像几何体', shortcut: 'M' },
    { key: 'scale' as ToolType, icon: <ExpandOutlined />, tooltip: '缩放几何体', shortcut: 'Ctrl+T' }
  ];

  const utilityTools = [
    { key: 'select' as ToolType, icon: <AimOutlined />, tooltip: '选择工具', shortcut: 'V' },
    { key: 'measure' as ToolType, icon: <LineOutlined />, tooltip: '测量工具', shortcut: 'D' }
  ];

  const systemTools = [
    { key: 'save' as ToolType, icon: <SaveOutlined />, tooltip: '保存模型', shortcut: 'Ctrl+S' },
    { key: 'export' as ToolType, icon: <ExportOutlined />, tooltip: '导出模型', shortcut: 'Ctrl+E' },
    { key: 'delete' as ToolType, icon: <DeleteOutlined />, tooltip: '删除选中', shortcut: 'Del' },
    { key: 'undo' as ToolType, icon: <UndoOutlined />, tooltip: '撤销', shortcut: 'Ctrl+Z' },
    { key: 'redo' as ToolType, icon: <RedoOutlined />, tooltip: '重做', shortcut: 'Ctrl+Y' }
  ];

  const handleToolClick = (tool: ToolType) => {
    if (disabled) {
      message.warning('工具栏已禁用');
      return;
    }

    // 布尔运算需要先选择对象
    if (['fuse', 'cut', 'intersect', 'fragment'].includes(tool)) {
      if (selectedObjects.length < 2) {
        message.warning('布尔运算需要选择至少两个几何体');
        return;
      }
    }

    // 变换操作需要先选择对象
    if (['translate', 'rotate', 'copy', 'mirror', 'scale', 'delete'].includes(tool)) {
      if (selectedObjects.length === 0) {
        message.warning('请先选择要操作的几何体');
        return;
      }
    }

    onToolSelect(tool);
    
    // 显示操作提示
    const toolMessages: Record<ToolType, string> = {
      // 视图控制
      view_3d: '切换到三维透视视图',
      view_top: '切换到俯视图 (XY平面)', 
      view_side: '切换到侧视图 (YZ平面)',
      view_front: '切换到正视图 (XZ平面)',
      
      // 布尔运算
      fuse: '正在合并选中的几何体...',
      cut: '正在切割几何体...',
      intersect: '正在计算几何体相交...',
      fragment: '正在分割几何体...',
      
      // 变换操作
      translate: '拖拽移动几何体',
      rotate: '拖拽旋转几何体',
      copy: '正在复制几何体...',
      mirror: '点击设置镜像平面',
      scale: '拖拽缩放几何体',
      
      // 工具
      select: '点击选择几何体',
      measure: '点击两点进行测量',
      hide_show: '点击几何体切换显示状态',
      lock: '点击几何体切换锁定状态',
      
      // 系统
      layers: '打开图层管理面板',
      settings: '打开设置面板', 
      save: '正在保存模型...',
      export: '选择导出格式...',
      delete: '正在删除选中几何体...',
      undo: '撤销上一步操作',
      redo: '重做上一步操作'
    };

    if (toolMessages[tool]) {
      message.info(toolMessages[tool]);
    }
  };

  const renderToolGroup = (
    tools: Array<{key: ToolType, icon: React.ReactNode, tooltip: string, shortcut: string}>,
    groupName: string
  ) => (
    <Space size="small" key={groupName}>
      {tools.map((tool) => (
        <Tooltip
          key={tool.key}
          title={
            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{tool.tooltip}</div>
              {tool.shortcut && (
                <div style={{ 
                  fontSize: '11px', 
                  color: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  display: 'inline-block'
                }}>
                  {tool.shortcut}
                </div>
              )}
            </div>
          }
          placement="top"
        >
          <Button
            type={activeTool === tool.key ? 'primary' : 'text'}
            icon={tool.icon}
            onClick={() => handleToolClick(tool.key)}
            disabled={disabled}
            size="small"
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: activeTool === tool.key ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.15)',
              background: activeTool === tool.key ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
              color: activeTool === tool.key ? '#00d9ff' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(5px)',
              boxShadow: activeTool === tool.key ? '0 0 12px rgba(0, 217, 255, 0.4)' : 'none',
              transition: 'all 0.2s ease',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (!disabled && activeTool !== tool.key) {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                e.currentTarget.style.color = '#00d9ff';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && activeTool !== tool.key) {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
              }
            }}
          />
        </Tooltip>
      ))}
    </Space>
  );

  const renderVerticalDivider = () => (
    <div style={{
      width: '1px',
      height: '28px',
      background: 'rgba(0, 217, 255, 0.3)',
      margin: '0 8px'
    }} />
  );

  return (
    <div 
      className={`toolbar ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '4px',
        padding: '0',
        minWidth: '400px'
      }}
    >
      {/* 视图控制工具组 */}
      {renderToolGroup(viewTools, '视图')}
      
      {/* 组间分割线 */}
      {renderVerticalDivider()}
      
      {/* 布尔运算工具组 */}
      {renderToolGroup(booleanTools, '布尔')}
      
      {/* 组间分割线 */}
      {renderVerticalDivider()}
      
      {/* 变换工具组 */}
      {renderToolGroup(transformTools, '变换')}
      
      {/* 组间分割线 */}
      {renderVerticalDivider()}
      
      {/* 选择和测量工具组 */}
      {renderToolGroup(utilityTools, '工具')}
      
      {/* 组间分割线 */}
      {renderVerticalDivider()}
      
      {/* 系统工具组 */}
      {renderToolGroup(systemTools, '系统')}
      
      {/* 选中对象计数 */}
      {selectedObjects.length > 0 && (
        <div style={{
          background: 'rgba(0, 217, 255, 0.8)',
          color: '#000000',
          fontSize: '11px',
          fontWeight: 'bold',
          padding: '6px 10px',
          borderRadius: '14px',
          marginLeft: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 2px 8px rgba(0, 217, 255, 0.3)'
        }}>
          <span style={{ fontSize: '10px' }}>✓</span>
          {selectedObjects.length}
        </div>
      )}
    </div>
  );
};

export default Toolbar;