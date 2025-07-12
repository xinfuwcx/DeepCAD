import React, { useEffect, useState } from 'react';
import { Form, Card, Row, Col, Divider, Space, InputNumber, Switch, Alert, Table, Button, Popconfirm } from 'antd';
import { useSceneStore } from '../../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  AnimatedNumberInput, 
  AnimatedSelect, 
  AnimatedButton, 
  FormItemWithTooltip 
} from './FormControls';
import { SaveOutlined, ToolOutlined, PlusOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons';

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

interface AnchorRodProps {
  component: any;
}

const AnchorRodForm: React.FC<AnchorRodProps> = ({ component }) => {
  const [form] = Form.useForm();
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
    setMultiRowMode(component.multi_row_mode || false);
    setGlobalPrestress(component.global_prestress || 0);
  }, [component, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    updateComponent(component.id, {
      ...component,
      ...values,
      anchor_rows: anchorRows,
      multi_row_mode: multiRowMode,
      global_prestress: globalPrestress,
    });
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
      
      <div className="form-actions">
        <AnimatedButton 
          type="primary" 
          onClick={handleSave}
          icon={<SaveOutlined />}
          className="hover-scale"
        >
          保存更改
        </AnimatedButton>
      </div>
    </Form>
  );
};

export default AnchorRodForm; 