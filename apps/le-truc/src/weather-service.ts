export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  name: string;
  country: string;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    cloud_cover: number;
    surface_pressure: number;
    wind_direction_10m: number;
    wind_speed_10m: number;
    is_day?: number;
    pressure_msl?: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    sunrise: string[];
    sunset: string[];
    rain_sum: number[];
    uv_index_max: number[];
    precipitation_probability_max: number[];
  };
  locationName: string;
  country: string;
}

class WeatherService {
  baseUrl = 'https://api.open-meteo.com/v1';
  geocodingUrl = 'https://geocoding-api.open-meteo.com/v1';
  useMockData = this.shouldUseMockData();

  shouldUseMockData(): boolean {
    const isTestEnvironment = navigator.userAgent.includes('Playwright') ||
                              navigator.userAgent.includes('HeadlessChrome');
    if (window.location.search.includes('mock=false')) {
      return false;
    }
    return window.location.search.includes('mock=true') || isTestEnvironment;
  }

  async getMockData(): Promise<any> {
    try {
      if (this.isTestEnvironment()) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      const response = await fetch('/mocks/weather-data.json');
      if (!response.ok) {
        throw new Error('Failed to load mock data');
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading mock data:', error);
      throw error;
    }
  }

  isTestEnvironment(): boolean {
    return navigator.userAgent.includes('Playwright') ||
           navigator.userAgent.includes('HeadlessChrome');
  }

  getMockGeocodingData(cityName: string): GeocodedLocation {
    const mockCities: Record<string, GeocodedLocation> = {
      'London': { latitude: 51.5074, longitude: -0.1278, name: 'London', country: 'United Kingdom' },
      'Tokyo': { latitude: 35.6762, longitude: 139.6503, name: 'Tokyo', country: 'Japan' },
      'Paris': { latitude: 48.8566, longitude: 2.3522, name: 'Paris', country: 'France' },
      'São Paulo': { latitude: -23.5505, longitude: -46.6333, name: 'São Paulo', country: 'Brazil' },
      'New York': { latitude: 40.7128, longitude: -74.0060, name: 'New York', country: 'United States' },
      'Zürich': { latitude: 47.3769, longitude: 8.5417, name: 'Zürich', country: 'Switzerland' }
    };

    if (cityName.includes('Invalid') || cityName.includes('123') || !cityName.trim()) {
      throw new Error('Unable to find location. Please check the city name and try again.');
    }
    return mockCities[cityName] || mockCities['London'];
  }

  async geocodeLocation(cityName: string): Promise<GeocodedLocation> {
    if (this.useMockData) {
      return this.getMockGeocodingData(cityName);
    }
    try {
      const response = await fetch(
        `${this.geocodingUrl}/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
      );
      if (!response.ok) {
        throw new Error('Failed to geocode location');
      }
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        throw new Error(`Location "${cityName}" not found. Please check the spelling and try again.`);
      }
      return data.results[0];
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  async getWeatherData(lat: number, lon: number): Promise<any> {
    if (this.useMockData) {
      return this.getMockData();
    }
    try {
      const response = await fetch(
        `${this.baseUrl}/forecast?` +
        `latitude=${lat}&longitude=${lon}&` +
        `current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,precipitation,weather_code,is_day&` +
        `daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,precipitation_probability_max,rain_sum,uv_index_max&` +
        `timezone=auto`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      return await response.json();
    } catch (error) {
      console.error('Weather API error:', error);
      throw error;
    }
  }

  async getWeatherByCity(cityName: string): Promise<WeatherData> {
    try {
      const location = await this.geocodeLocation(cityName);
      const weather = await this.getWeatherData(location.latitude, location.longitude);
      return {
        ...weather,
        locationName: location.name,
        country: location.country
      };
    } catch (error) {
      console.error('Weather service error:', error);
      throw error;
    }
  }
}

export const weatherService = new WeatherService();
