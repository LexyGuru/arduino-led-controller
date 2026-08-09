import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const canonicalDesktopRoot = path.resolve(__dirname, '../desktop-tauri');
const canonicalPublicDir = path.resolve(canonicalDesktopRoot, 'public');

export default defineConfig({
  plugins: [react()],
  base: '/',
  publicDir: canonicalPublicDir,
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..'), canonicalDesktopRoot],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
