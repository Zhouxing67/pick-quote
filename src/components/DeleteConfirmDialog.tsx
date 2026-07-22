import { DialogContentText } from "@mui/material"

import DialogShell from "./DialogShell"

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
    <DialogShell
      open={open}
      onClose={onCancel}
      title={batch ? "批量删除" : "确认删除"}
      confirmLabel="删除"
      confirmColor="error"
      onConfirm={onConfirm}>
      <DialogContentText>
        {batch
          ? `确定要删除选中的 ${count} 条收藏吗？此操作不可撤销。`
          : "确定要删除这条收藏吗？此操作不可撤销。"}
      </DialogContentText>
    </DialogShell>
  )
}
