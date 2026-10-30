import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  clearScreen: false,
  server: {
    host: 'localhost',
    port: 1423,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  }
});
