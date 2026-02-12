import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { ScreenInfo, WallpaperStatus } from '../shared/types'

const execAsync = promisify(exec)

const WALLPAPER_DIR = join(app.getPath('userData'), 'wallpapers')

function ensureWallpaperDir(): void {
  if (!existsSync(WALLPAPER_DIR)) {
    mkdirSync(WALLPAPER_DIR, { recursive: true })
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const fetch = (await import('node-fetch')).default
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function cropImage(
  imageBuffer: Buffer,
  screenInfo: ScreenInfo,
  totalBounds: { minX: number; minY: number; totalWidth: number; totalHeight: number }
): Promise<string> {
  const sharp = (await import('sharp')).default
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions')
  }

  const imgWidth = metadata.width
  const imgHeight = metadata.height

  // Calculate scaling to cover the entire virtual screen space
  const scaleX = imgWidth / totalBounds.totalWidth
  const scaleY = imgHeight / totalBounds.totalHeight
  const scale = Math.max(scaleX, scaleY)

  // Calculate the offset to center the image
  const scaledTotalW = totalBounds.totalWidth * scale
  const scaledTotalH = totalBounds.totalHeight * scale
  const offsetX = Math.round((imgWidth - scaledTotalW) / 2)
  const offsetY = Math.round((imgHeight - scaledTotalH) / 2)

  // Calculate crop region for this specific screen
  const cropX = Math.max(0, Math.round((screenInfo.x - totalBounds.minX) * scale + offsetX))
  const cropY = Math.max(0, Math.round((screenInfo.y - totalBounds.minY) * scale + offsetY))
  const cropWidth = Math.min(Math.round(screenInfo.width * scale), imgWidth - cropX)
  const cropHeight = Math.min(Math.round(screenInfo.height * scale), imgHeight - cropY)

  const outputPath = join(WALLPAPER_DIR, `wallpaper_${screenInfo.id}.jpg`)

  await sharp(imageBuffer)
    .extract({
      left: cropX,
      top: cropY,
      width: Math.max(1, cropWidth),
      height: Math.max(1, cropHeight)
    })
    .resize(screenInfo.width * screenInfo.scaleFactor, screenInfo.height * screenInfo.scaleFactor)
    .jpeg({ quality: 95 })
    .toFile(outputPath)

  return outputPath
}

async function setWallpaperMacOS(imagePath: string, screenIndex: number): Promise<void> {
  // Use osascript to set wallpaper for all spaces on macOS
  const script = `
    tell application "System Events"
      tell every desktop
        set picture to "${imagePath}"
      end tell
    end tell
  `
  await execAsync(`osascript -e '${script}'`)
}

async function setWallpaperForAllSpaces(imagePath: string, screenId: string): Promise<void> {
  if (process.platform === 'darwin') {
    // Use NSWorkspace via osascript to set wallpaper for all spaces
    const script = `
      tell application "System Events"
        set desktopCount to count of desktops
        repeat with desktopNumber from 1 to desktopCount
          tell desktop desktopNumber
            set picture to POSIX file "${imagePath}"
          end tell
        end repeat
      end tell
    `
    await execAsync(`osascript -e '${script}'`)
  } else {
    // Fallback for other platforms (for development/testing)
    console.log(`[Dev] Would set wallpaper for screen ${screenId} to ${imagePath}`)
  }
}

export async function applyWallpaper(
  photoUrl: string,
  screens: ScreenInfo[],
  onStatus: (status: WallpaperStatus) => void
): Promise<boolean> {
  ensureWallpaperDir()

  // Calculate total screen bounds
  const minX = Math.min(...screens.map((s) => s.x))
  const minY = Math.min(...screens.map((s) => s.y))
  const maxX = Math.max(...screens.map((s) => s.x + s.width))
  const maxY = Math.max(...screens.map((s) => s.y + s.height))
  const totalBounds = {
    minX,
    minY,
    totalWidth: maxX - minX,
    totalHeight: maxY - minY
  }

  // Step 1: Download the full resolution image
  for (const screen of screens) {
    onStatus({ screenId: screen.id, status: 'downloading' })
  }

  let imageBuffer: Buffer
  try {
    imageBuffer = await downloadImage(photoUrl)
  } catch (error) {
    for (const screen of screens) {
      onStatus({ screenId: screen.id, status: 'error', error: 'Download failed' })
    }
    return false
  }

  // Step 2: Crop and apply for each screen
  let allSuccess = true
  for (const screenInfo of screens) {
    try {
      onStatus({ screenId: screenInfo.id, status: 'cropping' })
      const croppedPath = await cropImage(imageBuffer, screenInfo, totalBounds)

      onStatus({ screenId: screenInfo.id, status: 'applying' })
      await setWallpaperForAllSpaces(croppedPath, screenInfo.id)

      onStatus({ screenId: screenInfo.id, status: 'success' })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      onStatus({ screenId: screenInfo.id, status: 'error', error: errorMsg })
      allSuccess = false
    }
  }

  return allSuccess
}
