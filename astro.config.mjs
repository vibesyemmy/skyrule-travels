// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Vercel adapter: powers the /api/enquiry email endpoint as a serverless
  // function. Pages stay prerendered (static) by default.
  adapter: vercel(),

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()]
  }
});