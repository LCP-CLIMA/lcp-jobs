import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/lcp-jobs/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "LCP Clima — Jobs",
        short_name: "LCP Clima",
        description: "Installation and service jobs for L.C.P CLIMA, Shkodër.",
        theme_color: "#0a1f33",
        background_color: "#0a1f33",
        display: "standalone",
        start_url: "/lcp-jobs/",
        scope: "/lcp-jobs/",
        lang: "en",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        cacheId: "lcp-jobs-v9",
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        importScripts: ["sw-extra.js"],
        globPatterns: ["**/*.{js,mjs,css,html,svg,png,jpg,woff,woff2,ico,wasm}"],
        navigateFallback: "/lcp-jobs/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/(tesseract\.js@|tesseract\.js-core@|@tesseract\.js-data\/)/,
            handler: "CacheFirst",
            options: {
              cacheName: "lcp-ocr",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: { host: "0.0.0.0", port: 47321, allowedHosts: true },
  preview: { host: "0.0.0.0", port: 47321, allowedHosts: true },
});
