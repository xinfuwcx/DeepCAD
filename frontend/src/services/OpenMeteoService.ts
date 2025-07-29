/**
 * Open-Meteo天气服务接口
 * 1号架构师 - 实时天气数据集成
 */

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

export interface WeatherServiceConfig {
  apiKey?: string;
  updateInterval: number;
  units: 'metric' | 'imperial';
  language: string;
}

class OpenMeteoService {
  private config: WeatherServiceConfig;
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存

  constructor(config: Partial<WeatherServiceConfig> = {}) {
    this.config = {
      updateInterval: 300000, // 5分钟
      units: 'metric',
      language: 'zh',
      ...config
    };
  }

  /**
   * 获取指定位置的天气数据
   */
  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    const cacheKey = `${latitude},${longitude}`;
    const cached = this.cache.get(cacheKey);
    
    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // 构建API请求URL
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', latitude.toString());
      url.searchParams.set('longitude', longitude.toString());
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code');
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code');
      url.searchParams.set('timezone', 'auto');
      url.searchParams.set('forecast_days', '7');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const weatherData = this.parseWeatherData(data, latitude, longitude);
      
      // 更新缓存
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('获取天气数据失败:', error);
      
      // 返回默认数据
      return this.getDefaultWeatherData(latitude, longitude);
    }
  }

  /**
   * 解析API响应数据
   */
  private parseWeatherData(apiData: any, latitude: number, longitude: number): WeatherData {
    const current = apiData.current;
    const daily = apiData.daily;

    return {
      location: {
        latitude,
        longitude,
        city: this.getCityName(latitude, longitude)
      },
      current: {
        temperature: Math.round(current.temperature_2m || 20),
        humidity: Math.round(current.relative_humidity_2m || 60),
        windSpeed: Math.round(current.wind_speed_10m || 5),
        windDirection: Math.round(current.wind_direction_10m || 180),
        pressure: Math.round(current.surface_pressure || 1013),
        weatherCode: current.weather_code || 0,
        description: this.getWeatherDescription(current.weather_code || 0),
        icon: this.getWeatherIcon(current.weather_code || 0)
      },
      forecast: daily ? this.parseForecastData(daily) : undefined,
      lastUpdated: new Date()
    };
  }

  /**
   * 解析预报数据
   */
  private parseForecastData(daily: any): WeatherData['forecast'] {
    const forecast = [];
    const dates = daily.time || [];
    const maxTemps = daily.temperature_2m_max || [];
    const minTemps = daily.temperature_2m_min || [];
    const weatherCodes = daily.weather_code || [];

    for (let i = 0; i < Math.min(dates.length, 7); i++) {
      forecast.push({
        date: dates[i],
        maxTemp: Math.round(maxTemps[i] || 25),
        minTemp: Math.round(minTemps[i] || 15),
        weatherCode: weatherCodes[i] || 0,
        description: this.getWeatherDescription(weatherCodes[i] || 0),
        icon: this.getWeatherIcon(weatherCodes[i] || 0)
      });
    }

    return forecast;
  }

  /**
   * 根据坐标获取城市名称
   */
  private getCityName(latitude: number, longitude: number): string {
    // 简单的坐标到城市映射
    const cities = [
      { lat: 31.2304, lng: 121.4737, name: '上海' },
      { lat: 39.9042, lng: 116.4074, name: '北京' },
      { lat: 22.5431, lng: 113.9339, name: '深圳' },
      { lat: 23.1291, lng: 113.3240, name: '广州' }
    ];

    for (const city of cities) {
      const distance = Math.sqrt(
        Math.pow(latitude - city.lat, 2) + Math.pow(longitude - city.lng, 2)
      );
      if (distance < 0.5) {
        return city.name;
      }
    }

    return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  }

  /**
   * 获取天气描述
   */
  private getWeatherDescription(weatherCode: number): string {
    const descriptions: Record<number, string> = {
      0: '晴朗',
      1: '主要晴朗',
      2: '部分多云',
      3: '阴天',
      45: '雾',
      48: '结霜雾',
      51: '小雨',
      53: '中雨',
      55: '大雨',
      61: '小雨',
      63: '中雨',
      65: '大雨',
      80: '阵雨',
      95: '雷暴'
    };

    return descriptions[weatherCode] || '未知';
  }

  /**
   * 获取天气图标
   */
  private getWeatherIcon(weatherCode: number): string {
    const icons: Record<number, string> = {
      0: '☀️',
      1: '🌤️',
      2: '⛅',
      3: '☁️',
      45: '🌫️',
      48: '🌫️',
      51: '🌦️',
      53: '🌧️',
      55: '🌧️',
      61: '🌦️',
      63: '🌧️',
      65: '🌧️',
      80: '🌦️',
      95: '⛈️'
    };

    return icons[weatherCode] || '🌤️';
  }

  /**
   * 获取默认天气数据
   */
  private getDefaultWeatherData(latitude: number, longitude: number): WeatherData {
    return {
      location: {
        latitude,
        longitude,
        city: this.getCityName(latitude, longitude)
      },
      current: {
        temperature: 22,
        humidity: 65,
        windSpeed: 8,
        windDirection: 180,
        pressure: 1013,
        weatherCode: 1,
        description: '主要晴朗',
        icon: '🌤️'
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
   * 更新配置
   */
  updateConfig(newConfig: Partial<WeatherServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 导出单例实例
export const openMeteoService = new OpenMeteoService();
export default openMeteoService;