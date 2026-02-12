import { screen } from 'electron'
import { ScreenInfo } from '../shared/types'

export function getScreens(): ScreenInfo[] {
  const displays = screen.getAllDisplays()

  return displays.map((display, index) => ({
    id: display.id.toString(),
    name: `Display ${index + 1}`,
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    scaleFactor: display.scaleFactor
  }))
}
