import { defineComponent, query } from '@zeix/le-truc';
import {
  formatPercentage,
  formatPressure,
  formatTemperature,
  formatWindSpeed,
  getConditionClass,
  getWeatherDescription,
  getWeatherIcon,
  getWindDirection
} from './utils.js';

// Presentational current-conditions card. Receives one formatted snapshot
// from the parent via pass() and owns all display formatting. A single
// object prop (rather than one prop per field) matches how the data always
// changes together — a new city or a new fetch replaces the whole snapshot.
export type CurrentWeatherData = {
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
};

export const emptyCurrentWeatherData: CurrentWeatherData = {
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
};

export type CurrentWeatherProps = {
  weather: CurrentWeatherData;
};

declare global {
	interface HTMLElementTagNameMap {
		'current-weather': HTMLElement & CurrentWeatherProps
	}
}

defineComponent<CurrentWeatherProps>(
  'current-weather',
  ({ expose, host, watch }) => {
    const elIds = [
      'current-location',
      'current-temperature',
      'current-icon',
      'current-condition',
      'feels-like',
      'humidity',
      'wind-speed',
      'pressure',
      'cloud-cover',
      'wind-direction'
    ] as const;
    const elMap = {} as Record<string, HTMLElement>;
    for (const id of elIds) {
      elMap[id] = query(host, `[data-testid="${id}"]`, 'required');
    }

    expose({ weather: emptyCurrentWeatherData });

    watch('weather', (data) => {
      elMap['current-location'].textContent = `${data.location}${data.country ? `, ${data.country}` : ''}`;
      elMap['current-temperature'].textContent = formatTemperature(data.temperature);
      elMap['current-icon'].textContent = getWeatherIcon(data.weatherCode, data.isDay);
      elMap['current-condition'].textContent = getWeatherDescription(data.weatherCode);
      elMap['current-condition'].className = `current-weather__condition ${getConditionClass(data.weatherCode)}`;
      elMap['feels-like'].textContent = formatTemperature(data.apparentTemperature);
      elMap.humidity.textContent = formatPercentage(data.humidity);
      elMap['wind-speed'].textContent = formatWindSpeed(data.windSpeed);
      elMap.pressure.textContent = formatPressure(data.pressure);
      elMap['cloud-cover'].textContent = formatPercentage(data.cloudCover);
      elMap['wind-direction'].textContent = getWindDirection(data.windDirection);
    });
  }
);
