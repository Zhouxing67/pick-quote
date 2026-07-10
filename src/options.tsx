import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import AllInclusiveRoundedIcon from "@mui/icons-material/AllInclusiveRounded"
import CodeRoundedIcon from "@mui/icons-material/CodeRounded"
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded"
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded"
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded"
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded"
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded"
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded"
import GitHubIcon from "@mui/icons-material/GitHub"
import ImageRoundedIcon from "@mui/icons-material/ImageRounded"
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded"
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded"
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded"
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded"
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded"
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import VerticalAlignTopRoundedIcon from "@mui/icons-material/VerticalAlignTopRounded"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import UnarchiveRoundedIcon from "@mui/icons-material/UnarchiveRounded"
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material"
import Avatar from "@mui/material/Avatar"
import IconButton from "@mui/material/IconButton"
import { ThemeProvider } from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import iconPng from "./assets/icon.png"
import ItemCard from "./components/ItemCard"
import ItemDialog from "./components/ItemDialog"
import { deleteItem, exportItems, searchItems } from "./database"
import { toZip, toJsonZip } from "./export"
import { importFromZip } from "./import"
import { createAppTheme } from "./theme"
import type { Item, ItemType, SearchQuery } from "./types"
import { prettyUrl } from "./utils"

const DRAWER_WIDTH = 280

