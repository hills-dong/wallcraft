import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { Settings } from '../shared/types'

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  topicSlug: '',
  updateInterval: 'manual'
}

export function loadSettings(): Settings {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const data = readFileSync(SETTINGS_PATH, 'utf-8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
    }
  } catch {
    // Fall through to defaults
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(settings: Settings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}
