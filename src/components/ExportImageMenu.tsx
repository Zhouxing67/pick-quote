import { Menu, MenuItem } from "@mui/material"

interface ExportImageMenuProps {
  anchorEl: HTMLElement | null
  open: boolean
  onClose: () => void
  onExport: (theme: "dark" | "light") => void
}

export default function ExportImageMenu({
  anchorEl,
  open,
  onClose,
  onExport
}: ExportImageMenuProps) {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem onClick={() => onExport("dark")}>深色主题</MenuItem>
      <MenuItem onClick={() => onExport("light")}>浅色主题</MenuItem>
    </Menu>
  )
}
