import React, { useEffect, useState } from 'react';
import { Form, Card, Row, Col, Divider, Space, InputNumber, Switch, Alert, Table, Button, Popconfirm, Tabs, Select, Typography } from 'antd';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { MeshGenerationRequest } from '../../services/meshingService';
import { 
  AnimatedNumberInput, 
  AnimatedSelect, 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';
import { SaveOutlined, ToolOutlined, PlusOutlined, DeleteOutlined, ExperimentOutlined, ProfileOutlined, BorderOutlined as BorderHorizontalOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Text } = Typography;

// 锚杆排布配置
interface AnchorRow {
  id: string;
  rowNumber: number;
  horizontalSpacing: number; // 水平间距
  verticalPosition: number; // 距离顶部深度
  anchorCount: number; // 每排锚杆数量
  prestress: number; // 预应力 (kN)
  enabled: boolean; // 是否启用
}

// 腰梁配置
interface WalerBeam {
  enabled: boolean;
  width: number;
  height: number;
  elevation: number;
  material: string;
  connection_type: 'rigid' | 'hinged' | 'elastic';
  steel_grade: string;
}

interface AnchorRodProps {
  component: any;
  systemConfig?: {
    systemType: 'pile_anchor' | 'diaphragm_anchor';
    anchorSystem: {
      needsWalerBeam: boolean;
      supportWallType: 'pile' | 'diaphragm_wall';
    };
  };
}

const AnchorRodForm: React.FC<AnchorRodProps> = ({ component, systemConfig }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('anchors');
  const [anchorRows, setAnchorRows] = useState<AnchorRow[]>(
    component.anchor_rows || [
      {
        id: '1',
        rowNumber: 1,
        horizontalSpacing: 2.0,
        verticalPosition: 3.0,
        anchorCount: 5,
        prestress: 150,
        enabled: true
      }
    ]
  );
  const [multiRowMode, setMultiRowMode] = useState(component.multi_row_mode || false);
  const [globalPrestress, setGlobalPrestress] = useState(component.global_prestress || 0);
  const [walerBeam, setWalerBeam] = useState<WalerBeam>(
    component.waler_beam || {
      enabled: false,
      width: 0.3,
      height: 0.4,
      elevation: -1.0,
      material: 'steel',
      connection_type: 'rigid',
      steel_grade: 'Q345'
    }
  );
  
  const { scene, updateComponent } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      updateComponent: state.updateComponent,
    }))
  );
  
  const materials = scene?.materials || [];

  useEffect(() => {
    form.setFieldsValue({
      free_length: component.free_length,
      bonded_length: component.bonded_length,
      diameter: component.diameter,
      angle: component.angle,
      material_id: component.material_id,
      multi_row_mode: component.multi_row_mode || false,
      global_prestress: component.global_prestress || 0,
    });
    
    if (component.anchor_rows) {
      setAnchorRows(component.anchor_rows);
    }
    if (component.waler_beam) {
      setWalerBeam(component.waler_beam);
    }
    setMultiRowMode(component.multi_row_mode || false);
    setGlobalPrestress(component.global_prestress || 0);
  }, [component, form]);

  // Fragment网格生成API调用
  const callFragmentMeshAPI = async (request: MeshGenerationRequest) => {
    const response = await fetch('/api/meshing/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  };

  const handleSave = async () => {
    const values = form.getFieldsValue();
    
    // 更新组件配置
    updateComponent(component.id, {
      ...component,
      ...values,
      anchor_rows: anchorRows,
      multi_row_mode: multiRowMode,
      global_prestress: globalPrestress,
      waler_beam: walerBeam,
    });

    // 如果启用了Fragment配置，生成锚杆的Fragment
    if (systemConfig?.fragmentConfig?.enable_fragment) {
      try {
        // 生成锚杆的Fragment配置
        const anchorFragments = anchorRows
          .filter(row => row.enabled)
          .map((row, index) => ({
            id: `anchor_row_${row.id}`,
            name: `第${row.rowNumber}排锚杆`,
            fragment_type: 'structure' as const,
            geometry: {
              type: 'auto_anchor_layout' as const,
              geometry: {
                excavation_boundary: systemConfig.fragmentConfig?.excavation_geometry?.boundary_points || [],
                horizontal_spacing: row.horizontalSpacing,
                vertical_position: row.verticalPosition,
                anchor_count: row.anchorCount,
                anchor_angle: values.angle || 15,
                anchor_length: (values.free_length || 5) + (values.bonded_length || 8),
                anchor_diameter: values.diameter || 150,
                support_wall_type: systemConfig.anchorSystem.supportWallType,
                waler_beam_enabled: walerBeam.enabled && systemConfig.anchorSystem.needsWalerBeam
              }
            },
            mesh_properties: {
              element_size: 0.3,
              element_type: 'tetrahedral',
              mesh_density: 'fine'
            },
            enabled: true,
            priority: 3 + index // 锚杆优先级在排桩之后
          }));

        const meshRequest: MeshGenerationRequest = {
          boundingBoxMin: [-30, -30, -Math.max(...anchorRows.map(r => r.verticalPosition)) - 10],
          boundingBoxMax: [30, 30, 5],
          meshSize: 0.8,
          clientId: `anchor_system_${component.id}`,
          enable_fragment: true,
          domain_fragments: [
            // 已有的Fragment
            ...(systemConfig.fragmentConfig.domain_fragments || []),
            // 锚杆Fragment
            ...anchorFragments
          ],
          global_mesh_settings: {
            element_type: 'tetrahedral',
            default_element_size: 0.8,
            mesh_quality: 'fine',
            mesh_smoothing: true
          }
        };

        console.log('发送锚杆Fragment网格生成请求:', meshRequest);
        
        // 生成网格
        const meshResult = await callFragmentMeshAPI(meshRequest);
        console.log('锚杆Fragment网格生成成功:', meshResult);
        
      } catch (error) {
        console.error('锚杆Fragment网格生成失败:', error);
      }
    }
  };

  // 添加新排
  const addAnchorRow = () => {
    const newRow: AnchorRow = {
      id: String(Date.now()),
      rowNumber: anchorRows.length + 1,
      horizontalSpacing: 2.0,
      verticalPosition: (anchorRows.length + 1) * 3.0,
      anchorCount: 5,
      prestress: 150,
      enabled: true
    };
    setAnchorRows([...anchorRows, newRow]);
  };

  // 删除排
  const removeAnchorRow = (id: string) => {
    setAnchorRows(anchorRows.filter(row => row.id !== id));
  };

  // 更新排配置
  const updateAnchorRow = (id: string, field: keyof AnchorRow, value: any) => {
    setAnchorRows(anchorRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // 计算总锚杆数量
  const getTotalAnchors = () => {
    return anchorRows
      .filter(row => row.enabled)
      .reduce((total, row) => total + row.anchorCount, 0);
  };

  // 计算总预应力
  const getTotalPrestress = () => {
    if (!multiRowMode) {
      return globalPrestress * getTotalAnchors();
    }
    return anchorRows
      .filter(row => row.enabled)
      .reduce((total, row) => total + (row.prestress * row.anchorCount), 0);
  };

  // 获取选项数据
  const getSteelGradeOptions = () => [
    { value: 'Q235', label: 'Q235' },
    { value: 'Q345', label: 'Q345' },
    { value: 'Q390', label: 'Q390' },
    { value: 'Q420', label: 'Q420' }
  ];

  const getConnectionTypeOptions = () => [
    { value: 'rigid', label: '刚性连接' },
    { value: 'hinged', label: '铰接连接' },
    { value: 'elastic', label: '弹性连接' }
  ];

  // 新增：根据支护体系判断是否需要腰梁
  const shouldShowWalerBeam = () => {
    return systemConfig?.anchorSystem.needsWalerBeam ?? true;
  };

  // 获取当前支护墙类型描述
  const getSupportWallDescription = () => {
    const wallType = systemConfig?.anchorSystem.supportWallType || 'pile';
    if (wallType === 'pile') {
      return '排桩支护体系 - 锚杆需要腰梁分配荷载';
    } else {
      return '地连墙支护体系 - 锚杆直接连接墙体';
    }
  };

  // 渲染腰梁截面图
  const renderWalerSection = () => (
    <div style={{ 
      width: '100%', 
      height: '300px', 
      border: '1px solid #d9d9d9', 
      borderRadius: '6px',
      background: '#fafafa',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <svg width="280" height="280" viewBox="0 0 280 280">
        {/* 腰梁截面 */}
        {walerBeam.enabled && (
          <g>
            <rect 
              x={140 - (walerBeam.width * 50)} 
              y={140 - (walerBeam.height * 50)} 
              width={walerBeam.width * 100} 
              height={walerBeam.height * 100} 
              fill="#B0C4DE" 
              stroke="#4682B4" 
              strokeWidth="2"
            />
            <text x="140" y="120" fontSize="12" fill="#333" textAnchor="middle">
              腰梁 {walerBeam.width}×{walerBeam.height}m
            </text>
            <text x="140" y="200" fontSize="10" fill="#666" textAnchor="middle">
              {walerBeam.steel_grade} 钢
            </text>
          </g>
        )}
        
        {/* 锚杆连接点 */}
        {anchorRows.filter(row => row.enabled).map((row, index) => {
          const y = 140 + (index - anchorRows.length/2) * 30;
          return (
            <g key={row.id}>
              <circle cx="90" cy={y} r="4" fill="#FF6B6B" />
              <line x1="90" y1={y} x2="110" y2={y} stroke="#FF6B6B" strokeWidth="2" />
              <text x="75" y={y + 3} fontSize="8" fill="#666" textAnchor="end">
                排{row.rowNumber}
              </text>
            </g>
          );
        })}
        
        {/* 尺寸标注 */}
        <g stroke="#666" strokeWidth="1" fill="#666">
          <line x1="220" y1={140 - (walerBeam.height * 50)} x2="220" y2={140 + (walerBeam.height * 50)} />
          <text x="225" y="140" fontSize="10">{walerBeam.height}m</text>
          <line x1={140 - (walerBeam.width * 50)} y1="230" x2={140 + (walerBeam.width * 50)} y2="230" />
          <text x="140" y="245" fontSize="10" textAnchor="middle">{walerBeam.width}m</text>
        </g>
      </svg>
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      className="settings-form"
      initialValues={{
        free_length: component.free_length,
        bonded_length: component.bonded_length,
        diameter: component.diameter,
        angle: component.angle,
        material_id: component.material_id,
        multi_row_mode: component.multi_row_mode || false,
        global_prestress: component.global_prestress || 0,
      }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 锚杆参数配置 */}
        <TabPane 
          tab={<Space><ToolOutlined />锚杆参数</Space>} 
          key="anchors"
        >
          {/* 支护体系说明 */}
          <Alert
            message="当前支护体系"
            description={getSupportWallDescription()}
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <div className="form-group">
            <div className="form-group-title">
              <ToolOutlined /> 锚杆参数
            </div>
            
            <div className="form-row">
              <div className="form-col form-col-6">
                <FormItemWithTooltip 
                  label="自由段长度" 
                  name="free_length"
                  tooltip="锚杆的自由段长度，单位为米"
                >
                  <AnimatedNumberInput 
                    min={0} 
                    step={0.5} 
                    precision={2}
                    unit="m" 
                  />
                </FormItemWithTooltip>
              </div>
              
              <div className="form-col form-col-6">
                <FormItemWithTooltip 
                  label="锚固段长度" 
                  name="bonded_length"
                  tooltip="锚杆的锚固段长度，单位为米"
                >
                  <AnimatedNumberInput 
                    min={0} 
                    step={0.5} 
                    precision={2}
                    unit="m" 
                  />
                </FormItemWithTooltip>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-col form-col-6">
                <FormItemWithTooltip 
                  label="直径" 
                  name="diameter"
                  tooltip="锚杆的直径，单位为毫米"
                >
                  <AnimatedNumberInput 
                    min={0} 
                    step={10} 
                    precision={0}
                    unit="mm" 
                  />
                </FormItemWithTooltip>
              </div>
              
              <div className="form-col form-col-6">
                <FormItemWithTooltip 
                  label="倾角" 
                  name="angle"
                  tooltip="锚杆与水平面的夹角，单位为度"
                >
                  <AnimatedNumberInput 
                    min={0} 
                    max={90} 
                    step={1}
                    precision={0}
                    unit="°" 
                  />
                </FormItemWithTooltip>
              </div>
            </div>
            
            <FormItemWithTooltip 
              label="材料" 
              name="material_id"
              tooltip="选择锚杆的材料类型"
            >
              <AnimatedSelect
                options={materials.map((material: any) => ({
                  value: material.id,
                  label: material.name
                }))}
                placeholder="选择材料"
              />
            </FormItemWithTooltip>
          </div>

          <Divider />

          {/* 多排布置配置 */}
          <div className="form-group">
            <div className="form-group-title">
              <ExperimentOutlined /> 锚杆布置
            </div>
            
            <FormItemWithTooltip
              name="multiRowMode"
              label="多排布置模式"
              tooltip="启用多排布置可以设置不同深度的多排锚杆"
            >
              <Switch 
                checked={multiRowMode}
                onChange={(checked) => {
                  setMultiRowMode(checked);
                  form.setFieldValue('multi_row_mode', checked);
                }}
                checkedChildren="多排"
                unCheckedChildren="单排"
              />
            </FormItemWithTooltip>

            {!multiRowMode ? (
              // 单排模式 - 全局预应力
              <Card size="small" title="单排配置">
                <Row gutter={16}>
                  <Col span={12}>
                    <FormItemWithTooltip
                      name="singleRowCount"
                      label="锚杆数量"
                      tooltip="单排锚杆的数量"
                    >
                      <InputNumber
                        min={1}
                        max={50}
                        defaultValue={5}
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="水平间距"
                      tooltip="锚杆之间的水平间距"
                    >
                      <InputNumber
                        min={0.5}
                        max={10}
                        step={0.1}
                        defaultValue={2.0}
                        addonAfter="m"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={24}>
                    <FormItemWithTooltip
                      label="预应力"
                      name="global_prestress"
                      tooltip="施加在每根锚杆上的预应力"
                    >
                      <InputNumber
                        min={0}
                        max={1000}
                        step={10}
                        value={globalPrestress}
                        onChange={(value) => {
                          setGlobalPrestress(value || 0);
                          form.setFieldValue('global_prestress', value || 0);
                        }}
                        addonAfter="kN"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                </Row>
              </Card>
            ) : (
              // 多排模式 - 详细配置
              <Card size="small" title="多排配置">
                <div style={{ marginBottom: '16px' }}>
                  <Button 
                    type="dashed" 
                    icon={<PlusOutlined />} 
                    onClick={addAnchorRow}
                    style={{ width: '100%' }}
                  >
                    添加锚杆排
                  </Button>
                </div>
                
                <Table
                  dataSource={anchorRows}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: '排号',
                      dataIndex: 'rowNumber',
                      width: 60,
                      render: (_, record) => record.rowNumber
                    },
                    {
                      title: '深度(m)',
                      dataIndex: 'verticalPosition',
                      width: 100,
                      render: (value, record) => (
                        <InputNumber
                          size="small"
                          min={0.5}
                          step={0.5}
                          value={value}
                          onChange={(val) => updateAnchorRow(record.id, 'verticalPosition', val || 0)}
                        />
                      )
                    },
                    {
                      title: '数量',
                      dataIndex: 'anchorCount',
                      width: 80,
                      render: (value, record) => (
                        <InputNumber
                          size="small"
                          min={1}
                          max={20}
                          value={value}
                          onChange={(val) => updateAnchorRow(record.id, 'anchorCount', val || 1)}
                        />
                      )
                    },
                    {
                      title: '间距(m)',
                      dataIndex: 'horizontalSpacing',
                      width: 100,
                      render: (value, record) => (
                        <InputNumber
                          size="small"
                          min={0.5}
                          step={0.1}
                          value={value}
                          onChange={(val) => updateAnchorRow(record.id, 'horizontalSpacing', val || 1)}
                        />
                      )
                    },
                    {
                      title: '预应力(kN)',
                      dataIndex: 'prestress',
                      width: 120,
                      render: (value, record) => (
                        <InputNumber
                          size="small"
                          min={0}
                          step={10}
                          value={value}
                          onChange={(val) => updateAnchorRow(record.id, 'prestress', val || 0)}
                        />
                      )
                    },
                    {
                      title: '启用',
                      dataIndex: 'enabled',
                      width: 60,
                      render: (value, record) => (
                        <Switch
                          size="small"
                          checked={value}
                          onChange={(checked) => updateAnchorRow(record.id, 'enabled', checked)}
                        />
                      )
                    },
                    {
                      title: '操作',
                      width: 60,
                      render: (_, record) => (
                        <Popconfirm
                          title="确定删除这排锚杆？"
                          onConfirm={() => removeAnchorRow(record.id)}
                        >
                          <Button 
                            type="text" 
                            size="small" 
                            icon={<DeleteOutlined />} 
                            danger
                          />
                        </Popconfirm>
                      )
                    }
                  ]}
                />
              </Card>
            )}

            {/* 统计信息 */}
            <Alert
              message="锚杆统计"
              description={
                <Space direction="vertical" size={4}>
                  <div>总锚杆数量: <strong>{getTotalAnchors()}</strong> 根</div>
                  <div>总预应力: <strong>{getTotalPrestress().toFixed(1)}</strong> kN</div>
                  {multiRowMode && (
                    <div>有效排数: <strong>{anchorRows.filter(row => row.enabled).length}</strong> 排</div>
                  )}
                </Space>
              }
              type="info"
              style={{ marginTop: '16px' }}
            />
          </div>
        </TabPane>

        {/* 腰梁配置 - 根据支护体系显示 */}
        {shouldShowWalerBeam() && (
          <TabPane 
            tab={<Space><BorderHorizontalOutlined />腰梁配置</Space>} 
            key="waler"
          >
          <Card title="腰梁参数" size="small">
            <FormItemWithTooltip
              label="启用腰梁"
              tooltip="腰梁用于连接和分配锚杆拉力"
            >
              <Switch
                checked={walerBeam.enabled}
                onChange={(checked) => setWalerBeam({...walerBeam, enabled: checked})}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            </FormItemWithTooltip>

            {walerBeam.enabled && (
              <>
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="腰梁宽度"
                      tooltip="腰梁截面宽度"
                    >
                      <InputNumber
                        value={walerBeam.width}
                        onChange={(value) => setWalerBeam({...walerBeam, width: value || 0.3})}
                        min={0.2}
                        max={1.0}
                        step={0.05}
                        addonAfter="m"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="腰梁高度"
                      tooltip="腰梁截面高度"
                    >
                      <InputNumber
                        value={walerBeam.height}
                        onChange={(value) => setWalerBeam({...walerBeam, height: value || 0.4})}
                        min={0.2}
                        max={1.5}
                        step={0.05}
                        addonAfter="m"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: '16px' }}>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="腰梁标高"
                      tooltip="腰梁中心线标高"
                    >
                      <InputNumber
                        value={walerBeam.elevation}
                        onChange={(value) => setWalerBeam({...walerBeam, elevation: value || -1.0})}
                        min={-50}
                        max={10}
                        step={0.1}
                        addonAfter="m"
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                  <Col span={12}>
                    <FormItemWithTooltip
                      label="钢材牌号"
                      tooltip="腰梁钢材强度等级"
                    >
                      <Select
                        value={walerBeam.steel_grade}
                        onChange={(value) => setWalerBeam({...walerBeam, steel_grade: value})}
                        options={getSteelGradeOptions()}
                        style={{ width: '100%' }}
                      />
                    </FormItemWithTooltip>
                  </Col>
                </Row>

                <FormItemWithTooltip
                  label="连接方式"
                  tooltip="锚杆与腰梁的连接类型"
                  style={{ marginTop: '16px' }}
                >
                  <Select
                    value={walerBeam.connection_type}
                    onChange={(value) => setWalerBeam({...walerBeam, connection_type: value})}
                    options={getConnectionTypeOptions()}
                    style={{ width: '100%' }}
                  />
                </FormItemWithTooltip>
              </>
            )}
          </Card>

          {walerBeam.enabled && (
            <Alert
              message="腰梁信息"
              description={
                <Space direction="vertical" size={4}>
                  <div>截面尺寸: <strong>{walerBeam.width}×{walerBeam.height} m</strong></div>
                  <div>截面面积: <strong>{(walerBeam.width * walerBeam.height).toFixed(4)} m²</strong></div>
                  <div>连接锚杆: <strong>{anchorRows.filter(row => row.enabled).length}</strong> 排</div>
                </Space>
              }
              type="info"
              style={{ marginTop: '16px' }}
            />
          )}
        </TabPane>
        )}

        {/* 截面图 */}
        <TabPane 
          tab={<Space><ProfileOutlined />截面图</Space>} 
          key="section"
        >
          <Card title="锚杆+腰梁截面图" size="small">
            {renderWalerSection()}
          </Card>
        </TabPane>
      </Tabs>
      
      <div className="form-actions" style={{ marginTop: '24px', textAlign: 'center' }}>
        <AnimatedButton 
          type="primary" 
          onClick={handleSave}
          icon={<SaveOutlined />}
          className="hover-scale"
        >
          保存锚杆系统配置
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default AnchorRodForm;