import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'highcharts': ['highcharts', 'highcharts-react-official'],
          'xlsx': ['xlsx'],
          'table': ['@tanstack/react-table'],
          'router': ['react-router-dom'],
        },
      },
    },
  },
});
