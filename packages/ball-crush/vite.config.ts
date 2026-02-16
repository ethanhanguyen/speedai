import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001,
  },
  build: {
    target: 'es2020',
  },
});
