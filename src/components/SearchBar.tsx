import React, { useState } from 'react'
import { useStore } from '../store/useStore'

export default function SearchBar() {
  const { setSearchQuery, setSelectedTopic, setPhotos, setGalleryPage, setHasMorePhotos } =
    useStore()
  const [inputValue, setInputValue] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = inputValue.trim()
    if (query) {
      setSelectedTopic('')
      setPhotos([])
      setGalleryPage(1)
      setHasMorePhotos(true)
      setSearchQuery(query)
    }
  }

  return (
    <form onSubmit={handleSearch} className="px-6 pt-2 pb-3 flex-shrink-0">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search wallpapers..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:bg-white border border-transparent focus:border-[#007AFF]/30 transition-all"
        />
      </div>
    </form>
  )
}
