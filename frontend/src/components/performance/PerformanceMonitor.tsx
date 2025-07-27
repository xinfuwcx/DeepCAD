import React, { useState, useEffect } from 'react';
import { Card, Progress, Tag, Typography, Row, Col, Button, Modal, Alert } from 'antd';
import { 
  DashboardOutlined, 
  ThunderboltOutlined, 
  BarChartOutlined, 
  WifiOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { usePerformanceMonitor, performanceManager, PerformanceMetrics } from '../../utils/performance';

const { Title, Text } = Typography;

interface PerformanceCardProps {
  title: string;
  value: number | string;
  unit?: string;
  status: 'good' | 'warning' | 'error';
  icon: React.ReactNode;
  description?: string;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  value,
  unit = '',
  status,
  icon,
  description
}) => {
  const getColor = () => {
    switch (status) {
      case 'good': return '#52c41a';
      case 'warning': return '#faad14';
      case 'error': return '#ff4d4f';
      default: return '#1890ff';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'error': return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      default: return null;
    }
  };

  return (
    <Card 
       
      style={{ height: '100%' }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          <div>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
              {title}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Text strong style={{ fontSize: '18px', color: getColor() }}>
                {value}{unit}
              </Text>
              {getStatusIcon()}
            </div>
            {description && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {description}
              </Text>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const PerformanceMonitor: React.FC = () => {
  const metrics = usePerformanceMonitor();
  const [reportVisible, setReportVisible] = useState(false);
  const [fullReport, setFullReport] = useState<any>(null);
  
  // 获取性能状态
  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'error';
  };

  // 格式化数值
  const formatValue = (value: number | undefined, decimals = 1): string => {
    if (value === undefined) return '--';
    return value.toFixed(decimals);
  };

  // 格式化内存值
  const formatMemory = (bytes: number | undefined): string => {
    if (!bytes) return '--';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1);
  };

  // 生成详细报告
  const generateReport = () => {
    const report = performanceManager.getComprehensiveReport();
    setFullReport(report);
    setReportVisible(true);
  };

  // 应用优化
  const applyOptimizations = () => {
    performanceManager.applyGlobalOptimizations();
    Modal.success({
      title: '优化已应用',
      content: '性能优化策略已成功应用，建议刷新页面查看效果。',
    });
  };

  const performanceScore = fullReport ? fullReport.score : 
    performanceManager.getTools().monitor.getPerformanceScore();

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          <DashboardOutlined /> 性能监控
        </Title>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={generateReport}>生成详细报告</Button>
          <Button type="primary" onClick={applyOptimizations}>
            应用优化
          </Button>
        </div>
      </div>

      {/* 性能总分 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={4} style={{ margin: 0 }}>性能总分</Title>
            <Text type="secondary">基于多项指标的综合评分</Text>
          </Col>
          <Col>
            <Progress
              type="circle"
              percent={performanceScore}
              size={80}
              strokeColor={
                performanceScore >= 80 ? '#52c41a' :
                performanceScore >= 60 ? '#faad14' : '#ff4d4f'
              }
              format={(percent) => (
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {percent}
                </span>
              )}
            />
          </Col>
        </Row>
      </Card>

      {/* 关键指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <PerformanceCard
            title="帧率 (FPS)"
            value={formatValue(metrics.fps, 0)}
            unit=""
            status={getPerformanceStatus(metrics.fps || 0, { good: 45, warning: 30 })}
            icon={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
            description="渲染流畅度"
          />
        </Col>
        
        <Col xs={12} sm={8} md={6} lg={4}>
          <PerformanceCard
            title="内存使用"
            value={formatValue((metrics.memoryUsage || 0) * 100, 0)}
            unit="%"
            status={getPerformanceStatus(100 - (metrics.memoryUsage || 0) * 100, { good: 50, warning: 20 })}
            icon={<BarChartOutlined style={{ color: '#722ed1' }} />}
            description="JS堆使用率"
          />
        </Col>
        
        <Col xs={12} sm={8} md={6} lg={4}>
          <PerformanceCard
            title="加载时间"
            value={formatValue((metrics.loadTime || 0) / 1000, 1)}
            unit="s"
            status={getPerformanceStatus(5000 - (metrics.loadTime || 0), { good: 3000, warning: 1000 })}
            icon={<ClockCircleOutlined style={{ color: '#13c2c2' }} />}
            description="页面载入速度"
          />
        </Col>
        
        <Col xs={12} sm={8} md={6} lg={4}>
          <PerformanceCard
            title="网络延迟"
            value={formatValue(metrics.networkLatency, 0)}
            unit="ms"
            status={getPerformanceStatus(1000 - (metrics.networkLatency || 0), { good: 800, warning: 500 })}
            icon={<WifiOutlined style={{ color: '#52c41a' }} />}
            description="网络响应时间"
          />
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <PerformanceCard
            title="FCP"
            value={formatValue((metrics.firstContentfulPaint || 0) / 1000, 1)}
            unit="s"
            status={getPerformanceStatus(3000 - (metrics.firstContentfulPaint || 0), { good: 1200, warning: 600 })}
            icon={<DashboardOutlined style={{ color: '#fa8c16' }} />}
            description="首次内容绘制"
          />
        </Col>

        <Col xs={12} sm={8} md={6} lg={4}>
          <PerformanceCard
            title="LCP"
            value={formatValue((metrics.largestContentfulPaint || 0) / 1000, 1)}
            unit="s"
            status={getPerformanceStatus(4000 - (metrics.largestContentfulPaint || 0), { good: 1500, warning: 1000 })}
            icon={<DashboardOutlined style={{ color: '#eb2f96' }} />}
            description="最大内容绘制"
          />
        </Col>
      </Row>

      {/* Web Vitals */}
      <Card title="Core Web Vitals" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Text type="secondary">累积布局偏移 (CLS)</Text>
              <div style={{ margin: '8px 0' }}>
                <Text strong style={{ fontSize: '24px', color: 
                  (metrics.cumulativeLayoutShift || 0) < 0.1 ? '#52c41a' :
                  (metrics.cumulativeLayoutShift || 0) < 0.25 ? '#faad14' : '#ff4d4f'
                }}>
                  {formatValue(metrics.cumulativeLayoutShift, 3)}
                </Text>
              </div>
              <Tag color={
                (metrics.cumulativeLayoutShift || 0) < 0.1 ? 'green' :
                (metrics.cumulativeLayoutShift || 0) < 0.25 ? 'orange' : 'red'
              }>
                {(metrics.cumulativeLayoutShift || 0) < 0.1 ? '良好' :
                 (metrics.cumulativeLayoutShift || 0) < 0.25 ? '需要改进' : '较差'}
              </Tag>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Text type="secondary">首次输入延迟 (FID)</Text>
              <div style={{ margin: '8px 0' }}>
                <Text strong style={{ fontSize: '24px', color: 
                  (metrics.firstInputDelay || 0) < 100 ? '#52c41a' :
                  (metrics.firstInputDelay || 0) < 300 ? '#faad14' : '#ff4d4f'
                }}>
                  {formatValue(metrics.firstInputDelay, 0)} ms
                </Text>
              </div>
              <Tag color={
                (metrics.firstInputDelay || 0) < 100 ? 'green' :
                (metrics.firstInputDelay || 0) < 300 ? 'orange' : 'red'
              }>
                {(metrics.firstInputDelay || 0) < 100 ? '良好' :
                 (metrics.firstInputDelay || 0) < 300 ? '需要改进' : '较差'}
              </Tag>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Text type="secondary">下载速度</Text>
              <div style={{ margin: '8px 0' }}>
                <Text strong style={{ fontSize: '24px', color: '#1890ff' }}>
                  {formatValue(metrics.downloadSpeed, 1)} Mbps
                </Text>
              </div>
              <Tag color="blue">
                {(metrics.downloadSpeed || 0) > 10 ? '快速' :
                 (metrics.downloadSpeed || 0) > 1 ? '正常' : '较慢'}
              </Tag>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 自定义指标 */}
      {(metrics.meshGenerationTime || metrics.dxfProcessingTime || metrics.sceneRenderTime) && (
        <Card title="应用专用指标">
          <Row gutter={[16, 16]}>
            {metrics.meshGenerationTime && (
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <Text type="secondary">网格生成时间</Text>
                  <div style={{ margin: '8px 0' }}>
                    <Text strong style={{ fontSize: '20px' }}>
                      {formatValue(metrics.meshGenerationTime / 1000, 2)}s
                    </Text>
                  </div>
                </div>
              </Col>
            )}
            
            {metrics.dxfProcessingTime && (
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <Text type="secondary">DXF处理时间</Text>
                  <div style={{ margin: '8px 0' }}>
                    <Text strong style={{ fontSize: '20px' }}>
                      {formatValue(metrics.dxfProcessingTime / 1000, 2)}s
                    </Text>
                  </div>
                </div>
              </Col>
            )}
            
            {metrics.sceneRenderTime && (
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <Text type="secondary">场景渲染时间</Text>
                  <div style={{ margin: '8px 0' }}>
                    <Text strong style={{ fontSize: '20px' }}>
                      {formatValue(metrics.sceneRenderTime, 1)}ms
                    </Text>
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* 详细报告模态框 */}
      <Modal
        title="详细性能报告"
        open={reportVisible}
        onCancel={() => setReportVisible(false)}
        footer={[
          <Button key="close" onClick={() => setReportVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {fullReport && (
          <div>
            <Alert
              message={`性能评分: ${fullReport.score}/100`}
              type={fullReport.score >= 80 ? 'success' : fullReport.score >= 60 ? 'warning' : 'error'}
              style={{ marginBottom: '16px' }}
            />
            
            {fullReport.recommendations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>优化建议</Title>
                <ul>
                  {fullReport.recommendations.map((rec: string, index: number) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <Title level={5}>系统环境</Title>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Text strong>浏览器: </Text>
                <Text>{fullReport.userAgent.includes('Chrome') ? 'Chrome' : 
                      fullReport.userAgent.includes('Firefox') ? 'Firefox' : 
                      fullReport.userAgent.includes('Safari') ? 'Safari' : '其他'}</Text>
              </Col>
              <Col span={12}>
                <Text strong>视口尺寸: </Text>
                <Text>{fullReport.environment.viewport.width} × {fullReport.environment.viewport.height}</Text>
              </Col>
              <Col span={12}>
                <Text strong>屏幕分辨率: </Text>
                <Text>{fullReport.environment.screen.width} × {fullReport.environment.screen.height}</Text>
              </Col>
              <Col span={12}>
                <Text strong>设备像素比: </Text>
                <Text>{fullReport.environment.screen.pixelRatio}</Text>
              </Col>
              {fullReport.connection && (
                <>
                  <Col span={12}>
                    <Text strong>网络类型: </Text>
                    <Text>{fullReport.connection.effectiveType}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>省流模式: </Text>
                    <Text>{fullReport.connection.saveData ? '开启' : '关闭'}</Text>
                  </Col>
                </>
              )}
            </Row>

            {fullReport.environment.memory && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5}>内存使用情况</Title>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>已使用: </Text>
                    <Text>{formatMemory(fullReport.environment.memory.used)} MB</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>总计: </Text>
                    <Text>{formatMemory(fullReport.environment.memory.total)} MB</Text>
                  </Col>
                  <Col span={8}>
                    <Text strong>限制: </Text>
                    <Text>{formatMemory(fullReport.environment.memory.limit)} MB</Text>
                  </Col>
                </Row>
              </div>
            )}
            
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                报告生成时间: {new Date(fullReport.timestamp).toLocaleString()}
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PerformanceMonitor;