/**
 * 1号首席架构师优化系统 - 高级动态图表组件库
 * @description 炫酷的实时数据图表，包含各种动态效果和交互
 * @author 1号首席架构师
 * @version 3.0.0
 * @since 2024-07-25
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

// 数据类型定义
interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

interface CircularProgressData {
  label: string;
  value: number;
  max: number;
  color: string;
  glow?: boolean;
}

interface NetworkGraphNode {
  id: string;
  name: string;
  group: number;
  value: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface NetworkGraphLink {
  source: string | NetworkGraphNode;
  target: string | NetworkGraphNode;
  value: number;
  type?: string;
}

/**
 * 实时波形图 - 炫酷的时间序列可视化
 */
export function RealTimeWaveChart({
  data,
  width = 400,
  height = 200,
  color = '#00ffff',
  glowEffect = true,
  animate = true
}: {
  data: TimeSeriesData[];
  width?: number;
  height?: number;
  color?: string;
  glowEffect?: boolean;
  animate?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animatedData, setAnimatedData] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    if (!animate) {
      setAnimatedData(data);
      return;
    }

    // 渐进式数据动画
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < data.length) {
        setAnimatedData(prev => [...prev, data[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [data, animate]);

  useEffect(() => {
    if (!svgRef.current || animatedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建比例尺
    const xScale = d3.scaleTime()
      .domain(d3.extent(animatedData, d => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(animatedData, d => d.value) as [number, number])
      .range([innerHeight, 0]);

    // 创建线条生成器
    const line = d3.line<TimeSeriesData>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveCatmullRom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 渐变定义
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'waveGradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', 0).attr('y2', innerHeight);

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.8);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.1);

    // 添加发光滤镜
    if (glowEffect) {
      const filter = defs.append('filter')
        .attr('id', 'glow');

      filter.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur');

      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // 区域填充
    const area = d3.area<TimeSeriesData>()
      .x(d => xScale(d.timestamp))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(d3.curveCatmullRom);

    g.append('path')
      .datum(animatedData)
      .attr('fill', 'url(#waveGradient)')
      .attr('d', area);

    // 主线条
    const path = g.append('path')
      .datum(animatedData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('filter', glowEffect ? 'url(#glow)' : '')
      .attr('d', line);

    // 动画效果
    if (animate) {
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);
    }

    // 添加数据点
    g.selectAll('.dot')
      .data(animatedData)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.value))
      .attr('r', 0)
      .attr('fill', color)
      .attr('filter', glowEffect ? 'url(#glow)' : '')
      .transition()
      .delay((d, i) => i * 50)
      .duration(300)
      .attr('r', 3);

  }, [animatedData, width, height, color, glowEffect, animate]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />
    </div>
  );
}

/**
 * 3D圆环进度图 - 炫酷的系统状态指示器
 */
