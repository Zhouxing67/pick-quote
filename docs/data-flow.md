# 核心数据流（v2）

## 数据模型

```typescript
Project { id, name(UNIQUE), createdAt, note? }

Item {
  id, type("text"|"image"|"link"), content, createdAt,
  source?: { title, url, site? },
  context?: { paragraph? },
  projectId?, note?, read?, hash?, sourceSite?, order?,
  tags?: string[],
  srs?: { dueDate, interval, easeFactor, reviewCount, lastReviewDate }
}

SearchQuery { keyword?, site?, type?, tag?, from?, to?, projectId?, dueBefore? }
```

## 数据流 1：网页捕获 → 本地存储

### 路径 A：右键菜单（主路径）

```
用户右键 → "lime" 菜单项
    │
    ▼
background.ts contextMenus.onClicked
    │
    ├─ "pickquote-new-project"
    │     存储 pendingCapture 到 chrome.storage.session
    │     打开 tabs/new-project.html 弹窗
    │     用户输入/选择项目 → addItem() → IndexedDB
    │     sendMessage({kind: "save-feedback"}) → notifyTab()
    │     window.close()
    │
    ├─ "pickquote-recent-{0..2}"
    │     读取 recentProjectIds → 查找项目 → captureAndSave()
    │
    └─ "pickquote-proj-{id}"
          captureAndSave() → saveAndNotify() → addItem()
```

### 路径 B：Alt+S 快捷键

```
用户选中文本 → Alt+S
    │
    ▼
capture.ts keydown listener
    │ 构造 payload { type: "text", content, source }
    │ chrome.runtime.sendMessage({ kind: "capture", payload })
    │
    ▼
background.ts onMessage "capture"
    │ 构造 Item → addItem() → notifyTab()
```

### 路径 C：手动新建

```
options.tsx → "+" 按钮 → NewCardDialog
    │ useNewCard.handleSaveNewCard()
    │ addItem() → onSearch()
```

## 数据流 2：本地 → 坚果云同步

### 上传

```
SettingsDialog.handleSync() 或 options.tsx.handleUploadSync()
    │
    searchItems({}) + listProjects() → 全量本地数据
    │
    ▼
runSync(cred, items, projects)
    │ buildPayload() → JSON + SHA-256 contentHash
    │ downloadSyncFile() → 获取云端数据
    │   ├─ 404 → 首次同步，直接上传
    │   ├─ hash 相同 → noop
    │   └─ hash 不同 → PUT 覆盖
    │
    ▼
uploadSyncFile() → MKCOL + PUT /Apps/lime/lime-sync.json
```

### 下载

```
SettingsDialog.executeDownload() 或 options.tsx.handleDownloadSync()
    │
    downloadRemote() → 比较 contentHash
    │   ├─ 相同 → noop
    │   └─ 不同 → 返回 payload
    │
    ▼
clearAllItems()          ← ⚠️ 非原子操作
clearAllProjects()       ← ⚠️ 如果后续 addProject/addItem 中途崩溃
for (p of projects)      ← ⚠️ 数据将永久丢失
  addProject(p)
for (item of items)
  addItem(item)
```

## 数据流 3：搜索与展示

```
options.tsx onSearch()
    │
    searchItems(q: SearchQuery)
    │   ├─ q.projectId → 使用 projectId 索引（优化路径）
    │   └─ 无 projectId → 使用 createdAt 索引倒序遍历（全表扫描）
    │   内存过滤: type, site, from, to, dueBefore, tag, keyword
    │
    ▼
setAllItems(list)  // 按 order + createdAt 排序
setDisplayedItems(list.slice(0, 20))
    │
    ▼
CardGrid → Masonry (react-masonry-css)
    │ 响应式 3/2/1 列
    │ fadeInUp 动画 (delay: idx * 40ms)
    │
    ▼
IntersectionObserver → loadMore() → 无限滚动
```

## 数据流 4：SRS 复习

```
SidebarFilters "复习" 标签 → handleStartReview()
    │
    searchItems({}) → getDueItems(all)
    │   filter: !item.srs || item.srs.dueDate <= now
    │   sort: dueDate asc
    │
    ▼
ReviewSession
    │ 3D CSS flip (rotateX -180deg)
    │ 键盘: 1-4 评分, Enter/Space 翻转
    │
    rateCard(item, rating)
    │   rating < 3: interval=1, easeFactor -= 0.2
    │   rating = 3: interval *= easeFactor
    │   rating = 4: interval *= easeFactor * 1.3, easeFactor += 0.15
    │   clamp: interval [1, 365], easeFactor >= 1.3
    │
    ▼
onSave(updated) → updateItem() → IndexedDB
```

## 数据流 5：跨上下文变更通知

```
任何写操作 (addItem/updateItem/deleteItem/addProject/...)
    │
    withStore() tx.oncomplete
    │   broadcastDbChange(name)
    │   chrome.storage.local.set({ _dbi/_dbp: Date.now() })
    │
    ▼
background.ts storage.onChanged
    │ _dbp → rebuildProjectMenus() + rebuildRecentMenus()
    │ _dbi → searchItems({}) → getDueItems() → setBadgeText()
    │
    ▼
options.tsx storage.onChanged
    │ _dbi || _dbp → refreshAllData()
    │   loadProjects() + onSearch() + searchItems({}) → setAllItemsUnfiltered()
```

## 数据流 6：右键菜单动态构建

```
菜单树:
  lime (root)
  ├── [最近] 项目名 (pickquote-recent-{0..2})  ← 最多 3 个
  ├── 新建项目并加入 (pickquote-new-project)
  └── 加入已有项目 (pickquote-existing)
        ├── 项目名 (pickquote-proj-{id})
        └── ...

触发重建:
  - storage.onChanged._dbp → rebuildProjectMenus() + rebuildRecentMenus()
  - contextMenus.onClicked → ensureMenusReady()
  - onInstalled / onStartup → createMenus()

重建流程:
  createMenus()
    removeAll() → createMenu(root) → rebuildRecentMenus()
    → createMenu(new-project) → rebuildProjectMenus()
```
