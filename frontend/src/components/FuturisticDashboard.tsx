import React, { useState, useEffect } from 'react';
import { Layout, Button, Avatar, Badge, Space, Typography, Card, Row, Col, Drawer } from 'antd';
import { useLocation } from 'react-router-dom';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  BellOutlined,
  SearchOutlined,
  RocketOutlined
} from '@ant-design/icons';
import CustomMenu from './CustomMenu';
import ProfessionalViewport3D from './ProfessionalViewport3D';
import PerformanceChart from './PerformanceChart';
import CollapsiblePanel from './CollapsiblePanel';
import CSS3DSchematic from './CSS3DSchematic';
import Logo from './Logo';
// import CAE3DViewport from './3d/CAE3DViewport';
// import { Grid3D, CoordinateSystem } from './Viewport3D';
// 样式已在 App.tsx 中通过 index.css 统一导入

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface FuturisticDashboardProps {
  children?: React.ReactNode;
}

export const FuturisticDashboard: React.FC<FuturisticDashboardProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();

  const handleModuleChange = (module: string) => {
    setActiveModule(module);
  };

  // 从路由获取当前模块
  const currentModule = location.pathname.substring(1) || 'dashboard';
  
  // 同步路由变化到activeModule状态
  useEffect(() => {
    const module = location.pathname.substring(1) || 'dashboard';
    setActiveModule(module);
  }, [location.pathname]);
  
  // 模块名称映射
  const moduleNames: { [key: string]: string } = {
    dashboard: '控制中心',
    geometry: '几何建模',
    meshing: '网格生成', 
    analysis: '仿真分析',
    results: '结果可视化',
    materials: '材料库',
    settings: '系统设置'
  };

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端菜单切换
  const handleMobileMenuToggle = () => {
    if (isMobile) {
      setMobileDrawerOpen(!mobileDrawerOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const systemStats = [
    { label: 'CPU使用率', value: '67%', color: 'var(--primary-color)' },
    { label: '内存', value: '4.2GB', color: 'var(--accent-color)' },
    { label: 'GPU负载', value: '89%', color: 'var(--secondary-color)' },
    { label: '存储', value: '2.1TB', color: 'var(--warning-color)' }
  ];

  return (
    <Layout className="height-fix-full" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* 动态背景 */}
      <div className="futuristic-bg" />
      <div className="grid-bg" />
      
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed}
          width={280}
          collapsedWidth={80}
          breakpoint="lg"
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            borderRight: '1px solid var(--border-color)',
            zIndex: 100,
            transition: 'all 0.3s ease'
          }}
        >
          {/* Logo区域 */}
          <div style={{
            padding: '20px',
            textAlign: 'center',
            borderBottom: '1px solid var(--border-color)'
          }}>
            {!collapsed ? (
              <Logo size="small" />
            ) : (
              <Logo variant="icon" size="small" />
            )}
          </div>

          
          {/* 自定义菜单 */}
          <CustomMenu 
            activeModule={currentModule}
            onItemClick={handleModuleChange}
            collapsed={collapsed}
          />

          {/* 系统状态 */}
          {!collapsed && (
            <div style={{ 
              padding: '20px',
              borderTop: '1px solid var(--border-color)',
              margin: '20px 0 0 0'
            }}>
              <Text style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '0.8rem',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                系统状态
              </Text>
              <div style={{ marginTop: '15px' }}>
                {systemStats.map((stat, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
                    <span style={{ 
                      color: stat.color,
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 'bold'
                    }}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Sider>
      )}

      {/* 移动端抽屉菜单 */}
      <Drawer
        title={null}
        placement="left"
        closable={false}
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen && isMobile}
        width={280}
        styles={{
          body: {
            padding: 0,
            background: 'var(--bg-card)',
            backdropFilter: 'blur(10px)'
          }
        }}
        style={{
          zIndex: 1000
        }}
      >
        {/* Logo区域 */}
        <div style={{
          padding: '20px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <Logo size="medium" />
        </div>

        {/* 移动端菜单 */}
        <CustomMenu 
          activeModule={currentModule}
          onItemClick={(key) => {
            handleModuleChange(key);
            setMobileDrawerOpen(false);
          }}
          collapsed={false}
        />

        {/* 系统状态 */}
        <div style={{ 
          padding: '20px',
          borderTop: '1px solid var(--border-color)',
          margin: '20px 0 0 0'
        }}>
          <Text style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.8rem',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            SYSTEM STATUS
          </Text>
          <div style={{ marginTop: '15px' }}>
            {systemStats.map((stat, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '0.75rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
                <span style={{ 
                  color: stat.color,
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 'bold'
                }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      <Layout>
        {/* 顶部导航栏 */}
        <Header className="flex-fix-full" style={{
          padding: isMobile ? '0 15px' : '0 20px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          height: isMobile ? '56px' : '64px'
        }}>
          <div className="flex-fix">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={handleMobileMenuToggle}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
                color: 'var(--primary-color)'
              }}
            />
            
            {!isMobile && (
              <div style={{ 
                marginLeft: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start'
              }}>
                <Title level={4} style={{ 
                  color: 'var(--text-primary)', 
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {moduleNames[currentModule] || currentModule.toUpperCase()}
                </Title>
                <Text style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '0.8rem',
                  marginTop: '2px'
                }}>
                  活动模块
                </Text>
              </div>
            )}
          </div>

          <Space size={isMobile ? "middle" : "large"} className="flex-fix">
            {/* 搜索 */}
            {!isMobile && (
              <Button 
                type="text" 
                icon={<SearchOutlined />}
                style={{ color: 'var(--text-secondary)' }}
              />
            )}
            
            {/* 通知 */}
            <Badge count={3} size="small">
              <Button 
                type="text" 
                icon={<BellOutlined />}
                style={{ color: 'var(--text-secondary)' }}
              />
            </Badge>
            
            {/* 用户头像 */}
            <Space className="flex-fix">
              <Avatar 
                icon={<UserOutlined />} 
                style={{ 
                  background: 'linear-gradient(45deg, var(--primary-color), var(--secondary-color))'
                }}
              />
              {!isMobile && (
                <div className="flex-fix-column" style={{ color: 'var(--text-primary)' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>工程师博士</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CAE专家</div>
                </div>
              )}
            </Space>
          </Space>
        </Header>

        {/* 主内容区域 */}
        <Content className="overflow-fix-auto" style={{
          margin: isMobile ? '10px' : '20px',
          padding: isMobile ? '15px' : '30px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          minHeight: 'calc(100vh - 120px)',
          height: 'calc(100vh - 120px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {children ? children : (
            <div style={{ height: '100%', width: '100%' }}>
              
              {activeModule === 'dashboard' && (
                <div style={{ height: '100%', padding: '20px' }}>
                  {/* 欢迎区域 */}
                  <Card 
                    className="glass-card"
                    style={{ textAlign: 'center', marginBottom: '24px' }}
                    styles={{
                      body: { padding: '24px' }
                    }}
                  >
                    <RocketOutlined style={{ 
                      fontSize: '2.5rem', 
                      color: 'var(--primary-color)',
                      marginBottom: '12px'
                    }} />
                    <Title level={2} style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
                      深度CAE量子引擎
                    </Title>
                    <Text style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '1.1rem',
                      display: 'block',
                      marginBottom: '20px'
                    }}>
                      下一代计算分析平台
                    </Text>
                    <Button 
                      type="primary"
                      size="large"
                      style={{
                        background: 'linear-gradient(45deg, var(--primary-color), var(--secondary-color))',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(0, 217, 255, 0.3)'
                      }}
                    >
                      开始新项目
                    </Button>
                  </Card>
                  
                  {/* D3.js 系统监控区域 */}
                  <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                    <Col span={8}>
                      <div style={{ height: '380px' }}>
                        <PerformanceChart title="CPU & Memory 监控" height={280} />
                      </div>
                    </Col>
                    
                    <Col span={8}>
                      <div style={{ height: '380px' }}>
                        <PerformanceChart title="GPU & Network 监控" height={280} />
                      </div>
                    </Col>
                    
                    <Col span={8}>
                      <div style={{ height: '380px' }}>
                        <PerformanceChart title="Disk & Storage 监控" height={280} />
                      </div>
                    </Col>
                  </Row>
                  
                  {/* 系统状态卡片 */}
                  <Row gutter={[16, 16]}>
                    <Col span={6}>
                      <Card className="glass-card" style={{ textAlign: 'center' }} styles={{ body: { padding: '24px' } }}>
                        <Title level={2} style={{ color: 'var(--primary-color)', margin: 0, fontSize: '2rem' }}>
                          67%
                        </Title>
                        <Text style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>CPU使用率</Text>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card className="glass-card" style={{ textAlign: 'center' }} styles={{ body: { padding: '24px' } }}>
                        <Title level={2} style={{ color: 'var(--accent-color)', margin: 0, fontSize: '2rem' }}>
                          4.2GB
                        </Title>
                        <Text style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>内存使用</Text>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card className="glass-card" style={{ textAlign: 'center' }} styles={{ body: { padding: '24px' } }}>
                        <Title level={2} style={{ color: 'var(--secondary-color)', margin: 0, fontSize: '2rem' }}>
                          89%
                        </Title>
                        <Text style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>GPU负载</Text>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card className="glass-card" style={{ textAlign: 'center' }} styles={{ body: { padding: '24px' } }}>
                        <Title level={2} style={{ color: 'var(--warning-color)', margin: 0, fontSize: '2rem' }}>
                          2.1TB
                        </Title>
                        <Text style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>存储空间</Text>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )}
              
              
              {activeModule === 'meshing' && (
                <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
                  {/* 左侧工具区域 */}
                  <div style={{ width: '50%', height: '100%', paddingRight: '12px' }}>
                    {/* 左侧工具区域 */}
                    <Card className="glass-card" style={{ height: '100%' }} styles={{ body: { padding: '16px', height: '100%' } }}>
                      <Title level={4} style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>网格工具</Title>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Button type="primary" size="large" style={{ width: '100%' }}>
                          生成网格
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          网格设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          网格质量
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          网格细化
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          边界条件
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          自适应网格
                        </Button>
                      </div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <Title level={5} style={{ color: 'var(--accent-color)', marginBottom: '12px' }}>网格参数</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>单元尺寸: 0.5mm</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>单元类型: 四面体</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>节点数: 12,485</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>单元数: 45,672</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>质量: 0.87</Text>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* 右下角填满3D视口 */}
                  <div style={{ width: '50%', height: '100%' }}>
                    <ProfessionalViewport3D 
                      title="3D视口" 
                      description="增强型3D视口，带网格和立体视图"
                      mode="advanced"
                      onAction={(action) => console.log('3D action:', action)}
                    />
                  </div>
                </div>
              )}
              
              {activeModule === 'analysis' && (
                <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
                  {/* 左侧工具区域 */}
                  <div style={{ width: '50%', height: '100%', paddingRight: '12px' }}>
                    {/* 左侧工具区域 */}
                    <Card className="glass-card" style={{ height: '100%' }} styles={{ body: { padding: '16px', height: '100%' } }}>
                      <Title level={4} style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>分析工具</Title>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Button type="primary" size="large" style={{ width: '100%' }}>
                          运行仿真
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          分析设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          边界条件
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          材料属性
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          求解设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          载荷工况
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          收敛控制
                        </Button>
                      </div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <Title level={5} style={{ color: 'var(--accent-color)', marginBottom: '12px' }}>求解器状态</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>状态: 就绪</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>求解器: 直接稀疏</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>自由度: 125,340</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>内存: 2.4 GB</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>进度: 0%</Text>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* 右下角填满3D视口 */}
                  <div style={{ width: '50%', height: '100%' }}>
                    <ProfessionalViewport3D 
                      title="3D视口" 
                      description="增强型3D视口，带网格和立体视图"
                      mode="advanced"
                      onAction={(action) => console.log('3D action:', action)}
                    />
                  </div>
                </div>
              )}
              
              {activeModule === 'visualization' && (
                <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
                  {/* 左侧工具区域 */}
                  <div style={{ width: '50%', height: '100%', paddingRight: '12px' }}>
                    {/* 左侧工具区域 */}
                    <Card className="glass-card" style={{ height: '100%' }} styles={{ body: { padding: '16px', height: '100%' } }}>
                      <Title level={4} style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>可视化工具</Title>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Button type="primary" size="large" style={{ width: '100%' }}>
                          结果可视化
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          导出图表
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          等值线图
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          矢量场
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          动画
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          剖面
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          等值面
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          流线
                        </Button>
                      </div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <Title level={5} style={{ color: 'var(--accent-color)', marginBottom: '12px' }}>结果显示</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>场: 应力 (冯米塞斯)</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>比例: 线性</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>最小值: 0.12 MPa</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>最大值: 245.8 MPa</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>色彩映射: Jet</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>变形: 10倍</Text>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* 右下角填满3D视口 */}
                  <div style={{ width: '50%', height: '100%' }}>
                    <ProfessionalViewport3D 
                      title="3D视口" 
                      description="增强型3D视口，带网格和立体视图"
                      mode="advanced"
                      onAction={(action) => console.log('3D action:', action)}
                    />
                  </div>
                </div>
              )}
              
              {activeModule === 'data' && (
                <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
                  {/* 左侧工具区域 */}
                  <div style={{ width: '50%', height: '100%', paddingRight: '12px' }}>
                    {/* 左侧工具区域 */}
                    <Card className="glass-card" style={{ height: '100%' }} styles={{ body: { padding: '16px', height: '100%' } }}>
                      <Title level={4} style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>数据管理</Title>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Button type="primary" size="large" style={{ width: '100%' }}>
                          浏览数据
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          导入数据
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          导出数据
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          数据分析
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          数据可视化
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          数据库查询
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          备份恢复
                        </Button>
                      </div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <Title level={5} style={{ color: 'var(--accent-color)', marginBottom: '12px' }}>数据统计</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>总记录数: 1,247,832</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>活跃项目: 42</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>存储使用: 2.4 TB</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>最近备份: 2小时前</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>数据库状态: 在线</Text>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* 右下角填满3D视口 */}
                  <div style={{ width: '50%', height: '100%' }}>
                    <ProfessionalViewport3D 
                      title="3D视口" 
                      description="增强型3D视口，带网格和立体视图"
                      mode="advanced"
                      onAction={(action) => console.log('3D action:', action)}
                    />
                  </div>
                </div>
              )}
              
              {activeModule === 'settings' && (
                <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex' }}>
                  {/* 左侧工具区域 */}
                  <div style={{ width: '50%', height: '100%', paddingRight: '12px' }}>
                    {/* 左侧工具区域 */}
                    <Card className="glass-card" style={{ height: '100%' }} styles={{ body: { padding: '16px', height: '100%' } }}>
                      <Title level={4} style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>系统设置</Title>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Button type="primary" size="large" style={{ width: '100%' }}>
                          打开设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          显示设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          性能设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          安全设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          网络设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          用户偏好
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          备份设置
                        </Button>
                        <Button size="large" style={{ width: '100%' }}>
                          重置配置
                        </Button>
                      </div>
                      
                      <div style={{ marginTop: '20px' }}>
                        <Title level={5} style={{ color: 'var(--accent-color)', marginBottom: '12px' }}>系统信息</Title>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>版本: DeepCAE v3.0.1</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>构建: 2024.07.18-发布版</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>平台: Windows 11 x64</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>许可证: 专业版</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>运行时间: 4天12小时35分钟</Text>
                          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>最近更新: 2024-07-15</Text>
                        </div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* 右下角填满3D视口 */}
                  <div style={{ width: '50%', height: '100%' }}>
                    <ProfessionalViewport3D 
                      title="3D视口" 
                      description="增强型3D视口，带网格和立体视图"
                      mode="advanced"
                      onAction={(action) => console.log('3D action:', action)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default FuturisticDashboard;