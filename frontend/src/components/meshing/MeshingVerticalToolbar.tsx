import React from 'react';
import { Button, Tooltip, Divider } from 'antd';
import {
  SelectOutlined,      // 选择工具
  DragOutlined,        // 平移
  ZoomInOutlined,      // 缩放  
  ReloadOutlined,      // 重置视图
  ColumnWidthOutlined, // 距离测量
  RadiusUpleftOutlined, // 角度测量
  CommentOutlined,     // 标注
  ScissorOutlined,     // 剖切
  BranchesOutlined,    // 爆炸视图
  EyeOutlined,         // 线框模式
  ThunderboltOutlined, // 网格生成
  ExperimentOutlined,  // 网格分析
  BugOutlined,         // 质量检测
  SaveOutlined,        // 保存
  ExportOutlined,      // 导出
  SettingOutlined      // 设置
} from '@ant-design/icons';

export type MeshingVerticalToolType = 
  | 'select' | 'pan' | 'zoom' | 'reset'           // 视图控制
  | 'distance' | 'angle' | 'annotation'          // 测量标注
  | 'section' | 'explode' | 'wireframe'          // 高级工具  
  | 'generate' | 'analyze' | 'quality'           // 网格工具
  | 'save' | 'export' | 'settings';              // 系统工具

interface MeshingVerticalToolbarProps {
  activeTool?: MeshingVerticalToolType;
  onToolSelect: (tool: MeshingVerticalToolType) => void;
  disabled?: boolean;
}

const MeshingVerticalToolbar: React.FC<MeshingVerticalToolbarProps> = ({
  activeTool,
  onToolSelect,
  disabled = false
}) => {
  const tools = [
    // 视图控制工具
    { type: 'select' as const, icon: <SelectOutlined />, label: '选择', shortcut: 'S' },
    { type: 'pan' as const, icon: <DragOutlined />, label: '平移', shortcut: 'P' },
    { type: 'zoom' as const, icon: <ZoomInOutlined />, label: '缩放', shortcut: 'Z' },
    { type: 'reset' as const, icon: <ReloadOutlined />, label: '重置视图', shortcut: 'R' },
    
    'divider1',
    
    // 测量工具
    { type: 'distance' as const, icon: <ColumnWidthOutlined />, label: '距离测量', shortcut: 'D' },
    { type: 'angle' as const, icon: <RadiusUpleftOutlined />, label: '角度测量', shortcut: 'A' },
    { type: 'annotation' as const, icon: <CommentOutlined />, label: '标注', shortcut: 'T' },
    
    'divider2',
    
    // 高级工具
    { type: 'section' as const, icon: <ScissorOutlined />, label: '剖切', shortcut: 'C' },
    { type: 'explode' as const, icon: <BranchesOutlined />, label: '爆炸视图', shortcut: 'E' },
    { type: 'wireframe' as const, icon: <EyeOutlined />, label: '线框模式', shortcut: 'W' },
    
    'divider3',
    
    // 网格专用工具
    { type: 'generate' as const, icon: <ThunderboltOutlined />, label: '网格生成', shortcut: 'G' },
    { type: 'analyze' as const, icon: <ExperimentOutlined />, label: '网格分析', shortcut: 'N' },
    { type: 'quality' as const, icon: <BugOutlined />, label: '质量检测', shortcut: 'Q' },
    
    'divider4',
    
    // 系统工具
    { type: 'save' as const, icon: <SaveOutlined />, label: '保存', shortcut: 'Ctrl+S' },
    { type: 'export' as const, icon: <ExportOutlined />, label: '导出', shortcut: '' },
    { type: 'settings' as const, icon: <SettingOutlined />, label: '设置', shortcut: '' },
  ];

  const handleToolSelect = (toolType: MeshingVerticalToolType) => {
    if (disabled) return;
    onToolSelect(toolType);
  };

  return (
    <div style={{
      background: 'rgba(26, 26, 46, 0.9)',
      border: '1px solid rgba(0, 217, 255, 0.4)',
      borderRadius: '12px',
      padding: '12px 8px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      width: '60px'
    }}>
      {tools.map((tool, index) => {
        if (typeof tool === 'string') {
          return (
            <Divider 
              key={tool} 
              style={{ 
                margin: '4px 0', 
                borderColor: 'rgba(0, 217, 255, 0.3)',
                width: '80%'
              }} 
            />
          );
        }

        const isActive = activeTool === tool.type;
        
        return (
          <Tooltip key={tool.type} title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`} placement="right">
            <Button
              type={isActive ? 'primary' : 'text'}
              icon={tool.icon}
              size="small"
              disabled={disabled}
              onClick={() => handleToolSelect(tool.type)}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive 
                  ? 'rgba(0, 217, 255, 0.2)' 
                  : 'transparent',
                borderColor: isActive 
                  ? 'rgba(0, 217, 255, 0.6)' 
                  : 'transparent',
                color: isActive 
                  ? '#00d9ff' 
                  : 'rgba(255, 255, 255, 0.8)',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                fontSize: '16px'
              }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
};

export default MeshingVerticalToolbar;