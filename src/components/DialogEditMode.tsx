import AddRoundedIcon from "@mui/icons-material/AddRounded"
import { Box, Chip, Stack, TextField } from "@mui/material"
import { useState } from "react"

export default function DialogEditMode({
  draftContent,
  draftNote,
  draftTags,
  onContentChange,
  onNoteChange,
  onTagsChange
}: {
  draftContent: string
  draftNote: string
  draftTags: string[]
  onContentChange: (v: string) => void
  onNoteChange: (v: string) => void
  onTagsChange: (tags: string[]) => void
}) {
  const [tagInput, setTagInput] = useState("")

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (!t || draftTags.includes(t)) return
    onTagsChange([...draftTags, t])
    setTagInput("")
  }

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
      <Box sx={{ mt: 3 }}>
        <TextField
          size="small"
          placeholder="添加标签…"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleAddTag() }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <AddRoundedIcon
                  onClick={handleAddTag}
                  sx={{ fontSize: 18, cursor: "pointer", color: "primary.main" }}
                />
              )
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": { borderRadius: 1, fontSize: "0.85rem" }
          }}
        />
        {draftTags.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {draftTags.map((t) => (
              <Chip
                key={t}
                label={t}
                size="small"
                onDelete={() => onTagsChange(draftTags.filter((x) => x !== t))}
                sx={{ borderRadius: 1, fontSize: "0.75rem" }}
              />
            ))}
          </Stack>
        )}
      </Box>
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
