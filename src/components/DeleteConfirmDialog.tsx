import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "@mui/material"

interface DeleteConfirmDialogProps {
  open: boolean
  batch: boolean
  count: number
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteConfirmDialog({
  open,
  batch,
  count,
  onCancel,
  onConfirm
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        {batch ? "批量删除" : "确认删除"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {batch
            ? `确定要删除选中的 ${count} 条收藏吗？此操作不可撤销。`
            : "确定要删除这条收藏吗？此操作不可撤销。"}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} sx={{ borderRadius: 1 }}>
          取消
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          sx={{ borderRadius: 1 }}>
          删除
        </Button>
      </DialogActions>
    </Dialog>
  )
}