export default function OptionsPage() {
  const [allItems, setAllItems] = useState<Item[]>([])
  const [displayedItems, setDisplayedItems] = useState<Item[]>([])
  const [keyword, setKeyword] = useState("")
  const [type, setType] = useState<string>("")
  const [dialogItem, setDialogItem] = useState<Item | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
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
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const ITEMS_PER_PAGE = 20

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)")

  const theme = useMemo(
    () => createAppTheme(prefersDarkMode ? "dark" : "light"),
    [prefersDarkMode]
  )

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

  const getPageTitles = (domain: string) => {
    const titles = new Set(
      allItems
        .filter((it) => it.sourceSite === domain && it.source.title)
        .map((it) => it.source.title)
    )
    return [...titles].slice(0, 8)
  }

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

  function normalizeUrl(url: string): string {
    try {
      const u = new URL(url)
      u.hash = ""
      let normalized = u.href
      if (normalized.endsWith("/"))
        normalized = normalized.slice(0, -1)
      return normalized
    } catch {
      return url
    }
  }

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
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? DRAWER_WIDTH : 0,
            transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
              bgcolor: "background.default",
              borderRight: "1px solid",
              borderColor: "divider",
              overflowX: "hidden"
            }
          }}>
          <Stack spacing={2} sx={{ p: 2, pt: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  letterSpacing: "0.05em",
                  fontSize: "0.9rem"
                }}>
                筛选
              </Typography>
              <IconButton size="small" onClick={handleToggleDrawer}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>

            <TextField
              placeholder="搜索关键词"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  )
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  fontSize: "0.8rem"
                }
              }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="type-label" sx={{ fontSize: "0.8rem" }}>类型</InputLabel>
              <Select
                labelId="type-label"
                value={type}
                label="类型"
                onChange={(e) => setType(e.target.value)}
                sx={{ borderRadius: 2, fontSize: "0.8rem" }}>
                <MenuItem value="" sx={{ fontSize: "0.8rem", gap: 1 }}>
                  <AllInclusiveRoundedIcon sx={{ fontSize: 18 }} />
                  全部
                </MenuItem>
                <MenuItem value="text" sx={{ fontSize: "0.8rem", gap: 1 }}>
                  <FormatQuoteRoundedIcon sx={{ fontSize: 18 }} />
                  文本
                </MenuItem>
                <MenuItem value="image" sx={{ fontSize: "0.8rem", gap: 1 }}>
                  <ImageRoundedIcon sx={{ fontSize: 18 }} />
                  图片
                </MenuItem>
                <MenuItem value="link" sx={{ fontSize: "0.8rem", gap: 1 }}>
                  <LinkRoundedIcon sx={{ fontSize: 18 }} />
                  链接
                </MenuItem>
                <MenuItem value="snapshot" sx={{ fontSize: "0.8rem", gap: 1 }}>
                  <PhotoCameraRoundedIcon sx={{ fontSize: 18 }} />
                  快照
                </MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block", mb: 1 }}>
                来源网站
              </Typography>
              <Box
                sx={{
                  maxHeight: 240,
                  overflowY: "auto",
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider"
                }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                    bgcolor: pendingSites.length === 0 ? "action.selected" : "transparent"
                  }}
                  onClick={() => setPendingSites([])}>
                  <Checkbox checked={pendingSites.length === 0} size="small" sx={{ py: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, fontSize: "0.85rem" }}>
                    全部
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    ({allItems.length})
                  </Typography>
                </Stack>
                {availableSites.map((site) => (
                  <Stack
                    key={site}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      bgcolor: pendingSites.includes(site) ? "action.selected" : "transparent"
                    }}
                    onClick={() =>
                      setPendingSites((prev) =>
                        prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
                      )
                    }>
                    <Checkbox checked={pendingSites.includes(site)} size="small" sx={{ py: 0 }} />
                    <Typography variant="body2" sx={{ flex: 1, fontSize: "0.85rem" }}>
                      {getDisplayName(site)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      ({allItems.filter((it) => it.sourceSite === site).length})
                    </Typography>
                    <EditRoundedIcon
                      sx={{ fontSize: 14, color: "text.disabled", cursor: "pointer", "&:hover": { color: "text.secondary" } }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setRenameTarget({ domain: site, name: getDisplayName(site) })
                      }}
                    />
                  </Stack>
                ))}
                {availableSites.length === 0 && (
                  <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      暂无来源数据
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Button
              variant="contained"
              fullWidth
              sx={{ borderRadius: 2, mt: 1 }}
              onClick={() => {
                setSelectedSites(pendingSites)
                onSearch(pendingSites)
              }}>
              应用
            </Button>

          </Stack>
        </Drawer>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0
          }}>
          <Container sx={{ py: 4 }} maxWidth="xl">
            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 1100,
                bgcolor: "background.default",
                transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                height: headerHeight,
                display: "flex",
                alignItems: "center"
              }}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ width: "100%" }}>
                <Tooltip title={drawerOpen ? "关闭筛选面板" : "打开筛选面板"}>
                  <IconButton
                    size="small"
                    onClick={handleToggleDrawer}
                    sx={{
                      color: drawerOpen ? "primary.main" : "text.secondary",
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main" }
                    }}>
                    <FilterListRoundedIcon />
                  </IconButton>
                </Tooltip>
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: "1.75rem",
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    lineHeight: 1
                  }}>
                  拾句
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.75rem",
                    display: { xs: "none", sm: "block" }
                  }}>
                  灵感一闪，即可拾取
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  size="small"
                  component="label"
                  disabled={importing}
                  sx={{
                    borderRadius: 2,
                    fontSize: "0.75rem",
                    px: 1.5,
                    minWidth: 0,
                    color: "text.secondary"
                  }}>
                  <UnarchiveRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  导入 ZIP
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".zip"
                    onChange={handleImport}
                  />
                </Button>
                <Button
                  size="small"
                  sx={{
                    borderRadius: 2,
                    fontSize: "0.75rem",
                    px: 1.5,
                    minWidth: 0,
                    color: selectMode ? "error.main" : "text.secondary"
                  }}
                  onClick={() => {
                    if (selectMode) {
                      setSelectedIds([])
                    }
                    setSelectMode((prev) => !prev)
                  }}>
                  {selectMode ? "取消" : "选择"}
                </Button>
              </Stack>
            </Box>

            {(keyword || type || selectedSites.length > 0) && (
              <Box
                sx={{
                  position: "sticky",
                  top: headerHeight,
                  zIndex: 1050,
                  py: 1.5
                }}>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ bgcolor: "background.default" }}>
                  {keyword && (
                    <Chip
                      label={`搜索: ${keyword}`}
                      size="small"
                      onDelete={() => setKeyword("")}
                      sx={{ borderRadius: 1.5 }}
                    />
                  )}
                  {type && (
                    <Chip
                      label={`类型: ${type}`}
                      size="small"
                      onDelete={() => setType("")}
                      sx={{ borderRadius: 1.5 }}
                    />
                  )}
                  {selectedSites.map((site) => (
                    <Chip
                      key={site}
                      label={site}
                      size="small"
                      onDelete={() => handleRemoveSite(site)}
                      sx={{ borderRadius: 1.5 }}
                    />
                  ))}
                  <Chip
                    label="清除筛选"
                    size="small"
                    variant="outlined"
                    onClick={clearAllFilters}
                    sx={{
                      borderRadius: 1.5,
                      color: "text.secondary",
                      borderColor: "divider",
                      "&:hover": { borderColor: "error.main", color: "error.main" }
                    }}
                  />
                </Stack>
              </Box>
            )}

            {selectMode && (
              <Box
                sx={{
                  py: 1.5,
                  px: 2,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider"
                }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                  ✅ 已选 {selectedIds.length} 条
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    sx={{ borderRadius: 2, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                    onClick={() =>
                      setSelectedIds(allItems.map((i) => i.id))
                    }>
                    <DoneAllRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    全选
                  </Button>
                  <Divider orientation="vertical" flexItem />
                  <Button
                    size="small"
                    sx={{ borderRadius: 2, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                    disabled={selectedIds.length === 0}
                    onClick={async () => {
                      const items = allItems.filter((i) => selectedIds.includes(i.id))
                      const blob = await toZip(items)
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = "pickquote-export.zip"
                      a.click()
                      URL.revokeObjectURL(url)
                    }}>
                    <DescriptionRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    导出 MD
                  </Button>
                  <Button
                    size="small"
                    sx={{ borderRadius: 2, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                    disabled={selectedIds.length === 0}
                    onClick={async () => {
                      const items = allItems.filter((i) => selectedIds.includes(i.id))
                      const blob = await toJsonZip(items)
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = "pickquote-export.json.zip"
                      a.click()
                      URL.revokeObjectURL(url)
                    }}>
                    <CodeRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    导出 JSON
                  </Button>
                  <Divider orientation="vertical" flexItem />
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    sx={{ borderRadius: 2, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                    disabled={selectedIds.length === 0}
                    onClick={handleBatchDelete}>
<DeleteSweepRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    删除选中
                  </Button>
                </Stack>
              </Box>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Button size="small" sx={{ borderRadius: 2, fontSize: "0.75rem", minWidth: 0 }} onClick={expandAll}>
                <UnfoldMoreRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                展开全部
              </Button>
              <Button size="small" sx={{ borderRadius: 2, fontSize: "0.75rem", minWidth: 0 }} onClick={collapseAll}>
                <UnfoldLessRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                折叠全部
              </Button>
              <Box sx={{ flex: 1 }} />
              {focusedUrl && (
                <Button
                  size="small"
                  color="warning"
                  startIcon={<CloseRoundedIcon />}
                  sx={{ borderRadius: 2, fontSize: "0.75rem", minWidth: 0 }}
                  onClick={() => setFocusedUrl(null)}>
                  退出聚焦
                </Button>
              )}
            </Box>

            {sortedGroups.map((group, idx) => (
              <Box key={group.url} sx={{
                mb: 2,
                opacity: dragIndex === idx ? 0.4 : focusedUrl && focusedUrl !== group.url ? 0.25 : 1,
                transition: "opacity 0.3s"
              }}>
                <Paper
                  elevation={0}
                  sx={{
                    px: 1.5,
                    py: 1,
                    mb: collapsedUrls.has(group.url) ? 0 : 1.5,
                    borderRadius: 2,
                    bgcolor: collapsedUrls.has(group.url) ? "transparent" : "rgba(220, 237, 200, 0.4)",
                    border: focusedUrl === group.url ? "2px solid" : "1px solid",
                    borderColor: focusedUrl === group.url ? "primary.main" : collapsedUrls.has(group.url) ? "transparent" : (theme) =>
                      theme.palette.mode === "dark" ? "rgba(220, 237, 200, 0.2)" : "rgba(220, 237, 200, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { bgcolor: collapsedUrls.has(group.url) ? "action.hover" : "rgba(220, 237, 200, 0.6)" },
                    "& .group-actions": { visibility: "hidden" },
                    "&:hover .group-actions": { visibility: "visible" }
                  }}
                  draggable
                  onDragStart={(e) => dragHandlers.onDragStart(e, idx)}
                  onDragOver={(e) => dragHandlers.onDragOver(e, idx)}
                  onDragEnd={dragHandlers.onDragEnd}>
                  <Box
                    sx={{ display: "flex", alignItems: "center", cursor: "grab", color: "text.disabled", "&:hover": { color: "text.secondary" } }}
                    onClick={(e) => e.stopPropagation()}>
                    <DragIndicatorRoundedIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.75 }} onClick={() => toggleCollapse(group.url)}>
                    {collapsedUrls.has(group.url) ? (
                      <KeyboardArrowRightRoundedIcon sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }} />
                    ) : (
                      <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }} />
                    )}
                    <Typography variant="body2" sx={{ fontSize: "0.85rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {group.title}
                    </Typography>
                    <LinkRoundedIcon
                      sx={{ fontSize: 14, color: "text.disabled", flexShrink: 0, cursor: "pointer", "&:hover": { color: "primary.main" } }}
                      onClick={(e) => { e.stopPropagation(); window.open(group.url, "_blank") }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", flexShrink: 0 }}>
                      {group.items.length} 条
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} className="group-actions" sx={{ flexShrink: 0 }} onMouseDown={(e) => e.stopPropagation()}>
                    <Tooltip title="置顶">
                      <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); moveGroup(group.url, 0) }}>
                        <VerticalAlignTopRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="上移">
                      <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); moveGroup(group.url, idx - 1) }}>
                        <KeyboardArrowUpRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="下移">
                      <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); moveGroup(group.url, idx + 1) }}>
                        <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="聚焦">
                      <IconButton size="small" sx={{ p: 0.25, color: focusedUrl === group.url ? "warning.main" : undefined }} onClick={(e) => { e.stopPropagation(); focusGroup(group.url) }}>
                        <CenterFocusStrongRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
                {!collapsedUrls.has(group.url) && (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      ml: -1.5
                    }}>
                    {group.items.map((it) => (
                    <Box
                      key={it.id}
                      sx={{
                        width: {
                          xs: "100%",
                          sm: "50%",
                          md: "33.333%"
                        },
                        pl: 1.5,
                        mb: 1.5,
                        position: "relative"
                      }}>
                      {selectMode && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 8,
                            left: `calc(1.5 * 8px + 1.5)`,
                            zIndex: 10
                          }}
                          onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(it.id)}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(it.id)
                                  ? prev.filter((i) => i !== it.id)
                                  : [...prev, it.id]
                              )
                            }
                            sx={{
                              bgcolor: "background.paper",
                              borderRadius: 1,
                              "&:hover": { bgcolor: "action.hover" }
                            }}
                          />
                        </Box>
                      )}
                      <ItemCard
                        item={it}
                        onDelete={onDelete}
                        onClick={() =>
                          selectMode
                            ? setSelectedIds((prev) =>
                                prev.includes(it.id)
                                  ? prev.filter((i) => i !== it.id)
                                  : [...prev, it.id]
                              )
                            : setDialogItem(it)
                        }
                      />
                    </Box>
                  ))}
                </Box>
              )}
              </Box>
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
                  sx={{ borderRadius: 2 }}>
                  取消
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmBatchDelete ? handleConfirmBatchDelete : handleConfirmDelete}
                  sx={{ borderRadius: 2 }}>
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
                    "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.85rem" },
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
                  sx={{ borderRadius: 2 }}>
                  重置为域名
                </Button>
                <Button
                  onClick={() => setRenameTarget(null)}
                  sx={{ borderRadius: 2 }}>
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
                  sx={{ borderRadius: 2 }}>
                  确认
                </Button>
              </DialogActions>
            </Dialog>

            <Box
              component="footer"
              sx={{
                mt: 6,
                py: 3,
                color: "text.secondary",
                borderTop: "1px solid",
                borderColor: "divider"
              }}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mb: 1 }}>
                <Avatar
                  src={iconPng}
                  alt="拾句"
                  sx={{
                    width: 28,
                    height: 28,
                    boxShadow: 1,
                    opacity: 0.9
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontStyle: "italic",
                    fontSize: "0.8rem",
                    letterSpacing: "0.03em"
                  }}>
                  拾句 · 灵感库 — 数据仅存本地 IndexedDB · v0.1
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                  开源地址：
                </Typography>
                <Tooltip title="GitHub: minorcell/pick-quote">
                  <IconButton
                    size="small"
                    component="a"
                    href="https://github.com/minorcell/pick-quote"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub repository"
                    sx={{ ml: 0.5 }}>
                    <GitHubIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
