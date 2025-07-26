/**
 * 钻孔数据可视化组件 - 2号几何专家全新开发
 * P0优先级任务 - 专业级钻孔数据展示和分析
 * 基于1号架构师UI开发规划，支持CSV数据解析和质量分析
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Table, Typography, Row, Col, Statistic, Progress, 
  Tag, Space, Tooltip, Switch, Select, Alert, Tabs, Button, 
  Empty, Spin, Modal, Upload, message, Form, InputNumber
} from 'antd';
import { 
  EnvironmentOutlined, LayersOutlined, BarChartOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined,
  EyeOutlined, DownloadOutlined, SettingOutlined, UploadOutlined,
  FileTextOutlined, TableOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// CSV钻孔数据格式 (基于实际数据文件格式)
interface CSVBoreholeRecord {
  钻孔编号: string;
  X坐标: number;
  Y坐标: number;
  地面标高: number;
  钻孔深度: number;
  土层编号: number;
  土层名称: string;
  层顶深度: number;
  层底深度: number;
  土层类型: string;
  颜色代码: string;
  材料参数: string;
}

// 处理后的钻孔数据结构
interface ProcessedBorehole {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  totalDepth: number;
  layers: ProcessedLayer[];
  metadata: {
    totalLayers: number;
    averageLayerThickness: number;
    dominantSoilType: string;
  };
}

interface ProcessedLayer {
  id: string;
  name: string;
  soilType: string;
  topDepth: number;
  bottomDepth: number;
  thickness: number;
  color: string;
  materialParams: string;
}

// 统计分析结果
interface BoreholeStatistics {
  totalBoreholes: number;
  totalLayers: number;
  averageDepth: number;
  depthRange: [number, number];
  spatialExtent: {
    xRange: [number, number];
    yRange: [number, number];
    area: number; // m²
  };
  soilTypeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
    avgThickness: number;
    color: string;
  }>;
  qualityMetrics: {
    dataCompleteness: number; // 0-100
    spatialDensity: number; // 个/km²
    depthConsistency: number; // 0-100
    layerContinuity: number; // 0-100
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  };
}

interface BoreholeDataVisualizationProps {
  csvData?: CSVBoreholeRecord[];
  loading?: boolean;
  onDataProcessed?: (boreholes: ProcessedBorehole[]) => void;
  onStatisticsUpdated?: (stats: BoreholeStatistics) => void;
  onExportRequest?: (format: 'json' | 'csv' | 'dxf') => void;
  show3DControls?: boolean;
}

const BoreholeDataVisualization: React.FC<BoreholeDataVisualizationProps> = ({
  csvData = [],
  loading = false,
  onDataProcessed,
  onStatisticsUpdated,
  onExportRequest,
  show3DControls = true
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'table' | 'statistics' | 'quality'>('overview');
  const [selectedBorehole, setSelectedBorehole] = useState<string>('all');
  const [filterSoilType, setFilterSoilType] = useState<string>('all');
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);

  // 处理CSV数据为结构化钻孔数据
  const processedBoreholes: ProcessedBorehole[] = useMemo(() => {
    if (!csvData || csvData.length === 0) return [];

    // 按钻孔编号分组
    const boreholeGroups = csvData.reduce((groups, record) => {
      const bhId = record.钻孔编号;
      if (!groups[bhId]) {
        groups[bhId] = [];
      }
      groups[bhId].push(record);
      return groups;
    }, {} as Record<string, CSVBoreholeRecord[]>);

    // 转换为ProcessedBorehole格式
    return Object.entries(boreholeGroups).map(([bhId, records]) => {
      const firstRecord = records[0];
      const layers: ProcessedLayer[] = records.map(record => ({
        id: `${bhId}_layer_${record.土层编号}`,
        name: record.土层名称,
        soilType: record.土层类型,
        topDepth: record.层顶深度,
        bottomDepth: record.层底深度,
        thickness: Math.abs(record.层底深度 - record.层顶深度),
        color: record.颜色代码,
        materialParams: record.材料参数
      })).sort((a, b) => a.topDepth - b.topDepth);

      // 计算元数据
      const avgThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0) / layers.length;
      const soilTypeCounts = layers.reduce((counts, layer) => {
        counts[layer.soilType] = (counts[layer.soilType] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      const dominantSoilType = Object.entries(soilTypeCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '未知';

      return {
        id: bhId,
        name: bhId,
        position: {
          x: firstRecord.X坐标,
          y: firstRecord.Y坐标,
          z: firstRecord.地面标高
        },
        totalDepth: Math.abs(firstRecord.钻孔深度),
        layers,
        metadata: {
          totalLayers: layers.length,
          averageLayerThickness: avgThickness,
          dominantSoilType
        }
      };
    });
  }, [csvData]);

  // 计算统计信息
  const statistics: BoreholeStatistics = useMemo(() => {
    if (processedBoreholes.length === 0) {
      return {
        totalBoreholes: 0,
        totalLayers: 0,
        averageDepth: 0,
        depthRange: [0, 0],
        spatialExtent: { xRange: [0, 0], yRange: [0, 0], area: 0 },
        soilTypeDistribution: [],
        qualityMetrics: {
          dataCompleteness: 0,
          spatialDensity: 0,
          depthConsistency: 0,
          layerContinuity: 0,
          overallQuality: 'poor',
          recommendations: ['请导入有效的钻孔数据']
        }
      };
    }

    // 基础统计
    const totalBoreholes = processedBoreholes.length;
    const totalLayers = processedBoreholes.reduce((sum, bh) => sum + bh.layers.length, 0);
    const depths = processedBoreholes.map(bh => bh.totalDepth);
    const averageDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;
    const depthRange: [number, number] = [Math.min(...depths), Math.max(...depths)];

    // 空间范围
    const xCoords = processedBoreholes.map(bh => bh.position.x);
    const yCoords = processedBoreholes.map(bh => bh.position.y);
    const xRange: [number, number] = [Math.min(...xCoords), Math.max(...xCoords)];
    const yRange: [number, number] = [Math.min(...yCoords), Math.max(...yCoords)];
    const area = Math.abs(xRange[1] - xRange[0]) * Math.abs(yRange[1] - yRange[0]);

    // 土层类型分布统计
    const soilTypeStats = new Map<string, { count: number; totalThickness: number; color: string }>();
    processedBoreholes.forEach(bh => {
      bh.layers.forEach(layer => {
        const key = layer.soilType;
        if (!soilTypeStats.has(key)) {
          soilTypeStats.set(key, { count: 0, totalThickness: 0, color: layer.color });
        }
        const stats = soilTypeStats.get(key)!;
        stats.count++;
        stats.totalThickness += layer.thickness;
      });
    });

    const soilTypeDistribution = Array.from(soilTypeStats.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      percentage: (stats.count / totalLayers) * 100,
      avgThickness: stats.totalThickness / stats.count,
      color: stats.color
    })).sort((a, b) => b.count - a.count);

    // 质量评估
    const dataCompleteness = (csvData.filter(record => 
      record.钻孔编号 && record.X坐标 && record.Y坐标 && record.土层名称
    ).length / csvData.length) * 100;

    const spatialDensity = totalBoreholes / (area / 1000000); // 个/km²
    
    const depthVariation = (depthRange[1] - depthRange[0]) / averageDepth;
    const depthConsistency = Math.max(0, 100 - depthVariation * 30);

    // 层位连续性评估 (简化版)
    const layerNames = new Set(processedBoreholes.flatMap(bh => bh.layers.map(l => l.name)));
    const layerContinuityScore = Array.from(layerNames).map(layerName => {
      const boreholeWithLayer = processedBoreholes.filter(bh => 
        bh.layers.some(l => l.name === layerName)
      ).length;
      return boreholeWithLayer / totalBoreholes;
    });
    const layerContinuity = (layerContinuityScore.reduce((sum, score) => sum + score, 0) / layerContinuityScore.length) * 100;

    // 综合质量评估
    const overallScore = (dataCompleteness + Math.min(spatialDensity * 20, 100) + depthConsistency + layerContinuity) / 4;
    let overallQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (overallScore >= 85) overallQuality = 'excellent';
    else if (overallScore >= 70) overallQuality = 'good';
    else if (overallScore >= 50) overallQuality = 'fair';

    // 改进建议
    const recommendations: string[] = [];
    if (dataCompleteness < 95) recommendations.push('建议补充缺失的土层信息和坐标数据');
    if (spatialDensity < 0.5) recommendations.push('钻孔密度偏低，建议增加勘察点位');
    if (depthConsistency < 70) recommendations.push('钻孔深度差异较大，建议统一勘察深度');
    if (layerContinuity < 60) recommendations.push('地层连续性较差，建议检查地层划分标准');
    if (overallQuality === 'excellent') recommendations.push('数据质量优秀，适合进行RBF三维重建');

    return {
      totalBoreholes,
      totalLayers,
      averageDepth,
      depthRange,
      spatialExtent: { xRange, yRange, area },
      soilTypeDistribution,
      qualityMetrics: {
        dataCompleteness,
        spatialDensity,
        depthConsistency,
        layerContinuity,
        overallQuality,
        recommendations
      }
    };
  }, [processedBoreholes, csvData]);

  // 通知外部组件数据变化
  useEffect(() => {
    if (onDataProcessed && processedBoreholes.length > 0) {
      onDataProcessed(processedBoreholes);
    }
  }, [processedBoreholes, onDataProcessed]);

  useEffect(() => {
    if (onStatisticsUpdated) {
      onStatisticsUpdated(statistics);
    }
  }, [statistics, onStatisticsUpdated]);

  // 过滤数据
  const filteredBoreholes = useMemo(() => {
    let result = processedBoreholes;
    
    if (selectedBorehole !== 'all') {
      result = result.filter(bh => bh.id === selectedBorehole);
    }
    
    if (filterSoilType !== 'all') {
      result = result.filter(bh => 
        bh.layers.some(layer => layer.soilType === filterSoilType)
      );
    }
    
    return result;
  }, [processedBoreholes, selectedBorehole, filterSoilType]);

  // 表格列定义
  const tableColumns = [
    {
      title: '钻孔编号',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 120,
      render: (text: string) => (
        <Space>
          <EnvironmentOutlined style={{ color: 'var(--primary-color)' }} />
          <Text strong style={{ color: 'var(--primary-color)' }}>{text}</Text>
        </Space>
      )
    },
    {
      title: '坐标位置',
      key: 'coordinates',
      width: 150,
      render: (_: any, record: ProcessedBorehole) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: '11px' }}>X: {record.position.x.toFixed(1)}</Text>
          <Text style={{ fontSize: '11px' }}>Y: {record.position.y.toFixed(1)}</Text>
          <Text style={{ fontSize: '11px' }}>Z: {record.position.z.toFixed(1)}</Text>
        </Space>
      )
    },
    {
      title: '钻孔深度',
      dataIndex: 'totalDepth',
      key: 'totalDepth',
      width: 100,
      render: (depth: number) => (
        <Tag color="blue">{depth.toFixed(1)}m</Tag>
      ),
      sorter: (a: ProcessedBorehole, b: ProcessedBorehole) => a.totalDepth - b.totalDepth
    },
    {
      title: '地层信息',
      key: 'layers',
      width: 200,
      render: (_: any, record: ProcessedBorehole) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '12px' }}>{record.metadata.totalLayers}层</Text>
          <Text style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            主要土质: {record.metadata.dominantSoilType}
          </Text>
          <Text style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            平均层厚: {record.metadata.averageLayerThickness.toFixed(1)}m
          </Text>
        </Space>
      )
    },
    {
      title: '土层详情',
      key: 'layerDetails',
      render: (_: any, record: ProcessedBorehole) => (
        <div style={{ maxWidth: '300px' }}>
          {record.layers.slice(0, 3).map(layer => (
            <div key={layer.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
              <div 
                style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: layer.color,
                  marginRight: '6px',
                  borderRadius: '2px'
                }} 
              />
              <Text style={{ fontSize: '10px' }}>
                {layer.name} ({layer.thickness.toFixed(1)}m)
              </Text>
            </div>
          ))}
          {record.layers.length > 3 && (
            <Text style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              ...还有{record.layers.length - 3}层
            </Text>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: ProcessedBorehole) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="link" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleBoreholeDetails(record)}
            />
          </Tooltip>
          <Tooltip title="3D显示">
            <Button 
              type="link" 
              size="small" 
              icon={<InfoCircleOutlined />}
              onClick={() => handle3DView(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const handleBoreholeDetails = (borehole: ProcessedBorehole) => {
    console.log('查看钻孔详情:', borehole.name);
    // 显示钻孔详情模态框 - 集成到钻孔详情组件
    message.info(`查看 ${borehole.name} 详细信息`);
  };

  const handle3DView = (borehole: ProcessedBorehole) => {
    console.log('3D显示钻孔:', borehole.name);
    // 在3D视窗中高亮显示钻孔 - 调用3D可视化服务
    message.info(`在3D视图中定位 ${borehole.name}`);
  };

  const handleExport = (format: 'json' | 'csv' | 'dxf') => {
    if (onExportRequest) {
      onExportRequest(format);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>正在处理钻孔数据...</Text>
        </div>
      </div>
    );
  }

  if (!csvData || csvData.length === 0) {
    return (
      <Card>
        <Empty 
          description="暂无钻孔数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            导入钻孔数据
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <div className="borehole-data-visualization">
      {/* 概览卡片 */}
      <Card size="small" style={{ marginBottom: '12px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="钻孔总数"
              value={statistics.totalBoreholes}
              suffix="个"
              valueStyle={{ fontSize: '18px', color: 'var(--primary-color)' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="土层总数"
              value={statistics.totalLayers}
              suffix="层"
              valueStyle={{ fontSize: '18px', color: 'var(--success-color)' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均深度"
              value={statistics.averageDepth}
              precision={1}
              suffix="m"
              valueStyle={{ fontSize: '18px', color: 'var(--warning-color)' }}
            />
          </Col>
          <Col span={6}>
            <div>
              <Text style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>数据质量</Text>
              <div style={{ marginTop: '4px' }}>
                <Progress
                  percent={statistics.qualityMetrics.dataCompleteness}
                  size="small"
                  status={
                    statistics.qualityMetrics.overallQuality === 'excellent' ? 'success' :
                    statistics.qualityMetrics.overallQuality === 'good' ? 'active' : 'exception'
                  }
                  format={() => (
                    <Text style={{ fontSize: '12px' }}>
                      {statistics.qualityMetrics.overallQuality === 'excellent' ? '优秀' :
                       statistics.qualityMetrics.overallQuality === 'good' ? '良好' :
                       statistics.qualityMetrics.overallQuality === 'fair' ? '一般' : '待改进'}
                    </Text>
                  )}
                />
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: '12px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <Text>筛选钻孔:</Text>
              <Select
                value={selectedBorehole}
                onChange={setSelectedBorehole}
                style={{ width: 120 }}
                size="small"
              >
                <Option value="all">全部</Option>
                {processedBoreholes.map(bh => (
                  <Option key={bh.id} value={bh.id}>{bh.name}</Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <Text>土层类型:</Text>
              <Select
                value={filterSoilType}
                onChange={setFilterSoilType}
                style={{ width: 120 }}
                size="small"
              >
                <Option value="all">全部</Option>
                {statistics.soilTypeDistribution.map(soil => (
                  <Option key={soil.type} value={soil.type}>
                    {soil.type}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col span={8}>
            <Space style={{ float: 'right' }}>
              <Tooltip title="高级统计">
                <Switch
                  checked={showAdvancedStats}
                  onChange={setShowAdvancedStats}
                  size="small"
                />
              </Tooltip>
              {show3DControls && (
                <Button size="small" icon={<EyeOutlined />}>
                  3D视图
                </Button>
              )}
              <Button 
                size="small" 
                icon={<DownloadOutlined />}
                onClick={() => handleExport('csv')}
              >
                导出
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 高级统计面板 */}
      {showAdvancedStats && (
        <Card size="small" style={{ marginBottom: '12px' }}>
          <Title level={5} style={{ margin: '0 0 12px 0' }}>
            <BarChartOutlined /> 质量分析详情
          </Title>
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={statistics.qualityMetrics.dataCompleteness}
                  size={60}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '12px' }}>数据完整性</Text>
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={Math.min(statistics.qualityMetrics.spatialDensity * 20, 100)}
                  size={60}
                  format={() => `${statistics.qualityMetrics.spatialDensity.toFixed(1)}`}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '12px' }}>空间密度 (个/km²)</Text>
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={statistics.qualityMetrics.depthConsistency}
                  size={60}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '12px' }}>深度一致性</Text>
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={statistics.qualityMetrics.layerContinuity}
                  size={60}
                  format={(percent) => `${percent?.toFixed(0)}%`}
                />
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '12px' }}>层位连续性</Text>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab as any} size="small">
        <TabPane tab="数据表格" key="table">
          <Card size="small">
            <Table
              columns={tableColumns}
              dataSource={filteredBoreholes}
              rowKey="id"
              size="small"
              scroll={{ x: 1200, y: 400 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个钻孔`
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="统计分析" key="statistics">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="土层类型分布" size="small">
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {statistics.soilTypeDistribution.map((soil, index) => (
                    <div key={index} style={{ marginBottom: '12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '4px' 
                      }}>
                        <Space>
                          <div 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              backgroundColor: soil.color,
                              borderRadius: '2px'
                            }} 
                          />
                          <Text style={{ fontSize: '12px' }}>{soil.type}</Text>
                        </Space>
                        <Text style={{ fontSize: '12px' }}>
                          {soil.percentage.toFixed(1)}% ({soil.count}层)
                        </Text>
                      </div>
                      <Progress 
                        percent={soil.percentage} 
                        size="small"
                        strokeColor={soil.color}
                        showInfo={false}
                      />
                      <Text style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        平均厚度: {soil.avgThickness.toFixed(1)}m
                      </Text>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="空间分布信息" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>X方向范围: </Text>
                    <Text>{statistics.spatialExtent.xRange[0].toFixed(1)}m ~ {statistics.spatialExtent.xRange[1].toFixed(1)}m</Text>
                  </div>
                  <div>
                    <Text strong>Y方向范围: </Text>
                    <Text>{statistics.spatialExtent.yRange[0].toFixed(1)}m ~ {statistics.spatialExtent.yRange[1].toFixed(1)}m</Text>
                  </div>
                  <div>
                    <Text strong>深度范围: </Text>
                    <Text>{statistics.depthRange[0].toFixed(1)}m ~ {statistics.depthRange[1].toFixed(1)}m</Text>
                  </div>
                  <div>
                    <Text strong>覆盖面积: </Text>
                    <Text>{(statistics.spatialExtent.area / 10000).toFixed(2)} 公顷</Text>
                  </div>
                  <div>
                    <Text strong>空间密度: </Text>
                    <Text>{statistics.qualityMetrics.spatialDensity.toFixed(2)} 个/km²</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="质量评估" key="quality">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert
                message={`数据质量评估: ${
                  statistics.qualityMetrics.overallQuality === 'excellent' ? '优秀' :
                  statistics.qualityMetrics.overallQuality === 'good' ? '良好' :
                  statistics.qualityMetrics.overallQuality === 'fair' ? '一般' : '待改进'
                }`}
                description="基于数据完整性、空间密度、深度一致性和层位连续性的综合评估"
                type={
                  statistics.qualityMetrics.overallQuality === 'excellent' ? 'success' :
                  statistics.qualityMetrics.overallQuality === 'good' ? 'info' :
                  statistics.qualityMetrics.overallQuality === 'fair' ? 'warning' : 'error'
                }
                showIcon
                style={{ marginBottom: '16px' }}
              />
            </Col>
            
            <Col span={24}>
              <Card title="改进建议" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {statistics.qualityMetrics.recommendations.map((recommendation, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                      {statistics.qualityMetrics.overallQuality === 'excellent' ? (
                        <CheckCircleOutlined style={{ color: 'var(--success-color)', marginRight: '8px' }} />
                      ) : (
                        <ExclamationCircleOutlined style={{ color: 'var(--warning-color)', marginRight: '8px' }} />
                      )}
                      <Text>{recommendation}</Text>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default BoreholeDataVisualization;