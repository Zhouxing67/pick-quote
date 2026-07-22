import { Box, Chip, Link, Paper, Stack, Typography } from "@mui/material"

import type { Item } from "../types"
import { prettyUrl } from "../utils"
import CardRenderer from "./CardRenderer"
import ItemCardOperations from "./ItemCardOperations"

export default function ItemCard({
  item,
  onDelete,
  onClick,
  onToggleRead,
  onMoveToProject,
  onCopyToProject,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: {
  item: Item
  onDelete: (id: string) => void
  onClick?: () => void
  onToggleRead?: (id: string) => void
  onMoveToProject?: (id: string) => void
  onCopyToProject?: (id: string) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: () => void
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 1,
        p: 2.5,
        mb: 2,
        minHeight: 100,
        cursor: "pointer",
        bgcolor: "background.paper",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": {
          boxShadow: 2,
          transform: "translateY(-2px)",
          borderColor: "primary.light"
        },
        "&:active": {
          transform: "scale(0.97)",
          transition: "transform 0.1s"
        }
      }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}>
      <Box sx={{ position: "absolute", top: 0, left: 0, width: 48, height: 3, bgcolor: "secondary.main", borderTopLeftRadius: 16 }} />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={item.type === "text" ? "文本" : item.type === "image" ? "图片" : "链接"}
            size="small"
            variant="outlined"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 500,
              letterSpacing: "0.04em"
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.7rem",
              letterSpacing: "0.05em"
            }}>
            {new Date(item.createdAt).toLocaleDateString("zh-CN", {
              month: "long",
              day: "numeric"
            })}
          </Typography>
        </Stack>
        <ItemCardOperations
          item={item}
          onDelete={onDelete}
          onMoveToProject={onMoveToProject}
          onCopyToProject={onCopyToProject}
          onToggleRead={onToggleRead}
        />
      </Stack>

      <Box sx={{ mb: 2 }}>
        <CardRenderer item={item} mode="preview" truncateTo={160} />
      </Box>

        {item.source && (
        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 0.5
          }}>
          <Link
            href={item.source.url}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            onClick={(e) => e.stopPropagation()}
            sx={{
              color: "text.secondary",
              fontSize: "0.72rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%"
            }}>
            {item.source.title || prettyUrl(item.source.url)}
          </Link>
        </Box>)}
    </Paper>
  )
}
