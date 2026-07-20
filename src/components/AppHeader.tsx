import AddRoundedIcon from "@mui/icons-material/AddRounded"
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded"
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded"
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded"
import UnarchiveRoundedIcon from "@mui/icons-material/UnarchiveRounded"
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material"
import type { MutableRefObject } from "react"

interface AppHeaderProps {
  drawerOpen: boolean
  selectMode: boolean
  swapMode: boolean
  importing: boolean
  headerHeight: number
  hasActiveProject: boolean
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
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100,
        bgcolor: "background.default",
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        height: headerHeight,
        display: "flex",
        alignItems: "center"
      }}>
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
        <Typography
          variant="h5"
          sx={{
            fontSize: "1.75rem",
            fontWeight: 400,
            letterSpacing: "0.08em",
            lineHeight: 1
          }}>
          拾句
        </Typography>
        <Tooltip title="配色">
          <IconButton
            size="small"
            onClick={onPaletteClick}
            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" }, "&.Mui-focusVisible": { outline: "none" } }}>
            <PaletteRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          component="label"
          disabled={importing}
          sx={{
            borderRadius: 1,
            fontSize: "0.75rem",
            px: 1.5,
            minWidth: 0,
            color: "text.secondary"
          }}>
          <UnarchiveRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
          导入 ZIP
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".zip"
            onChange={onImport}
          />
        </Button>
        <Button
          size="small"
          sx={{
            borderRadius: 1,
            fontSize: "0.75rem",
            px: 1.5,
            minWidth: 0,
            color: swapMode ? "primary.main" : "text.secondary"
          }}
          onClick={onToggleSwapMode}>
          <SwapHorizRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
          {swapMode ? "退出交换" : "交换"}
        </Button>
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
        <Button
          size="small"
          sx={{
            borderRadius: 1,
            fontSize: "0.75rem",
            px: 1.5,
            minWidth: 0,
            color: selectMode ? "error.main" : "text.secondary"
          }}
          onClick={onToggleSelectMode}>
          {selectMode ? "取消" : "选择"}
        </Button>
      </Stack>
    </Box>
  )
}
