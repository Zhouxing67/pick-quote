import AddRoundedIcon from "@mui/icons-material/AddRounded"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import {
  Box,
  Button,
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

import type { Project } from "../types"

interface SidebarFiltersProps {
  open: boolean
  width: number
  projects: Project[]
  activeProjectId: string | null
  newProjectName: string
  projectError: string | null
  onClose: () => void
  onNewProjectNameChange: (v: string) => void
  onCreateProject: () => void
  onOpenProject: (id: string) => void
  onWidthChange: (w: number) => void
}

export default function SidebarFilters({
  open,
  width,
  projects,
  activeProjectId,
  newProjectName,
  projectError,
  onClose,
  onNewProjectNameChange,
  onCreateProject,
  onOpenProject,
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
            项目
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

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
              <Stack
                key={p.id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                  bgcolor:
                    activeProjectId === p.id ? "action.selected" : "transparent"
                }}
                onClick={() => onOpenProject(p.id)}>
                <FolderOpenRoundedIcon
                  sx={{
                    fontSize: 18,
                    color: activeProjectId === p.id ? "primary.main" : "text.secondary"
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontSize: "0.85rem",
                    fontWeight: activeProjectId === p.id ? 500 : 400
                  }}>
                  {p.name}
                </Typography>
              </Stack>
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
      </Stack>
    </Drawer>
  )
}
