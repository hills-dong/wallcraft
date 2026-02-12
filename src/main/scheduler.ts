import { Settings } from '../shared/types'

let schedulerTimer: ReturnType<typeof setInterval> | null = null

function getIntervalMs(interval: Settings['updateInterval']): number {
  switch (interval) {
    case '30min':
      return 30 * 60 * 1000
    case '1hour':
      return 60 * 60 * 1000
    case '6hour':
      return 6 * 60 * 60 * 1000
    case 'daily':
      return 24 * 60 * 60 * 1000
    default:
      return 0
  }
}

export function startScheduler(settings: Settings, onTick: () => void): void {
  stopScheduler()

  const intervalMs = getIntervalMs(settings.updateInterval)
  if (intervalMs <= 0) return

  schedulerTimer = setInterval(onTick, intervalMs)
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}
