/**
 * 网格质量分析组件
 * 3号计算专家专门为2号几何专家定制
 * 提供实时网格质量评估和优化建议
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Space, Typography, Button, Progress, Table, Tag, Row, Col, Statistic, Alert, Tabs, Select, Switch } from 'antd';
import { 
  CalculatorOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  TrophyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  BugOutlined
} from '@ant-design/icons';
import { ComponentDevHelper } from '../../utils/developmentTools';
import { ModuleErrorBoundary } from '../../core/ErrorBoundary';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

// 网格质量数据接口 - 与2号几何专家对接
export interface MeshQualityData {
  elementId: number;
  nodeIds: number[];
  elementType: 'tetrahedron' | 'hexahedron' | 'prism' | 'pyramid';
  coordinates: number[][];
  qualityMetrics: {
    aspectRatio: number;        // 长宽比
    skewness: number;          // 倾斜度
    jacobian: number;          // 雅可比行列式
    volume: number;            // 体积
    edgeRatio: number;         // 边长比
    warpingFactor: number;     // 翘曲因子
    orthogonality: number;     // 正交性
  };
  layerId?: string;
  materialId?: string;
}

// 质量统计结果
export interface QualityStatistics {
  totalElements: number;
  qualityDistribution: {
    excellent: number;    // > 0.8
    good: number;        // 0.6 - 0.8
    acceptable: number;  // 0.4 - 0.6
    poor: number;        // 0.2 - 0.4
    critical: number;    // < 0.2
  };
  averageQuality: number;
  minQuality: number;
  maxQuality: number;
  problematicElements: MeshQualityData[];
  recommendations: QualityRecommendation[];
}

export interface QualityRecommendation {
  id: string;
  type: 'refinement' | 'smoothing' | 'reconstruction' | 'parameter_adjustment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  elementIds: number[];
  description: string;
  technicalDetails: string;
  estimatedImprovement: number;
}

interface MeshQualityAnalysisProps {
  meshData?: MeshQualityData[];
  onQualityUpdate?: (stats: QualityStatistics) => void;
  onOptimizationRequest?: (recommendations: QualityRecommendation[]) => void;
  realTimeMode?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const MeshQualityAnalysis: React.FC<MeshQualityAnalysisProps> = ({
  meshData = [],
  onQualityUpdate,
  onOptimizationRequest,
  realTimeMode = true,
  autoRefresh = true,
  refreshInterval = 3000
}) => {
  const [qualityStats, setQualityStats] = useState<QualityStatistics | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedQualityRange, setSelectedQualityRange] = useState<'all' | 'poor' | 'critical'>('all');
  const [analysisMode, setAnalysisMode] = useState<'basic' | 'advanced' | 'expert'>('advanced');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 生成模拟测试数据 - 给2号几何专家用的
  const generateMockMeshData = useCallback((): MeshQualityData[] => {
    const elements: MeshQualityData[] = [];
    
    // 模拟不同质量等级的单元
    for (let i = 1; i <= 1000; i++) {
      // 随机生成不同质量的单元
      const qualityLevel = Math.random();
      let aspectRatio, skewness, jacobian, volume;
      
      if (qualityLevel > 0.8) {
        // 高质量单元
        aspectRatio = 1.2 + Math.random() * 0.8;
        skewness = Math.random() * 0.1;
        jacobian = 0.9 + Math.random() * 0.1;
        volume = 0.8 + Math.random() * 0.4;
      } else if (qualityLevel > 0.6) {
        // 中等质量单元
        aspectRatio = 2.0 + Math.random() * 1.5;
        skewness = 0.1 + Math.random() * 0.2;
        jacobian = 0.7 + Math.random() * 0.2;
        volume = 0.5 + Math.random() * 0.5;
      } else if (qualityLevel > 0.4) {
        // 可接受质量单元
        aspectRatio = 3.5 + Math.random() * 2.0;
        skewness = 0.3 + Math.random() * 0.3;
        jacobian = 0.5 + Math.random() * 0.2;
        volume = 0.3 + Math.random() * 0.4;
      } else {
        // 低质量单元
        aspectRatio = 6.0 + Math.random() * 4.0;
        skewness = 0.6 + Math.random() * 0.4;
        jacobian = 0.2 + Math.random() * 0.3;
        volume = 0.1 + Math.random() * 0.3;
      }
      
      elements.push({
        elementId: i,
        nodeIds: [i*4, i*4+1, i*4+2, i*4+3],
        elementType: 'tetrahedron',
        coordinates: [
          [Math.random() * 100, Math.random() * 100, Math.random() * 50],
          [Math.random() * 100, Math.random() * 100, Math.random() * 50],
          [Math.random() * 100, Math.random() * 100, Math.random() * 50],
          [Math.random() * 100, Math.random() * 100, Math.random() * 50]
        ],
        qualityMetrics: {
          aspectRatio,
          skewness,
          jacobian,
          volume,
          edgeRatio: aspectRatio * 0.8,
          warpingFactor: skewness * 1.2,
          orthogonality: Math.max(0, 1 - skewness * 2)
        },
        layerId: `layer_${Math.floor(i / 200) + 1}`,
        materialId: `material_${Math.floor(Math.random() * 3) + 1}`
      });
    }
    
    return elements;
  }, []);

  // 使用提供的数据或生成模拟数据
  const currentMeshData = useMemo(() => {
    return meshData.length > 0 ? meshData : generateMockMeshData();
  }, [meshData, generateMockMeshData]);

  // 计算综合质量分数
  const calculateOverallQuality = useCallback((metrics: MeshQualityData['qualityMetrics']): number => {
    const { aspectRatio, skewness, jacobian, volume, orthogonality } = metrics;
    
    // 各项指标权重
    const weights = {
      aspectRatio: 0.25,
      skewness: 0.25,
      jacobian: 0.3,
      volume: 0.1,
      orthogonality: 0.1
    };
    
    // 将指标转换为0-1分数
    const aspectScore = Math.max(0, 1 - (aspectRatio - 1) / 10); // 理想值为1
    const skewnessScore = Math.max(0, 1 - skewness); // 理想值为0
    const jacobianScore = jacobian; // 理想值为1
    const volumeScore = Math.min(1, volume); // 理想值为1
    const orthogonalityScore = orthogonality; // 理想值为1
    
    return weights.aspectRatio * aspectScore +
           weights.skewness * skewnessScore +
           weights.jacobian * jacobianScore +
           weights.volume * volumeScore +
           weights.orthogonality * orthogonalityScore;
  }, []);

  // 分析网格质量
  const analyzeMeshQuality = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    ComponentDevHelper.logDevTip(`3号开始分析${currentMeshData.length}个单元的网格质量`);
    
    const stats: QualityStatistics = {
      totalElements: currentMeshData.length,
      qualityDistribution: {
        excellent: 0,
        good: 0,
        acceptable: 0,
        poor: 0,
        critical: 0
      },
      averageQuality: 0,
      minQuality: 1,
      maxQuality: 0,
      problematicElements: [],
      recommendations: []
    };
    
    let totalQuality = 0;
    
    // 分析每个单元
    for (let i = 0; i < currentMeshData.length; i++) {
      const element = currentMeshData[i];
      const quality = calculateOverallQuality(element.qualityMetrics);
      
      totalQuality += quality;
      stats.minQuality = Math.min(stats.minQuality, quality);
      stats.maxQuality = Math.max(stats.maxQuality, quality);
      
      // 质量分级
      if (quality > 0.8) {
        stats.qualityDistribution.excellent++;
      } else if (quality > 0.6) {
        stats.qualityDistribution.good++;
      } else if (quality > 0.4) {
        stats.qualityDistribution.acceptable++;
      } else if (quality > 0.2) {
        stats.qualityDistribution.poor++;
        stats.problematicElements.push(element);
      } else {
        stats.qualityDistribution.critical++;
        stats.problematicElements.push(element);
      }
      
      // 更新进度
      setAnalysisProgress(Math.floor((i / currentMeshData.length) * 80));
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    stats.averageQuality = totalQuality / currentMeshData.length;
    
    // 生成优化建议
    setAnalysisProgress(90);
    stats.recommendations = generateRecommendations(stats);
    
    setAnalysisProgress(100);
    setQualityStats(stats);
    setIsAnalyzing(false);
    
    onQualityUpdate?.(stats);
    
    ComponentDevHelper.logDevTip(`3号质量分析完成: 平均质量${(stats.averageQuality * 100).toFixed(1)}%, ${stats.problematicElements.length}个问题单元`);
  }, [currentMeshData, calculateOverallQuality, onQualityUpdate]);

  // 生成优化建议
  const generateRecommendations = useCallback((stats: QualityStatistics): QualityRecommendation[] => {
    const recommendations: QualityRecommendation[] = [];
    
    // 基于问题单元生成建议
    if (stats.qualityDistribution.critical > 0) {
      recommendations.push({
        id: 'critical_reconstruction',
        type: 'reconstruction',
        priority: 'critical',
        elementIds: stats.problematicElements
          .filter(e => calculateOverallQuality(e.qualityMetrics) < 0.2)
          .map(e => e.elementId),
        description: '严重质量问题单元需要重新生成',
        technicalDetails: '这些单元的雅可比行列式过小或长宽比过大，建议完全重新网格化',
        estimatedImprovement: 0.3
      });
    }
    
    if (stats.qualityDistribution.poor > 0) {
      recommendations.push({
        id: 'poor_smoothing',
        type: 'smoothing',
        priority: 'high',
        elementIds: stats.problematicElements
          .filter(e => {
            const q = calculateOverallQuality(e.qualityMetrics);
            return q >= 0.2 && q < 0.4;
          })
          .map(e => e.elementId),
        description: '低质量单元需要平滑优化',
        technicalDetails: '应用拉普拉斯平滑算法改善单元形状',
        estimatedImprovement: 0.15
      });
    }
    
    if (stats.averageQuality < 0.7) {
      recommendations.push({
        id: 'global_refinement',
        type: 'refinement',
        priority: 'medium',
        elementIds: [],
        description: '整体网格质量偏低，建议细化网格',
        technicalDetails: '在质量较差的区域增加网格密度',
        estimatedImprovement: 0.2
      });
    }
    
    return recommendations;
  }, [calculateOverallQuality]);

  // 问题单元表格列定义
  const problematicElementColumns = [
    {
      title: '单元ID',
      dataIndex: 'elementId',
      key: 'elementId',
      render: (id: number) => <Tag color="red">#{id}</Tag>
    },
    {
      title: '类型',
      dataIndex: 'elementType',
      key: 'elementType',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '综合质量',
      key: 'overallQuality',
      render: (_, record: MeshQualityData) => {
        const quality = calculateOverallQuality(record.qualityMetrics);
        return (
          <span style={{ 
            color: quality < 0.2 ? '#ff4d4f' : quality < 0.4 ? '#fa8c16' : '#faad14' 
          }}>
            {(quality * 100).toFixed(1)}%
          </span>
        );
      }
    },
    {
      title: '长宽比',
      dataIndex: ['qualityMetrics', 'aspectRatio'],
      key: 'aspectRatio',
      render: (ratio: number) => ratio.toFixed(2)
    },
    {
      title: '倾斜度',
      dataIndex: ['qualityMetrics', 'skewness'],
      key: 'skewness',
      render: (skew: number) => skew.toFixed(3)
    },
    {
      title: '雅可比',
      dataIndex: ['qualityMetrics', 'jacobian'],
      key: 'jacobian',
      render: (jac: number) => (
        <span style={{ color: jac > 0.5 ? '#52c41a' : '#ff4d4f' }}>
          {jac.toFixed(3)}
        </span>
      )
    }
  ];

  // 优化建议表格列定义
  const recommendationColumns = [
    {
      title: '建议类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={
          type === 'reconstruction' ? 'red' :
          type === 'smoothing' ? 'orange' :
          type === 'refinement' ? 'blue' : 'green'
        }>
          {type === 'reconstruction' ? '重构' :
           type === 'smoothing' ? '平滑' :
           type === 'refinement' ? '细化' : '参数调整'}
        </Tag>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={
          priority === 'critical' ? 'red' :
          priority === 'high' ? 'orange' :
          priority === 'medium' ? 'yellow' : 'green'
        }>
          {priority === 'critical' ? '严重' :
           priority === 'high' ? '高' :
           priority === 'medium' ? '中' : '低'}
        </Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '预期改善',
      dataIndex: 'estimatedImprovement',
      key: 'estimatedImprovement',
      render: (improvement: number) => `+${(improvement * 100).toFixed(1)}%`
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: QualityRecommendation) => (
        <Button 
          size="small" 
          type="primary"
          onClick={() => {
            ComponentDevHelper.logDevTip(`应用优化建议: ${record.description}`);
            onOptimizationRequest?.([record]);
          }}
        >
          应用
        </Button>
      )
    }
  ];

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && realTimeMode) {
      const interval = setInterval(() => {
        if (!isAnalyzing) {
          analyzeMeshQuality();
        }
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, realTimeMode, refreshInterval, isAnalyzing, analyzeMeshQuality]);

  // 初始分析
  useEffect(() => {
    analyzeMeshQuality();
  }, [currentMeshData.length]); // 只在数据变化时重新分析

  useEffect(() => {
    ComponentDevHelper.logDevTip('3号网格质量分析系统已启动 - 为2号几何专家提供专业质量评估');
  }, []);

  return (
    <ModuleErrorBoundary moduleName="网格质量分析">
      <div style={{ padding: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          
          {/* 标题和控制 */}
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ color: 'var(--deepcad-primary)', margin: 0 }}>
                <CalculatorOutlined /> 3号网格质量分析系统
              </Title>
              <Text style={{ color: 'var(--deepcad-text-secondary)' }}>
                为2号几何专家提供专业网格质量评估
              </Text>
            </Col>
            <Col>
              <Space>
                <Switch
                  checked={realTimeMode}
                  checkedChildren="实时"
                  unCheckedChildren="手动"
                  onChange={(checked) => {
                    ComponentDevHelper.logDevTip(`切换到${checked ? '实时' : '手动'}模式`);
                  }}
                />
                <Select
                  value={analysisMode}
                  onChange={setAnalysisMode}
                  style={{ width: 100 }}
                  size="small"
                >
                  <Select.Option value="basic">基础</Select.Option>
                  <Select.Option value="advanced">高级</Select.Option>
                  <Select.Option value="expert">专家</Select.Option>
                </Select>
                <Button
                  icon={<SyncOutlined />}
                  onClick={analyzeMeshQuality}
                  loading={isAnalyzing}
                  type="primary"
                >
                  重新分析
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 分析进度 */}
          {isAnalyzing && (
            <Card size="small">
              <Progress 
                percent={analysisProgress} 
                status="active"
                format={(percent) => `分析进度: ${percent}%`}
              />
            </Card>
          )}

          {/* 质量统计概览 */}
          {qualityStats && (
            <Card 
              title="质量统计概览"
              size="small"
              style={{
                background: 'var(--deepcad-bg-secondary)',
                border: '1px solid var(--deepcad-border-primary)'
              }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总单元数"
                    value={qualityStats.totalElements}
                    formatter={(value) => Number(value).toLocaleString()}
                    prefix={<ExperimentOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均质量"
                    value={qualityStats.averageQuality}
                    precision={3}
                    suffix="%"
                    formatter={(value) => (Number(value) * 100).toFixed(1)}
                    valueStyle={{ 
                      color: qualityStats.averageQuality > 0.7 ? '#52c41a' : 
                             qualityStats.averageQuality > 0.5 ? '#faad14' : '#ff4d4f' 
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="问题单元"
                    value={qualityStats.problematicElements.length}
                    valueStyle={{ color: qualityStats.problematicElements.length > 0 ? '#ff4d4f' : '#52c41a' }}
                    prefix={qualityStats.problematicElements.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="优化建议"
                    value={qualityStats.recommendations.length}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<ThunderboltOutlined />}
                  />
                </Col>
              </Row>
              
              {/* 质量分布 */}
              <div style={{ marginTop: '16px' }}>
                <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                  质量分布
                </Text>
                <Row gutter={8}>
                  <Col span={4}>
                    <Tag color="green">优秀: {qualityStats.qualityDistribution.excellent}</Tag>
                  </Col>
                  <Col span={4}>
                    <Tag color="blue">良好: {qualityStats.qualityDistribution.good}</Tag>
                  </Col>
                  <Col span={4}>
                    <Tag color="yellow">可接受: {qualityStats.qualityDistribution.acceptable}</Tag>
                  </Col>
                  <Col span={4}>
                    <Tag color="orange">较差: {qualityStats.qualityDistribution.poor}</Tag>
                  </Col>
                  <Col span={4}>
                    <Tag color="red">严重: {qualityStats.qualityDistribution.critical}</Tag>
                  </Col>
                </Row>
              </div>
            </Card>
          )}

          {/* 详细分析 */}
          {qualityStats && (
            <Tabs defaultActiveKey="problems">
              
              <TabPane tab={`问题单元 (${qualityStats.problematicElements.length})`} key="problems">
                <Table
                  columns={problematicElementColumns}
                  dataSource={qualityStats.problematicElements}
                  rowKey="elementId"
                  pagination={{ pageSize: 10 }}
                  scroll={{ y: 300 }}
                  size="small"
                />
              </TabPane>

              <TabPane tab={`优化建议 (${qualityStats.recommendations.length})`} key="recommendations">
                <Table
                  columns={recommendationColumns}
                  dataSource={qualityStats.recommendations}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
                
                {qualityStats.recommendations.length > 0 && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      size="large"
                      onClick={() => {
                        ComponentDevHelper.logDevTip('应用所有优化建议');
                        onOptimizationRequest?.(qualityStats.recommendations);
                      }}
                    >
                      应用所有优化建议
                    </Button>
                  </div>
                )}
              </TabPane>

            </Tabs>
          )}

          {/* 技术状态面板 */}
          <Card 
            size="small"
            title="🔧 3号网格质量分析系统状态"
            style={{
              background: 'var(--deepcad-bg-secondary)',
              border: '1px solid var(--deepcad-border-primary)'
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    ✅ 多指标综合质量评估
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    ✅ 实时问题单元检测
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    ✅ 智能优化建议生成
                  </Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    🎯 与2号几何专家无缝对接
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    📊 专业工程质量标准
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    🔄 自动化质量监控系统
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>

        </Space>
      </div>
    </ModuleErrorBoundary>
  );
};

export default MeshQualityAnalysis;