import { defineConfig } from 'vite';

// Allow Vite's dev server to serve asset files from the craftpix downloads directory.
// These files are referenced via /@fs/ URLs constructed in src/manifest/urls.ts.
// If you move your asset packs, update this path.
const CRAFTPIX_ROOT = '/Users/hoang/Downloads/craftpix';

export default defineConfig({
  server: {
    port: 5180,
    fs: {
      strict: false,
      allow: ['.', CRAFTPIX_ROOT],
    },
  },
  build: {
    target: 'es2020',
  },
});
