import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * @type {import('vite').UserConfig}
 */
const config = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:15651',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:15751',
        ws: true,
      },
    },
  },
});

export default config;
