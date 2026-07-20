import { Box, TextField } from "@mui/material"

export default function DialogEditMode({
  draftContent,
  draftNote,
  onContentChange,
  onNoteChange
}: {
  draftContent: string
  draftNote: string
  onContentChange: (v: string) => void
  onNoteChange: (v: string) => void
}) {
  return (
    <Box
      sx={{
        flex: 1,
        maxWidth: "680px",
        mx: "auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }}>
      <TextField
        multiline
        minRows={4}
        fullWidth
        value={draftContent}
        onChange={(e) => onContentChange(e.target.value)}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 1,
            fontSize: "1rem",
            bgcolor: "background.paper"
          }
        }}
      />
      <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
        <TextField
          multiline
          minRows={2}
          fullWidth
          placeholder="添加备注…"
          value={draftNote}
          onChange={(e) => onNoteChange(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 1,
              fontSize: "0.9rem",
              bgcolor: "background.paper"
            }
          }}
        />
      </Box>
    </Box>
  )
}
