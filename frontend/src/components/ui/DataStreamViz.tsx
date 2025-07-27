/**
 * 量子数据流可视化组件
 * 1号架构师 - 炫酷的三方数据流向可视化
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Space, Typography, Tag, Progress, Tooltip } from 'antd';
import { 
  ThunderboltOutlined,
  ArrowRightOutlined,
  DatabaseOutlined,
  CloudOutlined,
  DesktopOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useDeepCADTheme } from './DeepCADTheme';
import { ComponentDevHelper } from '../../utils/developmentTools';
import { useSoundDesign } from '../../utils/SoundDesign';
import ParticleBackground from './ParticleBackground';
import GlassmorphismCard from './GlassmorphismCard';

const { Text } = Typography;

// UI特定的数据流节点类型
export interface DataFlowNode {
  id: string;
  name: string;
  type: 'geometry' | 'mesh' | 'computation' | 'results';
  status: 'idle' | 'active' | 'processing' | 'completed' | 'error';
  position: { x: number; y: number };
  data?: {
    size: number;        // 数据大小 (MB)
    count: number;       // 数据条目数
    quality: number;     // 数据质量 (0-1)
    timestamp: number;   // 时间戳
  };
}

// UI特定的数据流连接类型
export interface DataFlowConnection {
  id: string;
  source: string;
  target: string;
  flowRate: number;      // 流动速率 (MB/s)
  latency: number;       // 延迟 (ms)
  status: 'idle' | 'flowing' | 'blocked' | 'error';
  dataType: 'geometry' | 'mesh' | 'parameters' | 'results' | 'quality_feedback';
}

interface DataStreamVizProps {
  nodes: DataFlowNode[];
  connections: DataFlowConnection[];
  onNodeClick?: (node: DataFlowNode) => void;
  onConnectionClick?: (connection: DataFlowConnection) => void;
  showMetrics?: boolean;
  width?: number;
  height?: number;
  className?: string;
  enhancedEffects?: boolean;
  soundEnabled?: boolean;
  particleBackground?: boolean;
}

// 节点图标映射
const NODE_ICONS = {
  geometry: <DesktopOutlined />,
  mesh: <CloudOutlined />,
  computation: <ThunderboltOutlined />,
  results: <DatabaseOutlined />
};

// 状态颜色映射
const STATUS_COLORS = {
  idle: '#64748b',
  active: '#00d9ff',
  processing: '#a855f7',
  completed: '#00ff88',
  error: '#ff4444',
  flowing: '#00d9ff',
  blocked: '#ff6600'
};

const DataStreamViz: React.FC<DataStreamVizProps> = ({
  nodes,
  connections,
  onNodeClick,
  onConnectionClick,
  showMetrics = true,
  width = 800,
  height = 400,
  className,
  enhancedEffects = true,
  soundEnabled = true,
  particleBackground = true
}) => {
  const { themeConfig } = useDeepCADTheme();
  const { playSound, playDataSequence, uiMixer } = useSoundDesign();
  const svgRef = useRef<SVGSVGElement>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());

  // 增强的节点点击处理
  const handleNodeClick = useCallback((node: DataFlowNode) => {
    if (soundEnabled) {
      switch (node.status) {
        case 'active':
          playSound('dataLoad');
          break;
        case 'processing':
          playSound('dataProcess');
          break;
        case 'completed':
          uiMixer.onSuccess();
          break;
        case 'error':
          uiMixer.onError();
          break;
        default:
          uiMixer.onClick();
      }
    }
    
    onNodeClick?.(node);
    ComponentDevHelper.logDevTip(`数据节点点击: ${node.name} (${node.status})`);
  }, [soundEnabled, playSound, uiMixer, onNodeClick]);

  // 增强的连接点击处理
  const handleConnectionClick = useCallback((connection: DataFlowConnection) => {
    if (soundEnabled) {
      if (connection.status === 'flowing') {
        playDataSequence(Math.floor(connection.flowRate), 1000);
      } else {
        uiMixer.onClick();
      }
    }
    
    setActiveConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connection.id)) {
        newSet.delete(connection.id);
      } else {
        newSet.add(connection.id);
      }
      return newSet;
    });
    
    onConnectionClick?.(connection);
  }, [soundEnabled, playDataSequence, uiMixer, onConnectionClick]);

  // 节点悬停处理
  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (nodeId !== hoveredNode) {
      setHoveredNode(nodeId);
      if (nodeId && soundEnabled) {
        uiMixer.onHover();
      }
    }
  }, [hoveredNode, soundEnabled, uiMixer]);

  // 粒子动画
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
      requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, []);

  // 数据流变化音效
  useEffect(() => {
    const flowingConnections = connections.filter(c => c.status === 'flowing');
    if (soundEnabled && flowingConnections.length > 0) {
      const totalFlowRate = flowingConnections.reduce((sum, c) => sum + c.flowRate, 0);
      if (totalFlowRate > 50) { // 高流量时播放数据流音效
        const interval = setInterval(() => {
          playSound('dataProcess', { volume: 0.3, pitch: 0.8 });
        }, 2000);
        
        return () => clearInterval(interval);
      }
    }
  }, [connections, soundEnabled, playSound]);

  // 渲染增强的数据流粒子
  const renderFlowParticles = (connection: DataFlowConnection) => {
    if (connection.status !== 'flowing') return null;

    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return null;

    const particles = [];
    const isActive = activeConnections.has(connection.id);
    const baseParticles = Math.max(1, Math.floor(connection.flowRate / 10));
    const numParticles = isActive ? baseParticles * 2 : baseParticles;
    
    // 数据类型对应的颜色
    const dataTypeColors = {
      geometry: '#00d9ff',
      mesh: '#a855f7',
      parameters: '#00ff88',
      results: '#ff6b35'
    };
    
    const particleColor = dataTypeColors[connection.dataType] || themeConfig.colors.primary;
    
    for (let i = 0; i < numParticles; i++) {
      const baseProgress = (animationFrame * 0.02 + i * 0.3) % 1;
      const progress = enhancedEffects ? 
        baseProgress + Math.sin(animationFrame * 0.05 + i) * 0.05 : // 增加波动效果
        baseProgress;
      
      const x = sourceNode.position.x + (targetNode.position.x - sourceNode.position.x) * progress;
      const y = sourceNode.position.y + (targetNode.position.y - sourceNode.position.y) * progress;
      
      // 粒子大小和透明度根据数据流量调整
      const size = 2 + (connection.flowRate / 50);
      const opacity = 0.6 + (progress * 0.4);
      
      particles.push(
        <g key={`particle-${connection.id}-${i}`}>
          {/* 主粒子 */}
          <circle
            cx={x}
            cy={y}
            r={size}
            fill={particleColor}
            opacity={opacity}
            style={{
              filter: enhancedEffects ? 
                `drop-shadow(0 0 ${8 + size}px ${particleColor})` :
                `drop-shadow(0 0 6px ${particleColor})`,
            }}
          >
            {enhancedEffects && (
              <animate
                attributeName="r"
                values={`${size};${size + 2};${size}`}
                dur={`${1 + Math.random()}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
          
          {/* 量子效果 - 随机出现的小粒子 */}
          {enhancedEffects && Math.random() < 0.3 && (
            <circle
              cx={x + (Math.random() - 0.5) * 10}
              cy={y + (Math.random() - 0.5) * 10}
              r={1}
              fill={particleColor}
              opacity={0.4}
              style={{
                filter: `drop-shadow(0 0 4px ${particleColor})`,
              }}
            >
              <animate
                attributeName="opacity"
                values="0;0.8;0"
                dur="0.5s"
                repeatCount="1"
              />
            </circle>
          )}
          
          {/* 数据轨迹效果 */}
          {enhancedEffects && i === 0 && (
            <circle
              cx={x}
              cy={y}
              r={size * 3}
              fill="none"
              stroke={particleColor}
              strokeWidth={0.5}
              opacity={0.2}
            >
              <animate
                attributeName="r"
                values={`${size};${size * 6};${size}`}
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0;0.3"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          )}
        </g>
      );
    }
    
    return particles;
  };

  // 渲染连接线
  const renderConnection = (connection: DataFlowConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return null;

    const color = STATUS_COLORS[connection.status];
    const strokeWidth = connection.status === 'flowing' ? 3 : 2;
    
    return (
      <g key={connection.id}>
        {/* 连接线 */}
        <line
          x1={sourceNode.position.x}
          y1={sourceNode.position.y}
          x2={targetNode.position.x}
          y2={targetNode.position.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={connection.status === 'flowing' ? '5,5' : 'none'}
          style={{
            filter: connection.status === 'flowing' ? 
              `drop-shadow(0 0 8px ${color})` : 'none',
            cursor: 'pointer'
          }}
          onClick={() => onConnectionClick?.(connection)}
        >
          {connection.status === 'flowing' && (
            <animate
              attributeName="stroke-dashoffset"
              values="0;10"
              dur="0.5s"
              repeatCount="indefinite"
            />
          )}
        </line>
        
        {/* 箭头 */}
        <defs>
          <marker
            id={`arrow-${connection.id}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M0,0 L0,6 L9,3 z"
              fill={color}
              style={{
                filter: connection.status === 'flowing' ? 
                  `drop-shadow(0 0 4px ${color})` : 'none'
              }}
            />
          </marker>
        </defs>
        <line
          x1={sourceNode.position.x}
          y1={sourceNode.position.y}
          x2={targetNode.position.x}
          y2={targetNode.position.y}
          stroke="transparent"
          strokeWidth={strokeWidth}
          markerEnd={`url(#arrow-${connection.id})`}
        />
        
        {/* 数据流粒子 */}
        {renderFlowParticles(connection)}
        
        {/* 连接标签 */}
        <text
          x={(sourceNode.position.x + targetNode.position.x) / 2}
          y={(sourceNode.position.y + targetNode.position.y) / 2 - 10}
          fill={themeConfig.colors.text.secondary}
          fontSize="10"
          textAnchor="middle"
          style={{ fontFamily: '"Roboto Mono", monospace' }}
        >
          {connection.flowRate.toFixed(1)} MB/s
        </text>
      </g>
    );
  };

  // 渲染节点
  const renderNode = (node: DataFlowNode) => {
    const color = STATUS_COLORS[node.status];
    const radius = 30;
    
    return (
      <g key={node.id}>
        {/* 节点外圈 - 发光效果 */}
        <circle
          cx={node.position.x}
          cy={node.position.y}
          r={radius + 5}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.3}
          style={{
            filter: `drop-shadow(0 0 12px ${color})`,
          }}
        >
          {node.status === 'processing' && (
            <animate
              attributeName="r"
              values={`${radius + 5};${radius + 10};${radius + 5}`}
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
        
        {/* 节点主体 */}
        <circle
          cx={node.position.x}
          cy={node.position.y}
          r={hoveredNode === node.id ? radius + 3 : radius}
          fill={`rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, ${hoveredNode === node.id ? '0.95' : '0.8'})`}
          stroke={color}
          strokeWidth={hoveredNode === node.id ? 3 : 2}
          style={{
            cursor: 'pointer',
            filter: hoveredNode === node.id ? 
              `drop-shadow(0 0 16px ${color})` : 
              `drop-shadow(0 0 8px ${color})`,
            transition: 'all 0.3s ease'
          }}
          onClick={() => handleNodeClick(node)}
          onMouseEnter={() => handleNodeHover(node.id)}
          onMouseLeave={() => handleNodeHover(null)}
        />
        
        {/* 节点图标区域 */}
        <circle
          cx={node.position.x}
          cy={node.position.y}
          r={radius - 8}
          fill={color}
          opacity={0.2}
        />
        
        {/* 节点标签 */}
        <text
          x={node.position.x}
          y={node.position.y + radius + 20}
          fill={themeConfig.colors.text.primary}
          fontSize="12"
          textAnchor="middle"
          style={{ fontFamily: '"Orbitron", sans-serif' }}
        >
          {node.name}
        </text>
        
        {/* 节点状态指示器 */}
        <circle
          cx={node.position.x + radius - 5}
          cy={node.position.y - radius + 5}
          r={4}
          fill={color}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        >
          {node.status === 'processing' && (
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </g>
    );
  };

  // 计算整体指标
  const calculateMetrics = () => {
    const activeConnections = connections.filter(c => c.status === 'flowing');
    const totalFlowRate = activeConnections.reduce((sum, c) => sum + c.flowRate, 0);
    const avgLatency = activeConnections.length > 0 ? 
      activeConnections.reduce((sum, c) => sum + c.latency, 0) / activeConnections.length : 0;
    
    const activeNodes = nodes.filter(n => n.status === 'active' || n.status === 'processing');
    const totalDataSize = nodes.reduce((sum, n) => sum + (n.data?.size || 0), 0);
    
    return {
      totalFlowRate,
      avgLatency,
      activeNodes: activeNodes.length,
      totalNodes: nodes.length,
      totalDataSize,
      connectionHealth: connections.filter(c => c.status !== 'error').length / connections.length * 100
    };
  };

  const metrics = calculateMetrics();

  return (
    <Card
      title={
        <Space>
          <BulbOutlined style={{ color: themeConfig.colors.primary }} />
          <span style={{ color: themeConfig.colors.primary }}>数据流可视化</span>
        </Space>
      }
      className={`data-stream-viz ${className || ''}`}
      style={{
        background: `rgba(${parseInt(themeConfig.colors.background.secondary.slice(1, 3), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(3, 5), 16)}, ${parseInt(themeConfig.colors.background.secondary.slice(5, 7), 16)}, ${themeConfig.effects.glassOpacity})`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${themeConfig.colors.border.primary}`,
        borderRadius: themeConfig.effects.borderRadius,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 指标面板 */}
        {showMetrics && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
                总流量
              </Text>
              <div style={{ color: themeConfig.colors.primary, fontSize: '18px', fontWeight: 'bold' }}>
                {metrics.totalFlowRate.toFixed(1)} MB/s
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
                平均延迟
              </Text>
              <div style={{ color: themeConfig.colors.warning, fontSize: '18px', fontWeight: 'bold' }}>
                {metrics.avgLatency.toFixed(0)} ms
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
                连接健康度
              </Text>
              <div style={{ color: themeConfig.colors.success, fontSize: '18px', fontWeight: 'bold' }}>
                {metrics.connectionHealth.toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {/* SVG可视化区域 */}
        <div style={{ 
          width: '100%', 
          height: height,
          border: `1px solid ${themeConfig.colors.border.secondary}`,
          borderRadius: themeConfig.effects.borderRadius,
          background: `linear-gradient(135deg, ${themeConfig.colors.background.primary}, ${themeConfig.colors.background.tertiary})`,
          overflow: 'hidden'
        }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            style={{ 
              background: 'transparent',
              filter: 'contrast(1.1) brightness(1.05)'
            }}
          >
            {/* 背景网格 */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke={themeConfig.colors.border.secondary}
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* 渲染连接线 */}
            {connections.map(renderConnection)}
            
            {/* 渲染节点 */}
            {nodes.map(renderNode)}
          </svg>
        </div>

        {/* 节点状态列表 */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px',
          justifyContent: 'center'
        }}>
          {nodes.map(node => (
            <Tooltip
              key={node.id}
              title={
                <div>
                  <div>状态: {node.status}</div>
                  {node.data && (
                    <>
                      <div>数据量: {node.data.size.toFixed(1)} MB</div>
                      <div>条目数: {node.data.count.toLocaleString()}</div>
                      <div>质量: {(node.data.quality * 100).toFixed(0)}%</div>
                    </>
                  )}
                </div>
              }
            >
              <Tag
                icon={NODE_ICONS[node.type]}
                color={STATUS_COLORS[node.status]}
                style={{ 
                  cursor: 'pointer',
                  fontFamily: '"Roboto Mono", monospace',
                  fontSize: '11px'
                }}
                onClick={() => onNodeClick?.(node)}
              >
                {node.name}
              </Tag>
            </Tooltip>
          ))}
        </div>
      </Space>
    </Card>
  );
};

export default DataStreamViz;