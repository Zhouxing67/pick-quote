import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
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

interface Template {
  label: string
  emoji: string
  contentPlaceholder: string
  prefill?: string
}

const TEMPLATES: Template[] = [
  {
    label: "空白",
    emoji: "✏️",
    contentPlaceholder: "输入卡片内容…"
  },
  {
    label: "引文",
    emoji: "📝",
    contentPlaceholder: "粘贴引文原文…",
    prefill: ""
  },
  {
    label: "知识卡片",
    emoji: "📖",
    contentPlaceholder: "概念/术语定义…",
    prefill: ""
  },
  {
    label: "Q&A",
    emoji: "❓",
    contentPlaceholder: "输入问题…",
    prefill: "Q: "
  }
]

export default function NewCardDialog({
  open,
  content,
  onContentChange,
  onClose,
  onSave
}: NewCardDialogProps) {
  const applyTemplate = (tpl: Template) => {
    if (tpl.prefill && !content.trim()) {
      onContentChange(tpl.prefill)
    }
  }

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
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {TEMPLATES.map((tpl) => (
            <Chip
              key={tpl.label}
              label={`${tpl.emoji} ${tpl.label}`}
              size="small"
              variant="outlined"
              onClick={() => applyTemplate(tpl)}
              sx={{
                borderRadius: 1.5,
                fontSize: "0.75rem",
                cursor: "pointer",
                "&:hover": { bgcolor: "action.hover" }
              }}
            />
          ))}
        </Stack>
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
