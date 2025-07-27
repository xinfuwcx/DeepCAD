import React, { useState, useEffect } from 'react';
import { Button, Typography, Row, Col, Card, Space, Progress } from 'antd';
import {
  RocketOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import '../styles/futuristic-theme.css';

const { Title, Text } = Typography;

interface FuturisticLandingProps {
  onStart: () => void;
}

export const FuturisticLanding: React.FC<FuturisticLandingProps> = ({ onStart }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSystemReady, setIsSystemReady] = useState(false);

  useEffect(() => {
    // 模拟系统初始化
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSystemReady(true);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <RocketOutlined />,
      title: "AI-POWERED CAE",
      description: "Advanced computational analysis with artificial intelligence",
      metric: "99.7%",
      label: "ACCURACY"
    },
    {
      icon: <ThunderboltOutlined />,
      title: "QUANTUM PROCESSING",
      description: "Ultra-fast mesh generation and optimization",
      metric: "10x",
      label: "FASTER"
    },
    {
      icon: <EyeOutlined />,
      title: "NEURAL VISUALIZATION",
      description: "Real-time 3D rendering with neural enhancement",
      metric: "4K",
      label: "RESOLUTION"
    },
    {
      icon: <DatabaseOutlined />,
      title: "CLOUD INTEGRATION",
      description: "Seamless data synchronization across platforms",
      metric: "24/7",
      label: "UPTIME"
    }
  ];

  return (
    <div className="futuristic-landing">
      {/* 动态背景 */}
      <div className="futuristic-bg" />
      <div className="grid-bg" />
      <div className="scan-line" />
      
      <div style={{ 
        minHeight: '100vh', 
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        
        {/* 主标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ 
            fontSize: '1.2rem', 
            color: 'var(--primary-color)',
            marginBottom: '10px',
            letterSpacing: '3px',
            textTransform: 'uppercase'
          }}>
            NEXT-GENERATION
          </div>
          
          <Title 
            level={1} 
            style={{ 
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              margin: '0',
              background: 'linear-gradient(45deg, var(--primary-color), var(--secondary-color))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900,
              textShadow: '0 0 30px rgba(0, 217, 255, 0.5)',
              letterSpacing: '-2px'
            }}
          >
            DEEP<span style={{ color: 'var(--accent-color)' }}>CAE</span>
          </Title>
          
          <Text style={{ 
            fontSize: '1.4rem',
            color: 'var(--text-secondary)',
            display: 'block',
            marginTop: '20px',
            letterSpacing: '1px'
          }}>
            ADVANCED COMPUTATIONAL ANALYSIS ENGINE
          </Text>
          
          <div style={{ 
            marginTop: '30px',
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            letterSpacing: '2px'
          }}>
            [ QUANTUM-ENHANCED • AI-DRIVEN • REAL-TIME ]
          </div>
        </div>

        {/* 系统状态 */}
        <div className="glass-card" style={{ 
          maxWidth: '600px', 
          margin: '0 auto 40px auto', 
          padding: '30px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <Text style={{ 
              color: 'var(--primary-color)',
              fontSize: '1rem',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              SYSTEM INITIALIZATION
            </Text>
          </div>
          
          <Progress 
            percent={Math.round(loadingProgress)} 
            strokeColor={{
              '0%': 'var(--primary-color)',
              '100%': 'var(--secondary-color)',
            }}
            trailColor="var(--bg-tertiary)"
            style={{ marginBottom: '20px' }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>NEURAL NETWORKS</span>
            <span className={`status-indicator ${loadingProgress > 30 ? 'active' : ''}`}></span>
            
            <span style={{ color: 'var(--text-secondary)' }}>QUANTUM CORE</span>
            <span className={`status-indicator ${loadingProgress > 60 ? 'active' : ''}`}></span>
            
            <span style={{ color: 'var(--text-secondary)' }}>AI MODULES</span>
            <span className={`status-indicator ${loadingProgress > 90 ? 'active' : ''}`}></span>
          </div>
        </div>

        {/* 功能特性 */}
        <Row gutter={[24, 24]} style={{ marginBottom: '60px' }}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                className="glass-card hologram"
                style={{
                  height: '200px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  textAlign: 'center',
                  padding: '20px'
                }}
                bodyStyle={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ 
                    fontSize: '2rem', 
                    color: 'var(--primary-color)',
                    marginBottom: '10px'
                  }}>
                    {feature.icon}
                  </div>
                  <Title level={5} style={{ 
                    color: 'white', 
                    margin: '0 0 8px 0',
                    fontSize: '0.9rem',
                    letterSpacing: '1px'
                  }}>
                    {feature.title}
                  </Title>
                  <Text style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    lineHeight: '1.4'
                  }}>
                    {feature.description}
                  </Text>
                </div>
                
                <div style={{ marginTop: '15px' }}>
                  <div style={{ 
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'var(--accent-color)',
                    fontFamily: 'JetBrains Mono'
                  }}>
                    {feature.metric}
                  </div>
                  <Text style={{ 
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '1px'
                  }}>
                    {feature.label}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 启动按钮 */}
        <div style={{ textAlign: 'center' }}>
          <Button
            className={`neon-button ${!isSystemReady ? 'disabled' : ''}`}
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={onStart}
            disabled={!isSystemReady}
            style={{
              height: '60px',
              padding: '0 40px',
              fontSize: '1.1rem',
              borderRadius: '30px',
              opacity: isSystemReady ? 1 : 0.6,
              cursor: isSystemReady ? 'pointer' : 'not-allowed'
            }}
          >
            {isSystemReady ? 'INITIALIZE WORKSPACE' : 'LOADING SYSTEMS...'}
          </Button>
          
          {isSystemReady && (
            <div style={{ 
              marginTop: '20px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              letterSpacing: '1px'
            }}>
              [ ALL SYSTEMS OPERATIONAL ]
            </div>
          )}
        </div>

        {/* 版本信息 */}
        <div style={{ 
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono'
        }}>
          <div>DeepCAE v3.0.1</div>
          <div>BUILD: {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}</div>
        </div>
      </div>
    </div>
  );
};

export default FuturisticLanding;