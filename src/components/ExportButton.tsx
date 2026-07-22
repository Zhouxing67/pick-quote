import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined"
import { Box, IconButton, Tooltip } from "@mui/material"

import type { Item } from "../types"
import { useExportImage } from "../utils/useExportImage"
import ExportImageMenu from "./ExportImageMenu"
import ShareCard from "./ShareCard"

interface ExportButtonProps {
  item: Item
}

export default function ExportButton({ item }: ExportButtonProps) {
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

  return (
    <>
      <Tooltip title="导出为图片">
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); handleExportClick(e) }}
          disabled={isExporting}
          sx={{ p: 0.75 }}>
          <ImageOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <ExportImageMenu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleCloseMenu}
        onExport={handleExportImage}
      />
      <Box sx={{ position: "fixed", top: -10000, left: -10000, zIndex: -1 }}>
        <ShareCard ref={shareCardRef} item={item} theme={selectedTheme} />
      </Box>
    </>
  )
}
