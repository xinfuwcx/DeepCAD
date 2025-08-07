/**
 * 高德天气API服务
 * 替换OpenMeteo，使用高德天气API获取准确的中国天气数据
 */

export interface AmapWeatherData {
  province: string;
  city: string;
  adcode: string;
  weather: string;
  temperature: string;
  winddirection: string;
  windpower: string;
  humidity: string;
  reporttime: string;
  temperature_float: string;
  humidity_float: string;
}

export interface AmapWeatherResponse {
  status: string;
  count: string;
  info: string;
  infocode: string;
  lives: AmapWeatherData[];
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  icon: string;
  location: {
    city: string;
    province: string;
  };
  lastUpdated: Date;
}

class AmapWeatherService {
  private readonly baseUrl = 'https://restapi.amap.com/v3/weather/weatherInfo';
  private readonly apiKey: string;
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_AMAP_WEATHER_KEY || '0dce4d0b71a8bcf06705c12ea7ddf5f4';
  }

  /**
   * 根据经纬度获取天气数据 - 带1小时缓存
   */
  async getWeatherByLocation(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`🎯 使用缓存天气数据: ${cacheKey}`);
      return cached.data;
    }

    try {
      // 先通过逆地理编码获取城市代码
      const adcode = await this.getAdcodeByLocation(lat, lng);

      // 再通过城市代码获取天气
      const weatherData = await this.getWeatherByAdcode(adcode);

      // 缓存结果
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      console.log(`✅ 新获取天气数据并缓存: ${cacheKey}`);
      return weatherData;
    } catch (error) {
      console.warn('高德天气API调用失败，使用默认数据:', error);
      return this.getDefaultWeatherData();
    }
  }

  /**
   * 通过城市代码获取天气数据
   */
  async getWeatherByAdcode(adcode: string): Promise<WeatherData> {
    try {
      const url = `${this.baseUrl}?key=${this.apiKey}&city=${adcode}&extensions=base`;
      
      const response = await fetch(url);
      const data: AmapWeatherResponse = await response.json();

      if (data.status !== '1' || !data.lives || data.lives.length === 0) {
        throw new Error(`高德天气API错误: ${data.info}`);
      }

      const weather = data.lives[0];
      return this.transformWeatherData(weather);
    } catch (error) {
      console.error('获取天气数据失败:', error);
      return this.getDefaultWeatherData();
    }
  }

  /**
   * 通过经纬度获取城市代码
   */
  private async getAdcodeByLocation(lat: number, lng: number): Promise<string> {
    try {
      const geocodeUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${this.apiKey}&location=${lng},${lat}&poitype=&radius=1000&extensions=base&batch=false&roadlevel=0`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status !== '1' || !data.regeocode) {
        throw new Error('逆地理编码失败');
      }

      return data.regeocode.addressComponent.adcode;
    } catch (error) {
      console.warn('获取城市代码失败，使用默认城市:', error);
      return '110000'; // 默认北京
    }
  }

  /**
   * 转换高德天气数据格式
   */
  private transformWeatherData(amapWeather: AmapWeatherData): WeatherData {
    const temperature = parseFloat(amapWeather.temperature_float || amapWeather.temperature);
    const humidity = parseFloat(amapWeather.humidity_float || amapWeather.humidity);
    
    return {
      temperature,
      humidity,
      windSpeed: this.parseWindPower(amapWeather.windpower),
      weatherCode: this.getWeatherCode(amapWeather.weather),
      description: amapWeather.weather,
      icon: this.getWeatherIcon(amapWeather.weather),
      location: {
        city: amapWeather.city,
        province: amapWeather.province
      },
      lastUpdated: new Date(amapWeather.reporttime)
    };
  }

  /**
   * 解析风力等级为风速
   */
  private parseWindPower(windpower: string): number {
    const match = windpower.match(/(\d+)/);
    if (match) {
      const level = parseInt(match[1]);
      // 风力等级转换为大概的风速 (m/s)
      return Math.round(level * 1.5 + Math.random() * 3);
    }
    return 5; // 默认风速
  }

  /**
   * 获取天气代码
   */
  private getWeatherCode(weather: string): number {
    const weatherMap: Record<string, number> = {
      '晴': 1,
      '多云': 2,
      '阴': 3,
      '小雨': 61,
      '中雨': 63,
      '大雨': 65,
      '雷阵雨': 95,
      '雪': 71,
      '雾': 45,
      '霾': 48
    };
    
    for (const [key, code] of Object.entries(weatherMap)) {
      if (weather.includes(key)) {
        return code;
      }
    }
    return 1; // 默认晴天
  }

  /**
   * 获取天气图标
   */
  private getWeatherIcon(weather: string): string {
    const iconMap: Record<string, string> = {
      '晴': '☀️',
      '多云': '⛅',
      '阴': '☁️',
      '小雨': '🌦️',
      '中雨': '🌧️',
      '大雨': '⛈️',
      '雷阵雨': '⛈️',
      '雪': '❄️',
      '雾': '🌫️',
      '霾': '😷'
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (weather.includes(key)) {
        return icon;
      }
    }
    return '☀️'; // 默认晴天
  }

  /**
   * 获取默认天气数据
   */
  private getDefaultWeatherData(): WeatherData {
    return {
      temperature: 22,
      humidity: 65,
      windSpeed: 8,
      weatherCode: 1,
      description: '晴朗',
      icon: '☀️',
      location: {
        city: '北京市',
        province: '北京市'
      },
      lastUpdated: new Date()
    };
  }
}

export const amapWeatherService = new AmapWeatherService();
