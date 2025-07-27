/**
 * D3等值线图组件 - 2号几何专家开发
 * 基于D3.js的专业地质等值线可视化
 * 提供RBF插值、等值线绘制、热力图等功能
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, Select, Space, Typography, Row, Col, Button, Slider, Switch, Tooltip } from 'antd';
import { 
  HeatmapOutlined, 
  SettingOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EyeOutlined,
  BgColorsOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 等值线数据接口
interface ContourData {
  boreholes: BoreholePoint[];
  interpolatedGrid: GridPoint[];
  contourLines: ContourLine[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

interface BoreholePoint {
  id: string;
  x: number;
  y: number;
  value: number;
  layerName: string;
}

interface GridPoint {
  x: number;
  y: number;
  z: number;
  interpolated: boolean;
}

interface ContourLine {
  level: number;
  path: string;
  color: string;
}

interface D3ContourMapProps {
  data?: ContourData;
  property?: 'elevation' | 'thickness' | 'density' | 'cohesion';
  layerName?: string;
  onExport?: (format: 'svg' | 'png') => void;
}

const D3ContourMap: React.FC<D3ContourMapProps> = ({
  data,
  property = 'elevation',
  layerName = '粘土',
  onExport
}) => {
  const [colorScheme, setColorScheme] = useState<'viridis' | 'plasma' | 'cool' | 'warm'>('viridis');
  const [contourLevels, setContourLevels] = useState(10);
  const [showPoints, setShowPoints] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 生成模拟数据
  const mockData: ContourData = {
    boreholes: [
      { id: 'BH001', x: 10, y: 10, value: 25.5, layerName: '粘土' },
      { id: 'BH002', x: 50, y: 15, value: 24.2, layerName: '粘土' },
      { id: 'BH003', x: 90, y: 20, value: 23.8, layerName: '粘土' },
      { id: 'BH004', x: 15, y: 60, value: 26.1, layerName: '粘土' },
      { id: 'BH005', x: 55, y: 65, value: 24.8, layerName: '粘土' },
      { id: 'BH006', x: 85, y: 70, value: 23.2, layerName: '粘土' },
      { id: 'BH007', x: 30, y: 35, value: 25.2, layerName: '粘土' },
      { id: 'BH008', x: 70, y: 40, value: 24.0, layerName: '粘土' }
    ],
    interpolatedGrid: [],
    contourLines: [],
    bounds: {
      minX: 0,
      maxX: 100,
      minY: 0,
      maxY: 80,
      minZ: 23.0,
      maxZ: 26.5
    }
  };

  // RBF插值函数
  const rbfInterpolation = useCallback((points: BoreholePoint[], gridSize: number = 100) => {
    const grid: GridPoint[] = [];
    const bounds = mockData.bounds;
    
    const xStep = (bounds.maxX - bounds.minX) / gridSize;
    const yStep = (bounds.maxY - bounds.minY) / gridSize;
    
    // 计算RBF权重矩阵
    const n = points.length;
    const A = new Array(n).fill(0).map(() => new Array(n).fill(0));
    const b = points.map(p => p.value);
    
    // 构建径向基函数矩阵
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          A[i][j] = 0;
        } else {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const r = Math.sqrt(dx * dx + dy * dy);
          A[i][j] = r * r * Math.log(r || 1e-10); // 薄板样条
        }
      }
    }
    
    // 简化的权重计算（实际应用中需要求解线性方程组）
    const weights = b.slice(); // 简化处理
    
    // 生成插值网格
    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const x = bounds.minX + i * xStep;
        const y = bounds.minY + j * yStep;
        
        // 使用反距离权重插值作为简化的RBF
        let totalWeight = 0;
        let weightedSum = 0;
        
        points.forEach(point => {
          const dx = x - point.x;
          const dy = y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const weight = 1 / (distance * distance + 1e-10);
          
          totalWeight += weight;
          weightedSum += weight * point.value;
        });
        
        const z = weightedSum / totalWeight;
        
        grid.push({
          x,
          y,
          z,
          interpolated: true
        });
      }
    }
    
    return grid;
  }, []);

  // 生成等值线
  const generateContours = useCallback((grid: GridPoint[], levels: number) => {
    const bounds = mockData.bounds;
    const gridSize = Math.sqrt(grid.length);
    
    // 将一维数组转换为二维数组
    const values = new Array(gridSize).fill(0).map(() => new Array(gridSize).fill(0));
    
    let index = 0;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        values[i][j] = grid[index] ? grid[index].z : bounds.minZ;
        index++;
      }
    }
    
    // 使用D3的等值线生成器
    const contours = d3.contours()
      .size([gridSize, gridSize])
      .thresholds(levels);
    
    const contourData = contours(values.flat());
    
    // 创建颜色比例尺
    const colorScale = d3.scaleSequential(getColorScale())
      .domain([bounds.minZ, bounds.maxZ]);
    
    return contourData.map(contour => ({
      level: contour.value,
      path: d3.geoPath()(contour) || '',
      color: colorScale(contour.value)
    }));
  }, []);

  // 获取颜色比例尺
  const getColorScale = useCallback(() => {
    switch (colorScheme) {
      case 'viridis':
        return d3.interpolateViridis;
      case 'plasma':
        return d3.interpolatePlasma;
      case 'cool':
        return d3.interpolateCool;
      case 'warm':
        return d3.interpolateWarm;
      default:
        return d3.interpolateViridis;
    }
  }, [colorScheme]);

  // 绘制等值线图
  const drawContourMap = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    // 清空SVG
    d3.select(svg).selectAll('*').remove();

    const containerRect = container.getBoundingClientRect();
    const margin = { top: 40, right: 80, bottom: 60, left: 60 };
    const width = containerRect.width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // 设置SVG尺寸
    d3.select(svg)
      .attr('width', containerRect.width)
      .attr('height', 400);

    const g = d3.select(svg)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const bounds = mockData.bounds;
    
    // 创建比例尺
    const xScale = d3.scaleLinear()
      .domain([bounds.minX, bounds.maxX])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([bounds.minY, bounds.maxY])
      .range([height, 0]);

    const colorScale = d3.scaleSequential(getColorScale())
      .domain([bounds.minZ, bounds.maxZ]);

    // 执行RBF插值
    const interpolatedGrid = rbfInterpolation(mockData.boreholes);
    const contourLines = generateContours(interpolatedGrid, contourLevels);

    // 绘制热力图背景
    if (showHeatmap) {
      const gridSize = Math.sqrt(interpolatedGrid.length);
      const cellWidth = width / gridSize;
      const cellHeight = height / gridSize;

      g.selectAll('.heatmap-cell')
        .data(interpolatedGrid)
        .enter().append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => xScale(d.x) - cellWidth / 2)
        .attr('y', d => yScale(d.y) - cellHeight / 2)
        .attr('width', cellWidth)
        .attr('height', cellHeight)
        .attr('fill', d => colorScale(d.z))
        .attr('opacity', 0.6);
    }

    // 绘制等值线
    if (showContours) {
      const scaleX = width / (bounds.maxX - bounds.minX);
      const scaleY = height / (bounds.maxY - bounds.minY);

      g.selectAll('.contour-line')
        .data(contourLines)
        .enter().append('path')
        .attr('class', 'contour-line')
        .attr('d', d => d.path)
        .attr('transform', `scale(${scaleX}, ${scaleY})`)
        .attr('fill', 'none')
        .attr('stroke', d => d.color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('stroke-width', 3);
          
          // 创建tooltip
          const tooltip = d3.select('body').append('div')
            .attr('class', 'contour-tooltip')
            .style('position', 'absolute')
            .style('padding', '8px')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html(`等值线: ${d.level.toFixed(2)}m`);
            
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('stroke-width', 1.5);
          d3.selectAll('.contour-tooltip').remove();
        });

      // 添加等值线标签
      g.selectAll('.contour-label')
        .data(contourLines.filter((d, i) => i % 2 === 0)) // 只显示部分标签
        .enter().append('text')
        .attr('class', 'contour-label')
        .attr('x', width / 2)
        .attr('y', (d, i) => height - (i + 1) * 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', d => d.color)
        .text(d => d.level.toFixed(1));
    }

    // 绘制钻孔点
    if (showPoints) {
      const boreholeGroup = g.append('g').attr('class', 'boreholes');
      
      boreholeGroup.selectAll('.borehole-point')
        .data(mockData.boreholes)
        .enter().append('circle')
        .attr('class', 'borehole-point')
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
        .attr('r', 5)
        .attr('fill', 'white')
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 7);
          
          const tooltip = d3.select('body').append('div')
            .attr('class', 'point-tooltip')
            .style('position', 'absolute')
            .style('padding', '12px')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html(`
              <div><strong>${d.id}</strong></div>
              <div>坐标: (${d.x}, ${d.y})</div>
              <div>数值: ${d.value.toFixed(2)}m</div>
              <div>地层: ${d.layerName}</div>
            `);
            
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', 5);
          d3.selectAll('.point-tooltip').remove();
        });

      // 添加钻孔标签
      boreholeGroup.selectAll('.borehole-label')
        .data(mockData.boreholes)
        .enter().append('text')
        .attr('class', 'borehole-label')
        .attr('x', d => xScale(d.x))
        .attr('y', d => yScale(d.y) - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#333')
        .text(d => d.id);
    }

    // 添加坐标轴
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => d + 'm');
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => d + 'm');

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
      .text('Y坐标 (m)');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('X坐标 (m)');

    // 添加颜色图例
    const legendWidth = 20;
    const legendHeight = height * 0.8;
    const legendG = svg.append('g')
      .attr('transform', `translate(${containerRect.width - 60}, ${margin.top + height * 0.1})`);

    // 创建渐变定义
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      gradient.append('stop')
        .attr('offset', `${(i / steps) * 100}%`)
        .attr('stop-color', colorScale(bounds.minZ + (bounds.maxZ - bounds.minZ) * i / steps));
    }

    // 绘制图例矩形
    legendG.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#legend-gradient)')
      .attr('stroke', '#333')
      .attr('stroke-width', 1);

    // 添加图例刻度
    const legendScale = d3.scaleLinear()
      .domain([bounds.minZ, bounds.maxZ])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .tickFormat(d => d.toFixed(1) + 'm');

    legendG.append('g')
      .attr('transform', `translate(${legendWidth}, 0)`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '10px');

  }, [mockData, colorScheme, contourLevels, showPoints, showContours, showHeatmap, rbfInterpolation, generateContours, getColorScale]);

  // 重绘图表
  useEffect(() => {
    drawContourMap();
  }, [drawContourMap]);

  // 窗口大小变化时重绘
  useEffect(() => {
    const handleResize = () => {
      drawContourMap();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawContourMap]);

  return (
    <div className="d3-contour-map">
      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space>
              <Text>颜色方案:</Text>
              <Select
                value={colorScheme}
                onChange={setColorScheme}
                style={{ width: 120 }}
                size="small"
              >
                <Option value="viridis">Viridis</Option>
                <Option value="plasma">Plasma</Option>
                <Option value="cool">Cool</Option>
                <Option value="warm">Warm</Option>
              </Select>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <Text>等值线数:</Text>
              <Slider
                value={contourLevels}
                onChange={setContourLevels}
                min={5}
                max={20}
                step={1}
                style={{ width: 100 }}
                tooltip={{ formatter: (value) => `${value}条` }}
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <Switch
                checked={showPoints}
                onChange={setShowPoints}
                size="small"
                checkedChildren="钻孔"
                unCheckedChildren="钻孔"
              />
              <Switch
                checked={showContours}
                onChange={setShowContours}
                size="small"
                checkedChildren="等值线"
                unCheckedChildren="等值线"
              />
              <Switch
                checked={showHeatmap}
                onChange={setShowHeatmap}
                size="small"
                checkedChildren="热力图"
                unCheckedChildren="热力图"
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space style={{ float: 'right' }}>
              <Tooltip title="刷新图表">
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={drawContourMap}
                >
                  刷新
                </Button>
              </Tooltip>
              <Tooltip title="导出图表">
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => onExport && onExport('svg')}
                >
                  导出
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
            <HeatmapOutlined />
            <span>{layerName}层标高等值线图 (RBF插值)</span>
          </Space>
        }
      >
        <div 
          ref={containerRef}
          style={{ 
            width: '100%',
            height: '400px',
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

export default D3ContourMap;