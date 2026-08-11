import { createList, defineComponent, query, reconcile } from '@zeix/le-truc';
import {
  formatDate,
  formatPercentage,
  formatTemperature,
  formatTime,
  getWeatherDescription,
  getWeatherIcon
} from './utils.js';
import { emptyDaily, type WeatherData } from './weather-service.js';

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

// Owns the keyed forecast list and the expand/collapse state of individual
// days — none of that needs to be visible to weather-app, so `activeKey`
// stays internal rather than exposed as a prop.
export type WeatherForecastProps = {
  daily: DailyForecast;
  activeKey: string;
};

declare global {
	interface HTMLElementTagNameMap {
		'weather-forecast': HTMLElement & WeatherForecastProps
	}
}

defineComponent<WeatherForecastProps>(
  'weather-forecast',
  ({ expose, first, host, on, watch }) => {
    const listEl = first(
      '[data-testid="forecast-list"]',
      'Forecast list element is required'
    );
    const template = first(
      'template#forecast-item-template',
      'Forecast item template is required'
    );

    const forecastList = createList<ForecastItemData>([], {
      keyConfig: item => item.date
    });

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
      const update = (selector: string, text: string) => {
        const el = query(element, selector);
        if (el) el.textContent = text;
      };

      update('.forecast-item__day', formatDate(datum.date));
      update('.forecast-item__icon', getWeatherIcon(datum.weatherCode, 1));
      update('.forecast-item__condition', getWeatherDescription(datum.weatherCode));
      update('[data-testid="forecast-high"]', formatTemperature(datum.high));
      update('[data-testid="forecast-low"]', formatTemperature(datum.low));

      const details = query(element, '.forecast-item__details');
      if (details) {
        update('[data-field="sunrise"]', formatTime(datum.sunrise));
        update('[data-field="sunset"]', formatTime(datum.sunset));
        update('[data-field="rain"]', `${datum.rainSum.toFixed(1)} mm`);
        update('[data-field="uv"]', datum.uvIndex.toFixed(1));
        update('[data-field="precip"]', formatPercentage(datum.precipitationProb));
        update('[data-field="temp"]', `${formatTemperature(datum.high)} / ${formatTemperature(datum.low)}`);
      }

      watch('activeKey', activeKey => {
        const isActive = activeKey === key;
        element.classList.toggle('active', isActive);
        if (details) details.hidden = !isActive;
        if (isActive) element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      on(element, 'click', () => ({ activeKey: host.activeKey === key ? '' : key }));
      on(element, 'keydown', (e: KeyboardEvent) => {
        if (e.key !== 'Enter' && e.key !== ' ') return {};
        e.preventDefault();
        return { activeKey: host.activeKey === key ? '' : key };
      });
    });
  }
);
