import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,

    cssCodeSplit: true,
    minify: 'esbuild',

    rollupOptions: {
      output: {
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (!name) return 'assets/[ext]/[name]-[hash].[ext]';

          if (name.endsWith('.css')) {
            return 'assets/css/[name]-[hash].[ext]';
          }

          if (/\.(png|jpe?g|svg|gif|webp)$/.test(name)) {
            return 'assets/images/[name]-[hash].[ext]';
          }

          return 'assets/[ext]/[name]-[hash].[ext]';
        },
      },
    },
  },
});
