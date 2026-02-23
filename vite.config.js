import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url';
import path from 'path';            
import { mockApi } from './src/_mock/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: './',
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
    // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
    base44({
      // legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      legacySDKImports: true,
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true,
      // localBackend: true,
    }),
    react(),
    {
      name: 'local-mock-api',
      configureServer(server) {
        mockApi(server);
      }
    }
  ],
  resolve: {
    alias: {
      // Mengarahkan @ ke folder src
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
    },
  },
});