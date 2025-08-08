import React, { useState, useEffect } from 'react';
import { Button, Tooltip, Divider, message, Modal, InputNumber, Select, Space } from 'antd';
import { cadGeometryEngine, CADObject, GeometryCreationParams } from '../../services/CADGeometryEngine';
import {
  // 基础几何图标
  BorderOutlined,      // 立方体
  ColumnWidthOutlined, // 圆柱体  
  DotChartOutlined,    // 球体
  CaretUpOutlined,     // 圆锥
  
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
  EyeOutlined,         // 显示/隐藏
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
export type CADToolType = 
  // 基础几何
  | 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus'
  // 布尔运算  
  | 'fuse' | 'cut' | 'intersect' | 'fragment'
  // 变换操作
  | 'translate' | 'rotate' | 'copy' | 'mirror' | 'scale'
  // 选择和测量
  | 'select' | 'measure' | 'hide_show' | 'lock'
  // 其他工具
  | 'layers' | 'settings' | 'save' | 'export' | 'delete' | 'undo' | 'redo';

export interface CADToolbarProps {
  onToolSelect: (tool: CADToolType) => void;
  activeTool?: CADToolType;
  disabled?: boolean;
  className?: string;
  /**
   * Toolbar positioning mode.
   * - "fixed": pinned to window (default)
   * - "absolute": pinned to its nearest positioned parent (use for anchoring to 3D viewport)
   */
  positionMode?: 'fixed' | 'absolute';
}

const CADToolbar: React.FC<CADToolbarProps> = ({
  onToolSelect,
  activeTool,
  disabled = false,
  className = '',
  positionMode = 'fixed'
}) => {
  const [selectedObjects, setSelectedObjects] = useState<CADObject[]>([]);
  const [allObjects, setAllObjects] = useState<CADObject[]>([]);
  const [isGeometryModalVisible, setIsGeometryModalVisible] = useState(false);
  const [currentGeometryType, setCurrentGeometryType] = useState<keyof GeometryCreationParams>('box');
  const [geometryParams, setGeometryParams] = useState<GeometryCreationParams>({
    box: { width: 2, height: 2, depth: 2 },
    cylinder: { radiusTop: 1, radiusBottom: 1, height: 2, radialSegments: 32 },
    sphere: { radius: 1, widthSegments: 32, heightSegments: 16 },
    cone: { radius: 1, height: 2, radialSegments: 32 },
    torus: { radius: 1, tube: 0.4, radialSegments: 16, tubularSegments: 100 }
  });

  // 监听CAD引擎的选择变化
  useEffect(() => {
    const handleSelectionChange = (objects: CADObject[]) => {
      setSelectedObjects(objects);
    };

    cadGeometryEngine.onSelectionChange(handleSelectionChange);
    
    // 初始化对象列表
    setAllObjects(cadGeometryEngine.getAllObjects());
    
    return () => {
      // 清理监听器
    };
  }, []);

  // 工具定义
  const geometryTools = [
    { key: 'box' as CADToolType, icon: <BorderOutlined />, tooltip: '创建立方体', shortcut: 'B' },
    { key: 'cylinder' as CADToolType, icon: <ColumnWidthOutlined />, tooltip: '创建圆柱体', shortcut: 'C' },
    { key: 'sphere' as CADToolType, icon: <DotChartOutlined />, tooltip: '创建球体', shortcut: 'S' },
    { key: 'cone' as CADToolType, icon: <CaretUpOutlined />, tooltip: '创建圆锥体', shortcut: 'O' }
  ];

  const booleanTools = [
    { key: 'fuse' as CADToolType, icon: <MergeCellsOutlined />, tooltip: '合并几何体', shortcut: 'F' },
    { key: 'cut' as CADToolType, icon: <ScissorOutlined />, tooltip: '切割几何体', shortcut: 'X' },
    { key: 'intersect' as CADToolType, icon: <BorderInnerOutlined />, tooltip: '几何体相交', shortcut: 'I' },
    { key: 'fragment' as CADToolType, icon: <SplitCellsOutlined />, tooltip: '几何体分割', shortcut: 'G' }
  ];

  const transformTools = [
    { key: 'translate' as CADToolType, icon: <DragOutlined />, tooltip: '移动几何体', shortcut: 'T' },
    { key: 'rotate' as CADToolType, icon: <ReloadOutlined />, tooltip: '旋转几何体', shortcut: 'R' },
    { key: 'copy' as CADToolType, icon: <CopyOutlined />, tooltip: '复制几何体', shortcut: 'Ctrl+C' },
    { key: 'mirror' as CADToolType, icon: <SwapOutlined />, tooltip: '镜像几何体', shortcut: 'M' },
    { key: 'scale' as CADToolType, icon: <ExpandOutlined />, tooltip: '缩放几何体', shortcut: 'Ctrl+T' }
  ];

  const utilityTools = [
    { key: 'select' as CADToolType, icon: <AimOutlined />, tooltip: '选择工具', shortcut: 'V' },
    { key: 'measure' as CADToolType, icon: <LineOutlined />, tooltip: '测量工具', shortcut: 'D' },
    { key: 'hide_show' as CADToolType, icon: <EyeOutlined />, tooltip: '显示/隐藏', shortcut: 'H' },
    { key: 'lock' as CADToolType, icon: <LockOutlined />, tooltip: '锁定/解锁', shortcut: 'L' }
  ];

  const systemTools = [
    { key: 'layers' as CADToolType, icon: <AppstoreOutlined />, tooltip: '图层管理', shortcut: '' },
    { key: 'settings' as CADToolType, icon: <SettingOutlined />, tooltip: '设置', shortcut: '' },
    { key: 'save' as CADToolType, icon: <SaveOutlined />, tooltip: '保存模型', shortcut: 'Ctrl+S' },
    { key: 'export' as CADToolType, icon: <ExportOutlined />, tooltip: '导出模型', shortcut: 'Ctrl+E' },
    { key: 'delete' as CADToolType, icon: <DeleteOutlined />, tooltip: '删除选中', shortcut: 'Del' },
    { key: 'undo' as CADToolType, icon: <UndoOutlined />, tooltip: '撤销', shortcut: 'Ctrl+Z' },
    { key: 'redo' as CADToolType, icon: <RedoOutlined />, tooltip: '重做', shortcut: 'Ctrl+Y' }
  ];

  const handleToolClick = async (tool: CADToolType) => {
    if (disabled) {
      message.warning('工具栏已禁用');
      return;
    }

    // 基础几何创建
    if (['box', 'cylinder', 'sphere', 'cone', 'torus'].includes(tool)) {
      setCurrentGeometryType(tool as keyof GeometryCreationParams);
      setIsGeometryModalVisible(true);
      onToolSelect(tool);
      return;
    }

    // 布尔运算需要先选择对象
    if (['fuse', 'cut', 'intersect', 'fragment'].includes(tool)) {
      if (selectedObjects.length < 2) {
        message.warning('布尔运算需要选择至少两个几何体');
        return;
      }
      
      await handleBooleanOperation(tool as 'fuse' | 'cut' | 'intersect' | 'fragment');
      return;
    }

    // 变换操作需要先选择对象
    if (['translate', 'rotate', 'copy', 'mirror', 'scale'].includes(tool)) {
      if (selectedObjects.length === 0) {
        message.warning('请先选择要操作的几何体');
        return;
      }
      
      await handleTransformOperation(tool as 'translate' | 'rotate' | 'copy' | 'mirror' | 'scale');
      return;
    }

    // 删除操作
    if (tool === 'delete') {
      if (selectedObjects.length === 0) {
        message.warning('请先选择要删除的几何体');
        return;
      }
      
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${selectedObjects.length} 个几何体吗？`,
        onOk: () => {
          cadGeometryEngine.deleteObjects(selectedObjects.map(obj => obj.id));
          setAllObjects(cadGeometryEngine.getAllObjects());
          message.success('删除成功');
        }
      });
      return;
    }

    // 撤销重做
    if (tool === 'undo') {
      if (cadGeometryEngine.undo()) {
        setAllObjects(cadGeometryEngine.getAllObjects());
        message.success('撤销成功');
      } else {
        message.info('没有可撤销的操作');
      }
      return;
    }

    if (tool === 'redo') {
      if (cadGeometryEngine.redo()) {
        setAllObjects(cadGeometryEngine.getAllObjects());
        message.success('重做成功');
      } else {
        message.info('没有可重做的操作');
      }
      return;
    }

    onToolSelect(tool);
    
    // 显示操作提示
    const toolMessages: Record<CADToolType, string> = {
      // 基础几何
      box: '点击设置立方体参数',
      cylinder: '点击设置圆柱体参数', 
      sphere: '点击设置球体参数',
      cone: '点击设置圆锥体参数',
      torus: '点击设置环形体参数',
      
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

  // 处理布尔运算
  const handleBooleanOperation = async (operation: 'fuse' | 'cut' | 'intersect' | 'fragment') => {
    try {
      message.loading(`正在执行${operation}布尔运算...`, 0);
      
      const result = await cadGeometryEngine.performBooleanOperation(operation, selectedObjects);
      
      message.destroy();
      
      if (result.success) {
        setAllObjects(cadGeometryEngine.getAllObjects());
        message.success({
          content: (
            <div>
              <div>🎯 2号专家布尔运算完成</div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                操作: {operation} | 耗时: {result.processingTime.toFixed(2)}ms
              </div>
            </div>
          ),
          duration: 5
        });
        
        // 显示警告（如果有）
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            message.warning(warning, 3);
          });
        }
      } else {
        message.error(`布尔运算失败: ${result.warnings.join(', ')}`);
      }
    } catch (error) {
      message.destroy();
      message.error(`布尔运算失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理变换操作
  const handleTransformOperation = async (operation: 'translate' | 'rotate' | 'copy' | 'mirror' | 'scale') => {
    try {
      switch (operation) {
        case 'copy':
          const copiedObjects = cadGeometryEngine.copyGeometry(selectedObjects);
          setAllObjects(cadGeometryEngine.getAllObjects());
          message.success(`成功复制 ${copiedObjects.length} 个几何体`);
          break;
          
        case 'translate':
          // 简单的平移示例
          cadGeometryEngine.transformGeometry(selectedObjects, 'translate', { x: 1, y: 0, z: 0 });
          message.success('几何体已移动');
          break;
          
        case 'rotate':
          // 简单的旋转示例
          cadGeometryEngine.transformGeometry(selectedObjects, 'rotate', { y: Math.PI / 4 });
          message.success('几何体已旋转');
          break;
          
        case 'scale':
          // 简单的缩放示例
          cadGeometryEngine.transformGeometry(selectedObjects, 'scale', { factor: 1.2 });
          message.success('几何体已缩放');
          break;
          
        case 'mirror':
          // 在XY平面镜像
          cadGeometryEngine.transformGeometry(selectedObjects, 'mirror', { plane: 'xy' });
          message.success('几何体已镜像');
          break;
      }
    } catch (error) {
      message.error(`变换操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 创建几何体
  const handleCreateGeometry = async () => {
    try {
      message.loading('正在使用2号专家算法创建几何体...', 0);
      
      const params = geometryParams[currentGeometryType];
      const cadObject = await cadGeometryEngine.createGeometry(currentGeometryType, params);
      
      message.destroy();
      
      setAllObjects(cadGeometryEngine.getAllObjects());
      setIsGeometryModalVisible(false);
      
      message.success({
        content: (
          <div>
            <div>🎯 2号专家几何体创建完成</div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              类型: {currentGeometryType} | ID: {cadObject.id.slice(-8)}
            </div>
          </div>
        ),
        duration: 4
      });
      
      // 触发外部事件，通知3D视图更新
      const event = new CustomEvent('cadGeometryCreated', {
        detail: { cadObject, allObjects: cadGeometryEngine.getAllObjects() }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      message.destroy();
      message.error(`几何体创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 渲染几何参数输入界面
  const renderGeometryParamsForm = () => {
    const params = geometryParams[currentGeometryType];
    
    switch (currentGeometryType) {
      case 'box':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <label>宽度 (m):</label>
              <InputNumber
                min={0.1}
                max={100}
                step={0.1}
                value={params.width}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  box: { ...prev.box, width: value || 1 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>高度 (m):</label>
              <InputNumber
                min={0.1}
                max={100}
                step={0.1}
                value={params.height}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  box: { ...prev.box, height: value || 1 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>深度 (m):</label>
              <InputNumber
                min={0.1}
                max={100}
                step={0.1}
                value={params.depth}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  box: { ...prev.box, depth: value || 1 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
          </Space>
        );
        
      case 'cylinder':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <label>顶部半径 (m):</label>
              <InputNumber
                min={0.1}
                max={50}
                step={0.1}
                value={params.radiusTop}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  cylinder: { ...prev.cylinder, radiusTop: value || 1 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>底部半径 (m):</label>
              <InputNumber
                min={0.1}
                max={50}
                step={0.1}
                value={params.radiusBottom}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  cylinder: { ...prev.cylinder, radiusBottom: value || 1 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>高度 (m):</label>
              <InputNumber
                min={0.1}
                max={100}
                step={0.1}
                value={params.height}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  cylinder: { ...prev.cylinder, height: value || 1 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
          </Space>
        );
        
      case 'sphere':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <label>半径 (m):</label>
              <InputNumber
                min={0.1}
                max={50}
                step={0.1}
                value={params.radius}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  sphere: { ...prev.sphere, radius: value || 1 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>经度分段:</label>
              <InputNumber
                min={8}
                max={64}
                step={4}
                value={params.widthSegments}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  sphere: { ...prev.sphere, widthSegments: value || 32 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>纬度分段:</label>
              <InputNumber
                min={6}
                max={32}
                step={2}
                value={params.heightSegments}
                onChange={(value) => setGeometryParams(prev => ({
                  ...prev,
                  sphere: { ...prev.sphere, heightSegments: value || 16 }
                }))}
                style={{ width: '100%' }}
              />
            </div>
          </Space>
        );
        
      default:
        return <div>参数设置界面开发中...</div>;
    }
  };

  const renderToolGroup = (
    tools: Array<{key: CADToolType, icon: React.ReactNode, tooltip: string, shortcut: string}>,
    title: string
  ) => (
    <div style={{ marginBottom: '8px' }}>
      {/* 工具组标题 */}
      <div style={{
        fontSize: '10px',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginBottom: '4px',
        letterSpacing: '0.5px'
      }}>
        {title}
      </div>
      
      {/* 工具按钮 */}
      {tools.map((tool, index) => (
        <Tooltip
          key={tool.key}
          title={
            <div>
              <div>{tool.tooltip}</div>
              {tool.shortcut && (
                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                  快捷键: {tool.shortcut}
                </div>
              )}
            </div>
          }
          placement="left"
        >
          <Button
            type={activeTool === tool.key ? 'primary' : 'text'}
            icon={tool.icon}
            onClick={() => handleToolClick(tool.key)}
            disabled={disabled}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2px',
              border: activeTool === tool.key ? '1px solid #00d9ff' : '1px solid rgba(255,255,255,0.1)',
              background: activeTool === tool.key ? 'rgba(0, 217, 255, 0.2)' : 'rgba(26, 26, 46, 0.6)',
              color: activeTool === tool.key ? '#00d9ff' : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(5px)',
              boxShadow: activeTool === tool.key ? '0 0 8px rgba(0, 217, 255, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!disabled && activeTool !== tool.key) {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && activeTool !== tool.key) {
                e.currentTarget.style.background = 'rgba(26, 26, 46, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }
            }}
          />
        </Tooltip>
      ))}
      
      {/* 分割线 */}
      <Divider style={{ 
        margin: '8px 0', 
        borderColor: 'rgba(0, 217, 255, 0.2)',
        minWidth: 'unset',
        width: '20px',
        marginLeft: '8px'
      }} />
    </div>
  );

  return (
    <>
      <div 
        className={`cad-toolbar ${className}`}
        style={{
          position: (positionMode ?? 'fixed'),
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          width: '48px',
          background: 'rgba(26, 26, 46, 0.9)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          borderRadius: '8px',
          padding: '8px 6px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 217, 255, 0.1)',
          zIndex: 8500,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
      {/* 工具栏标题 */}
      <div style={{
        fontSize: '12px',
        color: '#00d9ff',
        textAlign: 'center',
        marginBottom: '12px',
        fontWeight: 'bold',
        letterSpacing: '1px'
      }}>
工具
      </div>

      {/* 视口工具 */}
      {renderToolGroup(utilityTools, '视口')}

      {/* 系统工具 */}
      {renderToolGroup(systemTools, '系统')}

      {/* 选中对象计数 */}
      {selectedObjects.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 217, 255, 0.8)',
          color: '#000000',
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '10px',
          fontWeight: 'bold'
        }}>
          {selectedObjects.length}
        </div>
      )}
      </div>

      {/* 几何体创建模态框 */}
      <Modal
        title={
          <div style={{ color: '#00d9ff' }}>
            🔧 2号专家几何体创建 - {currentGeometryType.toUpperCase()}
          </div>
        }
        open={isGeometryModalVisible}
        onOk={handleCreateGeometry}
        onCancel={() => setIsGeometryModalVisible(false)}
        okText="创建几何体"
        cancelText="取消"
        width={400}
        okButtonProps={{
          style: { background: '#00d9ff', borderColor: '#00d9ff' }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: '16px', color: 'rgba(255,255,255,0.8)' }}>
            使用2号几何专家的高精度算法创建{currentGeometryType}几何体，确保符合Fragment标准的网格质量。
          </div>
          
          {renderGeometryParamsForm()}
          
          <div style={{ 
            marginTop: '16px', 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.6)',
            border: '1px dashed rgba(0,217,255,0.3)',
            padding: '8px',
            borderRadius: '4px'
          }}>
            💡 <strong>2号专家提示:</strong>
            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
              <li>自动几何质量优化</li>
              <li>Fragment标准网格验证</li>
              <li>支持后续布尔运算</li>
              <li>智能材质配置</li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CADToolbar;