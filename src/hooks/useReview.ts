import { useCallback, useEffect, useMemo } from "react"

import { searchItems as dbSearch } from "../database"
import type { Item } from "../types"
import { getDueItems, getRecentItems, getReviewStats } from "./useSrs"

export function useReview(options: {
  allItemsUnfiltered: Item[]
  searchItems: typeof dbSearch
  onSearch: () => Promise<void>
  sidebarTab: "projects" | "review" | "backup"
  setSidebarTab: (tab: "projects" | "review" | "backup") => void
  reviewItems: Item[]
  setReviewItems: (items: Item[]) => void
  previewCount: number
  setPreviewCount: (n: number) => void
  previewItems: Item[]
  setPreviewItems: (items: Item[]) => void
  reviewDateFilter: string | null
  setReviewDateFilter: (key: string | null) => void
  reviewProgress: { current: number; total: number }
  setReviewProgress: (p: { current: number; total: number }) => void
}) {
  const {
    allItemsUnfiltered,
    searchItems,
    onSearch,
    sidebarTab,
    setSidebarTab,
    previewCount,
    setPreviewCount,
    setPreviewItems,
    reviewDateFilter,
    setReviewDateFilter,
    setReviewProgress,
    setReviewItems
  } = options

  const dueCount = useMemo(() => getDueItems(allItemsUnfiltered).length, [allItemsUnfiltered])
  const reviewStats = useMemo(() => getReviewStats(allItemsUnfiltered), [allItemsUnfiltered])
  const recentItems = useMemo(() => getRecentItems(allItemsUnfiltered, 3), [allItemsUnfiltered])

  const recentDates = useMemo(() => {
    const DAY_MS = 86400000
    const now = Date.now()
    const result: { key: string; label: string; count: number }[] = []
    for (let i = 0; i < 3; i++) {
      const d = new Date(now - i * DAY_MS)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const label = i === 0 ? "（今天）" : i === 1 ? "（昨天）" : "（前天）"
      const group = recentItems.find((g) => g.date === key)
      if (group) {
        result.push({ key, label: `${d.getMonth() + 1}月${d.getDate()}日${label}`, count: group.items.length })
      }
    }
    return result
  }, [recentItems])

  const reviewDateItems = useMemo(() => {
    if (!reviewDateFilter) return []
    return recentItems.find((g) => g.date === reviewDateFilter)?.items ?? []
  }, [reviewDateFilter, recentItems])

  const handleStartReview = useCallback(async () => {
    setPreviewCount(0)
    setPreviewItems([])
    const all = await searchItems({})
    const due = getDueItems(all)
    setReviewItems(due)
    setSidebarTab("review")
  }, [searchItems, setSidebarTab, setPreviewCount, setPreviewItems, setReviewItems])

  useEffect(() => {
    if (sidebarTab === "review" && !reviewDateFilter) {
      handleStartReview()
    }
  }, [sidebarTab, reviewDateFilter, handleStartReview])

  const handleExitReview = useCallback(() => {
    setReviewItems([])
    setSidebarTab("projects")
    onSearch()
  }, [onSearch, setSidebarTab, setReviewItems])

  const handlePreview = useCallback(
    async (count: number) => {
      if (count === previewCount) {
        setPreviewCount(0)
        setPreviewItems([])
        setSidebarTab("projects")
        return
      }
      setPreviewCount(count)
      setReviewDateFilter(null)
      setSidebarTab("review")
      const all = await searchItems({})
      const due = getDueItems(all)
      setPreviewItems(due.slice(0, count))
    },
    [previewCount, searchItems, setSidebarTab, setPreviewCount, setPreviewItems, setReviewDateFilter]
  )

  const handleReviewDateClick = useCallback((dateKey: string | null) => {
    setReviewDateFilter(dateKey)
    setPreviewCount(0)
    setPreviewItems([])
    if (dateKey) setSidebarTab("review")
  }, [setSidebarTab, setReviewDateFilter, setPreviewCount, setPreviewItems])

  return {
    dueCount,
    reviewStats,
    recentDates,
    reviewDateItems,
    handleStartReview,
    handleExitReview,
    handlePreview,
    handleReviewDateClick,
    recentItems
  }
}
