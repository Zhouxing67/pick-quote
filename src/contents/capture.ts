import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: true
}

chrome.runtime.onMessage.addListener((msg) => {
  console.debug("[lime:capture] toast:", msg?.text)
  if (msg?.kind === "toast" && msg?.text) {
    showToast(msg.text)
  }
})

function showToast(text: string) {
  const toast = document.createElement("div")
  toast.textContent = text
  Object.assign(toast.style, {
    position: "fixed", zIndex: "2147483647", top: "52px", right: "24px",
    background: "rgba(0,0,0,0.8)", color: "#fff", padding: "8px 12px",
    borderRadius: "8px", fontSize: "12px"
  })
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}
