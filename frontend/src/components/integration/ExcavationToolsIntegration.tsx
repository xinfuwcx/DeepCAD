/**
 * 基坑设计工具集成界面 - 2号几何专家开发
 * P2优先级任务 - 统一集成所有基坑设计相关组件的工作流程
 * 基于1号架构师规划，提供完整的基坑设计解决方案工作流
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, Steps, Button, Space, Typography, Row, Col, 
  Alert, Progress, Tabs, message, Modal, Timeline,
  Divider, Tag, Tooltip, Drawer, List, Collapse
} from 'antd';
import { 
  RocketOutlined, CheckCircleOutlined, PlayCircleOutlined,
  PauseCircleOutlined, ReloadOutlined, SaveOutlined,
  ExportOutlined, SettingOutlined, EyeOutlined,
  BulbOutlined, WarningOutlined, InfoCircleOutlined,
  ThunderboltOutlined, BuildOutlined, DashboardOutlined
} from '@ant-design/icons';

// 导入之前开发的所有组件
import RBFInterpolationConfig from '../geology/RBFInterpolationConfig';
import GeologyParameterEditor from '../geology/GeologyParameterEditor';
import DXFBooleanInterface from '../geology/DXFBooleanInterface';
import ExcavationDesignTools from '../excavation/ExcavationDesignTools';
import SupportStructureConfig from '../support/SupportStructureConfig';
import RBF3DIntegration from '../geology/RBF3DIntegration';
import UserDefinedDomain from '../domain/UserDefinedDomain';
import GeologyProfileCharts from '../geology/GeologyProfileCharts';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// 工作流程步骤定义
interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  dependencies: string[];
  outputs: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';
  progress: number;
  duration?: number; // 预估时间(分钟)
  priority: 'required' | 'recommended' | 'optional';
  validationRules?: ValidationRule[];
}

interface ValidationRule {
  type: 'data_quality' | 'parameter_range' | 'geometric_constraint' | 'engineering_standard';
  condition: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// 项目数据管理
interface ProjectData {
  geology: {
    boreholes: any[];
    layers: any[];
    parameters: any[];
    rbfConfig: any;
    reconstruction3D: any;
  };
  excavation: {
    geometry: any;
    stages: any[];
    slopes: any[];
  };
  support: {
    structures: any[];
    analysis: any[];
  };
  domain: {
    definition: any;
    mesh: any;
    boundaries: any[];
  };
  analysis: {
    profiles: any[];
    charts: any[];
    reports: any[];
  };
}

// 集成状态
interface IntegrationState {
  currentStep: number;
  workflowStatus: 'not_started' | 'running' | 'paused' | 'completed' | 'error';
  projectData: ProjectData;
  validationResults: Map<string, ValidationResult[]>;
  completionRate: number;
  estimatedTimeRemaining: number;
}

interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  actualValue?: any;
  recommendation?: string;
}

interface ExcavationToolsIntegrationProps {
  initialData?: Partial<ProjectData>;
  onProjectSave?: (data: ProjectData) => void;
  onExport?: (data: ProjectData, format: 'json' | 'report' | 'cad') => void;
  autoSave?: boolean;
  showGuidance?: boolean;
}

const ExcavationToolsIntegration: React.FC<ExcavationToolsIntegrationProps> = ({
  initialData = {},
  onProjectSave,
  onExport,
  autoSave = true,
  showGuidance = true
}) => {
  // 定义完整的工作流程步骤
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'rbf_config',
      title: 'RBF插值配置',
      description: '配置径向基函数插值参数，优化重建质量',
      component: RBFInterpolationConfig,
      dependencies: ['borehole_data'],
      outputs: ['geology.rbfConfig'],
      status: 'pending',
      progress: 0,
      duration: 10,
      priority: 'required'
    },
    {
      id: 'geology_parameters',
      title: '地层参数编辑',
      description: '编辑和验证土层物理力学参数',
      component: GeologyParameterEditor,
      dependencies: ['borehole_data'],
      outputs: ['geology.parameters'],
      status: 'pending',
      progress: 0,
      duration: 20,
      priority: 'required'
    },
    {
      id: 'rbf_reconstruction',
      title: '3D地质重建',
      description: '执行RBF三维地质重建，生成连续地层模型',
      component: RBF3DIntegration,
      dependencies: ['borehole_data', 'rbf_config'],
      outputs: ['geology.reconstruction3D'],
      status: 'pending',
      progress: 0,
      duration: 30,
      priority: 'required'
    },
    {
      id: 'dxf_import',
      title: 'CAD图形处理',
      description: '导入DXF文件并进行土体布尔运算',
      component: DXFBooleanInterface,
      dependencies: [],
      outputs: ['excavation.cadGeometry'],
      status: 'pending',
      progress: 0,
      duration: 15,
      priority: 'optional'
    },
    {
      id: 'excavation_design',
      title: '基坑设计',
      description: '设计基坑几何和施工阶段',
      component: ExcavationDesignTools,
      dependencies: ['geology_parameters'],
      outputs: ['excavation.geometry', 'excavation.stages'],
      status: 'pending',
      progress: 0,
      duration: 25,
      priority: 'required'
    },
    {
      id: 'support_design',
      title: '支护结构设计',
      description: '配置支护结构并进行结构分析',
      component: SupportStructureConfig,
      dependencies: ['excavation_design'],
      outputs: ['support.structures', 'support.analysis'],
      status: 'pending',
      progress: 0,
      duration: 35,
      priority: 'required'
    },
    {
      id: 'domain_definition',
      title: '计算域定义',
      description: '定义有限元计算域和边界条件',
      component: UserDefinedDomain,
      dependencies: ['excavation_design', 'geology_parameters'],
      outputs: ['domain.definition', 'domain.boundaries'],
      status: 'pending',
      progress: 0,
      duration: 20,
      priority: 'recommended'
    },
    {
      id: 'profile_analysis',
      title: '剖面分析',
      description: '生成地层剖面图和统计分析',
      component: GeologyProfileCharts,
      dependencies: ['rbf_reconstruction'],
      outputs: ['analysis.profiles', 'analysis.charts'],
      status: 'pending',
      progress: 0,
      duration: 10,
      priority: 'recommended'
    }
  ];

  const [integrationState, setIntegrationState] = useState<IntegrationState>({
    currentStep: 0,
    workflowStatus: 'not_started',
    projectData: createInitialProjectData(initialData),
    validationResults: new Map(),
    completionRate: 0,
    estimatedTimeRemaining: 0
  });

  const [activeComponentProps, setActiveComponentProps] = useState<any>({});
  const [guidanceVisible, setGuidanceVisible] = useState(showGuidance);
  const [workflowDrawerVisible, setWorkflowDrawerVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // 创建初始项目数据
  function createInitialProjectData(initial: Partial<ProjectData> = {}): ProjectData {
    return {
      geology: {
        boreholes: [],
        layers: [],
        parameters: [],
        rbfConfig: null,
        reconstruction3D: null,
        ...initial.geology
      },
      excavation: {
        geometry: null,
        stages: [],
        slopes: [],
        ...initial.excavation
      },
      support: {
        structures: [],
        analysis: [],
        ...initial.support
      },
      domain: {
        definition: null,
        mesh: null,
        boundaries: [],
        ...initial.domain
      },
      analysis: {
        profiles: [],
        charts: [],
        reports: [],
        ...initial.analysis
      }
    };
  }

  // 更新步骤状态
  const updateStepStatus = useCallback((stepId: string, status: WorkflowStep['status'], progress: number = 0) => {
    setIntegrationState(prev => {
      const newSteps = workflowSteps.map(step => 
        step.id === stepId ? { ...step, status, progress } : step
      );
      
      // 计算整体完成率
      const completedSteps = newSteps.filter(s => s.status === 'completed').length;
      const totalSteps = newSteps.length;
      const completionRate = (completedSteps / totalSteps) * 100;
      
      // 计算预估剩余时间
      const remainingRequired = newSteps.filter(s => 
        s.status !== 'completed' && s.priority === 'required'
      ).reduce((sum, s) => sum + (s.duration || 0), 0);
      
      return {
        ...prev,
        completionRate,
        estimatedTimeRemaining: remainingRequired
      };
    });
  }, [workflowSteps]);

  // 更新项目数据
  const updateProjectData = useCallback((path: string, data: any) => {
    setIntegrationState(prev => {
      const newProjectData = { ...prev.projectData };
      const keys = path.split('.');
      let current: any = newProjectData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = data;
      
      return {
        ...prev,
        projectData: newProjectData
      };
    });

    // 自动保存
    if (autoSave && onProjectSave) {
      setTimeout(() => {
        onProjectSave(integrationState.projectData);
      }, 1000);
    }
  }, [autoSave, onProjectSave, integrationState.projectData]);

  // 执行工作流程
  const executeWorkflow = async () => {
    setIntegrationState(prev => ({ ...prev, workflowStatus: 'running' }));
    
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      
      // 检查依赖关系
      const dependenciesMet = step.dependencies.every(depId => 
        workflowSteps.find(s => s.id === depId)?.status === 'completed'
      );
      
      if (!dependenciesMet && step.priority === 'required') {
        updateStepStatus(step.id, 'error');
        message.error(`步骤 "${step.title}" 的依赖未满足`);
        continue;
      }
      
      if (step.priority === 'optional' && !dependenciesMet) {
        updateStepStatus(step.id, 'skipped');
        continue;
      }
      
      // 执行步骤
      setIntegrationState(prev => ({ ...prev, currentStep: i }));
      updateStepStatus(step.id, 'in_progress');
      
      // 模拟步骤执行时间
      const duration = (step.duration || 10) * 100; // 转换为毫秒（模拟）
      
      for (let progress = 0; progress <= 100; progress += 10) {
        updateStepStatus(step.id, 'in_progress', progress);
        await new Promise(resolve => setTimeout(resolve, duration / 10));
        
        // 检查是否暂停
        if (integrationState.workflowStatus === 'paused') {
          return;
        }
      }
      
      updateStepStatus(step.id, 'completed', 100);
      message.success(`完成步骤: ${step.title}`);
    }
    
    setIntegrationState(prev => ({ ...prev, workflowStatus: 'completed' }));
    message.success('🎉 基坑设计工作流程全部完成！');
  };

  // 暂停工作流程
  const pauseWorkflow = () => {
    setIntegrationState(prev => ({ ...prev, workflowStatus: 'paused' }));
    message.info('工作流程已暂停');
  };

  // 重置工作流程
  const resetWorkflow = () => {
    setIntegrationState(prev => ({
      ...prev,
      currentStep: 0,
      workflowStatus: 'not_started',
      completionRate: 0,
      estimatedTimeRemaining: 0
    }));
    
    workflowSteps.forEach(step => {
      updateStepStatus(step.id, 'pending', 0);
    });
    
    message.info('工作流程已重置');
  };

  // 当前活动步骤
  const currentStep = workflowSteps[integrationState.currentStep];
  const CurrentComponent = currentStep?.component;

  // 统计信息
  const workflowStats = useMemo(() => {
    const required = workflowSteps.filter(s => s.priority === 'required').length;
    const recommended = workflowSteps.filter(s => s.priority === 'recommended').length;
    const optional = workflowSteps.filter(s => s.priority === 'optional').length;
    const completed = workflowSteps.filter(s => s.status === 'completed').length;
    const errors = workflowSteps.filter(s => s.status === 'error').length;

    return { required, recommended, optional, completed, errors, total: workflowSteps.length };
  }, [workflowSteps]);

  return (
    <div className="excavation-tools-integration">
      {/* 主控制面板 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space>
              <RocketOutlined style={{ color: 'var(--primary-color)' }} />
              <Title level={5} style={{ margin: 0 }}>基坑设计工作流</Title>
              <Tag color={
                integrationState.workflowStatus === 'completed' ? 'green' :
                integrationState.workflowStatus === 'running' ? 'blue' :
                integrationState.workflowStatus === 'error' ? 'red' : 'default'
              }>
                {integrationState.workflowStatus === 'not_started' ? '未开始' :
                 integrationState.workflowStatus === 'running' ? '运行中' :
                 integrationState.workflowStatus === 'paused' ? '已暂停' :
                 integrationState.workflowStatus === 'completed' ? '已完成' : '错误'}
              </Tag>
            </Space>
          </Col>
          <Col span={18}>
            <Row gutter={16}>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {workflowStats.completed}/{workflowStats.total}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>完成步骤</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {integrationState.completionRate.toFixed(0)}%
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>完成率</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {integrationState.estimatedTimeRemaining}min
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>预估剩余</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: workflowStats.errors > 0 ? 'var(--error-color)' : 'var(--success-color)' }}>
                    {workflowStats.errors}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>错误数</Text></div>
                </div>
              </Col>
              <Col span={8}>
                <Space style={{ float: 'right' }}>
                  <Button
                    size="small"
                    icon={<BulbOutlined />}
                    onClick={() => setGuidanceVisible(!guidanceVisible)}
                    type={guidanceVisible ? 'primary' : 'default'}
                  >
                    向导
                  </Button>
                  <Button
                    size="small"
                    icon={<DashboardOutlined />}
                    onClick={() => setWorkflowDrawerVisible(true)}
                  >
                    流程图
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={
                      integrationState.workflowStatus === 'running' ? <PauseCircleOutlined /> :
                      integrationState.workflowStatus === 'paused' ? <PlayCircleOutlined /> :
                      <PlayCircleOutlined />
                    }
                    onClick={
                      integrationState.workflowStatus === 'running' ? pauseWorkflow :
                      integrationState.workflowStatus === 'paused' ? executeWorkflow :
                      executeWorkflow
                    }
                    loading={integrationState.workflowStatus === 'running'}
                  >
                    {integrationState.workflowStatus === 'running' ? '暂停' :
                     integrationState.workflowStatus === 'paused' ? '继续' : '开始'}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 进度指示 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Progress
          percent={integrationState.completionRate}
          status={
            integrationState.workflowStatus === 'completed' ? 'success' :
            integrationState.workflowStatus === 'error' ? 'exception' :
            integrationState.workflowStatus === 'running' ? 'active' : 'normal'
          }
          format={(percent) => `${percent?.toFixed(0)}% (${workflowStats.completed}/${workflowStats.total})`}
        />
      </Card>

      {/* 指导面板 */}
      {guidanceVisible && (
        <Alert
          message="工作流程指导"
          description={
            <div>
              <Paragraph style={{ margin: '8px 0' }}>
                🔧 <strong>基坑设计完整工作流程：</strong>
              </Paragraph>
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                <li><strong>数据准备</strong>：导入钻孔数据，配置RBF参数，编辑地层参数</li>
                <li><strong>地质建模</strong>：执行3D重建，生成连续地层模型</li>
                <li><strong>工程设计</strong>：设计基坑几何，配置支护结构</li>
                <li><strong>数值分析</strong>：定义计算域，准备有限元模型</li>
                <li><strong>结果分析</strong>：生成剖面图表，输出设计报告</li>
              </ol>
              <div style={{ marginTop: '8px' }}>
                <Tag color="red">必需: {workflowStats.required}</Tag>
                <Tag color="orange">推荐: {workflowStats.recommended}</Tag>
                <Tag color="blue">可选: {workflowStats.optional}</Tag>
              </div>
            </div>
          }
          type="info"
          showIcon
          closable
          onClose={() => setGuidanceVisible(false)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 步骤导航 */}
      <Card title="工作流程步骤" size="small" style={{ marginBottom: '16px' }}>
        <Steps
          current={integrationState.currentStep}
          size="small"
          items={workflowSteps.map((step, index) => ({
            title: step.title,
            description: step.description,
            status: 
              step.status === 'completed' ? 'finish' :
              step.status === 'in_progress' ? 'process' :
              step.status === 'error' ? 'error' :
              step.status === 'skipped' ? 'finish' : 'wait',
            icon: step.status === 'completed' ? <CheckCircleOutlined /> :
                  step.status === 'error' ? <WarningOutlined /> :
                  step.status === 'skipped' ? <InfoCircleOutlined /> : undefined
          }))}
        />
      </Card>

      {/* 主工作区域 */}
      <Card 
        title={
          <Space>
            <Text strong>当前步骤: {currentStep?.title}</Text>
            <Tag color={
              currentStep?.priority === 'required' ? 'red' :
              currentStep?.priority === 'recommended' ? 'orange' : 'blue'
            }>
              {currentStep?.priority === 'required' ? '必需' :
               currentStep?.priority === 'recommended' ? '推荐' : '可选'}
            </Tag>
            {currentStep?.status === 'in_progress' && (
              <Progress 
                percent={currentStep.progress} 
                size="small" 
                style={{ width: '100px' }}
                format={(percent) => `${percent}%`}
              />
            )}
          </Space>
        }
        size="small"
        extra={
          <Space>
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={() => onProjectSave && onProjectSave(integrationState.projectData)}
              disabled={!onProjectSave}
            >
              保存项目
            </Button>
            <Button
              size="small"
              icon={<ExportOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              导出结果
            </Button>
          </Space>
        }
      >
        {CurrentComponent ? (
          <div style={{ minHeight: '400px' }}>
            <CurrentComponent
              {...activeComponentProps}
              onDataChange={(data: any) => {
                // 根据当前步骤更新对应的项目数据
                currentStep.outputs.forEach(outputPath => {
                  updateProjectData(outputPath, data);
                });
              }}
            />
          </div>
        ) : (
          <div style={{ 
            height: '400px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: '#fafafa',
            borderRadius: '6px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <RocketOutlined style={{ fontSize: '48px', color: 'var(--text-secondary)', marginBottom: '16px' }} />
              <div>
                <Text style={{ color: 'var(--text-secondary)' }}>
                  点击"开始"按钮启动基坑设计工作流程
                </Text>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 工作流程抽屉 */}
      <Drawer
        title="工作流程总览"
        placement="right"
        onClose={() => setWorkflowDrawerVisible(false)}
        open={workflowDrawerVisible}
        width={600}
      >
        <Timeline
          items={workflowSteps.map(step => ({
            color: 
              step.status === 'completed' ? 'green' :
              step.status === 'in_progress' ? 'blue' :
              step.status === 'error' ? 'red' :
              step.status === 'skipped' ? 'gray' : 'gray',
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>{step.title}</Text>
                  <Space>
                    <Tag color={
                      step.priority === 'required' ? 'red' :
                      step.priority === 'recommended' ? 'orange' : 'blue'
                    } size="small">
                      {step.priority === 'required' ? '必需' :
                       step.priority === 'recommended' ? '推荐' : '可选'}
                    </Tag>
                    {step.duration && (
                      <Tag size="small">{step.duration}min</Tag>
                    )}
                  </Space>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {step.description}
                  </Text>
                </div>
                {step.dependencies.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      依赖: {step.dependencies.join(', ')}
                    </Text>
                  </div>
                )}
                {step.status === 'in_progress' && (
                  <Progress 
                    percent={step.progress} 
                    size="small" 
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>
            )
          }))}
        />
      </Drawer>

      {/* 导出模态框 */}
      <Modal
        title="导出项目结果"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalVisible(false)}>
            取消
          </Button>
        ]}
      >
        <List
          dataSource={[
            { format: 'json', title: '项目数据 (JSON)', description: '完整的项目数据，可用于备份和恢复' },
            { format: 'report', title: '设计报告 (PDF)', description: '包含所有分析结果的综合报告' },
            { format: 'cad', title: 'CAD文件 (DXF)', description: '基坑和支护结构的CAD图形文件' }
          ]}
          renderItem={item => (
            <List.Item
              actions={[
                <Button 
                  key="export"
                  type="primary" 
                  size="small"
                  onClick={() => {
                    onExport && onExport(integrationState.projectData, item.format as any);
                    setExportModalVisible(false);
                    message.success(`${item.title} 导出成功`);
                  }}
                >
                  导出
                </Button>
              ]}
            >
              <List.Item.Meta
                title={item.title}
                description={item.description}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default ExcavationToolsIntegration;