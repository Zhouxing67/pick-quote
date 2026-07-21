# 架构风险与优化建议（v2 — 二次 Code Review）

## 风险等级

- 🔴 **高风险** — 可能导致数据丢失、功能完全不可用、或违反项目规则
- 🟡 **中风险** — 可能导致功能异常、可维护性差、或体验下降
- 🟢 **低风险** — 代码质量问题，可渐进改进

---

## 🔴 风险 1：同步下载 — 非原子写入 + 逻辑重复

### 问题描述

同步下载逻辑在 **两个位置** 独立实现，且均为非原子操作：

**位置 A**: `options.tsx` 第 412-442 行 (`handleDownloadSync`)
**位置 B**: `SettingsDialog.tsx` 第 123-158 行 (`executeDownload`)

两处代码几乎相同：
```typescript
await clearAllItems()       // 步骤 1: 清空
await clearAllProjects()   // 步骤 2: 清空
for (const p of payload.projects) await addProject(p)  // 步骤 3: 逐条写入
for (const item of payload.items) await addItem(item)   // 步骤 4: 逐条写入
```

**风险**:
1. **数据丢失**: 步骤 1-2 成功后，如果步骤 3-4 中途浏览器崩溃、页面关闭、或 SW 被销毁，所有本地数据永久丢失且无法恢复
2. **DRY 违反**: 同一逻辑在两个文件中重复实现，修改一处容易遗漏另一处
3. **SettingsDialog 直接操作数据库**: 导入了 6 个数据库函数 (`addItem, addProject, clearAllItems, clearAllProjects, listProjects, searchItems`)，违反了组件隔离原则

### 优化建议

1. **抽取为独立函数**: 将下载逻辑抽取到 `src/utils/sync.ts` 中的 `applyRemotePayload()` 函数
2. **事务保护**: 使用单个 IDB 读写事务包裹"清空+重建"操作
3. **安全网**: 下载前将当前数据备份到 IndexedDB 的临时 store
4. **增量替代全量**: 基于 hash 逐条比较，仅更新差异部分

---

## 🔴 风险 2：`alert()` 违反项目规则

### 问题描述

**文件**: `src/utils/useExportImage.ts` 第 27 行
```typescript
alert("导出图片失败，请重试")
```

项目规则 #5 明确规定："Delete confirmation uses a unified MUI Dialog... `window.confirm` is not used in the codebase." 虽然此规则针对删除确认，但 `alert()` 同样属于 DOM API，在 Service Worker 上下文中会抛出 `ReferenceError`。

**影响**: 如果 `useExportImage` 在 SW 上下文中被调用（虽然当前不会），将导致崩溃。更重要的是，`alert()` 阻塞 UI 线程，用户体验差。

### 优化建议

替换为 Snackbar 通知（options.tsx 已有 `snackbarMsg` 状态），或通过回调将错误信息传递给父组件。

---

## 🔴 风险 3：零可访问性 (a11y)

### 问题描述

整个项目 **没有任何 ARIA 属性**：

| 缺失项 | 影响范围 |
|---|---|
| 无 `aria-label` | 所有 IconButton（AppHeader、ItemCard、SidebarFilters 等约 30+ 个） |
| 无 `role="button"` | CardGrid 卡片、ReviewSession 翻转卡片 |
| 无键盘导航 | CardGrid 项目、SidebarFilters 项目行、ReviewSession 评分按钮 |
| 无 `tabIndex` | 所有可交互的非按钮元素 |
| 无 skip navigation | 选项页 |
| 无 `aria-live` | Snackbar 通知、Badge 更新 |
| 无焦点管理 | Dialog 打开/关闭时焦点未显式管理 |

**影响**: 屏幕阅读器用户完全无法使用；键盘用户操作困难；不符合 WCAG 2.1 AA 标准。

### 优化建议

1. 为所有 IconButton 添加 `aria-label`
2. CardGrid 卡片添加 `role="button"` + `tabIndex={0}` + `onKeyDown`
3. ReviewSession 翻转区域添加 `role="button"` + `aria-label="点击翻转卡片"`
4. Dialog 组件使用 MUI 内置的焦点陷阱（已部分支持）
5. 添加 `aria-live="polite"` 到 Snackbar 和 Badge

---

## 🟡 风险 4：无 ErrorBoundary — 全局崩溃风险

### 问题描述

项目中 **没有任何 React ErrorBoundary**。如果任何组件在渲染时抛出异常，整个选项页将白屏崩溃，用户丢失所有未保存的编辑状态。

高风险触发场景：
- `html2canvas` 处理畸形图片 URL 时可能抛出
- `JSON.parse` 在 sync/import 中解析畸形数据
- IndexedDB 事务失败（磁盘空间不足、版本冲突）
- MUI 组件在极端 props 下的未知行为

