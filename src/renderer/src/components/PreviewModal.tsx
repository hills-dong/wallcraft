import React, { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { getFullResUrl, trackDownload } from '../services/unsplash'

export default function PreviewModal() {
  const {
    previewPhoto,
    setPreviewPhoto,
    screens,
    settings,
    isApplying,
    setIsApplying,
    clearWallpaperStatuses,
    wallpaperStatuses,
    addToast
  } = useStore()

  // Calculate per-screen cropped preview regions.
  // Uses the same cover-scale algorithm as the main process cropImage function so that
  // what you see in the preview is exactly what will be applied to each screen.
  const cropPreviews = useMemo(() => {
    if (!previewPhoto || screens.length === 0) return null

    const minX = Math.min(...screens.map((s) => s.x))
    const minY = Math.min(...screens.map((s) => s.y))
    const maxX = Math.max(...screens.map((s) => s.x + s.width))
    const maxY = Math.max(...screens.map((s) => s.y + s.height))
    const totalW = maxX - minX
    const totalH = maxY - minY

    // Fixed reference width for the virtual desktop container
    const containerW = 580
    const containerH = Math.round((containerW * totalH) / totalW)

    const imgW = previewPhoto.width
    const imgH = previewPhoto.height

    // Scale image to cover the virtual desktop (same as main process cropImage)
    const bgScale = Math.max(containerW / imgW, containerH / imgH)
    const bgW = imgW * bgScale
    const bgH = imgH * bgScale
    // Centering offset when the scaled image overflows in one dimension
    const bgOffX = (containerW - bgW) / 2
    const bgOffY = (containerH - bgH) / 2

    const screenPreviews = screens.map((screen, i) => {
      // Screen's position and size within the virtual desktop (preview pixels)
      const left = ((screen.x - minX) / totalW) * containerW
      const top = ((screen.y - minY) / totalH) * containerH
      const width = (screen.width / totalW) * containerW
      const height = (screen.height / totalH) * containerH

      // Shift the background image so only this screen's crop region is visible.
      // Setting background-position to (bgOffX - left, bgOffY - top) aligns the
      // image so the portion starting at (left, top) in the virtual desktop
      // appears at (0, 0) inside this screen box.
      const bgPosX = bgOffX - left
      const bgPosY = bgOffY - top

      return { screen, index: i + 1, left, top, width, height, bgPosX, bgPosY, bgW, bgH }
    })

    return { containerW, containerH, screenPreviews }
  }, [previewPhoto, screens])

  if (!previewPhoto) return null

  const handleApply = async () => {
    if (isApplying) return

    setIsApplying(true)
    clearWallpaperStatuses()

    try {
      await trackDownload(settings.apiKey, previewPhoto.links.download_location)
      const fullUrl = getFullResUrl(previewPhoto)
      const success = await window.api.applyWallpaper(fullUrl)
      if (success) {
        addToast('Wallpaper applied to all screens!', 'success')
      }
    } catch {
      addToast('Failed to apply wallpaper', 'error')
    } finally {
      setIsApplying(false)
    }
  }

  const handleClose = () => {
    if (!isApplying) {
      setPreviewPhoto(null)
      clearWallpaperStatuses()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-[90%] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <span className="text-sm text-gray-400">
              {previewPhoto.width} × {previewPhoto.height}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Screen layout preview — each box shows the actual crop for that display */}
          {cropPreviews ? (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Screen Layout Preview
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {screens.length} display{screens.length !== 1 ? 's' : ''}
                </span>
              </p>
              {/* Scrollable in case virtual desktop is very wide */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                {/* Container represents the full virtual desktop space */}
                <div
                  style={{
                    position: 'relative',
                    width: `${cropPreviews.containerW}px`,
                    height: `${cropPreviews.containerH}px`,
                    backgroundColor: '#111'
                  }}
                >
                  {cropPreviews.screenPreviews.map(
                    ({ screen, index, left, top, width, height, bgPosX, bgPosY, bgW, bgH }) => (
                      <div
                        key={screen.id}
                        style={{
                          position: 'absolute',
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                          backgroundImage: `url(${previewPhoto.urls.regular})`,
                          backgroundSize: `${bgW}px ${bgH}px`,
                          backgroundPosition: `${bgPosX}px ${bgPosY}px`,
                          backgroundRepeat: 'no-repeat',
                          overflow: 'hidden',
                          outline: '2px solid rgba(255,255,255,0.5)',
                          outlineOffset: '-1px'
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 6,
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            fontSize: 11,
                            padding: '3px 7px',
                            borderRadius: 5,
                            lineHeight: 1.5,
                            backdropFilter: 'blur(6px)'
                          }}
                        >
                          Screen {index}
                          <span style={{ opacity: 0.7, marginLeft: 4 }}>
                            {screen.width}×{screen.height}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Fallback: single image preview when no screen info is available */
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img
                src={previewPhoto.urls.regular}
                alt={previewPhoto.description || 'Preview'}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Application status */}
          {wallpaperStatuses.length > 0 && (
            <div className="space-y-2">
              {wallpaperStatuses.map((status) => (
                <div key={status.screenId} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600">Screen {status.screenId}:</span>
                  <span
                    className={`font-medium ${
                      status.status === 'success'
                        ? 'text-green-600'
                        : status.status === 'error'
                          ? 'text-red-600'
                          : 'text-blue-600'
                    }`}
                  >
                    {status.status === 'downloading' && 'Downloading...'}
                    {status.status === 'cropping' && 'Cropping...'}
                    {status.status === 'applying' && 'Applying...'}
                    {status.status === 'success' && 'Applied'}
                    {status.status === 'error' && `Error: ${status.error}`}
                    {status.status === 'pending' && 'Waiting...'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Photographer attribution */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Photo by</span>
            <a
              href={previewPhoto.user.links.html}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007AFF] hover:underline font-medium"
            >
              {previewPhoto.user.name}
            </a>
            <span>on</span>
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#007AFF] hover:underline font-medium"
            >
              Unsplash
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={isApplying}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Close
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="px-5 py-2 bg-[#007AFF] hover:bg-[#0056CC] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Applying...
              </>
            ) : (
              'Apply to All Screens'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
