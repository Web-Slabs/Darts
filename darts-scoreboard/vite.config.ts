import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Base './' so the built app works from file:// in Electron and any subpath on handyservices
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
