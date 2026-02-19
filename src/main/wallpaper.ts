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

// Apply wallpapers to all screens across ALL workspaces (spaces) using two complementary approaches:
//
// 1. AppleScript: groups System Events desktops by display name (order matches Electron's
//    getAllDisplays()), then sets the correct cropped image for every workspace on each display.
//
// 2. Python + sqlite3: directly updates desktoppicture.db so non-active spaces also get
//    the correct wallpaper when the user switches to them (macOS reads the DB on space switch).
//
// screenImages is indexed by screen order (same as Electron's screen.getAllDisplays()).
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

  // --- Approach 1: AppleScript with display-name grouping ---
  // Iterates ALL desktops (workspaces), groups by display name preserving first-occurrence
  // order (which matches Electron's screen order), and applies the correct per-screen image.
  const branches = valid
    .map(({ path, idx }) => {
      const safePath = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return `if displayIdx = ${idx} then\n        set picture of d to POSIX file "${safePath}"`
    })
    .join('\n      else ')

  const appleScript = `tell application "System Events"
  set allDesktops to every desktop
  set displayNamesOrdered to {}
  repeat with d in allDesktops
    set dn to display name of d
    if displayNamesOrdered does not contain dn then
      set end of displayNamesOrdered to dn
    end if
  end repeat
  repeat with d in allDesktops
    set dn to display name of d
    set displayIdx to 0
    repeat with i from 1 to count of displayNamesOrdered
      if item i of displayNamesOrdered is dn then
        set displayIdx to i - 1
        exit repeat
      end if
    end repeat
    ${branches}
    end if
  end repeat
end tell`

  const appleScriptPath = join(WALLPAPER_DIR, 'set_wallpaper.applescript')
  writeFileSync(appleScriptPath, appleScript)
  await execAsync(`osascript "${appleScriptPath}"`)

  // --- Approach 2: Update desktoppicture.db for non-active spaces ---
  // macOS reads wallpaper settings from this SQLite database when switching spaces.
  // Updating it ensures every workspace shows the correct image even if AppleScript
  // only affects currently active spaces (behavior in macOS Sonoma+).
  const pairsCode = valid
    .map(({ path, idx }) => {
      const safePath = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      return `${idx}: "${safePath}"`
    })
    .join(', ')

  const pythonScript = `import sqlite3, plistlib, os, sys
db_path = os.path.expanduser('~/Library/Application Support/Dock/desktoppicture.db')
if not os.path.exists(db_path):
    sys.exit(0)
pairs = {${pairsCode}}
try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT rowid FROM displays ORDER BY rowid")
    display_rows = [r[0] for r in c.fetchall()]
    for display_idx, display_id in enumerate(display_rows):
        if display_idx not in pairs:
            continue
        image_path = pairs[display_idx]
        plist_data = plistlib.dumps({"BackgroundFilePath": image_path})
        c.execute("SELECT DISTINCT data_id FROM preferences WHERE display_id = ?", (display_id,))
        data_ids = [r[0] for r in c.fetchall()]
        if data_ids:
            for data_id in data_ids:
                c.execute("UPDATE data SET value = ? WHERE rowid = ?", (plist_data, data_id))
        else:
            c.execute("INSERT INTO data (value) VALUES (?)", (plist_data,))
            new_id = c.lastrowid
            c.execute("SELECT rowid FROM spaces WHERE display_id = ?", (display_id,))
            spaces_list = [r[0] for r in c.fetchall()]
            for space_id in spaces_list:
                c.execute(
                    "INSERT OR REPLACE INTO preferences (display_id, space_id, data_id) VALUES (?, ?, ?)",
                    (display_id, space_id, new_id))
    conn.commit()
    conn.close()
except Exception as e:
    print("Warning: desktoppicture.db update failed:", e, file=sys.stderr)
`

  const pyScriptPath = join(WALLPAPER_DIR, 'update_db.py')
  writeFileSync(pyScriptPath, pythonScript)
  try {
    await execAsync(`python3 "${pyScriptPath}"`)
  } catch {
    // Non-critical: AppleScript already handled current spaces
  }
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

  // Step 1: Download the full resolution image
  screens.forEach((s) => onStatus({ screenId: s.id, status: 'downloading' }))

  let imageBuffer: Buffer
  try {
    imageBuffer = await downloadImage(photoUrl)
  } catch {
    screens.forEach((s) => onStatus({ screenId: s.id, status: 'error', error: 'Download failed' }))
    return false
  }

  // Step 2: Crop for each screen independently
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

  // Step 3: Apply ALL wallpapers in a SINGLE call to prevent multi-screen overwrite.
  // The old approach called setWallpaper per screen, which overwrote all desktops each time.
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
