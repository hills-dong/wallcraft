import React, { useEffect, useCallback, useRef } from 'react'
import { useStore } from '../store/useStore'
import { fetchTopicPhotos, searchPhotos } from '../services/unsplash'
import PhotoCard from './PhotoCard'
import SearchBar from './SearchBar'

export default function Gallery() {
  const {
    settings,
    photos,
    setPhotos,
    appendPhotos,
    selectedTopic,
    currentPage_gallery,
    setGalleryPage,
    isLoadingPhotos,
    setIsLoadingPhotos,
    hasMorePhotos,
    setHasMorePhotos,
    searchQuery,
    addToast
  } = useStore()

  const loadingRef = useRef(false)

  const loadPhotos = useCallback(
    async (page: number, reset: boolean = false) => {
      if (loadingRef.current || !settings.apiKey) return
      if (!selectedTopic && !searchQuery) return

      loadingRef.current = true
      setIsLoadingPhotos(true)

      try {
        let newPhotos
        if (searchQuery) {
          const result = await searchPhotos(settings.apiKey, searchQuery, page)
          newPhotos = result.results
          if (page >= result.total_pages) {
            setHasMorePhotos(false)
          }
        } else {
          newPhotos = await fetchTopicPhotos(settings.apiKey, selectedTopic, page)
          if (newPhotos.length === 0) {
            setHasMorePhotos(false)
          }
        }

        if (reset) {
          setPhotos(newPhotos)
        } else {
          appendPhotos(newPhotos)
        }
      } catch {
        addToast('Failed to load photos', 'error')
      } finally {
        setIsLoadingPhotos(false)
        loadingRef.current = false
      }
    },
    [settings.apiKey, selectedTopic, searchQuery]
  )

  useEffect(() => {
    if (selectedTopic || searchQuery) {
      setPhotos([])
      setGalleryPage(1)
      setHasMorePhotos(true)
      loadPhotos(1, true)
    }
  }, [selectedTopic, searchQuery])

  const handleLoadMore = () => {
    if (!isLoadingPhotos && hasMorePhotos) {
      const nextPage = currentPage_gallery + 1
      setGalleryPage(nextPage)
      loadPhotos(nextPage)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 300) {
      handleLoadMore()
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <SearchBar />
      <div className="flex-1 overflow-y-auto p-6" onScroll={handleScroll}>
        {photos.length === 0 && !isLoadingPhotos && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Select a topic or search for wallpapers</p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} />
            ))}
            {isLoadingPhotos &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="skeleton aspect-[3/2] rounded-xl" />
              ))}
          </div>
        )}

        {photos.length === 0 && isLoadingPhotos && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="skeleton aspect-[3/2] rounded-xl" />
            ))}
          </div>
        )}

        {photos.length > 0 && hasMorePhotos && !isLoadingPhotos && (
          <div className="flex justify-center mt-6 mb-4">
            <button onClick={handleLoadMore} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-600 transition-colors">
              Load More
            </button>
          </div>
        )}

        {photos.length > 0 && !hasMorePhotos && (
          <div className="text-center text-gray-400 text-sm mt-6 mb-4">
            No more wallpapers to load
          </div>
        )}
      </div>
    </div>
  )
}
