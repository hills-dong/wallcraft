import React, { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import Gallery from './components/Gallery'
import Settings from './components/Settings'
import PreviewModal from './components/PreviewModal'
import Toast from './components/Toast'
import ApiKeySetup from './components/ApiKeySetup'
import { fetchTopics } from './services/unsplash'
import { ScreenInfo, Settings as SettingsType, WallpaperStatus } from './types'

export default function App() {
  const {
    currentPage,
    settings,
    setSettings,
    setScreens,
    setTopics,
    addToast,
    setWallpaperStatus
  } = useStore()

  useEffect(() => {
    let unsubStatus: (() => void) | undefined
    let unsubNext: (() => void) | undefined

    const init = async () => {
      try {
        const savedSettings = await invoke<SettingsType>('get_settings')
        setSettings(savedSettings)

        const screens = await invoke<ScreenInfo[]>('get_screens')
        setScreens(screens)
      } catch (error) {
        console.error('Init error:', error)
      }

      unsubStatus = await listen<WallpaperStatus>('wallpaper-status', (event) => {
        const status = event.payload
        setWallpaperStatus(status)
        if (status.status === 'success') {
          addToast(`Screen ${status.screenId} wallpaper applied`, 'success')
        } else if (status.status === 'error') {
          addToast(`Screen ${status.screenId}: ${status.error}`, 'error')
        }
      })

      unsubNext = await listen('next-wallpaper', () => {
        addToast('Switching to next wallpaper...', 'info')
      })
    }

    init()

    return () => {
      unsubStatus?.()
      unsubNext?.()
    }
  }, [])

  useEffect(() => {
    if (settings.apiKey) {
      fetchTopics(settings.apiKey)
        .then(setTopics)
        .catch(() => addToast('Failed to load topics', 'error'))
    }
  }, [settings.apiKey])

  if (!settings.apiKey) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <ApiKeySetup />
        <Toast />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen bg-white">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="titlebar-drag h-[52px] flex-shrink-0" />
        {currentPage === 'gallery' && <Gallery />}
        {currentPage === 'settings' && <Settings />}
      </main>
      <PreviewModal />
      <Toast />
    </div>
  )
}
