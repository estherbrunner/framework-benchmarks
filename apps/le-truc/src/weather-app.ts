import { createEffect, createState, createTask, defineComponent, match } from '@zeix/le-truc';
import type { CurrentWeatherProps } from './current-weather.js';
import type { WeatherForecastProps } from './weather-forecast.js';
import type { WeatherSearchProps } from './weather-search.js';
import { type WeatherData, weatherService } from './weather-service.js';

// Root orchestrator. Owns the fetch (as a Task) and the persisted city, and
// hands formatted, last-known-good data down to presentational children via
// pass() — it does no rendering of its own beyond loading/error visibility.
type WeatherAppProps = {
  city: string;
  [key: string]: NonNullable<unknown>;
};

const emptyCurrentWeather: CurrentWeatherProps = {
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

const emptyDaily: WeatherData['daily'] = {
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

defineComponent<WeatherAppProps>('weather-app', ({ expose, first, host, on, pass }) => {
  const searchEl = first('weather-search', 'Search component is required') as HTMLElement & WeatherSearchProps;
  const currentWeatherEl = first('current-weather', 'Current weather component is required') as HTMLElement & CurrentWeatherProps;
  const forecastEl = first('weather-forecast', 'Weather forecast component is required') as HTMLElement & Pick<WeatherForecastProps, 'daily'>;
  const loadingEl = first('[data-testid="loading"]', 'Loading element is required');
  const errorEl = first('[data-testid="error"]', 'Error element is required');
  const errorMessageEl = first('.error__message', 'Error message element is required');
  const contentEl = first('[data-testid="weather-content"]', 'Weather content element is required');

  let initialCity = 'London';
  try {
    const saved = localStorage.getItem('weather-app-location');
    if (saved) initialCity = saved;
  } catch {
    /* localStorage unavailable; default to London */
  }

  expose({ city: initialCity });

  // Reading host.city inside the fn auto-tracks it; when the city changes the
  // previous in-flight computation is aborted and the fetch re-runs.
  const weather = createTask<WeatherData>(async(_prev, signal) => {
    const city = host.city;
    const data = await weatherService.getWeatherByCity(city);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return data;
  });

  // Written only on success, so children keep showing the last successful
  // result while a new search is loading or has errored, instead of a blank.
  const displayedCity = createState(initialCity);
  const currentWeather = createState(emptyCurrentWeather);
  const dailyForecast = createState(emptyDaily);

  createEffect(() => match(weather, {
    ok: (data) => {
      const c = data.current;
      displayedCity.set(data.locationName);
      currentWeather.set({
        location: data.locationName,
        country: data.country,
        temperature: c.temperature_2m,
        weatherCode: c.weather_code,
        isDay: c.is_day ?? 1,
        apparentTemperature: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        windSpeed: c.wind_speed_10m,
        pressure: c.pressure_msl ?? c.surface_pressure,
        cloudCover: c.cloud_cover,
        windDirection: c.wind_direction_10m
      });
      dailyForecast.set(data.daily);

      try {
        localStorage.setItem('weather-app-location', data.locationName);
      } catch {
        /* ignore persistence errors */
      }
    }
  }));

  // Route Task states (nil/stale/err/ok) into loading/error/content visibility.
  createEffect(() => match(weather, {
    nil: () => {
      loadingEl.hidden = false;
      errorEl.hidden = true;
      contentEl.hidden = true;
    },
    stale: () => {
      loadingEl.hidden = false;
      errorEl.hidden = true;
      contentEl.hidden = true;
    },
    err: (error) => {
      loadingEl.hidden = true;
      errorEl.hidden = false;
      contentEl.hidden = true;
      errorMessageEl.textContent = error.message;
    },
    ok: () => {
      loadingEl.hidden = true;
      errorEl.hidden = true;
      contentEl.hidden = false;
    }
  }));

  pass(searchEl, {
    value: () => displayedCity.get(),
    loading: () => weather.isPending()
  });

  pass(currentWeatherEl, {
    location: () => currentWeather.get().location,
    country: () => currentWeather.get().country,
    temperature: () => currentWeather.get().temperature,
    weatherCode: () => currentWeather.get().weatherCode,
    isDay: () => currentWeather.get().isDay,
    apparentTemperature: () => currentWeather.get().apparentTemperature,
    humidity: () => currentWeather.get().humidity,
    windSpeed: () => currentWeather.get().windSpeed,
    pressure: () => currentWeather.get().pressure,
    cloudCover: () => currentWeather.get().cloudCover,
    windDirection: () => currentWeather.get().windDirection
  });

  pass(forecastEl, {
    daily: () => dailyForecast.get()
  });

  on(host, 'weather-search', (e: Event) => ({ city: (e as CustomEvent<{ city: string }>).detail.city }));
});
