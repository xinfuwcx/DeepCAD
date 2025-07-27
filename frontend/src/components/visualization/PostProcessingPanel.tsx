import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Select,
  Slider,
  Switch,
  Button,
  Radio,
  InputNumber,
  Tabs,
  Row,
  Col,
  Space,
  Alert,
  Progress,
  message,
  Tooltip,
  Typography,
  Divider,
  Tag
} from 'antd';
import {
  ThunderboltOutlined,
  EyeOutlined,
  SettingOutlined,
  BgColorsOutlined,
  LineChartOutlined,
  HeatMapOutlined,
  CompressOutlined,
  ReloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';

import { apiClient } from '../../api/client';
import { useWebSocket } from '../../api/websocket';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

interface FieldInfo {
  name: string;
  display_name: string;
  unit: string;
  data_range?: [number, number];
  colormap?: string;
}

interface PostProcessingPanelProps {
  className?: string;
  sessionId?: string;
  onFieldChange?: (field: string) => void;
  onDeformationChange?: (show: boolean, scale: number) => void;
}

export const PostProcessingPanel: React.FC<PostProcessingPanelProps> = ({
  className,
  sessionId,
  onFieldChange,
  onDeformationChange
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<string>('structural');
  const [availableFields, setAvailableFields] = useState<FieldInfo[]>([]);
  const [currentField, setCurrentField] = useState<string>('von_mises_stress');
  const [fieldDetails, setFieldDetails] = useState<Record<string, any>>({});
  
  // 可视化设置
  const [colormap, setColormap] = useState<string>('viridis');
  const [showDeformation, setShowDeformation] = useState<boolean>(true);
  const [deformationScale, setDeformationScale] = useState<number>(1.0);
  const [dataRange, setDataRange] = useState<[number, number]>([0, 100]);
  const [opacity, setOpacity] = useState<number>(1.0);
  
  // 分析参数
  const [meshNodes, setMeshNodes] = useState<number>(1000);
  const [meshElements, setMeshElements] = useState<number>(500);
  const [meshBounds, setMeshBounds] = useState<number[]>([-10, 10, -10, 10, -20, 0]);
  
  // 可用选项
  const [availableColormaps, setAvailableColormaps] = useState<any[]>([]);
  
  const { isConnected, clientId } = useWebSocket();

  // WebSocket消息处理
  useEffect(() => {
    if (!isConnected) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'postprocessing_started':
            setLoading(true);
            message.info(`开始生成${data.analysis_type}分析结果`);
            break;
            
          case 'data_generated':
            message.info('分析数据生成完成');
            break;
            
          case 'postprocessing_completed':
            setLoading(false);
            if (data.field_info) {
              setAvailableFields(Object.keys(data.field_info.field_details).map(name => ({
                name,
                display_name: data.field_info.field_details[name].display_name,
                unit: data.field_info.field_details[name].unit,
                data_range: data.field_info.field_details[name].data_range,
                colormap: data.field_info.field_details[name].colormap
              })));
              setFieldDetails(data.field_info.field_details);
              setCurrentField(data.field_info.current_field);
            }
            message.success('后处理可视化完成');
            break;
            
          case 'field_updated':
            setCurrentField(data.field_name);
            if (data.data_range) {
              setDataRange(data.data_range);
            }
            message.success(`字段已切换到: ${data.field_name}`);
            break;
            
          case 'colormap_updated':
            setColormap(data.colormap);
            message.success(`颜色映射已更新: ${data.colormap}`);
            break;
            
          case 'deformation_updated':
            setShowDeformation(data.show_deformation);
            setDeformationScale(data.scale_factor);
            break;
            
          case 'postprocessing_error':
          case 'field_update_error':
          case 'colormap_update_error':
            setLoading(false);
            message.error(data.message);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    // 这里需要根据实际的WebSocket实现来监听消息
    // 暂时使用模拟的方式
    
    return () => {
      // 清理监听器
    };
  }, [isConnected]);

  // 初始化可用选项
  useEffect(() => {
    loadAvailableColormaps();
    if (analysisType) {
      loadAvailableFields(analysisType);
    }
  }, [analysisType]);

  // 加载可用字段
  const loadAvailableFields = useCallback(async (type: string) => {
    try {
      const response = await apiClient.get(`/postprocessing/fields/available?analysis_type=${type}`);
      if (response.data.success) {
        setAvailableFields(response.data.fields);
        if (response.data.fields.length > 0) {
          setCurrentField(response.data.fields[0].name);
        }
      }
    } catch (error: any) {
      message.error('加载可用字段失败');
    }
  }, []);

  // 加载可用颜色映射
  const loadAvailableColormaps = useCallback(async () => {
    try {
      const response = await apiClient.get('/postprocessing/colormaps/available');
      if (response.data.success) {
        setAvailableColormaps(response.data.colormaps);
      }
    } catch (error: any) {
      message.error('加载颜色映射失败');
    }
  }, []);

  // 生成分析结果
  const generateAnalysisResults = useCallback(async () => {
    if (!sessionId || !clientId) {
      message.error('会话未初始化');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/postprocessing/generate', {
        session_id: sessionId,
        analysis_type: analysisType,
        n_nodes: meshNodes,
        n_elements: meshElements,
        mesh_bounds: meshBounds,
        field_name: currentField,
        colormap: colormap,
        show_deformation: showDeformation,
        deformation_scale: deformationScale
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        message.success('开始生成分析结果');
      }
    } catch (error: any) {
      setLoading(false);
      message.error(error.response?.data?.detail || '生成分析结果失败');
    }
  }, [sessionId, clientId, analysisType, meshNodes, meshElements, meshBounds, currentField, colormap, showDeformation, deformationScale]);

  // 更新可视化字段
  const updateField = useCallback(async (fieldName: string) => {
    if (!sessionId || !clientId) return;

    try {
      const response = await apiClient.post('/postprocessing/field/update', {
        session_id: sessionId,
        field_name: fieldName,
        colormap: colormap,
        data_range: dataRange,
        show_deformation: showDeformation,
        deformation_scale: deformationScale
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        onFieldChange?.(fieldName);
      }
    } catch (error: any) {
      message.error('更新字段失败');
    }
  }, [sessionId, clientId, colormap, dataRange, showDeformation, deformationScale, onFieldChange]);

  // 更新颜色映射
  const updateColormap = useCallback(async (newColormap: string) => {
    if (!sessionId || !clientId) return;

    try {
      const response = await apiClient.post('/postprocessing/colormap/update', {
        session_id: sessionId,
        colormap: newColormap,
        reverse: false,
        n_colors: 256
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        setColormap(newColormap);
      }
    } catch (error: any) {
      message.error('更新颜色映射失败');
    }
  }, [sessionId, clientId]);

  // 更新变形显示
  const updateDeformation = useCallback(async (show: boolean, scale: number) => {
    if (!sessionId || !clientId) return;

    try {
      const response = await apiClient.post('/postprocessing/deformation/update', {
        session_id: sessionId,
        show_deformation: show,
        scale_factor: scale,
        reference_field: 'displacement'
      }, {
        params: { client_id: clientId }
      });

      if (response.data.success) {
        setShowDeformation(show);
        setDeformationScale(scale);
        onDeformationChange?.(show, scale);
      }
    } catch (error: any) {
      message.error('更新变形显示失败');
    }
  }, [sessionId, clientId, onDeformationChange]);

  // 渲染分析设置面板
  const renderAnalysisSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Text strong>分析类型:</Text>
        <Select
          value={analysisType}
          onChange={setAnalysisType}
          style={{ width: '100%', marginTop: 4 }}
          size="small"
        >
          <Option value="structural">结构分析</Option>
          <Option value="thermal">传热分析</Option>
          <Option value="geomechanics">岩土分析</Option>
          <Option value="coupled">耦合分析</Option>
        </Select>
      </div>

      <Row gutter={8}>
        <Col span={12}>
          <Text>节点数:</Text>
          <InputNumber
            value={meshNodes}
            onChange={(value) => setMeshNodes(value || 1000)}
            min={100}
            max={10000}
            step={100}
            size="small"
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={12}>
          <Text>单元数:</Text>
          <InputNumber
            value={meshElements}
            onChange={(value) => setMeshElements(value || 500)}
            min={50}
            max={5000}
            step={50}
            size="small"
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      <Button
        type="primary"
        icon={<ThunderboltOutlined />}
        onClick={generateAnalysisResults}
        loading={loading}
        block
        size="small"
      >
        生成分析结果
      </Button>

      {loading && (
        <Alert
          message="正在生成分析结果..."
          description="请稍候，这可能需要几秒钟时间"
          type="info"
          showIcon
        />
      )}
    </Space>
  );

  // 渲染字段控制面板
  const renderFieldControls = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Text strong>显示字段:</Text>
        <Select
          value={currentField}
          onChange={(value) => {
            setCurrentField(value);
            updateField(value);
          }}
          style={{ width: '100%', marginTop: 4 }}
          size="small"
          disabled={availableFields.length === 0}
        >
          {availableFields.map(field => (
            <Option key={field.name} value={field.name}>
              {field.display_name} ({field.unit})
            </Option>
          ))}
        </Select>
      </div>

      {fieldDetails[currentField] && (
        <div>
          <Text type="secondary">
            数据范围: {fieldDetails[currentField].data_range?.[0]?.toFixed(2)} ~ {fieldDetails[currentField].data_range?.[1]?.toFixed(2)} {fieldDetails[currentField].unit}
          </Text>
        </div>
      )}

      <div>
        <Text strong>颜色映射:</Text>
        <Select
          value={colormap}
          onChange={updateColormap}
          style={{ width: '100%', marginTop: 4 }}
          size="small"
        >
          {availableColormaps.map(cm => (
            <Option key={cm.name} value={cm.name}>
              <Space>
                {cm.display_name}
                <Tag>{cm.description}</Tag>
              </Space>
            </Option>
          ))}
        </Select>
      </div>

      <div>
        <Text strong>透明度: {opacity}</Text>
        <Slider
          min={0.1}
          max={1.0}
          step={0.1}
          value={opacity}
          onChange={setOpacity}
          tooltip={{ formatter: (value) => `${(value! * 100).toFixed(0)}%` }}
        />
      </div>
    </Space>
  );

  // 渲染变形控制面板
  const renderDeformationControls = () => (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>显示变形:</Text>
        <Switch
          checked={showDeformation}
          onChange={(checked) => updateDeformation(checked, deformationScale)}
          size="small"
        />
      </div>

      {showDeformation && (
        <>
          <div>
            <Text strong>变形放大系数: {deformationScale}x</Text>
            <Slider
              min={0.1}
              max={10.0}
              step={0.1}
              value={deformationScale}
              onChange={(value) => {
                setDeformationScale(value);
                updateDeformation(showDeformation, value);
              }}
              tooltip={{ formatter: (value) => `${value}x` }}
            />
          </div>

          <Alert
            message="变形显示"
            description="变形放大显示仅用于可视化，不代表真实变形幅度"
            type="info"
            showIcon
          />
        </>
      )}
    </Space>
  );

  return (
    <div className={className}>
      <Card title="后处理可视化" size="small">
        <Tabs size="small" type="card">
          <TabPane 
            tab={<span><ThunderboltOutlined />分析</span>} 
            key="analysis"
          >
            {renderAnalysisSettings()}
          </TabPane>

          <TabPane 
            tab={<span><HeatMapOutlined />字段</span>} 
            key="fields"
          >
            {renderFieldControls()}
          </TabPane>

          <TabPane 
            tab={<span><CompressOutlined />变形</span>} 
            key="deformation"
          >
            {renderDeformationControls()}
          </TabPane>
        </Tabs>

        {availableFields.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Divider style={{ margin: '8px 0' }} />
            <Space wrap>
              {availableFields.map(field => (
                <Tag
                  key={field.name}
                  color={field.name === currentField ? 'blue' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setCurrentField(field.name);
                    updateField(field.name);
                  }}
                >
                  {field.display_name}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};