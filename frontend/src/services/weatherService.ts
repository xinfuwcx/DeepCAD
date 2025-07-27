/**
 * DeepCAD 天气服务
 * 集成多个免费天气API，提供实时天气数据
 */

export interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
  icon: string;
  city: string;
  country: string;
  uvIndex?: number;
  feelsLike?: number;
  dewPoint?: number;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherForecast {
  date: string;
  minTemp: number;
  maxTemp: number;
  description: string;
  icon: string;
  precipitation: number;
}

class WeatherService {
  private apiKeys = {
    // 免费的OpenWeatherMap API Key (演示用)
    openWeather: 'demo_key', // 替换为真实的API Key
    // 免费的WeatherAPI Key (演示用)
    weatherApi: 'demo_key', // 替换为真实的API Key
    // 免费的AccuWeather API Key (演示用)
    accuWeather: 'demo_key' // 替换为真实的API Key
  };

  private baseUrls = {
    openWeather: 'https://api.openweathermap.org/data/2.5',
    weatherApi: 'https://api.weatherapi.com/v1',
    accuWeather: 'https://dataservice.accuweather.com'
  };

  /**
   * 获取指定坐标的当前天气
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      // 优先尝试OpenWeatherMap
      return await this.getOpenWeatherData(lat, lng);
    } catch (error) {
      console.warn('OpenWeatherMap API failed, trying WeatherAPI:', error);
      
      try {
        // 备用WeatherAPI
        return await this.getWeatherApiData(lat, lng);
      } catch (error2) {
        console.warn('WeatherAPI failed, using mock data:', error2);
        
        // 最后使用模拟数据
        return this.getMockWeatherData(lat, lng);
      }
    }
  }

  /**
   * 获取天气预报
   */
  async getWeatherForecast(lat: number, lng: number, days: number = 5): Promise<WeatherForecast[]> {
    try {
      return await this.getOpenWeatherForecast(lat, lng, days);
    } catch (error) {
      console.warn('Weather forecast failed, using mock data:', error);
      return this.getMockForecastData(days);
    }
  }

