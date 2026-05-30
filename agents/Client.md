# 前端 Agent 工作手册

## 角色定位

你是 Cloud-Maven 的前端开发 Agent，负责 `maven-client/` 目录下的所有工作。

## 关键文件

- `../Client.md` — 前端完整设计方案（页面规划、技术栈、分阶段实施）
- `../API.md` — 后端 API 契约（接口路径、请求/响应格式、状态码）
- `../STRUCT.md` — 需求交接记录（向后端提需求的地方）
- `../workspace.config.json` — 任务编排配置

## 技术栈

- Vue 3 + TypeScript + Vite
- vue-router (hash history)
- UnoCSS (原子化 CSS)
- axios (HTTP 客户端)
- vue-final-modal, mosha-vue-toastify, @vueuse/core
- lucide-vue-next (图标)

## 当前进度 (2026-05-29)

四个阶段全部基本完成：

1. **骨架**: Vue 3 + Vite + 路由 + 主题 + Header/Tabs/LoginModal
2. **Maven 浏览**: 目录浏览、面包屑、文件下载、依赖片段（Maven/Gradle Kotlin/Gradle Groovy）、空/加载/错误状态
3. **Admin**: 统计概览、token CRUD、TokenEditorModal、上传/删除 artifact、DeleteArtifactModal、权限展示
4. **打磨**: Settings 表单、暗色模式、移动端适配、视觉联调、构建校验

### 已知待办

- 前端测试 `useSession.test.ts` 有 4 个失败用例（mock 缺少 `setAuthorization` 导出）
- 性能优化：大文件下载体验、目录缓存策略微调

## 目录结构

```
maven-client/src/
├── main.ts / App.vue
├── types.ts
├── api/          # client.ts(axios实例), auth.ts, maven.ts, admin.ts, settings.ts
├── composables/  # useSession, useRepository, useMavenMetadata, useTheme, useClipboardToast
├── router/       # index.ts (hash history)
├── pages/        # IndexPage, AdminPage, SettingsPage
├── components/
│   ├── header/   # DefaultHeader, LoginModal
│   ├── browser/  # FileBrowserView, BreadcrumbNavigation, FileList, UploadArtifactModal, DeleteArtifactModal
│   ├── card/     # SnippetsCard
│   ├── admin/    # TokenEditorModal
│   └── common/   # EmptyState, LoadingState, ErrorState
└── styles/       # base.css, transitions.css
```

## 核心约定

### API 调用

- 所有 API 调用通过 `src/api/` 下的模块进行
- axios 实例在 `client.ts` 中，鉴权通过 `xBasic` header 或 Cookie Session
- 需要新接口时，先在 `API.md` 中定义，再在 `STRUCT.md` 写交接记录给后端

### 状态管理

- 使用 Vue composables，不引入 Pinia
- `useSession`: 登录态、权限判断、token 持久化
- `useRepository`: 目录缓存、路径解析、列表加载
- `useMavenMetadata`: metadata 解析、依赖片段生成

### 样式

- UnoCSS 原子类为主，`styles/base.css` 补充全局样式
- 支持浅色/深色主题（`useTheme`），主题状态存 localStorage
- 参考 Reposilite 前端风格

## 注意事项

- 不执行 npm 命令
- 需要后端配合时写入 `STRUCT.md` 交接记录，不直接改 Worker 代码
- 前端只能操作 `maven-client/` 目录
- 设计参考 reposilite 但保持简化，纯 Maven 场景
