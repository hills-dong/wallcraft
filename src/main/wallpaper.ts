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

// Apply wallpapers to all screens across ALL workspaces in a single AppleScript call.
//
// Groups System Events desktops by display name, preserving first-occurrence order
// which matches Electron's getAllDisplays() order. Iterates every desktop (workspace)
// on every display and sets the correct per-screen cropped image.
//
// screenImages is indexed by screen order (same as Electron's getAllDisplays()).
// null entries are skipped.
async function setWallpapersForAllSpaces(screenImages: Array<string | null>): Promise<void> {
  if (process.platform !== 'darwin') {
    screenImages.forEach((p, i) => p && console.log(`[Dev] Screen ${i}: ${p}`))
    return
  }

  const valid = screenImages
    .map((path, idx) => ({ path, idx }))
    .filter((x): x is { path: string; idx: number } => x.path !== null)

  if (valid.length === 0) return

  // Build AppleScript list (1-indexed). Use empty string for skipped screens.
  const maxIdx = Math.max(...valid.map((x) => x.idx))
  const listItems: string[] = []
  for (let i = 0; i <= maxIdx; i++) {
    const entry = valid.find((x) => x.idx === i)
    const safePath = entry ? entry.path.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : ''
    listItems.push(`"${safePath}"`)
  }
  const imagePathsList = `{${listItems.join(', ')}}`

  // AppleScript strategy:
  //   1. Walk every desktop once to build an ordered list of unique display names.
  //      First-occurrence order matches Electron's getAllDisplays() order.
  //   2. Walk every desktop again, look up which display it belongs to (1-based index),
  //      then set picture using `tell d … end tell` (most reliable syntax).
  const appleScript = `tell application "System Events"
  set imagePathsList to ${imagePathsList}
  set allDesktops to every desktop

  -- Build ordered unique display name list (preserves screen order)
  set displayNamesOrdered to {}
  repeat with d in allDesktops
    set dn to display name of d
    if displayNamesOrdered does not contain dn then
      set end of displayNamesOrdered to dn
    end if
  end repeat

  -- Set the correct wallpaper for every desktop on every display
  repeat with d in allDesktops
    set dn to display name of d
    repeat with i from 1 to count of displayNamesOrdered
      if item i of displayNamesOrdered is dn then
        if i <= count of imagePathsList then
          set imgPath to item i of imagePathsList
          if imgPath is not "" then
            tell d
              set picture to POSIX file imgPath
            end tell
          end if
        end if
        exit repeat
      end if
    end repeat
  end repeat
end tell`

  const scriptPath = join(WALLPAPER_DIR, 'set_wallpaper.applescript')
  writeFileSync(scriptPath, appleScript)
  await execAsync(`osascript "${scriptPath}"`)
}

export async function applyWallpaper(
  photoUrl: string,
  screens: ScreenInfo[],
  onStatus: (status: WallpaperStatus) => void
): Promise<boolean> {
  ensureWallpaperDir()

  // Calculate total virtual screen bounds
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

  // Step 1: Download
  screens.forEach((s) => onStatus({ screenId: s.id, status: 'downloading' }))

  let imageBuffer: Buffer
  try {
    imageBuffer = await downloadImage(photoUrl)
  } catch {
    screens.forEach((s) => onStatus({ screenId: s.id, status: 'error', error: 'Download failed' }))
    return false
  }

  // Step 2: Crop each screen independently
  const croppedPaths: Array<string | null> = []
  for (const screenInfo of screens) {
    try {
      onStatus({ screenId: screenInfo.id, status: 'cropping' })
      croppedPaths.push(await cropImage(imageBuffer, screenInfo, totalBounds))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      onStatus({ screenId: screenInfo.id, status: 'error', error: errorMsg })
      croppedPaths.push(null)
    }
  }

  // Step 3: Apply ALL wallpapers in ONE call.
  // Calling per-screen would overwrite all desktops each time (the original bug).
  screens.forEach((s, i) => {
    if (croppedPaths[i] !== null) onStatus({ screenId: s.id, status: 'applying' })
  })

  try {
    await setWallpapersForAllSpaces(croppedPaths)
    screens.forEach((s, i) => {
      if (croppedPaths[i] !== null) onStatus({ screenId: s.id, status: 'success' })
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    screens.forEach((s, i) => {
      if (croppedPaths[i] !== null) onStatus({ screenId: s.id, status: 'error', error: errorMsg })
    })
    return false
  }

  return croppedPaths.every((p) => p !== null)
}
