import { TextField } from "@mui/material"

import DialogShell from "./DialogShell"

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
    <DialogShell
      open={open}
      onClose={onClose}
      title="新建项目"
      confirmLabel="创建"
      onConfirm={onCreate}
      confirmDisabled={!name.trim()}>
      <TextField
        autoFocus
        fullWidth
        placeholder="输入项目名称"
        value={name}
        error={Boolean(error)}
        helperText={error}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onCreate()
        }}
        sx={{
          "& .MuiOutlinedInput-root": { borderRadius: 1 },
          "& .MuiFormHelperText-root": { whiteSpace: "normal" }
        }}
      />
    </DialogShell>
  )
}
