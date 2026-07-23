import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import InboxRoundedIcon from "@mui/icons-material/InboxRounded"
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded"
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Fade,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery
} from "@mui/material"
import { ThemeProvider } from "@mui/material/styles"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import AppHeader from "./components/AppHeader"
import BatchToolbar from "./components/BatchToolbar"
import CardGrid from "./components/CardGrid"
import DateRangeFilter from "./components/DateRangeFilter"
import DeleteConfirmDialog from "./components/DeleteConfirmDialog"
import EmptyState from "./components/EmptyState"
import FilterChips from "./components/FilterChips"
import ItemDialog from "./components/ItemDialog"
import MoveCopyCards from "./components/MoveCopyCards"
import NewCardDialog from "./components/NewCardDialog"
import NewProjectDialog from "./components/NewProjectDialog"
import ReviewSession from "./components/ReviewSession"
import SettingsDialog from "./components/SettingsDialog"
import SidebarFilters from "./components/SidebarFilters"
import { useBackupSync } from "./hooks/useBackupSync"
import { useNewCard } from "./hooks/useNewCard"
import { useProjects } from "./hooks/useProjects"
import { useReview } from "./hooks/useReview"
import { dayKey } from "./hooks/useSrs"
import {
  addItem,
  deleteItem,
  deleteItems,
  isDuplicate,
  searchItems,
  updateItem
} from "./database"
import { importFromZip } from "./import"
import { createAppTheme } from "./theme"
import type { Item, PresetName, SearchQuery } from "./types"
import { computeItemHash } from "./utils"
import { sendMessage } from "./types/messages"

const MIN_DRAWER_WIDTH = 200
const MAX_DRAWER_WIDTH = 500

