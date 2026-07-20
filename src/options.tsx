import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import InboxRoundedIcon from "@mui/icons-material/InboxRounded"
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded"
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded"
import {
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material"
import { ThemeProvider } from "@mui/material/styles"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import AppHeader from "./components/AppHeader"
import BatchToolbar from "./components/BatchToolbar"
import CardGrid from "./components/GroupSection"
import ColorPalette from "./components/ColorPalette"
import FilterChips from "./components/FilterChips"
import ItemDialog from "./components/ItemDialog"
import ReviewSession from "./components/ReviewSession"
import SettingsDialog from "./components/SettingsDialog"
import SidebarFilters from "./components/SidebarFilters"
import { useNewCard } from "./hooks/useNewCard"
import { useProjects } from "./hooks/useProjects"
import { getDueItems } from "./hooks/useSrs"
import {
  deleteItem,
  searchItems,
  updateItem
} from "./database"
import { toJsonZip } from "./export"
import { importFromZip } from "./import"
import { createAppTheme } from "./theme"
import type { Item, ItemType, PresetName, Project, SearchQuery } from "./types"
import { prettyUrl } from "./utils"

const MIN_DRAWER_WIDTH = 200
const MAX_DRAWER_WIDTH = 500

export default function OptionsPage() {
  const [allItems, setAllItems] = useState<Item[]>([])
  const [displayedItems, setDisplayedItems] = useState<Item[]>([])
  const [keyword, setKeyword] = useState("")
  const [type, setType] = useState<string>("")
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
  const [preset, setPreset] = useState<PresetName>("classic")
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewItems, setReviewItems] = useState<Item[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [allItemCounts, setAllItemCounts] = useState<Record<string, number>>({})
  const [readingFilter, setReadingFilter] = useState(false)
  const [showRandomReview, setShowRandomReview] = useState(true)
  const [refreshRandom, setRefreshRandom] = useState(0)
  const [allItemCountsRefresh, setAllItemCountsRefresh] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const ITEMS_PER_PAGE = 20

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)")

  const theme = useMemo(
    () => createAppTheme(prefersDarkMode ? "dark" : "light", preset),
    [prefersDarkMode, preset]
  )

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
      const pid = projectId ?? activeProjectId
      const q: SearchQuery = {
        keyword,
        type: type ? (type as ItemType) : undefined,
        projectId: pid ?? undefined
      }
      const list = await searchItems(q)
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.createdAt - a.createdAt)
      setAllItems(list)
      setDisplayedItems(list.slice(0, ITEMS_PER_PAGE))
      setHasMore(list.length > ITEMS_PER_PAGE)
    },
    [keyword, type, activeProjectId, ITEMS_PER_PAGE]
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
      onSearch(null)
    }
  })

  useEffect(() => {
    onSearch()
  }, [onSearch])

  useEffect(() => {
    const t = setTimeout(() => {
      onSearch()
    }, 300)
    return () => clearTimeout(t)
  }, [keyword, type])

  useEffect(() => {
    searchItems({}).then((items) => {
      const m: Record<string, number> = {}
      for (const item of items) {
        if (item.projectId) m[item.projectId] = (m[item.projectId] ?? 0) + 1
      }
      setAllItemCounts(m)
    })
  }, [allItemCountsRefresh])

  const handleToggleDrawer = () => {
    setDrawerOpen((prev) => !prev)
  }

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id)
    onSearch(id)
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
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
  }, [loadMore, hasMore])

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return
    setConfirmBatchDelete(true)
  }

  const handleConfirmBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteItem(id)
    }
    setSelectMode(false)
    setSelectedIds([])
    setConfirmBatchDelete(false)
    onSearch()
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const refreshAllData = useCallback(async () => {
    await loadProjects()
    await onSearch()
    setAllItemCountsRefresh((k) => k + 1)
  }, [loadProjects, onSearch])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importFromZip(file)
      const msg = `导入完成：成功 ${result.imported} 条`
      const skipMsg = result.skipped > 0 ? `，跳过 ${result.skipped} 条` : ""
      if (result.errors.length > 0) {
        console.warn("导入跳过/失败的条目：", result.errors)
      }
      alert(msg + skipMsg)
      await refreshAllData()
    } catch (err) {
      alert(`导入失败：${err}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const headerHeight = 52

  const handleRemoveFilter = (kind: "keyword" | "type") => {
    if (kind === "keyword") setKeyword("")
    else setType("")
  }

  // ---- Card swap within project (checkbox mode) ----
  const [swapMode, setSwapMode] = useState(false)

  const swapItems = useCallback(
    async (idA: string, idB: string) => {
      if (idA === idB) return
      const ordered = [...allItems]
      const idxA = ordered.findIndex((i) => i.id === idA)
      const idxB = ordered.findIndex((i) => i.id === idB)
      if (idxA === -1 || idxB === -1) return
      // Swap positions in the array, then reassign order sequentially
      const next = [...ordered]
      const [a] = next.splice(idxA, 1)
      const [b] = next.splice(idxB, 1)
      next.splice(idxA, 0, b)
      next.splice(idxB, 0, a)
      const updated = next.map((it, idx) => ({ ...it, order: idx }))
      setAllItems(updated)
      setDisplayedItems(updated.slice(0, ITEMS_PER_PAGE))
      for (const it of updated) {
        await updateItem(it)
      }
    },
    [allItems, ITEMS_PER_PAGE]
  )

  const handleSwap = useCallback(() => {
    if (selectedIds.length !== 2) {
      window.alert("请选择恰好两张卡片进行交换")
      return
    }
    const [a, b] = selectedIds
    void swapItems(a, b).then(() => {
      setSelectedIds([])
      setSwapMode(false)
    })
  }, [selectedIds, swapItems])

  const dueCount = useMemo(() => {
    const due = getDueItems(allItems)
    return due.length
  }, [allItems])

  const handleStartReview = useCallback(() => {
    const due = getDueItems(allItems)
    setReviewItems(due)
    setReviewMode(true)
  }, [allItems])

  const handleExitReview = useCallback(() => {
    setReviewMode(false)
    setReviewItems([])
    onSearch()
  }, [onSearch])

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

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

  const randomItem = useMemo(() => {
    if (!activeProject || allItems.length === 0) return null
    return allItems[Math.floor(Math.random() * allItems.length)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, allItems, refreshRandom])

  const handleToggleRead = async (id: string) => {
    const item = allItems.find((i) => i.id === id)
    if (!item) return
    await updateItem({ ...item, read: !item.read })
    onSearch()
  }

  const handleToggleReadingFilter = () => {
    setReadingFilter((prev) => !prev)
  }

  const readingFilteredItems = allItems.filter(
    (i) => (i.type === "link" || i.type === "snapshot") && !i.read
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
          newProjectName={newProjectName}
          projectError={projectError}
          itemCounts={allItemCounts}
          readingFilter={readingFilter}
          dueCount={dueCount}
          reviewMode={reviewMode}
          onToggleReadingFilter={handleToggleReadingFilter}
          onClose={handleToggleDrawer}
          onNewProjectNameChange={(v) => {
            setNewProjectName(v)
            setProjectError(null)
          }}
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
          onRenameProject={handleRenameProject}
          onUpdateNote={handleUpdateNote}
          onDeleteProject={handleDeleteProject}
          onWidthChange={(w) => setDrawerWidth(w)}
          onStartReview={handleStartReview}
          onExitReview={handleExitReview}
        />

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            borderLeft: "2px solid",
            borderColor: "primary.main"
          }}>
          <Container sx={{ py: 4 }} maxWidth="xl">
            <AppHeader
              drawerOpen={drawerOpen}
              selectMode={selectMode}
              swapMode={swapMode}
              reviewMode={reviewMode}
              importing={importing}
              headerHeight={headerHeight}
              hasActiveProject={Boolean(activeProjectId)}
              onToggleDrawer={handleToggleDrawer}
              onPaletteClick={(e) => setPaletteAnchor(e.currentTarget)}
              fileInputRef={fileInputRef}
              onImport={handleImport}
              onToggleSelectMode={() => {
                if (selectMode) setSelectedIds([])
                setSelectMode((prev) => !prev)
              }}
              onToggleSwapMode={() => {
                setSelectedIds([])
                setSwapMode((prev) => !prev)
              }}
              onNewCard={handleNewCard}
              activeProject={activeProject}
              onClearProject={() => {
                setActiveProjectId(null)
                onSearch(null)
              }}
              onSettingsClick={() => setSettingsOpen(true)}
            />

            <FilterChips
              keyword={keyword}
              type={type}
              headerHeight={headerHeight}
              onClearKeyword={() => handleRemoveFilter("keyword")}
              onClearType={() => handleRemoveFilter("type")}
            />

            {(selectMode || swapMode) && (
              <BatchToolbar
                selectedIds={selectedIds}
                swapMode={swapMode}
                onSelectAll={() =>
                  setSelectedIds(displayedItems.map((i) => i.id))
                }
                onExportJson={async () => {
                  const items = allItems.filter(
                    (i) =>
                      selectedIds.includes(i.id) &&
                      (!activeProjectId || i.projectId === activeProjectId)
                  )
                  const blob = await toJsonZip(items, projects)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "lime-export.json.zip"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                onBatchDelete={handleBatchDelete}
                onSwap={handleSwap}
              />
            )}

            {reviewMode ? (
              <ReviewSession
                items={reviewItems}
                onSave={async (item) => {
                  await updateItem(item)
                }}
                onExit={handleExitReview}
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
                  sx={{ fontSize: 96, opacity: 0.12, mb: 3 }}
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
                    sx={{ fontSize: 80, opacity: 0.12, mb: 3 }}
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
                  swapMode={swapMode}
                  onToggleRead={handleToggleRead}
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
                    {randomItem.content.length > 200
                      ? randomItem.content.slice(0, 200) + "…"
                      : randomItem.content}
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                  <Button size="small" onClick={() => setShowRandomReview(false)}>
                    关闭
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setRefreshRandom((prev) => prev + 1)}>
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
                swapMode={swapMode}
                onToggleRead={handleToggleRead}
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
                {keyword || type ? (
                  <>
                    <SearchOffRoundedIcon
                      sx={{ fontSize: 80, opacity: 0.12, mb: 3 }}
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
                      sx={{ fontSize: 80, opacity: 0.12, mb: 3 }}
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

            <Dialog
              open={newCardOpen}
              onClose={() => setNewCardOpen(false)}
              maxWidth="sm"
              fullWidth
              slotProps={{
                paper: { sx: { borderRadius: 3 } }
              }}>
              <DialogTitle sx={{ py: 2.5, px: 3, fontSize: "1rem" }}>
                新建卡片
              </DialogTitle>
              <DialogContent sx={{ px: 3, py: 1 }}>
                <TextField
                  autoFocus
                  multiline
                  minRows={4}
                  fullWidth
                  placeholder="输入卡片内容…"
                  value={newCardContent}
                  onChange={(e) => setNewCardContent(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      fontSize: "1rem"
                    }
                  }}
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setNewCardOpen(false)}>取消</Button>
                <Button
                  variant="contained"
                  disabled={!newCardContent.trim()}
                  onClick={handleSaveNewCard}>
                  保存
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={Boolean(confirmDeleteId) || confirmBatchDelete}
              onClose={() => {
                setConfirmDeleteId(null)
                setConfirmBatchDelete(false)
              }}
              slotProps={{
                paper: { sx: { borderRadius: 3 } }
              }}>
              <DialogTitle sx={{ pb: 1 }}>
                {confirmBatchDelete ? "批量删除" : "确认删除"}
              </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {confirmBatchDelete
                    ? `确定要删除选中的 ${selectedIds.length} 条收藏吗？此操作不可撤销。`
                    : "确定要删除这条收藏吗？此操作不可撤销。"}
                </DialogContentText>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={() => {
                    setConfirmDeleteId(null)
                    setConfirmBatchDelete(false)
                  }}
                  sx={{ borderRadius: 1 }}>
                  取消
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmBatchDelete ? handleConfirmBatchDelete : handleConfirmDelete}
                  sx={{ borderRadius: 1 }}>
                  删除
                </Button>
              </DialogActions>
            </Dialog>

            <ColorPalette
              open={Boolean(paletteAnchor)}
              anchorEl={paletteAnchor}
              preset={preset}
              onClose={() => setPaletteAnchor(null)}
              onChange={(name) => setPreset(name)}
            />

            <SettingsDialog
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              onDataChange={() => refreshAllData()}
            />
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
