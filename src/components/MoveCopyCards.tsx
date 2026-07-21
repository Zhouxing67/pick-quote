import { Box, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Button, Typography } from "@mui/material"

import type { Project } from "../types"

export default function MoveCopyCards({
  open,
  title,
  projects,
  onSelect,
  onClose
}: {
  open: boolean
  title: string
  projects: Project[]
  onSelect: (projectId: string) => void
  onClose: () => void
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ fontSize: "1rem", py: 2.5, px: 3 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 0 }}>
        {projects.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
            没有其他项目
          </Typography>
        ) : (
          <List disablePadding sx={{ maxHeight: 300, overflowY: "auto" }}>
            {projects.map((p) => (
              <ListItemButton
                key={p.id}
                onClick={() => onSelect(p.id)}
                sx={{ borderRadius: 1, my: 0.25 }}>
                <ListItemText
                  primary={p.name}
                  secondary={p.note || undefined}
                  primaryTypographyProps={{ fontSize: "0.85rem" }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>取消</Button>
      </DialogActions>
    </Dialog>
  )
}
