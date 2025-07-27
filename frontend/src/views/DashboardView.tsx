import React, { useState, useEffect, useRef } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Button, 
  Space, 
  Empty
} from 'antd';
import { 
  AppstoreOutlined, 
  BuildOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  PlusOutlined,
  CodeOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSceneStore } from '../stores/useSceneStore';
import { useShallow } from 'zustand/react/shallow';
import StatusBar from '../components/layout/StatusBar';
import * as d3 from 'd3';

const { Title, Text } = Typography;

// D3图表组件
const ProjectStatusChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;

    const data = [
      { name: '完成', value: 3, color: '#52c41a' },
      { name: '进行中', value: 2, color: '#00d9ff' },
      { name: '计划中', value: 1, color: '#faad14' }
    ];

    const pie = d3.pie<any>().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const arcs = g.selectAll(".arc")
      .data(pie(data))
      .enter().append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc as any)
      .attr("fill", d => d.data.color)
      .attr("opacity", 0.8)
      .transition()
      .duration(1000)
      .attrTween("d", function(d: any) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t: number) {
          return arc(interpolate(t)) || "";
        };
      });

    // 添加标签
    arcs.append("text")
      .attr("transform", function(d: any) {
        const centroid = arc.centroid(d);
        return `translate(${centroid})`;
      })
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#ffffff")
      .style("font-weight", "bold")
      .text(function(d: any) {
        return d.data.value;
      });

  }, []);

  return <svg ref={svgRef} width={200} height={200}></svg>;
};

const SystemResourceChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState([
    { name: 'CPU', value: 25, color: '#00d9ff', icon: '🔹' },
    { name: '内存', value: 42, color: '#52c41a', icon: '🔸' },
    { name: 'GPU', value: 35, color: '#faad14', icon: '🔶' },
    { name: '网络', value: 18, color: '#eb2f96', icon: '🔷' }
  ]);

  useEffect(() => {
    // 动态更新资源数据
    const interval = setInterval(() => {
      setData(prev => prev.map(item => ({
        ...item,
        value: Math.max(5, Math.min(95, item.value + (Math.random() - 0.5) * 8))
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 280;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 添加背景柱子
    g.selectAll(".bg-bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bg-bar")
      .attr("x", d => xScale(d.name) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", 0)
      .attr("height", innerHeight)
      .attr("fill", "rgba(255,255,255,0.05)")
      .attr("rx", 6);

    // 渐变定义
    const defs = svg.append("defs");
    data.forEach((d, i) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", innerHeight)
        .attr("x2", 0).attr("y2", 0);

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d.color)
        .attr("stop-opacity", 0.3);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d.color)
        .attr("stop-opacity", 0.9);
    });

    // 主柱子
    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.name) || 0)
      .attr("width", xScale.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("fill", (d, i) => `url(#gradient-${i})`)
      .attr("rx", 6)
      .style("filter", (d) => `drop-shadow(0 4px 8px ${d.color}40)`)
      .transition()
      .duration(1000)
      .attr("y", d => yScale(d.value))
      .attr("height", d => innerHeight - yScale(d.value));

    // 发光边框
    g.selectAll(".glow-bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "glow-bar")
      .attr("x", d => (xScale(d.name) || 0) + 2)
      .attr("width", xScale.bandwidth() - 4)
      .attr("y", d => yScale(d.value) + 2)
      .attr("height", d => Math.max(0, innerHeight - yScale(d.value) - 4))
      .attr("fill", "none")
      .attr("stroke", d => d.color)
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("opacity", 0.6);

    // Y轴网格线
    g.selectAll(".grid")
      .data(yScale.ticks(4))
      .enter().append("line")
      .attr("class", "grid")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1);

    // Y轴标签
    g.selectAll(".y-label")
      .data(yScale.ticks(4))
      .enter().append("text")
      .attr("class", "y-label")
      .attr("x", -8)
      .attr("y", d => yScale(d))
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "10px")
      .style("fill", "rgba(255,255,255,0.6)")
      .text(d => d + "%");

    // 标签和图标
    g.selectAll(".label")
      .data(data)
      .enter().append("text")
      .attr("class", "label")
      .attr("x", d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr("y", innerHeight + 20)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#ffffff")
      .style("font-weight", "bold")
      .text(d => `${d.icon} ${d.name}`);

    // 数值标签
    g.selectAll(".value")
      .data(data)
      .enter().append("text")
      .attr("class", "value")
      .attr("x", d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.value) - 8)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", d => d.color)
      .text(d => `${d.value.toFixed(0)}%`);

  }, [data]);

  return <svg ref={svgRef} width={280} height={200}></svg>;
};

const ModuleUsageChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6;

    const data = [
      { name: '几何', value: 12, color: '#00d9ff' },
      { name: '网格', value: 8, color: '#52c41a' },
      { name: '分析', value: 15, color: '#faad14' },
      { name: '结果', value: 6, color: '#f5222d' }
    ];

    const pie = d3.pie<any>().value(d => d.value);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const arcs = g.selectAll(".arc")
      .data(pie(data))
      .enter().append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc as any)
      .attr("fill", d => d.data.color)
      .attr("opacity", 0.8)
      .transition()
      .duration(1000)
      .attrTween("d", function(d: any) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t: number) {
          return arc(interpolate(t)) || "";
        };
      });

    // 中心总数
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#00d9ff")
      .text(data.reduce((sum, d) => sum + d.value, 0));

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1em")
      .style("font-size", "12px")
      .style("fill", "rgba(255,255,255,0.7)")
      .text("总计");

  }, []);

  return <svg ref={svgRef} width={200} height={200}></svg>;
};

const PerformanceTrendChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dataPoints, setDataPoints] = useState(() => 
    Array.from({length: 20}, (_, i) => ({
      time: i,
      cpu: 30 + Math.random() * 40,
      memory: 45 + Math.random() * 30,
      gpu: 20 + Math.random() * 50
    }))
  );

  useEffect(() => {
    // 动态更新数据
    const interval = setInterval(() => {
      setDataPoints(prev => {
        const newPoint = {
          time: prev[prev.length - 1].time + 1,
          cpu: Math.max(10, Math.min(90, prev[prev.length - 1].cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(10, Math.min(90, prev[prev.length - 1].memory + (Math.random() - 0.5) * 8)),
          gpu: Math.max(10, Math.min(90, prev[prev.length - 1].gpu + (Math.random() - 0.5) * 12))
        };
        return [...prev.slice(-19), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    console.log('Performance chart data:', dataPoints); // 调试信息

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = Math.max(800, window.innerWidth - 200); // 适应屏幕宽度，最小800px
    const height = 180;
    const margin = { top: 20, right: 80, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
      .domain(d3.extent(dataPoints, d => d.time) as [number, number])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 创建三条线的路径生成器
    const line = d3.line<any>()
      .x(d => xScale(d.time))
      .curve(d3.curveCardinal);

    const cpuLine = line.y((d: any) => yScale(d.cpu));
    const memoryLine = line.y((d: any) => yScale(d.memory));
    const gpuLine = line.y((d: any) => yScale(d.gpu));

    // CPU线 - 蓝色
    g.append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", "#00d9ff")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "0")
      .attr("d", cpuLine)
      .style("filter", "drop-shadow(0 0 4px #00d9ff50)");

    // Memory线 - 绿色
    g.append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", "#52c41a")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "0")
      .attr("d", memoryLine)
      .style("filter", "drop-shadow(0 0 4px #52c41a50)");

    // GPU线 - 橙色
    g.append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", "#faad14")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "0")
      .attr("d", gpuLine)
      .style("filter", "drop-shadow(0 0 4px #faad1450)");

    // 添加数据点
    const metrics = ['cpu', 'memory', 'gpu'];
    const colors = ['#00d9ff', '#52c41a', '#faad14'];
    
    metrics.forEach((metric, index) => {
      g.selectAll(`.dot-${metric}`)
        .data(dataPoints)
        .enter().append("circle")
        .attr("class", `dot-${metric}`)
        .attr("cx", d => xScale(d.time))
        .attr("cy", d => yScale((d as any)[metric]))
        .attr("r", 3)
        .attr("fill", colors[index])
        .style("filter", `drop-shadow(0 0 4px ${colors[index]}80)`);
    });

    // Y轴网格线
    g.selectAll(".grid-line")
      .data(yScale.ticks(5))
      .enter().append("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1);

    // Y轴标签
    g.selectAll(".y-label")
      .data(yScale.ticks(5))
      .enter().append("text")
      .attr("class", "y-label")
      .attr("x", -8)
      .attr("y", d => yScale(d))
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "10px")
      .style("fill", "rgba(255,255,255,0.6)")
      .text(d => d + "%");

    // 图例
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 70}, 30)`);

    const legendData = [
      { name: 'CPU', color: '#00d9ff' },
      { name: '内存', color: '#52c41a' },
      { name: 'GPU', color: '#faad14' }
    ];

    legendData.forEach((item, index) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${index * 20})`);

      legendItem.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", item.color)
        .attr("stroke-width", 2);

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .style("fill", "#ffffff")
        .text(item.name);
    });

  }, [dataPoints]);

  return <svg ref={svgRef} width="100%" height={180}></svg>;
};

const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    projects: 6,
    models: 12,
    analyses: 8,
    components: 45
  });

  const { scene } = useSceneStore(
    useShallow(state => ({
      scene: state.scene
    }))
  );

  // 模拟数据更新
  useEffect(() => {
    const timer = setInterval(() => {
      setStats({
        projects: Math.floor(Math.random() * 5) + 5,
        models: Math.floor(Math.random() * 10) + 10,
        analyses: Math.floor(Math.random() * 5) + 6,
        components: Math.floor(Math.random() * 20) + 40
      });
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ 
      padding: '24px', 
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a2e 100%)',
      minHeight: '100vh'
    }}>
      {/* 顶部标题区域 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col span={16}>
          <Title level={1} style={{ 
            color: '#00d9ff', 
            margin: 0, 
            fontSize: '28px',
            fontWeight: 300
          }}>
            DeepCAD 控制中心
          </Title>
          <Text style={{ 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '14px',
            display: 'block',
            marginTop: '8px'
          }}>
            计算辅助工程设计平台 • {new Date().toLocaleDateString()}
          </Text>
        </Col>
        <Col span={8} style={{ textAlign: 'right' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => navigate('/geometry')}
              style={{ 
                background: '#00d9ff', 
                borderColor: '#00d9ff',
                borderRadius: '6px'
              }}
            >
              新建项目
            </Button>
            <Button 
              icon={<CodeOutlined />}
              style={{ 
                color: '#ffffff', 
                borderColor: 'rgba(255,255,255,0.3)',
                borderRadius: '6px'
              }}
            >
              AI助手
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={12} sm={6}>
          <Card
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              textAlign: 'center'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ fontSize: '32px', color: '#00d9ff', fontWeight: 'bold', marginBottom: '8px' }}>
              {stats.projects}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              项目总数
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(82, 196, 26, 0.3)',
              borderRadius: '12px',
              textAlign: 'center'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ fontSize: '32px', color: '#52c41a', fontWeight: 'bold', marginBottom: '8px' }}>
              {stats.models}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              几何模型
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(250, 173, 20, 0.3)',
              borderRadius: '12px',
              textAlign: 'center'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ fontSize: '32px', color: '#faad14', fontWeight: 'bold', marginBottom: '8px' }}>
              {stats.analyses}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              仿真分析
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(245, 34, 45, 0.3)',
              borderRadius: '12px',
              textAlign: 'center'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ fontSize: '32px', color: '#f5222d', fontWeight: 'bold', marginBottom: '8px' }}>
              {stats.components}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              组件总数
            </div>
          </Card>
        </Col>
      </Row>

      {/* D3图表区域 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={6}>
          <Card
            title={<span style={{ color: '#00d9ff', fontSize: '16px' }}>项目状态</span>}
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              height: '280px'
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <ProjectStatusChart />
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card
            title={<span style={{ color: '#00d9ff', fontSize: '16px' }}>模块使用</span>}
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              height: '280px'
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <ModuleUsageChart />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: '#00d9ff', fontSize: '16px' }}>系统资源</span>}
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              height: '280px'
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <SystemResourceChart />
          </Card>
        </Col>
      </Row>

      {/* 性能趋势图 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col span={24}>
          <Card
            title={<span style={{ color: '#00d9ff', fontSize: '16px' }}>系统性能趋势</span>}
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px',
              height: '240px'
            }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <PerformanceTrendChart />
          </Card>
        </Col>
      </Row>

      {/* 快速访问 */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card
            title={<span style={{ color: '#00d9ff', fontSize: '16px' }}>快速访问</span>}
            style={{
              background: 'rgba(26, 26, 46, 0.6)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <Row gutter={[16, 16]}>
              {[
                { name: '几何建模', path: '/geometry', color: '#00d9ff', icon: '🏗️' },
                { name: '材料库', path: '/materials', color: '#52c41a', icon: '🧱' },
                { name: '网格生成', path: '/meshing', color: '#faad14', icon: '🕸️' },
                { name: '仿真分析', path: '/analysis', color: '#722ed1', icon: '⚡' },
                { name: '结果查看', path: '/results', color: '#eb2f96', icon: '📊' },
                { name: '系统设置', path: '/settings', color: '#13c2c2', icon: '⚙️' }
              ].map((item, index) => (
                <Col xs={12} sm={8} md={6} lg={4} key={index}>
                  <Button 
                    type="text"
                    onClick={() => navigate(item.path)}
                    style={{
                      width: '100%',
                      height: '80px',
                      background: `rgba(${item.color === '#00d9ff' ? '0, 217, 255' : 
                                         item.color === '#52c41a' ? '82, 196, 26' :
                                         item.color === '#faad14' ? '250, 173, 20' :
                                         item.color === '#722ed1' ? '114, 46, 209' :
                                         item.color === '#eb2f96' ? '235, 47, 150' : '19, 194, 194'}, 0.1)`,
                      border: `1px solid rgba(${item.color === '#00d9ff' ? '0, 217, 255' : 
                                               item.color === '#52c41a' ? '82, 196, 26' :
                                               item.color === '#faad14' ? '250, 173, 20' :
                                               item.color === '#722ed1' ? '114, 46, 209' :
                                               item.color === '#eb2f96' ? '235, 47, 150' : '19, 194, 194'}, 0.3)`,
                      borderRadius: '8px',
                      color: item.color,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontSize: '24px' }}>{item.icon}</div>
                    <div style={{ fontSize: '12px' }}>{item.name}</div>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 状态栏 */}
      <StatusBar viewType="dashboard" />
    </div>
  );
};

export default DashboardView;