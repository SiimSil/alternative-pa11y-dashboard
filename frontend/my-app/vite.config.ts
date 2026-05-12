import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
    const rootEnvDir = path.resolve(__dirname, '..')
    const env = loadEnv(mode, rootEnvDir, '')

    const backendTarget = env.BACKEND_URL || 'http://localhost:4000'

    return {
        plugins: [react()],
        envDir: rootEnvDir,
        server: {
            proxy: {
                '/api': {
                    target: backendTarget,
                    changeOrigin: true
                }
            }
        }
    }
})
