import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, Typography } from 'antd';

const { Title } = Typography;

interface PerformanceData {
  timestamp: number;
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
}

interface PerformanceChartProps {
  title: string;
  height?: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ title, height = 200 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PerformanceData[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 模拟实时数据
  useEffect(() => {
    console.log('PerformanceChart: Starting data generation for', title);
    
    // 初始化一些数据
    const initialData: PerformanceData[] = [];
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      initialData.push({
        timestamp: now - (20 - i) * 1000,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        gpu: Math.random() * 100,
        network: Math.random() * 100
      });
    }
    setData(initialData);
    
    const interval = setInterval(() => {
      const now = Date.now();
      const newData: PerformanceData = {
        timestamp: now,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        gpu: Math.random() * 100,
        network: Math.random() * 100
      };

      setData(prev => {
        const updated = [...prev, newData];
        // 保持最近30个数据点
        return updated.slice(-30);
      });
    }, 2000);

    return () => {
      console.log('PerformanceChart: Cleaning up interval for', title);
      clearInterval(interval);
    };
  }, [title]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) {
      console.log('PerformanceChart: Not ready to render', { 
        svg: !!svgRef.current, 
        container: !!containerRef.current, 
        dataLength: data.length 
      });
      return;
    }

    console.log('PerformanceChart: Rendering chart for', title, 'with', data.length, 'data points');
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // 清除之前的内容

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = height;
    
    const margin = { top: 20, right: 80, bottom: 40, left: 50 };
    const width = Math.max(containerWidth - margin.left - margin.right, 200);
    const chartHeight = containerHeight - margin.top - margin.bottom;

    console.log('PerformanceChart: Chart dimensions', { width, chartHeight, containerWidth });

    // 设置SVG尺寸
    svg.attr('width', containerWidth).attr('height', containerHeight);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 设置比例尺
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([chartHeight, 0]);

    // 创建线条生成器
    const cpuLine = d3.line<PerformanceData>()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.cpu))
      .curve(d3.curveMonotoneX);

    const memoryLine = d3.line<PerformanceData>()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.memory))
      .curve(d3.curveMonotoneX);

    const gpuLine = d3.line<PerformanceData>()
      .x(d => xScale(new Date(d.timestamp)))
      .y(d => yScale(d.gpu))
      .curve(d3.curveMonotoneX);

    // 添加网格线
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .tickFormat(() => '')
      )
      .style('stroke', '#333')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => '')
      )
      .style('stroke', '#333')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.3);

    // 添加坐标轴
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%H:%M:%S'))
      )
      .style('color', '#888');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .style('color', '#888');

    // 添加Y轴标签
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (chartHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#888')
      .style('font-size', '12px')
      .text('Usage (%)');

    // 绘制线条
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#00d9ff')
      .attr('stroke-width', 2)
      .attr('d', cpuLine);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#52c41a')
      .attr('stroke-width', 2)
      .attr('d', memoryLine);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ff7875')
      .attr('stroke-width', 2)
      .attr('d', gpuLine);

    // 添加图例
    const legend = g.append('g')
      .attr('transform', `translate(${width + 10}, 20)`);

    const legendData = [
      { name: 'CPU', color: '#00d9ff' },
      { name: 'Memory', color: '#52c41a' },
      { name: 'GPU', color: '#ff7875' }
    ];

    legendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', item.color);

      legendRow.append('text')
        .attr('x', 18)
        .attr('y', 6)
        .attr('dy', '0.35em')
        .style('fill', '#ccc')
        .style('font-size', '12px')
        .text(item.name);
    });

    // 添加最新数值显示
    if (data.length > 0) {
      const latest = data[data.length - 1];
      const values = legend.append('g')
        .attr('transform', `translate(0, 80)`);

      values.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .style('fill', '#00d9ff')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .text(`CPU: ${latest.cpu.toFixed(1)}%`);

      values.append('text')
        .attr('x', 0)
        .attr('y', 15)
        .style('fill', '#52c41a')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .text(`Mem: ${latest.memory.toFixed(1)}%`);

      values.append('text')
        .attr('x', 0)
        .attr('y', 30)
        .style('fill', '#ff7875')
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .text(`GPU: ${latest.gpu.toFixed(1)}%`);
    }

    if (!isInitialized) {
      setIsInitialized(true);
      console.log('PerformanceChart: Chart initialized successfully for', title);
    }

  }, [data, height, title, isInitialized]);

  return (
    <Card 
      className="glass-card" 
      style={{ 
        height: height + 80,
        width: '100%'
      }}
      styles={{
        body: { 
          padding: '16px',
          height: '100%'
        }
      }}
    >
      <Title level={5} style={{ 
        color: 'var(--primary-color)', 
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        {title}
      </Title>
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: `${height}px`, 
          position: 'relative',
          minWidth: '300px'
        }}
      >
        <svg
          ref={svgRef}
          style={{ 
            background: 'transparent', 
            display: 'block',
            width: '100%',
            height: '100%'
          }}
        />
        {!isInitialized && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#888',
            fontSize: '12px'
          }}>
            初始化图表中...
          </div>
        )}
      </div>
    </Card>
  );
};

export default PerformanceChart;