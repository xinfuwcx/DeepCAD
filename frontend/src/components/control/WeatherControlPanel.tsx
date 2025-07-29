/**
 * 天气效果控制面板 - 1号专家炫酷天气系统控制界面
 * 提供雨雪雾云彩等所有天气效果的实时控制
 * 与控制中心完美集成
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GeoThreeMapController } from '../../services/GeoThreeMapController';

// ======================= 接口定义 =======================

interface WeatherControlPanelProps {
  mapController: GeoThreeMapController | null;
  isVisible: boolean;
  onClose: () => void;
}

interface WeatherEffectState {
  rain: boolean;
  snow: boolean;
  fog: boolean;
  clouds: boolean;
  intensity: number;
  cloudCoverage: number;
}

// ======================= 天气效果图标组件 =======================

const WeatherIcon: React.FC<{ type: string; active: boolean; size?: number }> = ({ 
  type, 
  active, 
  size = 24 
}) => {
  const icons = {
    rain: '🌧️',
    snow: '❄️',
    fog: '🌫️',
    clouds: '☁️',
    clear: '☀️',
    intensity: '⚡',
    coverage: '🌥️'
  };

  return (
    <motion.div
      animate={{
        scale: active ? [1, 1.2, 1] : 1,
        rotate: active ? [0, 5, -5, 0] : 0
      }}
      transition={{
        duration: 0.5,
        repeat: active ? Infinity : 0,
        repeatDelay: 2
      }}
      style={{
        fontSize: `${size}px`,
        filter: active ? 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.8))' : 'grayscale(0.5)',
        display: 'inline-block'
      }}
    >
      {icons[type as keyof typeof icons] || '🌤️'}
    </motion.div>
  );
};

// ======================= 滑块控件组件 =======================

const WeatherSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  icon: string;
}> = ({ label, value, onChange, min = 0, max = 1, step = 0.1, icon }) => {
  return (
    <div style={{
      background: 'rgba(0, 255, 255, 0.1)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      borderRadius: '12px',
      padding: '15px',
      marginBottom: '15px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <WeatherIcon type={icon} active={value > 0.1} size={20} />
          <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}>
            {label}
          </span>
        </div>
        <span style={{
          color: '#00ffff',
          fontSize: '12px',
          background: 'rgba(0, 255, 255, 0.2)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            background: `linear-gradient(to right, 
              rgba(0, 255, 255, 0.3) 0%, 
              rgba(0, 255, 255, 0.8) ${value * 100}%, 
              rgba(255, 255, 255, 0.2) ${value * 100}%, 
              rgba(255, 255, 255, 0.2) 100%)`,
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
            WebkitAppearance: 'none'
          }}
        />
      </div>
    </div>
  );
};

// ======================= 主控制面板组件 =======================

export const WeatherControlPanel: React.FC<WeatherControlPanelProps> = ({
  mapController,
  isVisible,
  onClose
}) => {
  const [weatherState, setWeatherState] = useState<WeatherEffectState>({
    rain: false,
    snow: false,
    fog: false,
    clouds: true,
    intensity: 0.5,
    cloudCoverage: 0.6
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('北京, 中国');

  // 天气效果切换处理
  const handleWeatherToggle = (effectType: keyof WeatherEffectState) => {
    if (!mapController) return;

    const newState = {
      ...weatherState,
      [effectType]: !weatherState[effectType]
    };

    // 互斥逻辑：雨雪不能同时存在
    if (effectType === 'rain' && newState.rain) {
      newState.snow = false;
      mapController.setSnowEnabled(false);
    } else if (effectType === 'snow' && newState.snow) {
      newState.rain = false;
      mapController.setRainEnabled(false);
    }

    setWeatherState(newState);

    // 应用到地图控制器
    switch (effectType) {
      case 'rain':
        mapController.setRainEnabled(newState.rain);
        break;
      case 'snow':
        mapController.setSnowEnabled(newState.snow);
        break;
      case 'fog':
        mapController.setFogEnabled(newState.fog);
        break;
      case 'clouds':
        mapController.setCloudsEnabled(newState.clouds);
        break;
    }

    console.log(`🌦️ 天气效果切换: ${effectType} = ${newState[effectType]}`);
  };

  // 强度调整处理
  const handleIntensityChange = (intensity: number) => {
    if (!mapController) return;

    setWeatherState(prev => ({ ...prev, intensity }));
    mapController.setWeatherIntensity(intensity);
    
    console.log(`🌦️ 天气强度调整: ${intensity.toFixed(2)}`);
  };

  // 云覆盖度调整处理
  const handleCoverageChange = (coverage: number) => {
    if (!mapController) return;

    setWeatherState(prev => ({ ...prev, cloudCoverage: coverage }));
    mapController.setCloudCoverage(coverage);
    
    console.log(`☁️ 云覆盖度调整: ${coverage.toFixed(2)}`);
  };

  // 加载当前位置天气
  const loadCurrentWeather = async () => {
    if (!mapController) return;

    setIsLoading(true);
    try {
      // 使用北京坐标作为默认位置
      await mapController.loadWeatherForLocation(39.9042, 116.4074);
      console.log('🌤️ 当前位置天气已加载');
    } catch (error) {
      console.warn('⚠️ 天气加载失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 预设天气场景
  const applyWeatherPreset = (preset: string) => {
    if (!mapController) return;

    let newState: WeatherEffectState;

    switch (preset) {
      case 'sunny':
        newState = {
          rain: false, snow: false, fog: false, clouds: false,
          intensity: 0.3, cloudCoverage: 0.2
        };
        break;
      case 'cloudy':
        newState = {
          rain: false, snow: false, fog: false, clouds: true,
          intensity: 0.5, cloudCoverage: 0.7
        };
        break;
      case 'rainy':
        newState = {
          rain: true, snow: false, fog: true, clouds: true,
          intensity: 0.8, cloudCoverage: 0.9
        };
        break;
      case 'snowy':
        newState = {
          rain: false, snow: true, fog: false, clouds: true,
          intensity: 0.6, cloudCoverage: 0.8
        };
        break;
      case 'stormy':
        newState = {
          rain: true, snow: false, fog: true, clouds: true,
          intensity: 1.0, cloudCoverage: 1.0
        };
        break;
      default:
        return;
    }

    setWeatherState(newState);

    // 应用所有效果
    mapController.setRainEnabled(newState.rain);
    mapController.setSnowEnabled(newState.snow);
    mapController.setFogEnabled(newState.fog);
    mapController.setCloudsEnabled(newState.clouds);
    mapController.setWeatherIntensity(newState.intensity);
    mapController.setCloudCoverage(newState.cloudCoverage);

    console.log(`🌦️ 应用天气预设: ${preset}`);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '90px',
            width: '300px',
            maxHeight: 'calc(100vh - 130px)',
            background: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid',
            borderImage: 'linear-gradient(135deg, #00ffff, #0080ff, #ff00ff, #00ffff) 1',
            borderRadius: '15px',
            padding: '20px',
            backdropFilter: 'blur(15px)',
            zIndex: 1000,
            overflowY: 'auto',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)'
          }}
        >
          {/* 标题栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
            paddingBottom: '15px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{ fontSize: '24px' }}
              >
                🌦️
              </motion.div>
              <div>
                <h3 style={{ 
                  color: '#00ffff', 
                  margin: 0, 
                  fontSize: '16px',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  天气控制中心
                </h3>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  margin: 0, 
                  fontSize: '11px' 
                }}>
                  实时天气效果系统
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 100, 100, 0.8)',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          </div>

          {/* 当前位置天气 */}
          <div style={{
            background: 'rgba(0, 100, 200, 0.2)',
            border: '1px solid rgba(0, 100, 200, 0.4)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#ffffff', fontSize: '12px', marginBottom: '8px' }}>
              📍 {currentLocation}
            </div>
            <button
              onClick={loadCurrentWeather}
              disabled={isLoading}
              style={{
                background: isLoading ? 'rgba(100, 100, 100, 0.5)' : 'rgba(0, 150, 255, 0.8)',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '6px 12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '11px'
              }}
            >
              {isLoading ? '📡 加载中...' : '🌤️ 加载实时天气'}
            </button>
          </div>

          {/* 天气效果开关 */}
          <div style={{
            background: 'rgba(0, 255, 255, 0.1)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <h4 style={{ 
              color: '#00ffff', 
              margin: '0 0 15px 0', 
              fontSize: '14px',
              textAlign: 'center'
            }}>
              ⚡ 天气效果开关
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px'
            }}>
              {[
                { key: 'rain', label: '雨滴', icon: 'rain' },
                { key: 'snow', label: '雪花', icon: 'snow' },
                { key: 'fog', label: '雾气', icon: 'fog' },
                { key: 'clouds', label: '云彩', icon: 'clouds' }
              ].map(({ key, label, icon }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleWeatherToggle(key as keyof WeatherEffectState)}
                  style={{
                    background: weatherState[key as keyof WeatherEffectState] 
                      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 150, 255, 0.3))'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: weatherState[key as keyof WeatherEffectState]
                      ? '2px solid #00ffff'
                      : '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '10px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <WeatherIcon 
                    type={icon} 
                    active={weatherState[key as keyof WeatherEffectState] as boolean} 
                    size={18} 
                  />
                  {label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 强度控制 */}
          <WeatherSlider
            label="天气强度"
            value={weatherState.intensity}
            onChange={handleIntensityChange}
            icon="intensity"
          />

          {/* 云覆盖度控制 */}
          <WeatherSlider
            label="云层覆盖"
            value={weatherState.cloudCoverage}
            onChange={handleCoverageChange}
            icon="coverage"
          />

          {/* 天气预设 */}
          <div style={{
            background: 'rgba(255, 165, 0, 0.1)',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '10px',
            padding: '15px'
          }}>
            <h4 style={{ 
              color: '#ffaa00', 
              margin: '0 0 15px 0', 
              fontSize: '14px',
              textAlign: 'center'
            }}>
              🎨 天气预设场景
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              {[
                { key: 'sunny', label: '晴朗', icon: '☀️' },
                { key: 'cloudy', label: '多云', icon: '⛅' },
                { key: 'rainy', label: '雨天', icon: '🌧️' },
                { key: 'snowy', label: '雪天', icon: '❄️' }
              ].map(({ key, label, icon }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => applyWeatherPreset(key)}
                  style={{
                    background: 'rgba(255, 165, 0, 0.2)',
                    border: '1px solid rgba(255, 165, 0, 0.4)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '8px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{icon}</span>
                  {label}
                </motion.button>
              ))}
            </div>
            
            {/* 暴风雨预设 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyWeatherPreset('stormy')}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.3), rgba(255, 100, 0, 0.3))',
                border: '2px solid rgba(255, 0, 0, 0.5)',
                borderRadius: '8px',
                color: '#ffffff',
                padding: '10px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 'bold'
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ fontSize: '16px' }}
              >
                ⛈️
              </motion.span>
              暴风雨模式
            </motion.button>
          </div>

          {/* 系统状态 */}
          <div style={{
            marginTop: '20px',
            padding: '10px',
            background: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid rgba(0, 255, 0, 0.3)',
            borderRadius: '6px',
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center'
          }}>
            💡 天气效果基于实时数据驱动<br/>
            🌍 支持全球任意位置天气模拟<br/>
            ⚡ GPU加速渲染，60FPS流畅体验
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WeatherControlPanel;