import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.svg",
        "robots.txt",
        "apple-touch-icon.png"
      ],

      manifest: {
        name: "Kelly Grappe Campaign Operations",
        short_name: "Grappe Ops",
        description: "Campaign operations intelligence platform",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache"
            }
          },

          {
            urlPattern: ({ request }) => request.destination === "script",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "js-cache"
            }
          },

          {
            urlPattern: ({ request }) => request.destination === "style",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "css-cache"
            }
          },

          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/shared/components"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@cards": path.resolve(__dirname, "./src/cards"),
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@platform": path.resolve(__dirname, "./src/platform"),
      "@services": path.resolve(__dirname, "./src/shared/utils/db/services"),
      "@db": path.resolve(__dirname, "./src/shared/utils/db"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@dashboards": path.resolve(__dirname, "./src/dashboards"),
      "@integrations": path.resolve(__dirname, "./src/integrations"),
      "@ai": path.resolve(__dirname, "./src/ai")
    }
  },

  build: {
    target: "esnext",

    sourcemap: false,

    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"]
        }
      }
    }
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"]
  }
});