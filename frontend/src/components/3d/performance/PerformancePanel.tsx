import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Select,
  Switch,
  Button,
  Tabs,
  Table,
  Alert,
  Space,
  Tag,
  Tooltip,
  Modal,
  List,
  Divider,
  Typography
} from 'antd';
import {
  DashboardOutlined,
  MemoryOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  InfoCircleOutlined,
  BugOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { PerformanceMonitor } from './PerformanceMonitor';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface PerformancePanelProps {
  performanceMonitor: PerformanceMonitor;
  visible?: boolean;
  onClose?: () => void;
}

interface ChartData {
  time: number;
  fps: number;
  frameTime: number;
  memory: number;
  drawCalls: number;
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  performanceMonitor,
  visible = true,
  onClose
}) => {
  const [currentProfile, setCurrentProfile] = useState('medium');
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  // 性能数据
  const [performanceReport, setPerformanceReport] = useState(() => 
    performanceMonitor.getPerformanceReport()
  );

  // 自动刷新数据
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const report = performanceMonitor.getPerformanceReport();
      setPerformanceReport(report);

      // 更新图表数据
      setChartData(prev => {
        const newData = [
          ...prev,
          {
            time: Date.now(),
            fps: report.current.fps,
            frameTime: report.current.frameTime,
            memory: report.current.memoryUsage / 1024 / 1024, // MB
            drawCalls: report.current.drawCalls
          }
        ].slice(-60); // 保留最近60个数据点

        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, performanceMonitor]);

  // 处理配置文件切换
  const handleProfileChange = (profile: string) => {
    setCurrentProfile(profile);
    performanceMonitor.setProfile(profile);
  };

  // 处理自适应开关
  const handleAdaptiveChange = (enabled: boolean) => {
    setAdaptiveEnabled(enabled);
    performanceMonitor.setAdaptiveEnabled(enabled);
  };

  // 性能状态判断
  const getPerformanceStatus = (value: number, target: number, type: 'fps' | 'memory' | 'time') => {
    switch (type) {
      case 'fps':
        if (value >= target) return { status: 'success', color: 'green' };
        if (value >= target * 0.8) return { status: 'warning', color: 'orange' };
        return { status: 'error', color: 'red' };
      case 'memory':
        if (value <= target * 0.7) return { status: 'success', color: 'green' };
        if (value <= target * 0.9) return { status: 'warning', color: 'orange' };
        return { status: 'error', color: 'red' };
      case 'time':
        if (value <= target) return { status: 'success', color: 'green' };
        if (value <= target * 1.2) return { status: 'warning', color: 'orange' };
        return { status: 'error', color: 'red' };
      default:
        return { status: 'normal', color: 'blue' };
    }
  };

  // 格式化内存大小
  const formatMemory = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  // 图表配置
  const chartConfig = {
    data: chartData,
    xField: 'time',
    yField: 'fps',
    height: 200,
    smooth: true,
    point: {
      size: 2,
      shape: 'circle'
    },
    line: {
      color: '#1890ff'
    },
    xAxis: {
      type: 'time',
      mask: 'HH:mm:ss'
    },
    yAxis: {
      min: 0,
      max: 120
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: 'FPS',
          value: `${datum.fps.toFixed(1)}`
        };
      }
    }
  };

  // 内存统计表格列
  const memoryColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count'
    },
    {
      title: '内存',
      dataIndex: 'memory',
      key: 'memory'
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage: number) => (
        <Progress percent={percentage} size="small" showInfo={false} />
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <DashboardOutlined />
          <span>性能监控面板</span>
          <Tag color={performanceReport.current.fps >= 30 ? 'green' : 'red'}>
            {performanceReport.current.fps.toFixed(1)} FPS
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      destroyOnClose
    >
      <div className="performance-panel">
        {/* 控制栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              value={currentProfile}
              onChange={handleProfileChange}
              style={{ width: '100%' }}
              prefix={<SettingOutlined />}
            >
              <Option value="low">低端设备</Option>
              <Option value="medium">中端设备</Option>
              <Option value="high">高端设备</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Space>
              <Text>自适应优化:</Text>
              <Switch
                checked={adaptiveEnabled}
                onChange={handleAdaptiveChange}
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <Text>自动刷新:</Text>
              <Switch
                checked={autoRefresh}
                onChange={setAutoRefresh}
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </Space>
          </Col>
          <Col span={6}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                const report = performanceMonitor.getPerformanceReport();
                setPerformanceReport(report);
              }}
            >
              手动刷新
            </Button>
          </Col>
        </Row>

        {/* 建议提示 */}
        {performanceReport.recommendations.length > 0 && (
          <Alert
            message="性能优化建议"
            description={
              <ul style={{ margin: 0 }}>
                {performanceReport.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Tabs defaultActiveKey="overview">
          {/* 概览 */}
          <TabPane tab="性能概览" key="overview">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic
                  title="帧率 (FPS)"
                  value={performanceReport.current.fps}
                  precision={1}
                  valueStyle={{
                    color: getPerformanceStatus(
                      performanceReport.current.fps,
                      performanceReport.target.minFPS,
                      'fps'
                    ).color
                  }}
                  prefix={<ThunderboltOutlined />}
                  suffix="fps"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="帧时间"
                  value={performanceReport.current.frameTime}
                  precision={2}
                  valueStyle={{
                    color: getPerformanceStatus(
                      performanceReport.current.frameTime,
                      performanceReport.target.maxFrameTime,
                      'time'
                    ).color
                  }}
                  suffix="ms"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="内存使用"
                  value={performanceReport.current.memoryUsage / 1024 / 1024}
                  precision={1}
                  valueStyle={{
                    color: getPerformanceStatus(
                      performanceReport.current.memoryUsage,
                      performanceReport.target.maxMemoryMB * 1024 * 1024,
                      'memory'
                    ).color
                  }}
                  prefix={<MemoryOutlined />}
                  suffix="MB"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="绘制调用"
                  value={performanceReport.current.drawCalls}
                  valueStyle={{
                    color: performanceReport.current.drawCalls <= performanceReport.target.maxDrawCalls
                      ? 'green' : 'red'
                  }}
                />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card title="帧率历史" size="small">
                  <Line {...chartConfig} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="渲染统计" size="small">
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="三角形数"
                        value={performanceReport.current.triangles}
                        formatter={(value: any) => `${(value / 1000).toFixed(1)}K`}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="LOD级别"
                        value={performanceReport.current.lodLevel}
                      />
                    </Col>
                  </Row>
                  <Divider />
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="批量效率"
                        value={performanceReport.current.batchEfficiency}
                        precision={1}
                        suffix="%"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="GPU内存"
                        value={performanceReport.current.gpuMemory}
                        formatter={(value: any) => formatMemory(value)}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* LOD详情 */}
          <TabPane tab="LOD管理" key="lod">
            <Row gutter={16}>
              <Col span={12}>
                <Card title="LOD统计" size="small">
                  <Statistic
                    title="总对象数"
                    value={performanceReport.components.lod.totalObjects}
                  />
                  <Statistic
                    title="可见对象"
                    value={performanceReport.components.lod.visibleObjects}
                  />
                  <Statistic
                    title="平均帧时间"
                    value={performanceReport.components.lod.averageFrameTime}
                    precision={2}
                    suffix="ms"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="LOD级别分布" size="small">
                  {Object.entries(performanceReport.components.lod.levelDistribution || {}).map(([level, count]) => (
                    <div key={level} style={{ marginBottom: 8 }}>
                      <Text>级别 {level}: {count as number} 个对象</Text>
                      <Progress
                        percent={(count as number) / performanceReport.components.lod.totalObjects * 100}
                        size="small"
                        showInfo={false}
                      />
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 批量渲染 */}
          <TabPane tab="批量渲染" key="batch">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="批次数量"
                  value={performanceReport.components.batch.batchCount}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="实例总数"
                  value={performanceReport.components.batch.totalInstances}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="节省调用"
                  value={performanceReport.components.batch.savedDrawCalls}
                  valueStyle={{ color: 'green' }}
                />
              </Col>
            </Row>
            <Divider />
            <Alert
              message="批量渲染效率"
              description={`当前批量渲染效率为 ${performanceReport.current.batchEfficiency.toFixed(1)}%，${
                performanceReport.current.batchEfficiency > 70 ? '表现良好' : '建议优化实例化对象分组'
              }`}
              type={performanceReport.current.batchEfficiency > 70 ? 'success' : 'warning'}
              showIcon
            />
          </TabPane>

          {/* 内存管理 */}
          <TabPane tab="内存管理" key="memory">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Statistic
                  title="已用内存"
                  value={performanceReport.components.memory.usedMemory / 1024 / 1024}
                  precision={1}
                  suffix="MB"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="可用内存"
                  value={performanceReport.components.memory.availableMemory / 1024 / 1024}
                  precision={1}
                  suffix="MB"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="池命中率"
                  value={performanceReport.components.memory.poolHitRate}
                  precision={1}
                  suffix="%"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="GC次数"
                  value={performanceReport.components.memory.gcCount}
                />
              </Col>
            </Row>

            <Card title="内存分布" size="small">
              <Table
                dataSource={[
                  {
                    key: 'geometries',
                    type: '几何体',
                    count: performanceReport.components.memory.resourceCounts.geometries,
                    memory: formatMemory(performanceReport.components.memory.geometryMemory),
                    percentage: (performanceReport.components.memory.geometryMemory / performanceReport.components.memory.usedMemory) * 100
                  },
                  {
                    key: 'textures',
                    type: '纹理',
                    count: performanceReport.components.memory.resourceCounts.textures,
                    memory: formatMemory(performanceReport.components.memory.textureMemory),
                    percentage: (performanceReport.components.memory.textureMemory / performanceReport.components.memory.usedMemory) * 100
                  },
                  {
                    key: 'materials',
                    type: '材质',
                    count: performanceReport.components.memory.resourceCounts.materials,
                    memory: formatMemory(performanceReport.components.memory.materialMemory),
                    percentage: (performanceReport.components.memory.materialMemory / performanceReport.components.memory.usedMemory) * 100
                  }
                ]}
                columns={memoryColumns}
                pagination={false}
                size="small"
              />
            </Card>
          </TabPane>

          {/* 系统信息 */}
          <TabPane tab="系统信息" key="system">
            <Card title="当前配置" size="small">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>性能配置:</span>
                  <Tag color="blue">{PerformanceMonitor.PROFILES[currentProfile]?.name}</Tag>
                </div>
                <div className="flex justify-between">
                  <span>自适应优化:</span>
                  <Tag color={adaptiveEnabled ? 'green' : 'red'}>
                    {adaptiveEnabled ? '启用' : '禁用'}
                  </Tag>
                </div>
                <div className="flex justify-between">
                  <span>目标FPS:</span>
                  <span>{performanceReport.target.minFPS}</span>
                </div>
                <div className="flex justify-between">
                  <span>最大帧时间:</span>
                  <span>{performanceReport.target.maxFrameTime.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>内存限制:</span>
                  <span>{performanceReport.target.maxMemoryMB}MB</span>
                </div>
                <div className="flex justify-between">
                  <span>绘制调用限制:</span>
                  <span>{performanceReport.target.maxDrawCalls}</span>
                </div>
              </div>
            </Card>

            <Card title="浏览器信息" size="small" style={{ marginTop: 16 }}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>用户代理:</span>
                  <span className="text-right max-w-xs truncate">
                    {navigator.userAgent.split(' ').slice(-2).join(' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>设备内存:</span>
                  <span>{(navigator as any).deviceMemory || '未知'} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>CPU核心:</span>
                  <span>{navigator.hardwareConcurrency || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span>像素比:</span>
                  <span>{window.devicePixelRatio}</span>
                </div>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </Modal>
  );
};