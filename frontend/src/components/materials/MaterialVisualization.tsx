/**
 * 材料参数可视化组件
 * 提供图表和雷达图等可视化展示
 */

import React, { useMemo } from 'react';
import { Card, Row, Col, Typography, Tag, Space } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, Cell, PieChart, Pie
} from 'recharts';
import {
  GeotechnicalMaterial,
  GeotechnicalMaterialType,
  ConstitutiveModel
} from '../../types/GeotechnicalMaterials';

const { Title, Text } = Typography;

interface Props {
  materials: GeotechnicalMaterial[];
  selectedMaterial?: GeotechnicalMaterial;
}

// 材料类型颜色映射
const MATERIAL_COLORS = {
  [GeotechnicalMaterialType.CLAY]: '#8B4513',
  [GeotechnicalMaterialType.SILT]: '#DDD',
  [GeotechnicalMaterialType.SAND]: '#F4A460',
  [GeotechnicalMaterialType.GRAVEL]: '#696969',
  [GeotechnicalMaterialType.ROCK_HARD]: '#2F4F4F',
  [GeotechnicalMaterialType.ROCK_SOFT]: '#708090',
  [GeotechnicalMaterialType.CONCRETE]: '#A9A9A9',
  [GeotechnicalMaterialType.STEEL]: '#4682B4',
  [GeotechnicalMaterialType.FILL]: '#D2B48C'
};

const MaterialVisualization: React.FC<Props> = ({ materials, selectedMaterial }) => {
  // 处理材料统计数据
  const statisticsData = useMemo(() => {
    const typeStats = materials.reduce((acc, material) => {
      const type = material.type;
      if (!acc[type]) {
        acc[type] = {
          type,
          count: 0,
          avgDensity: 0,
          avgModulus: 0,
          densitySum: 0,
          modulusSum: 0
        };
      }
      acc[type].count++;
      acc[type].densitySum += material.properties.density || 0;
      acc[type].modulusSum += material.properties.elasticModulus || 0;
      acc[type].avgDensity = acc[type].densitySum / acc[type].count;
      acc[type].avgModulus = acc[type].modulusSum / acc[type].count;
      return acc;
    }, {} as any);

    return Object.values(typeStats);
  }, [materials]);

  // 处理参数分布数据
  const parameterDistribution = useMemo(() => {
    return materials.map(material => ({
      name: material.name,
      density: material.properties.density || 0,
      elasticModulus: (material.properties.elasticModulus || 0) / 1000, // 转换为更小的单位便于显示
      poissonRatio: (material.properties.poissonRatio || 0) * 100, // 转换为百分比
      cohesion: material.properties.cohesion || 0,
      frictionAngle: material.properties.frictionAngle || 0,
      type: material.type,
      color: MATERIAL_COLORS[material.type] || '#ccc'
    }));
  }, [materials]);

  // 处理雷达图数据
  const radarData = useMemo(() => {
    if (!selectedMaterial) return [];

    const props = selectedMaterial.properties;
    const normalizeValue = (value: number, min: number, max: number) => {
      return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    };

    return [
      {
        parameter: '密度',
        value: normalizeValue(props.density || 0, 1000, 3000),
        fullMark: 100
      },
      {
        parameter: '弹性模量',
        value: normalizeValue(Math.log10((props.elasticModulus || 1000) / 1000), 0, 5),
        fullMark: 100
      },
      {
        parameter: '泊松比',
        value: normalizeValue((props.poissonRatio || 0) * 100, 0, 50),
        fullMark: 100
      },
      {
        parameter: '粘聚力',
        value: normalizeValue(props.cohesion || 0, 0, 100),
        fullMark: 100
      },
      {
        parameter: '内摩擦角',
        value: normalizeValue(props.frictionAngle || 0, 0, 50),
        fullMark: 100
      },
      {
        parameter: '渗透性',
        value: normalizeValue(-Math.log10(props.permeability || 1e-8), 2, 12),
        fullMark: 100
      }
    ];
  }, [selectedMaterial]);

  // 本构模型分布数据
  const modelDistribution = useMemo(() => {
    const modelStats = materials.reduce((acc, material) => {
      const model = material.constitutiveModel;
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(modelStats).map(([model, count]) => ({
      name: model.replace(/_/g, ' '),
      value: count,
      percentage: ((count / materials.length) * 100).toFixed(1)
    }));
  }, [materials]);

  // 自定义工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '8px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 材料类型统计 */}
        <Col span={12}>
          <Card title="材料类型分布" size="small">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statisticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 本构模型分布 */}
        <Col span={12}>
          <Card title="本构模型分布" size="small">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={modelDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percentage }) => `${percentage}%`}
                >
                  {modelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 360 / modelDistribution.length}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 密度-弹性模量散点图 */}
        <Col span={12}>
          <Card title="密度 vs 弹性模量" size="small">
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart data={parameterDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="density" 
                  name="密度" 
                  unit="kg/m³"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis 
                  dataKey="elasticModulus" 
                  name="弹性模量" 
                  unit="×1000 kPa"
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === '弹性模量' ? `${(value * 1000).toLocaleString()} kPa` : `${value} kg/m³`,
                    name === 'elasticModulus' ? '弹性模量' : '密度'
                  ]}
                  labelFormatter={(label) => `材料: ${label}`}
                />
                <Scatter name="材料" dataKey="elasticModulus">
                  {parameterDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 选中材料的雷达图 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <span>材料参数雷达图</span>
                {selectedMaterial && (
                  <Tag color={MATERIAL_COLORS[selectedMaterial.type]}>
                    {selectedMaterial.name}
                  </Tag>
                )}
              </Space>
            } 
            size="small"
          >
            {selectedMaterial ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="parameter" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 8 }}
                  />
                  <Radar
                    name={selectedMaterial.name}
                    dataKey="value"
                    stroke={MATERIAL_COLORS[selectedMaterial.type]}
                    fill={MATERIAL_COLORS[selectedMaterial.type]}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                height: 250, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#999'
              }}>
                请选择一个材料查看其参数雷达图
              </div>
            )}
          </Card>
        </Col>

        {/* 平均参数对比 */}
        <Col span={24}>
          <Card title="不同材料类型平均参数对比" size="small">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statisticsData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="type" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="avgDensity" fill="#8884d8" name="平均密度 (kg/m³)" />
                <Bar yAxisId="right" dataKey="avgModulus" fill="#82ca9d" name="平均弹性模量 (kPa)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 图表说明 */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Title level={5}>图表说明</Title>
        <Space direction="vertical" size="small">
          <Text>• <strong>材料类型分布:</strong> 显示不同材料类型在库中的数量分布</Text>
          <Text>• <strong>本构模型分布:</strong> 展示各种本构模型的使用比例</Text>
          <Text>• <strong>密度 vs 弹性模量:</strong> 散点图显示材料密度与弹性模量的关系</Text>
          <Text>• <strong>参数雷达图:</strong> 多维度展示选中材料的各项参数相对水平</Text>
          <Text>• <strong>平均参数对比:</strong> 对比不同材料类型的平均密度和弹性模量</Text>
        </Space>
      </Card>
    </div>
  );
};

export default MaterialVisualization;