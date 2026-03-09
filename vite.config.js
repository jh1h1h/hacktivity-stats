import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/hackerone': {
          target: 'https://api.hackerone.com',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/hackerone/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Attach Basic Auth header on the server side so the token
              // never has to leave Node — it's not visible in browser devtools
              const credentials = Buffer.from(
                `${env.H1_USERNAME}:${env.H1_TOKEN}`
              ).toString('base64')
              proxyReq.setHeader('Authorization', `Basic ${credentials}`)
              proxyReq.setHeader('Accept', 'application/json')
            })
          },
        },
      },
    },
  }
})