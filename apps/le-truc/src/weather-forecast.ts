import { createList, defineComponent, reconcile } from '@zeix/le-truc';
import type { WeatherData } from './weather-service.js';
import { WeatherUtils } from './weather-utils.js';

type DailyForecast = WeatherData['daily'];

interface ForecastItemData {
  date: string;
  high: number;
  low: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  rainSum: number;
  uvIndex: number;
  precipitationProb: number;
}

const emptyDaily: DailyForecast = {
  time: [],
  temperature_2m_max: [],
  temperature_2m_min: [],
  weather_code: [],
  sunrise: [],
  sunset: [],
  rain_sum: [],
  uv_index_max: [],
  precipitation_probability_max: []
};

// Owns the keyed forecast list and the expand/collapse state of individual
// days — none of that needs to be visible to weather-app, so `activeKey`
// stays internal rather than exposed as a prop.
export type WeatherForecastProps = {
  daily: DailyForecast;
  activeKey: string;
  [key: string]: NonNullable<unknown>;
};

defineComponent<WeatherForecastProps>('weather-forecast', ({ expose, first, host, on, watch }) => {
  const listEl = first('[data-testid="forecast-list"]', 'Forecast list element is required');
  const template = first('template#forecast-item-template', 'Forecast item template is required');

  const forecastList = createList<ForecastItemData>([], { keyConfig: item => item.date });

  expose({
    daily: emptyDaily,
    activeKey: ''
  });

  watch('daily', daily => {
    forecastList.set(daily.time.map((date, i) => ({
      date,
      high: daily.temperature_2m_max[i],
      low: daily.temperature_2m_min[i],
      weatherCode: daily.weather_code[i],
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
      rainSum: daily.rain_sum[i],
      uvIndex: daily.uv_index_max[i],
      precipitationProb: daily.precipitation_probability_max[i]
    })));
  });

  reconcile(listEl, template, forecastList, (element, item, key) => {
    const datum = item.get();
    (element.querySelector('.forecast-item__day') as HTMLElement).textContent = WeatherUtils.formatDate(datum.date);
    (element.querySelector('.forecast-item__icon') as HTMLElement).textContent = WeatherUtils.getWeatherIcon(datum.weatherCode, 1);
    (element.querySelector('.forecast-item__condition') as HTMLElement).textContent = WeatherUtils.getWeatherDescription(datum.weatherCode);
    (element.querySelector('[data-testid="forecast-high"]') as HTMLElement).textContent = WeatherUtils.formatTemperature(datum.high);
    (element.querySelector('[data-testid="forecast-low"]') as HTMLElement).textContent = WeatherUtils.formatTemperature(datum.low);

    const details = element.querySelector('.forecast-item__details') as HTMLElement | null;
    if (details) {
      (details.querySelector('[data-field="sunrise"]') as HTMLElement).textContent = WeatherUtils.formatTime(datum.sunrise);
      (details.querySelector('[data-field="sunset"]') as HTMLElement).textContent = WeatherUtils.formatTime(datum.sunset);
      (details.querySelector('[data-field="rain"]') as HTMLElement).textContent = `${datum.rainSum.toFixed(1)} mm`;
      (details.querySelector('[data-field="uv"]') as HTMLElement).textContent = datum.uvIndex.toFixed(1);
      (details.querySelector('[data-field="precip"]') as HTMLElement).textContent = WeatherUtils.formatPercentage(datum.precipitationProb);
      (details.querySelector('[data-field="temp"]') as HTMLElement).textContent = `${WeatherUtils.formatTemperature(datum.high)} / ${WeatherUtils.formatTemperature(datum.low)}`;
    }

    watch('activeKey', activeKey => {
      const isActive = activeKey === key;
      element.classList.toggle('active', isActive);
      if (details) details.hidden = !isActive;
    });

    on(element, 'click', () => ({ activeKey: host.activeKey === key ? '' : key }));
    on(element, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return {};
      e.preventDefault();
      return { activeKey: host.activeKey === key ? '' : key };
    });
  });
});
