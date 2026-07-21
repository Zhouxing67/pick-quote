import CheckRoundedIcon from "@mui/icons-material/CheckRounded"
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded"
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined"
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Tooltip
} from "@mui/material"
import { useEffect, useState } from "react"

import type { Item } from "../types"
import { prettyUrl } from "../utils"
import { useExportImage } from "../utils/useExportImage"
import DialogEditMode from "./DialogEditMode"
import CardRenderer from "./CardRenderer"
import ExportImageMenu from "./ExportImageMenu"
import ShareCard from "./ShareCard"

export default function ItemDialog({
  item,
  open,
  onClose,
  onSave,
  onNavigate
}: {
  item: Item | null
  open: boolean
  onClose: () => void
  onSave?: (updated: Item) => void | Promise<void>
  onNavigate?: (direction: "prev" | "next") => void
}) {
  if (!item) return null

  const [editing, setEditing] = useState(false)
  const [draftContent, setDraftContent] = useState(item.content)
  const [draftNote, setDraftNote] = useState(item.note ?? "")
  const [draftTags, setDraftTags] = useState<string[]>(item.tags ?? [])

  useEffect(() => {
    setEditing(false)
    setDraftContent(item.content)
    setDraftNote(item.note ?? "")
    setDraftTags(item.tags ?? [])
  }, [item.id])

  const [animDir, setAnimDir] = useState<"prev" | "next" | null>(null)

  const {
    shareCardRef,
    isExporting,
    selectedTheme,
    anchorEl,
    menuOpen,
    handleExportClick,
    handleCloseMenu,
    handleExportImage
  } = useExportImage(item)

  const handleSave = async () => {
    const updated: Item = {
      ...item,
      content: draftContent,
      note: draftNote.trim() ? draftNote.trim() : undefined,
      tags: draftTags.length > 0 ? draftTags : undefined
    }
    if (onSave) await onSave(updated)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraftContent(item.content)
    setDraftNote(item.note ?? "")
    setDraftTags(item.tags ?? [])
    setEditing(false)
  }

  const handleNavigate = (dir: "prev" | "next") => {
    if (animDir || !onNavigate) return
    setAnimDir(dir)
    setTimeout(() => {
      onNavigate(dir)
      setAnimDir(null)
    }, 250)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            height: "85vh",
            display: "flex",
            bgcolor: "background.paper"
          }
        }
      }}>
      {onNavigate && (
        <>
          <IconButton
            onClick={() => handleNavigate("prev")}
            sx={{
              position: "fixed",
              left: 24,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: (theme) => theme.zIndex.modal + 1,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 2,
              "&:hover": { bgcolor: "action.hover" }
            }}>
            <ChevronLeftRoundedIcon sx={{ fontSize: 28 }} />
          </IconButton>
          <IconButton
            onClick={() => handleNavigate("next")}
            sx={{
              position: "fixed",
              right: 24,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: (theme) => theme.zIndex.modal + 1,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: 2,
              "&:hover": { bgcolor: "action.hover" }
            }}>
            <ChevronRightRoundedIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </>
      )}
      <style>{`
        @keyframes dialogSlideOutLeft {
          to { opacity: 0; transform: translateX(-24px); }
        }
        @keyframes dialogSlideOutRight {
          to { opacity: 0; transform: translateX(24px); }
        }
        @keyframes dialogSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 2.5,
          px: 3
        }}>
        <Box
          sx={{
            flex: 1,
            mr: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
          {item.source && (
            <Link
              href={item.source.url}
              target="_blank"
              rel="noreferrer"
              underline="hover"
              sx={{
                color: "primary.main",
                fontSize: "0.8rem"
              }}>
              {item.source.title || prettyUrl(item.source.url)}
            </Link>
          )}
        </Box>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {editing ? (
            <>
              <Tooltip title="保存">
                <IconButton size="small" onClick={handleSave} color="primary">
                  <CheckRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="取消">
                <IconButton size="small" onClick={handleCancel}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="编辑">
              <IconButton size="small" onClick={() => setEditing(true)}>
                <EditRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="导出为图片">
            <IconButton
              size="small"
              onClick={handleExportClick}
              disabled={isExporting}>
              <ImageOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="复制引用">
            <IconButton
              size="small"
              onClick={() => {
                const src = item.source?.url
                  ? `\n\n— ${item.source.title || prettyUrl(item.source.url)}`
                  : ""
                navigator.clipboard.writeText(`> ${item.content}${src}`)
              }}>
              <ContentCopyRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <ExportImageMenu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleCloseMenu}
          onExport={handleExportImage}
        />
      </DialogTitle>
      <DialogContent
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 4,
          py: 4,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          animation: animDir
            ? `dialogSlideOut${animDir === "next" ? "Left" : "Right"} 0.2s ease-in forwards`
            : "none",
          "&::-webkit-scrollbar": {
            width: "8px"
          },
          "&::-webkit-scrollbar-track": {
            bgcolor: "transparent"
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: (theme) =>
              theme.palette.mode === "light"
                ? "rgba(45, 52, 54, 0.2)"
                : "rgba(232, 230, 227, 0.2)",
            borderRadius: "4px",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "light"
                  ? "rgba(45, 52, 54, 0.3)"
                  : "rgba(232, 230, 227, 0.3)"
            }
          }
        }}>
        <Box key={item.id} sx={{ flex: 1, display: "flex", flexDirection: "column", animation: animDir ? "none" : "dialogSlideIn 0.25s ease-out" }}>
          {editing ? (
            <DialogEditMode
              draftContent={draftContent}
              draftNote={draftNote}
              draftTags={draftTags}
              onContentChange={setDraftContent}
              onNoteChange={setDraftNote}
              onTagsChange={setDraftTags}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                maxWidth: "680px",
                mx: "auto",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
              }}>
              <CardRenderer item={item} mode="full" />
            </Box>
          )}
        </Box>
      </DialogContent>

      <Box
        sx={{
          position: "fixed",
          top: -10000,
          left: -10000,
          zIndex: -1
        }}>
        <ShareCard ref={shareCardRef} item={item} theme={selectedTheme} />
      </Box>
    </Dialog>
  )
}
