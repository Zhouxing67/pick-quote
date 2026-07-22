import DateRangeRoundedIcon from "@mui/icons-material/DateRangeRounded"
import { Box, Button, IconButton, Popover, Stack, TextField, Tooltip, Typography } from "@mui/material"
import { useCallback, useMemo, useRef, useState } from "react"

interface DateRangeFilterProps {
  value: { from?: number; to?: number } | null
  onChange: (range: { from?: number; to?: number } | null) => void
}

function toDateInput(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function fromDateInput(s: string): number {
  return new Date(s + "T00:00:00").getTime()
}

const ONE_YEAR_MS = 365 * 86400000

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const iconRef = useRef<HTMLButtonElement>(null)

  const today = useMemo(() => toDateInput(Date.now()), [])
  const minDate = useMemo(() => toDateInput(Date.now() - ONE_YEAR_MS), [])

  const [startDraft, setStartDraft] = useState(value ? toDateInput(value.from ?? Date.now() - ONE_YEAR_MS) : "")
  const [endDraft, setEndDraft] = useState(value ? toDateInput(value.to ?? Date.now()) : "")

  const open = Boolean(anchorEl)

  const handleOpen = () => {
    if (value) {
      // Reset filter
      onChange(null)
      return
    }
    setStartDraft("")
    setEndDraft("")
    setAnchorEl(iconRef.current)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleApply = useCallback(() => {
    if (!startDraft && !endDraft) {
      onChange(null)
    } else {
      const from = startDraft ? fromDateInput(startDraft) : undefined
      let to = endDraft ? fromDateInput(endDraft) : undefined
      if (to && to > Date.now()) to = Date.now()
      onChange({ from, to })
    }
    handleClose()
  }, [startDraft, endDraft, onChange])

  const handleClear = () => {
    setStartDraft("")
    setEndDraft("")
    onChange(null)
    handleClose()
  }

  return (
    <>
      <Tooltip title={value ? "清除日期筛选" : "日期筛选"}>
        <IconButton
          ref={iconRef}
          size="small"
          onClick={handleOpen}
          sx={{
            p: 0.75,
            color: value ? "primary.main" : "text.secondary",
            "&:hover": { color: "primary.main" }
          }}>
          <DateRangeRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <Stack spacing={1.5} sx={{ p: 2, minWidth: 220 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            日期筛选
          </Typography>
          <TextField
            label="开始日期"
            type="date"
            size="small"
            value={startDraft}
            onChange={(e) => setStartDraft(e.target.value)}
            inputProps={{ max: endDraft || today, min: minDate }}
            InputLabelProps={{ shrink: true }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }}
          />
          <TextField
            label="结束日期"
            type="date"
            size="small"
            value={endDraft}
            onChange={(e) => setEndDraft(e.target.value)}
            inputProps={{ max: today, min: startDraft || minDate }}
            InputLabelProps={{ shrink: true }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={handleClear} sx={{ borderRadius: 1 }}>
              清除
            </Button>
            <Button size="small" variant="contained" onClick={handleApply} sx={{ borderRadius: 1 }}>
              应用
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  )
}
