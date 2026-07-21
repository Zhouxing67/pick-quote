# 未来发展方向

## 短期（0-3 个月）

### 1. 🔴 同步系统重构
- **目标**：消除数据丢失风险
- 引入事务保护的下载流程（原子化 clear+rebuild）
- 实现基于 `updatedAt` 的双向合并策略
- 同步前自动备份到本地备份 store

### 2. 🔴 Service Worker 可靠性加固
- **目标**：消除菜单重建和消息处理的竞态条件
- 使用 `chrome.storage.session` 持久化 SW 状态标志
- 消息 handler 统一返回 `true` + 等待异步完成
- 合并 `rebuildProjectMenus` / `rebuildRecentMenus` 为一次事务

### 3. 🟡 打开内容脚本链路
- **目标**：恢复快捷键捕获 + DOM 选择器支持
- 在 `capture.ts` 中实现快捷键（Ctrl+Shift+S）监听
- 建立 background → content script 的协作链路，实现基于 DOM 选择器的高亮定位

## 中期（3-6 个月）

### 4. 🟡 搜索性能优化
- 按 projectId 索引优先查询，减少全表扫描
- 引入倒排索引支持全文搜索
- 服务端分页（cursor advance + limit）

### 5. 🟢 UI 架构治理
- 抽取内联 Dialog 为独立组件
- 用 `useReducer` 分组管理状态
- 考虑引入 Context 减少 props drilling

### 6. 🟢 测试补全
- sync.ts 集成测试（mock WebDAV 响应）
- hooks 单元测试
- import/export 操作测试

## 长期（6-12 个月）

### 7. 协作与分享
- 项目级分享链接（导出卡片集为公开页面）
- 多人协作项目（借助 WebDAV 或自建同步服务）

### 8. 内容深度处理
- 自动提取网页正文（Readability 集成）
- AI 辅助标签 / 摘要生成
- 图片 OCR 文字提取

### 9. 多平台扩展
- 手机端浏览（PWA 或移动版 options page）
- Firefox 扩展支持（Plasmo 跨浏览器兼容）

### 10. 数据安全增强
- 同步数据加密（端到端）
- 本地数据导出加密
- 自动定期备份提醒

## 功能路线图

```
v0.5 ─── 同步安全加固 + SW 可靠性修复 + 快捷键捕获
v0.6 ─── 搜索性能优化 + 测试补全
v0.7 ─── UI 治理 + 组件抽取
v0.8 ─── 网页正文提取 + 图片高级处理
v0.9 ─── 跨浏览器 + PWA 支持
v1.0 ─── 端到端加密 + 分享功能
```
