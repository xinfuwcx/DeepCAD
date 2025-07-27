import React, { useState, useEffect } from 'react';
import { Card, Tabs, Statistic, Progress, Table, Alert, Badge } from 'antd';
import { 
  SafetyOutlined, 
  ExperimentOutlined, 
  BarChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

// 计算结果数据接口
interface ComputationResults {
  excavationResults?: {
    analysisId: string;
    timestamp: Date;
    computationTime: number;
    results: {
      overallStability: {
        safetyFactor: number;
        stabilityStatus: 'safe' | 'warning' | 'critical';
        criticalFailureMode: string;
      };
      deformation: {
        maxHorizontalDisplacement: number;
        maxVerticalDisplacement: number;
        maxWallDeformation: number;
        groundSettlement: number[];
      };
      stress: {
        maxPrincipalStress: number;
        minPrincipalStress: number;
        maxShearStress: number;
        vonMisesStress: number[];
      };
      supportForces: {
        maxStrutForce: number;
        strutForceDistribution: number[];
        anchorForces: number[];
      };
      seepage: {
        maxSeepageVelocity: number;
        totalInflow: number;
        pipingRiskAreas: Array<{
          id: string;
          location: { x: number; y: number; z: number };
          riskLevel: number;
          description: string;
        }>;
        upliftPressure: number[];
      };
    };
  };
  safetyResults?: {
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    overallSafetyScore: number;
    riskAssessment: {
      overallStability: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        safetyMargin: number;
        criticalFactors: string[];
      };
      localInstability: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        riskAreas: Array<{
          id: string;
          location: { x: number; y: number; z: number };
          riskLevel: number;
          description: string;
        }>;
        preventiveMeasures: string[];
      };
      seepageFailure: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        pipingRisk: number;
        upliftRisk: number;
        drainageEfficiency: number;
      };
      excessiveDeformation: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        maxDeformationRatio: number;
        affectedStructures: string[];
      };
    };
    monitoringRecommendations: {
      monitoringPoints: Array<{
        id: string;
        type: 'displacement' | 'stress' | 'pore_pressure' | 'groundwater';
        location: { x: number; y: number; z: number };
        frequency: 'hourly' | 'daily' | 'weekly';
      }>;
      monitoringFrequency: string;
      alertThresholds: Array<{
        parameter: string;
        yellowAlert: number;
        redAlert: number;
        unit: string;
      }>;
    };
    emergencyResponse: {
      triggerConditions: string[];
      responseProcedures: string[];
      contactPersons: string[];
    };
  };
  stageResults?: Array<{
    stageId: number;
    stageName: string;
    stageDescription: string;
    constructionDays: number;
    incrementalDeformation: {
      horizontalDisplacement: Float32Array;
      verticalDisplacement: Float32Array;
      wallDeformation: Float32Array;
    };
    stressState: {
      totalStress: Float32Array;
      effectiveStress: Float32Array;
      poreWaterPressure: Float32Array;
    };
    stageStability: {
      safetyFactor: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      criticalElements: number[];
    };
  }>;
}

