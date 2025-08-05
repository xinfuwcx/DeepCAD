/**
 * 简化版EPIC控制中心 - 不使用3D地图
 * 基于图片界面设计的简单版本
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './NewEpicControlCenter.css';

// 天气状态接口
interface WeatherState {
  rain: boolean;
  snow: boolean;
  fog: boolean;
  clouds: boolean;
  intensity: number;
  cloudCoverage: number;
}

// 位置接口
interface Location {
  name: string;
  lat: number;
  lng: number;
}

// 简单的地图控制器
class SimpleMapController {
  private container: HTMLDivElement | null = null;
  private isInitializing = false;
  private statusCallback: ((status: 'loading' | 'ready' | 'error', message?: string) => void) | null = null;

  setStatusCallback(callback: (status: 'loading' | 'ready' | 'error', message?: string) => void) {
    this.statusCallback = callback;
  }

  async initialize(container: HTMLDivElement) {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    this.container = container;
    this.statusCallback?.('loading');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!this.container || !this.container.parentNode) {
        this.statusCallback?.('error');
        return;
      }
      
      // 创建简单的地图界面
      this.createSimpleMapInterface();
      this.statusCallback?.('ready');
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      this.statusCallback?.('error', errorMsg);
    } finally {
      this.isInitializing = false;
    }
  }

  private createSimpleMapInterface() {
    if (!this.container) return;

    // 清理容器
    this.container.innerHTML = '';
    
    // 创建地图界面
    const mapInterface = document.createElement('div');
    mapInterface.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: white;
      font-family: 'Arial', sans-serif;
      position: relative;
      overflow: hidden;
    `;
    
    // 添加地图网格背景
    const gridOverlay = document.createElement('div');
    gridOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
    `;
    mapInterface.appendChild(gridOverlay);
    
    mapInterface.innerHTML += `
      <div style="text-align: center; z-index: 1;">
        <div style="font-size: 72px; margin-bottom: 20px;">🗺️</div>
        <h2 style="margin: 0 0 15px 0; font-size: 28px; font-weight: bold;">EPIC地图控制中心</h2>
        <p style="margin: 0 0 30px 0; opacity: 0.9; font-size: 18px;">专业级地理信息系统</p>
        <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
          <div style="padding: 15px 25px; background: rgba(255,255,255,0.2); border-radius: 10px; backdrop-filter: blur(10px);">
            <div style="font-size: 24px; font-weight: bold;">北京</div>
            <div style="font-size: 14px; opacity: 0.8;">116.4074, 39.9042</div>
          </div>
          <div style="padding: 15px 25px; background: rgba(255,255,255,0.2); border-radius: 10px; backdrop-filter: blur(10px);">
            <div style="font-size: 24px; font-weight: bold;">在线</div>
            <div style="font-size: 14px; opacity: 0.8;">系统运行正常</div>
          </div>
        </div>
      </div>
    `;
    
    this.container.appendChild(mapInterface);
  }

  dispose() {
    this.container = null;
    this.isInitializing = false;
  }
}

// 地图容器组件
const ProtectedMapContainer: React.FC<{
  onContainerReady: (element: HTMLDivElement) => void;
}> = ({ onContainerReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isProtected) return;

    const container = containerRef.current;
    setIsProtected(true);
    onContainerReady(container);
  }, [onContainerReady, isProtected]);

  return (
    <div 
      ref={containerRef}
      className="map-display"
      style={{
        background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%'
      }}
    />
  );
};

// 主控制中心组件
export const NewEpicControlCenter: React.FC = () => {
  const simpleControllerRef = useRef<SimpleMapController>(new SimpleMapController());
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const [weatherState, setWeatherState] = useState<WeatherState>({
    rain: false,
    snow: false,
    fog: false,
    clouds: true,
    intensity: 0.5,
    cloudCoverage: 0.6
  });

  const [activeMapMode, setActiveMapMode] = useState('street');
  const [currentLocation, setCurrentLocation] = useState<Location>({
    name: '北京',
    lat: 39.9042,
    lng: 116.4074
  });

  const [showWeatherPanel, setShowWeatherPanel] = useState(true);
  const [weatherIntensity, setWeatherIntensity] = useState(50);
  const [cloudDensity, setCloudDensity] = useState(60);

  // 地图容器就绪回调
  const handleContainerReady = useCallback((container: HTMLDivElement) => {
    const controller = simpleControllerRef.current;
    controller.setStatusCallback((status, message) => {
      setMapStatus(status);
      if (message) {
        setErrorMessage(message);
      }
    });
    controller.initialize(container);
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      simpleControllerRef.current.dispose();
    };
  }, []);

  // 顶部导航栏配置 - 基于图片界面的按钮
  const navigationItems = [
    { key: 'street', label: '街道地图', icon: '🗺️', active: true },
    { key: 'satellite', label: '卫星影像', icon: '🛰️', active: false },
    { key: 'terrain', label: '地形图', icon: '🏔️', active: false },
    { key: 'dark', label: '暗色主题', icon: '🌙', active: false },
    { key: 'weather', label: '天气', icon: '🌤️', active: true },
    { key: 'weather-effects', label: '天气效果', icon: '⛈️', active: false },
    { key: 'epic', label: 'EPIC开关', icon: '⚡', active: false },
    { key: 'monitor', label: '大屏监控', icon: '📺', active: false },
    { key: 'ai', label: 'AI助手', icon: '🤖', active: false },
    { key: 'exit', label: 'EXIT', icon: '❌', active: false }
  ];

  // 天气效果切换
  const handleWeatherToggle = (type: keyof WeatherState) => {
    setWeatherState(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // 地图模式切换
  const handleMapModeChange = (mode: string) => {
    setActiveMapMode(mode);
  };

  // 天气强度调节
  const handleWeatherIntensityChange = (value: number) => {
    setWeatherIntensity(value);
    setWeatherState(prev => ({ ...prev, intensity: value / 100 }));
  };

  // 云层密度调节
  const handleCloudDensityChange = (value: number) => {
    setCloudDensity(value);
    setWeatherState(prev => ({ ...prev, cloudCoverage: value / 100 }));
  };

  return (
    <div className="epic-control-center" style={{ width: '100%', height: '100%' }}>
      
      {/* 顶部导航栏 */}
      <div className="epic-header">
        <div className="epic-logo">
          <div className="logo-icon">
            <div className="logo-cube">📦</div>
            <div className="logo-text">
              <div className="epic-title">EPIC控制中心</div>
              <div className="hyper-future">HYPER FUTURE SYSTEM</div>
            </div>
          </div>
        </div>
        
        <div className="epic-navigation">
          {navigationItems.map((item) => (
            <motion.button
              key={item.key}
              className={`nav-button ${item.active ? 'active' : ''} ${activeMapMode === item.key ? 'selected' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMapModeChange(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </motion.button>
          ))}
        </div>
        
        <div className="notification-badge">22</div>
      </div>

      {/* 主要内容区域 */}
      <div className="epic-main-content">
        {/* 地图显示区域 */}
        <div className="map-container">
          <ProtectedMapContainer onContainerReady={handleContainerReady} />
          
          {/* 地图状态覆盖层 */}
          {mapStatus === 'loading' && (
            <div className="map-loading-overlay">
              <div className="loading-content">
                <div className="loading-spinner">🗺️</div>
                <h3>地图系统启动中...</h3>
                <p>正在初始化界面...</p>
                <div className="loading-bar">
                  <div className="loading-progress"></div>
                </div>
              </div>
            </div>
          )}
          
          {mapStatus === 'error' && (
            <div className="map-error-overlay">
              <div className="error-content">
                <div className="error-icon">❌</div>
                <h3>地图加载失败</h3>
                <p>{errorMessage || '系统初始化失败'}</p>
                <div className="error-actions">
                  <button 
                    className="retry-button"
                    onClick={() => window.location.reload()}
                  >
                    🔄 重新加载
                  </button>
                  <button 
                    className="fallback-button"
                    onClick={() => {
                      setMapStatus('loading');
                      setTimeout(() => setMapStatus('ready'), 1000);
                    }}
                  >
                    🗺️ 使用简化地图
                  </button>
                </div>
                <div className="error-help">
                  <p>可能原因：</p>
                  <ul>
                    <li>• 系统资源不足</li>
                    <li>• 网络连接问题</li>
                    <li>• 浏览器兼容性问题</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {mapStatus === 'ready' && (
            <div className="map-status-info">
              <div className="status-badge">
                ✅ 地图系统 | {navigationItems.find(item => item.key === activeMapMode)?.label} | {currentLocation.name}
              </div>
            </div>
          )}
        </div>

        {/* 右侧控制面板 */}
        <div className="control-panels">
          {/* EPIC天气控制 */}
          <div className="control-card weather-card">
            <div className="card-header">
              <span className="card-icon">🌟</span>
              <h3>Epic天气控制</h3>
              <span className="card-status">AI驱动</span>
            </div>
            
            <div className="weather-controls">
              <div className="weather-buttons">
                {Object.entries({ rain: '🌧️', snow: '❄️', fog: '🌫️', clouds: '☁️' }).map(([type, icon]) => (
                  <motion.button
                    key={type}
                    className={`weather-btn ${weatherState[type as keyof WeatherState] ? 'active' : ''}`}
                    onClick={() => handleWeatherToggle(type as keyof WeatherState)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {icon}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* 天气强度控制 */}
          <div className="control-card intensity-card">
            <div className="card-header">
              <span className="card-icon">⚡</span>
              <h3>天气强度</h3>
              <span className="intensity-value">{weatherIntensity}%</span>
            </div>
            
            <div className="intensity-control">
              <input
                type="range"
                min="0"
                max="100"
                value={weatherIntensity}
                onChange={(e) => handleWeatherIntensityChange(Number(e.target.value))}
                className="intensity-slider"
              />
            </div>
          </div>

          {/* 云层密度控制 */}
          <div className="control-card clouds-card">
            <div className="card-header">
              <span className="card-icon">☁️</span>
              <h3>云层密度</h3>
              <span className="clouds-value">{cloudDensity}%</span>
            </div>
            
            <div className="clouds-control">
              <input
                type="range"
                min="0"
                max="100"
                value={cloudDensity}
                onChange={(e) => handleCloudDensityChange(Number(e.target.value))}
                className="clouds-slider"
              />
            </div>
          </div>

          {/* 天气预报设置 */}
          <div className="control-card forecast-card">
            <div className="card-header">
              <span className="card-icon">🌡️</span>
              <h3>天气预报设置</h3>
            </div>
            
            <div className="forecast-controls">
              <div className="forecast-buttons">
                <button className="forecast-btn active">晴</button>
                <button className="forecast-btn">多云</button>
                <button className="forecast-btn">雨</button>
                <button className="forecast-btn">雪</button>
              </div>
            </div>
          </div>

          {/* 系统增强 */}
          <div className="control-card system-card">
            <div className="card-header">
              <span className="card-icon">🚀</span>
              <h3>系统增强</h3>
            </div>
            
            <div className="system-info">
              <p>🌍 高精度地球渲染及多天气系统的叠加渲染技术</p>
              <p>🎯 GPS定位导航，以及内置地图的多级缩放技术</p>
              <p>💫 全球天气实时监控</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewEpicControlCenter;