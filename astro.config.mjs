// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// Mirror .env into process.env. The enquiry endpoint reads its SMTP config
// from process.env only — that is what Vercel injects into the deployed
// function. Reading it there instead of import.meta.env keeps the credentials
// out of the build output, which Vite would otherwise inline. Astro only
// populates process.env during `astro build`, so this covers `astro dev`.
Object.assign(process.env, loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), ''));

// https://astro.build/config
export default defineConfig({
  // Canonical production URL (custom domain on Vercel; www 308-redirects here).
  // Used for absolute URLs in canonical/OG tags and any sitemap.
  site: 'https://skyruletravels.com',

  // Vercel adapter: powers the /api/enquiry email endpoint as a serverless
  // function. Pages stay prerendered (static) by default.
  adapter: vercel(),

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],

    ssr: {
      // sanitize-html is CommonJS and require()s htmlparser2, which is ESM-only
      // from v12 — so the externalised dependency throws ERR_REQUIRE_ESM inside
      // the deployed serverless function while working fine in dev, where Vite
      // transforms it. Bundling it instead resolves the require at build time.
      noExternal: ['sanitize-html'],
    },
  }
});