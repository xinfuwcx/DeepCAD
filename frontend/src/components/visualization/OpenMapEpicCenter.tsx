/**
 * 使用免费OpenStreetMap + Three.js的Epic控制中心
 * 无需API Token，完全免费使用
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

interface OpenMapEpicProps {
  width: number;
  height: number;
  onExit: () => void;
}

interface Project {
  id: string;
  name: string;
  lat: number;
  lng: number;
  depth: number;
  status: 'completed' | 'active' | 'planning';
  progress: number;
  description: string;
}

// 项目数据
const PROJECTS: Project[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    lat: 31.2304,
    lng: 121.4737,
    depth: 70,
    status: 'completed',
    progress: 100,
    description: '632米超高层建筑深基坑工程'
  },
  {
    id: 'beijing-airport',
    name: '北京大兴机场T1',
    lat: 39.5098,
    lng: 116.4105,
    depth: 45,
    status: 'active',
    progress: 85,
    description: '世界最大单体航站楼基坑'
  },
  {
    id: 'shenzhen-qianhai',
    name: '深圳前海金融区',
    lat: 22.5431,
    lng: 113.9339,
    depth: 35,
    status: 'planning',
    progress: 15,
    description: '大型金融区深基坑群'
  },
  {
    id: 'guangzhou-cbd',
    name: '广州珠江新城CBD',
    lat: 23.1291,
    lng: 113.3240,
    depth: 55,
    status: 'completed',
    progress: 100,
    description: 'CBD核心区超深基坑群'
  }
];

// 简单的地图实现类
class SimpleWebMap {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private zoom: number = 6;
  private center: { lat: number, lng: number } = { lat: 31, lng: 113 };
  private markers: Map<string, any> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.background = '#1a1a2e';
    
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);
    
    this.render();
    this.setupEvents();
  }

  // 经纬度转屏幕坐标
  private lngLatToScreen(lng: number, lat: number): { x: number, y: number } {
    const scale = Math.pow(2, this.zoom);
    const worldSize = 256 * scale;
    
    const x = (lng + 180) / 360 * worldSize;
    const y = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize;
    
    const centerX = (this.center.lng + 180) / 360 * worldSize;
    const centerY = (1 - Math.log(Math.tan(this.center.lat * Math.PI / 180) + 1 / Math.cos(this.center.lat * Math.PI / 180)) / Math.PI) / 2 * worldSize;
    
    return {
      x: this.width / 2 + (x - centerX),
      y: this.height / 2 + (y - centerY)
    };
  }

  private render() {
    // 清空画布
    this.ctx.fillStyle = '#001122';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 绘制网格
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < this.width; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.height);
      this.ctx.stroke();
    }
    
    for (let i = 0; i < this.height; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.width, i);
      this.ctx.stroke();
    }
    
    // 绘制中国轮廓 (简化)
    this.drawChinaOutline();
    
    // 绘制标记
    this.markers.forEach((marker, id) => {
      this.drawMarker(marker);
    });
    
    // 绘制信息
    this.drawMapInfo();
  }

  private drawChinaOutline() {
    const outline = [
      { lat: 50, lng: 80 }, { lat: 45, lng: 90 }, { lat: 40, lng: 95 },
      { lat: 42, lng: 100 }, { lat: 45, lng: 110 }, { lat: 50, lng: 120 },
      { lat: 48, lng: 130 }, { lat: 45, lng: 135 }, { lat: 40, lng: 125 },
      { lat: 35, lng: 120 }, { lat: 30, lng: 122 }, { lat: 25, lng: 120 },
      { lat: 20, lng: 110 }, { lat: 18, lng: 105 }, { lat: 20, lng: 100 },
      { lat: 25, lng: 95 }, { lat: 30, lng: 90 }, { lat: 35, lng: 85 },
      { lat: 40, lng: 80 }, { lat: 45, lng: 75 }, { lat: 50, lng: 80 }
    ];
    
    this.ctx.beginPath();
    outline.forEach((point, index) => {
      const screen = this.lngLatToScreen(point.lng, point.lat);
      if (index === 0) {
        this.ctx.moveTo(screen.x, screen.y);
      } else {
        this.ctx.lineTo(screen.x, screen.y);
      }
    });
    this.ctx.closePath();
    
    this.ctx.fillStyle = 'rgba(0, 100, 200, 0.2)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawMarker(marker: any) {
    const screen = this.lngLatToScreen(marker.lng, marker.lat);
    
    // 绘制标记圆点
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, 15, 0, Math.PI * 2);
    this.ctx.fillStyle = marker.selected ? '#00ffff' : 
                        marker.status === 'completed' ? '#52c41a' :
                        marker.status === 'active' ? '#faad14' : '#8c8c8c';
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 绘制标记文字
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🏗️', screen.x, screen.y + 4);
    
    // 绘制标签
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(screen.x - 60, screen.y - 40, 120, 25);
    
    this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(screen.x - 60, screen.y - 40, 120, 25);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(marker.name, screen.x, screen.y - 30);
    this.ctx.fillText(`🕳️ ${marker.depth}m | 📊 ${marker.progress}%`, screen.x, screen.y - 18);
    
    // 选中效果
    if (marker.selected) {
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, 25, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#00ffff';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  private drawMapInfo() {
    // 绘制标题
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(this.width / 2 - 150, 20, 300, 40);
    
    this.ctx.fillStyle = '#00ffff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('中国深基坑工程项目分布图', this.width / 2, 45);
    
    // 绘制缩放信息
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(20, this.height - 60, 200, 40);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`🎯 中心: ${this.center.lat.toFixed(2)}°N, ${this.center.lng.toFixed(2)}°E`, 25, this.height - 40);
    this.ctx.fillText(`🔍 缩放: ${this.zoom} | 🖱️ 滚轮缩放, 拖拽移动`, 25, this.height - 25);
  }

  private setupEvents() {
    let isDragging = false;
    let lastX = 0, lastY = 0;
    
    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      
      // 检查点击的标记
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      this.markers.forEach((marker, id) => {
        const screen = this.lngLatToScreen(marker.lng, marker.lat);
        const dist = Math.sqrt((clickX - screen.x) ** 2 + (clickY - screen.y) ** 2);
        if (dist < 20) {
          this.selectMarker(id);
        }
      });
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      
      this.center.lng -= deltaX * 0.01;
      this.center.lat += deltaY * 0.01;
      
      lastX = e.clientX;
      lastY = e.clientY;
      
      this.render();
    });
    
    this.canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      this.zoom = Math.max(3, Math.min(12, this.zoom + delta));
      this.render();
    });
  }

  addMarker(id: string, project: Project) {
    this.markers.set(id, {
      ...project,
      selected: false
    });
    this.render();
  }

  selectMarker(id: string) {
    this.markers.forEach((marker, markerId) => {
      marker.selected = markerId === id;
    });
    this.render();
    
    // 触发选择事件
    const marker = this.markers.get(id);
    if (marker && this.onMarkerSelect) {
      this.onMarkerSelect(marker);
    }
  }

  flyTo(lat: number, lng: number, targetZoom: number = 10) {
    const startLat = this.center.lat;
    const startLng = this.center.lng;
    const startZoom = this.zoom;
    
    const duration = 2000; // 2秒
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 缓动函数
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.center.lat = startLat + (lat - startLat) * eased;
      this.center.lng = startLng + (lng - startLng) * eased;
      this.zoom = startZoom + (targetZoom - startZoom) * eased;
      
      this.render();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  onMarkerSelect?: (marker: any) => void;

  destroy() {
    if (this.container.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
    }
  }
}

// 主组件
export const OpenMapEpicCenter: React.FC<OpenMapEpicProps> = ({ width, height, onExit }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SimpleWebMap | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [showWeather, setShowWeather] = useState(true);

  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current) return;

    console.log('🗺️ 初始化自制地图系统...');
    
    const map = new SimpleWebMap(mapContainer.current);
    mapRef.current = map;
    
    // 添加项目标记
    PROJECTS.forEach(project => {
      map.addMarker(project.id, project);
    });
    
    // 设置标记选择回调
    map.onMarkerSelect = (marker) => {
      handleProjectClick(marker);
    };

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
      }
    };
  }, []);

  // 处理项目点击
  const handleProjectClick = useCallback((project: Project) => {
    if (isFlying) return;
    
    console.log(`🚁 飞行到项目: ${project.name}`);
    setIsFlying(true);
    setSelectedProject(project);
    
    // 地图飞行
    if (mapRef.current) {
      mapRef.current.flyTo(project.lat, project.lng, 10);
    }
    
    // 2.5秒后完成飞行
    setTimeout(() => {
      setIsFlying(false);
    }, 2500);

  }, [isFlying]);

  // 气象数据
  const getWeather = (project: Project) => {
    const weathers = [
      { temp: 25, desc: '晴朗', wind: 12, icon: '🌞' },
      { temp: 18, desc: '多云', wind: 8, icon: '⛅' },
      { temp: 22, desc: '阴天', wind: 15, icon: '☁️' },
      { temp: 28, desc: '炎热', wind: 6, icon: '🌤️' }
    ];
    return weathers[PROJECTS.indexOf(project)] || weathers[0];
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#000011'
    }}>
      {/* 顶部控制栏 */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'linear-gradient(45deg, #00ffff, #0080ff)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>🗺️</div>
            <div>
              <h1 style={{ color: '#ffffff', margin: 0, fontSize: '20px' }}>
                自制地图Epic控制中心
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontSize: '12px' }}>
                无依赖地图系统 + 项目飞行导航 + 实时监控
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowWeather(!showWeather)}
            style={{
              background: showWeather ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 0, 0.5)',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🌤️ {showWeather ? '气象 ON' : '气象 OFF'}
          </button>
        </div>

        <button
          onClick={onExit}
          style={{
            background: 'rgba(255, 100, 100, 0.8)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✕ 退出Epic
        </button>
      </motion.div>

      {/* 地图容器 */}
      <div
        ref={mapContainer}
        style={{
          position: 'absolute',
          top: '70px',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          cursor: 'grab'
        }}
      />

      {/* 左侧项目控制面板 */}
      <motion.div
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          position: 'absolute',
          left: '20px',
          top: '90px',
          width: '300px',
          maxHeight: 'calc(100vh - 130px)',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '15px',
          padding: '20px',
          backdropFilter: 'blur(15px)',
          zIndex: 500,
          overflowY: 'auto'
        }}
      >
        <h3 style={{ 
          color: '#00ffff', 
          margin: '0 0 15px 0',
          textAlign: 'center',
          fontSize: '16px'
        }}>
          🏗️ 项目飞行控制 ({PROJECTS.length})
        </h3>

        {isFlying && selectedProject && (
          <div style={{
            background: 'rgba(255, 165, 0, 0.2)',
            border: '1px solid rgba(255, 165, 0, 0.6)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px',
            color: '#ffaa00',
            textAlign: 'center',
            fontSize: '12px'
          }}>
            🚁 正在飞往: {selectedProject.name}
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
              Canvas地图飞行中...
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PROJECTS.map((project) => {
            const weather = getWeather(project);
            return (
              <div
                key={project.id}
                onClick={() => !isFlying && handleProjectClick(project)}
                style={{
                  background: selectedProject?.id === project.id ? 
                    'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  border: selectedProject?.id === project.id ? 
                    '2px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: isFlying ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isFlying ? 0.6 : 1
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ 
                    color: '#ffffff', 
                    margin: 0, 
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {project.name}
                  </h4>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: project.status === 'completed' ? '#52c41a' : 
                               project.status === 'active' ? '#faad14' : '#999',
                    boxShadow: `0 0 8px ${project.status === 'completed' ? '#52c41a' : 
                                         project.status === 'active' ? '#faad14' : '#999'}`
                  }} />
                </div>
                
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}>
                  <div>📍 {project.lat.toFixed(3)}°N, {project.lng.toFixed(3)}°E</div>
                  <div>🕳️ 深度: {project.depth}m | 📊 进度: {project.progress}%</div>
                  <div style={{ opacity: 0.9, marginTop: '4px' }}>{project.description}</div>
                  
                  {showWeather && (
                    <div style={{ 
                      color: '#00ffff', 
                      marginTop: '6px',
                      padding: '4px',
                      background: 'rgba(0, 255, 255, 0.1)',
                      borderRadius: '4px'
                    }}>
                      {weather.icon} {weather.temp}°C | 💨 {weather.wind}km/h | {weather.desc}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(0, 255, 255, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center'
        }}>
          💡 点击项目卡片或地图标记启动飞行<br/>
          🗺️ 鼠标拖拽移动，滚轮缩放地图<br/>
          🎮 自制Canvas地图 + 飞行动画
        </div>
      </motion.div>

      {/* 飞行状态指示器 */}
      <AnimatePresence>
        {isFlying && selectedProject && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              border: '3px solid #00ffff',
              borderRadius: '20px',
              padding: '30px',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 2000,
              backdropFilter: 'blur(15px)',
              boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
            }}
          >
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, ease: 'linear', repeat: Infinity },
                scale: { duration: 1, ease: 'easeInOut', repeat: Infinity }
              }}
              style={{ fontSize: '60px', marginBottom: '20px' }}
            >
              🚁
            </motion.div>
            <div style={{ fontSize: '20px', marginBottom: '8px', color: '#00ffff' }}>
              Canvas地图飞行
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '15px' }}>
              飞往 {selectedProject.name}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              自制地图系统 + 平滑飞行动画
            </div>
            
            <div style={{ 
              marginTop: '20px', 
              height: '6px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '3px',
              overflow: 'hidden',
              width: '200px'
            }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ffff, #0080ff, #00ffff)',
                  borderRadius: '3px'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OpenMapEpicCenter;