import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { UnsplashPhoto } from '../../../../shared/types'

interface Props {
  photo: UnsplashPhoto
}

export default function PhotoCard({ photo }: Props) {
  const { setPreviewPhoto } = useStore()
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      onClick={() => setPreviewPhoto(photo)}
      className="group relative aspect-[3/2] rounded-xl overflow-hidden cursor-pointer shadow-macos hover:shadow-macos-lg transition-all duration-200 hover:scale-[1.02]"
      style={{ backgroundColor: photo.color }}
    >
      {/* Skeleton while loading */}
      {!loaded && <div className="skeleton absolute inset-0" />}

      {/* Image */}
      <img
        src={photo.urls.small}
        alt={photo.description || 'Wallpaper'}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Hover overlay with info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium truncate">{photo.user.name}</p>
          <p className="text-white/70 text-xs">
            {photo.width} x {photo.height}
          </p>
        </div>
      </div>
    </div>
  )
}
