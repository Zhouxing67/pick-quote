import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded"
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded"
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined"
import FileCopyOutlinedIcon from "@mui/icons-material/FileCopyOutlined"
import {
  Box,
  Button,
  Divider,
  Stack,
  Typography
} from "@mui/material"

interface BatchToolbarProps {
  selectedIds: string[]
  onSelectAll: () => void
  onBatchDelete: () => void
  onBatchMove: () => void
  onBatchCopy: () => void
}

export default function BatchToolbar({
  selectedIds,
  onSelectAll,
  onBatchDelete,
  onBatchMove,
  onBatchCopy
}: BatchToolbarProps) {
  return (
    <Box
      sx={{
        py: 1.5,
        px: 2,
        mb: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "background.paper",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider"
      }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
        ✅ 已选 {selectedIds.length} 条
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          size="small"
          sx={{ borderRadius: 1, fontSize: "0.75rem", whiteSpace: "nowrap" }}
          onClick={onSelectAll}>
          <DoneAllRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
          全选
            </Button>
             <Divider orientation="vertical" flexItem />
             <Button
               size="small"
               sx={{ borderRadius: 1, fontSize: "0.75rem", whiteSpace: "nowrap" }}
               disabled={selectedIds.length === 0}
               onClick={onBatchMove}>
               <DriveFileMoveOutlinedIcon sx={{ fontSize: 16, mr: 0.5 }} />
               移动到
             </Button>
             <Button
               size="small"
               sx={{ borderRadius: 1, fontSize: "0.75rem", whiteSpace: "nowrap" }}
               disabled={selectedIds.length === 0}
               onClick={onBatchCopy}>
               <FileCopyOutlinedIcon sx={{ fontSize: 16, mr: 0.5 }} />
               复制到
             </Button>
             <Divider orientation="vertical" flexItem />
             <Button
               size="small"
               variant="contained"
               color="error"
              sx={{ borderRadius: 1, fontSize: "0.75rem", whiteSpace: "nowrap" }}
              disabled={selectedIds.length === 0}
              onClick={onBatchDelete}>
               <DeleteSweepRoundedIcon sx={{ fontSize: 16, mr: 0.5 }} />
               删除选中
             </Button>
       </Stack>
    </Box>
  )
}
