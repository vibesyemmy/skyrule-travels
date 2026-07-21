// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Node adapter: powers the /api/enquiry email endpoint. Pages stay
  // prerendered (static) by default; only the endpoint runs on demand.
  adapter: node({ mode: 'standalone' }),

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});