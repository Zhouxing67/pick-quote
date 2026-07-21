# 架构风险与优化建议

## 风险等级

- 🔴 **高风险** — 可能导致数据丢失或功能完全不可用
- 🟡 **中风险** — 可能导致功能异常或使用体验下降
- 🟢 **低风险** — 代码质量问题，可渐进改进

---

## 🔴 风险 1：坚果云同步 —— 全量覆盖 + 非原子写入

### 问题描述

当前同步策略存在严重的数据安全隐患：

```typescript
// SettingsDialog.tsx
await clearAllItems()
await clearAllProjects()
for (const proj of payload.projects) { await addProject(p) }
for (const it of payload.items) { await addItem(it) }
```

1. **非原子操作**：`clearAllItems()` 和 `clearAllProjects()` 成功完成后，如果在 `addProject/addItem` 循环中途浏览器崩溃或页面关闭，所有本地数据将永久丢失。
2. **全量覆盖无合并**：`runSync()` 上传时无条件用本地覆盖云端；下载时无条件用云端覆盖本地。如果用户在设备 A 添加内容后忘了同步，又在设备 B 添加内容，下一次同设备 B 同步会抹掉设备 A 的数据。
3. **无增量上传**：每次上传都是完整 `lime-sync.json`（全部 items + projects），项目数据量大时效率低。
4. **无冲突检测**：如果两设备几乎同时上传，后上传者的数据会完全覆盖先上传者，没有任何差异合并。

### 优化建议

1. **引入事务保护**：下载时改用单个读写事务包裹"清空+重建"（或者更好的：逐条 upsert + 删除云端已不存在的条目）。
2. **增加"双向合并"模式**：下载时不是全量替换，而是基于 `updatedAt` 或 `hash` 逐条比较：
   - 云端有但本地无 → 下载
   - 本地有但云端无 → 上传
   - 两者都有且不同 → 取较新的（或保留冲突标记由用户裁决）
3. **数据分片同步**：按项目而非全量同步，减少单次传输量，提高并发度。
4. **同步前自动备份**：下载前将当前本地数据备份到 `chrome.storage.local` 或 IndexedDB 的备份 store，作为安全网。

---

## 🔴 风险 2：Service Worker 上下文中的消息可靠性

### 问题描述

MV3 Service Worker 有**事件驱动生命周期**，在不活动时会被浏览器销毁：

1. **`rebuild-menus` 消息丢失**：`options.tsx` 或 `new-project.tsx` 发送此消息时，如果 SW 已被销毁，消息会排队等待唤醒；但如果 SW 唤醒后有多个消息排队，处理顺序不确定。`rebuildProjectMenus()` 和 `rebuildRecentMenus()` 并行执行且共享全局状态 (`menusBuilding`, `menusReady`)，存在竞态条件。

   ```typescript
   // background.ts
   if (msg?.kind === "rebuild-menus") {
     rebuildProjectMenus().catch(...)  // 异步
     rebuildRecentMenus().catch(...)   // 异步，无依赖管理
     return                            // 不返回 true，不保持消息通道
   }
   ```

2. **`contextMenus.onClicked` 中的 `ensureMenusReady()` 不可靠**：右键菜单点击时，SW 刚被唤醒，`ensureMenusReady()` 尝试 `createMenus()`，但如果菜单已经在 `onInstalled`/`onStartup` 中重建过，`menusReady` 可能为 false（因为 SW 被销毁后全局状态丢失），导致重复重建菜单树。

3. **WebDAV 代理的 20 秒超时**：`AbortController` 超时 20 秒，但没有处理 SW 在请求进行中被销毁的可能性。

### 优化建议

1. **为消息处理添加持久化锁**：使用 `chrome.storage.session` 存储 `menusReady` 状态（session storage 在 SW 存活期间可用），而非仅依赖内存变量。
2. **消息 handler 返回 `true` 保持通道**：`rebuild-menus` handler 返回 `true` 并等待异步操作完成后再 `sendResponse`，确保操作有序执行。
3. **集中菜单重建**：合并 `rebuildProjectMenus` 和 `rebuildRecentMenus` 为单个重建函数，避免两个操作各自的 `removeAll` 调用冲突。
4. **WebDAV 请求增加重试**：对网络请求增加指数退避重试，并检查 SW 是否仍在存活。

---

## 🟡 风险 3：搜索性能 —— 全表扫描 + 内存过滤

### 问题描述

```typescript
// database/index.ts - searchItems
const idx = store.index("createdAt")
idx.openCursor(null, "prev")  // 从最新到最旧遍历全部
cursor.continue()              // 逐条遍历
// 每一条都在JS中做过滤
if (
  (!q.type || item.type === q.type) &&
  (!q.site || item.sourceSite === q.site) &&
  // ... 更多条件
) { results.push(item) }
```

1. **无索引下推**：所有过滤条件都在 JavaScript 中执行，无法利用 IndexedDB 的索引能力。即使只想搜索某个 `projectId` 的少量卡片，也需要遍历所有卡片。
2. **keyword 搜索无索引**：`item.content.toLowerCase().includes()` 是 O(n) 字符串搜索，数据量大时（数千条）页面交互会明显卡顿。
3. **去重也使用全 cursor 扫描**：`addItem` 中的去重逻辑通过 `hash` 索引打开 cursor 并逐条比对 projectId 和 url，不如直接使用 `IDBKeyRange` + `index.get()`。

