/**
 * DeepCAD 专业级大屏控制中心
 * 1号架构师 - 震撼的大屏级数据可视化体验
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '../design/tokens';
import { moduleHub } from '../integration/ModuleIntegrationHub';

// ==================== 类型定义 ====================

interface SystemMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
  storage: number;
  processes: number;
}

interface ProjectMetrics {
  total: number;
  active: number;
  completed: number;
  pending: number;
  computing: number;
}

interface PerformanceData {
  timestamp: number;
  cpu: number;
  memory: number;
  gpu: number;
  throughput: number;
}

// ==================== 3D 地球背景组件 ====================

const Globe3DBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const earthRef = useRef<THREE.Mesh>();

  useEffect(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      50, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 0, 15);

    // 创建地球几何体
    const geometry = new THREE.SphereGeometry(3, 64, 64);
    
    // 创建地球材质
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0x00d9ff) },
        colorB: { value: new THREE.Color(0x0066cc) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          float noise = sin(vPosition.x * 10.0 + time) * 
                       sin(vPosition.y * 10.0 + time) * 
                       sin(vPosition.z * 10.0 + time);
          
          vec3 color = mix(colorA, colorB, (noise + 1.0) * 0.5);
          
          // 添加边缘发光效果
          vec3 normal = normalize(vPosition);
          float fresnel = pow(1.0 - dot(normal, vec3(0.0, 0.0, 1.0)), 2.0);
          color = mix(color, vec3(0.0, 0.8, 1.0), fresnel * 0.3);
          
          gl_FragColor = vec4(color, 0.3);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    const earth = new THREE.Mesh(geometry, material);
    earthRef.current = earth;
    scene.add(earth);

    // 创建星空背景
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
      starsVertices.push(
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000
      );
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    
    const starsMaterial = new THREE.PointsMaterial({ 
      color: 0xffffff, 
      size: 1,
      transparent: true,
      opacity: 0.8
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x00d9ff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (earthRef.current) {
        earthRef.current.rotation.y += 0.002;
        // 更新shader时间
        (earthRef.current.material as THREE.ShaderMaterial).uniforms.time.value += 0.01;
      }
      
      stars.rotation.x += 0.0001;
      stars.rotation.y += 0.0001;
      
      renderer.render(scene, camera);
    };
    animate();

    // 响应式处理
    const handleResize = () => {
      if (rendererRef.current && sceneRef.current) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: 0.3
      }}
    />
  );
};

// ==================== 实时系统监控组件 ====================

const SystemMonitorPanel: React.FC<{ metrics: SystemMetrics }> = ({ metrics }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;

    // 创建径向图表
    const metricsData = [
      { name: 'CPU', value: metrics.cpu, color: '#00d9ff', angle: 0 },
      { name: '内存', value: metrics.memory, color: '#52c41a', angle: Math.PI / 3 },
      { name: 'GPU', value: metrics.gpu, color: '#faad14', angle: 2 * Math.PI / 3 },
      { name: '网络', value: metrics.network, color: '#f5222d', angle: Math.PI },
      { name: '存储', value: metrics.storage, color: '#722ed1', angle: 4 * Math.PI / 3 },
      { name: '进程', value: metrics.processes, color: '#eb2f96', angle: 5 * Math.PI / 3 }
    ];

    // 绘制背景圆圈
    for (let i = 1; i <= 4; i++) {
      svg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', (radius / 4) * i)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 1);
    }

    // 绘制坐标轴
    metricsData.forEach(metric => {
      svg.append('line')
        .attr('x1', centerX)
        .attr('y1', centerY)
        .attr('x2', centerX + Math.cos(metric.angle) * radius)
        .attr('y2', centerY + Math.sin(metric.angle) * radius)
        .attr('stroke', 'rgba(255, 255, 255, 0.2)')
        .attr('stroke-width', 1);
    });

    // 绘制数据多边形
    const pathData = metricsData.map(metric => {
      const r = (metric.value / 100) * radius;
      const x = centerX + Math.cos(metric.angle) * r;
      const y = centerY + Math.sin(metric.angle) * r;
      return `${x},${y}`;
    }).join(' ');

    svg.append('polygon')
      .attr('points', pathData)
      .attr('fill', 'rgba(0, 217, 255, 0.2)')
      .attr('stroke', '#00d9ff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 0 10px #00d9ff50)');

    // 绘制数据点
    metricsData.forEach(metric => {
      const r = (metric.value / 100) * radius;
      const x = centerX + Math.cos(metric.angle) * r;
      const y = centerY + Math.sin(metric.angle) * r;

      svg.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 6)
        .attr('fill', metric.color)
        .style('filter', `drop-shadow(0 0 8px ${metric.color}80)`);

      // 添加标签
      const labelX = centerX + Math.cos(metric.angle) * (radius + 30);
      const labelY = centerY + Math.sin(metric.angle) * (radius + 30);

      svg.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', metric.color)
        .text(`${metric.name} ${metric.value}%`);
    });

  }, [metrics]);

  return (
    <motion.div
      style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(26, 26, 46, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 217, 255, 0.5)',
        padding: '24px',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 30% 30%, rgba(0, 217, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 70% 70%, rgba(82, 196, 26, 0.1) 0%, transparent 50%)
        `,
        opacity: 0.6
      }} />

      <h3 style={{
        color: '#ffffff',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '24px',
        textAlign: 'center',
        textShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        🖥️ 系统资源监控
      </h3>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <svg ref={svgRef} width="100%" height="350" viewBox="0 0 400 350" />
      </div>
    </motion.div>
  );
};

// ==================== 项目状态大屏组件 ====================

const ProjectStatusMega: React.FC<{ projects: ProjectMetrics }> = ({ projects }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={containerRef}
      style={{
        background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(114, 46, 209, 0.1) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 217, 255, 0.4)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
    >
      {/* 背景粒子效果 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(0, 217, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(114, 46, 209, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, rgba(82, 196, 26, 0.1) 0%, transparent 50%)
        `,
        animation: 'pulse 4s ease-in-out infinite'
      }} />

      <h2 style={{
        color: '#ffffff',
        fontSize: '28px',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '32px',
        textShadow: '0 0 20px rgba(0, 217, 255, 0.5)'
      }}>
        🚀 项目状态总览
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '24px',
        position: 'relative',
        zIndex: 1
      }}>
        {[
          { label: '项目总数', value: projects.total, color: '#00d9ff', icon: '📊' },
          { label: '进行中', value: projects.active, color: '#52c41a', icon: '⚡' },
          { label: '已完成', value: projects.completed, color: '#722ed1', icon: '✅' },
          { label: '计算中', value: projects.computing, color: '#faad14', icon: '🔄' }
        ].map((item, index) => (
          <motion.div
            key={index}
            style={{
              background: `linear-gradient(135deg, ${item.color}20, ${item.color}10)`,
              border: `2px solid ${item.color}40`,
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
            initial={{ opacity: 0, scale: 0.8, rotateY: 180 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: index * 0.2 }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: `0 10px 30px ${item.color}40`
            }}
          >
            {/* 背景数字水印 */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '120px',
              fontWeight: 'bold',
              color: `${item.color}10`,
              zIndex: 0,
              pointerEvents: 'none'
            }}>
              {item.value}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontSize: '32px',
                marginBottom: '8px'
              }}>
                {item.icon}
              </div>
              
              <motion.div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: item.color,
                  textShadow: `0 0 20px ${item.color}50`,
                  marginBottom: '8px'
                }}
                animate={{ 
                  textShadow: [
                    `0 0 20px ${item.color}50`,
                    `0 0 30px ${item.color}80`,
                    `0 0 20px ${item.color}50`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {item.value}
              </motion.div>
              
              <div style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                {item.label}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ==================== 实时性能图表 ====================

const PerformanceStreamChart: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<PerformanceData[]>([]);

  useEffect(() => {
    // 初始化数据
    const initialData = Array.from({ length: 50 }, (_, i) => ({
      timestamp: Date.now() - (50 - i) * 1000,
      cpu: 30 + Math.random() * 40,
      memory: 45 + Math.random() * 30,
      gpu: 20 + Math.random() * 50,
      throughput: 100 + Math.random() * 200
    }));
    setData(initialData);

    // 实时更新数据
    const interval = setInterval(() => {
      setData(prev => {
        const newPoint: PerformanceData = {
          timestamp: Date.now(),
          cpu: Math.max(10, Math.min(90, prev[prev.length - 1].cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(10, Math.min(90, prev[prev.length - 1].memory + (Math.random() - 0.5) * 8)),
          gpu: Math.max(10, Math.min(90, prev[prev.length - 1].gpu + (Math.random() - 0.5) * 12)),
          throughput: Math.max(50, Math.min(300, prev[prev.length - 1].throughput + (Math.random() - 0.5) * 20))
        };
        return [...prev.slice(-49), newPoint];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1400;
    const height = 380;
    const margin = { top: 40, right: 100, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建渐变定义
    const defs = svg.append("defs");
    
    ['cpu', 'memory', 'gpu'].forEach((metric, index) => {
      const colors = ['#00d9ff', '#52c41a', '#faad14'];
      const gradient = defs.append("linearGradient")
        .attr("id", `gradient-${metric}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", innerHeight)
        .attr("x2", 0).attr("y2", 0);

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colors[index])
        .attr("stop-opacity", 0);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colors[index])
        .attr("stop-opacity", 0.8);
    });

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 坐标轴比例尺
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([innerHeight, 0]);

    // 网格线
    const xGrid = g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0, ${innerHeight})`);

    xGrid.selectAll("line")
      .data(xScale.ticks(10))
      .enter().append("line")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", 0)
      .attr("y2", -innerHeight)
      .attr("stroke", "rgba(255, 255, 255, 0.1)")
      .attr("stroke-width", 1);

    const yGrid = g.append("g").attr("class", "grid");
    yGrid.selectAll("line")
      .data(yScale.ticks(5))
      .enter().append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "rgba(255, 255, 255, 0.1)")
      .attr("stroke-width", 1);

    // 绘制区域图和线图
    const metrics = [
      { key: 'cpu', color: '#00d9ff', name: 'CPU' },
      { key: 'memory', color: '#52c41a', name: '内存' },
      { key: 'gpu', color: '#faad14', name: 'GPU' }
    ];

    metrics.forEach(metric => {
      const line = d3.line<PerformanceData>()
        .x(d => xScale(new Date(d.timestamp)))
        .y(d => yScale((d as any)[metric.key]))
        .curve(d3.curveCardinal);

      const area = d3.area<PerformanceData>()
        .x(d => xScale(new Date(d.timestamp)))
        .y0(innerHeight)
        .y1(d => yScale((d as any)[metric.key]))
        .curve(d3.curveCardinal);

      // 绘制面积
      g.append("path")
        .datum(data)
        .attr("fill", `url(#gradient-${metric.key})`)
        .attr("d", area);

      // 绘制线条
      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", metric.color)
        .attr("stroke-width", 3)
        .attr("d", line)
        .style("filter", `drop-shadow(0 0 6px ${metric.color}80)`);

      // 绘制数据点
      g.selectAll(`.dot-${metric.key}`)
        .data(data.slice(-5)) // 只显示最后5个点
        .enter().append("circle")
        .attr("class", `dot-${metric.key}`)
        .attr("cx", d => xScale(new Date(d.timestamp)))
        .attr("cy", d => yScale((d as any)[metric.key]))
        .attr("r", 4)
        .attr("fill", metric.color)
        .style("filter", `drop-shadow(0 0 6px ${metric.color})`);
    });

    // 坐标轴
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat("%H:%M:%S"));

    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#ffffff80")
      .style("font-size", "12px");

    const yAxis = d3.axisLeft(yScale);
    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#ffffff80")
      .style("font-size", "12px");

    // 图例
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 90}, 50)`);

    metrics.forEach((metric, index) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${index * 25})`);

      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 3)
        .attr("fill", metric.color)
        .style("filter", `drop-shadow(0 0 4px ${metric.color})`);

      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "13px")
        .style("fill", "#ffffff")
        .style("font-weight", "500")
        .text(metric.name);
    });

  }, [data]);

  return (
    <motion.div
      style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(16, 16, 32, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 217, 255, 0.4)',
        padding: '24px',
        overflow: 'hidden',
        position: 'relative'
      }}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1 }}
    >
      {/* 流动背景效果 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          linear-gradient(45deg, transparent 30%, rgba(0, 217, 255, 0.05) 50%, transparent 70%),
          linear-gradient(-45deg, transparent 30%, rgba(82, 196, 26, 0.05) 50%, transparent 70%)
        `,
        backgroundSize: '200% 200%',
        animation: 'flowingBackground 8s ease-in-out infinite'
      }} />

      <h3 style={{
        color: '#ffffff',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '20px',
        textAlign: 'center',
        textShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
        position: 'relative',
        zIndex: 1
      }}>
        📈 实时性能监控流
      </h3>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <svg ref={svgRef} width="100%" height="380" viewBox="0 0 1400 380" />
      </div>
    </motion.div>
  );
};

// ==================== 主控制中心组件 ====================

const DashboardViewPro: React.FC = () => {
  const navigate = useNavigate();
  
  // 实时数据状态
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 62,
    gpu: 38,
    network: 25,
    storage: 73,
    processes: 89
  });

  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics>({
    total: 128,
    active: 23,
    completed: 95,
    pending: 10,
    computing: 6
  });

  // 模块状态监控 - 为2号和3号专家模块准备
  const [moduleStatus, setModuleStatus] = useState({
    geometry: { status: 'ready', lastUpdate: Date.now(), progress: 100 },
    geology: { status: 'ready', lastUpdate: Date.now(), progress: 100 },
    meshing: { status: 'idle', lastUpdate: Date.now(), progress: 0 },
    analysis: { status: 'idle', lastUpdate: Date.now(), progress: 0 },
    results: { status: 'idle', lastUpdate: Date.now(), progress: 0 },
    kratos: { status: 'ready', lastUpdate: Date.now(), progress: 100 }
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // 实时数据更新
  useEffect(() => {
    const systemInterval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 8)),
        memory: Math.max(20, Math.min(85, prev.memory + (Math.random() - 0.5) * 6)),
        gpu: Math.max(5, Math.min(95, prev.gpu + (Math.random() - 0.5) * 12)),
        network: Math.max(5, Math.min(80, prev.network + (Math.random() - 0.5) * 10)),
        storage: Math.max(30, Math.min(90, prev.storage + (Math.random() - 0.5) * 4)),
        processes: Math.max(50, Math.min(99, prev.processes + (Math.random() - 0.5) * 6))
      }));
    }, 2000);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const projectInterval = setInterval(() => {
      setProjectMetrics(prev => ({
        ...prev,
        active: Math.max(15, Math.min(35, prev.active + Math.floor((Math.random() - 0.5) * 4))),
        computing: Math.max(3, Math.min(12, prev.computing + Math.floor((Math.random() - 0.5) * 2)))
      }));
    }, 5000);

    // 监听模块状态变化
    const moduleStateListener = (data: any) => {
      setModuleStatus(prev => ({
        ...prev,
        [data.module]: data.state
      }));
    };

    moduleHub.addEventListener('state:updated', moduleStateListener);

    return () => {
      clearInterval(systemInterval);
      clearInterval(timeInterval);
      clearInterval(projectInterval);
      moduleHub.removeEventListener('state:updated', moduleStateListener);
    };
  }, []);

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0a0e27 0%, #000000 100%)',
      overflow: 'hidden',
      padding: '20px'
    }}>
      {/* 3D 地球背景 */}
      <Globe3DBackground />

      {/* 主标题区域 */}
      <motion.div
        style={{
          textAlign: 'center',
          marginBottom: '40px',
          position: 'relative',
          zIndex: 10
        }}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #00d9ff 0%, #722ed1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          textShadow: '0 0 30px rgba(0, 217, 255, 0.5)'
        }}>
          DeepCAD 智能控制中心 - 主工作台
        </h1>
        
        <div style={{
          fontSize: '18px',
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '8px'
        }}>
          深基坑智能分析设计系统 • 大屏级数据可视化平台
        </div>
        
        <motion.div
          style={{
            fontSize: '24px',
            color: '#00d9ff',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}
          animate={{
            textShadow: [
              '0 0 10px #00d9ff50',
              '0 0 20px #00d9ff80',
              '0 0 10px #00d9ff50'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {currentTime.toLocaleTimeString()}
        </motion.div>
      </motion.div>

      {/* 主要内容区域 - 三排布局 */}
      <div style={{
        width: '100%',
        maxWidth: '1600px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        position: 'relative',
        zIndex: 5,
        padding: '0 40px'
      }}>
        {/* 第一排：项目状态总览 */}
        <div>
          <ProjectStatusMega projects={projectMetrics} />
        </div>

        {/* 第二排：系统资源监控（凝重）+ 实时性能监控（灵动） */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '40px',
          alignItems: 'stretch',
          minHeight: '450px'
        }}>
          <SystemMonitorPanel metrics={systemMetrics} />
          <PerformanceStreamChart />
        </div>

        {/* 第三排：快速导航按钮 */}
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            padding: '30px 0 40px 0'
          }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
        >
          {[
            { 
              label: '几何建模', 
              path: '/geometry', 
              color: '#00d9ff', 
              icon: '🏗️',
              status: moduleStatus.geometry.status,
              description: '2号几何专家模块'
            },
            { 
              label: '仿真分析', 
              path: '/analysis', 
              color: '#52c41a', 
              icon: '⚡',
              status: moduleStatus.analysis.status,
              description: '3号计算专家模块'
            },
            { 
              label: '结果查看', 
              path: '/results', 
              color: '#faad14', 
              icon: '📊',
              status: moduleStatus.results.status,
              description: '计算结果与可视化'
            },
            { 
              label: '材料库', 
              path: '/materials', 
              color: '#13c2c2', 
              icon: '🏗️',
              status: 'ready',
              description: '2号专家材料管理系统'
            },
            { 
              label: '物理AI', 
              path: '/physics-ai', 
              color: '#eb2f96', 
              icon: '🧠',
              status: 'ready',
              description: '3号专家物理AI助手'
            },
            { 
              label: '系统设置', 
              path: '/settings', 
              color: '#722ed1', 
              icon: '⚙️',
              status: 'ready',
              description: '系统配置与管理'
            }
          ].map((item, index) => (
            <motion.button
              key={index}
              onClick={() => navigate(item.path)}
              style={{
                background: `linear-gradient(135deg, ${item.color}15, ${item.color}25)`,
                border: `1.5px solid ${item.color}60`,
                borderRadius: '12px',
                padding: '14px 20px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '140px',
                transition: 'all 0.3s ease'
              }}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.4 + index * 0.1 }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: `0 10px 25px ${item.color}40`,
                border: `1.5px solid ${item.color}`,
                background: `linear-gradient(135deg, ${item.color}25, ${item.color}35)`
              }}
              whileTap={{ scale: 0.95 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span>{item.label}</span>
                {/* 模块状态指示器 */}
                <motion.div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: (item as any).status === 'ready' ? '#52c41a' : 
                                   (item as any).status === 'computing' ? '#faad14' : 
                                   (item as any).status === 'error' ? '#f5222d' : '#666666'
                  }}
                  animate={{
                    scale: [(item as any).status === 'computing' ? 1 : 1.2, 1, (item as any).status === 'computing' ? 1 : 1.2],
                    opacity: [(item as any).status === 'computing' ? 0.5 : 0.8, 1, (item as any).status === 'computing' ? 0.5 : 0.8]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* 状态指示灯 */}
      <motion.div
        style={{
          position: 'fixed',
          top: '30px',
          right: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '12px 20px',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          zIndex: 100
        }}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <motion.div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#52c41a'
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          系统运行正常
        </span>
      </motion.div>

      {/* CSS 动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes flowingBackground {
          0%, 100% { 
            background-position: 0% 0%;
            opacity: 0.3;
          }
          50% { 
            background-position: 100% 100%;
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardViewPro;