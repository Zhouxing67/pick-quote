import { useState } from "react"

import AddRoundedIcon from "@mui/icons-material/AddRounded"
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded"
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import {
  Badge,
  Box,
  Button,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
  newProjectName: string
  projectError: string | null
  itemCounts: Record<string, number>
  readingFilter: boolean
  dueCount: number
  reviewMode: boolean
  onClose: () => void
  onNewProjectNameChange: (v: string) => void
  onCreateProject: () => void
  onOpenProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
  onUpdateNote: (id: string, note: string) => void
  onDeleteProject: (id: string) => void
  onWidthChange: (w: number) => void
  onToggleReadingFilter: () => void
  onStartReview: () => void
  onExitReview: () => void
}

export default function SidebarFilters({
  open,
  width,
  projects,
  activeProjectId,
  newProjectName,
  projectError,
  itemCounts,
  readingFilter,
  dueCount,
  reviewMode,
  onClose,
  onNewProjectNameChange,
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onUpdateNote,
  onDeleteProject,
  onWidthChange,
  onToggleReadingFilter,
  onStartReview,
  onExitReview
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

        {/* Tab buttons */}
        <Stack direction="row" spacing={0.5} justifyContent="center">
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
        </Stack>

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
            <Button
              variant="contained"
              fullWidth
              disabled={dueCount === 0}
              onClick={onStartReview}
              sx={{ borderRadius: 1 }}>
              <SchoolRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
              开始复习
            </Button>
          </Stack>
        ) : (
          /* Project tab content */
          <>
            <TextField
              placeholder="新建项目名称"
              value={newProjectName}
              onChange={(e) => onNewProjectNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreateProject()
              }}
              error={Boolean(projectError)}
              helperText={projectError}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AddRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
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
            <Button
              variant="contained"
              fullWidth
              sx={{ borderRadius: 1 }}
              onClick={onCreateProject}>
              <AddRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
              新建项目
            </Button>

            <Box>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block", mb: 1 }}>
                我的项目
              </Typography>
              <Box
                sx={{
                  maxHeight: 360,
                  overflowY: "auto",
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider"
                }}>
                {projects.map((p) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    active={activeProjectId === p.id}
                    count={itemCounts[p.id] ?? 0}
                    onOpen={() => onOpenProject(p.id)}
                    onRename={(name) => onRenameProject(p.id, name)}
                    onUpdateNote={(note) => onUpdateNote(p.id, note)}
                    onDelete={() => onDeleteProject(p.id)}
                  />
                ))}
                {projects.length === 0 && (
                  <Box sx={{ px: 1.5, py: 1 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      暂无项目，先新建一个吧
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </>
        )}

        {!reviewMode && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 1,
            cursor: "pointer",
            bgcolor: readingFilter ? "action.selected" : "transparent",
            "&:hover": { bgcolor: "action.hover" }
          }}
          onClick={onToggleReadingFilter}>
          <BookmarkBorderRoundedIcon
            sx={{ fontSize: 18, color: readingFilter ? "primary.main" : "text.secondary" }}
          />
          <Typography
            variant="body2"
            sx={{ fontSize: "0.85rem", color: readingFilter ? "primary.main" : "text.secondary" }}>
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
  count: number
  onOpen: () => void
  onRename: (name: string) => void
  onUpdateNote: (note: string) => void
  onDelete: () => void
}

function ProjectRow({
  project,
  active,
  count,
  onOpen,
  onRename,
  onUpdateNote,
  onDelete
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
        py: 1,
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" },
        bgcolor: active ? "action.selected" : "transparent"
      }}
      onClick={onOpen}>
      <FolderOpenRoundedIcon
        sx={{
          fontSize: 18,
          color: active ? "primary.main" : "text.secondary"
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{
            fontSize: "0.85rem",
            fontWeight: active ? 500 : 400
          }}>
          {project.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.disabled",
            fontSize: "0.7rem",
            mt: 0.25
          }}>
          {count} 张卡片
        </Typography>
        {project.note && (
          <Typography
            variant="caption"
            noWrap
            sx={{ color: "text.secondary", display: "block" }}>
            {project.note}
          </Typography>
        )}
      </Box>
      <Box
        sx={{ display: "flex", gap: 0.25, opacity: 0.6, "&:hover": { opacity: 1 } }}
        onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" onClick={() => { setDraftName(project.name); setDraftNote(project.note ?? ""); setEditing(true) }}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => setConfirming(true)}>
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Stack>
  )
}
