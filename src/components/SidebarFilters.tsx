import AllInclusiveRoundedIcon from "@mui/icons-material/AllInclusiveRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded"
import ImageRoundedIcon from "@mui/icons-material/ImageRounded"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  IconButton
} from "@mui/material"
import type { Item } from "../types"

interface SidebarFiltersProps {
  open: boolean
  width: number
  keyword: string
  type: string
  pendingSites: string[]
  availableSites: string[]
  allItems: Item[]
  renameTarget: { domain: string; name: string } | null
  getDisplayName: (domain: string) => string
  onClose: () => void
  onKeywordChange: (v: string) => void
  onTypeChange: (v: string) => void
  setPendingSites: React.Dispatch<React.SetStateAction<string[]>>
  onApply: () => void
  setRenameTarget: (v: { domain: string; name: string } | null) => void
  onWidthChange: (w: number) => void
}

export default function SidebarFilters({
  open,
  width,
  keyword,
  type,
  pendingSites,
  availableSites,
  allItems,
  renameTarget,
  getDisplayName,
  onClose,
  onKeywordChange,
  onTypeChange,
  setPendingSites,
  onApply,
  setRenameTarget,
  onWidthChange
}: SidebarFiltersProps) {
  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? width : 0,
        transition: "none",
        position: "relative",
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          bgcolor: "background.default",
          borderRight: "2px solid",
          borderColor: "primary.main",
          overflowX: "hidden"
        }
      }}>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 4,
          cursor: "col-resize",
          zIndex: 1200,
          "&:hover": { bgcolor: "primary.main", opacity: 0.5 },
          bgcolor: "transparent",
          transition: "background-color 0.15s"
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          const startX = e.clientX
          const startW = width
          const onMove = (ev: MouseEvent) => {
            const w = startW + ev.clientX - startX
            onWidthChange(Math.max(200, Math.min(500, w)))
          }
          const onUp = () => {
            document.removeEventListener("mousemove", onMove)
            document.removeEventListener("mouseup", onUp)
          }
          document.addEventListener("mousemove", onMove)
          document.addEventListener("mouseup", onUp)
        }}
      />
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
          <IconButton size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

        <TextField
          placeholder="搜索关键词"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
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
              borderRadius: 1,
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
            onChange={(e) => onTypeChange(e.target.value)}
            sx={{ borderRadius: 1, fontSize: "0.8rem" }}>
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
              borderRadius: 1,
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
          sx={{ borderRadius: 1, mt: 1 }}
          onClick={onApply}>
          应用
        </Button>
      </Stack>
    </Drawer>
  )
}
