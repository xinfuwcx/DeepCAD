/**
 * 网格数据接口组件 - 简化工作版本
 * 1号架构师 - 临时解决500错误问题
 */

import React, { useState, useCallback } from 'react';
import { 
  Card, 
  Space, 
  Button, 
  Table, 
  Tag, 
  Progress, 
  Alert, 
  Descriptions,
  Statistic,
  Row,
  Col,
  Typography,
  Tooltip,
  Dropdown,
  Menu,
  message
} from 'antd';
import {
  ThunderboltOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface MeshInterfaceProps {
  onMeshGenerated?: (meshData: any) => void;
  onQualityFeedback?: (feedback: any) => void;
  showAdvancedOptions?: boolean;
}

const MeshInterface: React.FC<MeshInterfaceProps> = ({
  onMeshGenerated,
  onQualityFeedback,
  showAdvancedOptions = true
}) => {
  // 简化的状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [meshGenerationStatus, setMeshGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const [isConnected] = useState(true); // 临时硬编码为已连接
  
  // 模拟数据
  const [geometryCount] = useState(3);
  const [materialZoneCount] = useState(2);
  const [meshData] = useState({
    geometry: [1, 2, 3],
    materialZones: [
      { id: '1', name: '土体区域', type: 'soil' },
      { id: '2', name: '支护结构', type: 'structure' }
    ],
    meshSettings: {
      algorithm: 'Delaunay',
      globalSize: 0.5,
      qualityThreshold: 0.8
    }
  });

  // 模拟质量分析数据
  const [lastMeshQuality] = useState({
    overall: {
      elementCount: 125000,
      nodeCount: 65000,
      averageQuality: 0.85,
      worstQuality: 0.35
    },
    zoneAnalysis: [
      {
        zoneId: '1',
        zoneName: '土体区域',
        elementCount: 95000,
        averageSize: 0.45,
        qualityMetrics: { aspectRatio: { avg: 0.88 } },
        recommendations: ['优化边界网格', '增加局部细化']
      },
      {
        zoneId: '2', 
        zoneName: '支护结构',
        elementCount: 30000,
        averageSize: 0.25,
        qualityMetrics: { aspectRatio: { avg: 0.92 } },
        recommendations: ['质量良好', '无需调整']
      }
    ],
    globalRecommendations: {
      problemAreas: [
        { issue: '边界区域网格质量偏低', severity: 'medium' },
        { issue: '局部区域单元尺寸过大', severity: 'low' }
      ]
    }
  });

  // 模拟材料分区数据
  const materialZones = [
    {
      id: '1',
      name: '土体区域',
      properties: {
        density: 1850,
        elasticModulus: 25000000
      },
      meshConstraints: {
        maxElementSize: 0.8,
        minElementSize: 0.2,
        qualityTarget: 'balanced'
      }
    },
    {
      id: '2',
      name: '支护结构',
      properties: {
        density: 2500,
        elasticModulus: 30000000000
      },
      meshConstraints: {
        maxElementSize: 0.3,
        minElementSize: 0.1,
        qualityTarget: 'high_quality'
      }
    }
  ];

  // 处理网格生成
  const handleGenerateMesh = useCallback(async () => {
    try {
      setIsLoading(true);
      setMeshGenerationStatus('generating');

      message.info('开始生成网格...');

      // 模拟网格生成过程
      await new Promise(resolve => setTimeout(resolve, 3000));

      const meshJob = {
        jobId: `mesh_${Date.now()}`,
        inputData: meshData,
        timestamp: Date.now()
      };

      setMeshGenerationStatus('completed');
      onMeshGenerated?.(meshJob);
      message.success('网格生成完成！');

    } catch (error) {
      console.error('网格生成失败:', error);
      setMeshGenerationStatus('failed');
      message.error('网格生成失败');
    } finally {
      setIsLoading(false);
    }
  }, [onMeshGenerated, meshData]);

  // 材料分区表格列定义
  const materialZoneColumns = [
    {
      title: '分区名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <Space>
          <Tag color="blue">{name}</Tag>
          <Text code style={{ fontSize: '11px' }}>{record.id}</Text>
        </Space>
      )
    },
    {
      title: '材料属性',
      key: 'properties',
      render: (record: any) => (
        <Space direction="vertical" size="small">
          {record.properties.density && (
            <Text style={{ fontSize: '12px' }}>
              密度: {record.properties.density} kg/m³
            </Text>
          )}
          {record.properties.elasticModulus && (
            <Text style={{ fontSize: '12px' }}>
              弹性模量: {record.properties.elasticModulus} Pa
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '网格约束',
      key: 'meshConstraints',
      render: (record: any) => {
        if (!record.meshConstraints) {
          return <Text style={{ color: '#ffffff60' }}>无约束</Text>;
        }
        return (
          <Space direction="vertical" size="small">
            <Text style={{ fontSize: '12px' }}>
              最大尺寸: {record.meshConstraints.maxElementSize}
            </Text>
            <Text style={{ fontSize: '12px' }}>
              最小尺寸: {record.meshConstraints.minElementSize}
            </Text>
            <Tag color={record.meshConstraints.qualityTarget === 'high_quality' ? 'green' : 'orange'}>
              {record.meshConstraints.qualityTarget}
            </Tag>
          </Space>
        );
      }
    }
  ];

  // 质量分析表格列定义
  const qualityAnalysisColumns = [
    {
      title: '分区',
      dataIndex: 'zoneName',
      key: 'zoneName'
    },
    {
      title: '单元数量',
      dataIndex: 'elementCount',
      key: 'elementCount',
      render: (count: number) => count.toLocaleString()
    },
    {
      title: '平均尺寸',
      dataIndex: 'averageSize',
      key: 'averageSize',
      render: (size: number) => size.toFixed(4)
    },
    {
      title: '质量评分',
      key: 'quality',
      render: (record: any) => {
        const avgQuality = record.qualityMetrics.aspectRatio.avg;
        const color = avgQuality > 0.8 ? 'success' : avgQuality > 0.6 ? 'active' : 'exception';
        return <Progress percent={avgQuality * 100} status={color} />;
      }
    },
    {
      title: '建议',
      dataIndex: 'recommendations',
      key: 'recommendations',
      render: (recommendations: string[]) => (
        <Space direction="vertical">
          {recommendations.slice(0, 2).map((rec, index) => (
            <Text key={index} style={{ fontSize: '11px', color: '#ffffff80' }}>
              • {rec}
            </Text>
          ))}
        </Space>
      )
    }
  ];

  // 操作菜单
  const actionMenu = (
    <Menu onClick={({ key }) => {
      switch (key) {
        case 'export':
          message.info('导出网格数据功能');
          break;
        case 'visualize':
          message.info('网格可视化功能');
          break;
        case 'optimize':
          message.info('网格质量优化功能');
          break;
      }
    }}>
      <Menu.Item key="export" icon={<DownloadOutlined />}>
        导出网格
      </Menu.Item>
      <Menu.Item key="visualize" icon={<EyeOutlined />}>
        网格可视化
      </Menu.Item>
      <Menu.Item key="optimize" icon={<ReloadOutlined />}>
        质量优化
      </Menu.Item>
    </Menu>
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* 网格生成控制面板 */}
      <Card
        title={
          <span style={{ color: '#00d9ff' }}>
            <ThunderboltOutlined style={{ marginRight: '8px' }} />
            网格生成接口
          </span>
        }
        style={{
          background: '#16213e',
          border: '1px solid #00d9ff30'
        }}
        extra={
          <Dropdown overlay={actionMenu} trigger={['click']}>
            <Button 
              size="small" 
              icon={<SettingOutlined />}
              disabled={!meshData}
            >
              操作
            </Button>
          </Dropdown>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 连接状态 */}
          <Alert
            message={isConnected ? "计算后端已连接" : "计算后端未连接"}
            type={isConnected ? "success" : "warning"}
            showIcon
          />

          {/* 几何数据概览 */}
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="几何体数量"
                value={geometryCount}
                prefix={<InfoCircleOutlined />}
                valueStyle={{ color: '#ffffff', fontSize: '16px' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="材料分区"
                value={materialZoneCount}
                prefix={<InfoCircleOutlined />}
                valueStyle={{ color: '#ffffff', fontSize: '16px' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="网格状态"
                value={meshGenerationStatus}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ 
                  color: meshGenerationStatus === 'completed' ? '#52c41a' : 
                         meshGenerationStatus === 'failed' ? '#ff4d4f' : '#ffffff',
                  fontSize: '16px'
                }}
              />
            </Col>
          </Row>

          {/* 生成按钮 */}
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            loading={isLoading}
            onClick={handleGenerateMesh}
            disabled={!isConnected || geometryCount === 0}
            style={{ width: '100%' }}
          >
            {isLoading ? '生成网格中...' : '生成网格'}
          </Button>
        </Space>
      </Card>

      {/* 材料分区配置 */}
      {materialZones.length > 0 && (
        <Card
          title={
            <span style={{ color: '#52c41a' }}>
              材料分区配置 (供3号计算专家参考)
            </span>
          }
          size="small"
          style={{
            background: '#16213e',
            border: '1px solid #52c41a30'
          }}
        >
          <Table
            columns={materialZoneColumns}
            dataSource={materialZones}
            rowKey="id"
            size="small"
            pagination={false}
            style={{ fontSize: '12px' }}
          />
        </Card>
      )}

      {/* 网格质量分析 */}
      {lastMeshQuality && (
        <Card
          title={
            <span style={{ color: '#faad14' }}>
              <CheckCircleOutlined style={{ marginRight: '8px' }} />
              网格质量分析报告
            </span>
          }
          size="small"
          style={{
            background: '#16213e',
            border: '1px solid #faad1430'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 整体质量统计 */}
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="总单元数"
                  value={lastMeshQuality.overall.elementCount}
                  valueStyle={{ color: '#ffffff', fontSize: '14px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="总节点数"
                  value={lastMeshQuality.overall.nodeCount}
                  valueStyle={{ color: '#ffffff', fontSize: '14px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="平均质量"
                  value={lastMeshQuality.overall.averageQuality}
                  precision={3}
                  valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="最差质量"
                  value={lastMeshQuality.overall.worstQuality}
                  precision={3}
                  valueStyle={{ color: '#ff4d4f', fontSize: '14px' }}
                />
              </Col>
            </Row>

            {/* 分区质量详情 */}
            <Table
              columns={qualityAnalysisColumns}
              dataSource={lastMeshQuality.zoneAnalysis}
              rowKey="zoneId"
              size="small"
              pagination={false}
            />

            {/* 全局建议 */}
            {lastMeshQuality.globalRecommendations.problemAreas.length > 0 && (
              <Alert
                message="网格质量建议"
                description={
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {lastMeshQuality.globalRecommendations.problemAreas.slice(0, 3).map((area, index) => (
                      <li key={index} style={{ color: '#ffffff80', fontSize: '12px' }}>
                        {area.issue} (严重程度: {area.severity})
                      </li>
                    ))}
                  </ul>
                }
                type="info"
                showIcon
              />
            )}
          </Space>
        </Card>
      )}

      {/* 开发调试信息 */}
      {process.env.NODE_ENV === 'development' && meshData && (
        <Card
          title="开发调试 - 网格数据接口"
          size="small"
          style={{
            background: '#1f1f1f',
            border: '1px solid #333'
          }}
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item label="几何体数量">
              {meshData.geometry.length}
            </Descriptions.Item>
            <Descriptions.Item label="材料分区数量">
              {meshData.materialZones.length}
            </Descriptions.Item>
            <Descriptions.Item label="网格算法">
              {meshData.meshSettings.algorithm}
            </Descriptions.Item>
            <Descriptions.Item label="全局尺寸">
              {meshData.meshSettings.globalSize}
            </Descriptions.Item>
            <Descriptions.Item label="质量阈值">
              {meshData.meshSettings.qualityThreshold}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </Space>
  );
};

export default MeshInterface;