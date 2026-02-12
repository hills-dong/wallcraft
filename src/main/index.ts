import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import { join } from 'path'
import { getScreens } from './screens'
import { applyWallpaper } from './wallpaper'
import { loadSettings, saveSettings } from './settings'
import { startScheduler, stopScheduler } from './scheduler'
import { IPC_CHANNELS, Settings } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open WallCraft',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    {
      label: 'Next Wallpaper',
      click: () => {
        mainWindow?.webContents.send(IPC_CHANNELS.NEXT_WALLPAPER)
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('WallCraft')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

function registerIpcHandlers(): void {
  // Screen detection
  ipcMain.handle(IPC_CHANNELS.GET_SCREENS, () => {
    return getScreens()
  })

  ipcMain.handle(IPC_CHANNELS.REFRESH_SCREENS, () => {
    return getScreens()
  })

  // Wallpaper application
  ipcMain.handle(IPC_CHANNELS.APPLY_WALLPAPER, async (_event, photoUrl: string) => {
    const screens = getScreens()
    return applyWallpaper(photoUrl, screens, (status) => {
      mainWindow?.webContents.send(IPC_CHANNELS.WALLPAPER_STATUS, status)
    })
  })

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return loadSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, settings: Settings) => {
    saveSettings(settings)
    // Restart scheduler with new settings
    stopScheduler()
    if (settings.updateInterval !== 'manual') {
      startScheduler(settings, () => {
        mainWindow?.webContents.send(IPC_CHANNELS.NEXT_WALLPAPER)
      })
    }
    return true
  })

  // Scheduler
  ipcMain.handle(IPC_CHANNELS.START_SCHEDULER, async () => {
    const settings = loadSettings()
    if (settings.updateInterval !== 'manual') {
      startScheduler(settings, () => {
        mainWindow?.webContents.send(IPC_CHANNELS.NEXT_WALLPAPER)
      })
    }
  })

  ipcMain.handle(IPC_CHANNELS.STOP_SCHEDULER, () => {
    stopScheduler()
  })
}

// Extend app type for isQuitting
declare module 'electron' {
  interface App {
    isQuitting: boolean
  }
}

app.isQuitting = false

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  createTray()

  // Start scheduler based on saved settings
  const settings = loadSettings()
  if (settings.updateInterval !== 'manual') {
    startScheduler(settings, () => {
      mainWindow?.webContents.send(IPC_CHANNELS.NEXT_WALLPAPER)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('before-quit', () => {
  app.isQuitting = true
  stopScheduler()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
