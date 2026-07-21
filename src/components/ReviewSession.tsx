import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded"
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded"
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material"
import { useCallback, useEffect, useState } from "react"

import { rateCard } from "../hooks/useSrs"
import type { Item } from "../types"
import { prettyUrl } from "../utils"

interface ReviewSessionProps {
  items: Item[]
  masteredCount: number
  onSave: (item: Item) => Promise<void>
  onExit: () => void
  onProgress?: (current: number, total: number) => void
}

const LABELS = ["重来", "困难", "良好", "简单"]
const COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6"]
const TYPE_LABEL: Record<string, string> = {
  text: "文本",
  image: "图片",
  link: "链接"
}

export default function ReviewSession({
  items,
  masteredCount,
  onSave,
  onExit,
  onProgress
}: ReviewSessionProps) {
  const [queue, setQueue] = useState<Item[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [ratings, setRatings] = useState<number[]>([])
  const [slideDir, setSlideDir] = useState<1 | -1>(1)

  // Reset session state when items prop changes (new review set)
  useEffect(() => {
    setQueue([...items])
    setIndex(0)
    setFlipped(false)
    setTransitioning(false)
    setCompleted(false)
    setRatings([])
  }, [items])

  const dueCount = items.length

  // Report progress to parent for AppHeader display
  useEffect(() => {
    onProgress?.(index + 1, dueCount)
  }, [index, dueCount, onProgress])

  const current = queue[index] ?? null

  const handleFlip = useCallback(() => {
    if (!transitioning) {
      setFlipped((prev) => !prev)
    }
  }, [transitioning])

  const handleRate = useCallback(
    async (rating: 1 | 2 | 3 | 4) => {
      if (!current || transitioning) return
      setSlideDir(1)
      setTransitioning(true)
      const updated = rateCard(current, rating)
      setRatings((prev) => [...prev, rating])

      await onSave(updated)

      // Anki-like: rating < 3 re-queues the card for later in this session
      if (rating < 3 && index + 1 < queue.length) {
        setTimeout(() => {
          setQueue((prev) => {
            const without = prev.filter((_, i) => i !== index)
            return [...without, updated]
          })
          setFlipped(false)
          setTransitioning(false)
          // index stays — next card shifts into current position
        }, 350)
      } else if (index + 1 >= queue.length) {
        setTimeout(() => {
          setCompleted(true)
          setTransitioning(false)
        }, 300)
      } else {
        setTimeout(() => {
          setFlipped(false)
          setTransitioning(false)
          setIndex((i) => i + 1)
        }, 350)
      }
    },
    [current, transitioning, index, queue.length, onSave]
  )

  const handlePrev = useCallback(() => {
    if (index > 0 && !transitioning) {
      setSlideDir(-1)
      setTransitioning(true)
      setFlipped(false)
      setTimeout(() => {
        setIndex((i) => i - 1)
        setTransitioning(false)
      }, 350)
    }
  }, [index, transitioning])

  const handleNext = useCallback(() => {
    if (index < queue.length - 1 && !transitioning) {
      setSlideDir(1)
      setTransitioning(true)
      setFlipped(false)
      setTimeout(() => {
        setIndex((i) => i + 1)
        setTransitioning(false)
      }, 350)
    }
  }, [index, queue.length, transitioning])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (completed) return
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handleFlip()
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault()
        const r = Number(e.key) as 1 | 2 | 3 | 4
        if (flipped) handleRate(r)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [flipped, completed, handleFlip, handleRate])

  if (completed) {
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : 0
    const goodCount = ratings.filter((r) => r >= 3).length
    const accuracy = dueCount > 0 ? goodCount / dueCount : 0
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 10,
          maxWidth: 400,
          mx: "auto"
        }}>
        <Typography sx={{ fontSize: "4rem", mb: 2, lineHeight: 1 }}>
          {accuracy >= 0.8 ? "🎉" : accuracy >= 0.5 ? "👍" : "💪"}
        </Typography>
        <Typography variant="h5" sx={{ mb: 4, fontWeight: 500, letterSpacing: "0.04em" }}>
          复习完成
        </Typography>
        <Box
          sx={{
            width: "100%",
            bgcolor: "action.hover",
            borderRadius: 2,
            p: 3,
            mb: 3
          }}>
          <Stack direction="row" justifyContent="space-around">
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: "success.main" }}>
                {Math.round(accuracy * 100)}%
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                准确率
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: "primary.main" }}>
                {dueCount}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                复习卡片
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: "secondary.main" }}>
                {masteredCount}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                已掌握
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Stack spacing={0.5} sx={{ mb: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            熟悉率 {goodCount}/{dueCount} · 平均评分 {avgRating.toFixed(1)}
          </Typography>
          {masteredCount > 0 && (
            <Typography variant="body2" sx={{ color: "success.main", fontWeight: 500 }}>
              累计已掌握 {masteredCount} 张卡片
            </Typography>
          )}
        </Stack>
        <Button variant="outlined" onClick={onExit} sx={{ borderRadius: 1, px: 4 }}>
          退出复习
        </Button>
      </Box>
    )
  }

  if (!current) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 10
        }}>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 2 }}>
          没有待复习的卡片
        </Typography>
        <Button variant="outlined" onClick={onExit} sx={{ borderRadius: 1 }}>
          退出复习
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        maxWidth: 832,
        mx: "auto",
        mt: 8,
        animation: transitioning
          ? "reviewSlideOut 0.3s ease-in forwards"
          : "reviewSlideIn 0.35s ease-out"
      }}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutLeft {
          to { opacity: 0; transform: translateX(-60px); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
          to { opacity: 0; transform: translateX(60px); }
        }
      `}</style>

      <Box sx={{ position: "relative", mb: 3 }}>
        <IconButton
          disabled={index === 0}
          onClick={handlePrev}
          sx={{
            position: "absolute",
            left: -64,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 2,
            "&:hover": { bgcolor: "action.hover" }
          }}>
          <ChevronLeftRoundedIcon sx={{ fontSize: 28 }} />
        </IconButton>
        <IconButton
          disabled={index >= queue.length - 1}
          onClick={handleNext}
          sx={{
            position: "absolute",
            right: -64,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 2,
            "&:hover": { bgcolor: "action.hover" }
          }}>
          <ChevronRightRoundedIcon sx={{ fontSize: 28 }} />
        </IconButton>

        <Box
          onDoubleClick={() => { /* no double click */ }}
          onClick={handleFlip}
          sx={{
            position: "relative",
            minHeight: 520,
            cursor: "pointer",
            animation: transitioning
              ? `slideOut${slideDir === 1 ? "Left" : "Right"} 0.3s ease-in forwards`
              : `slideIn${slideDir === 1 ? "Right" : "Left"} 0.35s ease-out`
          }}>
          {/* Front — fades out when flipped */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              opacity: flipped ? 0 : 1,
              pointerEvents: flipped ? "none" : "auto",
              transition: "opacity 0.3s ease",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              boxShadow: (theme) =>
                theme.palette.mode === "light"
                  ? "0 8px 32px rgba(0,0,0,0.06)"
                  : "0 8px 32px rgba(0,0,0,0.25)",
              p: 5,
              display: "flex",
              flexDirection: "column"
            }}>
            <Chip
              label={TYPE_LABEL[current.type] ?? "文本"}
              size="small"
              variant="outlined"
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 500,
                letterSpacing: "0.04em"
              }}
            />
            <Box sx={{ flex: 1, overflow: "auto", minHeight: 0, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 }, "&::-webkit-scrollbar-track": { bgcolor: "transparent" } }}>
              {current.type === "image" ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 200
                  }}>
                  <img
                    src={current.content}
                    alt={current.source?.title || ""}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 340,
                      borderRadius: 10,
                      objectFit: "contain"
                    }}
                  />
                </Box>
              ) : current.type === "link" && current.source?.url ? (
                <Typography
                  component="a"
                  href={current.source.url}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    fontSize: "1.1rem",
                    lineHeight: 1.8,
                    wordBreak: "break-word",
                    color: "primary.main",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                    mb: 1
                  }}>
                  {current.source.title || prettyUrl(current.source.url)}
                </Typography>
              ) : (
                <Box sx={{ pl: 2, borderLeft: "4px solid", borderLeftColor: "primary.main" }}>
                  <Typography
                    sx={{
                      fontSize: "1.25rem",
                      lineHeight: 1.9,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: '"LXGW WenKai", "Noto Serif SC", "Songti SC", serif',
                      color: "text.primary",
                      fontStyle: "italic"
                    }}>
                    {current.content}
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography
              variant="caption"
              sx={{ mt: 2, color: "text.disabled", textAlign: "center", fontSize: "0.7rem", letterSpacing: "0.04em", flexShrink: 0 }}>
              ⌄ 点击翻转
            </Typography>
          </Box>

          {/* Back — fades in when flipped */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              overflow: "auto",
              opacity: flipped ? 1 : 0,
              pointerEvents: flipped ? "auto" : "none",
              transition: "opacity 0.3s ease",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              boxShadow: (theme) =>
                theme.palette.mode === "light"
                  ? "0 8px 32px rgba(0,0,0,0.06)"
                  : "0 8px 32px rgba(0,0,0,0.25)",
              p: 5,
              display: "flex",
              flexDirection: "column",
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
              "&::-webkit-scrollbar-track": { bgcolor: "transparent" }
            }}>
            <Typography
              variant="subtitle2"
              sx={{ color: "text.disabled", mb: 1.5, fontSize: "0.75rem", letterSpacing: "0.04em" }}>
              笔记
            </Typography>
            {current.note ? (
              <Typography
                sx={{
                  fontSize: "1rem",
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "text.primary",
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  px: 2,
                  py: 1.5,
                  mb: 2
                }}>
                {current.note}
              </Typography>
            ) : (
              <Typography
                sx={{
                  fontSize: "0.9rem",
                  color: "text.disabled",
                  fontStyle: "italic",
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  px: 2,
                  py: 1.5,
                  mb: 2
                }}>
                暂无笔记
              </Typography>
            )}

            {current.tags && current.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {current.tags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1, fontSize: "0.7rem", height: 22 }}
                  />
                ))}
              </Stack>
            )}

            {current.source?.url && (
              <Typography
                variant="body2"
                component="a"
                href={current.source.url}
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                  fontSize: "0.8rem",
                  wordBreak: "break-word",
                  mt: "auto",
                  pt: 2,
                  borderTop: "1px solid",
                  borderColor: "divider"
                }}>
                ↗ {current.source.title || prettyUrl(current.source.url)}
              </Typography>
            )}
          </Box>
        </Box>
    </Box>

      {/* Rating buttons — visible only after flip */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 1,
          opacity: flipped ? 1 : 0,
          transform: flipped ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: flipped ? "auto" : "none"
        }}>
        {LABELS.map((label, i) => {
          const rating = (i + 1) as 1 | 2 | 3 | 4
          return (
            <Tooltip key={label} title={`快捷键 ${i + 1}`}>
              <Button
                variant="outlined"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation()
                  handleRate(rating)
                }}
                sx={{
                  borderRadius: 1.5,
                  borderColor: COLORS[i],
                  color: COLORS[i],
                  fontSize: "0.78rem",
                  py: 0.75,
                  minWidth: 0,
                  "&:hover": {
                    bgcolor: `${COLORS[i]}14`,
                    borderColor: COLORS[i]
                  }
                }}>
                <Box component="span" sx={{ mr: 0.5, opacity: 0.5, fontSize: "0.7rem" }}>
                  {i + 1}
                </Box>
                {label}
              </Button>
            </Tooltip>
          )
        })}
      </Box>
    </Box>
  )
}
