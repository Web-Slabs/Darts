// Exposes a minimal, safe API surface to the renderer.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('bullseye', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
})