export default function OptionsPage() {
  const [allItems, setAllItems] = useState<Item[]>([])
  const [displayedItems, setDisplayedItems] = useState<Item[]>([])
  const [keyword, setKeyword] = useState("")
  const [tag, setTag] = useState<string>("")
  const [dialogItem, setDialogItem] = useState<Item | null>(null)

  // Navigate prev/next within the currently displayed list
  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!dialogItem) return
      const idx = displayedItems.findIndex((i) => i.id === dialogItem.id)
      if (idx === -1) return
      const nextIdx = direction === "prev" ? idx - 1 : idx + 1
      if (nextIdx < 0 || nextIdx >= displayedItems.length) return
      setDialogItem(displayedItems[nextIdx])
    },
    [dialogItem, displayedItems]
  )

  const [hasMore, setHasMore] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerWidth, setDrawerWidth] = useState(280)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [preset, setPreset] = useState<PresetName>("classic")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"projects" | "review" | "backup">("projects")
  const [reviewItems, setReviewItems] = useState<Item[]>([])
  const [previewCount, setPreviewCount] = useState(0)
  const [previewItems, setPreviewItems] = useState<Item[]>([])
  const [reviewDateFilter, setReviewDateFilter] = useState<string | null>(null)
  const [reviewProgress, setReviewProgress] = useState({ current: 0, total: 0 })
  const [allItemsUnfiltered, setAllItemsUnfiltered] = useState<Item[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [readingFilter, setReadingFilter] = useState(false)
  const [dateRange, setDateRange] = useState<{ from?: number; to?: number } | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [moveCardId, setMoveCardId] = useState<string | null>(null)
  const [copyCardId, setCopyCardId] = useState<string | null>(null)
  const [batchAction, setBatchAction] = useState<"move" | "copy" | null>(null)
  const [snackbarMsg, setSnackbarMsg] = useState("")
  const [backupSelectedIds, setBackupSelectedIds] = useState<string[]>([])
  const [syncStatus, setSyncStatus] = useState("")

  const ITEMS_PER_PAGE = 20

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)")

  const theme = useMemo(
    () => createAppTheme(prefersDarkMode ? "dark" : "light", preset),
    [prefersDarkMode, preset]
  )

  const projectTags = useMemo(() => {
    if (!activeProjectId) return []
    const tagSet = new Set<string>()
    allItems.forEach((i) => i.tags?.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [allItems, activeProjectId])

  useEffect(() => {
    chrome.storage.sync.get("preset", (data) => {
      if (data.preset) setPreset(data.preset as PresetName)
    })
  }, [])

  useEffect(() => {
    chrome.storage.sync.set({ preset })
  }, [preset])

  const onSearch = useCallback(
    async (projectId?: string | null) => {
      const pid = projectId !== undefined ? projectId : activeProjectId
      const q: SearchQuery = {
        keyword,
        tag: tag || undefined,
        projectId: pid ?? undefined,
        from: dateRange?.from,
        to: dateRange?.to
      }
      const list = await searchItems(q)
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.createdAt - a.createdAt)
      setAllItems(list)
      setDisplayedItems(list.slice(0, ITEMS_PER_PAGE))
      setHasMore(list.length > ITEMS_PER_PAGE)
    },
    [keyword, tag, activeProjectId, dateRange, ITEMS_PER_PAGE]
  )

  const {
    projects,
    newProjectName,
    projectError,
    loadProjects,
    setNewProjectName,
    setProjectError,
    handleCreateProject,
    handleRenameProject,
    handleUpdateNote,
    handleDeleteProject
  } = useProjects({
    onSearch,
    onActivate: (id) => {
      setActiveProjectId(id)
      onSearch(id)
      sendMessage({ kind: "set-recent-project", projectId: id }).catch(() => {})
    },
    onDeactivate: () => {
      setActiveProjectId(null)
      setDialogItem(null)
      onSearch(null)
    }
  })

  const {
    dueCount,
    reviewStats,
    recentDates,
    reviewDateItems,
    handleStartReview,
    handleExitReview,
    handlePreview,
    handleReviewDateClick
  } = useReview({
    allItemsUnfiltered,
    searchItems,
    onSearch,
    sidebarTab,
    setSidebarTab,
    reviewItems, setReviewItems,
    previewCount, setPreviewCount,
    previewItems, setPreviewItems,
    reviewDateFilter, setReviewDateFilter,
    reviewProgress, setReviewProgress
  })

  const cardFirstRating = useMemo(() => {
    const m = new Map<string, 1 | 2 | 3 | 4>()
    if (!reviewDateFilter) return m
    for (const item of allItemsUnfiltered) {
      if (!item.srs?.reviewHistory) continue
      const entry = item.srs.reviewHistory.find((e) => dayKey(e.date) === reviewDateFilter)
      if (entry) m.set(item.id, entry.rating)
    }
    return m
  }, [allItemsUnfiltered, reviewDateFilter])

  // Mount: initial load
  useEffect(() => {
    onSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load unfiltered items for review (cross-project, independent of active project)
  useEffect(() => {
    searchItems({}).then(setAllItemsUnfiltered)
  }, [])

  // Immediate search for non-keyword filter changes
  useEffect(() => {
    onSearch()
  }, [tag, activeProjectId, dateRange])

  // Debounced search for keyword (avoids per-keystroke queries)
  useEffect(() => {
    const t = setTimeout(() => {
      onSearch()
    }, 300)
    return () => clearTimeout(t)
  }, [keyword])

  const handleToggleDrawer = () => {
    setDrawerOpen((prev) => !prev)
  }

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id)
    setTag("")
    onSearch(id)
    sendMessage({ kind: "set-recent-project", projectId: id }).catch(() => {})
  }

  const {
    newCardOpen,
    newCardContent,
    setNewCardContent,
    setNewCardOpen,
    handleNewCard,
    handleSaveNewCard
  } = useNewCard({ activeProjectId, onSearch })

  const onDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    await deleteItem(confirmDeleteId)
    setConfirmDeleteId(null)
    onSearch()
  }

  const loadMore = useCallback(() => {
    if (!hasMore) return
    const currentLength = displayedItems.length
    const nextItems = allItems.slice(0, currentLength + ITEMS_PER_PAGE)
    setDisplayedItems(nextItems)
    setHasMore(nextItems.length < allItems.length)
  }, [allItems, displayedItems.length, hasMore, ITEMS_PER_PAGE])

  // Keep a stable ref to the latest loadMore function so the observer
  // effect doesn't need to re-create the IntersectionObserver on every data change.
  const loadMoreRefCallback = useRef(loadMore)
  loadMoreRefCallback.current = loadMore

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreRefCallback.current()
        }
      },
      { threshold: 0.1 }
    )
    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore])

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return
    setConfirmBatchDelete(true)
  }

  const handleConfirmBatchDelete = async () => {
    await deleteItems(selectedIds)
    setSelectMode(false)
    setSelectedIds([])
    setConfirmBatchDelete(false)
    onSearch()
  }

  const refreshAllData = useCallback(async () => {
    await loadProjects()
    await onSearch()
    const all = await searchItems({})
    setAllItemsUnfiltered(all)
  }, [loadProjects, onSearch])

  const {
    backupFileInputRef,
    handleExportBackup,
    handleUploadSync,
    handleDownloadSync
  } = useBackupSync({
    projects,
    allItemsUnfiltered,
    backupSelectedIds,
    setBackupSelectedIds,
    syncStatus,
    setSyncStatus,
    refreshAllData,
    setSnackbarMsg
  })

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importFromZip(file, backupSelectedIds.length > 0 ? backupSelectedIds : undefined)
      const msg = `导入完成：成功 ${result.imported} 条`
      const skipMsg = result.skipped > 0 ? `，跳过 ${result.skipped} 条` : ""
      if (result.errors.length > 0) {
        console.warn("导入跳过/失败的条目：", result.errors)
      }
      setSnackbarMsg(msg + skipMsg)
      await refreshAllData()
    } catch (err) {
      setSnackbarMsg(`导入失败：${err}`)
    } finally {
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = ""
      }
    }
  }

  const headerHeight = 52

  // ---- Card selection ----
  const onToggleSelectMode = useCallback(() => {
    setSelectedIds([])
    setSelectMode((prev) => !prev)
  }, [])

  // Load LXGW WenKai font from CDN
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css"
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  // Subscribe to database changes via storage broadcast
  const refreshRef = useRef(refreshAllData)
  refreshRef.current = refreshAllData

  useEffect(() => {
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (changes._dbi || changes._dbp) {
        refreshRef.current()
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const otherProjects = useMemo(
    () => projects.filter((p) => p.id !== activeProjectId),
    [projects, activeProjectId]
  )

  const stats = useMemo(() => {
    const now = Date.now()
    const recent7 = allItems.filter((i) => i.createdAt > now - 7 * 86400000).length
    const sourceCounts = new Map<string, number>()
    for (const item of allItems) {
      const site = item.source?.site
      if (site) sourceCounts.set(site, (sourceCounts.get(site) ?? 0) + 1)
    }
    const topSites = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([site, count]) => ({ site, count }))
    return { totalItems: allItems.length, totalProjects: projects.length, recent7, topSites }
  }, [allItems, projects])

  const handleToggleRead = async (id: string) => {
    const item = allItems.find((i) => i.id === id)
    if (!item) return
    await updateItem({ ...item, read: !item.read })
    onSearch()
  }

  const handleToggleReadingFilter = () => {
    setReadingFilter((prev) => !prev)
  }

  const handleMoveCard = async (targetProjectId: string) => {
    if (!moveCardId) return
    const card = allItems.find((i) => i.id === moveCardId)
    if (card) {
      const hash = card.hash || (card.source ? await computeItemHash(card.content, card.source.url) : await computeItemHash(card.content, ""))
      if (await isDuplicate(hash, targetProjectId, card.source?.url)) {
        setSnackbarMsg("目标项目已存在相同内容，跳过移动")
        setMoveCardId(null)
        return
      }
      await updateItem({ ...card, projectId: targetProjectId, order: undefined })
    }
    setMoveCardId(null)
    onSearch()
  }

  const handleCopyCard = async (targetProjectId: string) => {
    if (!copyCardId) return
    const card = allItems.find((i) => i.id === copyCardId)
    if (card) {
      const newCard = {
        ...card,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        projectId: targetProjectId
      }
      const saved = await addItem(newCard)
      if (!saved) {
        setSnackbarMsg("目标项目已存在相同内容，跳过复制")
        setCopyCardId(null)
        onSearch()
        return
      }
    }
    setCopyCardId(null)
    onSearch()
  }

  const handleBatchMove = () => setBatchAction("move")
  const handleBatchCopy = () => setBatchAction("copy")

  const handleBatchMoveCopy = async (targetProjectId: string) => {
    let skipped = 0
    for (const id of selectedIds) {
      const card = allItems.find((i) => i.id === id)
      if (!card) continue
      if (batchAction === "move") {
        const hash = card.hash || (card.source ? await computeItemHash(card.content, card.source.url) : await computeItemHash(card.content, ""))
        if (await isDuplicate(hash, targetProjectId, card.source?.url)) {
          skipped++
          continue
        }
        await updateItem({ ...card, projectId: targetProjectId, order: undefined })
      } else {
        const newCard = {
          ...card,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          projectId: targetProjectId
        }
        const saved = await addItem(newCard)
        if (!saved) skipped++
      }
    }
    setBatchAction(null)
    setSelectMode(false)
    setSelectedIds([])
    if (skipped > 0) setSnackbarMsg(`跳过 ${skipped} 条重复内容`)
    onSearch()
  }

  const readingFilteredItems = allItems.filter(
    (i) => i.type === "link" && !i.read
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: #c0c0c0;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover { background: #a0a0a0; }
      `}</style>
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <SidebarFilters
          open={drawerOpen}
          width={drawerWidth}
          projects={projects}
          activeProjectId={activeProjectId}
          readingFilter={readingFilter}
          dueCount={dueCount}
          sidebarTab={sidebarTab}
          tags={projectTags}
          activeTag={tag}
          backupSelectedIds={backupSelectedIds}
          syncStatus={syncStatus}
          onTagSelect={setTag}
          onToggleReadingFilter={handleToggleReadingFilter}
          onClose={handleToggleDrawer}
          onOpenProject={handleOpenProject}
          onRenameProject={handleRenameProject}
          onUpdateNote={handleUpdateNote}
          onDeleteProject={handleDeleteProject}
          onWidthChange={(w) => setDrawerWidth(w)}
          onSetSidebarTab={setSidebarTab}
          onNewProjectClick={() => setCreateDialogOpen(true)}
          onCloseProject={() => {
            setActiveProjectId(null)
            setDialogItem(null)
            onSearch(null)
          }}
          onToggleBackup={(id) =>
            setBackupSelectedIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onToggleBackupAll={() =>
            setBackupSelectedIds((prev) =>
              prev.length === projects.length ? [] : projects.map((p) => p.id)
            )
          }
          onExportBackup={handleExportBackup}
          onImportBackup={() => backupFileInputRef.current?.click()}
          onUploadSync={handleUploadSync}
          onDownloadSync={handleDownloadSync}
          reviewStats={reviewStats}
          previewCount={previewCount}
          onPreview={handlePreview}
          recentDates={recentDates}
          reviewDateFilter={reviewDateFilter}
          onReviewDateClick={handleReviewDateClick}
        />

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: "100vh",
            borderLeft: "2px solid",
            borderColor: "primary.main"
          }}>
          <Box sx={{ flexShrink: 0 }}>
          <style>{`
            @keyframes emptyFloat {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
            .empty-icon {
              opacity: 0.12;
              animation: emptyFloat 4s ease-in-out infinite;
            }
          `}</style>
          <AppHeader
              drawerOpen={drawerOpen}
              headerHeight={headerHeight}
              onToggleDrawer={handleToggleDrawer}
              onSettingsClick={() => setSettingsOpen(true)}
              reviewProgress={sidebarTab === "review" ? reviewProgress : undefined}
              activeProjectName={activeProject?.name}>
              {sidebarTab === "review" ? (
                <Tooltip title="退出复习">
                  <IconButton
                    size="small"
                    onClick={handleExitReview}
                    sx={{ color: "text.secondary", "&:hover": { color: "error.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
                    <CloseRoundedIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              ) : activeProject && (
                <>
                  <Tooltip title="新建卡片">
                    <IconButton
                      size="small"
                      onClick={handleNewCard}
                      sx={{ color: "text.secondary", "&:hover": { color: "primary.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
                      <AddRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={selectMode ? "取消选择" : "选择卡片"}>
                    <IconButton
                      size="small"
                      onClick={onToggleSelectMode}
                      sx={{ color: selectMode ? "error.main" : "text.secondary", "&:hover": { color: "error.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
                      <DoneAllRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                  <DateRangeFilter value={dateRange} onChange={setDateRange} />
                </>
              )}
            </AppHeader>

            <FilterChips
              keyword={keyword}
              onKeywordChange={setKeyword}
            />
          </Box>

          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0, bgcolor: (t: any) => t.palette.mode === "light" ? "#fcf9f3" : undefined }}>
          <Container sx={{ py: 4 }} maxWidth="xl">

            {selectMode && (
              <BatchToolbar
                selectedIds={selectedIds}
                onSelectAll={() =>
                  setSelectedIds(displayedItems.map((i) => i.id))
                }
                onBatchDelete={handleBatchDelete}
                onBatchMove={handleBatchMove}
                onBatchCopy={handleBatchCopy}
              />
            )}

            <Fade in key={sidebarTab} timeout={250}>
              <Box>
                {sidebarTab === "review" && reviewDateFilter ? (
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        回顾：{recentDates.find((d) => d.key === reviewDateFilter)?.label ?? reviewDateFilter}
                      </Typography>
                      <Button size="small" onClick={() => setReviewDateFilter(null)} sx={{ borderRadius: 1 }}>
                        退出
                      </Button>
                    </Stack>
                    <CardGrid
                      items={reviewDateItems}
                      selectMode={false}
                      selectedIds={selectedIds}
                      readOnly
                      onSelectItem={() => {}}
                      onDeleteItem={() => {}}
                      onOpenDialog={setDialogItem}
                      onToggleRead={handleToggleRead}
                      onMoveToProject={setMoveCardId}
                      onCopyToProject={setCopyCardId}
                      firstRating={cardFirstRating}
                    />
                  </Box>
                ) : sidebarTab === "review" && previewCount > 0 ? (
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        🔍 预习 — 接下来 {previewCount} 张卡片
                      </Typography>
                      <Button size="small" onClick={() => { setPreviewCount(0); setPreviewItems([]) }} sx={{ borderRadius: 1 }}>
                        退出
                      </Button>
                    </Stack>
                    <CardGrid
                      items={previewItems}
                      selectMode={false}
                      selectedIds={selectedIds}
                      readOnly
                      onSelectItem={() => {}}
                      onDeleteItem={() => {}}
                      onOpenDialog={setDialogItem}
                      onToggleRead={handleToggleRead}
                      onMoveToProject={setMoveCardId}
                      onCopyToProject={setCopyCardId}
                    />
                  </Box>
                ) : sidebarTab === "review" ? (
                  <ReviewSession
                    items={reviewItems}
                    masteredCount={reviewItems.filter(
                  (i) => (i.srs?.reviewCount ?? 0) >= 3 && (i.srs?.easeFactor ?? 0) >= 2.5
                ).length}
                onSave={async (item) => {
                  await updateItem(item)
                }}
                onExit={handleExitReview}
                onProgress={(c, t) => setReviewProgress({ current: c, total: t })}
              />
            ) : (
              <>
            {!readingFilter && !activeProject && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 12,
                  color: "text.secondary",
                  userSelect: "none"
                }}>
                <InboxRoundedIcon
                  className="empty-icon"
                  sx={{ fontSize: 96, mb: 3 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 400, mb: 1 }}>
                  选择一个项目
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  从左侧项目面板新建或打开项目，开始整理你的灵感卡片
                </Typography>
              </Box>
            )}

            {!readingFilter && !activeProject && stats.totalItems > 0 && (
              <Box
                sx={{
                  mx: "auto",
                  maxWidth: 500,
                  textAlign: "center",
                  mb: 6
                }}>
                <Stack
                  direction="row"
                  spacing={3}
                  justifyContent="center"
                  sx={{ mb: 2.5 }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {stats.totalItems}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      收藏总数
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {stats.totalProjects}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      项目数
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {stats.recent7}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      本周新增
                    </Typography>
                  </Box>
                </Stack>
                {stats.topSites.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.disabled",
                        display: "block",
                        mb: 1,
                        fontSize: "0.7rem"
                      }}>
                      来源网站 Top5
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                      {stats.topSites.map((s) => (
                        <Chip
                          key={s.site}
                          label={`${s.site} (${s.count})`}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1.5, fontSize: "0.7rem" }}
                        />
                      ))}
                    </Stack>
                  </>
                )}
               </Box>
             )}

            {!readingFilter && !activeProject && reviewStats.totalReviews > 0 && (
              <Box
                sx={{
                  mx: "auto",
                  maxWidth: 500,
                  textAlign: "center",
                  mb: 6
                }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "text.secondary", mb: 2, fontSize: "0.85rem" }}>
                  复习统计
                </Typography>
                <Stack
                  direction="row"
                  spacing={3}
                  justifyContent="center"
                  sx={{ mb: 2.5 }}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "success.main" }}>
                      {reviewStats.streakDays}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      连续打卡
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {reviewStats.totalReviews}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      累计复习
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {Math.round(reviewStats.accuracyRate * 100)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      熟悉率
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}

            {readingFilter ? (
              readingFilteredItems.length === 0 ? (
                <EmptyState
                  icon={<SearchOffRoundedIcon className="empty-icon" sx={{ fontSize: 80, mb: 3 }} />}
                  title="阅读清单已清空"
                  subtitle="所有链接都已标记为已读"
                />
              ) : (
                <CardGrid
                  items={readingFilteredItems}
                  selectMode={selectMode}
                  selectedIds={selectedIds}
                  onSelectItem={(id) =>
                    setSelectedIds((prev) =>
                      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                    )
                  }
                   onDeleteItem={onDelete}
                   onOpenDialog={setDialogItem}
                   onToggleRead={handleToggleRead}
                  onMoveToProject={setMoveCardId}
                  onCopyToProject={setCopyCardId}
                />
              )
            ) : null}

            {!readingFilter && activeProject && (
              <CardGrid
                items={displayedItems}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onSelectItem={(id) =>
                  setSelectedIds((prev) =>
                    prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                  )
                }
                onDeleteItem={onDelete}
                onOpenDialog={setDialogItem}
                onToggleRead={handleToggleRead}
                onMoveToProject={setMoveCardId}
                onCopyToProject={setCopyCardId}
              />
            )}

            {!readingFilter && activeProject && !hasMore && allItems.length === 0 && (
              keyword ? (
                <EmptyState
                  icon={<SearchOffRoundedIcon className="empty-icon" sx={{ fontSize: 80, mb: 3 }} />}
                  title="没有找到匹配的卡片"
                  subtitle="试试其他关键词"
                />
              ) : dateRange ? (
                <EmptyState
                  icon={<SearchOffRoundedIcon className="empty-icon" sx={{ fontSize: 80, mb: 3 }} />}
                  title="该时间段内无相关卡片"
                  subtitle="请调整日期范围"
                />
              ) : (
                <EmptyState
                  icon={<NoteAddRoundedIcon className="empty-icon" sx={{ fontSize: 80, mb: 3 }} />}
                  title="此项目暂无卡片"
                  subtitle="点击顶部 ＋ 按钮新建一张卡片"
                />
              )
            )}

            {hasMore && activeProject && !readingFilter && (
              <Box ref={loadMoreRef} sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            )}
              </>
            )}
              </Box>
            </Fade>

            <ItemDialog
              item={dialogItem}
              open={Boolean(dialogItem)}
              readOnly={sidebarTab === "review"}
              onClose={() => setDialogItem(null)}
              onNavigate={handleNavigate}
              onSave={async (updated) => {
                await updateItem(updated)
                setDialogItem(null)
                onSearch()
              }}
            />

            <NewCardDialog
              open={newCardOpen}
              content={newCardContent}
              onContentChange={setNewCardContent}
              onClose={() => setNewCardOpen(false)}
              onSave={handleSaveNewCard}
            />

            <DeleteConfirmDialog
              open={Boolean(confirmDeleteId) || confirmBatchDelete}
              batch={confirmBatchDelete}
              count={selectedIds.length}
              onCancel={() => {
                setConfirmDeleteId(null)
                setConfirmBatchDelete(false)
              }}
              onConfirm={confirmBatchDelete ? handleConfirmBatchDelete : handleConfirmDelete}
            />

            <NewProjectDialog
              open={createDialogOpen}
              name={newProjectName}
              error={projectError}
              onNameChange={(v) => { setNewProjectName(v); setProjectError(null) }}
              onClose={() => { setCreateDialogOpen(false); setProjectError(null) }}
              onCreate={() => { handleCreateProject(); setCreateDialogOpen(false) }}
            />

            <SettingsDialog
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              preset={preset}
              onPresetChange={(name) => setPreset(name)}
            />

            <Snackbar
              open={Boolean(snackbarMsg)}
              autoHideDuration={2000}
              onClose={() => setSnackbarMsg("")}
              message={snackbarMsg}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
            />

            <MoveCopyCards
              open={Boolean(moveCardId)}
              title="移动到…"
              projects={otherProjects}
              onSelect={handleMoveCard}
              onClose={() => setMoveCardId(null)}
            />

            <MoveCopyCards
              open={Boolean(copyCardId)}
              title="复制到…"
              projects={otherProjects}
              onSelect={handleCopyCard}
              onClose={() => setCopyCardId(null)}
            />

            <MoveCopyCards
              open={Boolean(batchAction)}
              title={batchAction === "move" ? "批量移动到…" : "批量复制到…"}
              projects={otherProjects}
              onSelect={handleBatchMoveCopy}
              onClose={() => setBatchAction(null)}
            />
            <input
              ref={backupFileInputRef}
              type="file"
              hidden
              accept=".zip"
              onChange={handleImportBackupFile}
            />
          </Container>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
