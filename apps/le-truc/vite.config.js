import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000
  },
  define: {
    'process.env.DEV_MODE': '"true"'
  }
});
