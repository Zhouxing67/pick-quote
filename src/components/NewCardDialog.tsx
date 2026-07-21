import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from "@mui/material"

interface NewCardDialogProps {
  open: boolean
  content: string
  onContentChange: (v: string) => void
  onClose: () => void
  onSave: () => void
}

export default function NewCardDialog({
  open,
  content,
  onContentChange,
  onClose,
  onSave
}: NewCardDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ py: 2.5, px: 3, fontSize: "1rem" }}>
        新建卡片
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 1 }}>
        <TextField
          autoFocus
          multiline
          minRows={4}
          fullWidth
          placeholder="输入卡片内容…"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
              fontSize: "1rem"
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          disabled={!content.trim()}
          onClick={onSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  )
}
