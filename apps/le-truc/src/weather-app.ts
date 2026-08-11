import {
  batch,
  createEffect,
  createMemo,
  createState,
  createTask,
  defineComponent,
  match
} from '@zeix/le-truc';
import { type CurrentWeatherData, emptyCurrentWeatherData } from './current-weather.js';
import { emptyDaily, type WeatherData, weatherService } from './weather-service.js';

// Root orchestrator. Owns the fetch (as a Task) and the persisted city, and
// hands a formatted, last-known-good snapshot down to presentational
// children via pass() — it does no rendering of its own beyond loading/error
// visibility.
type WeatherAppProps = {
  city: string;
};

declare global {
  interface HTMLElementTagNameMap {
    'weather-app': HTMLElement &WeatherAppProps;
  }
}

type WeatherDisplay = {
  city: string;
  current: CurrentWeatherData;
  daily: WeatherData['daily'];
};

const STORAGE_KEY = 'weather-app-location';
const noCoords = { lat: Number.NaN, lon: Number.NaN };

defineComponent<WeatherAppProps>('weather-app', ({ expose, first, host, on, pass }) => {
  let initialCity = '';
  let hasSavedCity = false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      initialCity = saved;
      hasSavedCity = true;
    }
  } catch {
    /* localStorage unavailable; default to London */
  }
  if (!initialCity) initialCity = 'London';

  expose({ city: initialCity });

  // Coordinates from geolocation, once resolved, supersede the city-based
  // fetch below — read unconditionally so both stay tracked dependencies
  // regardless of which branch a given run takes. NaN stands in for "unset"
  // since signal generics can't be null (T extends {}).
  const coords = createState<{ lat: number; lon: number }>(noCoords);

  // Reading host.city/coords inside the fn auto-tracks them; when either
  // changes the previous in-flight computation is aborted and refetched.
  const weather = createTask<WeatherData>(async(_prev, signal) => {
    const geo = coords.get();
    const data = Number.isNaN(geo.lat)
      ? await weatherService.getWeatherByCity(host.city)
      : await weatherService.getWeatherByCoords(geo.lat, geo.lon);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return data;
  });

  // Ask for the user's current location once, on connect, only when there's
  // no saved city to respect and we're not in a mock/test run. The default
  // city fetch above starts immediately either way; a resolved position
  // supersedes it, a denial or error just leaves the default result in place.
  if (!hasSavedCity && !weatherService.useMockData && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      position => coords.set({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }),
      () => undefined // denied or unavailable — keep default city
    );
  }

  // weather.get() throws while pending or on error — the catch falls back to
  // the previous snapshot, so children keep showing the last successful
  // result instead of a blank one. This also collapses the eleven individual
  // current-weather fields into the one shape current-weather.ts consumes.
  const display = createMemo<WeatherDisplay>(prev => {
    try {
      const data = weather.get();
      const c = data.current;
      return {
        city: data.locationName,
        current: {
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
        },
        daily: data.daily
      };
    } catch {
      return prev;
    }
  }, {
    value: {
      city: initialCity,
      current: emptyCurrentWeatherData,
      daily: emptyDaily
    }
  });

  // The only actual side effect: persist the city once per successful fetch.
  createEffect(() => match(weather, {
    ok: (data) => {
      try {
        localStorage.setItem(STORAGE_KEY, data.locationName);
      } catch {
        /* ignore persistence errors */
      }
    }
  }));

  // Route Task states (nil/stale/err/ok) into loading/error/content visibility.
  const loadingEl = first('[data-testid="loading"]', 'Loading element is required');
  const errorEl = first('[data-testid="error"]', 'Error element is required');
  const errorMessageEl = first('.error__message', 'Error message element is required');
  const contentEl = first('[data-testid="weather-content"]', 'Weather content element is required');
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

  const searchEl = first('weather-search', 'Search component is required');
  pass(searchEl, {
    value: () => display.get().city,
    loading: weather.isPending
  });

  const currentWeatherEl = first('current-weather', 'Current weather component is required');
  pass(currentWeatherEl, {
    weather: () => display.get().current
  });

  const forecastEl = first('weather-forecast', 'Weather forecast component is required');
  pass(forecastEl, {
    daily: () => display.get().daily
  });

  // A manual search always wins over a pending/resolved geolocation fix.
  on(host, 'weather-search', (e: Event) => {
    const { city } = (e as CustomEvent<{ city: string }>).detail;
    batch(() => {
      coords.set(noCoords);
      host.city = city;
    });
  });
});
