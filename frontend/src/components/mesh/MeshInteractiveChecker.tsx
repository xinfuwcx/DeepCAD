import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Button, Steps, Alert, Tooltip, 
  Progress, Tag, Space, Drawer, Table, Popover,
  Slider, Switch, Select, InputNumber, Typography
} from 'antd';
import { 
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
  ToolOutlined, PlayCircleOutlined, BugOutlined, 
  SettingOutlined, InfoCircleOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const { Step } = Steps;
const { Text, Title } = Typography;
const { Option } = Select;

interface MeshProblem {
  id: string;
  type: 'aspect_ratio' | 'skewness' | 'jacobian' | 'angle' | 'volume';
  severity: 'critical' | 'warning' | 'info';
  element_ids: number[];
  description: string;
  recommendation: string;
  auto_fixable: boolean;
  estimated_improvement: number;
}

interface RepairAction {
  id: string;
  name: string;
  description: string;
  target_problems: string[];
  estimated_time: number;
  risk_level: 'low' | 'medium' | 'high';
  success_rate: number;
  parameters: Record<string, any>;
}

interface MeshInteractiveCheckerProps {
  meshFile?: string;
  qualityReport?: any;
  onRepairMesh?: (actions: RepairAction[]) => Promise<void>;
  onPreviewRepair?: (action: RepairAction) => Promise<any>;
}

const MeshInteractiveChecker: React.FC<MeshInteractiveCheckerProps> = ({
  meshFile,
  qualityReport,
  onRepairMesh,
  onPreviewRepair
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [detectedProblems, setDetectedProblems] = useState<MeshProblem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<RepairAction[]>([]);
  const [selectedActions, setSelectedActions] = useState<RepairAction[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [repairInProgress, setRepairInProgress] = useState(false);

  useEffect(() => {
    if (qualityReport) {
      analyzeProblems();
    }
  }, [qualityReport]);

  // 分析网格问题
  const analyzeProblems = () => {
    const problems: MeshProblem[] = [];

    if (qualityReport?.quality_metrics) {
      Object.entries(qualityReport.quality_metrics).forEach(([metric, data]: [string, any]) => {
        if (data.status === 'poor' || data.status === 'unacceptable') {
          problems.push({
            id: `${metric}_problem`,
            type: metric as any,
            severity: data.status === 'unacceptable' ? 'critical' : 'warning',
            element_ids: data.poor_elements || [],
            description: getProblemDescription(metric, data),
            recommendation: getProblemRecommendation(metric, data),
            auto_fixable: isAutoFixable(metric),
            estimated_improvement: estimateImprovement(metric, data)
          });
        }
      });
    }

    setDetectedProblems(problems);
    generateRepairActions(problems);
  };

  const getProblemDescription = (metric: string, data: any) => {
    const descriptions = {
      aspect_ratio: `长宽比过大 (平均: ${data.mean_value.toFixed(2)})，影响计算精度`,
      skewness: `网格偏斜度过高 (平均: ${data.mean_value.toFixed(2)})，可能导致数值误差`,
      jacobian: `雅可比行列式过小 (平均: ${data.mean_value.toFixed(2)})，存在退化单元`,
      min_angle: `最小角度过小 (平均: ${data.mean_value.toFixed(1)}°)，影响稳定性`,
      max_angle: `最大角度过大 (平均: ${data.mean_value.toFixed(1)}°)，可能导致数值问题`
    };
    return descriptions[metric as keyof typeof descriptions] || `${metric} 质量指标异常`;
  };

  const getProblemRecommendation = (metric: string, data: any) => {
    const recommendations = {
      aspect_ratio: '建议调整网格密度或使用结构化网格生成',
      skewness: '建议优化几何边界或调整网格生成参数',
      jacobian: '建议检查并移除退化单元，重新生成网格',
      min_angle: '建议增加边界约束或使用更高阶单元',
      max_angle: '建议细化局部网格或调整边界条件'
    };
    return recommendations[metric as keyof typeof recommendations] || '建议重新生成网格';
  };

  const isAutoFixable = (metric: string) => {
    const fixable = ['aspect_ratio', 'skewness'];
    return fixable.includes(metric);
  };

  const estimateImprovement = (metric: string, data: any) => {
    // 基于当前值估计修复后的改善程度
    const currentScore = getMetricScore(metric, data.mean_value);
    const targetScore = 80; // 目标分数
    return Math.max(0, targetScore - currentScore);
  };

  const getMetricScore = (metric: string, value: number) => {
    // 简化的评分算法
    const scoreMaps = {
      aspect_ratio: Math.max(0, 100 - value * 5),
      skewness: Math.max(0, 100 - value * 100),
      jacobian: value * 100,
      min_angle: Math.min(100, value * 2),
      max_angle: Math.max(0, 200 - value)
    };
    return scoreMaps[metric as keyof typeof scoreMaps] || 50;
  };

  // 生成修复动作
  const generateRepairActions = (problems: MeshProblem[]) => {
    const actions: RepairAction[] = [
      {
        id: 'smooth_laplacian',
        name: '拉普拉斯平滑',
        description: '使用拉普拉斯算法平滑网格，改善单元质量',
        target_problems: ['aspect_ratio', 'skewness'],
        estimated_time: 30,
        risk_level: 'low',
        success_rate: 85,
        parameters: {
          iterations: 5,
          relaxation_factor: 0.1
        }
      },
      {
        id: 'edge_swapping',
        name: '边交换优化',
        description: '通过边交换改善三角形网格质量',
        target_problems: ['aspect_ratio', 'min_angle', 'max_angle'],
        estimated_time: 45,
        risk_level: 'medium',
        success_rate: 75,
        parameters: {
          angle_threshold: 30
        }
      },
      {
        id: 'node_insertion',
        name: '节点插入细化',
        description: '在问题区域插入新节点，改善局部网格质量',
        target_problems: ['aspect_ratio', 'jacobian'],
        estimated_time: 60,
        risk_level: 'medium',
        success_rate: 90,
        parameters: {
          quality_threshold: 0.3,
          max_new_nodes: 1000
        }
      },
      {
        id: 'remesh_problematic',
        name: '问题区域重新网格化',
        description: '对质量差的区域重新生成网格',
        target_problems: ['jacobian', 'skewness'],
        estimated_time: 120,
        risk_level: 'high',
        success_rate: 95,
        parameters: {
          quality_threshold: 0.2,
          boundary_preservation: true
        }
      }
    ];

    // 过滤出适用于当前问题的动作
    const applicableActions = actions.filter(action => 
      action.target_problems.some(target => 
        problems.some(problem => problem.type === target)
      )
    );

    setAvailableActions(applicableActions);
  };

  const handleProblemSelection = (problemIds: string[]) => {
    setSelectedProblems(problemIds);
    
    // 自动推荐修复动作
    const relevantActions = availableActions.filter(action =>
      action.target_problems.some(target =>
        detectedProblems.some(problem => 
          problemIds.includes(problem.id) && problem.type === target
        )
      )
    );
    
    setSelectedActions(relevantActions);
  };

  const handlePreviewAction = async (action: RepairAction) => {
    if (!onPreviewRepair) return;
    
    try {
      const preview = await onPreviewRepair(action);
      setPreviewData(preview);
      setDrawerVisible(true);
    } catch (error) {
      console.error('预览修复动作失败:', error);
    }
  };

  const handleExecuteRepair = async () => {
    if (!onRepairMesh || selectedActions.length === 0) return;
    
    setRepairInProgress(true);
    try {
      await onRepairMesh(selectedActions);
      setCurrentStep(3); // 跳转到完成步骤
    } catch (error) {
      console.error('修复失败:', error);
    } finally {
      setRepairInProgress(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: '#ff4d4f',
      warning: '#faad14',
      info: '#1890ff'
    };
    return colors[severity as keyof typeof colors] || '#d9d9d9';
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      low: '#52c41a',
      medium: '#faad14',
      high: '#ff4d4f'
    };
    return colors[risk as keyof typeof colors] || '#d9d9d9';
  };

  const problemColumns = [
    {
      title: '问题类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => type.replace('_', ' ').toUpperCase()
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity === 'critical' ? '严重' : severity === 'warning' ? '警告' : '信息'}
        </Tag>
      )
    },
    {
      title: '影响单元',
      dataIndex: 'element_ids',
      key: 'element_ids',
      render: (ids: number[]) => `${ids.length} 个单元`
    },
    {
      title: '预期改善',
      dataIndex: 'estimated_improvement',
      key: 'estimated_improvement',
      render: (improvement: number) => `+${improvement.toFixed(1)}%`
    },
    {
      title: '可自动修复',
      dataIndex: 'auto_fixable',
      key: 'auto_fixable',
      render: (fixable: boolean) => (
        fixable ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> 
                : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      )
    }
  ];

  const actionColumns = [
    {
      title: '修复动作',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      render: (risk: string) => (
        <Tag color={getRiskColor(risk)}>
          {risk === 'low' ? '低' : risk === 'medium' ? '中' : '高'}
        </Tag>
      )
    },
    {
      title: '成功率',
      dataIndex: 'success_rate',
      key: 'success_rate',
      render: (rate: number) => `${rate}%`
    },
    {
      title: '预计时间',
      dataIndex: 'estimated_time',
      key: 'estimated_time',
      render: (time: number) => `${time}s`
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: RepairAction) => (
        <Space>
          <Button size="small" onClick={() => handlePreviewAction(record)}>
            预览
          </Button>
        </Space>
      )
    }
  ];

  const steps = [
    {
      title: '问题检测',
      icon: <BugOutlined />,
      content: (
        <div>
          <Alert 
            message={`检测到 ${detectedProblems.length} 个网格质量问题`}
            type={detectedProblems.length > 0 ? 'warning' : 'success'}
            style={{ marginBottom: 16 }}
          />
          
          <Table
            rowSelection={{
              selectedRowKeys: selectedProblems,
              onChange: handleProblemSelection,
              getCheckboxProps: (record) => ({
                disabled: !record.auto_fixable
              })
            }}
            columns={problemColumns}
            dataSource={detectedProblems}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </div>
      )
    },
    {
      title: '修复策略',
      icon: <ToolOutlined />,
      content: (
        <div>
          <Alert 
            message={`推荐 ${selectedActions.length} 个修复动作`}
            type="info"
            style={{ marginBottom: 16 }}
          />
          
          <Table
            columns={actionColumns}
            dataSource={selectedActions}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </div>
      )
    },
    {
      title: '执行修复',
      icon: <PlayCircleOutlined />,
      content: (
        <div>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="修复概要" size="small">
                <div>选择的问题: {selectedProblems.length}</div>
                <div>修复动作: {selectedActions.length}</div>
                <div>预计时间: {selectedActions.reduce((sum, action) => sum + action.estimated_time, 0)}s</div>
                <div>预期改善: {detectedProblems
                  .filter(p => selectedProblems.includes(p.id))
                  .reduce((sum, p) => sum + p.estimated_improvement, 0).toFixed(1)}%</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="风险评估" size="small">
                <div>整体风险: 
                  <Tag color={getRiskColor('medium')}>中等</Tag>
                </div>
                <div>成功率: ~85%</div>
                <div>回滚支持: 是</div>
              </Card>
            </Col>
          </Row>
          
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button 
              type="primary" 
              size="large"
              icon={<ThunderboltOutlined />}
              loading={repairInProgress}
              onClick={handleExecuteRepair}
              disabled={selectedActions.length === 0}
            >
              执行网格修复
            </Button>
          </div>
        </div>
      )
    },
    {
      title: '修复完成',
      icon: <CheckCircleOutlined />,
      content: (
        <div style={{ textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <Title level={4}>网格修复完成</Title>
          <Text>网格质量已得到改善，建议重新运行质量分析验证结果。</Text>
        </div>
      )
    }
  ];

  return (
    <div>
      <Card title="交互式网格检查与修复">
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((step, index) => (
            <Step 
              key={index} 
              title={step.title} 
              icon={step.icon}
              onClick={() => setCurrentStep(index)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </Steps>

        <div style={{ minHeight: 400 }}>
          {steps[currentStep].content}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>
                上一步
              </Button>
            )}
            {currentStep < steps.length - 1 && currentStep !== 2 && (
              <Button 
                type="primary" 
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 0 && selectedProblems.length === 0}
              >
                下一步
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 修复预览抽屉 */}
      <Drawer
        title="修复预览"
        placement="right"
        size="large"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
      >
        {previewData && (
          <div>
            <Alert 
              message="预览结果"
              description="这是修复动作的预期效果，实际结果可能有所差异。"
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            {/* 这里可以添加3D预览或图表 */}
            <div style={{ 
              height: 300, 
              background: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text>3D预览区域（待实现）</Text>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MeshInteractiveChecker;