import { alpha } from "@mui/material/styles"
import { useState } from "react"

import BackupRoundedIcon from "@mui/icons-material/BackupRounded"
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded"
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded"
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded"
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded"
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded"
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined"
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"

import type { Project } from "../types"
import type { ReviewStats } from "../hooks/useSrs"

interface SidebarFiltersProps {
  open: boolean
  width: number
  projects: Project[]
  activeProjectId: string | null
  readingFilter: boolean
  dueCount: number
  sidebarTab: "projects" | "review" | "backup"
  tags: string[]
  activeTag: string
  backupSelectedIds: string[]
  syncStatus: string
  reviewStats: ReviewStats
  previewCount: number
  onPreview: (count: number) => void
  recentDates: { key: string; label: string; count: number }[]
  reviewDateFilter: string | null
  onReviewDateClick: (dateKey: string | null) => void
  onTagSelect: (tag: string) => void
  onClose: () => void
  onOpenProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
  onUpdateNote: (id: string, note: string) => void
  onDeleteProject: (id: string) => void
  onWidthChange: (w: number) => void
  onToggleReadingFilter: () => void
  onSetSidebarTab: (tab: "projects" | "review" | "backup") => void
  onNewProjectClick: () => void
  onCloseProject: () => void
  onToggleBackup: (id: string) => void
  onToggleBackupAll: () => void
  onExportBackup: () => void
  onImportBackup: () => void
  onUploadSync: () => void
  onDownloadSync: () => void
}

