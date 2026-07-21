import CloudSyncRoundedIcon from "@mui/icons-material/CloudSyncRounded"
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded"
import PublishRoundedIcon from "@mui/icons-material/PublishRounded"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import { useEffect, useState } from "react"

import {
  addItem,
  addProject,
  clearAllItems,
  clearAllProjects,
  listProjects,
  searchItems
} from "../database"
import { palettes } from "../theme"
import type { Item, Project, PresetName } from "../types"
import { PRESET_LABELS } from "../types"
import { testConnection, runSync, downloadRemote } from "../utils/sync"
import type { SyncCredentials, SyncResult } from "../utils/sync"

export default function SettingsDialog({
  open,
  onClose,
  onDataChange,
  preset,
  onPresetChange
}: {
  open: boolean
  onClose: () => void
  onDataChange?: () => void
  preset: PresetName
  onPresetChange: (name: PresetName) => void
}) {
  const [username, setUsername] = useState("")
  const [appPassword, setAppPassword] = useState("")
  const [lastSync, setLastSync] = useState("")
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error"
    text: string
  }>({ type: "idle", text: "" })
  const [testing, setTesting] = useState(false)
  const [confirmDownload, setConfirmDownload] = useState(false)

  useEffect(() => {
    if (!open) return
    chrome.storage.sync.get(["syncUsername", "syncPassword"], (data) => {
      if (data.syncUsername) setUsername(data.syncUsername)
      if (data.syncPassword) setAppPassword(data.syncPassword)
    })
    chrome.storage.local.get("lastSyncTime", (data) => {
      setLastSync(
        data.lastSyncTime
          ? new Date(data.lastSyncTime).toLocaleString("zh-CN")
          : "从未同步"
      )
    })
  }, [open])

  const saveCredentials = (u: string, p: string) => {
    chrome.storage.sync.set({ syncUsername: u, syncPassword: p })
  }

  const cred = (): SyncCredentials | null => {
    if (!username || !appPassword) {
      setStatus({ type: "error", text: "请填写用户名和 App 密码" })
      return null
    }
    return { username, appPassword }
  }

  const handleTest = async () => {
    const c = cred()
    if (!c) return
    setTesting(true)
    setStatus({ type: "loading", text: "连接测试中…" })
    const result = await testConnection(c)
    setTesting(false)
    setStatus({ type: result.ok ? "success" : "error", text: result.message })
    if (result.ok) saveCredentials(username, appPassword)
  }

  const handleSync = async () => {
    const c = cred()
    if (!c) return
    setStatus({ type: "loading", text: "正在上传同步……" })
    saveCredentials(username, appPassword)
    try {
      const items = await searchItems({})
      const projects = await listProjects()
      const result = await runSync(c, items, projects)
      if (result.success) {
        chrome.storage.local.set({ lastSyncTime: Date.now() })
        setLastSync(new Date().toLocaleString("zh-CN"))
      }
      setStatus({
        type: result.success ? "success" : "error",
        text: result.message
      })
    } catch (e: any) {
      setStatus({ type: "error", text: `同步失败：${e.message ?? e}` })
    }
  }

  const handleDownload = async () => {
    const c = cred()
    if (!c) return
    setConfirmDownload(true)
    return
  }

  const executeDownload = async () => {
    const c = cred()
    if (!c) return
    setConfirmDownload(false)
    setStatus({ type: "loading", text: "正在从云端下载……" })
    saveCredentials(username, appPassword)
    try {
      const localItems = await searchItems({})
      const localProjects = await listProjects()
      const result = await downloadRemote(c, localItems, localProjects)
      if (!result.success || result.direction === "noop") {
        setStatus({
          type: result.success ? "success" : "error",
          text: result.message
        })
        return
      }
      const payload = result.payload!
      await clearAllItems()
      await clearAllProjects()
      for (const proj of payload.projects) {
        const p: Project = { id: proj.id, name: proj.name, createdAt: proj.createdAt }
        if (proj.note) p.note = proj.note
        await addProject(p)
      }
      for (const it of payload.items) {
        await addItem(it as Item)
      }
      chrome.storage.local.set({ lastSyncTime: Date.now() })
      setLastSync(new Date().toLocaleString("zh-CN"))
      setStatus({ type: "success", text: "下载完成，本地数据已更新" })
      onDataChange?.()
    } catch (e: any) {
      setStatus({ type: "error", text: `下载失败：${e.message ?? e}` })
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
        <Stack direction="row" spacing={1} alignItems="center">
          <CloudSyncRoundedIcon sx={{ fontSize: 20, color: "primary.main" }} />
          <span>设置</span>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.5, color: "text.secondary", fontSize: "0.85rem" }}>
          ☁ 坚果云同步
        </Typography>

        <Stack spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label="坚果云用户名（邮箱）"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }}
          />
          <TextField
            fullWidth
            size="small"
            type="password"
            label="App 密码"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              disabled={testing}
              onClick={handleTest}
              sx={{ borderRadius: 1 }}>
              {testing ? "测试中…" : "测试连接"}
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<PublishRoundedIcon />}
              onClick={handleSync}
              sx={{ borderRadius: 1 }}>
              上传到云端
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<DownloadRoundedIcon />}
              onClick={handleDownload}
              sx={{ borderRadius: 1 }}>
              从云端下载
            </Button>
          </Stack>

          {status.type !== "idle" && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                color:
                  status.type === "success"
                    ? "success.main"
                    : status.type === "error"
                      ? "error.main"
                      : "text.secondary"
              }}>
              {status.type === "loading" && "⏳ "}
              {status.type === "success" && "✓ "}
              {status.type === "error" && "✗ "}
              {status.text}
            </Typography>
          )}

          <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }}>
            上次同步：{lastSync}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
              display: "block",
              mt: 1,
              fontSize: "0.65rem",
              lineHeight: 1.6
            }}>
            App 密码请在坚果云网页端「账户信息 → 安全选项」中生成。
            <br />
             上传 → 本地数据覆盖云端。下载 → 云端数据覆盖本地。
            </Typography>

            <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, color: "text.secondary", fontSize: "0.85rem" }}>
                🎨 主题配色
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                {(Object.keys(PRESET_LABELS) as PresetName[]).map((name) => (
                  <Tooltip key={name} title={PRESET_LABELS[name]}>
                    <Stack
                      alignItems="center"
                      spacing={0.5}
                      sx={{ cursor: "pointer" }}
                      onClick={() => onPresetChange(name)}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          transition: "all 0.2s",
                          "&:hover": { transform: "scale(1.15)" },
                          border: "2px solid",
                          borderColor:
                            preset === name ? "primary.main" : "transparent",
                          bgcolor: palettes[name].primary.main
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.6rem",
                          color:
                            preset === name
                              ? "primary.main"
                              : "text.disabled",
                          fontWeight: preset === name ? 600 : 400
                        }}>
                        {PRESET_LABELS[name]}
                      </Typography>
                    </Stack>
                  </Tooltip>
                ))}
              </Stack>
            </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1 }}>
          关闭
        </Button>
      </DialogActions>

      <Dialog
        open={confirmDownload}
        onClose={() => setConfirmDownload(false)}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ pb: 1 }}>确认下载</DialogTitle>
        <DialogContent>
          <DialogContentText>
            从云端下载将覆盖本地所有数据，确定继续吗？
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDownload(false)} sx={{ borderRadius: 1 }}>
            取消
          </Button>
          <Button variant="contained" color="warning" onClick={executeDownload} sx={{ borderRadius: 1 }}>
            确认下载
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
