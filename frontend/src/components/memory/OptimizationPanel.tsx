/**
 * 内存优化建议面板
 * DeepCAD Deep Excavation CAE Platform - Optimization Panel Component
 * 
 * 作者：2号几何专家
 * 功能：优化建议展示、一键优化、性能分析、进度跟踪
 */

import React, { useState, useCallback } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Badge, 
  Progress, 
  Space, 
  Tag, 
  Tooltip, 
  Modal, 
  Alert,
  Statistic,
  Divider,
  Typography,
  Steps,
  Empty
} from 'antd';
import { 
  Zap, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Target,
  Layers,
  Image,
  Box,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { 
  type OptimizationSuggestion, 
  type PerformanceAnalysis 
} from '../../utils/memoryOptimization';

const { Text, Title } = Typography;
const { Step } = Steps;

interface OptimizationPanelProps {
  performanceAnalysis: PerformanceAnalysis | null;
  suggestions: OptimizationSuggestion[];
  onExecuteOptimization: (suggestionId: string) => Promise<void>;
  onExecuteAllOptimizations: () => Promise<void>;
  isOptimizing?: boolean;
  className?: string;
}

// 优化进度状态
interface OptimizationProgress {
  current: number;
  total: number;
  currentTask: string;
  isRunning: boolean;
}

// 获取建议类型对应的图标
const getSuggestionIcon = (type: string, category: string) => {
  if (type === 'critical') return <AlertTriangle size={16} color="#ff4d4f" />;
  if (type === 'warning') return <AlertTriangle size={16} color="#faad14" />;
  
  switch (category) {
    case 'texture': return <Image size={16} color="#1890ff" />;
    case 'geometry': return <Box size={16} color="#52c41a" />;
    case 'material': return <Layers size={16} color="#722ed1" />;
    default: return <Info size={16} color="#666" />;
  }
};

// 获取建议类型对应的颜色
const getSuggestionColor = (type: string): string => {
  switch (type) {
    case 'critical': return '#ff4d4f';
    case 'warning': return '#faad14';
    case 'info': return '#1890ff';
    default: return '#666';
  }
};

// 获取影响程度标签
const getImpactTag = (impact: string) => {
  const colors = {
    high: 'red',
    medium: 'orange',
    low: 'green'
  };
  
  const labels = {
    high: '高影响',
    medium: '中等影响',
    low: '低影响'
  };
  
  return <Tag color={colors[impact as keyof typeof colors]}>{labels[impact as keyof typeof labels]}</Tag>;
};

// 获取难度标签
const getEffortTag = (effort: string) => {
  const colors = {
    easy: 'green',
    moderate: 'orange',
    complex: 'red'
  };
  
  const labels = {
    easy: '简单',
    moderate: '中等',
    complex: '复杂'
  };
  
  return <Tag color={colors[effort as keyof typeof colors]}>{labels[effort as keyof typeof labels]}</Tag>;
};

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  performanceAnalysis,
  suggestions,
  onExecuteOptimization,
  onExecuteAllOptimizations,
  isOptimizing = false,
  className
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<OptimizationSuggestion | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [optimizationProgress, setOptimizationProgress] = useState<OptimizationProgress>({
    current: 0,
    total: 0,
    currentTask: '',
    isRunning: false
  });

  // 执行单个优化建议
  const handleExecuteSuggestion = useCallback(async (suggestion: OptimizationSuggestion) => {
    if (!suggestion.action || executingIds.has(suggestion.id)) return;
    
    setExecutingIds(prev => new Set(prev).add(suggestion.id));
    
    try {
      await onExecuteOptimization(suggestion.id);
      console.log(`✅ 优化建议 "${suggestion.title}" 执行完成`);
    } catch (error) {
      console.error(`❌ 优化建议 "${suggestion.title}" 执行失败:`, error);
    } finally {
      setExecutingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.id);
        return newSet;
      });
    }
  }, [onExecuteOptimization, executingIds]);

  // 执行所有优化
  const handleExecuteAllOptimizations = useCallback(async () => {
    if (suggestions.length === 0 || isOptimizing) return;
    
    const executableSuggestions = suggestions.filter(s => s.action);
    
    setOptimizationProgress({
      current: 0,
      total: executableSuggestions.length,
      currentTask: '准备优化...',
      isRunning: true
    });
    
    try {
      await onExecuteAllOptimizations();
      
      setOptimizationProgress(prev => ({
        ...prev,
        current: prev.total,
        currentTask: '优化完成',
        isRunning: false
      }));
      
      console.log('🚀 所有优化建议执行完成');
    } catch (error) {
      console.error('❌ 批量优化执行失败:', error);
      setOptimizationProgress(prev => ({
        ...prev,
        isRunning: false,
        currentTask: '优化失败'
      }));
    }
  }, [suggestions, onExecuteAllOptimizations, isOptimizing]);

  // 显示建议详情
  const showSuggestionDetail = useCallback((suggestion: OptimizationSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowDetailModal(true);
  }, []);

  // 关闭详情模态框
  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedSuggestion(null);
  }, []);

  // 计算总预估节省
  const totalEstimatedSavings = suggestions.reduce((sum, s) => sum + s.estimatedSavings, 0);
  
  // 按类型分组建议
  const suggestionsByType = {
    critical: suggestions.filter(s => s.type === 'critical'),
    warning: suggestions.filter(s => s.type === 'warning'),
    info: suggestions.filter(s => s.type === 'info')
  };

  // 按难度分组建议
  const easyFixes = suggestions.filter(s => s.effort === 'easy');

  if (!performanceAnalysis) {
    return (
      <Card className={className} title="优化建议" loading>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          正在分析性能...
        </div>
      </Card>
    );
  }

  return (
    <div className={`optimization-panel ${className || ''}`}>
      {/* 性能概览卡片 */}
      <Card
        title={
          <Space>
            <TrendingUp size={20} />
            <span>性能分析</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: '16px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
          <Statistic
            title="整体评分"
            value={performanceAnalysis.overallScore}
            suffix="/100"
            valueStyle={{ 
              color: performanceAnalysis.overallScore >= 80 ? '#52c41a' : 
                     performanceAnalysis.overallScore >= 60 ? '#faad14' : '#ff4d4f'
            }}
          />
          <Statistic
            title="内存效率"
            value={performanceAnalysis.memoryEfficiency}
            suffix="%"
            valueStyle={{ color: '#1890ff' }}
          />
          <Statistic
            title="渲染性能"
            value={performanceAnalysis.renderingPerformance}
            suffix="%"
            valueStyle={{ color: '#52c41a' }}
          />
          <Statistic
            title="资源利用率"
            value={performanceAnalysis.resourceUtilization}
            suffix="%"
            valueStyle={{ color: '#722ed1' }}
          />
        </div>
        
        {/* 性能瓶颈 */}
        {performanceAnalysis.bottlenecks.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <Text strong>性能瓶颈：</Text>
            <div style={{ marginTop: '8px' }}>
              {performanceAnalysis.bottlenecks.map((bottleneck, index) => (
                <Tag key={index} color="red" style={{ marginBottom: '4px' }}>
                  {bottleneck}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 优化进度 */}
      {optimizationProgress.isRunning && (
        <Card size="small" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Play size={16} color="#1890ff" />
            <div style={{ flex: 1 }}>
              <Text>{optimizationProgress.currentTask}</Text>
              <Progress
                percent={(optimizationProgress.current / optimizationProgress.total) * 100}
                size="small"
                style={{ marginTop: '4px' }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* 建议概览 */}
      <Card
        title={
          <Space>
            <Target size={20} />
            <span>优化建议</span>
            <Badge count={suggestions.length} />
          </Space>
        }
        extra={
          <Space>
            {suggestions.length > 0 && (
              <Button
                type="primary"
                icon={<Zap size={16} />}
                onClick={handleExecuteAllOptimizations}
                loading={isOptimizing || optimizationProgress.isRunning}
                size="small"
              >
                一键优化
              </Button>
            )}
          </Space>
        }
        size="small"
        style={{ marginBottom: '16px' }}
      >
        {suggestions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无优化建议"
          />
        ) : (
          <>
            {/* 快速统计 */}
            <div style={{ marginBottom: '16px' }}>
              <Space wrap>
                <Statistic
                  title="总建议数"
                  value={suggestions.length}
                  prefix={<Settings size={16} />}
                  valueStyle={{ fontSize: '16px' }}
                />
                <Statistic
                  title="预估节省"
                  value={formatBytes(totalEstimatedSavings)}
                  prefix={<TrendingUp size={16} />}
                  valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                />
                <Statistic
                  title="简单修复"
                  value={easyFixes.length}
                  prefix={<CheckCircle size={16} />}
                  valueStyle={{ fontSize: '16px', color: '#1890ff' }}
                />
              </Space>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* 建议列表 */}
            <List
              itemLayout="vertical"
              size="small"
              dataSource={suggestions}
              renderItem={(suggestion) => (
                <List.Item
                  key={suggestion.id}
                  actions={[
                    <Button
                      key="execute"
                      type="link"
                      size="small"
                      loading={executingIds.has(suggestion.id)}
                      onClick={() => handleExecuteSuggestion(suggestion)}
                      disabled={!suggestion.action}
                    >
                      {suggestion.action ? '执行' : '无法执行'}
                    </Button>,
                    <Button
                      key="detail"
                      type="link"
                      size="small"
                      onClick={() => showSuggestionDetail(suggestion)}
                    >
                      详情
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getSuggestionIcon(suggestion.type, suggestion.category)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{suggestion.title}</span>
                        <Badge
                          color={getSuggestionColor(suggestion.type)}
                          text={suggestion.type.toUpperCase()}
                        />
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary">{suggestion.description}</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Space>
                            {getImpactTag(suggestion.impact)}
                            {getEffortTag(suggestion.effort)}
                            <Tag color="blue">
                              节省: {formatBytes(suggestion.estimatedSavings)}
                            </Tag>
                          </Space>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Card>

      {/* 建议详情模态框 */}
      <Modal
        title={
          <Space>
            {selectedSuggestion && getSuggestionIcon(selectedSuggestion.type, selectedSuggestion.category)}
            <span>优化建议详情</span>
          </Space>
        }
        open={showDetailModal}
        onCancel={closeDetailModal}
        footer={[
          <Button key="cancel" onClick={closeDetailModal}>
            关闭
          </Button>,
          selectedSuggestion?.action && (
            <Button
              key="execute"
              type="primary"
              loading={selectedSuggestion ? executingIds.has(selectedSuggestion.id) : false}
              onClick={() => selectedSuggestion && handleExecuteSuggestion(selectedSuggestion)}
            >
              执行优化
            </Button>
          )
        ].filter(Boolean)}
      >
        {selectedSuggestion && (
          <div>
            <Title level={4}>{selectedSuggestion.title}</Title>
            
            <Alert
              message={selectedSuggestion.description}
              type={selectedSuggestion.type === 'critical' ? 'error' : 
                    selectedSuggestion.type === 'warning' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <Statistic
                title="影响程度"
                value={selectedSuggestion.impact}
                prefix={<Target size={16} />}
              />
              <Statistic
                title="实施难度"
                value={selectedSuggestion.effort}
                prefix={<Clock size={16} />}
              />
              <Statistic
                title="预估节省"
                value={formatBytes(selectedSuggestion.estimatedSavings)}
                prefix={<TrendingUp size={16} />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Statistic
                title="分类"
                value={selectedSuggestion.category}
                prefix={<Layers size={16} />}
              />
            </div>

            {selectedSuggestion.action && (
              <Alert
                message="此建议可以自动执行"
                description="点击执行按钮将自动应用此优化建议。请确保在执行前保存当前工作。"
                type="info"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};