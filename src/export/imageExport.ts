import html2canvas from "html2canvas"

/**
 * 将DOM元素导出为图片并下载
 * @param element - 要导出的DOM元素
 * @param filename - 文件名（不含扩展名）
 */
export async function exportToImage(
  element: HTMLElement,
  filename: string = "pickquote-share"
): Promise<void> {
  try {
    // 使用html2canvas将元素转换为canvas
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2, // 提高清晰度，适合社交媒体分享
      logging: false,
      useCORS: true, // 允许跨域图片
      allowTaint: false
    })

    // 将canvas转换为blob
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error("Failed to create blob from canvas")
        return
      }

      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${filename}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, "image/png")
  } catch (error) {
    console.error("[lime] Export image failed:", (error as Error).message)
    throw error
  }
}
