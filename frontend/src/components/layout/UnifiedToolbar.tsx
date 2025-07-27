import React, { useState, useCallback } from 'react';
import { Space, Button, Tooltip, Divider, Dropdown, Menu, Badge, Slider } from 'antd';
import {
  SelectOutlined,
  RotateLeftOutlined,
  DragOutlined,
  ZoomInOutlined,
  ReloadOutlined,
  BorderOutlined,
  ColumnWidthOutlined,
  CommentOutlined,
  ScissorOutlined,
  NodeExpandOutlined,
  AppstoreOutlined,
  RadiusUpleftOutlined,
  GlobalOutlined,
  BuildOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  ExportOutlined,
  EyeOutlined,
  SettingOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { GlassCard, GlassButton } from '../ui/GlassComponents';
import { cn } from '../../utils/cn';

export type ToolCategory = 'view' | 'selection' | 'measurement' | 'annotation' | 'advanced' | 'geometry' | 'system';
export type ViewTool = 'rotate' | 'pan' | 'zoom' | 'reset';
export type SelectionTool = 'select' | 'box-select' | 'lasso-select';
export type MeasurementTool = 'distance' | 'angle' | 'area';
export type AnnotationTool = 'text' | 'dimension';
export type AdvancedTool = 'section' | 'explode' | 'wireframe';
export type GeometryTool = 'box' | 'cylinder' | 'sphere' | 'cone' | 'union' | 'subtract' | 'intersect';
export type SystemTool = 'undo' | 'redo' | 'save' | 'export';

export type UnifiedTool = ViewTool | SelectionTool | MeasurementTool | AnnotationTool | AdvancedTool | GeometryTool | SystemTool;

interface UnifiedToolbarProps {
  currentModule: 'dashboard' | 'geometry' | 'meshing' | 'analysis' | 'results' | 'materials';
  currentTool: UnifiedTool;
  onToolChange: (tool: UnifiedTool) => void;
  explodeFactor?: number;
  onExplodeChange?: (factor: number) => void;
  className?: string;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

const UnifiedToolbar: React.FC<UnifiedToolbarProps> = ({
  currentModule,
  currentTool,
  onToolChange,
  explodeFactor = 0,
  onExplodeChange,
  className,
  collapsed = false,
  onCollapseChange
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // 根据当前模块决定显示哪些工具组
  const getVisibleCategories = useCallback((): ToolCategory[] => {
    const base: ToolCategory[] = ['view', 'selection', 'system'];
    
    switch (currentModule) {
      case 'geometry':
        return [...base, 'measurement', 'annotation', 'geometry', 'advanced'];
      case 'meshing':
        return [...base, 'measurement', 'advanced'];
      case 'analysis':
        return [...base, 'measurement', 'annotation'];
      case 'results':
        return [...base, 'measurement', 'annotation', 'advanced'];
      default:
        return base;
    }
  }, [currentModule]);

  const visibleCategories = getVisibleCategories();

  // 视图控制工具
  const viewTools = [
    { key: 'rotate' as ViewTool, icon: <RotateLeftOutlined />, label: '旋转视图', shortcut: 'R' },
    { key: 'pan' as ViewTool, icon: <DragOutlined />, label: '平移视图', shortcut: 'P' },
    { key: 'zoom' as ViewTool, icon: <ZoomInOutlined />, label: '缩放视图', shortcut: 'Z' },
    { key: 'reset' as ViewTool, icon: <ReloadOutlined />, label: '重置视图', shortcut: 'Home' }
  ];

  // 选择工具
  const selectionTools = [
    { key: 'select' as SelectionTool, icon: <SelectOutlined />, label: '单选', shortcut: 'S' },
    { key: 'box-select' as SelectionTool, icon: <BorderOutlined />, label: '框选', shortcut: 'B' },
  ];

  // 测量工具
  const measurementTools = [
    { key: 'distance' as MeasurementTool, icon: <ColumnWidthOutlined />, label: '距离测量', shortcut: 'D' },
    { key: 'angle' as MeasurementTool, icon: <RadiusUpleftOutlined />, label: '角度测量', shortcut: 'A' },
  ];

  // 标注工具
  const annotationTools = [
    { key: 'text' as AnnotationTool, icon: <CommentOutlined />, label: '文本标注', shortcut: 'T' },
  ];

  // 高级工具
  const advancedTools = [
    { key: 'section' as AdvancedTool, icon: <ScissorOutlined />, label: '剖切', shortcut: 'C' },
    { key: 'explode' as AdvancedTool, icon: <NodeExpandOutlined />, label: '爆炸视图', shortcut: 'E' },
    { key: 'wireframe' as AdvancedTool, icon: <EyeOutlined />, label: '线框模式', shortcut: 'W' }
  ];

  // 几何创建工具
  const geometryTools = [
    { key: 'box' as GeometryTool, icon: <AppstoreOutlined />, label: '立方体' },
    { key: 'cylinder' as GeometryTool, icon: <BuildOutlined />, label: '圆柱体' },
    { key: 'sphere' as GeometryTool, icon: <GlobalOutlined />, label: '球体' },
  ];

  // 系统工具
  const systemTools = [
    { key: 'undo' as SystemTool, icon: <UndoOutlined />, label: '撤销', shortcut: 'Ctrl+Z' },
    { key: 'redo' as SystemTool, icon: <RedoOutlined />, label: '重做', shortcut: 'Ctrl+Y' },
    { key: 'save' as SystemTool, icon: <SaveOutlined />, label: '保存', shortcut: 'Ctrl+S' },
    { key: 'export' as SystemTool, icon: <ExportOutlined />, label: '导出' }
  ];

  const renderToolGroup = (tools: any[], category: ToolCategory) => {
    if (!visibleCategories.includes(category)) return null;

    return (
      <Space key={category} size="small">
        {tools.map(tool => (
          <Tooltip key={tool.key} title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}>
            <GlassButton
              variant={currentTool === tool.key ? 'primary' : 'ghost'}
              size="md"
              icon={tool.icon}
              onClick={() => onToolChange(tool.key)}
              className={cn(
                "transition-all duration-200",
                currentTool === tool.key && "shadow-lg shadow-primary-500/25"
              )}
            >
              {!collapsed && tool.label}
            </GlassButton>
          </Tooltip>
        ))}
      </Space>
    );
  };

  // 爆炸视图滑块菜单
  const explodeMenu = (
    <div className="p-4 w-64">
      <div className="mb-2 text-sm font-medium">爆炸系数</div>
      <Slider
        min={0}
        max={2}
        step={0.1}
        value={explodeFactor}
        onChange={onExplodeChange}
        tooltip={{ formatter: (value) => `${value}x` }}
      />
    </div>
  );

  return (
    <GlassCard
      variant="elevated"
      className={cn(
        "h-12 px-4 flex items-center justify-between",
        "border-b border-glass-border/30",
        "backdrop-blur-xl bg-glass/40",
        className
      )}
      padding="none"
    >
      <div className="flex items-center gap-2 overflow-x-auto flex-1">
        {/* 视图控制 */}
        {renderToolGroup(viewTools, 'view')}
        
        {visibleCategories.includes('selection') && <Divider type="vertical" className="mx-1" />}
        
        {/* 选择工具 */}
        {renderToolGroup(selectionTools, 'selection')}
        
        {visibleCategories.includes('measurement') && <Divider type="vertical" className="mx-1" />}
        
        {/* 测量工具 */}
        {renderToolGroup(measurementTools, 'measurement')}
        
        {visibleCategories.includes('annotation') && <Divider type="vertical" className="mx-1" />}
        
        {/* 标注工具 */}
        {renderToolGroup(annotationTools, 'annotation')}
        
        {visibleCategories.includes('advanced') && <Divider type="vertical" className="mx-1" />}
        
        {/* 高级工具 */}
        {visibleCategories.includes('advanced') && (
          <Space size="small">
            {advancedTools.filter(tool => tool.key !== 'explode').map(tool => (
              <Tooltip key={tool.key} title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}>
                <GlassButton
                  variant={currentTool === tool.key ? 'primary' : 'ghost'}
                  size="md"
                  icon={tool.icon}
                  onClick={() => onToolChange(tool.key)}
                  className={cn(
                    "transition-all duration-200",
                    currentTool === tool.key && "shadow-lg shadow-primary-500/25"
                  )}
                >
                  {!collapsed && tool.label}
                </GlassButton>
              </Tooltip>
            ))}
            
            {/* 爆炸视图工具带滑块 */}
            <Dropdown
              overlay={explodeMenu}
              trigger={['click']}
              placement="bottomLeft"
            >
              <Badge dot={explodeFactor > 0} offset={[-2, 2]}>
                <GlassButton
                  variant={currentTool === 'explode' ? 'primary' : 'ghost'}
                  size="md"
                  icon={<NodeExpandOutlined />}
                  onClick={() => onToolChange('explode')}
                  className={cn(
                    "transition-all duration-200",
                    currentTool === 'explode' && "shadow-lg shadow-primary-500/25"
                  )}
                >
                  {!collapsed && '爆炸视图'}
                </GlassButton>
              </Badge>
            </Dropdown>
          </Space>
        )}
        
        {visibleCategories.includes('geometry') && <Divider type="vertical" className="mx-1" />}
        
        {/* 几何工具 */}
        {renderToolGroup(geometryTools, 'geometry')}
      </div>

      {/* 右侧系统工具 */}
      <div className="flex items-center gap-2 ml-4">
        <Divider type="vertical" className="mx-1" />
        {renderToolGroup(systemTools, 'system')}
        
        <Divider type="vertical" className="mx-1" />
        
        {/* 设置和折叠按钮 */}
        <Space size="small">
          <Tooltip title="工具栏设置">
            <GlassButton
              variant="ghost"
              size="md"
              icon={<SettingOutlined />}
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              设置
            </GlassButton>
          </Tooltip>
          
          <Tooltip title={collapsed ? "展开工具栏" : "折叠工具栏"}>
            <GlassButton
              variant="ghost"
              size="md"
              icon={<MoreOutlined />}
              onClick={() => onCollapseChange?.(!collapsed)}
            >
              {collapsed ? '展开' : '折叠'}
            </GlassButton>
          </Tooltip>
        </Space>
      </div>
    </GlassCard>
  );
};

export default UnifiedToolbar;