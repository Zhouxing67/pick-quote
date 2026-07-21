# 核心数据流

## 数据模型

```typescript
// 核心实体
Project { id, name(UNIQUE), createdAt, note? }
Item {
  id, type("text"|"image"|"link"), content, createdAt,
  source?: { title, url, site?, selector?, anchor? },
  context?: { before?, after?, paragraph? },
  projectId?, note?, read?, hash?, sourceSite?, order?,
  srs?: { dueDate, interval, easeFactor, reviewCount, lastReviewDate }
}

// 用于搜索/筛选
SearchQuery { keyword?, site?, sites?, type?, from?, to?, projectId?, dueBefore? }
```

## 数据流：网页捕获 → 本地存储

### 路径 A：右键菜单（主路径）

```
用户右键 → 点击 "lime" 菜单
    │
    ▼
chrome.contextMenus.onClicked (background.ts: Service Worker)
    │
    ├─ menuItemId === "pickquote-new-project"
    │     │  写入 chrome.storage.session.set({ pendingCapture })
    │     │  打开 tabs/new-project.html 弹窗
    │     │  用户输入/选择项目 → addItem() → IndexedDB
    │     │  chrome.runtime.sendMessage({ kind: "rebuild-menus" })
    │     │  window.close()
    │
    ├─ menuItemId.startsWith("pickquote-recent-")
    │     │  读取 chrome.storage.local("recentProjectIds")
    │     │  查找项目名 → captureAndSave() → addItem()
    │
    ├─ menuItemId.startsWith("pickquote-proj-")
    │     │  captureAndSave() → addItem()
    │
    └─ fallback: 捕获 selectionText / srcUrl / linkUrl / tab.url
```

### 路径 B：内容脚本（目前未连接）

```
用户选中文本 → Alt+S (capture.ts 监听，待实现)
    │
    ▼
contents/capture.ts → chrome.runtime.sendMessage({ kind: "capture", payload })
    │
    ▼
background.ts onMessage → addItem() → IndexedDB
```

### 路径 C：手动新建

```
选项页 → 点击 "+" 按钮 → 内联 Dialog → handleSaveNewCard
    │
    addItem() → IndexedDB
```

## 数据流：本地 → 坚果云同步

### 上传（本地 → 云端）

```
SettingsDialog → handleSync()
    │
    searchItems({}) ← 读取全部本地 Item
    listProjects()  ← 读取全部本地 Project
    │
    ▼
runSync(cred, items, projects)
    │
    ├─ buildPayload() → JSON.stringify + SHA-256 contentHash
    │
    ├─ downloadSyncFile() → 获取云端数据
    │     ├─ 404 → 首次同步，直接上传
    │     └─ 比较 contentHash
    │           ├─ 相同 → noop，无需同步
    │           └─ 不同 → 上传覆盖
    │
    ▼
PUT /Apps/lime/lime-sync.json (全量覆盖)
```

### 下载（云端 → 本地）

```
SettingsDialog → handleDownload()
    │
    window.confirm("从云端下载将覆盖本地所有数据")
    │
    ▼
downloadRemote(cred, localItems, localProjects)
    │    比较 contentHash
    │    ├─ 相同 → noop
    │    └─ 不同 → 返回云端 payload
    │
    ▼
clearAllItems() + clearAllProjects()  ← 风险点：非原子操作
    │
    遍历 payload.projects → addProject()
    遍历 payload.items → addItem()
```

## 数据流：搜索与展示

```
options.tsx → onSearch()
    │
    searchItems(q: SearchQuery)
    │
    ├─ 按 createdAt 索引倒序遍历（全表扫描 + 内存过滤）
    │     filter: type, site, sites, from, to, projectId, dueBefore, keyword
    │
    ▼
    setAllItems(list)
    setDisplayedItems(list.slice(0, 20))
    │
    ▼
    瀑布流渲染（react-masonry-css，响应式 1/2/3 列）
    │
    ▼
    无限滚动：IntersectionObserver → loadMore()
```

## 数据流：SRS 复习

```
AppHeader Badge → getDueItems(allItems) → 显示到期数量
    │
    ▼
SidebarFilters → onStartReview()
    │
    getDueItems(allItems) → 筛选 srs.dueDate <= now 或无 srs 的卡片
    sort by dueDate asc
    │
    ▼
ReviewSession
    │
    ├─ 点击/空格 翻转卡片（3D CSS animation）
    ├─ 1-4 评分 → rateCard() → SM-2 算法
    │   ├─ rating < 3: interval=1, easeFactor-=0.2
    │   ├─ rating = 3: interval *= easeFactor
    │   └─ rating = 4: interval *= easeFactor*1.3, easeFactor+=0.15
    │
    ▼
    onSave(updated) → updateItem() → IndexedDB
    │
    ▼
    完成页：展示统计（复习数、熟悉率、平均评分）
```

## 数据流：右键菜单动态构建

```
const menu tree:
  lime (root)
  ├── [最近] 项目名 (pickquote-recent-{0..2})     ← 最多3个
  ├── 新建项目并加入 (pickquote-new-project)
  └── 加入已有项目 (pickquote-existing)
        ├── 项目名 (pickquote-proj-{id})
        ├── 项目名 (pickquote-proj-{id})
        └── ...

触发重建:
  - options.tsx 创建/删除/重命名项目
  - tabs/new-project.tsx 创建项目并加入
  - contextMenus.onClicked 中 updateRecentProjects

重建消息:
  chrome.runtime.sendMessage({ kind: "rebuild-menus" })
    → background.ts onMessage
    → rebuildProjectMenus() + rebuildRecentMenus()
    → chrome.contextMenus.removeAll() → 逐个创建
```
