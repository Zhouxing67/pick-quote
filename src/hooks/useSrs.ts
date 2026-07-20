import type { Item, SrsData } from "../types"

function defaultSrs(): SrsData {
  return {
    dueDate: Date.now(),
    interval: 0,
    easeFactor: 2.5,
    reviewCount: 0,
    lastReviewDate: 0
  }
}

export function ensureSrs(item: Item): Item {
  if (item.srs) return item
  return { ...item, srs: defaultSrs() }
}

export function rateCard(item: Item, rating: 1 | 2 | 3 | 4): Item {
  const srs = item.srs ?? defaultSrs()
  let { interval, easeFactor, reviewCount } = srs
  reviewCount++

  if (rating < 3) {
    interval = 1
    easeFactor = Math.max(1.3, easeFactor - 0.2)
  } else if (rating === 3) {
    interval = Math.max(1, interval * easeFactor)
  } else {
    interval = Math.max(1, interval * easeFactor * 1.3)
    easeFactor += 0.15
  }

  interval = Math.min(365, Math.max(1, Math.round(interval)))
  easeFactor = Math.max(1.3, Math.round(easeFactor * 100) / 100)

  return {
    ...item,
    srs: {
      interval,
      easeFactor,
      reviewCount,
      dueDate: Date.now() + interval * 86400000,
      lastReviewDate: Date.now()
    }
  }
}

export function getDueItems(items: Item[]): Item[] {
  const now = Date.now()
  return items
    .filter((i) => !i.srs || i.srs.dueDate <= now)
    .map((i) => ensureSrs(i))
    .sort((a, b) => (a.srs?.dueDate ?? 0) - (b.srs?.dueDate ?? 0))
}
