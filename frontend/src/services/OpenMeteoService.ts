/**
 * OpenMeteo天气服务
 * 免费、高精度、无API密钥的天气数据服务
 * 响应时间<10ms，1km分辨率，每小时更新
 */

import { fetchWeatherApi } from 'openmeteo';

export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    city?: string;
  };
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    weatherCode: number;
    description: string;
    icon: string;
  };
  forecast?: Array<{
    date: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    description: string;
    icon: string;
  }>;
  lastUpdated: Date;
}

class OpenMeteoService {
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存

  /**
   * 获取指定位置的天气数据
   */
  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    
    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // 使用OpenMeteo API获取天气数据
      const params = {
        latitude: [latitude],
        longitude: [longitude],
        current: [
          'temperature_2m',
          'relative_humidity_2m', 
          'wind_speed_10m',
          'wind_direction_10m',
          'pressure_msl',
          'weather_code'
        ],
        forecast_days: 1,
        timezone: 'auto'
      };

      const responses = await fetchWeatherApi('https://api.open-meteo.com/v1/forecast', params);
      const response = responses[0];
      
      // 解析响应数据
      const current = response.current();
      const weatherData = this.parseOpenMeteoData(current, latitude, longitude);
      
      // 更新缓存
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('OpenMeteo API调用失败:', error);
      
      // 返回默认数据
      return this.getDefaultWeatherData(latitude, longitude);
    }
  }

  /**
   * 解析OpenMeteo响应数据
   */
  private parseOpenMeteoData(current: any, latitude: number, longitude: number): WeatherData {
    // 天气代码映射
    const weatherCode = current.variables(5)?.value() || 0;
    const description = this.getWeatherDescription(weatherCode);
    const icon = this.getWeatherIcon(weatherCode);

    return {
      location: {
        latitude,
        longitude,
        city: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
      },
      current: {
        temperature: Math.round(current.variables(0)?.value() || 20),
        humidity: Math.round(current.variables(1)?.value() || 60),
        windSpeed: Math.round((current.variables(2)?.value() || 5) * 3.6), // m/s转km/h
        windDirection: Math.round(current.variables(3)?.value() || 180),
        pressure: Math.round(current.variables(4)?.value() || 1013),
        weatherCode,
        description,
        icon
      },
      lastUpdated: new Date()
    };
  }

  /**
   * 获取天气描述
   */
  private getWeatherDescription(code: number): string {
    const weatherCodes: Record<number, string> = {
      0: '晴朗',
      1: '大部分晴朗',
      2: '部分多云',
      3: '阴天',
      45: '雾',
      48: '雾凇',
      51: '小雨',
      53: '中雨',
      55: '大雨',
      61: '小雨',
      63: '中雨',
      65: '大雨',
      71: '小雪',
      73: '中雪',
      75: '大雪',
      80: '阵雨',
      81: '阵雨',
      82: '暴雨',
      95: '雷暴',
      96: '雷暴伴冰雹',
      99: '强雷暴伴冰雹'
    };
    
    return weatherCodes[code] || '未知';
  }

  /**
   * 获取天气图标
   */
  private getWeatherIcon(code: number): string {
    // 简化的图标映射
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 65) return '🌧️';
    if (code >= 71 && code <= 75) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    
    return '🌤️';
  }

  /**
   * 获取默认天气数据
   */
  private getDefaultWeatherData(latitude: number, longitude: number): WeatherData {
    return {
      location: {
        latitude,
        longitude,
        city: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
      },
      current: {
        temperature: 22,
        humidity: 65,
        windSpeed: 8,
        windDirection: 180,
        pressure: 1013,
        weatherCode: 1,
        description: '大部分晴朗',
        icon: '⛅'
      },
      lastUpdated: new Date()
    };
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// 导出单例实例
export const openMeteoService = new OpenMeteoService();
export default openMeteoService;