import React, { useEffect } from 'react'
import { useStore } from './store/useStore'
import Sidebar from './components/Sidebar'
import Gallery from './components/Gallery'
import Settings from './components/Settings'
import PreviewModal from './components/PreviewModal'
import Toast from './components/Toast'
import ApiKeySetup from './components/ApiKeySetup'
import { fetchTopics } from './services/unsplash'

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

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        // Load settings
        const savedSettings = await window.api.getSettings()
        setSettings(savedSettings)

        // Load screens
        const screens = await window.api.getScreens()
        setScreens(screens)
      } catch (error) {
        console.error('Init error:', error)
      }
    }
    init()

    // Listen for wallpaper status updates
    const unsubStatus = window.api.onWallpaperStatus((status) => {
      setWallpaperStatus(status)
      if (status.status === 'success') {
        addToast(`Screen ${status.screenId} wallpaper applied`, 'success')
      } else if (status.status === 'error') {
        addToast(`Screen ${status.screenId}: ${status.error}`, 'error')
      }
    })

    // Listen for next wallpaper from tray
    const unsubNext = window.api.onNextWallpaper(() => {
      addToast('Switching to next wallpaper...', 'info')
    })

    return () => {
      unsubStatus()
      unsubNext()
    }
  }, [])

  // Load topics when API key is available
  useEffect(() => {
    if (settings.apiKey) {
      fetchTopics(settings.apiKey)
        .then(setTopics)
        .catch((err) => addToast('Failed to load topics', 'error'))
    }
  }, [settings.apiKey])

  // Show setup if no API key
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
        {/* Titlebar drag region */}
        <div className="titlebar-drag h-[52px] flex-shrink-0" />
        {currentPage === 'gallery' && <Gallery />}
        {currentPage === 'settings' && <Settings />}
      </main>
      <PreviewModal />
      <Toast />
    </div>
  )
}
