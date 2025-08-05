import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  root: './',
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(fileURLToPath(new URL('.', import.meta.url)), 'index.html')
      },
      external: (id) => {
        // 排除所有 Node.js 内置模块和 electron
        return ['electron', 'path', 'fs', 'os', 'crypto', 'buffer', 'stream', 'util', 'url', 'querystring', 'events', 'child_process'].includes(id)
      }
    }
  },
  server: {
    port: 5173,
    host: '127.0.0.1' // 添加 host 配置
  },
  define: {
    // 为了兼容性，定义一些全局变量
    global: 'globalThis',
    __dirname: 'undefined',
    __filename: 'undefined',
    process: 'undefined'
  },
  optimizeDeps: {
    exclude: [
      'electron',
      'path',
      'fs',
      'os',
      'crypto',
      'buffer',
      'stream',
      'util',
      'url',
      'querystring',
      'events',
      'child_process'
    ]
  }
})