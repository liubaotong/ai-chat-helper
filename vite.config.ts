import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '^/xai/v1/chat/completions': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/xai/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // 打印代理请求信息，用于调试
            const debugInfo = {
              path: proxyReq.path,
              method: proxyReq.method,
              headers: proxyReq.getHeaders()
            }
            // eslint-disable-next-line no-console
            console.log('代理请求:', debugInfo)
          })
        }
      }
    }
  }
})
