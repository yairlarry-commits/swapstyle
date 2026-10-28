import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// All JSX goes through src/i18n/jsx-runtime.js, which translates text (Hebrew / English)
export default defineConfig({
  plugins: [react({ jsxImportSource: 'swapstyle-i18n' })],
  resolve: {
    alias: {
      'swapstyle-i18n/jsx-runtime': fileURLToPath(new URL('./src/i18n/jsx-runtime.js', import.meta.url)),
      'swapstyle-i18n/jsx-dev-runtime': fileURLToPath(new URL('./src/i18n/jsx-dev-runtime.js', import.meta.url)),
    },
  },
});
