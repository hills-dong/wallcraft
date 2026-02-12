// Screen object as defined in PRD
export interface ScreenInfo {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}

// Settings object as defined in PRD
export interface Settings {
  apiKey: string
  topicSlug: string
  updateInterval: 'manual' | '30min' | '1hour' | '6hour' | 'daily'
}

// Unsplash photo data
export interface UnsplashPhoto {
  id: string
  width: number
  height: number
  color: string
  description: string | null
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  user: {
    name: string
    username: string
    links: {
      html: string
    }
  }
  links: {
    download_location: string
  }
}

// Unsplash topic
export interface UnsplashTopic {
  id: string
  slug: string
  title: string
  description: string | null
  total_photos: number
  cover_photo: {
    urls: {
      small: string
      thumb: string
    }
  } | null
}

// Wallpaper application status
export interface WallpaperStatus {
  screenId: string
  status: 'pending' | 'downloading' | 'cropping' | 'applying' | 'success' | 'error'
  error?: string
}

// IPC channel definitions
export const IPC_CHANNELS = {
  // Screen
  GET_SCREENS: 'get-screens',
  REFRESH_SCREENS: 'refresh-screens',

  // Wallpaper
  APPLY_WALLPAPER: 'apply-wallpaper',
  WALLPAPER_STATUS: 'wallpaper-status',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',

  // Scheduler
  START_SCHEDULER: 'start-scheduler',
  STOP_SCHEDULER: 'stop-scheduler',

  // Window
  SHOW_MAIN_WINDOW: 'show-main-window',
  NEXT_WALLPAPER: 'next-wallpaper'
} as const
