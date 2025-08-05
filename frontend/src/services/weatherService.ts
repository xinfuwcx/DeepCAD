/**
 * OpenMeteo 天气数据服务
 * 提供实时天气数据和天气预报
 */

// OpenMeteo API 响应接口
export interface WeatherData {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

// 天气代码映射
const weatherCodeMap: Record<number, { icon: string; description: string }> = {
  0: { icon: '☀️', description: '晴朗' },
  1: { icon: '🌤️', description: '多云' },
  2: { icon: '⛅', description: '部分多云' },
  3: { icon: '☁️', description: '阴天' },
  45: { icon: '🌫️', description: '雾' },
  48: { icon: '🌫️', description: '结霜雾' },
  51: { icon: '🌦️', description: '小雨' },
  53: { icon: '🌧️', description: '中雨' },
  55: { icon: '🌧️', description: '大雨' },
  61: { icon: '🌦️', description: '小雨' },
  63: { icon: '🌧️', description: '中雨' },
  65: { icon: '🌧️', description: '大雨' },
  71: { icon: '🌨️', description: '小雪' },
  73: { icon: '❄️', description: '中雪' },
  75: { icon: '❄️', description: '大雪' },
  80: { icon: '🌦️', description: '阵雨' },
  81: { icon: '🌧️', description: '中阵雨' },
  82: { icon: '⛈️', description: '大阵雨' },
  95: { icon: '⛈️', description: '雷暴' },
  96: { icon: '⛈️', description: '雷暴伴冰雹' },
  99: { icon: '⛈️', description: '强雷暴伴冰雹' },
};

export class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1';

  /**
   * 获取当前天气数据
   */
  async getCurrentWeather(location: WeatherLocation): Promise<WeatherData> {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m', 
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m'
      ].join(','),
      timezone: 'auto',
      forecast_days: '1'
    });

    const response = await fetch(`${this.baseUrl}/forecast?${params}`);
    
    if (!response.ok) {
      throw new Error(`天气数据获取失败: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 获取天气预报数据
   */
  async getWeatherForecast(location: WeatherLocation, days: number = 7): Promise<WeatherData> {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: [
        'temperature_2m',
        'weather_code'
      ].join(','),
      hourly: [
        'temperature_2m',
        'weather_code'
      ].join(','),
      timezone: 'auto',
      forecast_days: days.toString()
    });

    const response = await fetch(`${this.baseUrl}/forecast?${params}`);
    
    if (!response.ok) {
      throw new Error(`天气预报获取失败: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 根据天气代码获取天气信息
   */
  getWeatherInfo(weatherCode: number): { icon: string; description: string } {
    return weatherCodeMap[weatherCode] || { icon: '❓', description: '未知天气' };
  }

  /**
   * 格式化温度显示
   */
  formatTemperature(temperature: number): string {
    return `${Math.round(temperature)}°C`;
  }

  /**
   * 格式化湿度显示
   */
  formatHumidity(humidity: number): string {
    return `${Math.round(humidity)}%`;
  }

  /**
   * 格式化风速显示
   */
  formatWindSpeed(windSpeed: number): string {
    return `${Math.round(windSpeed)} km/h`;
  }

  /**
   * 根据风向角度获取风向文字
   */
  getWindDirection(degrees: number): string {
    const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  /**
   * 检查是否为恶劣天气
   */
  isSevereWeather(weatherCode: number): boolean {
    // 雷暴、大雨、大雪等恶劣天气代码
    return [65, 75, 82, 95, 96, 99].includes(weatherCode);
  }

  /**
   * 获取天气建议
   */
  getWeatherAdvice(weatherCode: number, temperature: number): string {
    const weatherInfo = this.getWeatherInfo(weatherCode);
    
    if (this.isSevereWeather(weatherCode)) {
      return '⚠️ 恶劣天气，建议减少户外活动';
    }
    
    if (temperature < 0) {
      return '🧥 温度较低，注意保暖';
    }
    
    if (temperature > 30) {
      return '🌡️ 温度较高，注意防暑';
    }
    
    if ([51, 53, 61, 63, 80, 81].includes(weatherCode)) {
      return '☔ 有降雨，建议携带雨具';
    }
    
    return `${weatherInfo.icon} ${weatherInfo.description}，适合出行`;
  }
}

// 导出单例实例
export const weatherService = new WeatherService();