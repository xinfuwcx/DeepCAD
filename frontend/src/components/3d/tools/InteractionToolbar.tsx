import React, { useState, useCallback } from 'react';
import {
  Card,
  Space,
  Button,
  Tooltip,
  Dropdown,
  Menu,
  Modal,
  List,
  InputNumber,
  Input,
  ColorPicker,
  Switch,
  Slider,
  Divider,
  Badge,
  message,
  Popconfirm
} from 'antd';
import {
  SelectOutlined,
  BorderOutlined,
  ColumnWidthOutlined,
  CommentOutlined,
  ScissorOutlined,
  NodeExpandOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  CopyOutlined,
  UndoOutlined,
  RedoOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { GlassCard, GlassButton } from '../../ui/GlassComponents';
import { InteractionTool, MeasurementResult, Annotation } from './InteractionTools';

interface InteractionToolbarProps {
  currentTool: InteractionTool;
  onToolChange: (tool: InteractionTool) => void;
  measurements: MeasurementResult[];
  annotations: Annotation[];
  selectedCount: number;
  explodeFactor: number;
  onExplodeChange: (factor: number) => void;
  onMeasurementDelete: (id: string) => void;
  onAnnotationDelete: (id: string) => void;
  onMeasurementToggle: (id: string, visible: boolean) => void;
  onAnnotationToggle: (id: string, visible: boolean) => void;
  onClearSelection: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const InteractionToolbar: React.FC<InteractionToolbarProps> = ({
  currentTool,
  onToolChange,
  measurements,
  annotations,
  selectedCount,
  explodeFactor,
  onExplodeChange,
  onMeasurementDelete,
  onAnnotationDelete,
  onMeasurementToggle,
  onAnnotationToggle,
  onClearSelection,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 工具配置
  const tools = [
    {
      key: 'select' as InteractionTool,
      icon: <SelectOutlined />,
      title: '选择工具',
      description: '选择和操作对象',
      shortcut: 'S'
    },
    {
      key: 'measure' as InteractionTool,
      icon: <ColumnWidthOutlined />,
      title: '测量工具',
      description: '测量距离、角度、面积',
      shortcut: 'M'
    },
    {
      key: 'annotate' as InteractionTool,
      icon: <CommentOutlined />,
      title: '标注工具',
      description: '添加注释和标签',
      shortcut: 'A'
    },
    {
      key: 'section' as InteractionTool,
      icon: <ScissorOutlined />,
      title: '剖切工具',
      description: '剖切查看内部结构',
      shortcut: 'C'
    },
    {
      key: 'explode' as InteractionTool,
      icon: <NodeExpandOutlined />,
      title: '爆炸视图',
      description: '分解查看组装关系',
      shortcut: 'E'
    }
  ];

  // 处理工具切换
  const handleToolChange = useCallback((tool: InteractionTool) => {
    onToolChange(tool);
    message.info(`切换到${tools.find(t => t.key === tool)?.title}`);
  }, [onToolChange, tools]);

  // 测量列表菜单
  const measurementMenu = (
    <Card title="测量结果" style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
      {measurements.length === 0 ? (
        <div className="text-center text-secondary py-4">
          <ColumnWidthOutlined className="text-2xl mb-2" />
          <div>暂无测量结果</div>
          <div className="text-xs">使用测量工具开始测量</div>
        </div>
      ) : (
        <List
          dataSource={measurements}
          renderItem={(measurement) => (
            <List.Item
              actions={[
                <Tooltip title={measurement.visible ? '隐藏' : '显示'}>
                  <Button
                    type="text"
                    size="small"
                    icon={measurement.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    onClick={() => onMeasurementToggle(measurement.id, !measurement.visible)}
                  />
                </Tooltip>,
                <Tooltip title="复制数值">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(`${measurement.value.toFixed(3)} ${measurement.unit}`);
                      message.success('已复制到剪贴板');
                    }}
                  />
                </Tooltip>,
                <Popconfirm
                  title="确认删除此测量？"
                  onConfirm={() => onMeasurementDelete(measurement.id)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{measurement.type === 'distance' ? '距离' : 
                           measurement.type === 'angle' ? '角度' : 
                           measurement.type === 'area' ? '面积' : '体积'}</span>
                    <Badge 
                      color={measurement.visible ? 'green' : 'gray'} 
                      text={`${measurement.value.toFixed(3)} ${measurement.unit}`}
                    />
                  </Space>
                }
                description={
                  <div className="text-xs text-secondary">
                    创建于 {new Date(measurement.createdAt).toLocaleString()}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      {measurements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Space size="small">
            <Button
              size="small"
              onClick={() => {
                measurements.forEach(m => onMeasurementToggle(m.id, true));
                message.success('已显示所有测量');
              }}
            >
              全部显示
            </Button>
            <Button
              size="small"
              onClick={() => {
                measurements.forEach(m => onMeasurementToggle(m.id, false));
                message.success('已隐藏所有测量');
              }}
            >
              全部隐藏
            </Button>
            <Popconfirm
              title="确认删除所有测量？"
              onConfirm={() => {
                measurements.forEach(m => onMeasurementDelete(m.id));
                message.success('已删除所有测量');
              }}
            >
              <Button size="small" danger>
                全部删除
              </Button>
            </Popconfirm>
          </Space>
        </div>
      )}
    </Card>
  );

  // 标注列表菜单
  const annotationMenu = (
    <Card title="标注列表" style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
      {annotations.length === 0 ? (
        <div className="text-center text-secondary py-4">
          <CommentOutlined className="text-2xl mb-2" />
          <div>暂无标注</div>
          <div className="text-xs">使用标注工具添加注释</div>
        </div>
      ) : (
        <List
          dataSource={annotations}
          renderItem={(annotation) => (
            <List.Item
              actions={[
                <Tooltip title={annotation.visible ? '隐藏' : '显示'}>
                  <Button
                    type="text"
                    size="small"
                    icon={annotation.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    onClick={() => onAnnotationToggle(annotation.id, !annotation.visible)}
                  />
                </Tooltip>,
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      // 实现编辑功能
                      message.info('编辑功能开发中');
                    }}
                  />
                </Tooltip>,
                <Popconfirm
                  title="确认删除此标注？"
                  onConfirm={() => onAnnotationDelete(annotation.id)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{annotation.type === 'note' ? '注释' :
                           annotation.type === 'dimension' ? '尺寸' :
                           annotation.type === 'leader' ? '引线' : '符号'}</span>
                    <Badge color={annotation.visible ? 'blue' : 'gray'} />
                  </Space>
                }
                description={
                  <div>
                    <div className="mb-1">{annotation.text}</div>
                    <div className="text-xs text-secondary">
                      创建于 {new Date(annotation.createdAt).toLocaleString()}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      {annotations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Space size="small">
            <Button
              size="small"
              onClick={() => {
                annotations.forEach(a => onAnnotationToggle(a.id, true));
                message.success('已显示所有标注');
              }}
            >
              全部显示
            </Button>
            <Button
              size="small"
              onClick={() => {
                annotations.forEach(a => onAnnotationToggle(a.id, false));
                message.success('已隐藏所有标注');
              }}
            >
              全部隐藏
            </Button>
            <Popconfirm
              title="确认删除所有标注？"
              onConfirm={() => {
                annotations.forEach(a => onAnnotationDelete(a.id));
                message.success('已删除所有标注');
              }}
            >
              <Button size="small" danger>
                全部删除
              </Button>
            </Popconfirm>
          </Space>
        </div>
      )}
    </Card>
  );

  // 工具设置面板
  const settingsPanel = (
    <Card title="交互工具设置" style={{ width: 300 }}>
      <div className="space-y-4">
        {/* 选择设置 */}
        <div>
          <div className="font-medium mb-2">选择工具</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">多选模式</span>
              <Switch size="small" defaultChecked />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">框选模式</span>
              <Switch size="small" defaultChecked />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">高亮选中</span>
              <Switch size="small" defaultChecked />
            </div>
          </div>
        </div>

        <Divider />

        {/* 测量设置 */}
        <div>
          <div className="font-medium mb-2">测量工具</div>
          <div className="space-y-2">
            <div>
              <div className="text-sm mb-1">默认单位</div>
              <select className="w-full text-sm border rounded px-2 py-1">
                <option value="mm">毫米 (mm)</option>
                <option value="cm">厘米 (cm)</option>
                <option value="m">米 (m)</option>
                <option value="in">英寸 (in)</option>
              </select>
            </div>
            <div>
              <div className="text-sm mb-1">精度位数</div>
              <InputNumber 
                size="small" 
                min={0} 
                max={6} 
                defaultValue={3} 
                className="w-full"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">实时测量</span>
              <Switch size="small" defaultChecked />
            </div>
          </div>
        </div>

        <Divider />

        {/* 标注设置 */}
        <div>
          <div className="font-medium mb-2">标注工具</div>
          <div className="space-y-2">
            <div>
              <div className="text-sm mb-1">默认字体大小</div>
              <Slider 
                min={12} 
                max={48} 
                defaultValue={24} 
                marks={{ 12: '12', 24: '24', 36: '36', 48: '48' }}
              />
            </div>
            <div>
              <div className="text-sm mb-1">默认颜色</div>
              <ColorPicker defaultValue="#ffff00" size="small" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">自动定位</span>
              <Switch size="small" defaultChecked />
            </div>
          </div>
        </div>

        <Divider />

        {/* 爆炸视图设置 */}
        <div>
          <div className="font-medium mb-2">爆炸视图</div>
          <div className="space-y-2">
            <div>
              <div className="text-sm mb-1">爆炸系数: {explodeFactor.toFixed(2)}</div>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={explodeFactor}
                onChange={onExplodeChange}
                marks={{ 0: '0', 1: '1', 2: '2' }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">动画过渡</span>
              <Switch size="small" defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="interaction-toolbar">
      {/* 主工具栏 */}
      <GlassCard variant="subtle" className="p-2">
        <Space direction="vertical" size="small">
          {/* 主要工具 */}
          <div className="space-y-1">
            {tools.map((tool) => (
              <Tooltip key={tool.key} title={`${tool.title} (${tool.shortcut})`} placement="left">
                <GlassButton
                  variant={currentTool === tool.key ? 'primary' : 'ghost'}
                  size="sm"
                  icon={tool.icon}
                  onClick={() => handleToolChange(tool.key)}
                  className="w-full"
                >
                  {tool.key === 'select' ? '选择' :
                   tool.key === 'measure' ? '测量' :
                   tool.key === 'annotate' ? '标注' :
                   tool.key === 'section' ? '剖切' : '爆炸'}
                </GlassButton>
              </Tooltip>
            ))}
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* 操作工具 */}
          <div className="space-y-1">
            <Tooltip title="撤销 (Ctrl+Z)" placement="left">
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<UndoOutlined />}
                disabled={!canUndo}
                onClick={onUndo}
                className="w-full"
              >
                撤销
              </GlassButton>
            </Tooltip>
            
            <Tooltip title="重做 (Ctrl+Y)" placement="left">
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<RedoOutlined />}
                disabled={!canRedo}
                onClick={onRedo}
                className="w-full"
              >
                重做
              </GlassButton>
            </Tooltip>

            {selectedCount > 0 && (
              <Tooltip title="清空选择" placement="left">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  icon={<BorderOutlined />}
                  onClick={onClearSelection}
                  className="w-full"
                >
                  清选 ({selectedCount})
                </GlassButton>
              </Tooltip>
            )}
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* 信息和设置 */}
          <div className="space-y-1">
            <Dropdown overlay={measurementMenu} trigger={['click']} placement="topLeft">
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<ColumnWidthOutlined />}
                className="w-full"
              >
                <Space>
                  测量
                  {measurements.length > 0 && (
                    <Badge count={measurements.length} size="small" />
                  )}
                </Space>
              </GlassButton>
            </Dropdown>

            <Dropdown overlay={annotationMenu} trigger={['click']} placement="topLeft">
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<CommentOutlined />}
                className="w-full"
              >
                <Space>
                  标注
                  {annotations.length > 0 && (
                    <Badge count={annotations.length} size="small" />
                  )}
                </Space>
              </GlassButton>
            </Dropdown>

            <Dropdown overlay={settingsPanel} trigger={['click']} placement="topLeft">
              <GlassButton
                variant="ghost"
                size="sm"
                icon={<SettingOutlined />}
                className="w-full"
              >
                设置
              </GlassButton>
            </Dropdown>
          </div>
        </Space>
      </GlassCard>

      {/* 工具提示卡片 */}
      <GlassCard variant="subtle" className="p-3 mt-2">
        <div className="text-xs text-secondary space-y-1">
          <div className="font-medium text-primary">
            {tools.find(t => t.key === currentTool)?.title}
          </div>
          <div>{tools.find(t => t.key === currentTool)?.description}</div>
          
          {currentTool === 'select' && (
            <div className="mt-2 space-y-1">
              <div>• 左键点击选择对象</div>
              <div>• Ctrl+左键多选</div>
              <div>• Shift+拖拽框选</div>
            </div>
          )}
          
          {currentTool === 'measure' && (
            <div className="mt-2 space-y-1">
              <div>• 左键点击测量点</div>
              <div>• 双击完成测量</div>
              <div>• 支持连续测量</div>
            </div>
          )}
          
          {currentTool === 'annotate' && (
            <div className="mt-2 space-y-1">
              <div>• 左键点击添加标注</div>
              <div>• 双击编辑文本</div>
              <div>• 拖拽调整位置</div>
            </div>
          )}
          
          {currentTool === 'section' && (
            <div className="mt-2 space-y-1">
              <div>• 拖拽调整剖切位置</div>
              <div>• 滚轮调整剖切深度</div>
              <div>• 右键重置剖切</div>
            </div>
          )}
          
          {currentTool === 'explode' && (
            <div className="mt-2 space-y-1">
              <div>爆炸系数: {explodeFactor.toFixed(2)}</div>
              <div>• 滚轮调整爆炸程度</div>
              <div>• 双击重置视图</div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};