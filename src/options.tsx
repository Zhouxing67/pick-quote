import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded"
import GitHubIcon from "@mui/icons-material/GitHub"
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
  InputLabel,
  MenuItem,
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
import Masonry from "react-masonry-css"

import iconPng from "./assets/icon.png"
import ItemCard from "./components/ItemCard"
import ItemDialog from "./components/ItemDialog"
import { deleteItem, exportItems, searchItems } from "./database"
import { toZip, toJsonZip } from "./export"
import { importFromZip } from "./import"
import { createAppTheme } from "./theme"
import type { Item, ItemType, SearchQuery } from "./types"
import "./options.css"

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
          <Stack spacing={2.5} sx={{ p: 2.5, pt: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  letterSpacing: "0.05em",
                  fontSize: "1rem"
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
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "background.paper",
                  borderRadius: 2
                }
              }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="type-label">类型</InputLabel>
              <Select
                labelId="type-label"
                value={type}
                label="类型"
                onChange={(e) => setType(e.target.value)}
                sx={{ borderRadius: 2 }}>
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="text">文本</MenuItem>
                <MenuItem value="image">图片</MenuItem>
                <MenuItem value="link">链接</MenuItem>
                <MenuItem value="snapshot">快照</MenuItem>
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
                      {site}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      ({allItems.filter((it) => it.sourceSite === site).length})
                    </Typography>
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
                    删除选中
                  </Button>
                </Stack>
              </Box>
            )}

            <Masonry
              breakpointCols={{
                default: 3,
                900: 2,
                600: 1
              }}
              className="masonry-grid"
              columnClassName="masonry-grid-column">
              {displayedItems.map((it) => (
                <Box key={it.id} sx={{ position: "relative" }}>
                  {selectMode && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
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
            </Masonry>

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
