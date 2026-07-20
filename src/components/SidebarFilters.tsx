import { useState } from "react"

import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded"
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import {
  Badge,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"

import type { Project } from "../types"

interface SidebarFiltersProps {
  open: boolean
  width: number
  projects: Project[]
  activeProjectId: string | null
  readingFilter: boolean
  dueCount: number
  reviewMode: boolean
  onClose: () => void
  onOpenProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
  onUpdateNote: (id: string, note: string) => void
  onDeleteProject: (id: string) => void
  onWidthChange: (w: number) => void
  onToggleReadingFilter: () => void
  onStartReview: () => void
  onExitReview: () => void
  onNewProjectClick: () => void
  onCloseProject: () => void
}

export default function SidebarFilters({
  open,
  width,
  projects,
  activeProjectId,
  readingFilter,
  dueCount,
  reviewMode,
  onClose,
  onOpenProject,
  onRenameProject,
  onUpdateNote,
  onDeleteProject,
  onWidthChange,
  onToggleReadingFilter,
  onStartReview,
  onExitReview,
  onNewProjectClick,
  onCloseProject
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
      <Stack spacing={1.5} sx={{ p: 2, pt: 2.5 }}>
        {/* Row 1: title */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography
            sx={{
              fontWeight: 500,
              letterSpacing: "0.04em",
              fontSize: "1rem",
              color: "text.primary"
            }}>
            lime
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Row 2: navigation icons — 📂 left, 📚 centered */}
        <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Tooltip title="项目管理">
            <IconButton
              size="small"
              onClick={() => { if (reviewMode) onExitReview() }}
              sx={{
                color: reviewMode ? "text.secondary" : "primary.main",
                "&:hover": { color: "primary.main" }
              }}>
              <FolderOpenRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)"
            }}>
            <Tooltip title="间隔复习">
              <IconButton
                size="small"
                onClick={() => { if (!reviewMode) onStartReview() }}
                sx={{
                  color: reviewMode ? "primary.main" : "text.secondary",
                  "&:hover": { color: "primary.main" }
                }}>
                <Badge
                  badgeContent={dueCount}
                  color="error"
                  invisible={dueCount === 0}
                  sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", height: 16, minWidth: 16, right: -6, top: 0 } }}>
                  <SchoolRoundedIcon sx={{ fontSize: 22 }} />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Thick divider */}
        <Box
          sx={{
            borderBottom: "3px solid",
            borderColor: "primary.main",
            mx: 0.5
          }}
        />

        {reviewMode ? (
          /* Review tab content */
          <Stack spacing={2.5} alignItems="center" sx={{ py: 2 }}>
            <SchoolRoundedIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.6 }} />
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 500, mb: 0.5 }}>
                间隔复习
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {dueCount > 0 ? `${dueCount} 张卡片等待复习` : "没有待复习的卡片"}
              </Typography>
            </Box>
          </Stack>
        ) : (
          /* Project tab content */
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden"
            }}>
            {projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                active={activeProjectId === p.id}
                onOpen={() => onOpenProject(p.id)}
                onRename={(name) => onRenameProject(p.id, name)}
                onUpdateNote={(note) => onUpdateNote(p.id, note)}
                onDelete={() => onDeleteProject(p.id)}
                onCloseProject={onCloseProject}
              />
            ))}
            {projects.length === 0 && (
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  暂无项目
                </Typography>
              </Box>
            )}
            {/* "+" tab — always last */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              onClick={onNewProjectClick}
              sx={{
                px: 1.5,
                py: 0.5,
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "action.hover",
                  "& .new-project-icon": { color: "primary.main" }
                }
              }}>
              <AddRoundedIcon
                className="new-project-icon"
                sx={{ fontSize: 16, color: "text.secondary", transition: "color 0.15s" }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  flex: 1
                }}>
                新建项目
              </Typography>
            </Stack>
          </Box>
        )}

        {!reviewMode && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              cursor: "pointer",
              bgcolor: readingFilter ? "action.selected" : "transparent",
              "&:hover": { bgcolor: "action.hover" }
            }}
            onClick={onToggleReadingFilter}>
            <BookmarkBorderRoundedIcon
              sx={{ fontSize: 17, color: readingFilter ? "primary.main" : "text.secondary" }}
            />
            <Typography
              variant="body2"
              sx={{ fontSize: "0.8rem", color: readingFilter ? "primary.main" : "text.secondary" }}>
              稍后阅读
            </Typography>
          </Stack>
        )}
      </Stack>
    </Drawer>
  )
}

interface ProjectRowProps {
  project: Project
  active: boolean
  onOpen: () => void
  onRename: (name: string) => void
  onUpdateNote: (note: string) => void
  onDelete: () => void
  onCloseProject: () => void
}

function ProjectRow({
  project,
  active,
  onOpen,
  onRename,
  onUpdateNote,
  onDelete,
  onCloseProject
}: ProjectRowProps) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(project.name)
  const [draftNote, setDraftNote] = useState(project.note ?? "")
  const [confirming, setConfirming] = useState(false)

  const commitRename = () => {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== project.name) onRename(trimmed)
    else setDraftName(project.name)
    setEditing(false)
  }

  if (editing) {
    return (
      <Box sx={{ px: 1.5, py: 1, bgcolor: "action.selected" }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="项目名称"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename()
            if (e.key === "Escape") {
              setDraftName(project.name)
              setEditing(false)
            }
          }}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label="备注"
          placeholder="可选"
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={() => { setEditing(false); setDraftName(project.name); setDraftNote(project.note ?? "") }}>
            取消
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              commitRename()
              if (draftNote !== (project.note ?? "")) onUpdateNote(draftNote.trim())
            }}>
            保存
          </Button>
        </Stack>
      </Box>
    )
  }

  if (confirming) {
    return (
      <Box
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: "action.selected",
          "&:hover": { bgcolor: "action.selected" }
        }}>
        <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
          删除「{project.name}」？该项目的所有卡片也将一并删除。
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={() => setConfirming(false)}>
            取消
          </Button>
          <Button
            size="small"
            color="error"
            variant="contained"
            onClick={() => { setConfirming(false); onDelete() }}>
            删除
          </Button>
        </Stack>
      </Box>
    )
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1.5,
        py: 0.5,
        cursor: "pointer",
        "&:hover": {
          bgcolor: active ? "primary.dark" : "action.hover"
        },
        bgcolor: active ? "primary.main" : "transparent"
      }}
      onClick={active ? undefined : onOpen}>
      <FolderOpenRoundedIcon
        sx={{
          fontSize: 16,
          color: active ? "primary.contrastText" : "text.secondary"
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{
            fontSize: "0.8rem",
            fontWeight: active ? 600 : 400,
            color: active ? "primary.contrastText" : "text.primary"
          }}>
          {project.name}
        </Typography>
        {project.note && (
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: active ? "rgba(255,255,255,0.7)" : "text.secondary",
              display: "block",
              fontSize: "0.65rem"
            }}>
            {project.note}
          </Typography>
        )}
      </Box>
      {active ? (
        <Tooltip title="关闭项目">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onCloseProject() }}
            sx={{ color: "primary.contrastText", opacity: 0.8, "&:hover": { opacity: 1 } }}>
            <CloseRoundedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      ) : (
        <Box
          sx={{ display: "flex", gap: 0.25, opacity: 0.6, "&:hover": { opacity: 1 } }}
          onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" onClick={() => { setDraftName(project.name); setDraftNote(project.note ?? ""); setEditing(true) }}>
            <EditRoundedIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setConfirming(true)}>
            <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      )}
    </Stack>
  )
}
