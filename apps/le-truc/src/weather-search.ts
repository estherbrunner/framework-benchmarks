import { bindProperty, defineComponent } from '@zeix/le-truc';

// Presentational search form. Owns no fetch logic — reports submissions by
// dispatching a bubbling `weather-search` event and lets the parent decide
// what to do with the city name. `value` and `loading` are driven by the
// parent via pass(), so a successful search elsewhere can update the input.
export type WeatherSearchProps = {
  value: string;
  loading: boolean;
};

declare global {
	interface HTMLElementTagNameMap {
		'weather-search': HTMLElement & WeatherSearchProps
	}
}

defineComponent<WeatherSearchProps>('weather-search', ({ expose, first, host, on, watch }) => {
  const input = first('input[data-testid="search-input"]', 'Search input is required');

  expose({
    value: input.value,
    loading: false
  });

  watch('value', bindProperty(input, 'value'));

  const button = first('button[data-testid="search-button"]', 'Search button is required');
  const buttonTextEl = first('.search-button__text', 'Search button text is required');
  watch('loading', loading => {
    button.disabled = loading;
    buttonTextEl.textContent = loading ? 'Loading...' : 'Get Weather';
  });

  const form = first('form[data-testid="search-form"]', 'Search form is required');
  on(form, 'submit', (e: Event) => {
    e.preventDefault();
    const city = input.value.trim();
    if (city) host.dispatchEvent(new CustomEvent('weather-search', {
      detail: { city },
      bubbles: true
    }));
  });
});
