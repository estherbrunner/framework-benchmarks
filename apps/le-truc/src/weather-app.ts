import { createList, createTask, defineComponent } from '@zeix/le-truc';
import { type WeatherData, weatherService } from './weather-service.js';
import { WeatherUtils } from './weather-utils.js';

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

// Only city + activeIndex are exposed as host props. Weather data, loading
// state, and errors are all carried by the `weather` Task signal below.
// activeIndex uses -1 as a sentinel for "no active forecast item".
type WeatherAppProps = {
  city: string;
  activeIndex: number;
  [key: string]: NonNullable<unknown>;
};

defineComponent<WeatherAppProps>('weather-app', ({ expose, first, host, on, watch }) => {

  // --- Query all required DOM nodes ---
  const form = first('form[data-testid="search-form"]', 'Search form is required');
  const input = first('input[data-testid="search-input"]', 'Search input is required') as HTMLInputElement;
  const button = first('button[data-testid="search-button"]', 'Search button is required') as HTMLButtonElement;
  const buttonTextEl = first('.search-button__text', 'Search button text is required') as HTMLElement;
  const loadingEl = first('[data-testid="loading"]', 'Loading element is required') as HTMLElement;
  const errorEl = first('[data-testid="error"]', 'Error element is required') as HTMLElement;
  const errorMessageEl = first('.error__message', 'Error message element is required') as HTMLElement;
  const contentEl = first('[data-testid="weather-content"]', 'Weather content element is required') as HTMLElement;
  const locationEl = first('[data-testid="current-location"]', 'Current location element is required') as HTMLElement;
  const tempEl = first('[data-testid="current-temperature"]', 'Current temperature element is required') as HTMLElement;
  const iconEl = first('[data-testid="current-icon"]', 'Current icon element is required') as HTMLElement;
  const conditionEl = first('[data-testid="current-condition"]', 'Current condition element is required') as HTMLElement;
  const feelsLikeEl = first('[data-testid="feels-like"]', 'Feels-like element is required') as HTMLElement;
  const humidityEl = first('[data-testid="humidity"]', 'Humidity element is required') as HTMLElement;
  const windSpeedEl = first('[data-testid="wind-speed"]', 'Wind-speed element is required') as HTMLElement;
  const pressureEl = first('[data-testid="pressure"]', 'Pressure element is required') as HTMLElement;
  const cloudCoverEl = first('[data-testid="cloud-cover"]', 'Cloud-cover element is required') as HTMLElement;
  const windDirectionEl = first('[data-testid="wind-direction"]', 'Wind-direction element is required') as HTMLElement;
  const forecastListEl = first('[data-testid="forecast-list"]', 'Forecast list element is required') as HTMLElement;
  const template = first('#forecast-item-template', 'Forecast item template is required') as HTMLTemplateElement;

  // --- Reactive list of forecast items, keyed by index string ---
  const forecastList = createList<ForecastItemData>([], { keyConfig: 'item' });

  // --- Declare reactive props ---
  let initialCity = 'London';
  try {
    const saved = localStorage.getItem('weather-app-location');
    if (saved) initialCity = saved;
  } catch {
    /* localStorage unavailable; default to London */
  }

  expose({
    city: initialCity,
    activeIndex: -1
  });

  // --- Weather fetch modeled as a Task ---
  // Reading host.city inside the fn auto-tracks it; when the city changes the
  // previous in-flight computation is aborted and the fetch re-runs.
  const weather = createTask<WeatherData>(async (_prev, signal) => {
    const city = host.city;
    const data = await weatherService.getWeatherByCity(city);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return data;
  });

  // --- Populate current-weather fields from a successful payload ---
  const populateCurrentWeather = (data: WeatherData) => {
    const c = data.current;
    locationEl.textContent = `${data.locationName}${data.country ? `, ${data.country}` : ''}`;
    tempEl.textContent = WeatherUtils.formatTemperature(c.temperature_2m);
    iconEl.textContent = WeatherUtils.getWeatherIcon(c.weather_code, c.is_day ?? 1);
    conditionEl.textContent = WeatherUtils.getWeatherDescription(c.weather_code);
    conditionEl.className = `current-weather__condition ${WeatherUtils.getConditionClass(c.weather_code)}`;
    feelsLikeEl.textContent = WeatherUtils.formatTemperature(c.apparent_temperature);
    humidityEl.textContent = WeatherUtils.formatPercentage(c.relative_humidity_2m);
    windSpeedEl.textContent = WeatherUtils.formatWindSpeed(c.wind_speed_10m);
    pressureEl.textContent = WeatherUtils.formatPressure(c.pressure_msl ?? c.surface_pressure);
    cloudCoverEl.textContent = WeatherUtils.formatPercentage(c.cloud_cover);
    windDirectionEl.textContent = WeatherUtils.getWindDirection(c.wind_direction_10m);
  };

  // --- Return all effect descriptors so the runtime activates them ---
  return [
    // Forecast DOM reconciler: mirror list keys into forecastListEl
    watch(() => Array.from(forecastList.keys()), keys => {
      const current = new Map<string, HTMLElement>();
      for (const child of Array.from(forecastListEl.children)) {
        const el = child as HTMLElement;
        const key = el.dataset.key;
        if (key) current.set(key, el);
      }
      const keysSet = new Set(keys);

      // Drop children whose key is no longer present
      for (const [key, el] of current) {
        if (!keysSet.has(key)) el.remove();
      }

      // Insert new keys (clone template) and move existing into order
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let el = key && current.get(key);
        if (key && !el) {
          const fragment = template.content.cloneNode(true) as DocumentFragment;
          el = fragment.firstElementChild as HTMLElement;
          el.dataset.key = key;
          const datum = forecastList.byKey(key)?.get();
          if (datum) {
            (el.querySelector('.forecast-item__day') as HTMLElement).textContent = WeatherUtils.formatDate(datum.date);
            (el.querySelector('.forecast-item__icon') as HTMLElement).textContent = WeatherUtils.getWeatherIcon(datum.weatherCode, 1);
            (el.querySelector('.forecast-item__condition') as HTMLElement).textContent = WeatherUtils.getWeatherDescription(datum.weatherCode);
            (el.querySelector('[data-testid="forecast-high"]') as HTMLElement).textContent = WeatherUtils.formatTemperature(datum.high);
            (el.querySelector('[data-testid="forecast-low"]') as HTMLElement).textContent = WeatherUtils.formatTemperature(datum.low);
          }
        }
        const currentAtI = forecastListEl.children[i];
        if (el && currentAtI !== el) forecastListEl.insertBefore(el, currentAtI ?? null);
      }
    }),

    // Per-item active-state toggle (re-evaluated when activeIndex changes)
    watch('activeIndex', () => {
      const items = Array.from(forecastListEl.querySelectorAll<HTMLElement>('.forecast-item'));
      for (const item of items) {
        const key = item.dataset.key;
        if (!key) continue;
        const idx = Number(key.replace('item', ''));
        item.classList.toggle('active', host.activeIndex === idx);
      }
    }),

    // Click handler for forecast items (event delegation on the list)
    on(forecastListEl, 'click', (e: Event) => {
      const target = e.target as HTMLElement;
      const item = target.closest('.forecast-item') as HTMLElement | null;
      const key = item?.dataset.key;
      if (!key) return {};
      const idx = Number(key.replace('item', ''));
      return { activeIndex: host.activeIndex === idx ? -1 : idx };
    }),

    // Route Task states (nil/stale/err/ok) into visibility + button state.
    // watch() wraps match() for Signal sources — this is Le Truc's idiomatic
    // match-routed effect form, replacing the prior loadWeather + four status
    // watches. Precedence: nil > err > stale > ok.
    watch(weather, {
      nil: () => {
        loadingEl.hidden = false;
        errorEl.hidden = true;
        contentEl.hidden = true;
        button.disabled = true;
        buttonTextEl.textContent = 'Loading...';
      },
      stale: () => {
        loadingEl.hidden = false;
        errorEl.hidden = true;
        contentEl.hidden = true;
        button.disabled = true;
        buttonTextEl.textContent = 'Loading...';
      },
      err: (error) => {
        loadingEl.hidden = true;
        errorEl.hidden = false;
        contentEl.hidden = true;
        errorMessageEl.textContent = error.message;
        button.disabled = false;
        buttonTextEl.textContent = 'Get Weather';
      },
      ok: (data) => {
        loadingEl.hidden = true;
        errorEl.hidden = true;
        contentEl.hidden = false;
        button.disabled = false;
        buttonTextEl.textContent = 'Get Weather';
        input.value = data.locationName;
        populateCurrentWeather(data);

        // Rebuild forecast list from daily arrays
        const daily = data.daily;
        for (const key of Array.from(forecastList.keys())) forecastList.remove(key);
        for (let i = 0; i < daily.time.length; i++) {
          forecastList.add({
            date: daily.time[i],
            high: daily.temperature_2m_max[i],
            low: daily.temperature_2m_min[i],
            weatherCode: daily.weather_code[i],
            sunrise: daily.sunrise[i],
            sunset: daily.sunset[i],
            rainSum: daily.rain_sum[i],
            uvIndex: daily.uv_index_max[i],
            precipitationProb: daily.precipitation_probability_max[i]
          });
        }
        host.activeIndex = -1;

        // Persist the resolved (canonical) city name
        try {
          localStorage.setItem('weather-app-location', data.locationName);
        } catch {
          /* ignore persistence errors */
        }
      }
    }),

    // Search submit handler — setting host.city makes the Task re-fetch
    on(form, 'submit', (e: Event) => {
      e.preventDefault();
      const city = input.value.trim();
      if (city) host.city = city;
      return {};
    })
  ];
});
