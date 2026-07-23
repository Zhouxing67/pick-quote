--- COMMUNICATION_REFACTOR_PLAN.md (原始)


+++ COMMUNICATION_REFACTOR_PLAN.md (修改后)
# 浏览器扩展消息通信机制变更说明书

## 1. 概述

本文档详细分析了当前浏览器扩展消息通信机制中存在的缺陷，并提出了具体的改进方案。目标是提升代码的类型安全性、可维护性、错误处理能力和系统稳定性。

---

## 2. 缺陷分析与解决方案

### 2.1 缺陷一：消息协议缺乏严格的类型约束 (Type Safety)

#### 问题描述
当前代码中使用字符串字面量（如 `"capture"`, `"toast"`, `"webdav"`）作为消息类型的标识 (`msg.kind`)。
- **风险**：容易出现拼写错误（Typos），编译器无法在构建时捕获这些错误，导致运行时静默失败。
- **现状**：发送方和接收方对消息结构的定义是隐式的，依赖开发者的记忆或分散的注释。
- **代码示例**：
  ```typescript
  // 当前做法
  chrome.runtime.sendMessage({ kind: "captre", payload: ... }) // 拼写错误无法被 TS 发现
  ```

#### 解决方案
引入 **联合类型 (Union Types)** 和 **鉴别器 (Discriminated Unions)** 来定义严格的消息协议。

1.  **定义消息类型枚举/常量**：集中管理所有消息类型。
2.  **定义消息接口**：为每种消息类型定义具体的 Payload 结构。
3.  **泛型发送函数**：封装 `sendMessage`，强制类型检查。

**实施代码示例 (`src/types/messages.ts`)**：
```typescript
// 1. 定义消息类型
export type MessageKind =
  | 'capture'
  | 'toast'
  | 'webdav'
  | 'save-feedback'
  | 'set-recent-project';

// 2. 定义具体消息结构 (Discriminated Union)
export interface CaptureMessage {
  kind: 'capture';
  payload: { type: string; content: string; source: string };
}

export interface ToastMessage {
  kind: 'toast';
  text: string;
}

export interface WebDavMessage {
  kind: 'webdav';
  url: string;
  method: string;
  authBase64: string;
  body?: any;
}

// 所有消息的联合类型
export type RuntimeMessage = CaptureMessage | ToastMessage | WebDavMessage | SaveFeedbackMessage | SetRecentProjectMessage;

// 3. 类型安全的发送函数
export function sendMessage<T extends RuntimeMessage>(msg: T): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
```

---

### 2.2 缺陷二：异步 `sendResponse` 处理不当 (Async Response Handling)

#### 问题描述
在 Manifest V3 的 Service Worker 中，`chrome.runtime.onMessage` 监听器如果要返回异步结果，必须显式地 `return true`。
- **风险**：如果忘记 `return true`，连接会在监听器函数执行完毕时立即关闭，导致异步回调中的 `sendResponse` 失效，接收方永远收不到回复或收到 `undefined`。
- **现状**：代码中可能存在遗漏 `return true` 的情况，或者逻辑分支复杂导致难以确保每个异步路径都正确返回。

#### 解决方案
封装监听器注册逻辑，强制处理异步流程，消除手动 `return true` 的需要。

**实施代码示例 (`src/utils/messageHandler.ts`)**：
```typescript
type AsyncMessageHandler = (msg: any, sender: chrome.runtime.MessageSender) => Promise<any>;

export function registerMessageHandler(handler: AsyncMessageHandler) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // 始终返回 true 以保持通道开启，直到 Promise 结算
    handler(msg, sender)
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.message }))
      .finally(() => {
        // 可选：清理逻辑
      });

    return true; // 关键：告诉 Chrome 我们将异步响应
  });
}
```

**使用方式**：
```typescript
// background.ts
registerMessageHandler(async (msg, sender) => {
  if (msg.kind === 'webdav') {
    const res = await fetch(msg.url, { ... });
    return await res.json();
  }
  throw new Error(`Unknown message kind: ${msg.kind}`);
});
```

---

### 2.3 缺陷三：错误处理机制薄弱 (Weak Error Handling)

#### 问题描述
- **发送方**：往往忽略 `chrome.runtime.lastError`（例如接收页面已关闭时发送消息会抛出错误），导致未捕获的异常中断脚本执行。
- **接收方**：缺乏统一的错误捕获和上报机制，网络请求失败或逻辑错误可能直接吞掉，用户无感知。
- **现状**：错误处理散落在各个 `sendMessage` 调用处，风格不统一。

#### 解决方案
1.  **标准化响应格式**：所有消息回复统一为 `{ success: boolean, data?: T, error?: string }` 结构。
2.  **全局错误拦截**：在 Background 和 Content Script 中增加全局 `try-catch` 和 `onerror` 监听。
3.  **发送端包装器**：如 2.1 节所示，在 `sendMessage` 包装器中统一处理 `lastError`。

