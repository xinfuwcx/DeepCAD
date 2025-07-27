/**
 * 数据接口联调面板
 * 3号计算专家与2号几何专家数据集成测试
 */

import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Button, Table, Tag, Alert, Progress, Statistic, Row, Col, Steps, Tabs } from 'antd';
import { 
  DatabaseOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  SettingOutlined,
  BugOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { ComponentDevHelper } from '../../utils/developmentTools';
import { ModuleErrorBoundary } from '../../core/ErrorBoundary';
import { geometryIntegrationService, GeologyModelData, ExcavationData, IntegratedFragmentData } from '../../services/geometryIntegrationService';
import { optimizeFragments } from '../../algorithms/fragmentOptimization';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface DataIntegrationPanelProps {
  onDataIntegrated?: (fragments: IntegratedFragmentData[]) => void;
}

const DataIntegrationPanel: React.FC<DataIntegrationPanelProps> = ({
  onDataIntegrated
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [integrationStatus, setIntegrationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [integratedFragments, setIntegratedFragments] = useState<IntegratedFragmentData[]>([]);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [dataStatistics, setDataStatistics] = useState<any>({});
  const [validationResults, setValidationResults] = useState<{ isValid: boolean; issues: string[] }>({ isValid: false, issues: [] });

  // 模拟2号几何专家的地质数据
  const mockGeologyData: GeologyModelData = {
    boreholes: [
      {
        id: 'ZK001',
        name: 'ZK-001',
        position: [100, 200, 0],
        depth: 30,
        layers: [
          {
            id: 'clay_layer_1',
            name: '粘土层',
            topElevation: 0,
            bottomElevation: -8,
            materialType: 'clay',
            properties: {
              cohesion: 25,
              friction: 18,
              density: 1900,
              elasticModulus: 8000,
              poissonRatio: 0.35
            }
          },
          {
            id: 'sand_layer_1',
            name: '砂土层',
            topElevation: -8,
            bottomElevation: -18,
            materialType: 'sand',
            properties: {
              cohesion: 0,
              friction: 32,
              density: 1800,
              elasticModulus: 25000,
              poissonRatio: 0.3
            }
          }
        ]
      },
      {
        id: 'ZK002',
        name: 'ZK-002',
        position: [150, 250, 0],
        depth: 25,
        layers: [
          {
            id: 'clay_layer_2',
            name: '粘土层',
            topElevation: 0,
            bottomElevation: -10,
            materialType: 'clay',
            properties: {
              cohesion: 22,
              friction: 16,
              density: 1850,
              elasticModulus: 7500,
              poissonRatio: 0.37
            }
          }
        ]
      }
    ],
    layers: [
      {
        id: 'clay_global',
        name: '全局粘土层',
        materialType: 'clay',
        thickness: 8,
        nodes: Array.from({length: 1000}, (_, i) => ({
          id: i + 1,
          coordinates: [
            Math.random() * 100 + 50,
            Math.random() * 100 + 150,
            Math.random() * 8 - 4
          ] as [number, number, number],
          layerId: 'clay_global'
        })),
        elements: Array.from({length: 800}, (_, i) => ({
          id: i + 1,
          nodeIds: [
            Math.floor(Math.random() * 1000) + 1,
            Math.floor(Math.random() * 1000) + 1,
            Math.floor(Math.random() * 1000) + 1,
            Math.floor(Math.random() * 1000) + 1
          ],
          layerId: 'clay_global',
          materialId: 'clay_1',
          type: 'tetrahedron' as const
        }))
      },
      {
        id: 'sand_global',
        name: '全局砂土层',
        materialType: 'sand',
        thickness: 10,
        nodes: Array.from({length: 1200}, (_, i) => ({
          id: i + 1001,
          coordinates: [
            Math.random() * 100 + 50,
            Math.random() * 100 + 150,
            Math.random() * 10 - 14
          ] as [number, number, number],
          layerId: 'sand_global'
        })),
        elements: Array.from({length: 1000}, (_, i) => ({
          id: i + 801,
          nodeIds: [
            Math.floor(Math.random() * 1200) + 1001,
            Math.floor(Math.random() * 1200) + 1001,
            Math.floor(Math.random() * 1200) + 1001,
            Math.floor(Math.random() * 1200) + 1001
          ],
          layerId: 'sand_global',
          materialId: 'sand_1',
          type: 'tetrahedron' as const
        }))
      }
    ],
    gridResolution: 2.0,
    boundingBox: {
      xMin: 50,
      xMax: 250,
      yMin: 150,
      yMax: 350,
      zMin: -30,
      zMax: 5
    },
    interpolationMethod: 'kriging'
  };

  // 模拟基坑开挖数据
  const mockExcavationData: ExcavationData = {
    geometry: {
      outline: [
        [80, 180],
        [180, 180],
        [180, 280],
        [80, 280]
      ],
      depth: 15,
      stageHeights: [3, 3, 3, 3, 3],
      slopeRatio: 0.5
    },
    stages: [
      {
        id: 'stage_1',
        name: '第一层开挖',
        depth: 3,
        sequence: 1,
        elements: Array.from({length: 500}, (_, i) => ({
          id: i + 2001,
          nodeIds: [i*4+1, i*4+2, i*4+3, i*4+4],
          type: 'tetrahedron' as const,
          materialId: 1
        })),
        nodes: Array.from({length: 2000}, (_, i) => ({
          id: i + 3001,
          coordinates: [
            80 + Math.random() * 100,
            180 + Math.random() * 100,
            -Math.random() * 3
          ] as [number, number, number]
        }))
      },
      {
        id: 'stage_2',
        name: '第二层开挖',
        depth: 6,
        sequence: 2,
        elements: Array.from({length: 600}, (_, i) => ({
          id: i + 2501,
          nodeIds: [i*4+1, i*4+2, i*4+3, i*4+4],
          type: 'tetrahedron' as const,
          materialId: 1
        })),
        nodes: Array.from({length: 2400}, (_, i) => ({
          id: i + 5001,
          coordinates: [
            80 + Math.random() * 100,
            180 + Math.random() * 100,
            -3 - Math.random() * 3
          ] as [number, number, number]
        }))
      }
    ],
    supportStructures: [
      {
        id: 'diaphragm_wall_1',
        type: 'diaphragm_wall',
        geometry: {},
        properties: {}
      }
    ]
  };

  const integrationSteps = [
    {
      title: '数据验证',
      description: '验证几何数据完整性'
    },
    {
      title: '格式转换',
      description: '转换为Fragment格式'
    },
    {
      title: '质量优化',
      description: '执行Fragment优化'
    },
    {
      title: '集成完成',
      description: '数据集成成功'
    }
  ];

  // Fragment数据表格列定义
  const fragmentColumns = [
    {
      title: 'Fragment ID',
      dataIndex: 'fragmentId',
      key: 'fragmentId',
      render: (id: number) => <Tag color="blue">#{id}</Tag>
    },
    {
      title: '类型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      render: (type: string) => (
        <Tag color={type === 'geology' ? 'green' : type === 'excavation' ? 'orange' : 'purple'}>
          {type === 'geology' ? '地质' : type === 'excavation' ? '开挖' : '支护'}
        </Tag>
      )
    },
    {
      title: '材料类型',
      dataIndex: 'materialType',
      key: 'materialType'
    },
    {
      title: '单元数',
      dataIndex: 'elementCount',
      key: 'elementCount',
      render: (count: number) => count.toLocaleString()
    },
    {
      title: '节点数',
      dataIndex: 'nodeCount',
      key: 'nodeCount',
      render: (count: number) => count.toLocaleString()
    },
    {
      title: '质量分数',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      render: (score: number) => (
        <span style={{ 
          color: score > 0.8 ? '#52c41a' : score > 0.6 ? '#faad14' : '#ff4d4f' 
        }}>
          {(score * 100).toFixed(1)}%
        </span>
      )
    }
  ];

  // 执行数据集成
  const executeIntegration = async () => {
    setIntegrationStatus('loading');
    setCurrentStep(0);
    
    try {
      ComponentDevHelper.logDevTip('开始3号-2号数据接口联调');
      
      // 步骤1: 数据验证
      setCurrentStep(0);
      geometryIntegrationService.setGeologyData(mockGeologyData);
      geometryIntegrationService.setExcavationData(mockExcavationData);
      
      const validation = geometryIntegrationService.validateDataIntegrity();
      setValidationResults(validation);
      
      if (!validation.isValid) {
        throw new Error(`数据验证失败: ${validation.issues.join(', ')}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 步骤2: 格式转换
      setCurrentStep(1);
      const fragments = await geometryIntegrationService.convertToFragments();
      setIntegratedFragments(fragments);
      
      const stats = geometryIntegrationService.getDataStatistics();
      setDataStatistics(stats);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 步骤3: Fragment优化
      setCurrentStep(2);
      const optimizationResult = await optimizeFragments(
        fragments,
        {
          targetQuality: 0.85,
          maxIterations: 50,
          memoryLimit: 16384, // 16GB内存限制，适应大规模模型
          parallelProcessing: true
        },
        (progress, status) => {
          setOptimizationProgress(progress);
          ComponentDevHelper.logDevTip(`优化进度: ${progress}% - ${status}`);
        }
      );
      
      if (optimizationResult.success) {
        setIntegratedFragments(optimizationResult.optimizedFragments as IntegratedFragmentData[]);
        ComponentDevHelper.logDevTip(`优化完成: 质量提升${optimizationResult.improvement.toFixed(1)}%`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 步骤4: 完成
      setCurrentStep(3);
      setIntegrationStatus('success');
      
      onDataIntegrated?.(optimizationResult.optimizedFragments as IntegratedFragmentData[]);
      
    } catch (error) {
      console.error('数据集成失败:', error);
      setIntegrationStatus('error');
      ComponentDevHelper.logDevTip(`集成失败: ${error}`);
    }
  };

  useEffect(() => {
    ComponentDevHelper.logDevTip('3号-2号数据接口联调面板已加载');
  }, []);

  return (
    <ModuleErrorBoundary moduleName="数据接口联调">
      <div style={{ padding: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          
          {/* 标题和控制 */}
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ color: 'var(--deepcad-primary)', margin: 0 }}>
                <DatabaseOutlined /> 3号-2号数据接口联调
              </Title>
              <Text style={{ color: 'var(--deepcad-text-secondary)' }}>
                几何专家数据与Fragment优化算法集成测试
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<SyncOutlined />}
                  onClick={executeIntegration}
                  loading={integrationStatus === 'loading'}
                  disabled={integrationStatus === 'loading'}
                >
                  开始集成测试
                </Button>
                <Button
                  icon={<BugOutlined />}
                  onClick={() => {
                    ComponentDevHelper.logDevTip('打开调试模式');
                    console.log('Geometry Data:', mockGeologyData);
                    console.log('Excavation Data:', mockExcavationData);
                    console.log('Integrated Fragments:', integratedFragments);
                  }}
                >
                  调试
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 集成进度 */}
          {integrationStatus === 'loading' && (
            <Card 
              size="small"
              style={{
                background: 'var(--deepcad-bg-secondary)',
                border: '1px solid var(--deepcad-border-primary)'
              }}
            >
              <Steps current={currentStep} items={integrationSteps} />
              {currentStep === 2 && (
                <div style={{ marginTop: '16px' }}>
                  <Progress percent={optimizationProgress} status="active" />
                </div>
              )}
            </Card>
          )}

          {/* 状态提示 */}
          {integrationStatus === 'success' && (
            <Alert
              message="数据集成成功"
              description={`成功生成${integratedFragments.length}个优化Fragment，数据接口联调完成`}
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              closable
            />
          )}

          {integrationStatus === 'error' && (
            <Alert
              message="数据集成失败"
              description="请检查数据格式和网络连接，或查看控制台获取详细错误信息"
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              closable
            />
          )}

          {/* 数据验证结果 */}
          {validationResults.issues.length > 0 && (
            <Alert
              message="数据验证问题"
              description={
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {validationResults.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              }
              type={validationResults.isValid ? 'warning' : 'error'}
              showIcon
            />
          )}

          <Tabs defaultActiveKey="statistics">
            
            {/* 数据统计 */}
            <TabPane tab="数据统计" key="statistics">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="地质层数"
                    value={dataStatistics.geologyLayers || 0}
                    prefix={<EnvironmentOutlined />}
                    valueStyle={{ color: 'var(--deepcad-success)' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="钻孔数量"
                    value={dataStatistics.boreholes || 0}
                    prefix={<DatabaseOutlined />}
                    valueStyle={{ color: 'var(--deepcad-info)' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="开挖阶段"
                    value={dataStatistics.excavationStages || 0}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: 'var(--deepcad-warning)' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="支护结构"
                    value={dataStatistics.supportStructures || 0}
                    prefix={<SettingOutlined />}
                    valueStyle={{ color: 'var(--deepcad-primary)' }}
                  />
                </Col>
              </Row>
              
              <Row gutter={16} style={{ marginTop: '16px' }}>
                <Col span={12}>
                  <Statistic
                    title="总单元数"
                    value={dataStatistics.totalElements || 0}
                    formatter={(value) => Number(value).toLocaleString()}
                    valueStyle={{ color: 'var(--deepcad-text-primary)' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="总节点数"
                    value={dataStatistics.totalNodes || 0}
                    formatter={(value) => Number(value).toLocaleString()}
                    valueStyle={{ color: 'var(--deepcad-text-primary)' }}
                  />
                </Col>
              </Row>
            </TabPane>

            {/* Fragment列表 */}
            <TabPane tab={`Fragment数据 (${integratedFragments.length})`} key="fragments">
              <Table
                columns={fragmentColumns}
                dataSource={integratedFragments}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ y: 400 }}
                style={{
                  background: 'var(--deepcad-bg-secondary)'
                }}
              />
            </TabPane>

          </Tabs>

          {/* 技术状态 */}
          <Card 
            size="small"
            title="🔧 3号-2号联调系统状态"
            style={{
              background: 'var(--deepcad-bg-secondary)',
              border: '1px solid var(--deepcad-border-primary)'
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    ✅ 2号几何专家数据接口完成
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    ✅ 地质+开挖数据格式转换
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    ✅ Fragment优化算法集成
                  </Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    🔄 实时数据验证和转换
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    📊 材料属性传递和保持
                  </Text>
                  <Text style={{ color: 'var(--deepcad-text-secondary)', fontSize: '12px' }}>
                    🎯 质量优化和统计报告
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

export default DataIntegrationPanel;