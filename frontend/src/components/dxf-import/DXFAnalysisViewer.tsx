import React, { useState } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Tabs,
  Alert,
  Progress,
  Row,
  Col,
  Statistic,
  List,
  Typography,
  Badge,
  Tooltip,
  Space
} from 'antd';
import {
  FileTextOutlined,
  AppstoreOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  BugOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import type { DXFAnalysisResult } from '../../hooks/useDXFImport';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

interface DXFAnalysisViewerProps {
  analysis: DXFAnalysisResult;
}

export const DXFAnalysisViewer: React.FC<DXFAnalysisViewerProps> = ({ analysis }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // 获取问题严重程度统计
  const getIssueStats = () => {
    const stats = { error: 0, warning: 0, info: 0 };
    analysis.validation_issues.forEach(issue => {
      stats[issue.severity]++;
    });
    return stats;
  };

  const issueStats = getIssueStats();

  // 图层表格列定义
  const layerColumns: ColumnType<typeof analysis.layers[0]>[] = [
    {
      title: '图层名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Text code strong>{name}</Text>
      ),
    },
    {
      title: '实体数量',
      dataIndex: 'entity_count',
      key: 'entity_count',
      align: 'right',
      sorter: (a, b) => a.entity_count - b.entity_count,
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, layer) => (
        <Space>
          <Tag color={layer.is_visible ? 'green' : 'default'}>
            {layer.is_visible ? '可见' : '隐藏'}
          </Tag>
          {layer.is_frozen && <Tag color="blue">冻结</Tag>}
          {layer.is_locked && <Tag color="orange">锁定</Tag>}
        </Space>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color?: number) => (
        color !== undefined ? (
          <div style={{ 
            width: 20, 
            height: 20, 
            backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
            border: '1px solid #d9d9d9',
            borderRadius: 4
          }} />
        ) : (
          <Text type="secondary">默认</Text>
        )
      ),
    },
    {
      title: '线型',
      dataIndex: 'linetype',
      key: 'linetype',
      render: (linetype?: string) => (
        <Text type="secondary">{linetype || '连续'}</Text>
      ),
    },
  ];

  // 实体表格列定义
  const entityColumns: ColumnType<typeof analysis.entities[0]>[] = [
    {
      title: '句柄',
      dataIndex: 'handle',
      key: 'handle',
      width: 100,
      render: (handle: string) => (
        <Text code>{handle}</Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: '图层',
      dataIndex: 'layer',
      key: 'layer',
      render: (layer: string) => (
        <Text>{layer}</Text>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color?: number) => (
        color !== undefined ? (
          <div style={{ 
            width: 16, 
            height: 16, 
            backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
            border: '1px solid #d9d9d9',
            borderRadius: 2,
            display: 'inline-block'
          }} />
        ) : (
          <Text type="secondary">默认</Text>
        )
      ),
    },
    {
      title: '边界框',
      dataIndex: 'bounding_box',
      key: 'bounding_box',
      render: (bbox?: number[]) => (
        bbox ? (
          <Tooltip title={`X: ${bbox[0].toFixed(2)} - ${bbox[2].toFixed(2)}, Y: ${bbox[1].toFixed(2)} - ${bbox[3].toFixed(2)}`}>
            <Text type="secondary">查看详情</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">无</Text>
        )
      ),
    },
  ];

  // 验证问题列定义
  const issueColumns: ColumnType<typeof analysis.validation_issues[0]>[] = [
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => {
        const config = {
          error: { color: 'red', icon: <CloseCircleOutlined /> },
          warning: { color: 'orange', icon: <WarningOutlined /> },
          info: { color: 'blue', icon: <InfoCircleOutlined /> },
        };
        const { color, icon } = config[severity as keyof typeof config] || config.info;
        return (
          <Tag color={color} icon={icon}>
            {severity.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => (
        <Text code>{code}</Text>
      ),
    },
    {
      title: '描述',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: '实体',
      dataIndex: 'entity_handle',
      key: 'entity_handle',
      render: (handle?: string) => (
        handle ? <Text code>{handle}</Text> : <Text type="secondary">-</Text>
      ),
    },
    {
      title: '图层',
      dataIndex: 'layer',
      key: 'layer',
      render: (layer?: string) => (
        layer ? <Text>{layer}</Text> : <Text type="secondary">-</Text>
      ),
    },
    {
      title: '建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      render: (suggestion?: string) => (
        suggestion ? (
          <Tooltip title={suggestion}>
            <BugOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        ) : null
      ),
    },
  ];

  // 渲染概览页签
  const renderOverview = () => (
    <div className="space-y-6">
      {/* 文件信息 */}
      <Card title={<><FileTextOutlined /> 文件信息</>} size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="文件名">{analysis.file_info.filename}</Descriptions.Item>
          <Descriptions.Item label="文件大小">{(analysis.file_info.file_size / 1024 / 1024).toFixed(2)} MB</Descriptions.Item>
          <Descriptions.Item label="DXF版本">{analysis.file_info.dxf_version}</Descriptions.Item>
          <Descriptions.Item label="创建软件">{analysis.file_info.created_by}</Descriptions.Item>
          <Descriptions.Item label="最后修改">{new Date(analysis.file_info.last_modified).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="单位系统">{analysis.file_info.units}</Descriptions.Item>
          <Descriptions.Item label="坐标系统">{analysis.file_info.coordinate_system}</Descriptions.Item>
          <Descriptions.Item label="分析时间">{analysis.analysis_time.toFixed(2)} 秒</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 几何统计 */}
      <Card title={<><LineChartOutlined /> 几何统计</>} size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="总实体数" 
              value={analysis.geometry_info.total_entities} 
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="图层数" 
              value={analysis.geometry_info.layers_count} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="块数量" 
              value={analysis.geometry_info.blocks_count} 
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="完整性评分" 
              value={analysis.completeness_score} 
              precision={1}
              suffix="%"
              valueStyle={{ color: analysis.completeness_score > 80 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
        </Row>

        <Row gutter={16} className="mt-4">
          <Col span={8}>
            <Statistic 
              title="总长度" 
              value={analysis.geometry_info.total_length} 
              precision={2}
              suffix="m"
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="总面积" 
              value={analysis.geometry_info.total_area} 
              precision={2}
              suffix="m²"
            />
          </Col>
          <Col span={8}>
            <Card size="small">
              <Text strong>边界框</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                X: {analysis.geometry_info.bounding_box[0].toFixed(2)} - {analysis.geometry_info.bounding_box[2].toFixed(2)}
                <br />
                Y: {analysis.geometry_info.bounding_box[1].toFixed(2)} - {analysis.geometry_info.bounding_box[3].toFixed(2)}
              </Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 实体类型分布 */}
      <Card title="实体类型分布" size="small">
        <Row gutter={16}>
          {Object.entries(analysis.geometry_info.entities_by_type).map(([type, count]) => (
            <Col span={6} key={type} className="mb-2">
              <Card size="small" bodyStyle={{ padding: '12px' }}>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{count}</div>
                  <div className="text-sm text-gray-500">{type}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 问题统计 */}
      <Card title={<><WarningOutlined /> 验证问题统计</>} size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic 
              title="错误" 
              value={issueStats.error} 
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="警告" 
              value={issueStats.warning} 
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title="信息" 
              value={issueStats.info} 
              valueStyle={{ color: '#1890ff' }}
              prefix={<InfoCircleOutlined />}
            />
          </Col>
        </Row>

        {/* 质量评分 */}
        <div className="mt-4">
          <Text strong>数据质量评估：</Text>
          <Progress 
            percent={analysis.completeness_score} 
            status={analysis.completeness_score > 80 ? 'success' : analysis.completeness_score > 60 ? 'normal' : 'exception'}
            strokeColor={{
              '0%': '#ff4d4f',
              '50%': '#faad14',
              '100%': '#52c41a',
            }}
          />
        </div>
      </Card>

      {/* 处理建议 */}
      {analysis.processing_recommendations.length > 0 && (
        <Card title={<><CheckCircleOutlined /> 处理建议</>} size="small">
          <List
            size="small"
            dataSource={analysis.processing_recommendations}
            renderItem={(recommendation, index) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Badge count={index + 1} style={{ backgroundColor: '#52c41a' }} />}
                  description={recommendation}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );

  return (
    <div className="dxf-analysis-viewer">
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
        <TabPane tab={<span><FileTextOutlined />概览</span>} key="overview">
          {renderOverview()}
        </TabPane>

        <TabPane tab={<span><AppstoreOutlined />图层详情 ({analysis.layers.length})</span>} key="layers">
          <Table
            columns={layerColumns}
            dataSource={analysis.layers}
            rowKey="name"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ y: 400 }}
          />
        </TabPane>

        <TabPane tab={<span><FileTextOutlined />实体详情 ({analysis.entities.length})</span>} key="entities">
          <Table
            columns={entityColumns}
            dataSource={analysis.entities}
            rowKey="handle"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ y: 400 }}
          />
        </TabPane>

        <TabPane 
          tab={
            <Badge count={analysis.validation_issues.length} size="small">
              <span><WarningOutlined />验证问题</span>
            </Badge>
          } 
          key="issues"
        >
          {analysis.validation_issues.length > 0 ? (
            <Table
              columns={issueColumns}
              dataSource={analysis.validation_issues}
              rowKey={(record, index) => `${record.code}-${index}`}
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ y: 400 }}
            />
          ) : (
            <Alert
              message="无验证问题"
              description="DXF文件通过了所有验证检查，数据质量良好。"
              type="success"
              showIcon
            />
          )}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DXFAnalysisViewer;