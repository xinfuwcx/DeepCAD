import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Button, 
  Space, 
  Progress, 
  Divider, 
  List, 
  Avatar, 
  Tag, 
  Tooltip,
  Empty
} from 'antd';
import { 
  AppstoreOutlined, 
  BuildOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  PlusOutlined,
  FileOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  RightOutlined,
  CloudOutlined,
  CodeOutlined,
  ToolOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../stores/useUIStore';

const { Title, Paragraph, Text } = Typography;

// 模拟最近项目数据
const recentProjects = [
  {
    id: 1,
    name: '深基坑支护工程',
    lastModified: '2023-09-15',
    status: 'completed',
    progress: 100,
  },
  {
    id: 2,
    name: '地铁站基坑开挖',
    lastModified: '2023-09-10',
    status: 'in_progress',
    progress: 65,
  },
  {
    id: 3,
    name: '商业楼基础设计',
    lastModified: '2023-09-05',
    status: 'planning',
    progress: 30,
  },
  {
    id: 4,
    name: '桩基础设计方案',
    lastModified: '2023-08-28',
    status: 'completed',
    progress: 100,
  }
];

// 状态标签映射
const statusTags = {
  completed: <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>,
  in_progress: <Tag color="processing" icon={<SyncOutlined spin />}>进行中</Tag>,
  planning: <Tag color="warning" icon={<ClockCircleOutlined />}>规划中</Tag>,
  error: <Tag color="error" icon={<ExclamationCircleOutlined />}>错误</Tag>
};

// 系统资源使用情况
const systemResources = {
  cpu: 18,
  memory: 42,
  disk: 56,
  network: 24
};

const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [systemStatus, setSystemStatus] = useState(systemResources);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { scene, isLoading } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      isLoading: state.isLoading
    }))
  );

  const { taskProgress } = useUIStore(
    useShallow(state => ({
      taskProgress: state.taskProgress
    }))
  );

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // 模拟系统资源变化
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemStatus({
        cpu: Math.floor(Math.random() * 30) + 10,
        memory: Math.floor(Math.random() * 20) + 30,
        disk: 56,
        network: Math.floor(Math.random() * 40) + 10
      });
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);

  const componentCount = scene?.components?.length || 0;
  const materialCount = scene?.materials?.length || 0;
  // 检查网格是否已生成
  const hasMesh = scene?.meshing?.global_size !== undefined;
  // 检查是否有计算结果
  const hasResults = false; // 暂时默认为false，后续可以根据实际API调整

  // 获取任务进度
  const taskProgressPercent = taskProgress?.message ? 
    (taskProgress.status === 'completed' ? 100 : 
     taskProgress.status === 'processing' ? 50 : 
     taskProgress.status === 'starting' ? 10 : 0) : 0;

  // 将任务状态映射到Progress组件的状态
  const mapTaskStatusToProgressStatus = (status: string): "success" | "normal" | "exception" | "active" | undefined => {
    switch(status) {
      case 'completed': return 'success';
      case 'processing': return 'active';
      case 'error': return 'exception';
      default: return 'normal';
    }
  };

  const getStatusColor = (value: number) => {
    if (value < 50) return '#52c41a';
    if (value < 80) return '#faad14';
    return '#f5222d';
  };

  return (
    <div className="dashboard-container">
      {/* 顶部欢迎区域 */}
      <div className="dashboard-header" style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={16}>
            <Title level={2} style={{ color: 'white', margin: 0 }}>DeepCAD 工作台</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)', margin: '8px 0 0 0' }}>
              欢迎使用 DeepCAD - 深基坑工程辅助设计系统
            </Paragraph>
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
              {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
            </Text>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/geometry')}>
                新建项目
              </Button>
              <Button icon={<FileOutlined />}>
                打开项目
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 项目状态卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="dashboard-card"
            style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', borderColor: '#3949ab' }}
            hoverable
          >
            <Statistic 
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>项目组件</span>}
              value={componentCount}
              valueStyle={{ color: '#ffffff' }}
              prefix={<AppstoreOutlined />}
              suffix={<small style={{ fontSize: '14px', opacity: 0.7 }}>个</small>}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                {componentCount > 0 ? '项目已创建' : '尚未创建组件'}
              </Text>
            </div>
            <Link to="/geometry">
              <Button type="text" style={{ color: 'white', padding: 0, marginTop: 8 }}>
                管理组件 <RightOutlined />
              </Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="dashboard-card"
            style={{ background: 'linear-gradient(135deg, #0277bd 0%, #0288d1 100%)', borderColor: '#039be5' }}
            hoverable
          >
            <Statistic 
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>网格状态</span>}
              value={hasMesh ? "已生成" : "未生成"}
              valueStyle={{ color: '#ffffff' }}
              prefix={<BuildOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                {hasMesh ? '网格已就绪' : '需要生成网格'}
              </Text>
            </div>
            <Link to="/meshing">
              <Button type="text" style={{ color: 'white', padding: 0, marginTop: 8 }}>
                网格设置 <RightOutlined />
              </Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="dashboard-card"
            style={{ background: 'linear-gradient(135deg, #00695c 0%, #00796b 100%)', borderColor: '#00897b' }}
            hoverable
          >
            <Statistic 
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>计算分析</span>}
              value={hasResults ? "已完成" : "未开始"}
              valueStyle={{ color: '#ffffff' }}
              prefix={<BarChartOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Progress 
                percent={taskProgressPercent} 
                size="small" 
                status={mapTaskStatusToProgressStatus(taskProgress.status)}
                strokeColor="#ffffff"
                trailColor="rgba(255,255,255,0.3)"
                showInfo={false}
              />
            </div>
            <Link to="/analysis">
              <Button type="text" style={{ color: 'white', padding: 0, marginTop: 8 }}>
                运行分析 <RightOutlined />
              </Button>
            </Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            className="dashboard-card"
            style={{ background: 'linear-gradient(135deg, #bf360c 0%, #d84315 100%)', borderColor: '#e64a19' }}
            hoverable
          >
            <Statistic 
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>材料库</span>}
              value={materialCount}
              valueStyle={{ color: '#ffffff' }}
              prefix={<ToolOutlined />}
              suffix={<small style={{ fontSize: '14px', opacity: 0.7 }}>种</small>}
            />
            <div style={{ marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                {materialCount > 0 ? '材料已配置' : '尚未配置材料'}
              </Text>
            </div>
            <Link to="/settings">
              <Button type="text" style={{ color: 'white', padding: 0, marginTop: 8 }}>
                管理材料 <RightOutlined />
              </Button>
            </Link>
          </Card>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* 左侧 - 最近项目 */}
        <Col xs={24} lg={16}>
          <Card 
            title={<span style={{ color: 'white' }}><ClockCircleOutlined /> 最近项目</span>}
            className="dashboard-card"
            style={{ height: '100%' }}
            extra={
              <Button type="link" style={{ color: 'rgba(255,255,255,0.7)' }}>
                查看全部
              </Button>
            }
          >
            {recentProjects.length > 0 ? (
              <List
                dataSource={recentProjects}
                renderItem={item => (
                  <List.Item
                    key={item.id}
                    actions={[
                      <Button type="link" size="small">打开</Button>,
                      <Button type="text" size="small">详情</Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          style={{ 
                            backgroundColor: 
                              item.status === 'completed' ? '#52c41a' : 
                              item.status === 'in_progress' ? '#1890ff' : '#faad14' 
                          }}
                          icon={<FileTextOutlined />} 
                        />
                      }
                      title={<Text style={{ color: 'white' }}>{item.name}</Text>}
                      description={
                        <Space>
                          <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                            最后修改: {item.lastModified}
                          </Text>
                          {statusTags[item.status as keyof typeof statusTags]}
                        </Space>
                      }
                    />
                    <Progress 
                      percent={item.progress} 
                      size="small" 
                      status={item.status === 'completed' ? 'success' : 'active'} 
                      style={{ width: 100 }}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>暂无项目</span>}
              />
            )}
          </Card>
        </Col>
        
        {/* 右侧 - 系统状态和快速操作 */}
        <Col xs={24} lg={8}>
          {/* 系统状态 */}
          <Card 
            title={<span style={{ color: 'white' }}><CloudOutlined /> 系统状态</span>}
            className="dashboard-card"
            style={{ marginBottom: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>CPU 使用率</Text>
                  <Text style={{ color: getStatusColor(systemStatus.cpu) }}>{systemStatus.cpu}%</Text>
                </div>
                <Progress 
                  percent={systemStatus.cpu} 
                  status={systemStatus.cpu > 80 ? 'exception' : (systemStatus.cpu > 50 ? 'normal' : 'success')} 
                  showInfo={false}
                  strokeColor={getStatusColor(systemStatus.cpu)}
                  size="small"
                />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>内存使用率</Text>
                  <Text style={{ color: getStatusColor(systemStatus.memory) }}>{systemStatus.memory}%</Text>
                </div>
                <Progress 
                  percent={systemStatus.memory} 
                  status={systemStatus.memory > 80 ? 'exception' : (systemStatus.memory > 50 ? 'normal' : 'success')} 
                  showInfo={false}
                  strokeColor={getStatusColor(systemStatus.memory)}
                  size="small"
                />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>磁盘使用率</Text>
                  <Text style={{ color: getStatusColor(systemStatus.disk) }}>{systemStatus.disk}%</Text>
                </div>
                <Progress 
                  percent={systemStatus.disk} 
                  status={systemStatus.disk > 80 ? 'exception' : (systemStatus.disk > 50 ? 'normal' : 'success')} 
                  showInfo={false}
                  strokeColor={getStatusColor(systemStatus.disk)}
                  size="small"
                />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>网络带宽</Text>
                  <Text style={{ color: getStatusColor(systemStatus.network) }}>{systemStatus.network}%</Text>
                </div>
                <Progress 
                  percent={systemStatus.network} 
                  status={systemStatus.network > 80 ? 'exception' : (systemStatus.network > 50 ? 'normal' : 'success')} 
                  showInfo={false}
                  strokeColor={getStatusColor(systemStatus.network)}
                  size="small"
                />
              </div>
            </Space>
          </Card>
          
          {/* 快速操作 */}
          <Card 
            title={<span style={{ color: 'white' }}><SettingOutlined /> 快速操作</span>}
            className="dashboard-card"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button type="primary" icon={<CodeOutlined />} block>
                打开 AI 助手
              </Button>
              <Button icon={<ToolOutlined />} block>
                模型校验
              </Button>
              <Button icon={<FileOutlined />} block>
                导出报告
              </Button>
              <Button icon={<SettingOutlined />} block>
                系统设置
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardView; 