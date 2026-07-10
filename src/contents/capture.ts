import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: true
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === "request-selection") {
    const sel = window.getSelection()?.toString().trim()
    if (!sel) {
      sendResponse({ ok: false, reason: "no-selection" })
      return true // 即使是失败，也要返回 true 并调用 sendResponse
    }
    sendResponse({
      ok: true,
      data: {
        content: sel,
        source: { title: document.title, url: location.href, site: location.hostname }
      }
    })
    return true // 必须返回 true，因为 sendResponse 可能被异步调用（虽然这里同步了，但保持好习惯）
  }

  if (msg?.kind === "toast" && msg?.text) {
    showToast(msg.text)
  }
})

function showToast(text: string) {
  const toast = document.createElement("div")
  toast.textContent = text
  Object.assign(toast.style, {
    position: "fixed", zIndex: "2147483647", bottom: "24px", right: "24px",
    background: "rgba(0,0,0,0.8)", color: "#fff", padding: "8px 12px",
    borderRadius: "8px", fontSize: "12px"
  })
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}