### 优化建议

在 `options.tsx` 顶层添加 `<ErrorBoundary>` 包装，提供友好的错误页面和"重新加载"按钮。

---

## 🟡 风险 5：Service Worker 消息可靠性

### 问题描述

1. **`storage.onChanged` 中的并行重建**:
   ```typescript
   // background.ts 第 49-51 行
   if (changes._dbp) {
     rebuildProjectMenus().catch(() => {})
     rebuildRecentMenus().catch(() => {})
   }
   ```
   两个函数并行执行，各自调用 `removeMenu()` 和 `createMenu()`，共享 `menusBuilding` / `menusReady` 全局状态。如果 SW 在两次调用之间被销毁，状态丢失。

2. **`menusReady` 内存变量**: SW 被销毁后全局变量重置为 `false`，下次 `ensureMenusReady()` 会触发完整的 `createMenus()` 重建，包括 `removeAll()` — 可能导致菜单闪烁。

3. **WebDAV 代理无重试**: 20 秒超时后直接 abort，无指数退避重试。

### 优化建议

1. 合并 `rebuildProjectMenus` + `rebuildRecentMenus` 为单个 `rebuildAllMenus()` 函数
2. 使用 `chrome.storage.session` 持久化 `menusReady` 标志
3. WebDAV 请求增加 1 次重试

---

## 🟡 风险 6：SettingsDialog 直接操作数据库

### 问题描述

`SettingsDialog.tsx` 导入了 6 个数据库函数：
```typescript
import { addItem, addProject, clearAllItems, clearAllProjects, listProjects, searchItems } from "../database"
```

这意味着设置弹窗直接读写 IndexedDB，绕过了 options.tsx 的状态管理层。后果：
- options.tsx 无法感知 SettingsDialog 的数据变更（除非通过 `onDataChange` 回调手动刷新）
- 同步操作的错误处理分散在两个组件中
- 测试 SettingsDialog 需要 mock 整个数据库层

### 优化建议

将同步操作（上传/下载）的逻辑移到 options.tsx，SettingsDialog 仅通过回调 (`onUpload`, `onDownload`) 触发操作，不直接访问数据库。

---

## 🟡 风险 7：搜索性能 — 全表扫描

### 问题描述

```typescript
// database/index.ts searchItems()
const source = q.projectId
  ? store.index("projectId")    // ✅ 有 projectId 时使用索引
  : store.index("createdAt")    // ❌ 无 projectId 时全表扫描
```

当用户在"全部项目"视图中搜索时，`searchItems({})` 遍历所有卡片。keyword 搜索使用 `item.content.toLowerCase().includes()` — O(n) 字符串匹配。

**影响**: 数据量 < 1000 条时无感知；1000-5000 条时可能有 100-500ms 延迟；> 5000 条时 UI 明显卡顿。

### 优化建议

1. keyword 搜索引入简单的倒排索引
2. 服务端分页（`IDBCursor.advance()` + limit）
3. 对 `content` 字段建立全文索引（如果浏览器支持）

---

## 🟡 风险 8：options.tsx 仍然过大

### 问题描述

虽然上次 Review 后已抽取了 5 个 Dialog 组件，但 `options.tsx` 仍有 **1054 行**，管理约 **25 个 useState**：

```
状态分类:
├── 数据状态: allItems, displayedItems, allItemsUnfiltered, reviewItems
├── 筛选状态: keyword, tag, activeProjectId, readingFilter
├── UI 状态: drawerOpen, drawerWidth, selectMode, selectedIds, swapMode
├── Dialog 状态: dialogItem, confirmDeleteId, confirmBatchDelete, createDialogOpen, settingsOpen
├── 操作状态: moveCardId, copyCardId, batchAction
├── 备份/同步: backupSelectedIds, syncStatus
├── 其他: preset, sidebarTab, hasMore, showRandomReview, randomItem, snackbarMsg
```

**影响**: 新增功能必须修改此文件；状态依赖关系不透明；测试困难。

### 优化建议

1. 使用 `useReducer` 将相关状态分组（filterState, batchState, dialogState）
2. 将备份/同步逻辑抽取为 `useBackupSync` hook
3. 将统计数据和随机回顾逻辑抽取为独立 hook

---

## 🟡 风险 9：类型安全 — `as any` 类型断言

### 问题描述

生产代码中有 **5 处 `as any`** 类型断言：

| 文件 | 行 | 代码 |
|---|---|---|
| `background.ts` | 179 | `(result as any).recentProjectIds` |
| `background/menus.ts` | 49, 69 | `(result as any).recentProjectIds` |
| `database/index.ts` | 42, 51 | `(store.indexNames as any).contains?.()` |