### 优化建议

1. **优先使用索引过滤**：在搜索时根据 `q.projectId` 切换到 `projectId` 索引，再在 cursor 中做二次过滤，大幅减少遍历量。
2. **独立全文搜索**：引入简单的倒排索引（存储 keyword → itemId 映射表）或使用浏览器内置的 Full-text Search API（部分浏览器支持）。
3. **分页优化**：当前 `searchItems` 返回全部匹配结果，只在 UI 层做分页。对于大量数据，应改为服务端分页（`IDBCursor.advance()` + limit）。
4. **去重改用 `index.get()`**：使用 `store.index("hash").get(hash)` 替代 cursor 遍历。

---

## 🟡 风险 4：内容脚本未利用率高

### 问题描述

`contents/capture.ts` 目前几乎未被使用：
- 它监听 `"request-selection"` 消息，但 `background.ts` 中从不发送此消息
- 它通过 `PlasmoCSConfig` 注入所有页面（`all_frames: true`），但只在接收 toast 消息时有用

用户只能通过**右键菜单**捕获内容，但右键菜单无法获取 DOM 精确位置（`source.selector` 为空），也无法实现高亮回看功能。

### 优化建议

1. **实现快捷键捕获**：在 `capture.ts` 中添加 `keydown` 监听（Ctrl+Shift+S 或 Alt+S），捕获选中文本并发送到 background。
2. **实现右键菜单 + 内容脚本协作**：右键菜单的 `"pickquote-capture"` 点击时，先发送消息给内容脚本请求选中文本（附带 DOM 选择器），内容脚本有选中则返回，否则 fallback 到 background 当前的捕获逻辑。
3. **考虑移除 `all_frames: true`** 或添加 `match_about_blank` 判断，避免在 iframe 中误触发。

---

## 🟡 风险 5：UI 状态集中于 options.tsx

### 问题描述

`options.tsx` 管理约 **30 个 useState** 和多个 `useCallback`/`useEffect`，是典型的"上帝组件"（God Component）模式：

- 状态定义分散在文件上半部分（~90行）
- 回调/事件处理分散在中部（~200行）
- 渲染 JSX 占 ~400 行
- 多个内联 Dialog（新建卡片、确认删除、新建项目）直接在组件树中定义，复用性差

虽然组件通过 props 接收数据和回调保持了松耦合，但 composition root 本身过于臃肿，不利于测试和维护。

### 优化建议

1. **抽取 Dialog 为独立组件**：新建卡片 Dialog、确认删除 Dialog、新建项目 Dialog 都适合抽取为带独立状态管理的组件。
2. **使用 useReducer 替代多个 useState**：将相关的状态（filter, select/batch mode, review mode）分组为 reducer。
3. **考虑 Context 或状态管理库**：对于跨组件共享的状态（如 `allItems`、`activeProjectId`），可考虑 React Context 配合 `useReducer`，减少 props drilling。

---

## 🟢 风险 6：测试覆盖缺口

### 当前测试覆盖

- `src/database/index.test.ts`：335 行，覆盖 addItem、getRecent、searchItems、updateItem、deleteItem、exportItems、categories CRUD
- `src/utils/index.test.ts`：124 行，覆盖 SHA-256、computeItemHash、prettyUrl
- 测试环境使用 fake-indexeddb + jsdom，mock chrome API

### 未覆盖区域（高优先级）

| 模块 | 风险 | 建议 |
|---|---|---|
| `src/utils/sync.ts` | 🔴 数据安全 | 测试 testConnection、runSync、downloadRemote 的各种场景 |
| `src/hooks/useProjects.ts` | 🟡 | 测试 CRUD 操作和 menu rebuild 触发 |
| `src/hooks/useSrs.ts` | 🟡 | 测试 SM-2 算法边界（连续低分、高分） |
| `src/database/index.ts` (deleteProject) | 🟡 | 测试级联删除卡片 |
| `src/utils/zip.ts` | 🟢 | 测试 ZIP 生成和解析 |
| `src/import/jsonImport.ts` | 🟢 | 测试各种 JSON 格式兼容性 |

---

## 🟢 风险 7：废弃的 categories / sources store

### 问题描述

IndexedDB 中 `categories` 和 `sources` 两个 object store 在 DB_VERSION 5 中已被创建，也有对应的操作函数（`upsertCategory`, `listCategories`, `deleteCategory`），但：
- `categories` 在 UI 中没有任何使用
- `sources` 只创建了 store，没有任何操作函数或 UI 使用
- 项目的组织已改为 `Project` 模型，`categories` 是早期设计的遗留物

### 优化建议

- 在下一 DB 迁移版本中移除这两个不再需要的 store
- 或保留但明确标记为 deprecated

---

## 最脆弱的 3 个环节总结

| 排名 | 环节 | 风险等级 | 核心问题 |
|---|---|---|---|
| 🔴 1 | **坚果云同步** | 数据丢失 | 全量覆盖 + 非原子 clear/re-add + 无冲突合并 |
| 🔴 2 | **SW 消息可靠性** | 功能失效 | 竞态条件 + 状态丢失 + 消息通道未保持 |
| 🟡 3 | **搜索性能** | 体验劣化 | 全表扫描 + 无索引下推 + O(n) 字符串搜索 |

前两个（同步和 SW 可靠性）直接影响用户数据的完整性和核心功能的可靠性，建议优先处理。
