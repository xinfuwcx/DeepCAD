/**
 * 计算结果总览组件 - 基于3号专家技术规范
 * 整合深基坑计算分析结果的核心显示系统
 * 0号架构师 - 集成3号专家计算结果显示技术规范
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Statistic, Progress, Badge, 
  Alert, Descriptions, Button, Space, Tooltip,
  Typography, Divider
} from 'antd';
import { 
  SafetyOutlined, ExclamationCircleOutlined, 
  ThunderboltOutlined, LineChartOutlined,
  EyeOutlined, DownloadOutlined, AlertOutlined,
  CheckCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text } = Typography;

// ==================== 接口定义 ====================

interface ComputationResults {
  // 深基坑计算结果
  excavationResults?: DeepExcavationResults;
  
  // 施工阶段分析结果
  stageResults?: PyVistaStageResult[];
  
  // 安全评估结果
  safetyResults?: SafetyAssessmentResult;
  
  // 应力数据（Three.js可视化用）
  stressData?: PyVistaStressData;
  
  // 渗流数据
  seepageData?: PyVistaSeepageData;
  
  // 变形数据
  deformationData?: PyVistaDeformationData;
  
  // 2号专家几何数据
  geometryModels?: GeometryModel[];
  
  // 网格数据
  meshData?: MeshData;
}

interface DeepExcavationResults {
  // 基本信息
  analysisId: string;
  timestamp: Date;
  computationTime: number; // 计算时间(秒)
  
  // 计算参数
  parameters: {
    excavationDepth: number;    // 开挖深度(m)
    excavationWidth: number;    // 开挖宽度(m)
    excavationLength: number;   // 开挖长度(m)
    soilLayers: SoilLayerData[];
    retainingSystem: RetainingSystemData;
  };
  
  // 主要结果
  results: {
    // 整体稳定性
    overallStability: {
      safetyFactor: number;        // 整体安全系数
      stabilityStatus: 'safe' | 'warning' | 'critical';
      criticalFailureMode: string; // 关键破坏模式
    };
    
    // 变形结果
    deformation: {
      maxHorizontalDisplacement: number;    // 最大水平位移(mm)
      maxVerticalDisplacement: number;      // 最大竖向位移(mm)
      maxWallDeformation: number;           // 围护墙最大变形(mm)
      groundSettlement: number[];           // 地表沉降分布
    };
    
    // 应力结果
    stress: {
      maxPrincipalStress: number;           // 最大主应力(kPa)
      minPrincipalStress: number;           // 最小主应力(kPa)
      maxShearStress: number;               // 最大剪应力(kPa)
      vonMisesStress: number[];             // 冯米塞斯应力分布
    };
    
    // 支撑力结果
    supportForces: {
      maxStrutForce: number;                // 最大支撑力(kN)
      strutForceDistribution: number[];    // 支撑力分布
      anchorForces: number[];               // 锚杆力分布
    };
    
    // 渗流结果
    seepage: {
      maxSeepageVelocity: number;           // 最大渗流速度(m/s)
      totalInflow: number;                  // 总入渗量(m³/day)
      pipingRiskAreas: RiskArea[];          // 管涌风险区域
      upliftPressure: number[];             // 底板抗浮压力
    };
  };
}

interface SafetyAssessmentResult {
  // 总体评估
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallSafetyScore: number; // 0-100分
  
  // 各项风险评估
  riskAssessment: {
    // 整体稳定风险
    overallStability: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      safetyMargin: number;
      criticalFactors: string[];
    };
    
    // 局部失稳风险
    localInstability: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      riskAreas: RiskArea[];
      preventiveMeasures: string[];
    };
    
    // 渗流破坏风险
    seepageFailure: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      pipingRisk: number;        // 管涌风险系数
      upliftRisk: number;        // 抗浮风险系数 
      drainageEfficiency: number; // 降水效率
    };
    
    // 变形超限风险
    excessiveDeformation: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      maxDeformationRatio: number;  // 最大变形比
      affectedStructures: string[]; // 受影响建筑
    };
  };
}

interface ComputationResultsOverviewProps {
  results: ComputationResults;
  onDetailView?: (resultType: string) => void;
  theme?: 'dark' | 'light';
  enableAnimation?: boolean;
  showKeyMetrics?: boolean;
}

// ==================== 主组件 ====================

const ComputationResultsOverview: React.FC<ComputationResultsOverviewProps> = ({
  results,
  onDetailView,
  theme = 'dark',
  enableAnimation = true,
  showKeyMetrics = true
}) => {
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [alertsVisible, setAlertsVisible] = useState(true);

  // ==================== 辅助函数 ====================

  // 获取安全系数状态颜色
  const getSafetyFactorStatus = (safetyFactor: number): { color: string; status: string; icon: React.ReactNode } => {
    if (safetyFactor >= 2.0) {
      return { 
        color: '#52c41a', 
        status: '安全', 
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      };
    } else if (safetyFactor >= 1.5) {
      return { 
        color: '#faad14', 
        status: '注意', 
        icon: <WarningOutlined style={{ color: '#faad14' }} />
      };
    } else {
      return { 
        color: '#ff4d4f', 
        status: '危险', 
        icon: <AlertOutlined style={{ color: '#ff4d4f' }} />
      };
    }
  };

  // 获取风险等级颜色
  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'low': return '#52c41a';
      case 'medium': return '#faad14';
      case 'high': return '#ff7a45';
      case 'critical': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 翻译风险等级
  const translateRiskLevel = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'low': return '低风险';
      case 'medium': return '中等风险';
      case 'high': return '高风险';
      case 'critical': return '极高风险';
      default: return '未知';
    }
  };

  // 处理详情查看
  const handleDetailView = useCallback((resultType: string) => {
    setActiveMetric(resultType);
    onDetailView?.(resultType);
  }, [onDetailView]);

  // ==================== 渲染函数 ====================

  // 渲染关键指标卡片
  const renderKeyMetricCard = (
    title: string,
    value: number | string,
    unit: string,
    status: string,
    icon: React.ReactNode,
    onClick?: () => void
  ) => (
    <motion.div
      className="result-metric-card"
      whileHover={enableAnimation ? { scale: 1.02 } : {}}
      whileTap={enableAnimation ? { scale: 0.98 } : {}}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Card 
        size="small" 
        style={{ 
          background: theme === 'dark' ? '#2d2d2d' : '#ffffff',
          border: `1px solid ${theme === 'dark' ? '#404040' : '#d9d9d9'}`,
          borderRadius: '12px'
        }}
      >
        <div className="metric-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '24px', marginRight: '8px' }}>
            {icon}
          </div>
          <Text style={{ color: theme === 'dark' ? '#a0a0a0' : '#666666', fontSize: '14px' }}>
            {title}
          </Text>
        </div>
        
        <div className="metric-value" style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold', 
          color: '#00d9ff',
          marginBottom: '8px',
          fontFamily: '"JetBrains Mono", monospace'
        }}>
          {value}
          <span style={{ fontSize: '1rem', marginLeft: '4px', color: '#a0a0a0' }}>
            {unit}
          </span>
        </div>
        
        <div className={`metric-status status-${status.toLowerCase()}`} style={{
          display: 'inline-block',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 500,
          textTransform: 'uppercase' as const,
          background: status === 'safe' ? 'rgba(82, 196, 26, 0.2)' : 
                     status === 'warning' ? 'rgba(250, 173, 20, 0.2)' : 
                     'rgba(255, 77, 79, 0.2)',
          color: status === 'safe' ? '#52c41a' : 
                 status === 'warning' ? '#faad14' : 
                 '#ff4d4f',
          border: `1px solid ${status === 'safe' ? '#52c41a' : 
                                status === 'warning' ? '#faad14' : 
                                '#ff4d4f'}`
        }}>
          {status}
        </div>
      </Card>
    </motion.div>
  );

  // 渲染风险等级指示器
  const renderRiskLevelIndicator = (riskLevel: string, score: number) => (
    <div className="risk-indicator" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      margin: '20px' 
    }}>
      <div className="risk-circle" style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg className="risk-progress" viewBox="0 0 100 100" style={{ 
          width: '100%', 
          height: '100%',
          transform: 'rotate(-90deg)' 
        }}>
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e6e6e6"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={getRiskLevelColor(riskLevel)}
            strokeWidth="8"
            strokeDasharray={`${score * 2.83} 283`}
            strokeLinecap="round"
          />
        </svg>
        <div className="risk-score" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '1.8rem',
          fontWeight: 'bold',
          color: theme === 'dark' ? '#ffffff' : '#000000'
        }}>
          {score}
        </div>
      </div>
      <div className="risk-label" style={{ 
        marginTop: '8px',
        color: getRiskLevelColor(riskLevel),
        fontWeight: 'bold'
      }}>
        {translateRiskLevel(riskLevel)}
      </div>
    </div>
  );

  if (!results || (!results.excavationResults && !results.safetyResults)) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        background: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
        borderRadius: '12px'
      }}>
        <LineChartOutlined style={{ 
          fontSize: '48px', 
          color: '#d9d9d9', 
          marginBottom: '16px' 
        }} />
        <Text style={{ color: '#999' }}>暂无计算结果，请先执行深基坑分析</Text>
      </div>
    );
  }

  return (
    <div className="computation-results-overview" style={{
      padding: '20px',
      background: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
      borderRadius: '12px',
      marginBottom: '30px'
    }}>
      {/* 头部标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ 
          color: theme === 'dark' ? '#ffffff' : '#000000',
          margin: 0,
          display: 'flex',
          alignItems: 'center'
        }}>
          <ThunderboltOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
          深基坑计算分析结果总览
        </Title>
      </div>

      {/* 关键告警信息 */}
      <AnimatePresence>
        {alertsVisible && results.safetyResults?.overallRiskLevel === 'critical' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: '20px' }}
          >
            <Alert
              message="紧急安全警告"
              description="检测到极高风险状态，建议立即停止施工并采取应急措施！"
              type="error"
              showIcon
              closable
              onClose={() => setAlertsVisible(false)}
              action={
                <Button size="small" danger>
                  查看应急预案
                </Button>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 关键指标网格 */}
      {showKeyMetrics && results.excavationResults && (
        <Row gutter={[20, 20]} style={{ marginBottom: '30px' }}>
          {/* 安全系数 */}
          <Col xs={24} sm={12} md={6}>
            {(() => {
              const safetyFactor = results.excavationResults!.results.overallStability.safetyFactor;
              const statusInfo = getSafetyFactorStatus(safetyFactor);
              return renderKeyMetricCard(
                '整体安全系数',
                safetyFactor.toFixed(2),
                '',
                statusInfo.status,
                statusInfo.icon,
                () => handleDetailView('safety')
              );
            })()}
          </Col>

          {/* 最大位移 */}
          <Col xs={24} sm={12} md={6}>
            {renderKeyMetricCard(
              '最大水平位移',
              results.excavationResults.results.deformation.maxHorizontalDisplacement.toFixed(1),
              'mm',
              results.excavationResults.results.deformation.maxHorizontalDisplacement > 30 ? 'warning' : 'safe',
              <LineChartOutlined />,
              () => handleDetailView('deformation')
            )}
          </Col>

          {/* 最大应力 */}
          <Col xs={24} sm={12} md={6}>
            {renderKeyMetricCard(
              '最大主应力',
              (results.excavationResults.results.stress.maxPrincipalStress / 1000).toFixed(1),
              'MPa',
              'safe',
              <ThunderboltOutlined />,
              () => handleDetailView('stress')
            )}
          </Col>

          {/* 风险等级 */}
          <Col xs={24} sm={12} md={6}>
            {results.safetyResults && (
              <Card 
                size="small" 
                style={{ 
                  background: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                  border: `1px solid ${theme === 'dark' ? '#404040' : '#d9d9d9'}`,
                  borderRadius: '12px',
                  height: '100%',
                  cursor: 'pointer'
                }}
                onClick={() => handleDetailView('safety')}
              >
                {renderRiskLevelIndicator(
                  results.safetyResults.overallRiskLevel,
                  results.safetyResults.overallSafetyScore
                )}
              </Card>
            )}
          </Col>
        </Row>
      )}

      {/* 详细信息面板 */}
      <Row gutter={[20, 20]}>
        {/* 计算基本信息 */}
        {results.excavationResults && (
          <Col xs={24} lg={12}>
            <Card 
              title="计算基本信息" 
              size="small"
              style={{ 
                background: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? '#404040' : '#d9d9d9'}`
              }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="分析ID">
                  {results.excavationResults.analysisId}
                </Descriptions.Item>
                <Descriptions.Item label="计算时间">
                  {results.excavationResults.computationTime.toFixed(1)}秒
                </Descriptions.Item>
                <Descriptions.Item label="开挖深度">
                  {results.excavationResults.parameters.excavationDepth}m
                </Descriptions.Item>
                <Descriptions.Item label="开挖尺寸">
                  {results.excavationResults.parameters.excavationLength}m × {results.excavationResults.parameters.excavationWidth}m
                </Descriptions.Item>
                <Descriptions.Item label="破坏模式">
                  {results.excavationResults.results.overallStability.criticalFailureMode}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        )}

        {/* 主要计算结果 */}
        {results.excavationResults && (
          <Col xs={24} lg={12}>
            <Card 
              title="主要计算结果" 
              size="small"
              extra={
                <Button 
                  size="small" 
                  icon={<EyeOutlined />}
                  onClick={() => handleDetailView('detailed')}
                >
                  详细数据
                </Button>
              }
              style={{ 
                background: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                border: `1px solid ${theme === 'dark' ? '#404040' : '#d9d9d9'}`
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>变形控制:</Text>
                  <Progress 
                    percent={Math.min((results.excavationResults.results.deformation.maxHorizontalDisplacement / 50) * 100, 100)}
                    strokeColor={{
                      '0%': '#52c41a',
                      '70%': '#faad14',
                      '100%': '#ff4d4f'
                    }}
                    format={() => `${results.excavationResults!.results.deformation.maxHorizontalDisplacement.toFixed(1)}mm`}
                  />
                </div>
                
                <div>
                  <Text strong>支撑受力:</Text>
                  <Text style={{ float: 'right' }}>
                    最大 {(results.excavationResults.results.supportForces.maxStrutForce / 1000).toFixed(1)}MN
                  </Text>
                </div>
                
                <div>
                  <Text strong>渗流控制:</Text>
                  <Text style={{ float: 'right' }}>
                    {results.excavationResults.results.seepage.totalInflow.toFixed(1)}m³/day
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* 操作按钮组 */}
      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Space>
          <Button 
            type="primary" 
            icon={<EyeOutlined />}
            onClick={() => handleDetailView('visualization')}
          >
            3D可视化
          </Button>
          
          <Button 
            icon={<DownloadOutlined />}
            onClick={() => handleDetailView('export')}
          >
            导出报告
          </Button>
          
          <Button 
            icon={<SafetyOutlined />}
            onClick={() => handleDetailView('safety')}
          >
            安全评估
          </Button>
          
          <Button 
            icon={<LineChartOutlined />}
            onClick={() => handleDetailView('monitoring')}
          >
            监测建议
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ComputationResultsOverview;