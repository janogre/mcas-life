import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'MCAS-Life - Smart Symptom Tracking',
        short_name: 'MCAS-Life',
        description: 'AI-powered MCAS symptom tracking with food trigger correlation',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // API Cache - Critical MCAS data with network-first strategy
          {
            urlPattern: /^http:\/\/localhost:3001\/api\/(health|sighi\/foods)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mcas-api-critical',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 4 // 4 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Food Database Cache - Long-term caching for SIGHI data
          {
            urlPattern: /^http:\/\/localhost:3001\/api\/sighi\/foods/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sighi-food-database',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // User Data - Network first with background sync
          {
            urlPattern: /^http:\/\/localhost:3001\/api\/(symptoms|diary|analytics)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mcas-user-data',
              expiration: {
                maxEntries: 25,
                maxAgeSeconds: 60 * 60 * 2 // 2 hours
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Static Assets - Cache first
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mcas-images',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // Fonts - Cache first with long expiration
          {
            urlPattern: /\.(?:woff|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mcas-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    global: 'globalThis'
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'recharts']
        }
      }
    }
  }
});