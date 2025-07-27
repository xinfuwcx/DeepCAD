import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  Tag,
  Tooltip,
  Input,
  Select,
  Popconfirm,
  Modal,
  Form,
  InputNumber,
  ColorPicker,
  Switch,
  Divider,
  Statistic,
  Row,
  Col,
  Empty,
  message
} from 'antd';
import {
  ColumnWidthOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  ExportOutlined,
  SearchOutlined,
  FilterOutlined,
  CalculatorOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { MeasurementResult } from './InteractionTools';

const { Option } = Select;
const { Search } = Input;

interface MeasurementPanelProps {
  measurements: MeasurementResult[];
  onMeasurementUpdate: (id: string, updates: Partial<MeasurementResult>) => void;
  onMeasurementDelete: (id: string) => void;
  onMeasurementToggle: (id: string, visible: boolean) => void;
  onExportMeasurements: (measurements: MeasurementResult[]) => void;
  onCreateCustomMeasurement?: () => void;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
  measurements,
  onMeasurementUpdate,
  onMeasurementDelete,
  onMeasurementToggle,
  onExportMeasurements,
  onCreateCustomMeasurement
}) => {
  const [editingMeasurement, setEditingMeasurement] = useState<MeasurementResult | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showCalculator, setShowCalculator] = useState(false);
  const [form] = Form.useForm();

  // 过滤和搜索测量结果
  const filteredMeasurements = useMemo(() => {
    return measurements.filter(measurement => {
      const matchesSearch = measurement.label.toLowerCase().includes(searchText.toLowerCase()) ||
                           measurement.type.toLowerCase().includes(searchText.toLowerCase());
      const matchesFilter = filterType === 'all' || measurement.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [measurements, searchText, filterType]);

  // 统计信息
  const statistics = useMemo(() => {
    const total = measurements.length;
    const visible = measurements.filter(m => m.visible).length;
    const byType = measurements.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 计算总长度/面积/体积
    const totalDistance = measurements
      .filter(m => m.type === 'distance')
      .reduce((sum, m) => sum + m.value, 0);
    
    const totalArea = measurements
      .filter(m => m.type === 'area')
      .reduce((sum, m) => sum + m.value, 0);
    
    const totalVolume = measurements
      .filter(m => m.type === 'volume')
      .reduce((sum, m) => sum + m.value, 0);

    return {
      total,
      visible,
      byType,
      totalDistance,
      totalArea,
      totalVolume
    };
  }, [measurements]);

  // 处理编辑测量
  const handleEditMeasurement = (measurement: MeasurementResult) => {
    setEditingMeasurement(measurement);
    form.setFieldsValue(measurement);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    form.validateFields().then(values => {
      if (editingMeasurement) {
        onMeasurementUpdate(editingMeasurement.id, values);
        setEditingMeasurement(null);
        message.success('测量信息已更新');
      }
    });
  };

  // 复制测量值
  const handleCopyValue = (measurement: MeasurementResult) => {
    const text = `${measurement.value.toFixed(3)} ${measurement.unit}`;
    navigator.clipboard.writeText(text);
    message.success('测量值已复制到剪贴板');
  };

  // 导出选中的测量
  const handleExportSelected = (selectedRowKeys: React.Key[]) => {
    const selectedMeasurements = measurements.filter(m => 
      selectedRowKeys.includes(m.id)
    );
    onExportMeasurements(selectedMeasurements);
  };

  // 表格列定义
  const columns: ColumnsType<MeasurementResult> = [
    {
      title: '状态',
      dataIndex: 'visible',
      key: 'visible',
      width: 60,
      render: (visible: boolean, record) => (
        <Button
          type="text"
          size="small"
          icon={visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          onClick={() => onMeasurementToggle(record.id, !visible)}
        />
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const colors = {
          distance: 'blue',
          angle: 'green',
          area: 'orange',
          volume: 'purple'
        };
        const labels = {
          distance: '距离',
          angle: '角度',
          area: '面积',
          volume: '体积'
        };
        return (
          <Tag color={colors[type as keyof typeof colors]}>
            {labels[type as keyof typeof labels] || type}
          </Tag>
        );
      },
      filters: [
        { text: '距离', value: 'distance' },
        { text: '角度', value: 'angle' },
        { text: '面积', value: 'area' },
        { text: '体积', value: 'volume' }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
      ellipsis: true,
      render: (label: string, record) => (
        <span>{label || `${record.type}_${record.id.slice(-6)}`}</span>
      )
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      render: (value: number, record) => (
        <Space>
          <span className="font-mono">
            {value.toFixed(3)} {record.unit}
          </span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyValue(record)}
          />
        </Space>
      ),
      sorter: (a, b) => a.value - b.value
    },
    {
      title: '点数',
      dataIndex: 'points',
      key: 'points',
      width: 60,
      render: (points: any[]) => points.length
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (timestamp: number) => (
        <span className="text-xs">
          {new Date(timestamp).toLocaleString()}
        </span>
      ),
      sorter: (a, b) => a.createdAt - b.createdAt
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditMeasurement(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除此测量？"
            onConfirm={() => onMeasurementDelete(record.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="measurement-panel">
      <Card 
        title={
          <Space>
            <ColumnWidthOutlined />
            <span>测量管理</span>
            <Tag color="blue">{statistics.total} 项</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={onCreateCustomMeasurement}
            >
              添加测量
            </Button>
            <Button
              size="small"
              icon={<CalculatorOutlined />}
              onClick={() => setShowCalculator(true)}
            >
              计算器
            </Button>
            <Button
              size="small"
              icon={<ExportOutlined />}
              onClick={() => onExportMeasurements(filteredMeasurements)}
            >
              导出
            </Button>
          </Space>
        }
      >
        {/* 统计信息 */}
        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Statistic 
              title="总测量数" 
              value={statistics.total} 
              prefix={<ColumnWidthOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="可见测量" 
              value={statistics.visible} 
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总距离" 
              value={statistics.totalDistance} 
              precision={2}
              suffix="mm"
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总面积" 
              value={statistics.totalArea} 
              precision={2}
              suffix="mm²"
            />
          </Col>
        </Row>

        <Divider />

        {/* 搜索和过滤 */}
        <Row gutter={16} className="mb-4">
          <Col span={12}>
            <Search
              placeholder="搜索测量标签或类型..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="过滤类型"
              value={filterType}
              onChange={setFilterType}
              style={{ width: '100%' }}
              prefix={<FilterOutlined />}
            >
              <Option value="all">全部类型</Option>
              <Option value="distance">距离</Option>
              <Option value="angle">角度</Option>
              <Option value="area">面积</Option>
              <Option value="volume">体积</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Space>
              <Button
                size="small"
                onClick={() => {
                  measurements.forEach(m => onMeasurementToggle(m.id, true));
                  message.success('已显示所有测量');
                }}
              >
                全显示
              </Button>
              <Button
                size="small"
                onClick={() => {
                  measurements.forEach(m => onMeasurementToggle(m.id, false));
                  message.success('已隐藏所有测量');
                }}
              >
                全隐藏
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 测量表格 */}
        {filteredMeasurements.length === 0 ? (
          <Empty
            image={<ColumnWidthOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            description={
              measurements.length === 0 ? 
                "暂无测量数据，使用测量工具开始测量" : 
                "没有符合条件的测量结果"
            }
          >
            {measurements.length === 0 && (
              <Button type="primary" onClick={onCreateCustomMeasurement}>
                创建测量
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredMeasurements}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 项，共 ${total} 项测量`
            }}
            rowSelection={{
              type: 'checkbox',
              onSelect: (record, selected, selectedRows) => {
                // 可以在这里处理选择逻辑
              },
              onSelectAll: (selected, selectedRows, changeRows) => {
                // 可以在这里处理全选逻辑
              }
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>

      {/* 编辑测量模态框 */}
      <Modal
        title="编辑测量"
        open={!!editingMeasurement}
        onOk={handleSaveEdit}
        onCancel={() => setEditingMeasurement(null)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="标签" name="label">
            <Input placeholder="输入测量标签" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="数值" name="value">
                <InputNumber
                  style={{ width: '100%' }}
                  precision={3}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="单位" name="unit">
                <Select>
                  <Option value="mm">毫米 (mm)</Option>
                  <Option value="cm">厘米 (cm)</Option>
                  <Option value="m">米 (m)</Option>
                  <Option value="in">英寸 (in)</Option>
                  <Option value="ft">英尺 (ft)</Option>
                  <Option value="°">度 (°)</Option>
                  <Option value="rad">弧度 (rad)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="颜色" name="color">
            <ColorPicker />
          </Form.Item>

          <Form.Item label="可见性" name="visible" valuePropName="checked">
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 计算器模态框 */}
      <Modal
        title="测量计算器"
        open={showCalculator}
        onCancel={() => setShowCalculator(false)}
        footer={null}
        width={400}
      >
        <div className="space-y-4">
          <div>
            <div className="font-medium mb-2">单位转换</div>
            <Row gutter={8}>
              <Col span={10}>
                <InputNumber 
                  placeholder="输入数值"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={6}>
                <Select defaultValue="mm" style={{ width: '100%' }}>
                  <Option value="mm">mm</Option>
                  <Option value="cm">cm</Option>
                  <Option value="m">m</Option>
                  <Option value="in">in</Option>
                </Select>
              </Col>
              <Col span={2} className="text-center">
                =
              </Col>
              <Col span={6}>
                <Select defaultValue="cm" style={{ width: '100%' }}>
                  <Option value="mm">mm</Option>
                  <Option value="cm">cm</Option>
                  <Option value="m">m</Option>
                  <Option value="in">in</Option>
                </Select>
              </Col>
            </Row>
          </div>

          <Divider />

          <div>
            <div className="font-medium mb-2">面积计算</div>
            <div className="space-y-2">
              <div>矩形面积 = 长 × 宽</div>
              <div>圆形面积 = π × 半径²</div>
              <div>三角形面积 = 底 × 高 ÷ 2</div>
            </div>
          </div>

          <Divider />

          <div>
            <div className="font-medium mb-2">体积计算</div>
            <div className="space-y-2">
              <div>长方体体积 = 长 × 宽 × 高</div>
              <div>圆柱体体积 = π × 半径² × 高</div>
              <div>球体体积 = 4/3 × π × 半径³</div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};