---

### 2.4 缺陷四：魔法字符串分散 (Scattered Magic Strings)

#### 问题描述
消息类型字符串（`"capture"`, `"toast"` 等）硬编码在多个文件中（`background.ts`, `capture.ts`, `options.tsx`）。
- **风险**：重构困难。如果需要修改某个消息类型名称，需要全局搜索替换，极易遗漏或误改。
- **现状**：缺乏单一的“事实来源” (Single Source of Truth)。

#### 解决方案
结合 **2.1** 的方案，将所有消息类型定义在 `src/types/messages.ts` 中导出。所有文件引用常量或类型，禁止直接使用字符串字面量。

```typescript
// 推荐用法
import { sendMessage } from '@/types/messages';
// 而不是
// chrome.runtime.sendMessage({ kind: "capture", ... })
```

---

### 2.5 缺陷五：竞态条件与状态同步延迟 (Race Conditions)

#### 问题描述
当前使用 `chrome.storage.local` 的时间戳 (`_dbp`, `_dbi`) 来触发 UI 刷新。
- **风险**：
  1.  **丢失更新**：如果两个操作几乎同时发生，后写入的时间戳可能覆盖先写入的，导致中间状态丢失（虽然概率低，但在高频操作下存在）。
  2.  **延迟感知**：Storage 的 `onChanged` 事件是异步的，且在不同上下文（Background vs Options Page）间传播有微小延迟，可能导致 UI 瞬间显示旧数据。
  3.  **无效刷新**：任何对该 key 的写入都会触发所有监听者刷新，即使数据本身没变（只是时间戳变了），造成性能浪费。

#### 解决方案
1.  **细粒度通知**：在消息 Payload 中直接携带变更类型（如 `entityType: 'project', action: 'create'`），接收方按需局部刷新，而非全量重载。
2.  **版本号机制**：如果必须用 Storage 同步，存储完整的版本号或哈希值，而不仅仅是时间戳，以便判断是否真的需要刷新。
3.  **直接消息通知**：对于由用户操作直接触发的变更（如在 Options 页新建项目），直接通过 `chrome.runtime.sendMessage` 通知其他活跃页面更新，作为 Storage 事件的补充或替代。

---

### 2.6 缺陷六：缺少请求追踪 (Lack of Request Tracing)

#### 问题描述
在调试复杂交互（如 WebDAV 同步）时，无法将发送的请求与返回的响应关联起来，尤其是当多个请求并发时。
- **风险**：难以定位是哪个组件发起了错误的请求，或者哪个响应被错误地处理了。

#### 解决方案
在消息协议中增加可选的 `requestId` 字段。
- **生成**：发送方生成 UUID 或自增 ID。
- **回传**：接收方在处理完成后，原样返回该 ID。
- **日志**：在日志系统中记录 `[Req-ID: xxx] Start...` 和 `[Req-ID: xxx] End...`。

---

## 3. 实施计划

### 阶段一：基础设施重构 (优先级：高)
1.  创建 `src/types/messages.ts`，定义所有消息类型的联合类型。
2.  实现类型安全的 `sendMessage` 和 `registerMessageHandler` 工具函数。
3.  重构 `background.ts` 中的 `onMessage` 监听器，使用新的处理器模式。

### 阶段二：业务逻辑迁移 (优先级：中)
1.  逐步替换 `capture.ts`、`options.tsx`、`new-project.tsx` 中的原生 `chrome.runtime.sendMessage` 调用。
2.  移除所有硬编码的字符串，改用导出的类型/常量。
3.  统一错误处理逻辑，确保所有异步操作都有 `catch` 块。

### 阶段三：优化与增强 (优先级：低)
1.  引入 `requestId` 进行调试增强。
2.  优化 Storage 同步机制，减少不必要的重渲染。
3.  编写单元测试覆盖消息处理逻辑。

---

## 4. 预期收益

-   **编译时安全**：90% 以上的消息协议错误将在 TypeScript 编译阶段被发现。
-   **运行稳定性**：消除因忘记 `return true` 导致的静默失败，统一错误捕获防止脚本崩溃。
-   **可维护性**：新增消息类型只需修改一个文件，重构成本降低。
-   **调试效率**：结构化日志和请求追踪将显著缩短问题定位时间。

---

## 5. 风险评估

-   **回归风险**：重构涉及多个文件的消息收发逻辑，需进行充分的端到端测试（特别是快捷键捕获、WebDAV 同步、右键菜单功能）。
-   **兼容性**：新协议仅影响代码内部，不改变 Extension ID 或与外部服务的交互，对用户无感知。