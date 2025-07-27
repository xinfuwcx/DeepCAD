import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Row, Col, Card, Statistic, Progress, Typography, Space, Button, Tag, List, Timeline, Badge, Tooltip } from 'antd';
import {
  RocketOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  LineChartOutlined,
  UserOutlined,
  GlobalOutlined,
  FireOutlined,
  BugOutlined,
  SecurityScanOutlined,
  CloudServerOutlined,
  ApiOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Line, Area, Column } from '@ant-design/plots';
import PerformanceChart from '../PerformanceChart';

const { Title, Text } = Typography;

export const FuturisticDashboardModule: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 67,
    memoryUsage: 4.2,
    gpuLoad: 89,
    storageUsed: 2.1,
    activeTasks: 12,
    completedProjects: 247,
    networkSpeed: 125.6,
    temperature: 67,
    powerUsage: 450,
    uptime: 72.5
  });

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any[]>([]);
  const [networkData, setNetworkData] = useState<any[]>([]);
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);

  useEffect(() => {
    // 实时数据更新系统
    const interval = setInterval(() => {
      if (isRealTimeMode) {
        setSystemMetrics(prev => ({
          ...prev,
          cpuUsage: Math.max(30, Math.min(95, prev.cpuUsage + (Math.random() - 0.5) * 10)),
          gpuLoad: Math.max(50, Math.min(100, prev.gpuLoad + (Math.random() - 0.5) * 15)),
          memoryUsage: Math.max(2, Math.min(8, prev.memoryUsage + (Math.random() - 0.5) * 0.5)),
          networkSpeed: Math.max(50, Math.min(200, prev.networkSpeed + (Math.random() - 0.5) * 20)),
          temperature: Math.max(45, Math.min(85, prev.temperature + (Math.random() - 0.5) * 5)),
          powerUsage: Math.max(300, Math.min(600, prev.powerUsage + (Math.random() - 0.5) * 30))
        }));
      }
    }, 2000);

    // 生成24小时性能图表数据
    const perfData = Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      cpu: Math.random() * 40 + 40,
      memory: Math.random() * 30 + 50,
      gpu: Math.random() * 50 + 30,
      network: Math.random() * 100 + 50
    }));
    setPerformanceData(perfData);

    // 生成网络数据
    const netData = Array.from({ length: 12 }, (_, i) => ({
      time: `${String(i * 2).padStart(2, '0')}:00`,
      upload: Math.random() * 50 + 20,
      download: Math.random() * 120 + 80
    }));
    setNetworkData(netData);

    // 生成项目统计数据
    const projData = [
      { type: 'CAE分析', count: 45, color: '#00d9ff', trend: '+12%' },
      { type: '网格生成', count: 32, color: '#8b5cf6', trend: '+8%' },
      { type: '几何建模', count: 28, color: '#10b981', trend: '+15%' },
      { type: '后处理', count: 18, color: '#f59e0b', trend: '+5%' }
    ];
    setProjectData(projData);

    return () => clearInterval(interval);
  }, [isRealTimeMode]);

  const recentActivities = [
    { time: '2分钟前', action: '完成网格生成', project: 'Project-Alpha', status: 'success' },
    { time: '5分钟前', action: '开始CAE计算', project: 'Project-Beta', status: 'processing' },
    { time: '12分钟前', action: '导入几何模型', project: 'Project-Gamma', status: 'success' },
    { time: '18分钟前', action: '创建新项目', project: 'Project-Delta', status: 'success' },
    { time: '25分钟前', action: '材料参数更新', project: 'Project-Epsilon', status: 'warning' }
  ];

  const systemAlerts = [
    { type: 'info', message: 'GPU性能优化建议：启用CUDA加速', time: '10分钟前' },
    { type: 'warning', message: '内存使用率较高，建议清理缓存', time: '15分钟前' },
    { type: 'success', message: '系统自动备份完成', time: '1小时前' }
  ];

  const lineConfig = {
    data: performanceData,
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    height: 300,
    color: ['#00d9ff', '#8b5cf6', '#10b981'],
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 2000,
      }
    },
    theme: 'dark'
  };

  const columnConfig = {
    data: projectData,
    xField: 'type',
    yField: 'count',
    height: 250,
    color: ({ type }: any) => {
      const colors: any = {
        'CAE分析': '#00d9ff',
        '网格生成': '#8b5cf6',
        '几何建模': '#10b981',
        '后处理': '#f59e0b'
      };
      return colors[type];
    },
    theme: 'dark'
  };

  // 优化的状态计算
  const getStatusColor = useCallback((value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return '#ef4444';
    if (value >= thresholds.warning) return '#f59e0b';
    return '#00d9ff';
  }, []);

  const formatUptime = useCallback((hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return `${days}d ${remainingHours}h`;
  }, []);

  return (
    <div style={{ padding: '0', color: 'white' }}>
      {/* 增强的系统状态控制台 */}
      <Row gutter={[12, 12]} style={{ marginBottom: '24px' }}>
        {/* 实时模式切换 */}
        <Col span={24}>
          <Card className="glass-card" style={{ border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <Badge status={isRealTimeMode ? "processing" : "default"} />
                <Text style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                  DeepCAD 系统控制台
                </Text>
                <Tag color={isRealTimeMode ? "processing" : "default"}>
                  {isRealTimeMode ? "实时监控" : "静态模式"}
                </Tag>
              </Space>
              <Space>
                <Button 
                  size="small" 
                  type={isRealTimeMode ? "primary" : "default"}
                  onClick={() => setIsRealTimeMode(!isRealTimeMode)}
                >
                  {isRealTimeMode ? "暂停监控" : "启动监控"}
                </Button>
                <Text style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  运行时间: {formatUptime(systemMetrics.uptime)}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* 主要系统指标 */}
        <Col span={4}>
          <Card className="glass-card hologram" style={{ textAlign: 'center', border: '1px solid var(--border-color)', height: '140px' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>CPU 使用率</span>}
              value={systemMetrics.cpuUsage}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: getStatusColor(systemMetrics.cpuUsage, { warning: 70, danger: 85 }), 
                fontFamily: 'JetBrains Mono',
                fontSize: '1.4rem'
              }}
              prefix={<ThunderboltOutlined />}
            />
            <Progress 
              percent={systemMetrics.cpuUsage} 
              showInfo={false}
              strokeColor={getStatusColor(systemMetrics.cpuUsage, { warning: 70, danger: 85 })}
              trailColor="var(--bg-tertiary)"
              strokeWidth={6}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        
        <Col span={4}>
          <Card className="glass-card hologram" style={{ textAlign: 'center', border: '1px solid var(--border-color)', height: '140px' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>内存使用</span>}
              value={systemMetrics.memoryUsage}
              precision={1}
              suffix="GB"
              valueStyle={{ 
                color: getStatusColor((systemMetrics.memoryUsage / 8) * 100, { warning: 80, danger: 95 }), 
                fontFamily: 'JetBrains Mono',
                fontSize: '1.4rem'
              }}
              prefix={<DatabaseOutlined />}
            />
            <Progress 
              percent={(systemMetrics.memoryUsage / 8) * 100} 
              showInfo={false}
              strokeColor={getStatusColor((systemMetrics.memoryUsage / 8) * 100, { warning: 80, danger: 95 })}
              trailColor="var(--bg-tertiary)"
              strokeWidth={6}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        
        <Col span={4}>
          <Card className="glass-card hologram" style={{ textAlign: 'center', border: '1px solid var(--border-color)', height: '140px' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>GPU 负载</span>}
              value={systemMetrics.gpuLoad}
              precision={0}
              suffix="%"
              valueStyle={{ 
                color: getStatusColor(systemMetrics.gpuLoad, { warning: 85, danger: 95 }), 
                fontFamily: 'JetBrains Mono',
                fontSize: '1.4rem'
              }}
              prefix={<EyeOutlined />}
            />
            <Progress 
              percent={systemMetrics.gpuLoad} 
              showInfo={false}
              strokeColor={getStatusColor(systemMetrics.gpuLoad, { warning: 85, danger: 95 })}
              trailColor="var(--bg-tertiary)"
              strokeWidth={6}
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        
        <Col span={4}>
          <Card className="glass-card hologram" style={{ textAlign: 'center', border: '1px solid var(--border-color)', height: '140px' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>网络速度</span>}
              value={systemMetrics.networkSpeed}
              precision={1}
              suffix="MB/s"
              valueStyle={{ 
                color: '#10b981', 
                fontFamily: 'JetBrains Mono',
                fontSize: '1.4rem'
              }}
              prefix={<ApiOutlined />}
            />
            <Text style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '8px', display: 'block' }}>
              实时传输速率
            </Text>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="glass-card hologram" style={{ textAlign: 'center', border: '1px solid var(--border-color)', height: '140px' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>系统温度</span>}
              value={systemMetrics.temperature}
              precision={0}
              suffix="°C"
              valueStyle={{ 
                color: getStatusColor(systemMetrics.temperature, { warning: 70, danger: 80 }), 
                fontFamily: 'JetBrains Mono',
                fontSize: '1.4rem'
              }}
              prefix={<FireOutlined />}
            />
            <Text style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '8px', display: 'block' }}>
              散热状态良好
            </Text>
          </Card>
        </Col>
        
        <Col span={4}>
          <Card className="glass-card hologram" style={{ textAlign: 'center', border: '1px solid var(--border-color)', height: '140px' }}>
            <Statistic
              title={<span style={{ color: 'var(--text-secondary)' }}>活跃任务</span>}
              value={systemMetrics.activeTasks}
              valueStyle={{ 
                color: '#f59e0b', 
                fontFamily: 'JetBrains Mono',
                fontSize: '1.4rem'
              }}
              prefix={<RocketOutlined />}
            />
            <Space style={{ marginTop: '8px' }}>
              <Badge status="processing" />
              <Text style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                运行中
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 性能监控和项目统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={16}>
          <Card 
            className="glass-card" 
            title={
              <Space>
                <LineChartOutlined style={{ color: 'var(--primary-color)' }} />
                <span style={{ color: 'white' }}>系统性能监控</span>
                <Tag color="processing">实时</Tag>
              </Space>
            }
            style={{ border: '1px solid var(--border-color)' }}
          >
            <div style={{ height: '300px' }}>
              <PerformanceChart title="系统性能实时监控" height={260} />
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card 
            className="glass-card" 
            title={
              <Space>
                <GlobalOutlined style={{ color: 'var(--primary-color)' }} />
                <span style={{ color: 'white' }}>项目统计</span>
              </Space>
            }
            style={{ border: '1px solid var(--border-color)' }}
          >
            <div style={{ marginBottom: '16px' }}>
              {projectData.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px',
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  border: `1px solid ${item.color}30`
                }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.type}</span>
                    <div style={{ 
                      color: '#10b981', 
                      fontSize: '0.7rem',
                      marginTop: '2px'
                    }}>
                      {item.trend}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      color: item.color, 
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 'bold',
                      fontSize: '1.2rem'
                    }}>
                      {item.count}
                    </span>
                    <div style={{ 
                      width: '40px', 
                      height: '3px', 
                      background: `linear-gradient(90deg, transparent, ${item.color})`,
                      marginTop: '4px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <Button className="neon-button" block>
              查看详细报告
            </Button>
          </Card>
        </Col>
      </Row>

      {/* 最近活动和系统警告 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card 
            className="glass-card" 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: 'var(--primary-color)' }} />
                <span style={{ color: 'white' }}>最近活动</span>
              </Space>
            }
            style={{ border: '1px solid var(--border-color)' }}
          >
            <Timeline
              items={recentActivities.map((activity, index) => ({
                key: index,
                dot: activity.status === 'success' ? <CheckCircleOutlined style={{ color: '#10b981' }} /> :
                     activity.status === 'processing' ? <ClockCircleOutlined style={{ color: '#00d9ff' }} /> :
                     <WarningOutlined style={{ color: '#f59e0b' }} />,
                children: (
                  <div>
                    <div style={{ color: 'white' }}>{activity.action}</div>
                    <div style={{ color: 'var(--primary-color)', fontSize: '0.8rem' }}>
                      {activity.project}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      {activity.time}
                    </div>
                  </div>
                )
              }))}
            />
          </Card>
        </Col>
        
        <Col span={12}>
          <Card 
            className="glass-card" 
            title={
              <Space>
                <WarningOutlined style={{ color: 'var(--warning-color)' }} />
                <span style={{ color: 'white' }}>系统通知</span>
              </Space>
            }
            style={{ border: '1px solid var(--border-color)' }}
          >
            <List
              dataSource={systemAlerts}
              renderItem={(item) => (
                <List.Item style={{ borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: item.type === 'success' ? '#10b981' :
                                  item.type === 'warning' ? '#f59e0b' : '#00d9ff'
                      }} />
                    }
                    title={
                      <Text style={{ color: 'white', fontSize: '0.9rem' }}>
                        {item.message}
                      </Text>
                    }
                    description={
                      <Text style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        {item.time}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* D3.js 扩展监控区域 */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px', marginBottom: '24px' }}>
        <Col span={8}>
          <PerformanceChart title="网络流量监控" height={280} />
        </Col>
        <Col span={8}>
          <PerformanceChart title="存储IO监控" height={280} />
        </Col>
        <Col span={8}>
          <PerformanceChart title="计算负载监控" height={280} />
        </Col>
      </Row>

      {/* 增强的快速操作区 */}
      <Row style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card 
            className="glass-card" 
            title={
              <Space>
                <RocketOutlined style={{ color: 'var(--primary-color)' }} />
                <span style={{ color: 'white' }}>快速启动中心</span>
                <Tag color="processing">v3.0</Tag>
              </Space>
            }
            style={{ border: '1px solid var(--border-color)' }}
          >
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Tooltip title="创建新的CAE分析项目">
                  <Button 
                    className="neon-button" 
                    icon={<RocketOutlined />}
                    size="large"
                    block
                    style={{ height: '60px', fontSize: '1rem' }}
                  >
                    新建项目
                  </Button>
                </Tooltip>
              </Col>
              <Col span={6}>
                <Tooltip title="启动高性能计算任务">
                  <Button 
                    className="neon-button" 
                    icon={<ThunderboltOutlined />}
                    size="large"
                    block
                    style={{ height: '60px', fontSize: '1rem' }}
                  >
                    启动计算
                  </Button>
                </Tooltip>
              </Col>
              <Col span={6}>
                <Tooltip title="实时结果可视化渲染">
                  <Button 
                    className="neon-button" 
                    icon={<EyeOutlined />}
                    size="large"
                    block
                    style={{ height: '60px', fontSize: '1rem' }}
                  >
                    结果可视化
                  </Button>
                </Tooltip>
              </Col>
              <Col span={6}>
                <Tooltip title="智能数据管理系统">
                  <Button 
                    className="neon-button" 
                    icon={<DatabaseOutlined />}
                    size="large"
                    block
                    style={{ height: '60px', fontSize: '1rem' }}
                  >
                    数据管理
                  </Button>
                </Tooltip>
              </Col>
            </Row>
            
            {/* 附加功能 */}
            <Row gutter={[12, 12]} style={{ marginTop: '16px' }}>
              <Col span={4}>
                <Button icon={<CloudServerOutlined />} block size="small">
                  云端同步
                </Button>
              </Col>
              <Col span={4}>
                <Button icon={<SecurityScanOutlined />} block size="small">
                  安全扫描
                </Button>
              </Col>
              <Col span={4}>
                <Button icon={<BugOutlined />} block size="small">
                  调试模式
                </Button>
              </Col>
              <Col span={4}>
                <Button icon={<SettingOutlined />} block size="small">
                  系统配置
                </Button>
              </Col>
              <Col span={4}>
                <Button icon={<ApiOutlined />} block size="small">
                  API文档
                </Button>
              </Col>
              <Col span={4}>
                <Button icon={<UserOutlined />} block size="small">
                  用户中心
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FuturisticDashboardModule;