export default function SidebarFilters({
  open,
  width,
  projects,
  activeProjectId,
  readingFilter,
  dueCount,
  sidebarTab,
  tags,
  activeTag,
  backupSelectedIds,
  syncStatus,
  reviewStats,
  previewCount,
  onPreview,
  recentDates,
  reviewDateFilter,
  onReviewDateClick,
  onTagSelect,
  onClose,
  onOpenProject,
  onRenameProject,
  onUpdateNote,
  onDeleteProject,
  onWidthChange,
  onToggleReadingFilter,
  onSetSidebarTab,
  onNewProjectClick,
  onCloseProject,
  onToggleBackup,
  onToggleBackupAll,
  onExportBackup,
  onImportBackup,
  onUploadSync,
  onDownloadSync
}: SidebarFiltersProps) {
  return (
    <>
    <style>{`@keyframes sidebarFadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
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
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.1 : 0.04),
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

        {/* Row 2: navigation icons — 📂 left, 📚 centered, 💾 right */}
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Tooltip title="项目管理">
            <IconButton
              size="small"
              onClick={() => onSetSidebarTab("projects")}
              sx={{
                color: sidebarTab === "projects" ? "primary.main" : "text.secondary",
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
              onClick={() => onSetSidebarTab("review")}
                sx={{
                  color: sidebarTab === "review" ? "primary.main" : "text.secondary",
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
          <Tooltip title="备份与同步">
            <IconButton
              size="small"
              onClick={() => onSetSidebarTab("backup")}
              sx={{
                color: sidebarTab === "backup" ? "primary.main" : "text.secondary",
                "&:hover": { color: "primary.main" }
              }}>
              <BackupRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Thick divider */}
        <Box
          sx={{
            borderBottom: "3px solid",
            borderColor: "primary.main",
            mx: 0.5
          }}
        />

        {sidebarTab === "review" ? (
          /* Review tab content */
          <Stack spacing={1.5} sx={{ p: 2, pt: 3 }}>
            <Typography variant="h6" sx={{ fontSize: "0.9rem", fontWeight: 600, textAlign: "center", mb: 0.5 }}>
              🔄 间隔复习
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", flex: 1 }}>
                待复习 {dueCount} 张 · 掌握 {reviewStats.masteredCount} 张
              </Typography>
            </Box>
            {reviewStats.totalReviews > 0 && (
              <Box sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}>
                  📊 复习概况
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                  累计 {reviewStats.totalReviews} 次 · 准确率 {Math.round(reviewStats.accuracyRate * 100)}%
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                  连续打卡 {reviewStats.streakDays} 天
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}>
                📊 今日评分
              </Typography>
              <Stack spacing={0.5}>
                {(
                  [
                    { label: "重来", color: "#ef4444" },
                    { label: "困难", color: "#f97316" },
                    { label: "良好", color: "#22c55e" },
                    { label: "简单", color: "#3b82f6" }
                  ] as const
                ).map(({ label, color }, i) => {
                  const count = reviewStats.todayRatingDistribution[i]
                  const total = reviewStats.todayRatingDistribution.reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? (count / total) * 100 : 0
                  return (
                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: "0.7rem", width: 28, flexShrink: 0 }}>
                        {label}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          flex: 1, height: 6, borderRadius: 3,
                          bgcolor: "divider",
                          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 }
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: "0.65rem", width: 20, textAlign: "right", color: "text.secondary" }}>
                        {count}
                      </Typography>
                    </Box>
                  )
                })}
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}>
                🔍 预习
              </Typography>
              <Stack direction="row" spacing={1}>
                {[5, 10, 15].map((n) => (
                  <Button
                    key={n}
                    size="small"
                    variant={previewCount === n ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => onPreview(n)}
                    sx={{ borderRadius: 1, fontSize: "0.7rem" }}>
                    {n}张
                  </Button>
                ))}
              </Stack>
            </Box>
            {recentDates.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 0.5 }}>
                  📖 近期回顾
                </Typography>
                <Stack spacing={0.5}>
                  {recentDates.map((item) => (
                    <Button
                      key={item.key}
                      size="small"
                      variant={reviewDateFilter === item.key ? "contained" : "outlined"}
                      fullWidth
                      onClick={() => onReviewDateClick(reviewDateFilter === item.key ? null : item.key)}
                      sx={{ borderRadius: 1, fontSize: "0.75rem", justifyContent: "flex-start" }}>
                      {item.label} · {item.count} 张
                    </Button>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        ) : sidebarTab === "backup" ? (
          /* Backup & Sync tab content */
          <Box sx={{ py: 1 }}>
            <Typography
              variant="caption"
              sx={{ px: 1, mb: 1, display: "block", fontSize: "0.7rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.04em" }}>
              本地备份
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={backupSelectedIds.length === projects.length && projects.length > 0}
                  indeterminate={backupSelectedIds.length > 0 && backupSelectedIds.length < projects.length}
                  onChange={onToggleBackupAll}
                />
              }
              label={<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>全选（{projects.length} 个项目）</Typography>}
              sx={{ mx: 0, width: "100%", px: 1 }}
            />
            <Box sx={{ maxHeight: 180, overflowY: "auto", px: 1, mb: 1.5 }}>
              {projects.map((p) => (
                <FormControlLabel
                  key={p.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={backupSelectedIds.includes(p.id)}
                      onChange={() => onToggleBackup(p.id)}
                    />
                  }
                  label={<Typography variant="body2" noWrap sx={{ fontSize: "0.8rem" }}>{p.name}</Typography>}
                  sx={{ mx: 0, width: "100%" }}
                />
              ))}
            </Box>
            <Stack direction="row" spacing={1} sx={{ px: 1, mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadRoundedIcon />}
                disabled={backupSelectedIds.length === 0}
                onClick={onExportBackup}
                fullWidth>
                导出备份
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileUploadRoundedIcon />}
                onClick={onImportBackup}
                fullWidth>
                导入备份
              </Button>
            </Stack>

            <Divider sx={{ mx: 1 }} />

            <Typography
              variant="caption"
              sx={{ px: 1, my: 1.5, display: "block", fontSize: "0.7rem", fontWeight: 600, color: "text.secondary", letterSpacing: "0.04em" }}>
              坚果云同步
            </Typography>
            <Typography variant="caption" sx={{ px: 1, display: "block", color: "text.secondary", mb: 1 }}>
              {syncStatus || "未同步"}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ px: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudUploadRoundedIcon />}
                onClick={onUploadSync}
                fullWidth>
                上传
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudDownloadRoundedIcon />}
                onClick={onDownloadSync}
                fullWidth>
                下载
              </Button>
            </Stack>
          </Box>
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

        {sidebarTab === "projects" && activeProjectId && tags.length > 0 && (
          <Box sx={{ px: 1.5, mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
              <LabelOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 500 }}>
                标签
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {tags.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  variant={activeTag === t ? "filled" : "outlined"}
                  color={activeTag === t ? "primary" : "default"}
                  onClick={() => onTagSelect(activeTag === t ? "" : t)}
                  sx={{ borderRadius: 1, height: 22, fontSize: "0.7rem" }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {sidebarTab === "projects" && (
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
    </>
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
          pl: 1.5,
          pr: 1.5,
          py: 0.5,
          cursor: "pointer",
          borderLeft: "3px solid",
          borderColor: active ? "primary.main" : "transparent",
          "&:hover": {
            bgcolor: "action.hover"
          },
          bgcolor: "transparent"
        }}
        onClick={active ? undefined : onOpen}>
        <FolderOpenRoundedIcon
          sx={{
            fontSize: 16,
            color: active ? "primary.main" : "text.secondary"
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontSize: "0.8rem",
              fontWeight: active ? 600 : 400,
              color: "text.primary"
            }}>
            {project.name}
          </Typography>
          {project.note && (
            <Typography
              variant="caption"
              noWrap
              sx={{
                color: "text.secondary",
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
              sx={{ color: "text.secondary", opacity: 0.8, "&:hover": { opacity: 1 } }}>
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
