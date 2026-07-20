import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded"
import CheckRoundedIcon from "@mui/icons-material/CheckRounded"
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded"
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded"
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined"
import ImageRoundedIcon from "@mui/icons-material/ImageRounded"
import LinkRoundedIcon from "@mui/icons-material/LinkRounded"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import { useEffect, useState } from "react"

import type { Item } from "../types"
import { prettyUrl } from "../utils"
import { useExportImage } from "../utils/useExportImage"
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

  return (
    <ItemDialogInner
      item={item}
      open={open}
      onClose={onClose}
      onSave={onSave}
      onNavigate={onNavigate}
    />
  )
}

function ItemDialogInner({
  item,
  open,
  onClose,
  onSave,
  onNavigate
}: {
  item: Item
  open: boolean
  onClose: () => void
  onSave?: (updated: Item) => void | Promise<void>
  onNavigate?: (direction: "prev" | "next") => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftContent, setDraftContent] = useState(item.content)
  const [draftNote, setDraftNote] = useState(item.note ?? "")

  // reset draft when item changes
  useEffect(() => {
    setEditing(false)
    setDraftContent(item.content)
    setDraftNote(item.note ?? "")
  }, [item.id])

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

  const icon =
    item.type === "text" ? (
      <FormatQuoteRoundedIcon fontSize="small" />
    ) : item.type === "image" ? (
      <ImageRoundedIcon fontSize="small" />
    ) : item.type === "link" ? (
      <LinkRoundedIcon fontSize="small" />
    ) : (
      <ArticleRoundedIcon fontSize="small" />
    )

  const handleSave = async () => {
    const updated: Item = {
      ...item,
      content: draftContent,
      note: draftNote.trim() ? draftNote.trim() : undefined
    }
    if (onSave) await onSave(updated)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraftContent(item.content)
    setDraftNote(item.note ?? "")
    setEditing(false)
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
            borderRadius: 3,
            height: "85vh",
            display: "flex",
            bgcolor: "background.paper"
          }
        }
      }}>
      {onNavigate && (
        <>
          <IconButton
            size="small"
            onClick={() => onNavigate("prev")}
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
            <ChevronLeftRoundedIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onNavigate("next")}
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
            <ChevronRightRoundedIcon />
          </IconButton>
        </>
      )}
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
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ color: "text.secondary", opacity: 0.7 }}>{icon}</Box>
          <Typography
            variant="subtitle1"
            component="span"
            sx={{ fontSize: "0.9rem", letterSpacing: "0.05em" }}>
            {item.type.toUpperCase()} ·{" "}
            {new Date(item.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </Typography>
        </Stack>
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
        </Stack>
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleCloseMenu}>
          <MenuItem onClick={() => handleExportImage("dark")}>
            深色主题
          </MenuItem>
          <MenuItem onClick={() => handleExportImage("light")}>
            浅色主题
          </MenuItem>
        </Menu>
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
          {editing ? (
            <TextField
              multiline
              minRows={4}
              fullWidth
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  fontSize: "1rem",
                  bgcolor: "background.paper"
                }
              }}
            />
          ) : (
            <>
              {item.type === "text" && (
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 2,
                    textIndent: "2em",
                    fontSize: "1.05rem",
                    color: "text.primary",
                    textAlign: "justify"
                  }}>
                  {item.content}
                </Typography>
              )}
              {item.type === "image" && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <img
                    src={item.content}
                    alt={item.source.title || prettyUrl(item.source.url)}
                    style={{
                      maxWidth: "100%",
                      borderRadius: 12
                    }}
                  />
                </Box>
              )}
              {item.type === "link" && (
                <Typography variant="body1" sx={{ fontSize: "1rem" }}>
                  <Link
                    href={item.content}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{ color: "primary.main" }}>
                    {prettyUrl(item.content)}
                  </Link>
                </Typography>
              )}
              {item.type === "snapshot" &&
                (typeof item.content === "string" &&
                item.content.startsWith("data:image") ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <img
                      src={item.content}
                      alt={item.source.title || prettyUrl(item.source.url)}
                      style={{
                        maxWidth: "100%",
                        borderRadius: 12
                      }}
                    />
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
                    长截图（合成）已保存
                  </Typography>
                ))}
            </>
          )}

          {item.context?.paragraph && !editing && (
            <Box
              sx={{
                mt: 4,
                pt: 3,
                borderTop: "1px solid",
                borderColor: "divider"
              }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                  mb: 1.5,
                  display: "block"
                }}>
                所在段落
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.9,
                  color: "text.secondary",
                  fontSize: "0.9rem"
                }}>
                {item.context.paragraph}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
                mb: 1.5,
                display: "block"
              }}>
              备注
            </Typography>
            {editing ? (
              <TextField
                multiline
                minRows={2}
                fullWidth
                placeholder="添加备注…"
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                    fontSize: "0.9rem",
                    bgcolor: "background.paper"
                  }
                }}
              />
            ) : item.note ? (
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.9,
                  color: "text.secondary",
                  fontSize: "0.9rem"
                }}>
                {item.note}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: "text.disabled", fontSize: "0.85rem" }}>
                暂无备注
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
        <Box
          sx={{
            flex: 1,
            mr: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              display: "inline"
            }}>
            来源：
          </Typography>
          <Link
            href={item.source.url}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{
              color: "primary.main",
              ml: 0.5,
              fontSize: "0.75rem"
            }}>
            {item.source.title || prettyUrl(item.source.url)}
          </Link>
        </Box>
        <Tooltip title="关闭">
          <IconButton onClick={onClose} sx={{ flexShrink: 0 }}>
            <CloseRoundedIcon />
          </IconButton>
        </Tooltip>
      </DialogActions>

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
