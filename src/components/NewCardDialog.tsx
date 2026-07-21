import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
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
        <Typography variant="caption" sx={{ color: "text.disabled", mt: 1, display: "block" }}>
          提示：可在卡片详情中添加笔记（复习背面）和标签
        </Typography>
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
