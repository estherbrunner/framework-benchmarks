import { defineComponent } from '@zeix/le-truc';
import { WeatherUtils } from './weather-utils.js';

// Presentational current-conditions card. Receives raw current-weather
// fields from the parent via pass() and owns all display formatting.
export type CurrentWeatherProps = {
  location: string;
  country: string;
  temperature: number;
  weatherCode: number;
  isDay: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  cloudCover: number;
  windDirection: number;
  [key: string]: NonNullable<unknown>;
};

defineComponent<CurrentWeatherProps>('current-weather', ({ expose, first, watch }) => {
  const locationEl = first('[data-testid="current-location"]', 'Current location element is required');
  const tempEl = first('[data-testid="current-temperature"]', 'Current temperature element is required');
  const iconEl = first('[data-testid="current-icon"]', 'Current icon element is required');
  const conditionEl = first('[data-testid="current-condition"]', 'Current condition element is required');
  const feelsLikeEl = first('[data-testid="feels-like"]', 'Feels-like element is required');
  const humidityEl = first('[data-testid="humidity"]', 'Humidity element is required');
  const windSpeedEl = first('[data-testid="wind-speed"]', 'Wind-speed element is required');
  const pressureEl = first('[data-testid="pressure"]', 'Pressure element is required');
  const cloudCoverEl = first('[data-testid="cloud-cover"]', 'Cloud-cover element is required');
  const windDirectionEl = first('[data-testid="wind-direction"]', 'Wind-direction element is required');

  expose({
    location: '',
    country: '',
    temperature: 0,
    weatherCode: 0,
    isDay: 1,
    apparentTemperature: 0,
    humidity: 0,
    windSpeed: 0,
    pressure: 0,
    cloudCover: 0,
    windDirection: 0
  });

  watch(['location', 'country'], ([location, country]) => {
    locationEl.textContent = `${location}${country ? `, ${country}` : ''}`;
  });
  watch('temperature', v => { tempEl.textContent = WeatherUtils.formatTemperature(v); });
  watch(['weatherCode', 'isDay'], ([code, isDay]) => { iconEl.textContent = WeatherUtils.getWeatherIcon(code, isDay); });
  watch('weatherCode', code => {
    conditionEl.textContent = WeatherUtils.getWeatherDescription(code);
    conditionEl.className = `current-weather__condition ${WeatherUtils.getConditionClass(code)}`;
  });
  watch('apparentTemperature', v => { feelsLikeEl.textContent = WeatherUtils.formatTemperature(v); });
  watch('humidity', v => { humidityEl.textContent = WeatherUtils.formatPercentage(v); });
  watch('windSpeed', v => { windSpeedEl.textContent = WeatherUtils.formatWindSpeed(v); });
  watch('pressure', v => { pressureEl.textContent = WeatherUtils.formatPressure(v); });
  watch('cloudCover', v => { cloudCoverEl.textContent = WeatherUtils.formatPercentage(v); });
  watch('windDirection', v => { windDirectionEl.textContent = WeatherUtils.getWindDirection(v); });
});
