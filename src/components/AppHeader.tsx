import AddRoundedIcon from "@mui/icons-material/AddRounded"
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded"
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded"
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded"
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded"
import UnarchiveRoundedIcon from "@mui/icons-material/UnarchiveRounded"
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material"
import type { MutableRefObject } from "react"

import type { Project } from "../types"

interface AppHeaderProps {
  drawerOpen: boolean
  selectMode: boolean
  swapMode: boolean
  importing: boolean
  headerHeight: number
  hasActiveProject: boolean
  activeProject: Project | null
  onClearProject: () => void
  onToggleDrawer: () => void
  onPaletteClick: (e: React.MouseEvent<HTMLElement>) => void
  fileInputRef: MutableRefObject<HTMLInputElement | null>
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggleSelectMode: () => void
  onToggleSwapMode: () => void
  onNewCard: () => void
}

export default function AppHeader({
  drawerOpen,
  selectMode,
  swapMode,
  importing,
  headerHeight,
  hasActiveProject,
  activeProject,
  onClearProject,
  onToggleDrawer,
  onPaletteClick,
  fileInputRef,
  onImport,
  onToggleSelectMode,
  onToggleSwapMode,
  onNewCard
}: AppHeaderProps) {
  return (
    <Box
      sx={(theme) => ({
        position: "sticky",
        top: 0,
        zIndex: 1100,
        bgcolor:
          theme.palette.mode === "dark"
            ? "rgba(18, 18, 18, 0.85)"
            : "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        height: headerHeight,
        display: "flex",
        alignItems: "center"
      })}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ width: "100%" }}>
        <Tooltip title={drawerOpen ? "关闭项目面板" : "打开项目面板"}>
          <IconButton
            size="small"
            onClick={onToggleDrawer}
            sx={{
              color: drawerOpen ? "primary.main" : "text.secondary",
              transition: "color 0.2s",
              "&:hover": { color: "primary.main" }
            }}>
            <FilterListRoundedIcon />
          </IconButton>
        </Tooltip>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
              lineHeight: 1
            }}>
            lime
          </Typography>
          {activeProject && (
            <Chip
              label={activeProject.name}
              size="small"
              color="primary"
              onDelete={onClearProject}
              sx={{ borderRadius: 1.5, ml: 0.5, height: 24 }}
            />
          )}
        </Stack>
        <Tooltip title="配色">
          <IconButton
            size="small"
            onClick={onPaletteClick}
            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
            <PaletteRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="导入 ZIP">
          <IconButton
            size="small"
            component="label"
            disabled={importing}
            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
            <UnarchiveRoundedIcon sx={{ fontSize: 20 }} />
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".zip"
              onChange={onImport}
            />
          </IconButton>
        </Tooltip>
        <Tooltip title={swapMode ? "退出交换" : "交换卡片"}>
          <IconButton
            size="small"
            onClick={onToggleSwapMode}
            sx={{ color: swapMode ? "primary.main" : "text.secondary", "&:hover": { color: "primary.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
            <SwapHorizRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        {hasActiveProject && (
          <Tooltip title="新建卡片">
            <IconButton
              size="small"
              onClick={onNewCard}
              sx={{ color: "text.secondary", "&:hover": { color: "primary.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
              <AddRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={selectMode ? "取消选择" : "选择卡片"}>
          <IconButton
            size="small"
            disabled={!hasActiveProject}
            onClick={onToggleSelectMode}
            sx={{ color: selectMode ? "error.main" : "text.secondary", "&:hover": { color: "error.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
            <DoneAllRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  )
}
