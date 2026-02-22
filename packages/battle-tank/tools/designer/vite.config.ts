import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  server: {
    port: 5174,
  },
  build: {
    target: 'es2020',
    outDir: '../../dist-designer',
  },
  resolve: {
    alias: {
      '@speedai/game-engine': path.resolve(__dirname, '../../../game-engine/dist/game-engine.es.js'),
    },
  },
  publicDir: path.resolve(__dirname, '../../public'),
});
