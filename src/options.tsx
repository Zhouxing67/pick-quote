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
import DeleteConfirmDialog from "./components/DeleteConfirmDialog"
import FilterChips from "./components/FilterChips"
import ItemDialog from "./components/ItemDialog"
import MoveCopyCards from "./components/MoveCopyCards"
import NewCardDialog from "./components/NewCardDialog"
import NewProjectDialog from "./components/NewProjectDialog"
import ReviewSession from "./components/ReviewSession"
import SettingsDialog from "./components/SettingsDialog"
import SidebarFilters from "./components/SidebarFilters"
import { useNewCard } from "./hooks/useNewCard"
import { useProjects } from "./hooks/useProjects"
import { getDueItems, getReviewStats } from "./hooks/useSrs"
import {
  addItem,
  addProject,
  clearAllItems,
  clearAllProjects,
  deleteItem,
  deleteItems,
  isDuplicate,
  searchItems,
  updateItem
} from "./database"
import { toJsonZip } from "./export"
import { importFromZip } from "./import"
import { downloadRemote, runSync } from "./utils/sync"
import { createAppTheme } from "./theme"
import type { Item, PresetName, SearchQuery } from "./types"
import type { SyncCredentials } from "./utils/sync"
import { computeItemHash, truncateText } from "./utils"

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
  const [reviewProgress, setReviewProgress] = useState({ current: 0, total: 0 })
  const [allItemsUnfiltered, setAllItemsUnfiltered] = useState<Item[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [readingFilter, setReadingFilter] = useState(false)
  const [showRandomReview, setShowRandomReview] = useState(true)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [moveCardId, setMoveCardId] = useState<string | null>(null)
  const [copyCardId, setCopyCardId] = useState<string | null>(null)
  const [batchAction, setBatchAction] = useState<"move" | "copy" | null>(null)
  const [snackbarMsg, setSnackbarMsg] = useState("")
  const [backupSelectedIds, setBackupSelectedIds] = useState<string[]>([])
  const [syncStatus, setSyncStatus] = useState("")
  const backupFileInputRef = useRef<HTMLInputElement>(null)

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
        projectId: pid ?? undefined
      }
      const list = await searchItems(q)
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.createdAt - a.createdAt)
      setAllItems(list)
      setDisplayedItems(list.slice(0, ITEMS_PER_PAGE))
      setHasMore(list.length > ITEMS_PER_PAGE)
    },
    [keyword, tag, activeProjectId, ITEMS_PER_PAGE]
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
    },
    onDeactivate: () => {
      setActiveProjectId(null)
      setDialogItem(null)
      onSearch(null)
    }
  })

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
  }, [tag, activeProjectId])

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
    chrome.runtime.sendMessage({ kind: "set-recent-project", projectId: id })
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

  const handleClearKeyword = () => setKeyword("")

  // ---- Card selection ----
  const onToggleSelectMode = useCallback(() => {
    setSelectedIds([])
    setSelectMode((prev) => !prev)
  }, [])

  const dueCount = useMemo(() => {
    const due = getDueItems(allItemsUnfiltered)
    return due.length
  }, [allItemsUnfiltered])

  useEffect(() => {
    chrome.action.setBadgeText({ text: dueCount > 0 ? String(dueCount) : "" })
    chrome.action.setBadgeBackgroundColor({ color: "#dc2626" })
  }, [dueCount])

  // Load LXGW WenKai font from CDN
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.1.0/style.css"
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  const handleStartReview = useCallback(async () => {
    const all = await searchItems({})
    const due = getDueItems(all)
    setReviewItems(due)
    setSidebarTab("review")
  }, [])

  // Initialize review session when entering review mode
  useEffect(() => {
    if (sidebarTab === "review") handleStartReview()
  }, [sidebarTab])

  const handleExitReview = useCallback(() => {
    setReviewItems([])
    setSidebarTab("projects")
    onSearch()
  }, [onSearch])

  const getSyncCredentials = async (): Promise<SyncCredentials | null> => {
    const data = await chrome.storage.sync.get(["syncUsername", "syncPassword"])
    const u = data.syncUsername as string | undefined
    const p = data.syncPassword as string | undefined
    return u && p ? { username: u, appPassword: p } : null
  }

  const handleExportBackup = async () => {
    const items = allItemsUnfiltered.filter(
      (i) => i.projectId && backupSelectedIds.includes(i.projectId)
    )
    const selectedProjects = projects.filter((p) => backupSelectedIds.includes(p.id))
    const blob = await toJsonZip(items, selectedProjects)
    const url = URL.createObjectURL(blob)
    await chrome.downloads.download({ url, filename: "lime-backup.zip" })
    URL.revokeObjectURL(url)
  }

  const handleUploadSync = async () => {
    setSyncStatus("正在上传…")
    try {
      const cred = await getSyncCredentials()
      if (!cred) { setSyncStatus("请先在设置中配置坚果云"); return }
      const result = await runSync(cred, allItemsUnfiltered, projects)
      if (result.success) chrome.storage.local.set({ lastSyncTime: Date.now() })
      setSyncStatus(result.message)
    } catch (e) {
      setSnackbarMsg(`同步失败：${e}`)
      setSyncStatus("同步失败")
    }
  }

  const handleDownloadSync = async () => {
    setSyncStatus("正在下载…")
    try {
      const cred = await getSyncCredentials()
      if (!cred) { setSyncStatus("请先在设置中配置坚果云"); return }
      const remote = await downloadRemote(cred, allItemsUnfiltered, projects)
      if (!remote.success) {
        setSyncStatus(remote.message || "下载失败")
        return
      }
      if (remote.direction === "noop") {
        setSyncStatus("云端无变化")
        return
      }
      if (remote.payload) {
        await clearAllItems()
        await clearAllProjects()
        for (const p of remote.payload.projects) {
          await addProject(p)
        }
        for (const item of remote.payload.items) {
          await addItem(item)
        }
        chrome.storage.local.set({ lastSyncTime: Date.now() })
        setSyncStatus("下载完成")
        await refreshAllData()
      }
    } catch (e) {
      setSnackbarMsg(`下载失败：${e}`)
      setSyncStatus("下载失败")
    }
  }

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

  const reviewStats = useMemo(() => getReviewStats(allItemsUnfiltered), [allItemsUnfiltered])

  const [randomItem, setRandomItem] = useState<Item | null>(null)

  const refreshRandomItem = useCallback(() => {
    if (!activeProject || allItems.length === 0) {
      setRandomItem(null)
      return
    }
    setRandomItem(allItems[Math.floor(Math.random() * allItems.length)])
  }, [activeProject, allItems])

  // Refresh random item when project changes
  useEffect(() => {
    refreshRandomItem()
  }, [refreshRandomItem])

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
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
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
        />

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            borderLeft: "2px solid",
            borderColor: "primary.main"
          }}>
          <Container sx={{ py: 4 }} maxWidth="xl">
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
                </>
              )}
            </AppHeader>

            <FilterChips
              keyword={keyword}
              headerHeight={headerHeight}
              onClearKeyword={handleClearKeyword}
            />

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
                {sidebarTab === "review" ? (
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
                {reviewStats.dailyActivity.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 0.5,
                      height: 80,
                      justifyContent: "center",
                      mb: 0.5
                    }}>
                    {reviewStats.dailyActivity.slice(-14).map((d) => {
                      const maxCount = Math.max(
                        ...reviewStats.dailyActivity.slice(-14).map((x) => x.count),
                        1
                      )
                      const h = Math.max(6, (d.count / maxCount) * 68)
                      return (
                        <Tooltip
                          key={d.date}
                          title={`${d.date.slice(5)}: ${d.count} 次`}>
                          <Box
                            sx={{
                              width: 12,
                              height: h,
                              borderRadius: "6px 6px 2px 2px",
                              background: (theme) =>
                                `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                              opacity: 0.85,
                              transition: "all 0.2s",
                              "&:hover": { opacity: 1, transform: "scaleY(1.05)" }
                            }}
                          />
                        </Tooltip>
                      )
                    })}
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem" }}>
                  近 14 天复习量
                </Typography>
              </Box>
            )}

            {readingFilter ? (
              readingFilteredItems.length === 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 10,
                    color: "text.secondary",
                    userSelect: "none"
                  }}>
                  <SearchOffRoundedIcon
                    className="empty-icon"
                    sx={{ fontSize: 80, mb: 3 }}
                  />
                  <Typography variant="body1" sx={{ opacity: 0.7 }}>
                    阅读清单已清空
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.5, mt: 0.5 }}>
                    所有链接都已标记为已读
                  </Typography>
                </Box>
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
            ) : activeProject && randomItem && showRandomReview ? (
              <Box
                sx={{
                  mb: 2,
                  p: 2.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper"
                }}>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: "1rem",
                      lineHeight: 1.7,
                      color: "text.primary",
                      fontStyle: "italic"
                    }}>
                    <Box
                      component="span"
                      sx={{ fontSize: "1.5rem", color: "text.disabled", mr: 0.5 }}>
                      "
                    </Box>
                    {truncateText(randomItem.content, 200)}
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                  <Button size="small" onClick={() => setShowRandomReview(false)}>
                    关闭
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={refreshRandomItem}>
                    下一条
                  </Button>
                </Stack>
              </Box>
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
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 10,
                  color: "text.secondary",
                  userSelect: "none"
                }}>
                {keyword ? (
                  <>
                    <SearchOffRoundedIcon
                      className="empty-icon"
                      sx={{ fontSize: 80, mb: 3 }}
                    />
                    <Typography variant="body1" sx={{ opacity: 0.7 }}>
                      没有找到匹配的卡片
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.5, mt: 0.5 }}>
                      试试其他关键词
                    </Typography>
                  </>
                ) : (
                  <>
                    <NoteAddRoundedIcon
                      className="empty-icon"
                      sx={{ fontSize: 80, mb: 3 }}
                    />
                    <Typography variant="body1" sx={{ opacity: 0.7 }}>
                      此项目暂无卡片
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.5, mt: 0.5 }}>
                      点击顶部 ＋ 按钮新建一张卡片
                    </Typography>
                  </>
                )}
              </Box>
            )}

            {hasMore && activeProject && !readingFilter && (
              <Box ref={loadMoreRef} sx={{ py: 2 }}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      borderRadius: 2.5,
                      height: 120,
                      mb: 1.5,
                      bgcolor: "action.hover",
                      animation: "skeletonPulse 1.4s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))}
              </Box>
            )}
              </>
            )}
              </Box>
            </Fade>

            <ItemDialog
              item={dialogItem}
              open={Boolean(dialogItem)}
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
    </ThemeProvider>
  )
}
