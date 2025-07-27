/**
 * Open-Meteo气象服务
 * 完全免费的气象数据API集成
 * 支持实时天气、预报和历史数据
 */

// ======================= 接口定义 =======================

export interface WeatherData {
  temperature: number;      // 温度(°C)
  humidity: number;         // 湿度(%)
  windSpeed: number;        // 风速(km/h)
  windDirection: number;    // 风向(度)
  weatherCode: number;      // 天气代码
  description: string;      // 天气描述
  icon: string;            // 天气图标
  visibility: number;       // 能见度(m)
  pressure: number;         // 气压(hPa)
  timestamp: string;        // 数据时间戳
  // 深基坑工程专用字段
  precipitation: number;    // 降水量(mm)
  uvIndex: number;         // 紫外线指数
  dewPoint: number;        // 露点温度(°C)
}

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface WeatherCache {
  [key: string]: {
    data: WeatherData;
    timestamp: number;
    expires: number;
  };
}

// ======================= 天气代码映射 =======================

const WEATHER_CODE_MAP: Record<number, { desc: string; icon: string }> = {
  0: { desc: '晴朗', icon: '☀️' },
  1: { desc: '晴间多云', icon: '🌤️' },
  2: { desc: '多云', icon: '⛅' },
  3: { desc: '阴天', icon: '☁️' },
  45: { desc: '雾', icon: '🌫️' },
  48: { desc: '雾凇', icon: '🌫️' },
  51: { desc: '小毛毛雨', icon: '🌦️' },
  53: { desc: '毛毛雨', icon: '🌦️' },
  55: { desc: '大毛毛雨', icon: '🌦️' },
  56: { desc: '小冻毛毛雨', icon: '🌨️' },
  57: { desc: '大冻毛毛雨', icon: '🌨️' },
  61: { desc: '小雨', icon: '🌧️' },
  63: { desc: '中雨', icon: '🌧️' },
  65: { desc: '大雨', icon: '🌧️' },
  66: { desc: '小冻雨', icon: '🌨️' },
  67: { desc: '大冻雨', icon: '🌨️' },
  71: { desc: '小雪', icon: '🌨️' },
  73: { desc: '中雪', icon: '❄️' },
  75: { desc: '大雪', icon: '❄️' },
  77: { desc: '雪粒', icon: '🌨️' },
  80: { desc: '小阵雨', icon: '🌦️' },
  81: { desc: '阵雨', icon: '🌦️' },
  82: { desc: '大阵雨', icon: '⛈️' },
  85: { desc: '小阵雪', icon: '🌨️' },
  86: { desc: '大阵雪', icon: '❄️' },
  95: { desc: '雷暴', icon: '⛈️' },
  96: { desc: '雷暴伴小冰雹', icon: '⛈️' },
  99: { desc: '雷暴伴大冰雹', icon: '⛈️' }
};

// ======================= Open-Meteo服务类 =======================