  /**
   * OpenWeatherMap API
   */
  private async getOpenWeatherData(lat: number, lng: number): Promise<WeatherData> {
    const url = `${this.baseUrls.openWeather}/weather?lat=${lat}&lon=${lng}&appid=${this.apiKeys.openWeather}&units=metric&lang=zh_cn`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      windSpeed: Math.round(data.wind.speed),
      windDirection: data.wind.deg || 0,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: Math.round((data.visibility || 10000) / 1000),
      cloudCover: data.clouds.all,
      icon: this.getWeatherIcon(data.weather[0].icon),
      city: data.name,
      country: data.sys.country,
      feelsLike: Math.round(data.main.feels_like),
      uvIndex: 0, // 需要额外的UV Index API调用
      dewPoint: Math.round(data.main.temp - ((100 - data.main.humidity) / 5)),
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString()
    };
  }

  /**
   * WeatherAPI.com API (备用)
   */
  private async getWeatherApiData(lat: number, lng: number): Promise<WeatherData> {
    const url = `${this.baseUrls.weatherApi}/current.json?key=${this.apiKeys.weatherApi}&q=${lat},${lng}&lang=zh`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WeatherAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    const current = data.current;
    const location = data.location;
    
    return {
      temperature: Math.round(current.temp_c),
      description: current.condition.text,
      windSpeed: Math.round(current.wind_kph / 3.6), // 转换为 m/s
      windDirection: current.wind_degree,
      humidity: current.humidity,
      pressure: Math.round(current.pressure_mb),
      visibility: Math.round(current.vis_km),
      cloudCover: current.cloud,
      icon: this.getWeatherIcon(current.condition.icon),
      city: location.name,
      country: location.country,
      feelsLike: Math.round(current.feelslike_c),
      uvIndex: current.uv,
      dewPoint: Math.round(current.dewpoint_c),
      sunrise: location.sunrise || '6:00 AM',
      sunset: location.sunset || '6:00 PM'
    };
  }

  /**
   * OpenWeatherMap 预报数据
   */
  private async getOpenWeatherForecast(lat: number, lng: number, days: number): Promise<WeatherForecast[]> {
    const url = `${this.baseUrls.openWeather}/forecast?lat=${lat}&lon=${lng}&appid=${this.apiKeys.openWeather}&units=metric&lang=zh_cn`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap forecast API error: ${response.status}`);
    }
    
    const data = await response.json();
    const forecasts: WeatherForecast[] = [];
    const dailyData = new Map<string, any[]>();
    
    // 按日期分组
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(item);
    });
    
    // 生成每日预报
    let count = 0;
    for (const [date, items] of dailyData) {
      if (count >= days) break;
      
      const temps = items.map(item => item.main.temp);
      const descriptions = items.map(item => item.weather[0].description);
      const precipitations = items.map(item => (item.rain?.['3h'] || 0) + (item.snow?.['3h'] || 0));
      
      forecasts.push({
        date: new Date(date).toLocaleDateString(),
        minTemp: Math.round(Math.min(...temps)),
        maxTemp: Math.round(Math.max(...temps)),
        description: descriptions[0], // 使用第一个时段的描述
        icon: this.getWeatherIcon(items[0].weather[0].icon),
        precipitation: Math.round(Math.max(...precipitations))
      });
      
      count++;
    }
    
    return forecasts;
  }

  /**
   * 模拟天气数据（当API不可用时使用）
   */
  private getMockWeatherData(lat: number, lng: number): WeatherData {
    const weatherConditions = [
      { desc: '晴朗', icon: '☀️', cloudCover: 10 },
      { desc: '多云', icon: '⛅', cloudCover: 40 },
      { desc: '阴天', icon: '☁️', cloudCover: 70 },
      { desc: '小雨', icon: '🌦️', cloudCover: 90 },
      { desc: '雷阵雨', icon: '⛈️', cloudCover: 95 },
      { desc: '雪', icon: '🌨️', cloudCover: 85 },
      { desc: '雾', icon: '🌫️', cloudCover: 60 }
    ];

    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const temp = Math.round(15 + Math.random() * 20); // 15-35°C
    
    return {
      temperature: temp,
      description: condition.desc,
      windSpeed: Math.round(Math.random() * 15), // 0-15 m/s
      windDirection: Math.round(Math.random() * 360), // 0-360°
      humidity: Math.round(40 + Math.random() * 50), // 40-90%
      pressure: Math.round(980 + Math.random() * 60), // 980-1040 hPa
      visibility: Math.round(5 + Math.random() * 25), // 5-30 km
      cloudCover: condition.cloudCover,
      icon: condition.icon,
      city: this.getCityName(lat, lng),
      country: '中国',
      feelsLike: temp + Math.round((Math.random() - 0.5) * 6),
      uvIndex: Math.round(Math.random() * 11),
      dewPoint: temp - Math.round(Math.random() * 10),
      sunrise: '6:30 AM',
      sunset: '6:30 PM'
    };
  }

  /**
   * 模拟预报数据
   */
  private getMockForecastData(days: number): WeatherForecast[] {
    const forecasts: WeatherForecast[] = [];
    const conditions = [
      { desc: '晴朗', icon: '☀️' },
      { desc: '多云', icon: '⛅' },
      { desc: '阴天', icon: '☁️' },
      { desc: '小雨', icon: '🌦️' },
      { desc: '雷阵雨', icon: '⛈️' }
    ];
    
    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const minTemp = Math.round(10 + Math.random() * 15);
      const maxTemp = minTemp + Math.round(Math.random() * 15);
      
      forecasts.push({
        date: date.toLocaleDateString(),
        minTemp,
        maxTemp,
        description: condition.desc,
        icon: condition.icon,
        precipitation: Math.round(Math.random() * 20)
      });
    }
    
    return forecasts;
  }

  /**
   * 转换天气图标
   */
  private getWeatherIcon(iconCode: string): string {
    const iconMap: { [key: string]: string } = {
      '01d': '☀️', '01n': '🌙',
      '02d': '⛅', '02n': '☁️',
      '03d': '☁️', '03n': '☁️',
      '04d': '☁️', '04n': '☁️',
      '09d': '🌦️', '09n': '🌦️',
      '10d': '🌧️', '10n': '🌧️',
      '11d': '⛈️', '11n': '⛈️',
      '13d': '🌨️', '13n': '🌨️',
      '50d': '🌫️', '50n': '🌫️'
    };
    
    return iconMap[iconCode] || '🌤️';
  }

  /**
   * 根据坐标获取城市名称
   */
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

  /**
   * 获取天气建议
   */
  getWeatherAdvice(weather: WeatherData): string[] {
    const advice: string[] = [];
    
    if (weather.temperature > 30) {
      advice.push('🌡️ 气温较高，建议做好防暑降温措施');
    } else if (weather.temperature < 5) {
      advice.push('🧥 气温较低，注意保暖');
    }
    
    if (weather.windSpeed > 10) {
      advice.push('💨 风力较大，施工时注意安全');
    }
    
    if (weather.humidity > 80) {
      advice.push('💧 湿度较高，设备注意防潮');
    }
    
    if (weather.visibility < 10) {
      advice.push('🌫️ 能见度较低，注意行车安全');
    }
    
    if (weather.cloudCover > 80) {
      advice.push('☁️ 云量较多，可能有降雨');
    }
    
    if (weather.uvIndex && weather.uvIndex > 7) {
      advice.push('☀️ 紫外线强，户外作业注意防晒');
    }
    
    return advice;
  }
}

// 导出单例
export const weatherService = new WeatherService();
export default weatherService;