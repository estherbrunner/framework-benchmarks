export class WeatherUtils {
  static getWeatherDescription(weatherCode: number): string {
    const weatherCodes: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[weatherCode] || 'Unknown';
  }

  static getWeatherIcon(weatherCode: number, isDay = 1): string {
    const iconMap: Record<number, string> = {
      0: isDay ? '☀️' : '🌙',
      1: isDay ? '🌤️' : '🌙',
      2: isDay ? '⛅' : '☁️',
      3: '☁️',
      45: '🌫️',
      48: '🌫️',
      51: '🌦️',
      53: '🌦️',
      55: '🌦️',
      56: '🌨️',
      57: '🌨️',
      61: '🌧️',
      63: '🌧️',
      65: '🌧️',
      66: '🌨️',
      67: '🌨️',
      71: '❄️',
      73: '❄️',
      75: '❄️',
      77: '❄️',
      80: '🌦️',
      81: '🌦️',
      82: '⛈️',
      85: '🌨️',
      86: '🌨️',
      95: '⛈️',
      96: '⛈️',
      99: '⛈️'
    };
    return iconMap[weatherCode] || '🌤️';
  }

  static getConditionClass(weatherCode: number): string {
    if ([0, 1].includes(weatherCode)) return 'clear';
    if ([2, 3].includes(weatherCode)) return 'cloudy';
    if ([45, 48].includes(weatherCode)) return 'foggy';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'rainy';
    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snowy';
    if ([95, 96, 99].includes(weatherCode)) return 'stormy';
    return 'clear';
  }

  static formatTemperature(temp: number): string {
    return `${Math.round(temp)}°C`;
  }

  static formatWindSpeed(speed: number): string {
    return `${Math.round(speed)} km/h`;
  }

  static formatPressure(pressure: number): string {
    return `${Math.round(pressure)} hPa`;
  }

  static formatPercentage(value: number): string {
    return `${Math.round(value)}%`;
  }

  static getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  static formatTime(timeString: string): string {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
