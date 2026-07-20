import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import {
  Box,
  Button,
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
import SidebarFilters from "./components/SidebarFilters"
import { useProjects } from "./hooks/useProjects"
import {
  deleteItem,
  searchItems,
  updateItem
} from "./database"
import { toZip, toJsonZip } from "./export"
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
  const [hasMore, setHasMore] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerWidth, setDrawerWidth] = useState(280)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)
  const [preset, setPreset] = useState<PresetName>("classic")
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
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

  const handleToggleDrawer = () => {
    setDrawerOpen((prev) => !prev)
  }

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id)
    onSearch(id)
  }

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
      await loadProjects()
      onSearch()
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

  const clearAllFilters = () => {
    setKeyword("")
    setType("")
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

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <SidebarFilters
          open={drawerOpen}
          width={drawerWidth}
          projects={projects}
          activeProjectId={activeProjectId}
          newProjectName={newProjectName}
          projectError={projectError}
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
              importing={importing}
              headerHeight={headerHeight}
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
            />

            <FilterChips
              keyword={keyword}
              type={type}
              activeProject={activeProject}
              headerHeight={headerHeight}
              onClearKeyword={() => handleRemoveFilter("keyword")}
              onClearType={() => handleRemoveFilter("type")}
              onClearProject={() => {
                setActiveProjectId(null)
                onSearch(null)
              }}
              onClearAll={clearAllFilters}
            />

            {(selectMode || swapMode) && (
              <BatchToolbar
                selectedIds={selectedIds}
                swapMode={swapMode}
                onSelectAll={() =>
                  setSelectedIds(displayedItems.map((i) => i.id))
                }
                onExportMd={async () => {
                  const items = allItems.filter((i) => selectedIds.includes(i.id))
                  const blob = await toZip(items, projects)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "pickquote-export.zip"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                onExportJson={async () => {
                  const items = allItems.filter((i) => selectedIds.includes(i.id))
                  const blob = await toJsonZip(items, projects)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "pickquote-export.json.zip"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                onBatchDelete={handleBatchDelete}
                onSwap={handleSwap}
              />
            )}

            {!activeProject && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 12,
                  color: "text.secondary"
                }}>
                <Typography variant="h6" sx={{ fontWeight: 400, mb: 1 }}>
                  请选择一个项目
                </Typography>
                <Typography variant="body2">
                  从左侧项目面板新建或打开项目，开始整理你的灵感卡片
                </Typography>
              </Box>
            )}

            {activeProject && (
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
              />
            )}

            {hasMore && activeProject && (
              <Box
                ref={loadMoreRef}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 4
                }}>
                <Typography variant="body2" color="text.secondary">
                  加载中...
                </Typography>
              </Box>
            )}

            <ItemDialog
              item={dialogItem}
              open={Boolean(dialogItem)}
              onClose={() => setDialogItem(null)}
              onSave={async (updated) => {
                await updateItem(updated)
                setDialogItem(null)
                onSearch()
              }}
            />

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
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
