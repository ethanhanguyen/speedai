import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `game-engine.${format}.js`,
    },
    rollupOptions: {
      external: ['matter-js', 'howler'],
      output: {
        globals: {
          'matter-js': 'Matter',
          'howler': 'Howl',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
