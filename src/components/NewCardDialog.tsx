import { TextField, Typography } from "@mui/material"

import DialogShell from "./DialogShell"

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
    <DialogShell
      open={open}
      onClose={onClose}
      title="新建卡片"
      confirmLabel="保存"
      onConfirm={onSave}
      confirmDisabled={!content.trim()}>
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
    </DialogShell>
  )
}
