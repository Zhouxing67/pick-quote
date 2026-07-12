import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded"
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded"
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
import ColorPalette from "./components/ColorPalette"
import FilterChips from "./components/FilterChips"
import Footer from "./components/Footer"
import GroupSection from "./components/GroupSection"
import SidebarFilters from "./components/SidebarFilters"
import ItemDialog from "./components/ItemDialog"
import { deleteItem, searchItems } from "./database"
import { toZip, toJsonZip } from "./export"
import { importFromZip } from "./import"
import { createAppTheme } from "./theme"
import type { Item, ItemType, PresetName, SearchQuery } from "./types"
import { prettyUrl, normalizeUrl } from "./utils"

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
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [pendingSites, setPendingSites] = useState<string[]>([])
  const [availableSites, setAvailableSites] = useState<string[]>([])
  const [siteGroups, setSiteGroups] = useState<Record<string, string>>({})
  const [renameTarget, setRenameTarget] = useState<{ domain: string; name: string } | null>(null)
  const [collapsedUrls, setCollapsedUrls] = useState<Set<string>>(new Set())
  const [groupOrder, setGroupOrder] = useState<string[] | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [focusedUrl, setFocusedUrl] = useState<string | null>(null)
  const [preset, setPreset] = useState<PresetName>("classic")
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null)
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

  useEffect(() => {
    onSearch()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      onSearch()
    }, 300)
    return () => clearTimeout(t)
  }, [keyword, type])

  useEffect(() => {
    const sites = Array.from(
      new Set(allItems.map((it) => it.sourceSite).filter(Boolean))
    ) as string[]
    setAvailableSites([...sites].sort())
  }, [allItems])

  useEffect(() => {
    chrome.storage.sync.get("siteGroups", (data) => {
      if (data.siteGroups) setSiteGroups(data.siteGroups as Record<string, string>)
    })
    chrome.storage.sync.get("groupOrder", (data) => {
      if (data.groupOrder) setGroupOrder(data.groupOrder as string[])
    })
  }, [])

  const getDisplayName = (domain: string) => siteGroups[domain] || domain

  const saveSiteGroup = (domain: string, name: string) => {
    const next = { ...siteGroups }
    if (name.trim() && name.trim() !== domain) {
      next[domain] = name.trim()
    } else {
      delete next[domain]
    }
    setSiteGroups(next)
    chrome.storage.sync.set({ siteGroups: next })
  }

  const onSearch = async (sites?: string[]) => {
    const activeSites = sites ?? selectedSites
    const q: SearchQuery = {
      keyword,
      type: type ? (type as ItemType) : undefined,
      sites: activeSites.length > 0 ? activeSites : undefined
    }
    const list = await searchItems(q)
    setAllItems(list)
    setDisplayedItems(list.slice(0, ITEMS_PER_PAGE))
    setHasMore(list.length > ITEMS_PER_PAGE)
  }

  const handleToggleDrawer = () => {
    if (drawerOpen) {
      setSelectedSites(pendingSites)
      onSearch(pendingSites)
    } else {
      setPendingSites(selectedSites)
    }
    setDrawerOpen((prev) => !prev)
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

  const groupedItems = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of displayedItems) {
      const key = normalizeUrl(item.source.url)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
      .map(([url, items]) => ({
        url,
        title: items[0]?.source.title || prettyUrl(url),
        items
      }))
      .sort((a, b) => b.items[0].createdAt - a.items[0].createdAt)
  }, [displayedItems])

  const sortedGroups = useMemo(() => {
    if (!groupOrder) return groupedItems
    const map = new Map(groupedItems.map((g) => [g.url, g]))
    const sorted: typeof groupedItems = []
    for (const url of groupOrder) {
      const group = map.get(url)
      if (group) sorted.push(group)
    }
    for (const group of groupedItems) {
      if (!groupOrder.includes(group.url)) sorted.push(group)
    }
    return sorted
  }, [groupedItems, groupOrder])

  useEffect(() => {
    if (groupOrder === null) return
    const t = setTimeout(() => {
      chrome.storage.sync.set({ groupOrder })
    }, 500)
    return () => clearTimeout(t)
  }, [groupOrder])

  const dragHandlers = {
    onDragStart: (e: React.DragEvent, idx: number) => {
      e.dataTransfer.effectAllowed = "move"
      setDragIndex(idx)
    },
    onDragOver: (e: React.DragEvent, idx: number) => {
      e.preventDefault()
      if (dragIndex === null || dragIndex === idx) return
      const next = [...(groupOrder ?? groupedItems.map((g) => g.url))]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(idx, 0, moved)
      setGroupOrder(next)
      setDragIndex(idx)
    },
    onDragEnd: () => {
      setDragIndex(null)
    }
  }

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

  const handleRemoveSite = (site: string) => {
    const nextSites = selectedSites.filter((s) => s !== site)
    setSelectedSites(nextSites)
    setPendingSites((prev) => prev.filter((s) => s !== site))
    onSearch(nextSites)
  }

  const clearAllFilters = () => {
    setKeyword("")
    setType("")
    setSelectedSites([])
    setPendingSites([])
    onSearch([])
  }

  const toggleCollapse = (url: string) => {
    setCollapsedUrls((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const moveGroup = (url: string, targetIdx: number) => {
    const order = groupOrder ?? sortedGroups.map((g) => g.url)
    const from = order.indexOf(url)
    if (from === -1 || targetIdx < 0 || targetIdx >= order.length) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(targetIdx, 0, moved)
    setGroupOrder(next)
  }

  const expandAll = () => setCollapsedUrls(new Set())
  const collapseAll = () => setCollapsedUrls(new Set(sortedGroups.map((g) => g.url)))

  const focusGroup = (url: string) => {
    collapseAll()
    setFocusedUrl(url)
    setCollapsedUrls((prev) => {
      const next = new Set(prev)
      next.delete(url)
      return next
    })
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <SidebarFilters
          open={drawerOpen}
          width={drawerWidth}
          keyword={keyword}
          type={type}
          pendingSites={pendingSites}
          availableSites={availableSites}
          allItems={allItems}
          renameTarget={renameTarget}
          getDisplayName={getDisplayName}
          onClose={handleToggleDrawer}
          onKeywordChange={setKeyword}
          onTypeChange={setType}
          setPendingSites={setPendingSites}
          onApply={() => {
            setSelectedSites(pendingSites)
            onSearch(pendingSites)
          }}
          setRenameTarget={setRenameTarget}
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
              selectedSites={selectedSites}
              headerHeight={headerHeight}
              onClearKeyword={() => setKeyword("")}
              onClearType={() => setType("")}
              onRemoveSite={handleRemoveSite}
              onClearAll={clearAllFilters}
            />

            {selectMode && (
              <BatchToolbar
                selectedIds={selectedIds}
                onSelectAll={() => setSelectedIds(allItems.map((i) => i.id))}
                onExportMd={async () => {
                  const items = allItems.filter((i) => selectedIds.includes(i.id))
                  const blob = await toZip(items)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "pickquote-export.zip"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                onExportJson={async () => {
                  const items = allItems.filter((i) => selectedIds.includes(i.id))
                  const blob = await toJsonZip(items)
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

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Button size="small" sx={{ borderRadius: 1, fontSize: "0.75rem", minWidth: 0 }} onClick={expandAll}>
                <UnfoldMoreRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                展开全部
              </Button>
              <Button size="small" sx={{ borderRadius: 1, fontSize: "0.75rem", minWidth: 0 }} onClick={collapseAll}>
                <UnfoldLessRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                折叠全部
              </Button>
              <Box sx={{ flex: 1 }} />
              {focusedUrl && (
                <Button
                  size="small"
                  color="warning"
                  startIcon={<CloseRoundedIcon />}
                  sx={{ borderRadius: 1, fontSize: "0.75rem", minWidth: 0 }}
                  onClick={() => setFocusedUrl(null)}>
                  退出聚焦
                </Button>
              )}
            </Box>

            {sortedGroups.map((group, idx) => (
              <GroupSection
                key={group.url}
                group={group}
                idx={idx}
                dragIndex={dragIndex}
                collapsed={collapsedUrls.has(group.url)}
                isFocused={focusedUrl === group.url}
                dimmed={Boolean(focusedUrl) && focusedUrl !== group.url}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleCollapse={() => toggleCollapse(group.url)}
                onMoveGroup={(targetIdx) => moveGroup(group.url, targetIdx)}
                onFocusGroup={() => focusGroup(group.url)}
                onDragStart={dragHandlers.onDragStart}
                onDragOver={dragHandlers.onDragOver}
                onDragEnd={dragHandlers.onDragEnd}
                onSelectItem={(id) =>
                  setSelectedIds((prev) =>
                    prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                  )
                }
                onDeleteItem={onDelete}
                onOpenDialog={setDialogItem}
              />
            ))}

            {hasMore && (
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

            <Dialog
              open={Boolean(renameTarget)}
              onClose={() => setRenameTarget(null)}
              slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
              <DialogTitle sx={{ pb: 1 }}>重命名分组</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  value={renameTarget?.name ?? ""}
                  onChange={(e) =>
                    setRenameTarget((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameTarget) {
                      saveSiteGroup(renameTarget.domain, renameTarget.name)
                      setRenameTarget(null)
                    }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": { borderRadius: 1, fontSize: "0.85rem" },
                    mt: 1
                  }}
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                  onClick={() => {
                    if (renameTarget) {
                      saveSiteGroup(renameTarget.domain, renameTarget.domain)
                      setRenameTarget(null)
                    }
                  }}
                  sx={{ borderRadius: 1 }}>
                  重置为域名
                </Button>
                <Button
                  onClick={() => setRenameTarget(null)}
                  sx={{ borderRadius: 1 }}>
                  取消
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (renameTarget) {
                      saveSiteGroup(renameTarget.domain, renameTarget.name)
                      setRenameTarget(null)
                    }
                  }}
                  sx={{ borderRadius: 1 }}>
                  确认
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
