import React, { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useStore } from '../store/useStore'
import { Settings } from '../types'

export default function ApiKeySetup() {
  const { setSettings, addToast } = useStore()
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = apiKey.trim()
    if (!key) {
      addToast('Please enter a valid API key', 'error')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('https://api.unsplash.com/topics?per_page=1', {
        headers: { Authorization: `Client-ID ${key}` }
      })
      if (!response.ok) {
        throw new Error('Invalid API key')
      }

      const settings: Settings = { apiKey: key, topicSlug: '', updateInterval: 'manual' }
      await invoke('save_settings', { settings })
      setSettings(settings)
      addToast('API key saved successfully', 'success')
    } catch {
      addToast('Invalid API key. Please check and try again.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WallCraft</h1>
        <p className="text-gray-500 text-sm">
          Advanced wallpaper management for multi-display setups
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-macos-lg p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Get Started</h2>
          <p className="text-sm text-gray-500">
            Enter your Unsplash API key to access millions of high-quality wallpapers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Unsplash API Access Key</span>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your access key here..."
              className="mt-1 block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]/30 focus:bg-white transition-all"
              autoFocus
            />
          </label>

          <button
            type="submit"
            disabled={isSaving || !apiKey.trim()}
            className="w-full px-4 py-2.5 bg-[#007AFF] hover:bg-[#0056CC] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Don't have an API key?{' '}
            <a
              href="https://unsplash.com/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007AFF] hover:underline"
            >
              Create one here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
