import React from 'react';
import { Button, Tooltip, Space, Divider } from 'antd';
import {
  SelectOutlined,
  DragOutlined,
  ZoomInOutlined,
  ReloadOutlined,
  ColumnWidthOutlined,
  RadiusUpleftOutlined,
  ScissorOutlined,
  NodeExpandOutlined,
  EyeOutlined,
  CommentOutlined,
  SaveOutlined,
  ExportOutlined,
  UndoOutlined,
  RedoOutlined,
  SettingOutlined
} from '@ant-design/icons';

export type VerticalToolType = 
  | 'select' | 'pan' | 'zoom' | 'reset'
  | 'distance' | 'angle' | 'section' | 'explode' | 'wireframe'
  | 'annotation' | 'undo' | 'redo' | 'save' | 'export' | 'settings';

interface VerticalToolbarProps {
  activeTool?: VerticalToolType;
  onToolSelect: (tool: VerticalToolType) => void;
  className?: string;
}

const VerticalToolbar: React.FC<VerticalToolbarProps> = ({
  activeTool,
  onToolSelect,
  className
}) => {
  const toolGroups = [
    // 基础工具
    {
      title: '基础工具',
      tools: [
        { key: 'select' as VerticalToolType, icon: <SelectOutlined />, label: '选择', shortcut: 'S' },
        { key: 'pan' as VerticalToolType, icon: <DragOutlined />, label: '平移', shortcut: 'P' },
        { key: 'zoom' as VerticalToolType, icon: <ZoomInOutlined />, label: '缩放', shortcut: 'Z' },
        { key: 'reset' as VerticalToolType, icon: <ReloadOutlined />, label: '重置视图', shortcut: 'Home' }
      ]
    },
    // 测量工具  
    {
      title: '测量工具',
      tools: [
        { key: 'distance' as VerticalToolType, icon: <ColumnWidthOutlined />, label: '距离测量', shortcut: 'D' },
        { key: 'angle' as VerticalToolType, icon: <RadiusUpleftOutlined />, label: '角度测量', shortcut: 'A' }
      ]
    },
    // 高级工具
    {
      title: '高级工具',
      tools: [
        { key: 'section' as VerticalToolType, icon: <ScissorOutlined />, label: '剖切', shortcut: 'C' },
        { key: 'explode' as VerticalToolType, icon: <NodeExpandOutlined />, label: '爆炸视图', shortcut: 'E' },
        { key: 'wireframe' as VerticalToolType, icon: <EyeOutlined />, label: '线框模式', shortcut: 'W' },
        { key: 'annotation' as VerticalToolType, icon: <CommentOutlined />, label: '标注', shortcut: 'T' }
      ]
    },
    // 系统工具
    {
      title: '系统工具',
      tools: [
        { key: 'undo' as VerticalToolType, icon: <UndoOutlined />, label: '撤销', shortcut: 'Ctrl+Z' },
        { key: 'redo' as VerticalToolType, icon: <RedoOutlined />, label: '重做', shortcut: 'Ctrl+Y' },
        { key: 'save' as VerticalToolType, icon: <SaveOutlined />, label: '保存', shortcut: 'Ctrl+S' },
        { key: 'export' as VerticalToolType, icon: <ExportOutlined />, label: '导出' },
        { key: 'settings' as VerticalToolType, icon: <SettingOutlined />, label: '设置' }
      ]
    }
  ];

  return (
    <div
      className={className}
      style={{
        width: '60px',
        height: '100%',
        background: 'rgba(26, 26, 46, 0.85)',
        border: '1px solid rgba(0, 217, 255, 0.4)',
        borderRadius: '12px',
        padding: '8px 6px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto'
      }}
    >
      {toolGroups.map((group, groupIndex) => (
        <div key={group.title}>
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            {group.tools.map((tool) => (
              <Tooltip 
                key={tool.key} 
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                placement="right"
              >
                <Button
                  type={activeTool === tool.key ? "primary" : "default"}
                  icon={tool.icon}
                  size="small"
                  onClick={() => onToolSelect(tool.key)}
                  style={{
                    width: '48px',
                    height: '48px',
                    background: activeTool === tool.key 
                      ? 'rgba(0, 217, 255, 0.8)' 
                      : 'rgba(0, 217, 255, 0.1)',
                    borderColor: 'rgba(0, 217, 255, 0.4)',
                    color: activeTool === tool.key ? '#000000' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTool === tool.key 
                      ? '0 0 8px rgba(0, 217, 255, 0.4)' 
                      : 'none'
                  }}
                />
              </Tooltip>
            ))}
          </Space>
          {groupIndex < toolGroups.length - 1 && (
            <Divider 
              style={{ 
                margin: '8px 0', 
                borderColor: 'rgba(0, 217, 255, 0.3)' 
              }} 
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default VerticalToolbar;