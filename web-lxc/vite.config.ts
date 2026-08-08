import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({plugins:[react()],base:'/',server:{fs:{allow:[path.resolve(__dirname,'..'),path.resolve(__dirname,'../desktop-tauri')]}},build:{outDir:'dist',emptyOutDir:true}});
