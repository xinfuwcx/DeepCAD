import React from 'react';
import {
  Card,
  Progress,
  Alert,
  List,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Divider,
  Timeline,
  Badge,
  Tooltip,
  Button
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  BugOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import type { DXFQualityReport as DXFQualityReportType } from '../../hooks/useDXFImport';

const { Title, Text, Paragraph } = Typography;

interface DXFQualityReportProps {
  report: DXFQualityReportType;
}

export const DXFQualityReport: React.FC<DXFQualityReportProps> = ({ report }) => {
  // 获取质量等级
  const getQualityLevel = (score: number) => {
    if (score >= 90) return { level: '优秀', color: '#52c41a', icon: <TrophyOutlined /> };
    if (score >= 80) return { level: '良好', color: '#1890ff', icon: <CheckCircleOutlined /> };
    if (score >= 70) return { level: '一般', color: '#faad14', icon: <WarningOutlined /> };
    if (score >= 60) return { level: '较差', color: '#fa8c16', icon: <WarningOutlined /> };
    return { level: '很差', color: '#ff4d4f', icon: <CloseCircleOutlined /> };
  };

  const overallQuality = getQualityLevel(report.overall_score);
  
  // 导出报告
  const exportReport = () => {
    const reportData = {
      ...report,
      exported_at: new Date().toISOString(),
      export_format: 'JSON'
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dxf-quality-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 打印报告
  const printReport = () => {
    window.print();
  };

  return (
    <div className="dxf-quality-report">
      {/* 报告头部 */}
      <Card className="mb-4">
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <div style={{ fontSize: 48, color: overallQuality.color }}>
                {overallQuality.icon}
              </div>
              <div>
                <Title level={3} style={{ margin: 0, color: overallQuality.color }}>
                  总体质量: {overallQuality.level}
                </Title>
                <Text type="secondary">
                  报告生成时间: {new Date(report.generated_at).toLocaleString()}
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={exportReport}>
                导出报告
              </Button>
              <Button icon={<PrinterOutlined />} onClick={printReport}>
                打印报告
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 评分概览 */}
      <Card title={<><TrophyOutlined /> 质量评分概览</>} className="mb-4">
        <Row gutter={24}>
          <Col span={6}>
            <div className="text-center">
              <Progress
                type="circle"
                percent={report.overall_score}
                size={120}
                strokeColor={{
                  '0%': '#ff4d4f',
                  '50%': '#faad14',
                  '100%': '#52c41a',
                }}
                format={(percent) => (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 'bold' }}>{percent}</div>
                    <div style={{ fontSize: 12 }}>总分</div>
                  </div>
                )}
              />
            </div>
          </Col>
          <Col span={18}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="完整性"
                  value={report.completeness_score}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: report.completeness_score > 80 ? '#3f8600' : '#cf1322' 
                  }}
                />
                <Progress 
                  percent={report.completeness_score} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#52c41a"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="准确性"
                  value={report.accuracy_score}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: report.accuracy_score > 80 ? '#3f8600' : '#cf1322' 
                  }}
                />
                <Progress 
                  percent={report.accuracy_score} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#1890ff"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="一致性"
                  value={report.consistency_score}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: report.consistency_score > 80 ? '#3f8600' : '#cf1322' 
                  }}
                />
                <Progress 
                  percent={report.consistency_score} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#722ed1"
                />
              </Col>
            </Row>

            {/* 质量等级说明 */}
            <div className="mt-4">
              <Text strong>质量等级说明：</Text>
              <div className="mt-2">
                <Space wrap>
                  <Tag color="green">优秀 (90-100)</Tag>
                  <Tag color="blue">良好 (80-89)</Tag>
                  <Tag color="gold">一般 (70-79)</Tag>
                  <Tag color="orange">较差 (60-69)</Tag>
                  <Tag color="red">很差 (0-59)</Tag>
                </Space>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* 关键问题 */}
        <Col span={12}>
          <Card 
            title={
              <Badge count={report.critical_issues.length} size="small">
                <span><CloseCircleOutlined /> 关键问题</span>
              </Badge>
            } 
            className="mb-4"
          >
            {report.critical_issues.length > 0 ? (
              <List
                size="small"
                dataSource={report.critical_issues}
                renderItem={(issue, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge count={index + 1} style={{ 
                          backgroundColor: issue.severity === 'high' ? '#ff4d4f' : 
                                         issue.severity === 'medium' ? '#fa8c16' : '#faad14' 
                        }} />
                      }
                      title={
                        <Space>
                          <Text strong>{issue.issue_type}</Text>
                          <Tag color={
                            issue.severity === 'high' ? 'red' : 
                            issue.severity === 'medium' ? 'orange' : 'yellow'
                          }>
                            {issue.severity}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <Paragraph style={{ margin: 0 }}>
                            {issue.description}
                          </Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            影响实体: {issue.affected_entities} 个
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="未发现关键问题"
                description="DXF文件没有发现严重的质量问题。"
                type="success"
                showIcon
              />
            )}
          </Card>
        </Col>

        {/* 警告信息 */}
        <Col span={12}>
          <Card 
            title={
              <Badge count={report.warnings.length} size="small">
                <span><WarningOutlined /> 警告信息</span>
              </Badge>
            } 
            className="mb-4"
          >
            {report.warnings.length > 0 ? (
              <List
                size="small"
                dataSource={report.warnings}
                renderItem={(warning, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<WarningOutlined style={{ color: '#faad14' }} />}
                      description={warning}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="无警告信息"
                description="DXF文件处理过程中没有产生警告。"
                type="success"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 改进建议 */}
      <Card title={<><BugOutlined /> 改进建议</>} className="mb-4">
        {report.recommendations.length > 0 ? (
          <Timeline>
            {report.recommendations.map((recommendation, index) => (
              <Timeline.Item
                key={index}
                color={
                  recommendation.type === 'critical' ? 'red' :
                  recommendation.type === 'important' ? 'orange' : 'blue'
                }
                dot={
                  recommendation.type === 'critical' ? <CloseCircleOutlined /> :
                  recommendation.type === 'important' ? <WarningOutlined /> :
                  <InfoCircleOutlined />
                }
              >
                <div>
                  <Space>
                    <Tag color={
                      recommendation.type === 'critical' ? 'red' :
                      recommendation.type === 'important' ? 'orange' : 'blue'
                    }>
                      {recommendation.type === 'critical' ? '严重' :
                       recommendation.type === 'important' ? '重要' : '建议'}
                    </Tag>
                    <Text strong>{recommendation.message}</Text>
                  </Space>
                  {recommendation.action && (
                    <div className="mt-1">
                      <Text type="secondary">建议操作: {recommendation.action}</Text>
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Alert
            message="无需改进"
            description="DXF文件质量良好，暂无改进建议。"
            type="success"
            showIcon
          />
        )}
      </Card>

      {/* 质量详情说明 */}
      <Card title={<><FileTextOutlined /> 质量评估说明</>}>
        <Row gutter={16}>
          <Col span={8}>
            <Title level={5}>完整性评分</Title>
            <Paragraph style={{ fontSize: 12 }}>
              评估文件中几何数据的完整程度，包括：
              <ul>
                <li>必需实体的存在性</li>
                <li>图层信息的完整性</li>
                <li>几何边界的封闭性</li>
                <li>参考数据的可用性</li>
              </ul>
            </Paragraph>
          </Col>
          <Col span={8}>
            <Title level={5}>准确性评分</Title>
            <Paragraph style={{ fontSize: 12 }}>
              评估几何数据的精度和正确性，包括：
              <ul>
                <li>坐标数据的精度</li>
                <li>几何关系的正确性</li>
                <li>尺寸标注的准确性</li>
                <li>单位系统的一致性</li>
              </ul>
            </Paragraph>
          </Col>
          <Col span={8}>
            <Title level={5}>一致性评分</Title>
            <Paragraph style={{ fontSize: 12 }}>
              评估数据内部的逻辑一致性，包括：
              <ul>
                <li>图层命名的规范性</li>
                <li>颜色和线型的统一性</li>
                <li>块定义的一致性</li>
                <li>文本和标注的规范性</li>
              </ul>
            </Paragraph>
          </Col>
        </Row>

        <Divider />

        <div className="text-center">
          <Text type="secondary">
            此报告基于AutoCAD DXF标准和CAE分析最佳实践生成
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default DXFQualityReport;