**影响**: 绕过 TypeScript 类型检查，运行时可能出现未预期的 `undefined` 或类型错误。

### 优化建议

1. 为 `chrome.storage.local.get()` 返回值定义类型接口
2. 使用 `IDBIndexNames` 的正确类型（或封装为类型安全的 helper）

---

## 🟢 风险 10：类型分发渲染 — 4 处独立实现

### 问题描述

`Item` 的三种类型 (text/image/link) 渲染逻辑在 4 个组件中独立实现：

| 组件 | 行数 | 分支 |
|---|---|---|
| `ItemCard.tsx` | 224-280 | text / image / link |
| `DialogViewMode.tsx` | 37-72 | text / image / link |
| `ReviewSession.tsx` | 248-298, 321-356 | image / link / text (正面+背面) |
| `ShareCard.tsx` | 94-141 | text / image / (link fallback to text) |

**影响**: 新增类型需修改 4 个文件；ShareCard 对 link 类型的处理不完整（fallback 到 text 渲染）。

### 优化建议

抽取 `<ItemContent item={item} variant="card|dialog|review|share" />` 统一组件。

---

## 🟢 风险 11：`all_frames: true` 不必要注入

### 问题描述

`capture.ts` 配置 `all_frames: true`，内容脚本注入到页面的所有 iframe 中。但只有顶层 frame 的选中文本有意义，iframe 中的注入是浪费的。

**影响**: 增加内存占用；iframe 中的 toast 通知可能不可见；潜在的跨 frame 消息安全风险。

### 优化建议

改为 `all_frames: false`（默认值）。

---

## 🟢 风险 12：重复代码模式

### 12a. `computeItemHash` 调用模式重复 3 次

```typescript
// options.tsx 第 507 行、第 550 行，以及 database/index.ts 第 148-151 行
card.hash || (card.source
  ? await computeItemHash(card.content, card.source.url)
  : await computeItemHash(card.content, ""))
```

**建议**: 抽取为 `ensureHash(item: Item): Promise<string>` 工具函数。

### 12b. `projects.filter(p => p.id !== activeProjectId)` 重复 3 次

`options.tsx` 第 1022、1030、1038 行。

**建议**: 抽取为 `otherProjects` useMemo。

### 12c. IconButton 样式重复

`color: "text.secondary", "&:hover": { color: "primary.main" }` 在 AppHeader、options.tsx 中重复约 10 次。

**建议**: 在 MUI theme 中覆盖 `MuiIconButton` 默认样式，或抽取 `HeaderIconButton` 组件。

---

## 🟢 风险 13：安全性考量

| 问题 | 风险 | 说明 |
|---|---|---|
| 同步凭据明文存储 | 🟡 | `chrome.storage.sync` 中的 `syncUsername` / `syncPassword` 未加密 |
| WebDAV auth 明文传递 | 🟢 | `authBase64` 通过 `chrome.runtime.sendMessage` 传递（同进程内，风险低） |
| html2canvas useCORS | 🟢 | `useCORS: true` 允许加载跨域图片，如果 item.content 包含恶意 URL 可能被利用 |
| 无 CSP 配置 | 🟢 | manifest 中未配置 `content_security_policy` |

---

## 🟢 风险 14：测试覆盖缺口

### 当前覆盖

| 文件 | 行数 | 覆盖范围 |
|---|---|---|
| `database/index.test.ts` | 249 行 | addItem, searchItems, updateItem, deleteItem, deleteItems |
| `utils/index.test.ts` | 124 行 | sha256, computeItemHash, prettyUrl |

### 未覆盖（按优先级）

| 模块 | 优先级 | 说明 |
|---|---|---|
| `utils/sync.ts` | 🔴 | 核心数据安全 — testConnection, runSync, downloadRemote |
| `hooks/useSrs.ts` | 🟡 | SM-2 算法边界（连续低分、高分、首次复习） |
| `import/jsonImport.ts` | 🟡 | 各种 JSON 格式兼容性、项目 ID 重映射 |
| `database/index.ts` (deleteProject) | 🟡 | 级联删除 |
| `utils/zip.ts` | 🟢 | ZIP 生成和解析 |
| `hooks/useProjects.ts` | 🟢 | CRUD + 唯一性验证 |

---

## 最脆弱的 3 个环节

| 排名 | 环节 | 风险等级 | 核心问题 |
|---|---|---|---|
| 🔴 1 | **同步下载** | 数据丢失 | 非原子 clear+re-add + 逻辑重复在两处 + 无备份安全网 |
| 🔴 2 | **零可访问性** | 合规/可用性 | 无 ARIA、无键盘导航、无 ErrorBoundary |
| 🟡 3 | **SW 消息可靠性** | 功能失效 | 并行竞态 + 内存状态丢失 + 菜单重建无事务 |
