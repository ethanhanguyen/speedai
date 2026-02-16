import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3002,
  },
  build: {
    target: 'es2020',
  },
});
