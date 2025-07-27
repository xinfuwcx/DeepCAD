/**
 * 地层剖面图表组件 - 2号几何专家开发
 * P1优先级任务 - 专业级地层剖面可视化和分析图表
 * 基于1号架构师规划，提供多样化的地层分析图表
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as d3 from 'd3';
import { 
  Card, Form, Select, Button, Space, Typography, 
  Row, Col, Tag, Tooltip, Modal, Alert, Progress,
  Slider, Switch, Divider, Tabs, Radio, Checkbox
} from 'antd';
import { 
  LineChartOutlined, BarChartOutlined, PieChartOutlined,
  AreaChartOutlined, DotChartOutlined, HeatmapOutlined,
  EyeOutlined, SettingOutlined, SaveOutlined, DownloadOutlined,
  ZoomInOutlined, ZoomOutOutlined, ReloadOutlined,
  FullscreenOutlined, CompressOutlined, BgColorsOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import D3StatisticsCharts from './D3StatisticsCharts';
import D3ContourMap from './D3ContourMap';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 地层剖面数据接口
interface GeologyProfileData {
  boreholes: ProfileBorehole[];
  crossSections: CrossSection[];
  layers: LayerProfile[];
  interpolatedSurfaces: InterpolatedSurface[];
  analysisResults: ProfileAnalysis;
}

interface ProfileBorehole {
  id: string;
  name: string;
  x: number;
  y: number;
  groundLevel: number;
  totalDepth: number;
  layers: BoreholeLayer[];
  waterLevel?: number;
}

interface BoreholeLayer {
  id: string;
  name: string;
  soilType: string;
  topDepth: number;
  bottomDepth: number;
  thickness: number;
  color: string;
  properties: {
    density: number;
    cohesion: number;
    friction: number;
    permeability: number;
  };
}

interface CrossSection {
  id: string;
  name: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  length: number;
  direction: number; // 角度
  boreholes: ProfileBorehole[];
  elevationProfile: ElevationPoint[];
}

interface ElevationPoint {
  distance: number; // 沿剖面距离
  groundLevel: number;
  layers: InterpolatedLayer[];
}

interface InterpolatedLayer {
  name: string;
  soilType: string;
  topElevation: number;
  bottomElevation: number;
  color: string;
  confidence: number; // 插值置信度 0-1
}

interface LayerProfile {
  name: string;
  soilType: string;
  color: string;
  thickness: {
    min: number;
    max: number;
    average: number;
    stdDev: number;
  };
  elevation: {
    min: number;
    max: number;
    average: number;
    stdDev: number;
  };
  distribution: DistributionData[];
}

interface DistributionData {
  binStart: number;
  binEnd: number;
  count: number;
  percentage: number;
}

interface InterpolatedSurface {
  layerName: string;
  type: 'top' | 'bottom';
  contourLines: ContourLine[];
  gridData: GridPoint[];
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

interface ContourLine {
  elevation: number;
  points: { x: number; y: number }[];
  smooth: boolean;
}

interface GridPoint {
  x: number;
  y: number;
  z: number;
  interpolated: boolean;
  confidence: number;
}

interface ProfileAnalysis {
  layerContinuity: LayerContinuityAnalysis[];
  thicknessVariation: ThicknessAnalysis[];
  spatialTrends: SpatialTrendAnalysis[];
  qualityMetrics: QualityMetrics;
}

interface LayerContinuityAnalysis {
  layerName: string;
  continuityIndex: number; // 0-1
  discontinuityPoints: { x: number; y: number; reason: string }[];
  correlationCoefficient: number;
}

interface ThicknessAnalysis {
  layerName: string;
  variationCoefficient: number;
  trendDirection: { azimuth: number; dip: number };
  outliers: { boreholeId: string; thickness: number; zScore: number }[];
}

interface SpatialTrendAnalysis {
  layerName: string;
  trendType: 'linear' | 'polynomial' | 'exponential' | 'none';
  trendParameters: number[];
  rSquared: number;
  confidence: number;
}

interface QualityMetrics {
  dataCompleteness: number;
  interpolationAccuracy: number;
  spatialResolution: number;
  layerDefinitionClarity: number;
  overallReliability: 'excellent' | 'good' | 'fair' | 'poor';
}

// 图表配置接口
interface ChartConfiguration {
  chartType: 'profile' | 'contour' | 'column' | 'thickness' | 'statistics' | '3d';
  crossSectionId?: string;
  layerFilter: string[];
  displayOptions: {
    showBoreholes: boolean;
    showWaterLevel: boolean;
    showLabels: boolean;
    showGrid: boolean;
    showLegend: boolean;
    verticalExaggeration: number;
    colorScheme: 'geological' | 'rainbow' | 'terrain' | 'custom';
  };
  analysisOptions: {
    showTrends: boolean;
    showConfidence: boolean;
    showOutliers: boolean;
    smoothingLevel: number;
  };
}

interface GeologyProfileChartsProps {
  data?: GeologyProfileData;
  onDataUpdate?: (data: GeologyProfileData) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf' | 'data') => void;
  initialConfig?: Partial<ChartConfiguration>;
  showAdvancedControls?: boolean;
}

const GeologyProfileCharts: React.FC<GeologyProfileChartsProps> = ({
  data,
  onDataUpdate,
  onExport,
  initialConfig = {},
  showAdvancedControls = true
}) => {
  const [config, setConfig] = useState<ChartConfiguration>(createDefaultConfig(initialConfig));
  const [activeChart, setActiveChart] = useState<'profile' | 'contour' | 'statistics'>('profile');
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartSettingsVisible, setChartSettingsVisible] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 创建默认配置
  function createDefaultConfig(initial: Partial<ChartConfiguration> = {}): ChartConfiguration {
    return {
      chartType: 'profile',
      crossSectionId: data?.crossSections[0]?.id,
      layerFilter: data?.layers.map(l => l.name) || [],
      displayOptions: {
        showBoreholes: true,
        showWaterLevel: true,
        showLabels: true,
        showGrid: true,
        showLegend: true,
        verticalExaggeration: 2.0,
        colorScheme: 'geological'
      },
      analysisOptions: {
        showTrends: false,
        showConfidence: false,
        showOutliers: false,
        smoothingLevel: 0.5
      },
      ...initial
    };
  }

  // 生成模拟数据
  const mockData: GeologyProfileData = useMemo(() => {
    if (data) return data;

    // 生成模拟钻孔数据
    const boreholes: ProfileBorehole[] = [
      {
        id: 'BH001',
        name: 'BH001',
        x: 0,
        y: 0,
        groundLevel: 26.2,
        totalDepth: 30,
        waterLevel: 23.0,
        layers: [
          { id: 'l1', name: '填土', soilType: '填土', topDepth: 0, bottomDepth: 2.3, thickness: 2.3, color: '#FF6B6B', properties: { density: 1800, cohesion: 10, friction: 15, permeability: 1e-5 } },
          { id: 'l2', name: '软土', soilType: '软土', topDepth: 2.3, bottomDepth: 7.6, thickness: 5.3, color: '#4ECDC4', properties: { density: 1700, cohesion: 15, friction: 8, permeability: 1e-7 } },
          { id: 'l3', name: '粘土', soilType: '粘土', topDepth: 7.6, bottomDepth: 15.2, thickness: 7.6, color: '#45B7D1', properties: { density: 1900, cohesion: 25, friction: 18, permeability: 1e-8 } },
          { id: 'l4', name: '砂土', soilType: '砂土', topDepth: 15.2, bottomDepth: 25.1, thickness: 9.9, color: '#96CEB4', properties: { density: 2000, cohesion: 0, friction: 35, permeability: 1e-3 } },
          { id: 'l5', name: '砾石', soilType: '砾石', topDepth: 25.1, bottomDepth: 30.0, thickness: 4.9, color: '#54A0FF', properties: { density: 2200, cohesion: 0, friction: 42, permeability: 1e-2 } }
        ]
      },
      {
        id: 'BH002',
        name: 'BH002',
        x: 50,
        y: 0,
        groundLevel: 26.4,
        totalDepth: 30,
        waterLevel: 23.2,
        layers: [
          { id: 'l1', name: '填土', soilType: '填土', topDepth: 0, bottomDepth: 2.1, thickness: 2.1, color: '#FF6B6B', properties: { density: 1800, cohesion: 10, friction: 15, permeability: 1e-5 } },
          { id: 'l2', name: '软土', soilType: '软土', topDepth: 2.1, bottomDepth: 6.8, thickness: 4.7, color: '#4ECDC4', properties: { density: 1700, cohesion: 15, friction: 8, permeability: 1e-7 } },
          { id: 'l3', name: '粘土', soilType: '粘土', topDepth: 6.8, bottomDepth: 14.5, thickness: 7.7, color: '#45B7D1', properties: { density: 1900, cohesion: 25, friction: 18, permeability: 1e-8 } },
          { id: 'l4', name: '砂土', soilType: '砂土', topDepth: 14.5, bottomDepth: 24.2, thickness: 9.7, color: '#96CEB4', properties: { density: 2000, cohesion: 0, friction: 35, permeability: 1e-3 } },
          { id: 'l5', name: '砾石', soilType: '砾石', topDepth: 24.2, bottomDepth: 30.0, thickness: 5.8, color: '#54A0FF', properties: { density: 2200, cohesion: 0, friction: 42, permeability: 1e-2 } }
        ]
      },
      {
        id: 'BH003',
        name: 'BH003',
        x: 100,
        y: 0,
        groundLevel: 25.8,
        totalDepth: 30,
        waterLevel: 22.8,
        layers: [
          { id: 'l1', name: '填土', soilType: '填土', topDepth: 0, bottomDepth: 2.5, thickness: 2.5, color: '#FF6B6B', properties: { density: 1800, cohesion: 10, friction: 15, permeability: 1e-5 } },
          { id: 'l2', name: '软土', soilType: '软土', topDepth: 2.5, bottomDepth: 8.1, thickness: 5.6, color: '#4ECDC4', properties: { density: 1700, cohesion: 15, friction: 8, permeability: 1e-7 } },
          { id: 'l3', name: '粘土', soilType: '粘土', topDepth: 8.1, bottomDepth: 16.3, thickness: 8.2, color: '#45B7D1', properties: { density: 1900, cohesion: 25, friction: 18, permeability: 1e-8 } },
          { id: 'l4', name: '砂土', soilType: '砂土', topDepth: 16.3, bottomDepth: 26.1, thickness: 9.8, color: '#96CEB4', properties: { density: 2000, cohesion: 0, friction: 35, permeability: 1e-3 } },
          { id: 'l5', name: '砾石', soilType: '砾石', topDepth: 26.1, bottomDepth: 30.0, thickness: 3.9, color: '#54A0FF', properties: { density: 2200, cohesion: 0, friction: 42, permeability: 1e-2 } }
        ]
      }
    ];

    // 生成横断面
    const crossSections: CrossSection[] = [
      {
        id: 'cs1',
        name: '主断面 A-A',
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 0 },
        length: 100,
        direction: 0,
        boreholes: boreholes,
        elevationProfile: generateElevationProfile(boreholes)
      }
    ];

    // 生成地层统计
    const layers: LayerProfile[] = [
      {
        name: '填土',
        soilType: '填土',
        color: '#FF6B6B',
        thickness: { min: 2.1, max: 2.5, average: 2.3, stdDev: 0.2 },
        elevation: { min: 23.7, max: 24.1, average: 23.9, stdDev: 0.2 },
        distribution: [
          { binStart: 2.0, binEnd: 2.2, count: 1, percentage: 33.3 },
          { binStart: 2.2, binEnd: 2.4, count: 1, percentage: 33.3 },
          { binStart: 2.4, binEnd: 2.6, count: 1, percentage: 33.3 }
        ]
      },
      {
        name: '软土',
        soilType: '软土',
        color: '#4ECDC4',
        thickness: { min: 4.7, max: 5.6, average: 5.2, stdDev: 0.45 },
        elevation: { min: 17.7, max: 19.2, average: 18.5, stdDev: 0.7 },
        distribution: [
          { binStart: 4.5, binEnd: 5.0, count: 1, percentage: 33.3 },
          { binStart: 5.0, binEnd: 5.5, count: 1, percentage: 33.3 },
          { binStart: 5.5, binEnd: 6.0, count: 1, percentage: 33.3 }
        ]
      }
    ];

    return {
      boreholes,
      crossSections,
      layers,
      interpolatedSurfaces: [],
      analysisResults: {
        layerContinuity: [],
        thicknessVariation: [],
        spatialTrends: [],
        qualityMetrics: {
          dataCompleteness: 95,
          interpolationAccuracy: 88,
          spatialResolution: 92,
          layerDefinitionClarity: 87,
          overallReliability: 'good'
        }
      }
    };
  }, [data]);

  // 生成高程剖面
  function generateElevationProfile(boreholes: ProfileBorehole[]): ElevationPoint[] {
    const profile: ElevationPoint[] = [];
    
    // 在钻孔之间插值生成剖面点
    for (let i = 0; i <= 100; i += 2) { // 每2m一个点
      const distance = i;
      
      // 线性插值地面标高
      let groundLevel: number;
      if (distance <= 50) {
        // 前半段：BH001到BH002
        const ratio = distance / 50;
        groundLevel = boreholes[0].groundLevel + ratio * (boreholes[1].groundLevel - boreholes[0].groundLevel);
      } else {
        // 后半段：BH002到BH003
        const ratio = (distance - 50) / 50;
        groundLevel = boreholes[1].groundLevel + ratio * (boreholes[2].groundLevel - boreholes[1].groundLevel);
      }

      // 插值各层位标高
      const layers: InterpolatedLayer[] = [
        {
          name: '填土',
          soilType: '填土',
          topElevation: groundLevel,
          bottomElevation: groundLevel - 2.3,
          color: '#FF6B6B',
          confidence: 0.9
        },
        {
          name: '软土',
          soilType: '软土',
          topElevation: groundLevel - 2.3,
          bottomElevation: groundLevel - 7.5,
          color: '#4ECDC4',
          confidence: 0.85
        },
        {
          name: '粘土',
          soilType: '粘土',
          topElevation: groundLevel - 7.5,
          bottomElevation: groundLevel - 15.5,
          color: '#45B7D1',
          confidence: 0.9
        },
        {
          name: '砂土',
          soilType: '砂土',
          topElevation: groundLevel - 15.5,
          bottomElevation: groundLevel - 25.0,
          color: '#96CEB4',
          confidence: 0.8
        },
        {
          name: '砾石',
          soilType: '砾石',
          topElevation: groundLevel - 25.0,
          bottomElevation: groundLevel - 30.0,
          color: '#54A0FF',
          confidence: 0.75
        }
      ];

      profile.push({
        distance,
        groundLevel,
        layers
      });
    }

    return profile;
  }

  // 更新配置
  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newConfig;
    });
  };

  // 基于D3的专业地层剖面图绘制
  const drawD3ProfileChart = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || !mockData.crossSections.length) return;

    // 清空SVG
    d3.select(svg).selectAll('*').remove();

    // 获取容器尺寸
    const containerRect = container.getBoundingClientRect();
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = containerRect.width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // 设置SVG尺寸
    d3.select(svg)
      .attr('width', containerRect.width)
      .attr('height', 400);

    // 创建主绘图区域
    const g = d3.select(svg)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const crossSection = mockData.crossSections[0];
    const profile = crossSection.elevationProfile;
    
    if (!profile.length) return;

    // 计算数据范围
    const minElevation = Math.min(...profile.map(p => Math.min(...p.layers.map(l => l.bottomElevation))));
    const maxElevation = Math.max(...profile.map(p => p.groundLevel));
    
    // 创建比例尺
    const xScale = d3.scaleLinear()
      .domain([0, crossSection.length])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([minElevation, maxElevation])
      .range([height, 0]);

    // 添加网格
    if (config.displayOptions.showGrid) {
      // 垂直网格线
      g.selectAll('.grid-v')
        .data(xScale.ticks(10))
        .enter().append('line')
        .attr('class', 'grid-v')
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      // 水平网格线
      g.selectAll('.grid-h')
        .data(yScale.ticks(8))
        .enter().append('line')
        .attr('class', 'grid-h')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');
    }

    // 绘制地层
    const layerNames = ['填土', '软土', '粘土', '砂土', '砾石'];
    
    layerNames.forEach(layerName => {
      if (!config.layerFilter.includes(layerName) && config.layerFilter.length > 0) {
        return;
      }

      const layer = profile[0].layers.find(l => l.name === layerName);
      if (!layer) return;

      // 创建地层多边形路径
      const topLine = d3.line<ElevationPoint>()
        .x(d => xScale(d.distance))
        .y(d => {
          const l = d.layers.find(layer => layer.name === layerName);
          return l ? yScale(l.topElevation) : 0;
        })
        .curve(d3.curveBasis);

      const bottomLine = d3.line<ElevationPoint>()
        .x(d => xScale(d.distance))
        .y(d => {
          const l = d.layers.find(layer => layer.name === layerName);
          return l ? yScale(l.bottomElevation) : 0;
        })
        .curve(d3.curveBasis);

      // 创建区域生成器
      const area = d3.area<ElevationPoint>()
        .x(d => xScale(d.distance))
        .y0(d => {
          const l = d.layers.find(layer => layer.name === layerName);
          return l ? yScale(l.bottomElevation) : 0;
        })
        .y1(d => {
          const l = d.layers.find(layer => layer.name === layerName);
          return l ? yScale(l.topElevation) : 0;
        })
        .curve(d3.curveBasis);

      // 绘制地层填充
      g.append('path')
        .datum(profile)
        .attr('d', area)
        .attr('fill', layer.color)
        .attr('fill-opacity', 0.7)
        .attr('stroke', layer.color)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('fill-opacity', 0.9);
          
          // 创建tooltip
          const tooltip = d3.select('body').append('div')
            .attr('class', 'geology-tooltip')
            .style('position', 'absolute')
            .style('padding', '8px')
            .style('background', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html(`
              <div><strong>${layer.name}</strong></div>
              <div>土层类型: ${layer.soilType}</div>
              <div>平均厚度: ${mockData.layers.find(l => l.name === layerName)?.thickness.average.toFixed(2)}m</div>
            `);
            
          tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', function(event) {
          d3.select('.geology-tooltip')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill-opacity', 0.7);
          d3.selectAll('.geology-tooltip').remove();
        });

      // 绘制地层顶线
      g.append('path')
        .datum(profile)
        .attr('d', topLine)
        .attr('fill', 'none')
        .attr('stroke', d3.color(layer.color)?.darker(1).toString() || layer.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', layerName === '填土' ? '0' : '3,3');
    });

    // 绘制钻孔位置
    if (config.displayOptions.showBoreholes) {
      const boreholeGroup = g.append('g').attr('class', 'boreholes');
      
      mockData.boreholes.forEach(borehole => {
        const x = xScale(borehole.x);
        const yTop = yScale(borehole.groundLevel);
        const yBottom = yScale(borehole.groundLevel - borehole.totalDepth);
        
        // 绘制钻孔线
        boreholeGroup.append('line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', yTop)
          .attr('y2', yBottom)
          .attr('stroke', '#333333')
          .attr('stroke-width', 3)
          .attr('stroke-linecap', 'round');
        
        // 绘制钻孔点
        boreholeGroup.append('circle')
          .attr('cx', x)
          .attr('cy', yTop)
          .attr('r', 4)
          .attr('fill', '#fff')
          .attr('stroke', '#333333')
          .attr('stroke-width', 2);
        
        // 绘制钻孔标签
        if (config.displayOptions.showLabels) {
          boreholeGroup.append('text')
            .attr('x', x)
            .attr('y', yTop - 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333333')
            .text(borehole.name);
        }
        
        // 绘制水位线
        if (config.displayOptions.showWaterLevel && borehole.waterLevel) {
          const yWater = yScale(borehole.waterLevel);
          
          boreholeGroup.append('line')
            .attr('x1', x - 15)
            .attr('x2', x + 15)
            .attr('y1', yWater)
            .attr('y2', yWater)
            .attr('stroke', '#0066cc')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
            
          boreholeGroup.append('text')
            .attr('x', x + 20)
            .attr('y', yWater + 4)
            .attr('font-size', '10px')
            .attr('fill', '#0066cc')
            .text('水位');
        }
      });
    }

    // 添加坐标轴
    const xAxis = d3.axisBottom(xScale)
      .tickSize(-height)
      .tickFormat(d => `${d}m`);
    
    const yAxis = d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(d => `${d}m`);

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
      .text('标高 (m)');
    
    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('距离 (m)');

    // 添加缩放和平移
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', function(event) {
        const { transform } = event;
        g.attr('transform', `translate(${margin.left + transform.x},${margin.top + transform.y}) scale(${transform.k})`);
      });

    d3.select(svg).call(zoom);

  }, [mockData, config]);

  // 重绘图表
  useEffect(() => {
    if (activeChart === 'profile') {
      drawD3ProfileChart();
    }
  }, [activeChart, config, drawD3ProfileChart]);

  // 窗口大小变化时重绘
  useEffect(() => {
    const handleResize = () => {
      if (activeChart === 'profile') {
        drawD3ProfileChart();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeChart, drawD3ProfileChart]);

  // 计算统计信息
  const chartStats = useMemo(() => {
    return {
      totalBoreholes: mockData.boreholes.length,
      profileLength: mockData.crossSections[0]?.length || 0,
      layerCount: mockData.layers.length,
      elevationRange: {
        min: Math.min(...mockData.boreholes.map(b => b.groundLevel - b.totalDepth)),
        max: Math.max(...mockData.boreholes.map(b => b.groundLevel))
      }
    };
  }, [mockData]);

  return (
    <div className="geology-profile-charts">
      {/* 头部控制 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space>
              <LineChartOutlined style={{ color: 'var(--primary-color)' }} />
              <Title level={5} style={{ margin: 0 }}>地层剖面图表</Title>
            </Space>
          </Col>
          <Col span={18}>
            <Row gutter={16}>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {chartStats.totalBoreholes}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>钻孔数</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {chartStats.profileLength}m
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>剖面长度</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {chartStats.layerCount}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>地层数</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--info-color)' }}>
                    {(chartStats.elevationRange.max - chartStats.elevationRange.min).toFixed(1)}m
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>高程差</Text></div>
                </div>
              </Col>
              <Col span={8}>
                <Space style={{ float: 'right' }}>
                  <Button
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={() => setChartSettingsVisible(true)}
                  >
                    设置
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => onExport && onExport('png')}
                  >
                    导出
                  </Button>
                  <Button
                    size="small"
                    icon={isFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? '还原' : '全屏'}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 快速控制面板 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <Text>图表类型:</Text>
              <Radio.Group
                value={activeChart}
                onChange={(e) => setActiveChart(e.target.value)}
                size="small"
              >
                <Radio.Button value="profile">
                  <LineChartOutlined /> 剖面图
                </Radio.Button>
                <Radio.Button value="contour">
                  <HeatmapOutlined /> 等值线
                </Radio.Button>
                <Radio.Button value="statistics">
                  <BarChartOutlined /> 统计图
                </Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col span={8}>
            <Space>
              <Text>地层筛选:</Text>
              <Select
                mode="multiple"
                value={config.layerFilter}
                onChange={(value) => updateConfig('layerFilter', value)}
                style={{ width: 200 }}
                size="small"
                placeholder="选择地层"
              >
                {mockData.layers.map(layer => (
                  <Option key={layer.name} value={layer.name}>
                    <Space>
                      <div 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: layer.color,
                          borderRadius: '2px'
                        }} 
                      />
                      {layer.name}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col span={8}>
            <Space style={{ float: 'right' }}>
              <Text>垂直放大:</Text>
              <Slider
                value={config.displayOptions.verticalExaggeration}
                onChange={(value) => updateConfig('displayOptions.verticalExaggeration', value)}
                min={0.5}
                max={5.0}
                step={0.5}
                style={{ width: 100 }}
                tooltip={{ formatter: (value) => `${value}x` }}
              />
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => drawD3ProfileChart()}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主图表区域 */}
      <Card 
        size="small" 
        style={{ 
          height: isFullscreen ? '80vh' : '500px',
          ...(isFullscreen && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            margin: 0
          })
        }}
      >
        <Tabs activeKey={activeChart} onChange={setActiveChart as any} size="small">
          <TabPane tab="地层剖面" key="profile">
            <div 
              ref={containerRef}
              style={{ 
                padding: '20px',
                background: '#fafafa',
                borderRadius: '6px',
                border: '1px solid #d9d9d9'
              }}
            >
              <svg
                ref={svgRef}
                style={{ 
                  width: '100%',
                  height: '400px',
                  background: 'white',
                  borderRadius: '4px'
                }}
              />
            </div>
          </TabPane>

          <TabPane tab="等值线图" key="contour">
            <D3ContourMap 
              property="elevation"
              layerName={selectedLayer === 'all' ? '粘土' : selectedLayer}
              onExport={onExport}
            />
          </TabPane>

          <TabPane tab="统计分析" key="statistics">
            <D3StatisticsCharts 
              onExport={onExport}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 图表设置模态框 */}
      <Modal
        title="图表设置"
        open={chartSettingsVisible}
        onCancel={() => setChartSettingsVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setChartSettingsVisible(false)}>
            取消
          </Button>,
          <Button key="apply" type="primary" onClick={() => setChartSettingsVisible(false)}>
            应用
          </Button>
        ]}
        width={600}
      >
        <Tabs size="small" items={[
          {
            key: 'display',
            label: '显示选项',
            children: (
              <div style={{ padding: '16px 0' }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Checkbox
                      checked={config.displayOptions.showBoreholes}
                      onChange={(e) => updateConfig('displayOptions.showBoreholes', e.target.checked)}
                    >
                      显示钻孔位置
                    </Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox
                      checked={config.displayOptions.showWaterLevel}
                      onChange={(e) => updateConfig('displayOptions.showWaterLevel', e.target.checked)}
                    >
                      显示地下水位
                    </Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox
                      checked={config.displayOptions.showLabels}
                      onChange={(e) => updateConfig('displayOptions.showLabels', e.target.checked)}
                    >
                      显示标签
                    </Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox
                      checked={config.displayOptions.showGrid}
                      onChange={(e) => updateConfig('displayOptions.showGrid', e.target.checked)}
                    >
                      显示网格
                    </Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox
                      checked={config.displayOptions.showLegend}
                      onChange={(e) => updateConfig('displayOptions.showLegend', e.target.checked)}
                    >
                      显示图例
                    </Checkbox>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: 'style',
            label: '样式设置',
            children: (
              <div style={{ padding: '16px 0' }}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Text>颜色方案:</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Radio.Group
                        value={config.displayOptions.colorScheme}
                        onChange={(e) => updateConfig('displayOptions.colorScheme', e.target.value)}
                      >
                        <Radio value="geological">地质配色</Radio>
                        <Radio value="rainbow">彩虹配色</Radio>
                        <Radio value="terrain">地形配色</Radio>
                      </Radio.Group>
                    </div>
                  </Col>
                </Row>
              </div>
            )
          }
        ]} />
      </Modal>
    </div>
  );
};

export default GeologyProfileCharts;