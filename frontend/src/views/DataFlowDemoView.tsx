/**
 * 数据流可视化演示页面
 * 1号架构师 - 展示三方协作的炫酷数据流
 */

import React, { useState, useEffect } from 'react';
import { Space, Card, Button, Row, Col, Typography, message } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  ReloadOutlined,
  ThunderboltOutlined,
  SettingOutlined
} from '@ant-design/icons';
import DataStreamViz, { DataFlowNode, DataFlowConnection } from '../components/ui/DataStreamViz';
import { ThemeSwitcher } from '../components/ui/DeepCADTheme';
import { ComponentDevHelper } from '../utils/developmentTools';

const { Title, Text } = Typography;

const DataFlowDemoView: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [nodes, setNodes] = useState<DataFlowNode[]>([]);
  const [connections, setConnections] = useState<DataFlowConnection[]>([]);

  // 初始化节点数据
  useEffect(() => {
    const initialNodes: DataFlowNode[] = [
      {
        id: 'geometry-node',
        name: '2号几何专家',
        type: 'geometry',
        status: 'idle',
        position: { x: 150, y: 200 },
        data: {
          size: 156.7,
          count: 12450,
          quality: 0.85,
          timestamp: Date.now()
        }
      },
      {
        id: 'mesh-node',
        name: '网格生成器',
        type: 'mesh',
        status: 'idle',
        position: { x: 400, y: 200 },
        data: {
          size: 892.3,
          count: 186750,
          quality: 0.72,
          timestamp: Date.now()
        }
      },
      {
        id: 'computation-node',
        name: '3号计算专家',
        type: 'computation',
        status: 'idle',
        position: { x: 650, y: 200 },
        data: {
          size: 2156.8,
          count: 456890,
          quality: 0.91,
          timestamp: Date.now()
        }
      },
      {
        id: 'results-node',
        name: '结果可视化',
        type: 'results',
        status: 'idle',
        position: { x: 400, y: 350 },
        data: {
          size: 678.4,
          count: 89650,
          quality: 0.88,
          timestamp: Date.now()
        }
      }
    ];

    const initialConnections: DataFlowConnection[] = [
      {
        id: 'geo-to-mesh',
        source: 'geometry-node',
        target: 'mesh-node',
        flowRate: 0,
        latency: 45,
        status: 'idle',
        dataType: 'geometry'
      },
      {
        id: 'mesh-to-comp',
        source: 'mesh-node',
        target: 'computation-node',
        flowRate: 0,
        latency: 32,
        status: 'idle',
        dataType: 'mesh'
      },
      {
        id: 'comp-to-results',
        source: 'computation-node',
        target: 'results-node',
        flowRate: 0,
        latency: 28,
        status: 'idle',
        dataType: 'results'
      },
      {
        id: 'results-feedback',
        source: 'results-node',
        target: 'geometry-node',
        flowRate: 0,
        latency: 18,
        status: 'idle',
        dataType: 'parameters'
      }
    ];

    setNodes(initialNodes);
    setConnections(initialConnections);

    ComponentDevHelper.logDevTip('数据流演示环境已初始化');
  }, []);

  // 模拟数据流动
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // 更新节点状态
      setNodes(prevNodes => prevNodes.map(node => {
        const statuses: Array<DataFlowNode['status']> = ['active', 'processing', 'completed'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        return {
          ...node,
          status: randomStatus,
          data: node.data ? {
            ...node.data,
            size: node.data.size + (Math.random() - 0.5) * 10,
            quality: Math.max(0.5, Math.min(1, node.data.quality + (Math.random() - 0.5) * 0.1)),
            timestamp: Date.now()
          } : undefined
        };
      }));

      // 更新连接状态
      setConnections(prevConnections => prevConnections.map(connection => ({
        ...connection,
        status: Math.random() > 0.3 ? 'flowing' : 'idle',
        flowRate: Math.random() * 50 + 10,
        latency: Math.random() * 100 + 20
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    message.success(isPlaying ? '数据流已暂停' : '数据流开始流动！');
  };

  const handleReset = () => {
    setIsPlaying(false);
    
    // 重置所有节点为idle状态
    setNodes(prevNodes => prevNodes.map(node => ({
      ...node,
      status: 'idle'
    })));
    
    setConnections(prevConnections => prevConnections.map(connection => ({
      ...connection,
      status: 'idle',
      flowRate: 0
    })));
    
    message.info('数据流已重置');
  };

  const handleNodeClick = (node: DataFlowNode) => {
    message.info(`点击了节点: ${node.name}`);
    ComponentDevHelper.logDevTip(`节点交互: ${node.name} (${node.type})`);
  };

  const handleConnectionClick = (connection: DataFlowConnection) => {
    message.info(`点击了连接: ${connection.dataType}数据流`);
    ComponentDevHelper.logDevTip(`连接交互: ${connection.id} - 流量 ${connection.flowRate.toFixed(1)} MB/s`);
  };

  // 模拟复杂场景 - 3号验证的真实数据
  const handleComplexScenario = () => {
    setIsPlaying(true);
    
    // 使用3号测试验证的真实项目数据
    setNodes(prevNodes => prevNodes.map(node => {
      switch (node.type) {
        case 'geometry':
          return {
            ...node,
            status: 'processing',
            data: node.data ? {
              ...node.data,
              size: 2450.6,
              count: 89750,
              quality: 0.92
            } : undefined
          };
        case 'mesh':
          return {
            ...node,
            status: 'active',
            data: node.data ? {
              ...node.data,
              size: 7456.2,        // 3号测试: 200万单元实际内存占用
              count: 2000000,      // 3号验证: 200万单元规模
              quality: 0.62        // 3号测试: 超大规模项目质量评分
            } : undefined
          };
        case 'computation':
          return {
            ...node,
            status: 'processing',
            data: node.data ? {
              ...node.data,
              size: 8192.0,        // 3号配置: 8GB内存限制
              count: 2000000,      // 3号验证: Terra求解器200万单元
              quality: 0.95        // 3号验证: Terra求解器质量
            } : undefined
          };
        case 'results':
          return {
            ...node,
            status: 'completed',
            data: node.data ? {
              ...node.data,
              size: 6780.4,
              count: 456890,
              quality: 0.89
            } : undefined
          };
        default:
          return node;
      }
    }));

    setConnections(prevConnections => prevConnections.map(connection => ({
      ...connection,
      status: 'flowing',
      flowRate: Math.random() * 80 + 30,
      latency: Math.random() * 60 + 15
    })));

    message.success('🚀 启动大型项目数据流模拟');
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 标题区域 */}
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ color: 'var(--deepcad-primary)', margin: 0 }}>
              <ThunderboltOutlined /> DeepCAD数据流可视化演示
            </Title>
            <Text style={{ color: 'var(--deepcad-text-secondary)' }}>
              展示1号-2号-3号三方协作的实时数据流动
            </Text>
          </Col>
          <Col>
            <Space>
              <ThemeSwitcher size="middle" />
              <Button
                type="primary"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlay}
                size="large"
              >
                {isPlaying ? '暂停' : '播放'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={handleComplexScenario}
                type="dashed"
              >
                复杂场景
              </Button>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => {
                  handleComplexScenario();
                  message.success('🚀 3号验证数据已加载 - 200万单元项目演示！');
                }}
                type="primary"
                ghost
              >
                3号验证数据
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 数据流可视化主体 */}
        <DataStreamViz
          nodes={nodes}
          connections={connections}
          onNodeClick={handleNodeClick}
          onConnectionClick={handleConnectionClick}
          showMetrics={true}
          width={800}
          height={500}
        />

        {/* 说明面板 */}
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card
              title="🎯 节点说明"
              size="small"
              style={{
                background: 'var(--deepcad-bg-secondary)',
                border: '1px solid var(--deepcad-border-primary)'
              }}
            >
              <Space direction="vertical" size="small">
                <div>
                  <Text strong style={{ color: 'var(--deepcad-primary)' }}>2号几何专家</Text>
                  <br />
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    地质建模、基坑设计、支护结构
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: 'var(--deepcad-accent)' }}>网格生成器</Text>
                  <br />
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    Fragment切割、质量优化
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: 'var(--deepcad-success)' }}>3号计算专家</Text>
                  <br />
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    Terra求解器、200万单元、8种分析类型已验证
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card
              title="⚡ 数据类型"
              size="small"
              style={{
                background: 'var(--deepcad-bg-secondary)',
                border: '1px solid var(--deepcad-border-primary)'
              }}
            >
              <Space direction="vertical" size="small">
                <div>
                  <Text strong style={{ color: 'var(--deepcad-info)' }}>geometry</Text>
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    - 几何数据、材料分区
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: 'var(--deepcad-warning)' }}>mesh</Text>
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    - 网格单元、节点坐标
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: 'var(--deepcad-primary)' }}>results</Text>
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    - 应力、位移、水压力
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: 'var(--deepcad-accent)' }}>parameters</Text>
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    - 反馈参数、优化建议
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col span={8}>
            <Card
              title="📊 状态指示"
              size="small"
              style={{
                background: 'var(--deepcad-bg-secondary)',
                border: '1px solid var(--deepcad-border-primary)'
              }}
            >
              <Space direction="vertical" size="small">
                <div>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: '#64748b',
                    marginRight: '8px'
                  }} />
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    idle - 空闲状态
                  </Text>
                </div>
                <div>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--deepcad-primary)',
                    marginRight: '8px'
                  }} />
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    active - 活动状态
                  </Text>
                </div>
                <div>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--deepcad-accent)',
                    marginRight: '8px'
                  }} />
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    processing - 处理中
                  </Text>
                </div>
                <div>
                  <span style={{ 
                    display: 'inline-block', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--deepcad-success)',
                    marginRight: '8px'
                  }} />
                  <Text style={{ color: 'var(--deepcad-text-tertiary)', fontSize: '12px' }}>
                    completed - 完成
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 功能介绍 */}
        <Card
          title="🌟 功能特性"
          style={{
            background: 'var(--deepcad-bg-secondary)',
            border: '1px solid var(--deepcad-border-primary)'
          }}
        >
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <Text strong style={{ color: 'var(--deepcad-primary)' }}>🎮 交互功能</Text>
              <ul style={{ color: 'var(--deepcad-text-secondary)', marginTop: '8px' }}>
                <li>点击节点查看详细信息</li>
                <li>点击连接线查看数据流状态</li>
                <li>实时数据流动画效果</li>
                <li>状态颜色动态变化</li>
              </ul>
            </Col>
            <Col span={12}>
              <Text strong style={{ color: 'var(--deepcad-success)' }}>📊 可视化特性</Text>
              <ul style={{ color: 'var(--deepcad-text-secondary)', marginTop: '8px' }}>
                <li>粒子流动效果</li>
                <li>发光边框和阴影</li>
                <li>脉冲动画和呼吸效果</li>
                <li>科技感配色和材质</li>
              </ul>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
};

export default DataFlowDemoView;