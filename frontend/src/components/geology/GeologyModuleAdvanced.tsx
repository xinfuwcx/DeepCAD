/**
 * 高级地质模块组件 - 2号几何专家开发
 * P1优先级任务 - 专业级地质参数管理和建模配置界面
 * 基于1号架构师规划，提供复杂地质场景的完整参数控制和数据管理
 * 集成钻孔数据管理、地层参数编辑、域扩展配置、表格化编辑等高级功能
 */

import React, { useState, useCallback } from 'react';
import { 
  Space, Button, Select, InputNumber, Row, Col, Typography, Upload, 
  Alert, Form, Tabs, Card, Table, Switch, Collapse, Divider,
  Modal, Input, Popconfirm, message
} from 'antd';
import { 
  UploadOutlined, EnvironmentOutlined, CheckCircleOutlined, 
  BorderOutlined, ThunderboltOutlined, PlusOutlined, DeleteOutlined,
  SettingOutlined, ExperimentOutlined, DatabaseOutlined,
  EditOutlined, EyeOutlined
} from '@ant-design/icons';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GeologyParamsAdvancedSchema, type GeologyParamsAdvanced, type Borehole, type Stratum } from '../../schemas';

const { Text, Title } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { Panel } = Collapse;
const { TextArea } = Input;

/**
 * 高级地质模块组件属性接口
 * 定义高级地质参数管理组件的输入输出接口和状态控制
 */
interface GeologyModuleAdvancedProps {
  params: GeologyParamsAdvanced;                           // 当前地质参数数据
  onParamsChange: (params: GeologyParamsAdvanced) => void; // 参数变更回调函数
  onGenerate: (validatedData: GeologyParamsAdvanced) => void; // 生成建模回调函数
  onPreview?: (params: GeologyParamsAdvanced) => void;     // 可选的预览回调函数
  status: 'wait' | 'process' | 'finish' | 'error';        // 建模状态标志
}

/**
 * 高级地质模块主组件
 * 提供专业级地质参数管理、钻孔数据编辑、域配置等高级功能
 * 集成React Hook Form表单验证和Zod数据校验策略
 */
