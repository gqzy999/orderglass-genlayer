import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        schedules: fileURLToPath(new URL('./index.html', import.meta.url)),
        pair: fileURLToPath(new URL('./pair.html', import.meta.url)),
      },
      output: { manualChunks: { genlayer: ['genlayer-js', 'genlayer-js/chains', 'viem'] } },
    },
  },
});
