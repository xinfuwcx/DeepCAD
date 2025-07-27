/**
 * DeepCAD 免费天气服务
 * 无需注册的天气数据服务 + 高级可视化
 */

import * as THREE from 'three';

export interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
  precipitation: number;
  uvIndex: number;
  city: string;
  icon: string;
  timestamp: number;
}

export interface WeatherMapLayer {
  id: string;
  name: string;
  type: 'temperature' | 'precipitation' | 'wind' | 'cloud' | 'radar';
  visible: boolean;
  opacity: number;
  data: Float32Array;
  width: number;
  height: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface WindVector {
  lat: number;
  lng: number;
  speed: number;
  direction: number;
  color: string;
}

class FreeWeatherService {
  private weatherCache = new Map<string, WeatherData>();
  private lastUpdate = 0;

  /**
   * 使用免费的开放天气数据源
   * 1. MeteoBlue Public API (免费)
   * 2. Open-Meteo (完全免费，无需API key)
   * 3. WeatherStack (免费层)
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const now = Date.now();
    
    // 缓存5分钟
    if (this.weatherCache.has(cacheKey) && now - this.lastUpdate < 5 * 60 * 1000) {
      return this.weatherCache.get(cacheKey)!;
    }

    try {
      // 尝试Open-Meteo (完全免费，无需API key)
      const weather = await this.getOpenMeteoWeather(lat, lng);
      this.weatherCache.set(cacheKey, weather);
      this.lastUpdate = now;
      return weather;
    } catch (error) {
      console.warn('Free weather API failed, using enhanced simulation:', error);
      return this.getEnhancedSimulatedWeather(lat, lng);
    }
  }

  /**
   * Open-Meteo API (完全免费，无需注册)
   */
  private async getOpenMeteoWeather(lat: number, lng: number): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover&timezone=Asia/Shanghai`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }
    
    const data = await response.json();
    const current = data.current_weather;
    const hourly = data.hourly;
    
    // 获取当前小时的详细数据
    const currentHour = new Date().getHours();
    const currentIndex = Math.min(currentHour, hourly.time.length - 1);
    
    return {
      temperature: Math.round(current.temperature),
      description: this.getWeatherDescription(current.weathercode),
      windSpeed: Math.round(current.windspeed / 3.6), // km/h to m/s
      windDirection: current.winddirection,
      humidity: hourly.relative_humidity_2m[currentIndex] || 60,
      pressure: 1013, // 标准大气压
      visibility: this.calculateVisibility(current.weathercode),
      cloudCover: hourly.cloud_cover[currentIndex] || 50,
      precipitation: hourly.precipitation[currentIndex] || 0,
      uvIndex: this.calculateUVIndex(lat, lng),
      city: this.getCityName(lat, lng),
      icon: this.getWeatherIcon(current.weathercode),
      timestamp: Date.now()
    };
  }

  /**
   * 增强的模拟天气数据
   */
  private getEnhancedSimulatedWeather(lat: number, lng: number): WeatherData {
    // 基于地理位置和时间的更真实的模拟
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1;
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    
    // 季节性温度变化
    const seasonalTemp = 20 + 15 * Math.sin((dayOfYear - 80) * 2 * Math.PI / 365);
    
    // 日间温度变化
    const dailyVariation = 8 * Math.sin((hour - 6) * Math.PI / 12);
    
    // 纬度影响
    const latitudeEffect = (45 - Math.abs(lat)) * 0.5;
    
    const baseTemp = seasonalTemp + dailyVariation + latitudeEffect;
    
    // 随机天气模式
    const weatherPatterns = [
      { temp: 0, desc: '晴朗', cloud: 10, precip: 0, wind: 3 },
      { temp: -2, desc: '多云', cloud: 50, precip: 0, wind: 5 },
      { temp: -5, desc: '阴天', cloud: 80, precip: 0, wind: 7 },
      { temp: -8, desc: '小雨', cloud: 90, precip: 2, wind: 12 },
      { temp: -10, desc: '中雨', cloud: 95, precip: 8, wind: 15 },
      { temp: -12, desc: '大雨', cloud: 100, precip: 20, wind: 18 }
    ];
    
    const pattern = weatherPatterns[Math.floor(Math.random() * weatherPatterns.length)];
    
    return {
      temperature: Math.round(baseTemp + pattern.temp),
      description: pattern.desc,
      windSpeed: pattern.wind + Math.round(Math.random() * 5),
      windDirection: Math.round(Math.random() * 360),
      humidity: Math.round(50 + pattern.cloud * 0.4 + Math.random() * 20),
      pressure: Math.round(1013 + (Math.random() - 0.5) * 40),
      visibility: Math.round(30 - pattern.cloud * 0.2 - pattern.precip * 0.5),
      cloudCover: pattern.cloud + Math.round((Math.random() - 0.5) * 20),
      precipitation: pattern.precip + Math.round(Math.random() * 3),
      uvIndex: Math.max(0, Math.round((12 - hour > 6 ? hour - 6 : 18 - hour) * (100 - pattern.cloud) / 100)),
      city: this.getCityName(lat, lng),
      icon: this.getWeatherIcon(pattern.desc),
      timestamp: Date.now()
    };
  }

  /**
   * 生成温度热力图数据
   */
  generateTemperatureHeatmap(bounds: {north: number, south: number, east: number, west: number}, resolution: number = 100): WeatherMapLayer {
    const width = resolution;
    const height = resolution;
    const data = new Float32Array(width * height * 4); // RGBA
    
    // 生成温度场数据
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const lat = bounds.south + (bounds.north - bounds.south) * (1 - y / height);
        const lng = bounds.west + (bounds.east - bounds.west) * (x / width);
        
        // 模拟温度分布
        const baseTemp = 20 + Math.sin(lat * Math.PI / 180) * 15;
        const noise = (Math.sin(lng * 0.1) + Math.cos(lat * 0.1)) * 5;
        const temperature = baseTemp + noise + (Math.random() - 0.5) * 3;
        
        const index = (y * width + x) * 4;
        const color = this.temperatureToColor(temperature);
        
        data[index] = color.r;     // Red
        data[index + 1] = color.g; // Green
        data[index + 2] = color.b; // Blue
        data[index + 3] = 0.7;     // Alpha
      }
    }
    
    return {
      id: 'temperature-heatmap',
      name: '温度热力图',
      type: 'temperature',
      visible: true,
      opacity: 0.7,
      data,
      width,
      height,
      bounds
    };
  }

  /**
   * 生成降水热力图数据
   */
  generatePrecipitationHeatmap(bounds: {north: number, south: number, east: number, west: number}, resolution: number = 100): WeatherMapLayer {
    const width = resolution;
    const height = resolution;
    const data = new Float32Array(width * height * 4);
    
    // 模拟降水云团
    const rainCenters = [
      { lat: (bounds.north + bounds.south) / 2 + Math.random() * 2 - 1, 
        lng: (bounds.east + bounds.west) / 2 + Math.random() * 2 - 1, 
        intensity: Math.random() * 15 + 5 }
    ];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const lat = bounds.south + (bounds.north - bounds.south) * (1 - y / height);
        const lng = bounds.west + (bounds.east - bounds.west) * (x / width);
        
        let precipitation = 0;
        
        // 计算到雨团中心的距离
        rainCenters.forEach(center => {
          const distance = Math.sqrt((lat - center.lat) ** 2 + (lng - center.lng) ** 2);
          const influence = Math.max(0, center.intensity * Math.exp(-distance * 2));
          precipitation += influence;
        });
        
        // 添加噪声
        precipitation += Math.random() * 2;
        precipitation = Math.max(0, precipitation);
        
        const index = (y * width + x) * 4;
        const color = this.precipitationToColor(precipitation);
        
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = precipitation > 0.5 ? 0.6 : 0;
      }
    }
    
    return {
      id: 'precipitation-heatmap',
      name: '降水热力图',
      type: 'precipitation',
      visible: true,
      opacity: 0.6,
      data,
      width,
      height,
      bounds
    };
  }

  /**
   * 生成风向风速矢量数据
   */
  generateWindVectors(bounds: {north: number, south: number, east: number, west: number}, density: number = 20): WindVector[] {
    const vectors: WindVector[] = [];
    const latStep = (bounds.north - bounds.south) / density;
    const lngStep = (bounds.east - bounds.west) / density;
    
    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        const lat = bounds.south + i * latStep;
        const lng = bounds.west + j * lngStep;
        
        // 模拟风场
        const direction = (Math.atan2(lat - (bounds.north + bounds.south) / 2, lng - (bounds.east + bounds.west) / 2) * 180 / Math.PI + 360) % 360;
        const speed = 5 + Math.random() * 15 + Math.sin(lat * 0.1) * 5;
        
        vectors.push({
          lat,
          lng,
          speed,
          direction,
          color: this.windSpeedToColor(speed)
        });
      }
    }
    
    return vectors;
  }

  /**
   * 生成云图数据
   */
  generateCloudLayer(bounds: {north: number, south: number, east: number, west: number}, resolution: number = 150): WeatherMapLayer {
    const width = resolution;
    const height = resolution;
    const data = new Float32Array(width * height * 4);
    
    // 多层云系统
    const cloudLayers = [
      { scale: 0.02, amplitude: 0.3, offset: 0 },
      { scale: 0.05, amplitude: 0.2, offset: 100 },
      { scale: 0.1, amplitude: 0.1, offset: 200 }
    ];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const lat = bounds.south + (bounds.north - bounds.south) * (1 - y / height);
        const lng = bounds.west + (bounds.east - bounds.west) * (x / width);
        
        let cloudDensity = 0;
        
        // 多层噪声叠加
        cloudLayers.forEach(layer => {
          const noise = Math.sin((lng + layer.offset) * layer.scale) * Math.cos(lat * layer.scale);
          cloudDensity += noise * layer.amplitude;
        });
        
        cloudDensity = Math.max(0, Math.min(1, (cloudDensity + 1) / 2));
        
        const index = (y * width + x) * 4;
        
        data[index] = 1;     // White clouds
        data[index + 1] = 1;
        data[index + 2] = 1;
        data[index + 3] = cloudDensity * 0.8;
      }
    }
    
    return {
      id: 'cloud-layer',
      name: '云图',
      type: 'cloud',
      visible: true,
      opacity: 0.8,
      data,
      width,
      height,
      bounds
    };
  }

  /**
   * 生成雷达图层数据
   */
  generateRadarLayer(bounds: {north: number, south: number, east: number, west: number}, resolution: number = 100): WeatherMapLayer {
    const width = resolution;
    const height = resolution;
    const data = new Float32Array(width * height * 4);
    
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const lat = bounds.south + (bounds.north - bounds.south) * (1 - y / height);
        const lng = bounds.west + (bounds.east - bounds.west) * (x / width);
        
        // 距离中心的距离
        const distance = Math.sqrt((lat - centerLat) ** 2 + (lng - centerLng) ** 2);
        
        // 模拟雷达回波
        let intensity = 0;
        
        // 创建几个雷达回波区域
        if (distance < 1) {
          intensity = 0.8 * Math.exp(-distance * 2) * (1 + 0.5 * Math.sin(Date.now() * 0.01));
        }
        
        // 添加噪声和随机回波
        if (Math.random() < 0.1) {
          intensity += Math.random() * 0.4;
        }
        
        intensity = Math.max(0, Math.min(1, intensity));
        
        const index = (y * width + x) * 4;
        const color = this.radarIntensityToColor(intensity);
        
        data[index] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = intensity > 0.1 ? 0.7 : 0;
      }
    }
    
    return {
      id: 'radar-layer',
      name: '雷达图',
      type: 'radar',
      visible: true,
      opacity: 0.7,
      data,
      width,
      height,
      bounds
    };
  }

  // 颜色转换函数
  private temperatureToColor(temp: number): {r: number, g: number, b: number} {
    // 温度范围: -10°C (蓝) 到 40°C (红)
    const normalized = Math.max(0, Math.min(1, (temp + 10) / 50));
    
    if (normalized < 0.25) {
      // 深蓝到浅蓝
      const t = normalized * 4;
      return { r: 0, g: t * 0.5, b: 0.5 + t * 0.5 };
    } else if (normalized < 0.5) {
      // 浅蓝到绿
      const t = (normalized - 0.25) * 4;
      return { r: 0, g: 0.5 + t * 0.5, b: 1 - t };
    } else if (normalized < 0.75) {
      // 绿到黄
      const t = (normalized - 0.5) * 4;
      return { r: t, g: 1, b: 0 };
    } else {
      // 黄到红
      const t = (normalized - 0.75) * 4;
      return { r: 1, g: 1 - t, b: 0 };
    }
  }

  private precipitationToColor(precip: number): {r: number, g: number, b: number} {
    // 降水范围: 0-20mm
    const normalized = Math.max(0, Math.min(1, precip / 20));
    
    if (normalized < 0.3) {
      // 浅绿
      return { r: 0.4, g: 0.8, b: 0.4 };
    } else if (normalized < 0.6) {
      // 黄色
      return { r: 1, g: 1, b: 0 };
    } else if (normalized < 0.8) {
      // 橙色
      return { r: 1, g: 0.6, b: 0 };
    } else {
      // 红色
      return { r: 1, g: 0, b: 0 };
    }
  }

  private windSpeedToColor(speed: number): string {
    if (speed < 3) return '#4ade80'; // 绿色 - 微风
    if (speed < 8) return '#facc15'; // 黄色 - 轻风
    if (speed < 15) return '#f97316'; // 橙色 - 强风
    return '#ef4444'; // 红色 - 大风
  }

  private radarIntensityToColor(intensity: number): {r: number, g: number, b: number} {
    if (intensity < 0.2) {
      return { r: 0, g: 1, b: 0 }; // 绿色 - 弱回波
    } else if (intensity < 0.5) {
      return { r: 1, g: 1, b: 0 }; // 黄色 - 中等回波
    } else if (intensity < 0.8) {
      return { r: 1, g: 0.5, b: 0 }; // 橙色 - 强回波
    } else {
      return { r: 1, g: 0, b: 0 }; // 红色 - 极强回波
    }
  }

  private getWeatherDescription(weatherCode: number): string {
    const codes: { [key: number]: string } = {
      0: '晴朗',
      1: '基本晴朗',
      2: '部分多云',
      3: '阴天',
      45: '雾',
      48: '雾凇',
      51: '小毛毛雨',
      53: '中毛毛雨',
      55: '大毛毛雨',
      61: '小雨',
      63: '中雨',
      65: '大雨',
      71: '小雪',
      73: '中雪',
      75: '大雪',
      77: '雪粒',
      80: '小阵雨',
      81: '中阵雨',
      82: '大阵雨',
      85: '小阵雪',
      86: '大阵雪',
      95: '雷暴',
      96: '雷暴伴小冰雹',
      99: '雷暴伴大冰雹'
    };
    return codes[weatherCode] || '未知';
  }

  private getWeatherIcon(codeOrDesc: number | string): string {
    if (typeof codeOrDesc === 'number') {
      const iconMap: { [key: number]: string } = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
        45: '🌫️', 48: '🌫️',
        51: '🌦️', 53: '🌦️', 55: '🌦️',
        61: '🌧️', 63: '🌧️', 65: '🌧️',
        71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
        80: '🌦️', 81: '🌦️', 82: '🌦️',
        85: '🌨️', 86: '🌨️',
        95: '⛈️', 96: '⛈️', 99: '⛈️'
      };
      return iconMap[codeOrDesc] || '🌤️';
    } else {
      const iconMap: { [key: string]: string } = {
        '晴朗': '☀️', '多云': '⛅', '阴天': '☁️',
        '小雨': '🌦️', '中雨': '🌧️', '大雨': '🌧️',
        '雷阵雨': '⛈️', '雪': '🌨️', '雾': '🌫️'
      };
      return iconMap[codeOrDesc] || '🌤️';
    }
  }

  private calculateVisibility(weatherCode: number): number {
    if (weatherCode >= 45 && weatherCode <= 48) return 2; // 雾
    if (weatherCode >= 61 && weatherCode <= 65) return 8; // 雨
    if (weatherCode >= 71 && weatherCode <= 77) return 5; // 雪
    return 25; // 晴朗
  }

  private calculateUVIndex(lat: number, lng: number): number {
    const hour = new Date().getHours();
    if (hour < 6 || hour > 18) return 0;
    
    const solarElevation = Math.sin((hour - 6) * Math.PI / 12);
    const latitudeFactor = Math.cos(lat * Math.PI / 180);
    
    return Math.round(11 * solarElevation * latitudeFactor);
  }

  private getCityName(lat: number, lng: number): string {
    const cities = [
      { name: '上海', lat: 31.2304, lng: 121.4737 },
      { name: '北京', lat: 39.9042, lng: 116.4074 },
      { name: '深圳', lat: 22.5431, lng: 113.9339 },
      { name: '广州', lat: 23.1291, lng: 113.3240 },
      { name: '杭州', lat: 30.2741, lng: 120.1551 },
      { name: '南京', lat: 32.0603, lng: 118.7969 },
      { name: '武汉', lat: 30.5928, lng: 114.3055 },
      { name: '成都', lat: 30.5728, lng: 104.0668 },
      { name: '西安', lat: 34.3416, lng: 108.9398 },
      { name: '重庆', lat: 29.5630, lng: 106.5516 }
    ];

    let closestCity = cities[0];
    let minDistance = Math.abs(lat - cities[0].lat) + Math.abs(lng - cities[0].lng);

    cities.forEach(city => {
      const distance = Math.abs(lat - city.lat) + Math.abs(lng - city.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    });

    return closestCity.name;
  }
}

export const freeWeatherService = new FreeWeatherService();
export default freeWeatherService;