export class OpenMeteoService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';
  private cache: WeatherCache = {};
  private cacheTimeout = 15 * 60 * 1000; // 15分钟缓存
  private requestQueue: Promise<any>[] = [];
  private maxConcurrentRequests = 5;

  constructor() {
    console.log('🌤️ Open-Meteo气象服务初始化');
  }

  /**
   * 获取单点天气数据
   */
  public async getWeather(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
    
    // 检查缓存
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 使用缓存天气数据: ${lat}, ${lng}`);
      return cached;
    }

    try {
      console.log(`🌐 获取天气数据: ${lat}, ${lng}`);
      
      // 构建API URL
      const url = this.buildApiUrl(lat, lng);
      
      // 限制并发请求
      if (this.requestQueue.length >= this.maxConcurrentRequests) {
        await Promise.race(this.requestQueue);
      }

      // 发起请求
      const request = this.fetchWeatherData(url);
      this.requestQueue.push(request);
      
      const response = await request;
      
      // 从队列中移除完成的请求
      const index = this.requestQueue.indexOf(request);
      if (index > -1) {
        this.requestQueue.splice(index, 1);
      }

      // 解析数据
      const weatherData = this.parseWeatherResponse(response, lat, lng);
      
      // 缓存数据
      this.setCache(cacheKey, weatherData);
      
      console.log(`✅ 天气数据获取成功: ${weatherData.description} ${weatherData.temperature}°C`);
      return weatherData;

    } catch (error) {
      console.error(`❌ 天气数据获取失败 (${lat}, ${lng}):`, error);
      
      // 重试一次不同的API端点
      try {
        console.log(`🔄 尝试备用API端点...`);
        const backupUrl = this.buildBackupApiUrl(lat, lng);
        const backupRequest = this.fetchWeatherData(backupUrl);
        const backupResponse = await backupRequest;
        const weatherData = this.parseWeatherResponse(backupResponse, lat, lng);
        this.setCache(cacheKey, weatherData);
        console.log(`✅ 备用API获取成功: ${weatherData.description}`);
        return weatherData;
      } catch (backupError) {
        console.error(`❌ 备用API也失败:`, backupError);
        
        // 最后降级到模拟数据，但明确标记
        const fallbackData = this.generateFallbackWeatherData(lat, lng);
        fallbackData.description += ' (网络故障降级)';
        return fallbackData;
      }
    }
  }

  /**
   * 批量获取多点天气数据
   */
  public async getBatchWeather(locations: Location[]): Promise<WeatherData[]> {
    console.log(`🌍 批量获取 ${locations.length} 个位置的天气数据`);
    
    const weatherPromises = locations.map(location => 
      this.getWeather(location.lat, location.lng)
    );

    try {
      const results = await Promise.allSettled(weatherPromises);
      
      const weatherData = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn(`⚠️ 位置 ${index} 天气获取失败:`, result.reason);
          return this.generateFallbackWeatherData(
            locations[index].lat, 
            locations[index].lng
          );
        }
      });

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ 批量天气数据获取完成: ${successCount}/${locations.length} 成功`);
      
      return weatherData;

    } catch (error) {
      console.error('❌ 批量天气数据获取失败:', error);
      
      // 全部降级到模拟数据
      return locations.map(location => 
        this.generateFallbackWeatherData(location.lat, location.lng)
      );
    }
  }

  /**
   * 构建API URL
   */
  private buildApiUrl(lat: number, lng: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'wind_speed_10m',
        'wind_direction_10m',
        'weather_code',
        'surface_pressure',
        'visibility',
        'precipitation',
        'uv_index',
        'dew_point_2m'
      ].join(','),
      timezone: 'Asia/Shanghai',
      forecast_days: '1'
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  /**
   * 构建备用API URL (使用不同服务器)
   */
  private buildBackupApiUrl(lat: number, lng: number): string {
    // 使用Open-Meteo的备用服务器
    const backupBaseUrl = 'https://archive-api.open-meteo.com/v1/forecast';
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m', 
        'wind_speed_10m',
        'wind_direction_10m',
        'weather_code'
      ].join(','),
      timezone: 'auto'
    });

    return `${backupBaseUrl}?${params.toString()}`;
  }

  /**
   * 发起HTTP请求
   */
  private async fetchWeatherData(url: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DeepCAD/1.0 (Deep Excavation Analysis System)'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 解析API响应数据
   */
  private parseWeatherResponse(response: any, lat: number, lng: number): WeatherData {
    const current = response.current;
    const weatherCode = current.weather_code || 0;
    const weatherInfo = WEATHER_CODE_MAP[weatherCode] || WEATHER_CODE_MAP[0];

    return {
      temperature: Math.round(current.temperature_2m || 20),
      humidity: Math.round(current.relative_humidity_2m || 60),
      windSpeed: Math.round(current.wind_speed_10m || 10),
      windDirection: Math.round(current.wind_direction_10m || 0),
      weatherCode: weatherCode,
      description: weatherInfo.desc,
      icon: weatherInfo.icon,
      visibility: Math.round((current.visibility || 10000) / 1000), // 转换为km
      pressure: Math.round(current.surface_pressure || 1013),
      precipitation: current.precipitation || 0,
      uvIndex: Math.round(current.uv_index || 0),
      dewPoint: Math.round(current.dew_point_2m || 10),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成降级天气数据
   */
  private generateFallbackWeatherData(lat: number, lng: number): WeatherData {
    // 基于地理位置生成合理的模拟数据
    const latFactor = Math.abs(lat) / 90; // 纬度因子
    const seasonFactor = Math.cos((new Date().getMonth() - 6) * Math.PI / 6); // 季节因子
    
    const baseTemp = 20 - latFactor * 15 + seasonFactor * 10;
    const weather = [
      { code: 0, temp: baseTemp, humidity: 60 },
      { code: 1, temp: baseTemp - 2, humidity: 65 },
      { code: 2, temp: baseTemp - 3, humidity: 70 },
      { code: 3, temp: baseTemp - 5, humidity: 75 }
    ];

    const selected = weather[Math.floor(Math.abs(lat * lng) % weather.length)];
    const weatherInfo = WEATHER_CODE_MAP[selected.code];

    return {
      temperature: Math.round(selected.temp),
      humidity: selected.humidity,
      windSpeed: Math.round(8 + Math.random() * 12),
      windDirection: Math.round(Math.random() * 360),
      weatherCode: selected.code,
      description: weatherInfo.desc + ' (模拟)',
      icon: weatherInfo.icon,
      visibility: Math.round(8 + Math.random() * 12),
      pressure: Math.round(1010 + Math.random() * 20),
      precipitation: 0,
      uvIndex: Math.round(Math.random() * 8),
      dewPoint: Math.round(selected.temp - 10),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 缓存管理
   */
  private getFromCache(key: string): WeatherData | null {
    const cached = this.cache[key];
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    
    // 清理过期缓存
    if (cached) {
      delete this.cache[key];
    }
    
    return null;
  }

  private setCache(key: string, data: WeatherData): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + this.cacheTimeout
    };
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    console.log('🗑️ 清理天气数据缓存');
    this.cache = {};
  }

  /**
   * 设置缓存超时时间
   */
  public setCacheTimeout(minutes: number): void {
    this.cacheTimeout = minutes * 60 * 1000;
    console.log(`⏰ 设置缓存超时: ${minutes} 分钟`);
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): { count: number; size: number; hitRate: number } {
    const count = Object.keys(this.cache).length;
    const size = JSON.stringify(this.cache).length;
    
    return {
      count,
      size,
      hitRate: 0 // TODO: 实现命中率统计
    };
  }

  /**
   * 针对深基坑工程的天气分析
   */
  public analyzeWeatherForExcavation(weather: WeatherData): {
    constructionSuitability: 'excellent' | 'good' | 'fair' | 'poor';
    risks: string[];
    recommendations: string[];
  } {
    const risks: string[] = [];
    const recommendations: string[] = [];
    let suitability: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

    // 降水分析
    if (weather.precipitation > 10) {
      risks.push('大雨可能导致基坑积水');
      recommendations.push('检查排水系统，准备抽水设备');
      suitability = 'poor';
    } else if (weather.precipitation > 2) {
      risks.push('降水可能影响土壤稳定性');
      recommendations.push('监控边坡稳定性');
      if (suitability === 'excellent') suitability = 'fair';
    }

    // 风速分析
    if (weather.windSpeed > 30) {
      risks.push('强风影响塔吊等高空作业');
      recommendations.push('暂停高空作业，加固临时设施');
      suitability = 'poor';
    } else if (weather.windSpeed > 20) {
      risks.push('大风影响施工安全');
      recommendations.push('注意高空作业安全');
      if (suitability === 'excellent') suitability = 'good';
    }

    // 能见度分析
    if (weather.visibility < 2) {
      risks.push('低能见度影响机械作业');
      recommendations.push('加强现场照明，减缓施工节奏');
      suitability = 'poor';
    }

    // 温度分析
    if (weather.temperature < 0) {
      risks.push('低温影响混凝土养护');
      recommendations.push('采取保温措施，调整混凝土配比');
      if (suitability === 'excellent') suitability = 'fair';
    } else if (weather.temperature > 35) {
      risks.push('高温影响作业人员和设备');
      recommendations.push('调整作业时间，加强防暑降温');
      if (suitability === 'excellent') suitability = 'good';
    }

    // 湿度分析
    if (weather.humidity > 85) {
      risks.push('高湿度可能影响电气设备');
      recommendations.push('加强设备防潮措施');
    }

    if (risks.length === 0) {
      recommendations.push('天气条件良好，适宜正常施工');
    }

    return {
      constructionSuitability: suitability,
      risks,
      recommendations
    };
  }
}

// 导出默认实例
export const openMeteoService = new OpenMeteoService();