export function CircularProgress3D({
  data,
  size = 200,
  thickness = 20,
  animationDuration = 2000
}: {
  data: CircularProgressData[];
  size?: number;
  thickness?: number;
  animationDuration?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);

  useEffect(() => {
    // 动画进度值
    const targetValues = data.map(d => d.value / d.max);
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / animationDuration, 1);
      
      const currentValues = targetValues.map(target => 
        target * d3.easeElasticOut(progress)
      );
      
      setAnimatedValues(currentValues);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [data, animationDuration]);

  const center = size / 2;
  const radius = (size - thickness) / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="transform rotate-[-90deg]"
      >
        <defs>
          {data.map((item, index) => (
            <React.Fragment key={index}>
              {/* 渐变定义 */}
              <linearGradient
                id={`gradient-${index}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={item.color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0.4" />
              </linearGradient>
              
              {/* 发光效果 */}
              {item.glow && (
                <filter id={`glow-${index}`}>
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              )}
            </React.Fragment>
          ))}
        </defs>

        {data.map((item, index) => {
          const strokeDasharray = 2 * Math.PI * radius;
          const strokeDashoffset = strokeDasharray * (1 - (animatedValues[index] || 0));
          const ringRadius = radius - (index * (thickness + 5));

          return (
            <g key={index}>
              {/* 背景环 */}
              <circle
                cx={center}
                cy={center}
                r={ringRadius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeOpacity={0.1}
              />
              
              {/* 进度环 */}
              <circle
                cx={center}
                cy={center}
                r={ringRadius}
                fill="none"
                stroke={`url(#gradient-${index})`}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                filter={item.glow ? `url(#glow-${index})` : ''}
                className="transition-all duration-1000 ease-out"
              />
            </g>
          );
        })}
      </svg>

      {/* 中心文本 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {data[0] ? Math.round((animatedValues[0] || 0) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-400">
            {data[0]?.label || 'Progress'}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 动态网络拓扑图 - 展示系统架构连接
 */
export function NetworkTopologyGraph({
  nodes,
  links,
  width = 600,
  height = 400,
  interactive = true
}: {
  nodes: NetworkGraphNode[];
  links: NetworkGraphLink[];
  width?: number;
  height?: number;
  interactive?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkGraphNode, NetworkGraphLink>>();

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 创建力导向仿真
    const simulation = d3.forceSimulation<NetworkGraphNode>(nodes)
      .force('link', d3.forceLink<NetworkGraphNode, NetworkGraphLink>(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // 创建渐变和滤镜
    const defs = svg.append('defs');
    
    // 节点发光滤镜
    const nodeGlow = defs.append('filter')
      .attr('id', 'nodeGlow');
    nodeGlow.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    const nodeMerge = nodeGlow.append('feMerge');
    nodeMerge.append('feMergeNode').attr('in', 'coloredBlur');
    nodeMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // 连接线
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#00ffff')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value) * 2);

    // 添加连接线动画
    link.each(function(d) {
      const line = d3.select(this);
      line
        .attr('stroke-dasharray', '5,5')
        .attr('stroke-dashoffset', 0)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', -10)
        .on('end', function repeat() {
          d3.select(this)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', -20)
            .on('end', repeat);
        });
    });

    // 节点
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node');

    // 节点圆圈
    const circles = node.append('circle')
      .attr('r', d => Math.sqrt(d.value) * 3 + 10)
      .attr('fill', d => d3.schemeCategory10[d.group % 10])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#nodeGlow)');

    // 节点标签
    const labels = node.append('text')
      .text(d => d.name)
      .attr('x', 0)
      .attr('y', d => Math.sqrt(d.value) * 3 + 25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold');

    // 交互功能
    if (interactive) {
      const drag = d3.drag<SVGGElement, NetworkGraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      node.call(drag);

      // 悬停效果
      circles
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', Math.sqrt(d.value) * 3 + 15);
        })
        .on('mouseout', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', Math.sqrt(d.value) * 3 + 10);
        });
    }

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NetworkGraphNode).x!)
        .attr('y1', d => (d.source as NetworkGraphNode).y!)
        .attr('x2', d => (d.target as NetworkGraphNode).x!)
        .attr('y2', d => (d.target as NetworkGraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, interactive]);

  return (
    <div className="relative bg-black/20 rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-cyan-500/30"
      />
    </div>
  );
}

/**
 * 3D柱状图 - 立体数据展示
 */
export function BarChart3D({
  data,
  width = 400,
  height = 300,
  depth = 50,
  colors = ['#00ffff', '#ff00ff', '#ffff00', '#ff6600']
}: {
  data: { label: string; value: number; }[];
  width?: number;
  height?: number;
  depth?: number;
  colors?: string[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxValue = d3.max(data, d => d.value) || 0;
    const barWidth = innerWidth / data.length * 0.7;

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建3D柱子
    data.forEach((d, i) => {
      const x = xScale(d.label)!;
      const barHeight = innerHeight - yScale(d.value);
      const color = colors[i % colors.length];

      // 柱子组
      const barGroup = g.append('g');

      // 顶面
      barGroup.append('polygon')
        .attr('points', `${x},${yScale(d.value)} ${x + barWidth},${yScale(d.value)} ${x + barWidth + depth/2},${yScale(d.value) - depth/2} ${x + depth/2},${yScale(d.value) - depth/2}`)
        .attr('fill', d3.color(color)!.brighter(0.5).toString())
        .attr('stroke', '#000')
        .attr('stroke-width', 1);

      // 右侧面
      barGroup.append('polygon')
        .attr('points', `${x + barWidth},${yScale(d.value)} ${x + barWidth},${innerHeight} ${x + barWidth + depth/2},${innerHeight - depth/2} ${x + barWidth + depth/2},${yScale(d.value) - depth/2}`)
        .attr('fill', d3.color(color)!.darker(0.5).toString())
        .attr('stroke', '#000')
        .attr('stroke-width', 1);

      // 正面
      barGroup.append('rect')
        .attr('x', x)
        .attr('y', yScale(d.value))
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', color)
        .attr('stroke', '#000')
        .attr('stroke-width', 1);

      // 数值标签
      barGroup.append('text')
        .attr('x', x + barWidth / 2)
        .attr('y', yScale(d.value) - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(d.value);
    });

    // X轴标签
    g.selectAll('.x-label')
      .data(data)
      .enter().append('text')
      .attr('class', 'x-label')
      .attr('x', d => xScale(d.label)! + barWidth / 2)
      .attr('y', innerHeight + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ccc')
      .attr('font-size', '12px')
      .text(d => d.label);

  }, [data, width, height, depth, colors]);

  return (
    <div className="relative bg-black/20 rounded-lg p-4">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />
    </div>
  );
}

/**
 * 雷达图 - 多维度性能展示
 */
export function RadarChart({
  data,
  size = 300,
  levels = 5,
  maxValue = 100
}: {
  data: { axis: string; value: number; fullMark: number; }[];
  size?: number;
  levels?: number;
  maxValue?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const radius = size / 2 - 40;
    const center = size / 2;
    const angleSlice = (Math.PI * 2) / data.length;

    // 创建缩放
    const rScale = d3.scaleLinear()
      .range([0, radius])
      .domain([0, maxValue]);

    // 绘制网格
    const grid = svg.append('g').attr('class', 'grid');

    // 绘制同心圆
    for (let i = 1; i <= levels; i++) {
      grid.append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', radius * i / levels)
        .attr('fill', 'none')
        .attr('stroke', '#00ffff')
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', 1);
    }

    // 绘制轴线
    const axes = svg.append('g').attr('class', 'axes');
    
    data.forEach((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      axes.append('line')
        .attr('x1', center)
        .attr('y1', center)
        .attr('x2', x)
        .attr('y2', y)
        .attr('stroke', '#00ffff')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 1);

      // 轴标签
      axes.append('text')
        .attr('x', x + Math.cos(angle) * 20)
        .attr('y', y + Math.sin(angle) * 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '12px')
        .text(d.axis);
    });

    // 绘制数据区域
    const lineGenerator = d3.line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveLinearClosed);

    const points = data.map((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const r = rScale(d.value);
      return {
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r
      };
    });

    // 数据区域填充
    svg.append('path')
      .datum(points)
      .attr('d', lineGenerator)
      .attr('fill', '#00ffff')
      .attr('fill-opacity', 0.2)
      .attr('stroke', '#00ffff')
      .attr('stroke-width', 2);

    // 数据点
    svg.selectAll('.data-point')
      .data(points)
      .enter().append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 4)
      .attr('fill', '#00ffff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

  }, [data, size, levels, maxValue]);

  return (
    <div className="relative bg-black/20 rounded-lg p-4">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="overflow-visible"
      />
    </div>
  );
}

export default {
  RealTimeWaveChart,
  CircularProgress3D,
  NetworkTopologyGraph,
  BarChart3D,
  RadarChart
};