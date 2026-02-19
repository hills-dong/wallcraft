import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useStore } from '../store/useStore'
import { Settings as SettingsType, ScreenInfo } from '../types'

const UPDATE_INTERVALS = [
  { value: 'manual', label: 'Manual' },
  { value: '30min', label: 'Every 30 minutes' },
  { value: '1hour', label: 'Every hour' },
  { value: '6hour', label: 'Every 6 hours' },
  { value: 'daily', label: 'Daily' }
] as const

export default function Settings() {
  const { settings, setSettings, screens, setScreens, addToast } = useStore()
  const [form, setForm] = useState<SettingsType>(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await invoke('save_settings', { settings: form })
      setSettings(form)
      addToast('Settings saved', 'success')
    } catch {
      addToast('Failed to save settings', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRefreshScreens = async () => {
    setIsRefreshing(true)
    try {
      const newScreens = await invoke<ScreenInfo[]>('refresh_screens')
      setScreens(newScreens)
      addToast(`Detected ${newScreens.length} display(s)`, 'info')
    } catch {
      addToast('Failed to refresh screens', 'error')
    } finally {
      setIsRefreshing(false)
    }
  }

  const minX = screens.length > 0 ? Math.min(...screens.map((s) => s.x)) : 0
  const minY = screens.length > 0 ? Math.min(...screens.map((s) => s.y)) : 0
  const maxX = screens.length > 0 ? Math.max(...screens.map((s) => s.x + s.width)) : 1920
  const maxY = screens.length > 0 ? Math.max(...screens.map((s) => s.y + s.height)) : 1080
  const totalW = maxX - minX
  const totalH = maxY - minY

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Unsplash API
          </h2>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <label className="block">
              <span className="text-sm text-gray-600">API Access Key</span>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Enter your Unsplash API key"
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]/30"
              />
            </label>
            <p className="text-xs text-gray-400">
              Get your API key from{' '}
              <a
                href="https://unsplash.com/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007AFF] hover:underline"
              >
                unsplash.com/developers
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Display Layout
            </h2>
            <button
              onClick={handleRefreshScreens}
              disabled={isRefreshing}
              className="text-sm text-[#007AFF] hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {isRefreshing ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              Refresh
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            {screens.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No displays detected</p>
            ) : (
              <>
                <div
                  className="relative bg-gray-200 rounded-lg mx-auto mb-4"
                  style={{ width: '100%', maxWidth: '400px', aspectRatio: `${totalW} / ${totalH}` }}
                >
                  {screens.map((screen, i) => (
                    <div
                      key={screen.id}
                      className="absolute bg-blue-100 border-2 border-blue-400 rounded-md flex flex-col items-center justify-center"
                      style={{
                        left: `${((screen.x - minX) / totalW) * 100}%`,
                        top: `${((screen.y - minY) / totalH) * 100}%`,
                        width: `${(screen.width / totalW) * 100}%`,
                        height: `${(screen.height / totalH) * 100}%`
                      }}
                    >
                      <span className="text-sm font-bold text-blue-700">{i + 1}</span>
                      <span className="text-[10px] text-blue-500">{screen.width}x{screen.height}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {screens.map((screen, i) => (
                    <div key={screen.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                      <span className="font-medium text-gray-700">Display {i + 1}</span>
                      <span className="text-gray-400">{screen.width}x{screen.height} @{screen.scaleFactor}x</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Auto Update
          </h2>
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block">
              <span className="text-sm text-gray-600">Update Frequency</span>
              <select
                value={form.updateInterval}
                onChange={(e) => setForm({ ...form, updateInterval: e.target.value as SettingsType['updateInterval'] })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]/30"
              >
                {UPDATE_INTERVALS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <p className="text-xs text-gray-400 mt-2">
              When enabled, WallCraft will automatically download and apply a new wallpaper at the chosen frequency.
            </p>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[#007AFF] hover:bg-[#0056CC] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
