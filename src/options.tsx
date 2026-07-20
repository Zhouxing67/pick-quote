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
import Footer from "./components/Footer"
import ItemDialog from "./components/ItemDialog"
import SidebarFilters from "./components/SidebarFilters"
import {
  addProject,
  deleteItem,
  getProjectByName,
  listProjects,
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
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [projectError, setProjectError] = useState<string | null>(null)
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

  const loadProjects = useCallback(async () => {
    const list = await listProjects()
    setProjects(list)
    return list
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

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

  const handleCreateProject = async () => {
    const name = newProjectName.trim()
    if (!name) {
      setProjectError("项目名不能为空")
      return
    }
    const existing = await getProjectByName(name)
    if (existing) {
      setProjectError("项目名已存在，请换一个")
      return
    }
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    }
    await addProject(project)
    await loadProjects()
    setNewProjectName("")
    setProjectError(null)
    setActiveProjectId(project.id)
    onSearch(project.id)
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

  // ---- Card drag reordering within project ----
  const [dragId, setDragId] = useState<string | null>(null)

  const reorderItems = useCallback(
    async (fromId: string, toId: string) => {
      if (fromId === toId) return
      const ordered = [...allItems]
      const fromIdx = ordered.findIndex((i) => i.id === fromId)
      const toIdx = ordered.findIndex((i) => i.id === toId)
      if (fromIdx === -1 || toIdx === -1) return
      const [moved] = ordered.splice(fromIdx, 1)
      ordered.splice(toIdx, 0, moved)
      const updated = ordered.map((it, idx) => ({ ...it, order: idx }))
      setAllItems(updated)
      setDisplayedItems(updated.slice(0, ITEMS_PER_PAGE))
      for (const it of updated) {
        await updateItem(it)
      }
    },
    [allItems, ITEMS_PER_PAGE]
  )

  const dragHandlers = {
    onDragStart: (e: React.DragEvent, id: string) => {
      e.dataTransfer.effectAllowed = "move"
      setDragId(id)
    },
    onDragOver: (e: React.DragEvent, id: string) => {
      e.preventDefault()
    },
    onDrop: (e: React.DragEvent, id: string) => {
      e.preventDefault()
      if (dragId) reorderItems(dragId, id)
    },
    onDragEnd: () => {
      setDragId(null)
    }
  }

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

            {selectMode && (
              <BatchToolbar
                selectedIds={selectedIds}
                onSelectAll={() => setSelectedIds(allItems.map((i) => i.id))}
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
                onDragStart={dragHandlers.onDragStart}
                onDragOver={dragHandlers.onDragOver}
                onDrop={dragHandlers.onDrop}
                onDragEnd={dragHandlers.onDragEnd}
                dragId={dragId}
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

            <Footer />
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
