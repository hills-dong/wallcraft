import type { WallCraftAPI } from '../../../preload/index'

declare global {
  interface Window {
    api: WallCraftAPI
  }
}
