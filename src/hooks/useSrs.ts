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

  const now = Date.now()
  const reviewHistory = [...(srs.reviewHistory ?? []), { date: now, rating }].slice(-200)

  return {
    ...item,
    srs: {
      interval,
      easeFactor,
      reviewCount,
      dueDate: rating < 3 ? now : now + interval * 86400000,
      lastReviewDate: now,
      reviewHistory
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

export interface ReviewStats {
  totalReviews: number
  masteredCount: number
  dueCount: number
  streakDays: number
  dailyActivity: { date: string; count: number; avgRating: number }[]
  accuracyRate: number
  todayRatingDistribution: [number, number, number, number]
}

const DAY_MS = 86400000

export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function getReviewStats(items: Item[]): ReviewStats {
  const now = Date.now()
  let totalReviews = 0
  let masteredCount = 0
  let dueCount = 0
  let goodRatings = 0
  const todayRatings: [number, number, number, number] = [0, 0, 0, 0]

  const todayKey = dayKey(now)

  const dailyMap = new Map<string, { count: number; ratingSum: number }>()

  for (const item of items) {
    const srs = item.srs
    if (!srs || srs.dueDate <= now) dueCount++
    if (srs && srs.interval >= 365) masteredCount++
    if (srs?.reviewHistory) {
      let todayCounted = false
      for (const entry of srs.reviewHistory) {
        totalReviews++
        if (entry.rating >= 3) goodRatings++
        const key = dayKey(entry.date)
        if (key === todayKey && !todayCounted) {
          todayRatings[entry.rating - 1]++
          todayCounted = true
        }
        const cur = dailyMap.get(key) ?? { count: 0, ratingSum: 0 }
        cur.count++
        cur.ratingSum += entry.rating
        dailyMap.set(key, cur)
      }
    }
  }

  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, count: v.count, avgRating: v.count > 0 ? v.ratingSum / v.count : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)

  // Streak: consecutive days with at least one review, ending today or yesterday
  const yesterdayKey = dayKey(now - DAY_MS)
  const allDays = new Set(dailyMap.keys())
  let streakDays = 0
  if (allDays.has(todayKey) || allDays.has(yesterdayKey)) {
    let cursor = allDays.has(todayKey) ? now : now - DAY_MS
    while (allDays.has(dayKey(cursor))) {
      streakDays++
      cursor -= DAY_MS
    }
  }

  return {
    totalReviews,
    masteredCount,
    dueCount,
    streakDays,
    dailyActivity,
    accuracyRate: totalReviews > 0 ? goodRatings / totalReviews : 0,
    todayRatingDistribution: todayRatings
  }
}

export function getRecentItems(items: Item[], days = 3): { date: string; items: Item[] }[] {
  const cutoff = Date.now() - days * DAY_MS
  const map = new Map<string, Item[]>()
  for (const item of items) {
    const lrd = item.srs?.lastReviewDate
    if (lrd && lrd >= cutoff) {
      const key = dayKey(lrd)
      const arr = map.get(key) ?? []
      arr.push(item)
      map.set(key, arr)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, cardItems]) => ({ date, items: cardItems }))
}
