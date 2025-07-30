import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Upload, Button, Table, message, Space, Modal, Row, Col, Divider, Switch } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, ToolOutlined, EditOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

interface ExcavationStage {
  id: string;
  name: string;
  depth: number;
  sequence: number;
  duration: number; // 施工天数
  description: string;
}

interface ExcavationData {
  id: string;
  name: string;
  excavationType: 'foundation' | 'basement' | 'tunnel' | 'slope';
  totalDepth: number;
  area: number;
  slopeRatio: number;
  drainageSystem: boolean;
  stages: ExcavationStage[];
  coordinates: Array<{x: number, y: number}>;
}

const ExcavationDesign: React.FC = () => {
  const [form] = Form.useForm();
  const [stageForm] = Form.useForm();
  const [excavations, setExcavations] = useState<ExcavationData[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [stageModalVisible, setStageModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedExcavation, setSelectedExcavation] = useState<ExcavationData | null>(null);
  const [selectedStage, setSelectedStage] = useState<ExcavationStage | null>(null);
  const [designParams, setDesignParams] = useState({
    safetyFactor: 1.5,
    groundwaterLevel: -5,
    temporarySlope: true,
    supportRequired: true
  });

  // 示例开挖数据
  const sampleExcavations: ExcavationData[] = [
    {
      id: '1',
      name: '主体基坑',
      excavationType: 'foundation',
      totalDepth: 15,
      area: 2400,
      slopeRatio: 0.5,
      drainageSystem: true,
      coordinates: [
        {x: 0, y: 0}, {x: 60, y: 0}, {x: 60, y: 40}, {x: 0, y: 40}
      ],
      stages: [
        {
          id: '1-1',
          name: '第一层开挖',
          depth: 3,
          sequence: 1,
          duration: 5,
          description: '开挖至-3m，安装第一道支撑'
        },
        {
          id: '1-2', 
          name: '第二层开挖',
          depth: 8,
          sequence: 2,
          duration: 7,
          description: '开挖至-8m，安装第二道支撑'
        },
        {
          id: '1-3',
          name: '第三层开挖',
          depth: 15,
          sequence: 3,
          duration: 10,
          description: '开挖至基底-15m，准备基础施工'
        }
      ]
    },
    {
      id: '2',
      name: '车库基坑',
      excavationType: 'basement',
      totalDepth: 6,
      area: 800,
      slopeRatio: 0.3,
      drainageSystem: false,
      coordinates: [
        {x: 80, y: 10}, {x: 120, y: 10}, {x: 120, y: 30}, {x: 80, y: 30}
      ],
      stages: [
        {
          id: '2-1',
          name: '整体开挖',
          depth: 6,
          sequence: 1,
          duration: 8,
          description: '一次性开挖至-6m'
        }
      ]
    }
  ];

  React.useEffect(() => {
    setExcavations(sampleExcavations);
  }, []);

  const handleAddExcavation = () => {
    setSelectedExcavation(null);
    setModalType('add');
    setModalVisible(true);
    form.resetFields();
  };

  const handleEditExcavation = (excavation: ExcavationData) => {
    setSelectedExcavation(excavation);
    setModalType('edit');
    setModalVisible(true);
    form.setFieldsValue(excavation);
  };

  const handleDeleteExcavation = (id: string) => {
    setExcavations(excavations.filter(e => e.id !== id));
    message.success('开挖方案删除成功');
  };

  const handleAddStage = (excavation: ExcavationData) => {
    setSelectedExcavation(excavation);
    setSelectedStage(null);
    setStageModalVisible(true);
    stageForm.resetFields();
  };

  const handleEditStage = (excavation: ExcavationData, stage: ExcavationStage) => {
    setSelectedExcavation(excavation);
    setSelectedStage(stage);
    setStageModalVisible(true);
    stageForm.setFieldsValue(stage);
  };

  const handleGenerateExcavation = async () => {
    try {
      message.loading('正在使用2号专家高级算法生成开挖三维模型...', 0);
      
      // 检查是否有选中的开挖方案
      if (excavations.length === 0) {
        message.error('请先创建开挖方案');
        return;
      }

      // 动态导入2号专家的高级几何算法集成服务
      const { geometryAlgorithmIntegration } = await import('../../services/GeometryAlgorithmIntegration');
      
      // 使用第一个开挖方案进行建模
      const selectedExcavation = excavations[0];
      
      // 准备高级设计参数（集成2号专家的算法配置）
      const advancedDesignParameters = {
        safetyFactor: designParams.safetyFactor,
        groundwaterLevel: designParams.groundwaterLevel,
        temporarySlope: designParams.temporarySlope,
        supportRequired: designParams.supportRequired,
        // 2号专家的高级几何处理配置
        geometryProcessing: {
          meshOptimization: true,
          qualityAssessment: true,
          precisionMode: 'high' as const,
          fragmentStandards: {
            targetMeshSize: 1.8,
            minElementQuality: 0.65,
            maxElementCount: 2000000
          }
        },
        // 启用DXF几何处理（如果有设计图纸）
        cadProcessing: {
          enableDXFParsing: true,
          geometryOptimization: true,
          parallelProcessing: true
        }
      };

      console.log('🏗️ 使用2号专家高级算法开始生成开挖几何模型...');
      
      // 调用2号专家的增强开挖几何生成算法
      const result = await geometryAlgorithmIntegration.generateAdvancedExcavationGeometry(
        selectedExcavation,
        advancedDesignParameters
      );

      message.destroy(); // 清除loading消息

      if (result.success) {
        // 显示成功结果，包含2号专家的质量评估信息
        message.success({
          content: (
            <div>
              <div>🎯 2号专家开挖模型生成完成！</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                体积: {result.excavationVolume.toFixed(2)}m³ | 
                表面积: {result.surfaceArea.toFixed(2)}m² | 
                阶段数: {result.stages.length}
              </div>
              <div style={{ fontSize: '11px', color: '#52c41a', marginTop: '2px' }}>
                质量评分: {result.qualityScore?.toFixed(1) || 'N/A'}/100 | 
                网格精度: ±{result.meshAccuracy?.toFixed(3) || '0.001'}m
              </div>
            </div>
          ),
          duration: 8
        });

        // 触发增强的3D视口更新事件，包含质量和性能数据
        const customEvent = new CustomEvent('advancedExcavationModelGenerated', {
          detail: {
            geometryId: result.geometryId,
            excavationData: selectedExcavation,
            geometryResult: result,
            qualityMetrics: result.qualityMetrics,
            performanceMetrics: result.performanceMetrics,
            algorithmInfo: {
              expertId: '2号几何专家',
              algorithmVersion: 'v2.0.0',
              processingTime: result.processingTime
            }
          }
        });
        window.dispatchEvent(customEvent);

        // 显示2号专家的专业建议和警告
        if (result.expertRecommendations && result.expertRecommendations.length > 0) {
          setTimeout(() => {
            result.expertRecommendations.forEach((recommendation: string) => {
              message.info(`💡 专家建议: ${recommendation}`, 6);
            });
          }, 1000);
        }

        // 显示警告信息（如果有）
        if (result.warnings.length > 0) {
          setTimeout(() => {
            result.warnings.forEach(warning => {
              message.warning(`⚠️ ${warning}`, 4);
            });
          }, 2000);
        }

        console.log('✅ 2号专家开挖几何模型生成成功:', result);
        
      } else {
        message.error('开挖模型生成失败: ' + result.warnings.join(', '));
      }

    } catch (error) {
      message.destroy();
      console.error('❌ 2号专家开挖模型生成失败:', error);
      message.error(`模型生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const excavationColumns = [
    {
      title: '基坑名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span style={{ color: '#00d9ff', fontWeight: 'bold' }}>{text}</span>
      )
    },
    {
      title: '类型',
      dataIndex: 'excavationType',
      key: 'excavationType',
      render: (type: string) => {
        const typeMap = {
          foundation: '基础基坑',
          basement: '地下室',
          tunnel: '隧道',
          slope: '边坡'
        };
        return typeMap[type as keyof typeof typeMap];
      }
    },
    {
      title: '总深度 (m)',
      dataIndex: 'totalDepth',
      key: 'totalDepth'
    },
    {
      title: '面积 (m²)',
      dataIndex: 'area',
      key: 'area'
    },
    {
      title: '分层数',
      key: 'stages',
      render: (record: ExcavationData) => record.stages.length
    },
    {
      title: '排水系统',
      dataIndex: 'drainageSystem',
      key: 'drainageSystem',
      render: (drainage: boolean) => (
        <span style={{ color: drainage ? '#52c41a' : '#ff4d4f' }}>
          {drainage ? '已配置' : '未配置'}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (record: ExcavationData) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => {
              setSelectedExcavation(record);
              setModalType('view');
              setModalVisible(true);
            }}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEditExcavation(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            icon={<PlusOutlined />}
            onClick={() => handleAddStage(record)}
          >
            分层
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteExcavation(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const stageColumns = [
    {
      title: '序号',
      dataIndex: 'sequence',
      key: 'sequence'
    },
    {
      title: '阶段名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '开挖深度 (m)',
      dataIndex: 'depth',
      key: 'depth'
    },
    {
      title: '施工天数',
      dataIndex: 'duration',
      key: 'duration'
    },
    {
      title: '操作',
      key: 'action',
      render: (record: ExcavationStage) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => selectedExcavation && handleEditStage(selectedExcavation, record)}
          >
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* 头部信息 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#00d9ff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ToolOutlined />
          基坑开挖设计
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
          设计基坑开挖方案和分层施工计划
        </p>
      </div>

      {/* 开挖方案管理 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>开挖方案</h4>
          <Space>
            <Upload capture={false}
                    hasControlInside={false}
                    pastable={false}
                    accept=".dxf,.dwg,.json">
              <Button icon={<UploadOutlined />} style={{ color: '#ffffff', borderColor: 'rgba(0,217,255,0.5)' }}>
                导入设计图纸
              </Button>
            </Upload>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddExcavation}
              style={{ background: '#00d9ff', borderColor: '#00d9ff' }}
            >
              新建开挖
            </Button>
          </Space>
        </div>

        <Table
          columns={excavationColumns}
          dataSource={excavations}
          rowKey="id"
          size="small"
          style={{ background: 'rgba(26, 26, 46, 0.6)' }}
          pagination={{ pageSize: 5 }}
        />
      </div>

      {/* 设计参数 */}
      <Row gutter={24}>
        <Col span={12}>
          <div style={{ 
            background: 'rgba(26, 26, 46, 0.6)', 
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 16px 0' }}>设计参数</h4>
            <Form layout="vertical" size="small">
              <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>安全系数</span>}>
                <InputNumber 
                  min={1.0} 
                  max={3.0} 
                  step={0.1} 
                  value={designParams.safetyFactor}
                  onChange={(value) => setDesignParams({...designParams, safetyFactor: value || 1.5})}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>地下水位 (m)</span>}>
                <InputNumber 
                  value={designParams.groundwaterLevel}
                  onChange={(value) => setDesignParams({...designParams, groundwaterLevel: value || -5})}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>临时边坡</span>}>
                <Switch 
                  checked={designParams.temporarySlope}
                  onChange={(checked) => setDesignParams({...designParams, temporarySlope: checked})}
                />
              </Form.Item>
              <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>需要支护</span>}>
                <Switch 
                  checked={designParams.supportRequired}
                  onChange={(checked) => setDesignParams({...designParams, supportRequired: checked})}
                />
              </Form.Item>
            </Form>
          </div>
        </Col>

        <Col span={12}>
          <div style={{ 
            background: 'rgba(26, 26, 46, 0.6)', 
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h4 style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 16px 0' }}>开挖预览</h4>
            <div style={{ 
              height: '200px', 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed rgba(0,217,255,0.3)'
            }}>
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <ToolOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                <div>开挖模型将在此显示</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>包括分层开挖和支护结构</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* 生成模型按钮 */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Button 
          type="primary" 
          size="large"
          onClick={handleGenerateExcavation}
          style={{ 
            background: '#00d9ff', 
            borderColor: '#00d9ff',
            padding: '8px 32px',
            height: 'auto'
          }}
        >
          生成开挖三维模型
        </Button>
      </div>

      {/* 开挖详情模态框 */}
      <Modal
        title={`${modalType === 'add' ? '新建' : modalType === 'edit' ? '编辑' : '查看'}开挖方案`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={modalType === 'view' ? [
          <Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>
        ] : [
          <Button key="cancel" onClick={() => setModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={() => setModalVisible(false)}>保存</Button>
        ]}
        width={800}
      >
        {modalType === 'view' && selectedExcavation ? (
          <div>
            <h4>基本信息</h4>
            <Row gutter={16}>
              <Col span={8}><strong>名称:</strong> {selectedExcavation.name}</Col>
              <Col span={8}><strong>类型:</strong> {selectedExcavation.excavationType}</Col>
              <Col span={8}><strong>总深度:</strong> {selectedExcavation.totalDepth}m</Col>
            </Row>
            <br />
            <Row gutter={16}>
              <Col span={8}><strong>面积:</strong> {selectedExcavation.area}m²</Col>
              <Col span={8}><strong>边坡比:</strong> {selectedExcavation.slopeRatio}</Col>
              <Col span={8}><strong>排水:</strong> {selectedExcavation.drainageSystem ? '是' : '否'}</Col>
            </Row>
            
            <Divider />
            <h4>分层开挖计划</h4>
            <Table
              columns={stageColumns}
              dataSource={selectedExcavation.stages}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="基坑名称" name="name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="开挖类型" name="excavationType" rules={[{ required: true }]}>
                  <Select>
                    <Option value="foundation">基础基坑</Option>
                    <Option value="basement">地下室</Option>
                    <Option value="tunnel">隧道</Option>
                    <Option value="slope">边坡</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="总深度 (m)" name="totalDepth" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="面积 (m²)" name="area" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="边坡比" name="slopeRatio">
                  <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="排水系统" name="drainageSystem" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 分层开挖模态框 */}
      <Modal
        title="分层开挖设置"
        open={stageModalVisible}
        onCancel={() => setStageModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setStageModalVisible(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={() => setStageModalVisible(false)}>保存</Button>
        ]}
      >
        <Form form={stageForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="阶段名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="开挖序号" name="sequence" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="开挖深度 (m)" name="depth" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="施工天数" name="duration" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="施工说明" name="description">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExcavationDesign;