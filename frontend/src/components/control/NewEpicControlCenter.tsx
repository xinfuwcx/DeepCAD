/**
 * EPIC控制中心 - 完整功能版本
 * 功能：真实地图渲染、天气数据集成、完整UI控制
 * 技术：iTowns + OpenMeteo + Zustand + Framer Motion
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SafetyOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useDeepCADTheme } from '../ui/DeepCADTheme';
import { iTownsMapController, MapLayerType } from './iTownsMapController';
import { weatherService, WeatherData } from '../../services/weatherService';
import { useControlCenterStore, useMapState, useUIState, useWeatherStateStore } from '../../stores/controlCenterStore';
import './NewEpicControlCenter.css';

const { Title, Text } = Typography;

// === 类型定义 ===
type NavigationKey = 'street' | 'satellite' | 'terrain' | 'dark' | 'weather' | 'weather-effects' | 'epic' | 'monitor' | 'ai' | 'exit';

interface NavigationItem {
  key: NavigationKey;
  label: string;
  icon: string;
  active: boolean;
}

// === 自定义 Hooks ===

// 地图控制器 Hook
const useMapController = () => {
  const mapControllerRef = useRef<iTownsMapController>();
  const setMapStatus = useControlCenterStore(state => state.setMapStatus);
  const setMapController = useControlCenterStore(state => state.setMapController);
  const currentLocation = useControlCenterStore(state => state.currentLocation);
  const darkMode = useControlCenterStore(state => state.darkMode);

  const initializeMap = useCallback((container: HTMLDivElement) => {
    if (mapControllerRef.current) {
      mapControllerRef.current.dispose();
    }

    mapControllerRef.current = new iTownsMapController({
      container,
      center: { lat: currentLocation.lat, lng: currentLocation.lng },
      zoom: 10000000,
      onStatusChange: (status, message) => {
        setMapStatus(status, message);
      }
    });

    // 将控制器实例传递到 store
    setMapController(mapControllerRef.current);

    mapControllerRef.current.initialize();
  }, [currentLocation.lat, currentLocation.lng, setMapStatus, setMapController]);

  useEffect(() => {
    return () => {
      mapControllerRef.current?.dispose();
      setMapController(null);
    };
  }, [setMapController]);

  // 监听暗色模式变化
  useEffect(() => {
    if (mapControllerRef.current) {
      mapControllerRef.current.setDarkMode(darkMode);
    }
  }, [darkMode]);

  return {
    initializeMap,
    mapController: mapControllerRef.current
  };
};

// 天气数据 Hook
const useWeatherData = () => {
  const currentLocation = useControlCenterStore(state => state.currentLocation);
  const setCurrentWeatherData = useControlCenterStore(state => state.setCurrentWeatherData);

  const fetchWeatherData = useCallback(async () => {
    try {
      const weatherData = await weatherService.getCurrentWeather({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        name: currentLocation.name
      });
      setCurrentWeatherData(weatherData);
      return weatherData;
    } catch (error) {
      console.error('获取天气数据失败:', error);
      return null;
    }
  }, [currentLocation.lat, currentLocation.lng, currentLocation.name, setCurrentWeatherData]);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  return { fetchWeatherData };
};

// === 子组件定义 ===

// 地图容器组件 - 集成 iTowns
const MapContainer: React.FC = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<iTownsMapController>();
  const mapStatus = useControlCenterStore(state => state.mapStatus);
  const setMapStatus = useControlCenterStore(state => state.setMapStatus);
  const setMapController = useControlCenterStore(state => state.setMapController);
  const currentLocation = useControlCenterStore(state => state.currentLocation);

  useEffect(() => {
    if (!containerRef.current || mapControllerRef.current) return;

    mapControllerRef.current = new iTownsMapController({
      container: containerRef.current,
      center: { lat: currentLocation.lat, lng: currentLocation.lng },
      zoom: 10000000,
      onStatusChange: (status, message) => {
        setMapStatus(status, message);
      }
    });

    setMapController(mapControllerRef.current);
    mapControllerRef.current.initialize();

    return () => {
      mapControllerRef.current?.dispose();
      setMapController(null);
    };
  }, []);  // 只在组件挂载时初始化一次

  return (
    <div className="map-container-wrapper" style={{
      position: 'relative',
      width: '100%',
      height: '100%'
    }}>
      <div 
        ref={containerRef}
        className="map-display"
        style={{
          width: '100%',
          height: '100%',
          background: mapStatus === 'loading' ? 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)' : 'transparent'
        }}
      />
      
      {/* 地图加载状态覆盖层 */}
      {mapStatus === 'loading' && (
        <div className="map-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">🌍</div>
            <h3>初始化地球系统...</h3>
            <p>正在加载 iTowns 3D 地球引擎...</p>
            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MapContainer.displayName = 'MapContainer';

// 导航按钮组件 - 增强功能
const NavigationButton: React.FC<{
  item: NavigationItem;
  isActive: boolean;
}> = React.memo(({ item, isActive }) => {
  const { handleNavigationClick } = useControlCenterStore();

  const handleClick = useCallback(() => {
    handleNavigationClick(item.key);
    
    // 地图图层切换逻辑会在 store 中处理
  }, [item.key, handleNavigationClick]);

  return (
    <motion.button
      style={{
        padding: '8px 16px',
        background: isActive ? 'rgba(114, 46, 209, 0.8)' : 'rgba(31, 34, 53, 0.6)',
        border: `1px solid ${isActive ? 'rgba(114, 46, 209, 0.8)' : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '8px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
        boxShadow: isActive ? '0 0 15px rgba(114, 46, 209, 0.3)' : 'none'
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </motion.button>
  );
});

NavigationButton.displayName = 'NavigationButton';

// === 主组件 ===
export const NewEpicControlCenter: React.FC = () => {
  // Hooks
  const { themeConfig } = useDeepCADTheme();
  useWeatherData(); // 初始化天气数据
  
  // 直接使用 store selectors
  const activeMapMode = useControlCenterStore(state => state.activeMapMode);
  const showWeatherPanel = useControlCenterStore(state => state.showWeatherPanel);
  const mapStatus = useControlCenterStore(state => state.mapStatus);
  const errorMessage = useControlCenterStore(state => state.errorMessage);
  const currentLocation = useControlCenterStore(state => state.currentLocation);
  const weatherState = useControlCenterStore(state => state.weatherState);
  const weatherIntensity = useControlCenterStore(state => state.weatherIntensity);
  const cloudDensity = useControlCenterStore(state => state.cloudDensity);
  
  // Store actions
  const handleNavigationClick = useControlCenterStore(state => state.handleNavigationClick);
  const updateWeatherState = useControlCenterStore(state => state.updateWeatherState);
  const setWeatherIntensity = useControlCenterStore(state => state.setWeatherIntensity);
  const setCloudDensity = useControlCenterStore(state => state.setCloudDensity);

  // === 常量定义 ===
  const navigationItems: NavigationItem[] = [
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

  // 天气按钮切换处理
  const handleWeatherToggle = useCallback((type: 'rain' | 'snow' | 'fog' | 'clouds') => {
    updateWeatherState({ [type]: !weatherState[type] });
  }, [weatherState, updateWeatherState]);

  // 渲染增强型顶部状态栏
  const renderEnhancedHeader = () => {
    return (
      <div style={{
        height: '80px',
        background: `linear-gradient(90deg, ${themeConfig.colors.background.secondary}, ${themeConfig.colors.background.tertiary}, ${themeConfig.colors.background.secondary})`,
        borderBottom: `2px solid ${themeConfig.colors.primary}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}>
        {/* 项目信息区域 */}
        <div>
          <Title level={4} style={{ 
            color: '#722ed1', // 支护结构紫色
            margin: 0 
          }}>
            🏢 控制中心
          </Title>
          <Text style={{ color: themeConfig.colors.text.secondary, fontSize: '12px' }}>
            Control Center
          </Text>
        </div>

        {/* 导航按钮区域 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {navigationItems.map((item) => (
            <NavigationButton
              key={item.key}
              item={item}
              isActive={activeMapMode === item.key}
            />
          ))}
        </div>

        {/* 通知徽章 */}
        <div style={{
          width: '30px',
          height: '30px',
          background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 0 15px rgba(255, 107, 107, 0.5)'
        }}>
          22
        </div>
      </div>
    );
  };

  return (
    <div className="epic-control-center" style={{ width: '100%', height: '100%' }}>
      
      {/* 增强型顶部状态栏 */}
      {renderEnhancedHeader()}


      {/* 主要内容区域 - 地图占满整个区域 */}
      <div className="epic-main-content" style={{ position: 'relative', flex: 1 }}>
        {/* 地图显示区域 - 占满整个可用空间 */}
        <div className="map-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <MapContainer />
          
          {/* 地图状态显示 */}
          {mapStatus === 'ready' && (
            <div className="map-status-info">
              <div className="status-badge">
                ✅ iTowns 地球引擎 | {navigationItems.find(item => item.key === activeMapMode)?.label} | {currentLocation.name}
              </div>
            </div>
          )}
          
          {mapStatus === 'error' && (
            <div className="map-error-overlay">
              <div className="error-content">
                <div className="error-icon">❌</div>
                <h3>地图加载失败</h3>
                <p>{errorMessage || 'iTowns 初始化失败'}</p>
                <div className="error-actions">
                  <button 
                    className="retry-button"
                    onClick={() => window.location.reload()}
                  >
                    🔄 重新加载
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 浮动的天气控制面板 - 只在点击天气按钮时显示 */}
        {showWeatherPanel && (
          <div className="epic-sidebar" style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '320px',
            maxHeight: 'calc(100% - 40px)',
            overflowY: 'auto',
            zIndex: 1000,
            background: 'rgba(21, 24, 34, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
          {/* Epic天气控制头部 */}
          <div className="weather-header-card" style={{ position: 'relative' }}>
            <div className="weather-title">
              <span className="weather-icon">🌟</span>
              <div>
                <h3>Epic天气控制</h3>
                <span className="ai-subtitle">实时天气效果系统</span>
              </div>
            </div>
            <button 
              className="close-btn"
              onClick={() => useControlCenterStore.getState().toggleWeatherPanel()}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 59, 59, 0.8)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>

          {/* 位置信息 */}
          <div className="location-card">
            <div className="location-info">
              <span className="location-pin">📍</span>
              <span className="location-text">北京, 中国</span>
            </div>
            <button className="weather-query-btn">查询当地天气</button>
          </div>

          {/* 天气效果开关 */}
          <div className="weather-effects-card">
            <div className="card-title">
              <span className="title-icon">⚡</span>
              <span>天气效果开关</span>
            </div>
            <div className="weather-grid">
              {Object.entries({ 
                rain: { icon: '🌧️', label: '雨滴' },
                snow: { icon: '❄️', label: '雪花' },
                fog: { icon: '🌫️', label: '雾气' },
                clouds: { icon: '☁️', label: '云朵' }
              }).map(([type, config]) => (
                <motion.button
                  key={type}
                  className={`weather-effect-btn ${weatherState[type as 'rain' | 'snow' | 'fog' | 'clouds'] ? 'active' : ''}`}
                  onClick={() => handleWeatherToggle(type as 'rain' | 'snow' | 'fog' | 'clouds')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="effect-icon">{config.icon}</span>
                  <span className="effect-label">{config.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 天气强度 */}
          <div className="slider-card">
            <div className="slider-header">
              <span className="slider-icon">⚡</span>
              <span className="slider-title">天气强度</span>
              <span className="slider-value">{weatherIntensity}%</span>
            </div>
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max="100"
                value={weatherIntensity}
                onChange={(e) => setWeatherIntensity(Number(e.target.value))}
                className="epic-slider"
              />
            </div>
          </div>

          {/* 云层密度 */}
          <div className="slider-card">
            <div className="slider-header">
              <span className="slider-icon">☁️</span>
              <span className="slider-title">云层密度</span>
              <span className="slider-value">{cloudDensity}%</span>
            </div>
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max="100"
                value={cloudDensity}
                onChange={(e) => setCloudDensity(Number(e.target.value))}
                className="epic-slider"
              />
            </div>
          </div>

          {/* 天气预报设置 */}
          <div className="forecast-card">
            <div className="card-title">
              <span className="title-icon">🌡️</span>
              <span>天气预报设置</span>
            </div>
            <div className="forecast-grid">
              <button className="forecast-item active">
                <span className="forecast-icon">☀️</span>
                <span className="forecast-label">晴</span>
              </button>
              <button className="forecast-item">
                <span className="forecast-icon">⛅</span>
                <span className="forecast-label">多云</span>
              </button>
              <button className="forecast-item">
                <span className="forecast-icon">☔</span>
                <span className="forecast-label">雨天</span>
              </button>
              <button className="forecast-item">
                <span className="forecast-icon">❄️</span>
                <span className="forecast-label">雪天</span>
              </button>
            </div>
            <button className="storm-mode-btn">
              <span className="storm-icon">🌪️</span>
              <span>暴风雨模式</span>
            </button>
          </div>

          {/* 系统增强 */}
          <div className="system-info-card">
            <div className="card-title">
              <span className="title-icon">💫</span>
              <span>天气系统基于开源地球现实环境</span>
            </div>
            <div className="info-list">
              <div className="info-item">🌍 支持全球任意地理位置渲染</div>
              <div className="info-item">⚡ GPU加速渲染，60FPS流畅体验</div>
              <div className="info-item">💾 支持天气状态与配置</div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default NewEpicControlCenter;