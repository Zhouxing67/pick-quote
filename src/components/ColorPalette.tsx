import { Box, Popover, Stack, Tooltip, Typography } from "@mui/material"

import { palettes } from "../theme"
import type { PresetName } from "../types"
import { PRESET_LABELS } from "../types"

interface ColorPaletteProps {
  open: boolean
  anchorEl: HTMLElement | null
  preset: PresetName
  onClose: () => void
  onChange: (name: PresetName) => void
}

export default function ColorPalette({
  open,
  anchorEl,
  preset,
  onClose,
  onChange
}: ColorPaletteProps) {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "center", horizontal: "right" }}
      transformOrigin={{ vertical: "center", horizontal: "left" }}
      slotProps={{ paper: { sx: { borderRadius: 1, p: 1.5, mt: 0.5 } } }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", display: "block", mb: 1 }}>
        配色
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center">
        {(Object.keys(PRESET_LABELS) as PresetName[]).map((name) => (
          <Tooltip key={name} title={PRESET_LABELS[name]}>
            <Box
              onClick={() => { onChange(name); onClose() }}
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": { transform: "scale(1.2)" },
                border: "2px solid",
                borderColor: preset === name ? "primary.main" : "transparent",
                bgcolor: palettes[name].primary.main
              }}
            />
          </Tooltip>
        ))}
      </Stack>
    </Popover>
  )
}
