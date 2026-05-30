# 前端 Agent 工作手册

## 角色定位

你是 Cloud-Maven 的前端开发 Agent，负责 `maven-client/` 目录下的所有工作。

## 关键文件

- `../Client.md` — 前端完整设计方案（页面规划、技术栈、分阶段实施）
- `../Worker.md` — 后端设计方案（接口路径、请求/响应格式、状态码）
- `../workspace.config.json` — 任务编排配置
- `./Worker.md` — 后端需求交接记录（向后端提需求的地方）

## 技术栈

- Vue 3 + TypeScript + Vite
- vue-router (hash history)
- UnoCSS (原子化 CSS)
- axios (HTTP 客户端)
- vue-final-modal, mosha-vue-toastify, @vueuse/core
- lucide-vue-next (图标)
- highlight.js (代码高亮)

## 当前进度 (2026-05-30)

### 已完成

- 移除 "Sererless Maven Repository" 强调文字
- Header 选项卡 Label 居中
- 未登录隐藏 Admin；Overview → Directory
- Login 提示框跟随全局主题（暗色模式适配）
- 字体换用 Inter（流行无衬线字体）
- Snippet 代码框引入 highlight.js 实现高亮
- 移除 release/snapshot 区分（默认仓库改为空）
- 移除 refresh 和 upload 功能（游客只有读取权限）
- 管理员目录删除功能（已有 DeleteArtifactModal 支持目录删除）
- 介绍卡片图片支持（Settings 新增 `introImage` 字段，IndexPage 从 settings API 加载图片 URL）
- 介绍卡片改为静态编译配置（`intro.config.ts`，图片圆角、支持附加行）
- 修复登录弹窗暗色模式不同步（dark class 挂到 documentElement）

## 目录结构

```
maven-client/src/
├── main.ts / App.vue
├── types.ts
├── intro.config.ts  # 静态介绍卡片配置（imageUrl、title、description、lines）
├── api/          # client.ts(axios实例), auth.ts, maven.ts, admin.ts, settings.ts
├── composables/  # useSession, useRepository, useMavenMetadata, useTheme, useClipboardToast
├── router/       # index.ts (hash history)
├── pages/        # IndexPage(Directory), AdminPage, SettingsPage
├── components/
│   ├── header/   # DefaultHeader, LoginModal
│   ├── browser/  # FileBrowserView, BreadcrumbNavigation, FileList, DeleteArtifactModal(目录级删除)
│   ├── card/     # SnippetsCard(highlight.js高亮)
│   ├── admin/    # TokenEditorModal
│   ├── common/   # EmptyState, LoadingState, ErrorState
│   └── intro/    # IntroCard(介绍卡片，图片+文本)
└── styles/       # base.css, transitions.css
```

## 核心约定

### API 调用

- 所有 API 调用通过 `src/api/` 下的模块进行
- axios 实例在 `client.ts` 中，鉴权通过 `xBasic` header 或 Cookie Session
- 需要新接口时，在 `./Worker.md` 需求交接记录章节写入，不直接改 Worker 代码

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
- 需要后端配合时在 `./Worker.md` 需求交接记录章节写入，不直接改 Worker 代码
- 前端只能操作 `maven-client/` 目录
- 设计参考 reposilite 但保持简化，纯 Maven 场景

## 需求交接记录

### 2026-05-30 - 前端 -> 后端

状态：已完成
来源：agents/Client.md | 页面/组件改动
需求：
- 介绍卡片图片：需要在 KV 中存储一张介绍图片，key 为 `intro_image`，值是图片 URL 或 base64。前端需要在 Settings 页面提供上传/更换图片的功能。
- Settings 页面：需要增加一个"介绍图片"字段，允许管理员上传/更换介绍卡片中的图片。

验收：
- Settings 页面有图片上传/更换入口
- 图片保存在 KV `intro_image` key 下
- 前端 IndexPage 在 Title 下渲染介绍卡片（左侧图片+右侧文本，图片从 KV 获取）

### 2026-05-30 - 后端 -> 前端

状态：已完成
来源：agents/Worker.md | 后端已完成
需求：
- 后端已支持 `intro_image` KV key 的读写
- 后端已移除 release/snapshots 区分
- 后端已修复 hasPermission 根路径匹配 bug
