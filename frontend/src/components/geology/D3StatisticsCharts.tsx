/**
 * D3统计图表组件 - 2号几何专家开发
 * 基于D3.js的专业地质数据统计可视化
 * 提供柱状图、饼图、散点图、箱线图等多种统计图表
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, Select, Space, Typography, Row, Col, Button, Switch, Tooltip } from 'antd';
import { 
  BarChartOutlined, 
  PieChartOutlined, 
  DotChartOutlined,
  LineChartOutlined,
  DownloadOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 统计数据接口
interface StatisticsData {
  layerThickness: LayerThicknessData[];
  soilProperties: SoilPropertiesData[];
  spatialDistribution: SpatialDistributionData[];
  correlation: CorrelationData[];
}

interface LayerThicknessData {
  layerName: string;
  thickness: number;
  soilType: string;
  boreholeId: string;
  x: number;
  y: number;
  color: string;
}

interface SoilPropertiesData {
  layerName: string;
  density: number;
  cohesion: number;
  friction: number;
  permeability: number;
  color: string;
}

interface SpatialDistributionData {
  boreholeId: string;
  x: number;
  y: number;
  layerName: string;
  thickness: number;
  elevation: number;
}

interface CorrelationData {
  property1: string;
  property2: string;
  value: number;
  significance: number;
}

interface D3StatisticsChartsProps {
  data?: StatisticsData;
  onExport?: (format: 'svg' | 'png' | 'pdf') => void;
}

const D3StatisticsCharts: React.FC<D3StatisticsChartsProps> = ({
  data,
  onExport
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'scatter' | 'box'>('bar');
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [showAnimation, setShowAnimation] = useState(true);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 模拟数据
  const mockData: StatisticsData = {
    layerThickness: [
      { layerName: '填土', thickness: 2.3, soilType: '填土', boreholeId: 'BH001', x: 0, y: 0, color: '#FF6B6B' },
      { layerName: '填土', thickness: 2.1, soilType: '填土', boreholeId: 'BH002', x: 50, y: 0, color: '#FF6B6B' },
      { layerName: '填土', thickness: 2.5, soilType: '填土', boreholeId: 'BH003', x: 100, y: 0, color: '#FF6B6B' },
      { layerName: '软土', thickness: 5.3, soilType: '软土', boreholeId: 'BH001', x: 0, y: 0, color: '#4ECDC4' },
      { layerName: '软土', thickness: 4.7, soilType: '软土', boreholeId: 'BH002', x: 50, y: 0, color: '#4ECDC4' },
      { layerName: '软土', thickness: 5.6, soilType: '软土', boreholeId: 'BH003', x: 100, y: 0, color: '#4ECDC4' },
      { layerName: '粘土', thickness: 7.6, soilType: '粘土', boreholeId: 'BH001', x: 0, y: 0, color: '#45B7D1' },
      { layerName: '粘土', thickness: 7.7, soilType: '粘土', boreholeId: 'BH002', x: 50, y: 0, color: '#45B7D1' },
      { layerName: '粘土', thickness: 8.2, soilType: '粘土', boreholeId: 'BH003', x: 100, y: 0, color: '#45B7D1' },
      { layerName: '砂土', thickness: 9.9, soilType: '砂土', boreholeId: 'BH001', x: 0, y: 0, color: '#96CEB4' },
      { layerName: '砂土', thickness: 9.7, soilType: '砂土', boreholeId: 'BH002', x: 50, y: 0, color: '#96CEB4' },
      { layerName: '砂土', thickness: 9.8, soilType: '砂土', boreholeId: 'BH003', x: 100, y: 0, color: '#96CEB4' },
      { layerName: '砾石', thickness: 4.9, soilType: '砾石', boreholeId: 'BH001', x: 0, y: 0, color: '#54A0FF' },
      { layerName: '砾石', thickness: 5.8, soilType: '砾石', boreholeId: 'BH002', x: 50, y: 0, color: '#54A0FF' },
      { layerName: '砾石', thickness: 3.9, soilType: '砾石', boreholeId: 'BH003', x: 100, y: 0, color: '#54A0FF' }
    ],
    soilProperties: [
      { layerName: '填土', density: 1800, cohesion: 10, friction: 15, permeability: 1e-5, color: '#FF6B6B' },
      { layerName: '软土', density: 1700, cohesion: 15, friction: 8, permeability: 1e-7, color: '#4ECDC4' },
      { layerName: '粘土', density: 1900, cohesion: 25, friction: 18, permeability: 1e-8, color: '#45B7D1' },
      { layerName: '砂土', density: 2000, cohesion: 0, friction: 35, permeability: 1e-3, color: '#96CEB4' },
      { layerName: '砾石', density: 2200, cohesion: 0, friction: 42, permeability: 1e-2, color: '#54A0FF' }
    ],
    spatialDistribution: [],
    correlation: []
  };

  // 绘制柱状图
  const drawBarChart = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    // 清空SVG
    d3.select(svg).selectAll('*').remove();

    const containerRect = container.getBoundingClientRect();
    const margin = { top: 40, right: 40, bottom: 80, left: 60 };
    const width = containerRect.width - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    // 设置SVG尺寸
    d3.select(svg)
      .attr('width', containerRect.width)
      .attr('height', 350);

    const g = d3.select(svg)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 聚合数据 - 按地层计算平均厚度
    const aggregatedData = d3.group(mockData.layerThickness, d => d.layerName);
    const chartData = Array.from(aggregatedData, ([key, values]) => ({
      layerName: key,
      avgThickness: d3.mean(values, d => d.thickness) || 0,
      minThickness: d3.min(values, d => d.thickness) || 0,
      maxThickness: d3.max(values, d => d.thickness) || 0,
      count: values.length,
      color: values[0].color
    }));

    // 创建比例尺
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.layerName))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.maxThickness) || 0])
      .range([height, 0]);

    // 绘制柱子
    const bars = g.selectAll('.bar')
      .data(chartData)
      .enter().append('g')
      .attr('class', 'bar');

    // 平均值柱子
    bars.append('rect')
      .attr('x', d => xScale(d.layerName) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', d => d.color)
      .attr('rx', 4)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
        
        // 创建tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'bar-tooltip')
          .style('position', 'absolute')
          .style('padding', '12px')
          .style('background', 'rgba(0,0,0,0.8)')
          .style('color', 'white')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .html(`
            <div><strong>${d.layerName}</strong></div>
            <div>平均厚度: ${d.avgThickness.toFixed(2)}m</div>
            <div>最小厚度: ${d.minThickness.toFixed(2)}m</div>
            <div>最大厚度: ${d.maxThickness.toFixed(2)}m</div>
            <div>钻孔数量: ${d.count}</div>
          `);
          
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        d3.select('.bar-tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
        d3.selectAll('.bar-tooltip').remove();
      });

    // 动画效果
    if (showAnimation) {
      bars.select('rect')
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('y', d => yScale(d.avgThickness))
        .attr('height', d => height - yScale(d.avgThickness));
    } else {
      bars.select('rect')
        .attr('y', d => yScale(d.avgThickness))
        .attr('height', d => height - yScale(d.avgThickness));
    }

    // 添加数值标签
    bars.append('text')
      .attr('x', d => (xScale(d.layerName) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.avgThickness) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(d => d.avgThickness.toFixed(1) + 'm');

    // 添加坐标轴
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => d + 'm');

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '12px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '11px');

    // 添加轴标签
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('厚度 (m)');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('地层类型');

  }, [showAnimation]);

  // 绘制饼图
  const drawPieChart = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    d3.select(svg).selectAll('*').remove();

    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = 350;
    const radius = Math.min(width, height) / 2 - 40;

    d3.select(svg)
      .attr('width', width)
      .attr('height', height);

    const g = d3.select(svg)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // 聚合数据
    const aggregatedData = d3.group(mockData.layerThickness, d => d.layerName);
    const pieData = Array.from(aggregatedData, ([key, values]) => ({
      layerName: key,
      totalThickness: d3.sum(values, d => d.thickness),
      color: values[0].color
    }));

    // 创建饼图生成器
    const pie = d3.pie<typeof pieData[0]>()
      .value(d => d.totalThickness)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    const outerArc = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
      .innerRadius(radius * 1.1)
      .outerRadius(radius * 1.1);

    // 绘制饼图扇形
    const slices = g.selectAll('.slice')
      .data(pie(pieData))
      .enter().append('g')
      .attr('class', 'slice');

    slices.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', function() {
            const centroid = arc.centroid(d);
            return `translate(${centroid[0] * 0.1}, ${centroid[1] * 0.1})`;
          });

        // 创建tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'pie-tooltip')
          .style('position', 'absolute')
          .style('padding', '12px')
          .style('background', 'rgba(0,0,0,0.8)')
          .style('color', 'white')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .html(`
            <div><strong>${d.data.layerName}</strong></div>
            <div>总厚度: ${d.data.totalThickness.toFixed(2)}m</div>
            <div>占比: ${((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1)}%</div>
          `);
          
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', 'translate(0,0)');
        d3.selectAll('.pie-tooltip').remove();
      });

    // 添加标签线和文字
    const labelLines = g.selectAll('.label-line')
      .data(pie(pieData))
      .enter().append('polyline')
      .attr('class', 'label-line')
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .attr('points', d => {
        const pos = outerArc.centroid(d);
        pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
        return [arc.centroid(d), outerArc.centroid(d), pos].join(',');
      });

    const labels = g.selectAll('.label')
      .data(pie(pieData))
      .enter().append('text')
      .attr('class', 'label')
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .style('text-anchor', d => midAngle(d) < Math.PI ? 'start' : 'end')
      .attr('transform', d => {
        const pos = outerArc.centroid(d);
        pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .text(d => `${d.data.layerName} (${d.data.totalThickness.toFixed(1)}m)`);

    function midAngle(d: d3.PieArcDatum<any>) {
      return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    // 动画效果
    if (showAnimation) {
      slices.select('path')
        .transition()
        .duration(800)
        .attrTween('d', function(d) {
          const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return (t: number) => arc(interpolate(t)) || '';
        });
    }

  }, [showAnimation]);

  // 绘制散点图
  const drawScatterChart = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    d3.select(svg).selectAll('*').remove();

    const containerRect = container.getBoundingClientRect();
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = containerRect.width - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    d3.select(svg)
      .attr('width', containerRect.width)
      .attr('height', 350);

    const g = d3.select(svg)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 使用土性参数数据
    const scatterData = mockData.soilProperties;

    // 创建比例尺
    const xScale = d3.scaleLinear()
      .domain(d3.extent(scatterData, d => d.density) as [number, number])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(scatterData, d => d.cohesion) as [number, number])
      .range([height, 0]);

    const radiusScale = d3.scaleSqrt()
      .domain(d3.extent(scatterData, d => d.friction) as [number, number])
      .range([4, 12]);

    // 绘制散点
    const circles = g.selectAll('.scatter-point')
      .data(scatterData)
      .enter().append('circle')
      .attr('class', 'scatter-point')
      .attr('cx', d => xScale(d.density))
      .attr('cy', d => yScale(d.cohesion))
      .attr('r', 0)
      .attr('fill', d => d.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
        
        const tooltip = d3.select('body').append('div')
          .attr('class', 'scatter-tooltip')
          .style('position', 'absolute')
          .style('padding', '12px')
          .style('background', 'rgba(0,0,0,0.8)')
          .style('color', 'white')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .html(`
            <div><strong>${d.layerName}</strong></div>
            <div>密度: ${d.density} kg/m³</div>
            <div>粘聚力: ${d.cohesion} kPa</div>
            <div>内摩擦角: ${d.friction}°</div>
            <div>渗透系数: ${d.permeability.toExponential(2)} m/s</div>
          `);
          
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.8);
        d3.selectAll('.scatter-tooltip').remove();
      });

    // 动画效果
    if (showAnimation) {
      circles
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('r', d => radiusScale(d.friction));
    } else {
      circles.attr('r', d => radiusScale(d.friction));
    }

    // 添加坐标轴
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => d + ' kg/m³');
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => d + ' kPa');

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '11px');

    // 添加轴标签
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('粘聚力 (kPa)');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('密度 (kg/m³)');

    // 添加图例
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('圆圈大小表示内摩擦角');

  }, [showAnimation]);

  // 根据图表类型选择绘制函数
  const drawChart = useCallback(() => {
    switch (chartType) {
      case 'bar':
        drawBarChart();
        break;
      case 'pie':
        drawPieChart();
        break;
      case 'scatter':
        drawScatterChart();
        break;
      default:
        drawBarChart();
    }
  }, [chartType, drawBarChart, drawPieChart, drawScatterChart]);

  // 重绘图表
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // 窗口大小变化时重绘
  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  return (
    <div className="d3-statistics-charts">
      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <Text>图表类型:</Text>
              <Select
                value={chartType}
                onChange={setChartType}
                style={{ width: 160 }}
                size="small"
              >
                <Option value="bar">
                  <Space>
                    <BarChartOutlined />
                    <span>柱状图</span>
                  </Space>
                </Option>
                <Option value="pie">
                  <Space>
                    <PieChartOutlined />
                    <span>饼图</span>
                  </Space>
                </Option>
                <Option value="scatter">
                  <Space>
                    <DotChartOutlined />
                    <span>散点图</span>
                  </Space>
                </Option>
              </Select>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <Text>动画效果:</Text>
              <Switch
                checked={showAnimation}
                onChange={setShowAnimation}
                size="small"
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space style={{ float: 'right' }}>
              <Tooltip title="导出图表">
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => onExport && onExport('svg')}
                >
                  导出
                </Button>
              </Tooltip>
              <Tooltip title="图表设置">
                <Button
                  size="small"
                  icon={<SettingOutlined />}
                >
                  设置
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 图表显示区域 */}
      <Card 
        size="small"
        title={
          <Space>
            {chartType === 'bar' && <BarChartOutlined />}
            {chartType === 'pie' && <PieChartOutlined />}
            {chartType === 'scatter' && <DotChartOutlined />}
            <span>
              {chartType === 'bar' && '地层厚度统计'}
              {chartType === 'pie' && '地层厚度分布'}
              {chartType === 'scatter' && '土性参数关系'}
            </span>
          </Space>
        }
      >
        <div 
          ref={containerRef}
          style={{ 
            width: '100%',
            height: '350px',
            background: '#fafafa',
            borderRadius: '4px',
            border: '1px solid #e8e8e8'
          }}
        >
          <svg
            ref={svgRef}
            style={{ 
              width: '100%',
              height: '100%',
              background: 'white'
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default D3StatisticsCharts;