const GeologyModuleAdvanced: React.FC<GeologyModuleAdvancedProps> = ({ 
  params, 
  onParamsChange, 
  onGenerate, 
  onPreview,
  status 
}) => {
  // UI状态管理 - 交互元素状态控制
  const [uploadStatus, setUploadStatus] = useState<'none' | 'uploading' | 'success' | 'error'>('none'); // 文件上传状态
  const [activeTab, setActiveTab] = useState<string>('1');           // 当前激活的选项卡
  const [selectedBorehole, setSelectedBorehole] = useState<string | null>(null); // 选中的钻孔ID
  
  // 模态框状态管理 - 编辑对话框控制
  const [boreholeModalVisible, setBoreholeModalVisible] = useState(false);  // 钻孔编辑模态框
  const [stratumModalVisible, setStratumModalVisible] = useState(false);    // 地层编辑模态框

  /**
   * 初始化默认地质参数配置
   * 基于地质工程最佳实践的优化默认参数设置
   * 包含域扩展、插值方法、输出配置等关键参数
   */
  const defaultGeologyParams: GeologyParamsAdvanced = {
    boreholes: [],                    // 空钻孔数组，等待用户导入
    domain: {
      extension_method: 'convex_hull',  // 默认使用凸包方法扩展域
      x_extend: 100,                    // X方向扩展100米
      y_extend: 100,                    // Y方向扩展100米
      bottom_elevation: -50,
      mesh_resolution: 2.0
    },
    algorithm: {
      core_radius: 50,
      transition_distance: 150,
      variogram_model: 'spherical',
      trend_order: 'linear',
      uncertainty_analysis: false
    },
    soil_model: {
      constitutive_model: 'mohr_coulomb',
      description: '莫尔-库伦本构模型，适用于一般土体分析',
      selected_materials: []
    },
    gmsh_params: {
      characteristic_length: 2.0,
      physical_groups: true,
      mesh_quality: 0.8
    }
  };

  // React Hook Form with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    getValues
  } = useForm<GeologyParamsAdvanced>({
    resolver: zodResolver(GeologyParamsAdvancedSchema),
    defaultValues: params || defaultGeologyParams,
    mode: 'onChange'
  });

  // 钻孔数据管理
  const { fields: boreholes, append: addBorehole, remove: removeBorehole, update: updateBorehole } = useFieldArray({
    control,
    name: 'boreholes'
  });

  // 土层类型映射
  const soilTypeMap = {
    clay: { label: '粘土', color: '#8B4513' },
    sand: { label: '砂土', color: '#F4A460' },  
    silt: { label: '粉土', color: '#DDD' },
    gravel: { label: '卵石', color: '#696969' },
    rock: { label: '基岩', color: '#2F4F4F' },
    fill: { label: '填土', color: '#D2B48C' }
  };

  // 实时预览逻辑
  const watchedValues = watch();
  React.useEffect(() => {
    onParamsChange(watchedValues);
  }, [watchedValues, onParamsChange]);

  React.useEffect(() => {
    if (onPreview && uploadStatus === 'success' && isValid) {
      const previewTimer = setTimeout(() => {
        onPreview(watchedValues);
      }, 500);
      return () => clearTimeout(previewTimer);
    }
  }, [watchedValues, onPreview, uploadStatus, isValid]);

  // 钻孔数据上传处理
  const uploadProps = {
    name: 'borehole_data',
    multiple: false,
    accept: '.json,.csv,.xlsx',
    beforeUpload: (file: any) => {
      setUploadStatus('uploading');
      
      // 模拟解析钻孔数据
      setTimeout(() => {
        const mockBoreholes: Borehole[] = [
          {
            id: 'BH001',
            name: 'ZK001',
            x: 0,
            y: 0,
            ground_elevation: 3.5,
            total_depth: 30,
            strata: [
              {
                id: 'S1',
                top_elev: 3.5,
                bottom_elev: -2.5,
                soil_type: 'fill',
                density: 1800,
                cohesion: 15,
                friction: 18
              },
              {
                id: 'S2', 
                top_elev: -2.5,
                bottom_elev: -15.0,
                soil_type: 'clay',
                density: 1900,
                cohesion: 45,
                friction: 12
              },
              {
                id: 'S3',
                top_elev: -15.0,
                bottom_elev: -26.5,
                soil_type: 'sand',
                density: 2000,
                cohesion: 0,
                friction: 32
              }
            ]
          },
          {
            id: 'BH002',
            name: 'ZK002', 
            x: 50,
            y: 30,
            ground_elevation: 3.8,
            total_depth: 35,
            strata: [
              {
                id: 'S4',
                top_elev: 3.8,
                bottom_elev: -1.2,
                soil_type: 'fill',
                density: 1750,
                cohesion: 12,
                friction: 20
              },
              {
                id: 'S5',
                top_elev: -1.2,
                bottom_elev: -18.3,
                soil_type: 'clay', 
                density: 1950,
                cohesion: 50,
                friction: 10
              },
              {
                id: 'S6',
                top_elev: -18.3,
                bottom_elev: -31.2,
                soil_type: 'rock',
                density: 2500,
                cohesion: 500,
                friction: 45
              }
            ]
          }
        ];

        setValue('boreholes', mockBoreholes);
        setUploadStatus('success');
        message.success(`成功导入${mockBoreholes.length}个钻孔数据`);
      }, 2000);
      
      return false;
    },
    showUploadList: false
  };

  // 添加新钻孔
  const handleAddBorehole = () => {
    const newBorehole: Borehole = {
      id: `BH${String(boreholes.length + 1).padStart(3, '0')}`,
      name: `ZK${String(boreholes.length + 1).padStart(3, '0')}`,
      x: 0,
      y: 0,
      ground_elevation: 0,
      total_depth: 20,
      strata: [{
        id: 'S1',
        top_elev: 0,
        bottom_elev: -10,
        soil_type: 'clay',
        density: 1900,
        cohesion: 30,
        friction: 15
      }]
    };
    
    addBorehole(newBorehole);
    message.success('已添加新钻孔');
  };

  // 钻孔表格列定义
  const boreholeColumns = [
    {
      title: '钻孔编号',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: 'X坐标(m)',
      dataIndex: 'x', 
      key: 'x',
      width: 80,
      render: (val: number) => val.toFixed(2)
    },
    {
      title: 'Y坐标(m)',
      dataIndex: 'y',
      key: 'y', 
      width: 80,
      render: (val: number) => val.toFixed(2)
    },
    {
      title: '地面标高(m)',
      dataIndex: 'ground_elevation',
      key: 'ground_elevation',
      width: 100,
      render: (val: number) => val.toFixed(2)
    },
    {
      title: '钻孔深度(m)',
      dataIndex: 'total_depth',
      key: 'total_depth',
      width: 100,
      render: (val: number) => val.toFixed(1)
    },
    {
      title: '土层数',
      dataIndex: 'strata',
      key: 'strataCount',
      width: 80,
      render: (strata: Stratum[]) => strata?.length || 0
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Borehole, index: number) => (
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedBorehole(record.id);
              setBoreholeModalVisible(true);
            }}
          />
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedBorehole(record.id);
              setBoreholeModalVisible(true);
            }}
          />
          <Popconfirm
            title="确定删除此钻孔吗？"
            onConfirm={() => {
              removeBorehole(index);
              message.success('已删除钻孔');
            }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const tabItems = [
    {
      key: '1',
      label: (
        <span style={{ color: '#ffffff', fontSize: '13px' }}>
          <DatabaseOutlined style={{ marginRight: '6px' }} />
          钻孔数据
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* 钻孔数据上传 */}
          <Card 
            title="📊 钻孔数据导入" 
            size="small"
            style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              marginBottom: '20px'
            }}
            headStyle={{ 
              background: 'transparent', 
              border: 'none',
              color: '#ffffff',
              fontSize: '14px'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Dragger {...uploadProps} style={{ 
              background: 'rgba(0, 217, 255, 0.02)',
              border: '1px dashed rgba(0, 217, 255, 0.4)'
            }}>
              <p style={{ margin: 0, fontSize: '24px', color: '#00d9ff' }}>
                <UploadOutlined />
              </p>
              <p style={{ color: '#ffffff', fontSize: '14px', margin: '6px 0' }}>
                点击或拖拽文件上传
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', margin: 0 }}>
                支持 JSON、CSV、Excel 格式的钻孔数据
              </p>
            </Dragger>
            
            {uploadStatus === 'uploading' && (
              <Alert 
                message="正在解析钻孔数据..." 
                type="info" 
                showIcon 
                style={{ marginTop: '12px' }}
              />
            )}
            
            {uploadStatus === 'success' && (
              <Alert
                message={`成功导入 ${boreholes.length} 个钻孔数据`}
                description={`包含 ${boreholes.reduce((sum, bh) => sum + (bh.strata?.length || 0), 0)} 个土层段`}
                type="success"
                showIcon
                style={{ marginTop: '12px' }}
              />
            )}
          </Card>

          {/* 钻孔数据管理 */}
          <Card
            title="🗃️ 钻孔数据管理"
            size="small"
            style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              marginBottom: '20px'
            }}
            headStyle={{ 
              background: 'transparent', 
              border: 'none',
              color: '#ffffff',
              fontSize: '14px'
            }}
            bodyStyle={{ padding: '16px' }}
            extra={
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={handleAddBorehole}
                style={{ 
                  background: 'rgba(0, 217, 255, 0.8)',
                  border: 'none'
                }}
              >
                添加钻孔
              </Button>
            }
          >
            <Table
              columns={boreholeColumns}
              dataSource={boreholes}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 200 }}
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)'
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: '2', 
      label: (
        <span style={{ color: '#ffffff', fontSize: '13px' }}>
          <BorderOutlined style={{ marginRight: '6px' }} />
          计算域设置
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* 计算域扩展方式 */}
          <Card
            title="📐 计算域定义"
            size="small"
            style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              marginBottom: '20px'
            }}
            headStyle={{ 
              background: 'transparent', 
              border: 'none',
              color: '#ffffff',
              fontSize: '14px'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Row gutter={16}>
              <Col span={24} style={{ marginBottom: '12px' }}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>扩展方式</Text>}>
                  <Controller
                    name="domain.extension_method"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} style={{ width: '100%' }}>
                        <Option value="convex_hull">钻孔凸包缓冲</Option>
                        <Option value="foundation_multiple">基坑尺寸倍数</Option>
                        <Option value="manual">手动指定</Option>
                      </Select>
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>X方向扩展(m)</Text>}>
                  <Controller
                    name="domain.x_extend"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={20}
                        max={2000}
                        step={10}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>Y方向扩展(m)</Text>}>
                  <Controller
                    name="domain.y_extend"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={20}
                        max={2000}
                        step={10}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>底部标高(m)</Text>}>
                  <Controller
                    name="domain.bottom_elevation"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={-200}
                        max={0}
                        step={1}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>网格分辨率(m)</Text>}>
                  <Controller
                    name="domain.mesh_resolution"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={0.5}
                        max={20}
                        step={0.5}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>
      ),
    },
    {
      key: '3',
      label: (
        <span style={{ color: '#ffffff', fontSize: '13px' }}>
          <SettingOutlined style={{ marginRight: '6px' }} />
          土体计算模型
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* 土体计算模型选择 */}
          <Card
            title="🧮 土体本构模型配置"
            size="small"
            style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              marginBottom: '20px'
            }}
            headStyle={{ 
              background: 'transparent', 
              border: 'none',
              color: '#ffffff',
              fontSize: '14px'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Row gutter={16}>
              <Col span={24} style={{ marginBottom: '16px' }}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>项目本构模型</Text>}>
                  <Controller
                    name="soil_model.constitutive_model"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} style={{ width: '100%' }} size="large">
                        <Option value="linear_elastic">线弹性模型</Option>
                        <Option value="mohr_coulomb">莫尔-库伦模型</Option>
                        <Option value="drucker_prager">德鲁克-普拉格模型</Option>
                        <Option value="cam_clay">剑桥黏土模型</Option>
                        <Option value="hardening_soil">硬化土模型</Option>
                        <Option value="small_strain">小应变土模型</Option>
                        <Option value="elastic_perfectly_plastic">理想弹塑性模型</Option>
                        <Option value="nonlinear_elastic">非线性弹性模型</Option>
                      </Select>
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>模型说明</Text>}>
                  <Controller
                    name="soil_model.description"
                    control={control}
                    render={({ field }) => (
                      <TextArea
                        {...field}
                        placeholder="请输入本构模型的说明和适用条件..."
                        rows={3}
                        style={{ 
                          background: 'rgba(0, 217, 255, 0.05)',
                          borderColor: 'rgba(0, 217, 255, 0.3)',
                          color: '#ffffff'
                        }}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Alert
              message="土体计算模型说明"
              description="所选择的本构模型将应用于整个项目的所有土层。不同的模型适用于不同的工程条件，请根据实际情况选择合适的模型。"
              type="info"
              showIcon
              style={{ 
                background: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                marginTop: '16px'
              }}
            />
          </Card>

          {/* 材料库关联 */}
          <Card
            title="🗂️ 材料库关联"
            size="small"
            style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)'
            }}
            headStyle={{ 
              background: 'transparent', 
              border: 'none',
              color: '#ffffff',
              fontSize: '14px'
            }}
            bodyStyle={{ padding: '16px' }}
            extra={
              <Button 
                type="link" 
                size="small"
                style={{ color: '#00d9ff' }}
                onClick={() => {
                  // 打开材料库管理页面
                  message.info('材料库管理功能 - 将在材料管理模块中实现');
                  // 可以通过路由跳转或打开模态框方式实现
                }}
              >
                📝 管理材料库
              </Button>
            }
          >
            <div style={{ marginBottom: '12px' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                💡 提示：在材料库中创建和管理土体材料参数，然后在此处关联到对应的土层类型。
              </Text>
            </div>
            
            <div style={{ 
              background: 'rgba(0, 217, 255, 0.05)', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px dashed rgba(0, 217, 255, 0.3)',
              textAlign: 'center'
            }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                材料库功能正在开发中...
              </Text>
              <br />
              <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
                将支持从材料库中选择预定义的土体参数
              </Text>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: '4',
      label: (
        <span style={{ color: '#ffffff', fontSize: '13px' }}>
          <ThunderboltOutlined style={{ marginRight: '6px' }} />
          三区混合算法
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          {/* 三区参数设置 */}
          <Card
            title="⚙️ 克里金 + 趋势面混合算法"
            size="small"
            style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              marginBottom: '20px'
            }}
            headStyle={{ 
              background: 'transparent', 
              border: 'none',
              color: '#ffffff',
              fontSize: '14px'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>核心区半径(m)</Text>}>
                  <Controller
                    name="algorithm.core_radius"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={10}
                        max={500}
                        step={5}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>过渡距离(m)</Text>}>
                  <Controller
                    name="algorithm.transition_distance"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={20}
                        max={1000}
                        step={10}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>变差函数模型</Text>}>
                  <Controller
                    name="algorithm.variogram_model"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} style={{ width: '100%' }}>
                        <Option value="spherical">球状模型</Option>
                        <Option value="exponential">指数模型</Option>
                        <Option value="gaussian">高斯模型</Option>
                        <Option value="matern">Matern模型</Option>
                      </Select>
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>趋势面阶次</Text>}>
                  <Controller
                    name="algorithm.trend_order"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} style={{ width: '100%' }}>
                        <Option value="linear">线性趋势面</Option>
                        <Option value="quadratic">二次趋势面</Option>
                      </Select>
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text style={{ color: '#ffffff' }}>不确定性分析</Text>
                    <Controller
                      name="algorithm.uncertainty_analysis"
                      control={control}
                      render={({ field }) => (
                        <Switch 
                          {...field} 
                          checked={field.value}
                          size="small"
                        />
                      )}
                    />
                  </div>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>置信水平</Text>}>
                  <Controller
                    name="algorithm.confidence_level"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} style={{ width: '100%' }}>
                        <Option value={0.90}>90%</Option>
                        <Option value={0.95}>95%</Option>
                        <Option value={0.99}>99%</Option>
                      </Select>
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* GMSH OCC 参数 */}
          <Card
            title="🔧 GMSH OCC 几何构建"
            size="small"
            style={{ 
              background: 'rgba(0, 217, 255, 0.05)',
              border: '1px solid rgba(0, 217, 255, 0.2)'
            }}
            headStyle={{ 
              background: 'transparent', 
              border: 'none',
              color: '#ffffff',
              fontSize: '14px'
            }}
            bodyStyle={{ padding: '16px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>特征长度(m)</Text>}>
                  <Controller
                    name="gmsh_params.characteristic_length"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={0.1}
                        max={50}
                        step={0.5}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<Text style={{ color: '#ffffff' }}>网格质量</Text>}>
                  <Controller
                    name="gmsh_params.mesh_quality"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        style={{ width: '100%' }}
                        min={0.1}
                        max={1.0}
                        step={0.1}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text style={{ color: '#ffffff' }}>物理分组</Text>
                    <Controller
                      name="gmsh_params.physical_groups"
                      control={control}
                      render={({ field }) => (
                        <Switch 
                          {...field} 
                          checked={field.value}
                          size="small"
                        />
                      )}
                    />
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>
      ),
    },
  ];

  const onSubmit = (data: GeologyParamsAdvanced) => {
    onGenerate(data);
  };

  // 检查是否满足生成条件
  const canGenerate = () => {
    return activeTab === '4' && 
           boreholes.length >= 3 && 
           uploadStatus === 'success' && 
           isValid;
  };

  return (
    <div>
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        {/* 标题区域 */}
        <div style={{ 
          textAlign: 'center', 
          borderBottom: '1px solid rgba(0, 217, 255, 0.3)',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <EnvironmentOutlined style={{ fontSize: '24px', color: '#00d9ff', marginRight: '8px' }} />
          <Title level={4} style={{ color: '#00d9ff', margin: 0, display: 'inline', fontWeight: 'normal' }}>
            多层分段三区混合地质建模
          </Title>
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '12px', 
            display: 'block', 
            marginTop: '6px',
            lineHeight: '1.3'
          }}>
            基于RBF + PyVista + GMSH OCC的高精度三维地层重建
          </Text>
        </div>

        {/* Tab 内容 */}
        <Tabs
          items={tabItems}
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: '20px' }}
          tabBarStyle={{ marginBottom: '0px' }}
          tabBarGutter={16}
        />

        {/* 生成按钮 */}
        <Button
          type="primary"
          size="large"
          style={{
            width: '100%',
            height: '40px',
            fontSize: '14px',
            background: status === 'finish' ? 'rgba(82, 196, 26, 0.8)' :
                       status === 'process' ? 'rgba(250, 173, 20, 0.8)' :
                       canGenerate() ? 'rgba(0, 217, 255, 0.8)' : 'rgba(100, 100, 100, 0.5)',
            border: 'none',
            borderRadius: '6px',
            boxShadow: canGenerate() ? '0 2px 8px rgba(0, 217, 255, 0.3)' : 'none'
          }}
          loading={status === 'process'}
          disabled={!canGenerate() || status === 'finish'}
          icon={status === 'finish' ? <CheckCircleOutlined /> : <ThunderboltOutlined />}
          onClick={handleSubmit(onSubmit)}
        >
          {status === 'finish' ? '三维地质模型已生成' : 
           status === 'process' ? '正在执行RBF建模...' : 
           activeTab !== '4' ? '请完成前置配置并切换到算法Tab' :
           boreholes.length < 3 ? '至少需要3个钻孔数据' :
           uploadStatus !== 'success' ? '请先上传钻孔数据' : 
           '🚀 生成三维地质模型 (.msh + .gltf)'}
        </Button>

        {/* 状态提示 */}
        {status === 'finish' && (
          <Alert
            style={{
              background: 'rgba(82, 196, 26, 0.1)',
              border: '1px solid rgba(82, 196, 26, 0.3)',
              marginTop: '16px'
            }}
            message={<span style={{ color: '#52c41a', fontSize: '12px' }}>多层分段地质建模完成</span>}
            description={
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px' }}>
                已成功生成带物理分组的三维体网格文件，可直接用于数值求解
              </span>
            }
            type="success"
            showIcon
          />
        )}
        
        {status === 'error' && (
          <Alert
            style={{
              background: 'rgba(255, 77, 79, 0.1)',
              border: '1px solid rgba(255, 77, 79, 0.3)',
              marginTop: '16px'
            }}
            message={<span style={{ color: '#ff4d4f', fontSize: '12px' }}>地质建模失败</span>}
            description={
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px' }}>
                请检查钻孔数据格式和算法参数设置后重试
              </span>
            }
            type="error"
            showIcon
          />
        )}
      </Form>
    </div>
  );
};

export default GeologyModuleAdvanced;