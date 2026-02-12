import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, Settings, WallpaperStatus } from '../shared/types'

const api = {
  // Screen
  getScreens: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SCREENS),
  refreshScreens: () => ipcRenderer.invoke(IPC_CHANNELS.REFRESH_SCREENS),

  // Wallpaper
  applyWallpaper: (photoUrl: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.APPLY_WALLPAPER, photoUrl),
  onWallpaperStatus: (callback: (status: WallpaperStatus) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: WallpaperStatus) =>
      callback(status)
    ipcRenderer.on(IPC_CHANNELS.WALLPAPER_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WALLPAPER_STATUS, handler)
  },

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings: Settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),

  // Scheduler
  startScheduler: () => ipcRenderer.invoke(IPC_CHANNELS.START_SCHEDULER),
  stopScheduler: () => ipcRenderer.invoke(IPC_CHANNELS.STOP_SCHEDULER),

  // Listen for next wallpaper request from tray
  onNextWallpaper: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.NEXT_WALLPAPER, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NEXT_WALLPAPER, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type WallCraftAPI = typeof api
