import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded"
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined"
import {
  Box,
  Chip,
  IconButton,
  Link,
  Paper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material"
import { useState } from "react"

import type { Item } from "../types"
import { prettyUrl, truncateText } from "../utils"
import { useExportImage } from "../utils/useExportImage"
import ExportImageMenu from "./ExportImageMenu"
import ShareCard from "./ShareCard"

export default function ItemCard({
  item,
  onDelete,
  onClick,
  onToggleRead,
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
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: () => void
}) {
  const {
    shareCardRef,
    isExporting,
    selectedTheme,
    anchorEl,
    menuOpen,
    handleExportClick: rawExportClick,
    handleCloseMenu,
    handleExportImage
  } = useExportImage(item)

  const [copied, setCopied] = useState(false)

  const handleExportClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    rawExportClick(e)
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        p: 2.5,
        mb: 2,
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
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{
            opacity: 0.6,
            transition: "opacity 0.2s",
            "&:hover": { opacity: 1 }
          }}>
          <Tooltip title={copied ? "已复制" : "复制引用"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                const src = item.source?.url
                  ? `\n\n— ${item.source.title || prettyUrl(item.source.url)}`
                  : ""
                navigator.clipboard.writeText(`> ${item.content}${src}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              }}
              sx={{ p: 0.75 }}>
              <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="导出为图片">
            <IconButton
              size="small"
              onClick={handleExportClick}
              disabled={isExporting}
              sx={{ p: 0.75 }}>
              <ImageOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id)
              }}
              sx={{ p: 0.75 }}>
              <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {item.type === "link" && onToggleRead && (
            <Tooltip title={item.read ? "标记未读" : "标记已读"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleRead(item.id)
                }}
                sx={{
                  p: 0.75,
                  color: item.read ? "success.main" : "text.disabled"
                }}>
                <CheckCircleOutlineRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <ExportImageMenu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleCloseMenu}
          onExport={handleExportImage}
        />
      </Stack>

      <Box sx={{ mb: 2 }}>
        {item.type === "text" && (
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                top: -6,
                left: -6,
                fontSize: "2rem",
                color: "text.disabled",
                opacity: 0.3,
                fontFamily: "Georgia, serif"
              }}>
              "
            </Box>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.75,
                color: "text.primary",
                pl: 2,
                pr: 1,
                fontSize: "0.95rem",
                fontFamily: '"Noto Serif SC", "Songti SC", "STSong", serif'
              }}>
              {truncateText(item.content, 160)}
            </Typography>
          </Box>
        )}
        {item.type === "image" && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <img
              src={item.content}
              alt={item.source?.title || (item.source ? prettyUrl(item.source.url) : "")}
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: 200,
                borderRadius: 10
              }}
            />
          </Box>
        )}
        {item.type === "link" && (
          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
              <Link
                href={item.content}
                target="_blank"
                rel="noreferrer"
                underline="hover"
                sx={{ color: "primary.main" }}>
                {prettyUrl(item.content)}
              </Link>
            </Typography>
          </Stack>
        )}
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

      <Box
        sx={{
          position: "fixed",
          top: -10000,
          left: -10000,
          zIndex: -1
        }}>
        <ShareCard ref={shareCardRef} item={item} theme={selectedTheme} />
      </Box>
    </Paper>
  )
}
