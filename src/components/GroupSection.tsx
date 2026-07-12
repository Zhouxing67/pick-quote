import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded"
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded"
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded"
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"
import VerticalAlignTopRoundedIcon from "@mui/icons-material/VerticalAlignTopRounded"
import {
  Box,
  Checkbox,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material"

import type { Item } from "../types"
import ItemCard from "./ItemCard"

interface GroupSectionProps {
  group: { url: string; title: string; items: Item[] }
  idx: number
  dragIndex: number | null
  collapsed: boolean
  isFocused: boolean
  dimmed: boolean
  selectMode: boolean
  selectedIds: string[]
  onToggleCollapse: () => void
  onMoveGroup: (targetIdx: number) => void
  onFocusGroup: () => void
  onDragStart: (e: React.DragEvent, idx: number) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDragEnd: () => void
  onSelectItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onOpenDialog: (item: Item) => void
}

export default function GroupSection({
  group,
  idx,
  dragIndex,
  collapsed,
  isFocused,
  dimmed,
  selectMode,
  selectedIds,
  onToggleCollapse,
  onMoveGroup,
  onFocusGroup,
  onDragStart,
  onDragOver,
  onDragEnd,
  onSelectItem,
  onDeleteItem,
  onOpenDialog
}: GroupSectionProps) {
  const bgColor = collapsed ? "transparent" : (theme: any) =>
    `${theme.palette.secondary.main}14`
  const borderColor = isFocused ? "primary.main" : collapsed ? "transparent" : (theme: any) =>
    `${theme.palette.secondary.main}30`
  const hoverBg = collapsed ? "action.hover" : (theme: any) =>
    `${theme.palette.secondary.main}20`

  return (
    <Box key={group.url} sx={{
      mb: 2,
      opacity: dragIndex === idx ? 0.4 : dimmed ? 0.25 : 1,
      transition: "opacity 0.3s"
    }}>
      <Paper
        elevation={0}
        sx={{
          px: 1.5,
          py: 1,
          mb: collapsed ? 0 : 1.5,
          borderRadius: 1,
          bgcolor: bgColor,
          border: isFocused ? "2px solid" : "1px solid",
          borderColor: borderColor,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": { bgcolor: hoverBg },
          "& .group-actions": { visibility: "hidden" },
          "&:hover .group-actions": { visibility: "visible" }
        }}
        draggable
        onDragStart={(e) => onDragStart(e, idx)}
        onDragOver={(e) => onDragOver(e, idx)}
        onDragEnd={onDragEnd}>
        <Box
          sx={{ display: "flex", alignItems: "center", cursor: "grab", color: "text.disabled", "&:hover": { color: "text.secondary" } }}
          onClick={(e) => e.stopPropagation()}>
          <DragIndicatorRoundedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.75 }} onClick={onToggleCollapse}>
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
            <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); onMoveGroup(0) }}>
              <VerticalAlignTopRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="上移">
            <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); onMoveGroup(idx - 1) }}>
              <KeyboardArrowUpRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="下移">
            <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); onMoveGroup(idx + 1) }}>
              <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="聚焦">
            <IconButton size="small" sx={{ p: 0.25, color: isFocused ? "warning.main" : undefined }} onClick={(e) => { e.stopPropagation(); onFocusGroup() }}>
              <CenterFocusStrongRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
      {!collapsed && (
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
                    onChange={() => onSelectItem(it.id)}
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
                onDelete={onDeleteItem}
                onClick={() =>
                  selectMode ? onSelectItem(it.id) : onOpenDialog(it)
                }
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
