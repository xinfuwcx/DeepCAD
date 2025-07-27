import React, { useEffect, useRef, useState } from 'react';
import { Card, Space, Tag, Button, Typography } from 'antd';
import { LineChartOutlined, FullscreenOutlined, ReloadOutlined } from '@ant-design/icons';
import * as d3 from 'd3';

const { Text } = Typography;

interface DataPoint {
  time: string;
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
}

interface AdvancedPerformanceChartProps {
  title: string;
  data: DataPoint[];
  height?: number;
  realTime?: boolean;
}

export const AdvancedPerformanceChart: React.FC<AdvancedPerformanceChartProps> = ({
  title,
  data,
  height = 300,
  realTime = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredData, setHoveredData] = useState<DataPoint | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState(['cpu', 'memory', 'gpu', 'network']);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 时间解析器
    const parseTime = d3.timeParse("%H:%M");
    const formatTime = d3.timeFormat("%H:%M");

    const processedData = data.map(d => ({
      ...d,
      parsedTime: parseTime(d.time) || new Date()
    }));

    // 比例尺
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData, d => d.parsedTime) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([chartHeight, 0]);

    // 颜色映射
    const colorMap = {
      cpu: '#00d9ff',
      memory: '#10b981',
      gpu: '#8b5cf6',
      network: '#f59e0b'
    };

    // 渐变定义
    const defs = svg.append("defs");
    Object.entries(colorMap).forEach(([key, color]) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `gradient-${key}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", chartHeight)
        .attr("x2", 0).attr("y2", 0);

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color)
        .attr("stop-opacity", 0.1);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color)
        .attr("stop-opacity", 0.6);
    });

    // 网格线
    g.selectAll(".grid-line-x")
      .data(xScale.ticks(6))
      .enter().append("line")
      .attr("class", "grid-line-x")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-dasharray", "2,2");

    g.selectAll(".grid-line-y")
      .data(yScale.ticks(5))
      .enter().append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-dasharray", "2,2");

    // 线条和区域生成器
    const line = d3.line<any>()
      .x(d => xScale(d.parsedTime))
      .y(d => yScale(d.value))
      .curve(d3.curveCardinal);

    const area = d3.area<any>()
      .x(d => xScale(d.parsedTime))
      .y0(chartHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveCardinal);

    // 绘制每个指标
    selectedMetrics.forEach(metric => {
      const metricData = processedData.map(d => ({
        parsedTime: d.parsedTime,
        value: d[metric as keyof DataPoint] as number
      }));

      // 区域填充
      g.append("path")
        .datum(metricData)
        .attr("fill", `url(#gradient-${metric})`)
        .attr("d", area);

      // 线条
      g.append("path")
        .datum(metricData)
        .attr("fill", "none")
        .attr("stroke", colorMap[metric as keyof typeof colorMap])
        .attr("stroke-width", 2)
        .attr("d", line);

      // 数据点
      g.selectAll(`.dot-${metric}`)
        .data(metricData)
        .enter().append("circle")
        .attr("class", `dot-${metric}`)
        .attr("cx", d => xScale(d.parsedTime))
        .attr("cy", d => yScale(d.value))
        .attr("r", 0)
        .attr("fill", colorMap[metric as keyof typeof colorMap])
        .transition()
        .duration(500)
        .attr("r", 3);
    });

    // 坐标轴
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(formatTime as any)
        .ticks(6))
      .selectAll("text")
      .style("fill", "#a0a0a0")
      .style("font-family", "JetBrains Mono");

    g.append("g")
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => d + "%"))
      .selectAll("text")
      .style("fill", "#a0a0a0")
      .style("font-family", "JetBrains Mono");

    // 样式化坐标轴
    g.selectAll(".domain, .tick line")
      .style("stroke", "rgba(255,255,255,0.3)");

    // 鼠标悬停
    const tooltip = g.append("g")
      .attr("class", "tooltip")
      .style("display", "none");

    const tooltipRect = tooltip.append("rect")
      .attr("fill", "rgba(0,0,0,0.8)")
      .attr("stroke", "#00d9ff")
      .attr("stroke-width", 1)
      .attr("rx", 4);

    const tooltipText = tooltip.append("text")
      .attr("fill", "white")
      .attr("font-family", "JetBrains Mono")
      .attr("font-size", "12px");

    const overlay = g.append("rect")
      .attr("width", width)
      .attr("height", chartHeight)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mouseover", () => tooltip.style("display", null))
      .on("mouseout", () => tooltip.style("display", "none"))
      .on("mousemove", function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);
        
        // 找到最近的数据点
        const bisectDate = d3.bisector((d: any) => d.parsedTime).left;
        const i = bisectDate(processedData, x0, 1);
        const d0 = processedData[i - 1];
        const d1 = processedData[i];
        const d = x0.getTime() - d0?.parsedTime.getTime() > d1?.parsedTime.getTime() - x0.getTime() ? d1 : d0;

        if (d) {
          setHoveredData(d);
          
          tooltipText.selectAll("*").remove();
          tooltipText.append("tspan")
            .attr("x", 8)
            .attr("y", 16)
            .text(`时间: ${formatTime(d.parsedTime)}`);
          
          selectedMetrics.forEach((metric, index) => {
            tooltipText.append("tspan")
              .attr("x", 8)
              .attr("dy", 16)
              .attr("fill", colorMap[metric as keyof typeof colorMap])
              .text(`${metric.toUpperCase()}: ${(d[metric as keyof DataPoint] as number).toFixed(1)}%`);
          });

          const bbox = (tooltipText.node() as any).getBBox();
          tooltipRect
            .attr("width", bbox.width + 16)
            .attr("height", bbox.height + 8);

          tooltip.attr("transform", `translate(${xScale(d.parsedTime) + 10},${yScale(d.cpu) - 50})`);
        }
      });

  }, [data, selectedMetrics, height]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  return (
    <Card 
      className="glass-card"
      title={
        <Space>
          <LineChartOutlined style={{ color: 'var(--primary-color)' }} />
          <span style={{ color: 'white' }}>{title}</span>
          {realTime && <Tag color="processing">实时</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} />
          <Button size="small" icon={<FullscreenOutlined />} />
        </Space>
      }
      style={{ border: '1px solid var(--border-color)' }}
    >
      {/* 指标选择器 */}
      <Space style={{ marginBottom: '16px' }}>
        {['cpu', 'memory', 'gpu', 'network'].map(metric => (
          <Tag
            key={metric}
            color={selectedMetrics.includes(metric) ? "processing" : "default"}
            style={{ 
              cursor: 'pointer',
              borderColor: selectedMetrics.includes(metric) ? '#00d9ff' : 'transparent'
            }}
            onClick={() => toggleMetric(metric)}
          >
            {metric.toUpperCase()}
          </Tag>
        ))}
      </Space>

      {/* 图表容器 */}
      <div style={{ width: '100%', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          style={{ background: 'transparent' }}
        />
      </div>

      {/* 悬停数据显示 */}
      {hoveredData && (
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          background: 'var(--bg-tertiary)', 
          borderRadius: '6px',
          border: '1px solid var(--border-color)'
        }}>
          <Text style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            悬停数据: {hoveredData.time} - CPU: {hoveredData.cpu.toFixed(1)}% | 
            内存: {hoveredData.memory.toFixed(1)}% | 
            GPU: {hoveredData.gpu.toFixed(1)}% | 
            网络: {hoveredData.network.toFixed(1)}%
          </Text>
        </div>
      )}
    </Card>
  );
};

export default AdvancedPerformanceChart;