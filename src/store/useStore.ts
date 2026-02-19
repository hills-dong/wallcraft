import { create } from 'zustand'
import { ScreenInfo, Settings, UnsplashPhoto, UnsplashTopic, WallpaperStatus } from '../types'

type Page = 'gallery' | 'settings'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void

  screens: ScreenInfo[]
  setScreens: (screens: ScreenInfo[]) => void

  settings: Settings
  setSettings: (settings: Settings) => void

  topics: UnsplashTopic[]
  setTopics: (topics: UnsplashTopic[]) => void
  selectedTopic: string
  setSelectedTopic: (slug: string) => void

  photos: UnsplashPhoto[]
  setPhotos: (photos: UnsplashPhoto[]) => void
  appendPhotos: (photos: UnsplashPhoto[]) => void
  currentPage_gallery: number
  setGalleryPage: (page: number) => void
  isLoadingPhotos: boolean
  setIsLoadingPhotos: (loading: boolean) => void
  hasMorePhotos: boolean
  setHasMorePhotos: (hasMore: boolean) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  previewPhoto: UnsplashPhoto | null
  setPreviewPhoto: (photo: UnsplashPhoto | null) => void

  wallpaperStatuses: WallpaperStatus[]
  setWallpaperStatus: (status: WallpaperStatus) => void
  clearWallpaperStatuses: () => void
  isApplying: boolean
  setIsApplying: (applying: boolean) => void

  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  currentPage: 'gallery',
  setCurrentPage: (page) => set({ currentPage: page }),

  screens: [],
  setScreens: (screens) => set({ screens }),

  settings: { apiKey: '', topicSlug: '', updateInterval: 'manual' },
  setSettings: (settings) => set({ settings }),

  topics: [],
  setTopics: (topics) => set({ topics }),
  selectedTopic: '',
  setSelectedTopic: (slug) => set({ selectedTopic: slug }),

  photos: [],
  setPhotos: (photos) => set({ photos }),
  appendPhotos: (photos) => set((state) => ({ photos: [...state.photos, ...photos] })),
  currentPage_gallery: 1,
  setGalleryPage: (page) => set({ currentPage_gallery: page }),
  isLoadingPhotos: false,
  setIsLoadingPhotos: (loading) => set({ isLoadingPhotos: loading }),
  hasMorePhotos: true,
  setHasMorePhotos: (hasMore) => set({ hasMorePhotos: hasMore }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  previewPhoto: null,
  setPreviewPhoto: (photo) => set({ previewPhoto: photo }),

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
