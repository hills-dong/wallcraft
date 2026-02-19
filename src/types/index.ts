export interface ScreenInfo {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}

export interface Settings {
  apiKey: string
  topicSlug: string
  updateInterval: 'manual' | '30min' | '1hour' | '6hour' | 'daily'
}

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

export interface WallpaperStatus {
  screenId: string
  status: 'pending' | 'downloading' | 'cropping' | 'applying' | 'success' | 'error'
  error?: string
}
