import React from 'react'
import { useStore } from '../store/useStore'

export default function Sidebar() {
  const {
    currentPage,
    setCurrentPage,
    topics,
    selectedTopic,
    setSelectedTopic,
    setPhotos,
    setGalleryPage,
    setHasMorePhotos,
    setSearchQuery
  } = useStore()

  const handleTopicClick = (slug: string) => {
    setSelectedTopic(slug)
    setPhotos([])
    setGalleryPage(1)
    setHasMorePhotos(true)
    setSearchQuery('')
    setCurrentPage('gallery')
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-[rgba(246,246,246,0.95)] border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Titlebar drag region */}
      <div className="titlebar-drag h-[52px] flex-shrink-0" />

      {/* Navigation */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setCurrentPage('gallery')}
          className={`titlebar-no-drag w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'gallery'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          Gallery
        </button>
        <button
          onClick={() => setCurrentPage('settings')}
          className={`titlebar-no-drag w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-1 ${
            currentPage === 'settings'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-gray-600 hover:bg-white/60'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-gray-200 my-2" />

      {/* Topics */}
      <div className="px-3 mb-2">
        <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Topics
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {topics.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400">Loading topics...</div>
        )}
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => handleTopicClick(topic.slug)}
            className={`titlebar-no-drag w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
              selectedTopic === topic.slug && currentPage === 'gallery'
                ? 'bg-[#007AFF] text-white'
                : 'text-gray-700 hover:bg-white/60'
            }`}
          >
            {topic.title}
          </button>
        ))}
      </div>
    </aside>
  )
}
