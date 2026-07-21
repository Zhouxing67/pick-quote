# 未来发展方向（v2）

## 短期（0-3 个月）— 安全与质量

### 1. 🔴 同步系统加固
- 抽取 `applyRemotePayload()` 到 `sync.ts`，消除 options.tsx 和 SettingsDialog.tsx 的重复
- 下载前自动备份到 IndexedDB 临时 store
- 使用单个 IDB 事务包裹"清空+重建"
- 长期：实现基于 hash 的增量双向合并

### 2. 🔴 可访问性基础
- 为所有 IconButton 添加 `aria-label`
- CardGrid 卡片添加 `role="button"` + `tabIndex` + 键盘事件
- ReviewSession 添加 `aria-live` 区域
- 添加顶层 ErrorBoundary

### 3. 🔴 消除 `alert()` 调用
- `useExportImage.ts` 中的 `alert()` 替换为 Snackbar 回调

### 4. 🟡 SettingsDialog 解耦
- 同步操作逻辑移到 options.tsx（或 `useBackupSync` hook）
- SettingsDialog 仅通过回调触发操作，不直接导入数据库函数

### 5. 🟡 SW 可靠性
- 合并 `rebuildProjectMenus` + `rebuildRecentMenus` 为 `rebuildAllMenus()`
- `menusReady` 持久化到 `chrome.storage.session`

## 中期（3-6 个月）— 性能与架构

### 6. 🟡 搜索性能优化
- 按 projectId 索引优先查询
- 引入倒排索引支持全文搜索
- 服务端分页

### 7. 🟡 options.tsx 瘦身
- `useReducer` 分组管理状态
- 抽取 `useBackupSync`、`useStats`、`useRandomReview` hooks
- 目标：options.tsx < 600 行

### 8. 🟢 类型安全
- 消除所有 `as any` 断言
- 为 `chrome.storage` API 添加类型包装

### 9. 🟢 测试补全
- sync.ts 集成测试（mock WebDAV 响应）
- useSrs.ts SM-2 算法边界测试
- jsonImport.ts 格式兼容性测试
- deleteProject 级联删除测试

### 10. 🟢 统一类型渲染
- 抽取 `<ItemContent>` 组件，消除 4 处独立的 type 分发逻辑

## 长期（6-12 个月）— 功能扩展

### 11. 内容深度处理
- Readability 集成（自动提取网页正文）
- AI 辅助标签/摘要生成
- 图片 OCR 文字提取

### 12. 协作与分享
- 项目级分享链接（导出卡片集为公开页面）
- 多人协作项目

### 13. 多平台
- Firefox 扩展支持（Plasmo 跨浏览器兼容）
- PWA 移动端浏览

### 14. 数据安全
- 同步数据端到端加密
- 自动定期备份提醒

## 功能路线图

```
v0.5 ─── 同步安全加固 + alert 消除 + ErrorBoundary
v0.6 ─── 可访问性基础 + SW 可靠性 + SettingsDialog 解耦
v0.7 ─── 搜索性能优化 + options.tsx 瘦身
v0.8 ─── 测试补全 + 类型安全 + 统一渲染组件
v0.9 ─── 网页正文提取 + 跨浏览器支持
v1.0 ─── 端到端加密 + 分享功能
```

## 代码量目标

| 指标 | 当前 | 目标 |
|---|---|---|
| options.tsx 行数 | 1054 | < 600 |
| `as any` 数量 | 5 | 0 |
| 测试覆盖率 | ~30% | > 70% |
| a11y 违规 | 全部 | 0 (WCAG 2.1 AA) |
| 重复代码块 | 6+ | 0 |
