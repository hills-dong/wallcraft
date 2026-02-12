import { create } from 'zustand'
import { ScreenInfo, Settings, UnsplashPhoto, UnsplashTopic, WallpaperStatus } from '../../../../shared/types'

type Page = 'gallery' | 'settings'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppState {
  // Navigation
  currentPage: Page
  setCurrentPage: (page: Page) => void

  // Screens
  screens: ScreenInfo[]
  setScreens: (screens: ScreenInfo[]) => void

  // Settings
  settings: Settings
  setSettings: (settings: Settings) => void

  // Topics
  topics: UnsplashTopic[]
  setTopics: (topics: UnsplashTopic[]) => void
  selectedTopic: string
  setSelectedTopic: (slug: string) => void

  // Photos
  photos: UnsplashPhoto[]
  setPhotos: (photos: UnsplashPhoto[]) => void
  appendPhotos: (photos: UnsplashPhoto[]) => void
  currentPage_gallery: number
  setGalleryPage: (page: number) => void
  isLoadingPhotos: boolean
  setIsLoadingPhotos: (loading: boolean) => void
  hasMorePhotos: boolean
  setHasMorePhotos: (hasMore: boolean) => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Preview
  previewPhoto: UnsplashPhoto | null
  setPreviewPhoto: (photo: UnsplashPhoto | null) => void

  // Wallpaper status
  wallpaperStatuses: WallpaperStatus[]
  setWallpaperStatus: (status: WallpaperStatus) => void
  clearWallpaperStatuses: () => void
  isApplying: boolean
  setIsApplying: (applying: boolean) => void

  // Toast
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'gallery',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Screens
  screens: [],
  setScreens: (screens) => set({ screens }),

  // Settings
  settings: { apiKey: '', topicSlug: '', updateInterval: 'manual' },
  setSettings: (settings) => set({ settings }),

  // Topics
  topics: [],
  setTopics: (topics) => set({ topics }),
  selectedTopic: '',
  setSelectedTopic: (slug) => set({ selectedTopic: slug }),

  // Photos
  photos: [],
  setPhotos: (photos) => set({ photos }),
  appendPhotos: (photos) => set((state) => ({ photos: [...state.photos, ...photos] })),
  currentPage_gallery: 1,
  setGalleryPage: (page) => set({ currentPage_gallery: page }),
  isLoadingPhotos: false,
  setIsLoadingPhotos: (loading) => set({ isLoadingPhotos: loading }),
  hasMorePhotos: true,
  setHasMorePhotos: (hasMore) => set({ hasMorePhotos: hasMore }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Preview
  previewPhoto: null,
  setPreviewPhoto: (photo) => set({ previewPhoto: photo }),

  // Wallpaper status
  wallpaperStatuses: [],
  setWallpaperStatus: (status) =>
    set((state) => {
      const existing = state.wallpaperStatuses.findIndex((s) => s.screenId === status.screenId)
      if (existing >= 0) {
        const updated = [...state.wallpaperStatuses]
        updated[existing] = status
        return { wallpaperStatuses: updated }
      }
      return { wallpaperStatuses: [...state.wallpaperStatuses, status] }
    }),
  clearWallpaperStatuses: () => set({ wallpaperStatuses: [] }),
  isApplying: false,
  setIsApplying: (applying) => set({ isApplying: applying }),

  // Toast
  toasts: [],
  addToast: (message, type) =>
    set((state) => {
      const id = Date.now().toString()
      setTimeout(() => {
        useStore.getState().removeToast(id)
      }, 3000)
      return { toasts: [...state.toasts, { id, message, type }] }
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}))
