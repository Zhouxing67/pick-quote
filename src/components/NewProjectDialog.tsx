import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from "@mui/material"

interface NewProjectDialogProps {
  open: boolean
  name: string
  error: string | null
  onNameChange: (v: string) => void
  onClose: () => void
  onCreate: () => void
}

export default function NewProjectDialog({
  open,
  name,
  error,
  onNameChange,
  onClose,
  onCreate
}: NewProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ py: 2.5, px: 3, fontSize: "1rem" }}>
        新建项目
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="项目名称"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          error={Boolean(error)}
          helperText={error}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
              fontSize: "0.85rem"
            },
            "& .MuiFormHelperText-root": {
              whiteSpace: "normal",
              wordBreak: "break-word"
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          disabled={!name.trim()}
          onClick={onCreate}
          sx={{ borderRadius: 1 }}>
          创建
        </Button>
      </DialogActions>
    </Dialog>
  )
}