interface ResultsViewerProps {
  results?: ComputationResults;
  onExport?: (format: 'excel' | 'pdf' | 'json') => void;
  showDetailedAnalysis?: boolean;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({
  results,
  onExport,
  showDetailedAnalysis = true
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'safe':
      case 'low':
        return '#52c41a';
      case 'warning':
      case 'medium':
        return '#faad14';
      case 'critical':
      case 'high':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe':
      case 'low':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
      case 'medium':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'critical':
      case 'high':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExperimentOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  // 导出功能
  const handleExport = async (format: 'excel' | 'pdf' | 'json') => {
    if (!results) return;
    
    setLoading(true);
    try {
      await onExport?.(format);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成总览统计数据
  const generateOverviewStats = () => {
    if (!results?.excavationResults) return [];

    const { results: analysisResults } = results.excavationResults;
    
    return [
      {
        title: '整体安全系数',
        value: analysisResults.overallStability.safetyFactor,
        precision: 2,
        status: analysisResults.overallStability.stabilityStatus,
        suffix: '',
        description: '工程安全评价的关键指标'
      },
      {
        title: '最大水平位移',
        value: analysisResults.deformation.maxHorizontalDisplacement,
        precision: 1,
        status: analysisResults.deformation.maxHorizontalDisplacement > 30 ? 'warning' : 'safe',
        suffix: 'mm',
        description: '围护结构变形控制'
      },
      {
        title: '最大主应力',
        value: analysisResults.stress.maxPrincipalStress / 1000,
        precision: 1,
        status: 'safe',
        suffix: 'MPa',
        description: '土体应力状态'
      },
      {
        title: '最大支撑力',
        value: analysisResults.supportForces.maxStrutForce / 1000,
        precision: 0,
        status: 'safe',
        suffix: 'MN',
        description: '支撑系统荷载'
      }
    ];
  };

  // 生成详细数据表格
  const generateDetailedTable = () => {
    if (!results?.excavationResults) return [];

    const { results: analysisResults } = results.excavationResults;
    
    return [
      {
        key: '1',
        category: '整体稳定性',
        parameter: '安全系数',
        value: analysisResults.overallStability.safetyFactor.toFixed(2),
        unit: '-',
        status: analysisResults.overallStability.stabilityStatus,
        standard: '≥1.35',
        evaluation: analysisResults.overallStability.safetyFactor >= 1.35 ? '满足' : '不满足'
      },
      {
        key: '2',
        category: '变形控制',
        parameter: '最大水平位移',
        value: analysisResults.deformation.maxHorizontalDisplacement.toFixed(1),
        unit: 'mm',
        status: analysisResults.deformation.maxHorizontalDisplacement <= 30 ? 'safe' : 'warning',
        standard: '≤30mm',
        evaluation: analysisResults.deformation.maxHorizontalDisplacement <= 30 ? '满足' : '超限'
      },
      {
        key: '3',
        category: '变形控制',
        parameter: '最大竖向位移',
        value: analysisResults.deformation.maxVerticalDisplacement.toFixed(1),
        unit: 'mm',
        status: analysisResults.deformation.maxVerticalDisplacement <= 20 ? 'safe' : 'warning',
        standard: '≤20mm',
        evaluation: analysisResults.deformation.maxVerticalDisplacement <= 20 ? '满足' : '超限'
      },
      {
        key: '4',
        category: '应力状态',
        parameter: '最大主应力',
        value: (analysisResults.stress.maxPrincipalStress / 1000).toFixed(1),
        unit: 'MPa',
        status: 'safe',
        standard: '材料强度内',
        evaluation: '满足'
      },
      {
        key: '5',
        category: '支撑系统',
        parameter: '最大支撑力',
        value: (analysisResults.supportForces.maxStrutForce / 1000).toFixed(0),
        unit: 'MN',
        status: 'safe',
        standard: '设计承载力内',
        evaluation: '满足'
      },
      {
        key: '6',
        category: '渗流控制',
        parameter: '最大渗流速度',
        value: (analysisResults.seepage.maxSeepageVelocity * 1000).toFixed(3),
        unit: 'mm/s',
        status: analysisResults.seepage.maxSeepageVelocity < 1e-5 ? 'safe' : 'warning',
        standard: '<0.01mm/s',
        evaluation: analysisResults.seepage.maxSeepageVelocity < 1e-5 ? '满足' : '注意'
      }
    ];
  };

  // 生成施工阶段表格
  const generateStageTable = () => {
    if (!results?.stageResults) return [];

    return results.stageResults.map((stage, index) => ({
      key: index,
      stageId: stage.stageId,
      stageName: stage.stageName,
      constructionDays: stage.constructionDays,
      safetyFactor: stage.stageStability.safetyFactor.toFixed(2),
      riskLevel: stage.stageStability.riskLevel,
      maxDisplacement: Math.max(...Array.from(stage.incrementalDeformation.horizontalDisplacement)).toFixed(1),
      criticalElements: stage.stageStability.criticalElements.length,
      status: stage.stageStability.riskLevel
    }));
  };

  const detailedTableColumns = [
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '参数',
      dataIndex: 'parameter',
      key: 'parameter',
      width: 150,
    },
    {
      title: '计算值',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '单位',
      dataIndex: 'unit', 
      key: 'unit',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '标准值',
      dataIndex: 'standard',
      key: 'standard',
      width: 120,
      align: 'center' as const,
    },
    {
      title: '评价',
      dataIndex: 'evaluation',
      key: 'evaluation',
      width: 100,
      align: 'center' as const,
      render: (evaluation: string, record: any) => (
        <Badge 
          status={record.status === 'safe' ? 'success' : record.status === 'warning' ? 'warning' : 'error'}
          text={evaluation}
        />
      ),
    },
  ];

  const stageTableColumns = [
    {
      title: '阶段',
      dataIndex: 'stageName',
      key: 'stageName',
      width: 120,
    },
    {
      title: '工期(天)',
      dataIndex: 'constructionDays',
      key: 'constructionDays',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '安全系数',
      dataIndex: 'safetyFactor',
      key: 'safetyFactor',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '最大位移(mm)',
      dataIndex: 'maxDisplacement',
      key: 'maxDisplacement',
      width: 120,
      align: 'right' as const,
    },
    {
      title: '关键单元数',
      dataIndex: 'criticalElements',
      key: 'criticalElements',
      width: 100,
      align: 'center' as const,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      align: 'center' as const,
      render: (riskLevel: string) => (
        <Badge 
          status={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'error'}
          text={riskLevel.toUpperCase()}
        />
      ),
    },
  ];

  // 无数据时的显示
  if (!results) {
    return (
      <div className="results-viewer-empty" style={{ 
        padding: '40px', 
        textAlign: 'center',
        background: '#fafafa',
        borderRadius: '8px'
      }}>
        <ExperimentOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
        <h3 style={{ color: '#666' }}>暂无计算结果</h3>
        <p style={{ color: '#999' }}>请先运行计算分析以查看结果</p>
      </div>
    );
  }

  const overviewStats = generateOverviewStats();
  const detailedData = generateDetailedTable();
  const stageData = generateStageTable();

  return (
    <div className="results-viewer" style={{ padding: '20px', background: '#f5f5f5', minHeight: '100%' }}>
      {/* 页面标题和操作按钮 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h2 style={{ margin: 0, color: '#262626' }}>
          <BarChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          深基坑计算分析结果
        </h2>
        <div>
          <button 
            onClick={() => handleExport('excel')}
            disabled={loading}
            style={{
              marginRight: '8px',
              padding: '6px 16px',
              background: '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            📊 导出Excel
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            disabled={loading}
            style={{
              marginRight: '8px',
              padding: '6px 16px',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            📄 导出报告
          </button>
          <button 
            onClick={() => handleExport('json')}
            disabled={loading}
            style={{
              padding: '6px 16px',
              background: '#722ed1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            💾 导出数据
          </button>
        </div>
      </div>

      {/* 安全评估警告 */}
      {results.safetyResults?.overallRiskLevel === 'high' || results.safetyResults?.overallRiskLevel === 'critical' ? (
        <Alert
          message="安全风险警告"
          description={`当前工程安全风险等级为${results.safetyResults.overallRiskLevel === 'critical' ? '严重' : '较高'}，请立即采取相应措施！`}
          type="error"
          showIcon
          style={{ marginBottom: '20px' }}
        />
      ) : null}

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <BarChartOutlined />
                结果总览
              </span>
            ),
            children: (
              <div>
                {/* 关键指标卡片 */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  {overviewStats.map((stat, index) => (
                    <Card key={index} style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: '8px' }}>
                        {getStatusIcon(stat.status)}
                      </div>
                      <Statistic
                        title={stat.title}
                        value={stat.value}
                        precision={stat.precision}
                        suffix={stat.suffix}
                        valueStyle={{ 
                          color: getStatusColor(stat.status),
                          fontSize: '24px',
                          fontWeight: 'bold'
                        }}
                      />
                      <div style={{ 
                        color: '#8c8c8c', 
                        fontSize: '12px', 
                        marginTop: '8px' 
                      }}>
                        {stat.description}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* 安全评估雷达图区域 */}
                {results.safetyResults && (
                  <Card title="综合安全评估" style={{ marginBottom: '24px' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', marginBottom: '8px' }}>整体稳定</div>
                        <Progress
                          type="circle"
                          percent={results.safetyResults.riskAssessment.overallStability.safetyMargin * 100}
                          strokeColor={getStatusColor(results.safetyResults.riskAssessment.overallStability.riskLevel)}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', marginBottom: '8px' }}>局部失稳</div>
                        <Progress
                          type="circle"
                          percent={75}
                          strokeColor={getStatusColor(results.safetyResults.riskAssessment.localInstability.riskLevel)}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', marginBottom: '8px' }}>渗流破坏</div>
                        <Progress
                          type="circle"
                          percent={results.safetyResults.riskAssessment.seepageFailure.drainageEfficiency * 100}
                          strokeColor={getStatusColor(results.safetyResults.riskAssessment.seepageFailure.riskLevel)}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', marginBottom: '8px' }}>变形超限</div>
                        <Progress
                          type="circle"
                          percent={Math.max(0, 100 - results.safetyResults.riskAssessment.excessiveDeformation.maxDeformationRatio * 100)}
                          strokeColor={getStatusColor(results.safetyResults.riskAssessment.excessiveDeformation.riskLevel)}
                        />
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'detailed',
            label: (
              <span>
                <SafetyOutlined />
                详细分析
              </span>
            ),
            children: (
              <Card title="详细计算结果">
                <Table
                  columns={detailedTableColumns}
                  dataSource={detailedData}
                  pagination={false}
                  size="middle"
                  bordered
                />
              </Card>
            ),
          },
          {
            key: 'stages',
            label: (
              <span>
                <ExperimentOutlined />
                施工阶段
              </span>
            ),
            children: (
              <Card title="施工阶段分析结果">
                {stageData.length > 0 ? (
                  <Table
                    columns={stageTableColumns}
                    dataSource={stageData}
                    pagination={false}
                    size="middle"
                    bordered
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    暂无施工阶段分析数据
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ResultsViewer;