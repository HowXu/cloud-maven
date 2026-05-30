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

### 2026-05-30 - 安全审计 -> 前端

状态：待处理
来源：安全审计 | `maven-client/src`
需求：
- 【高】清理并隔离目录缓存，避免登出/切换账号后泄露私有目录。`maven-client/src/composables/useRepository.ts:7` 使用全局 `Map`，`21-32` 只按 path 命中缓存；`maven-client/src/components/browser/FileBrowserView.vue:32-37` 登出时只强制刷新当前路径，其他已缓存私有路径仍可能在同一 SPA 会话内通过导航重新显示。建议提供 `clearRepositoryCache()`，在 login/logout/session 初始化失败时清空；或把 token id/匿名态纳入 cache key，并对私有响应禁用缓存。
- 【高】移除 token secret 的 localStorage 持久化。`maven-client/src/composables/useSession.ts:11-23` 从 localStorage 读取并保存 token name/secret，`maven-client/src/api/client.ts:15-25` 再写入全局 Authorization 头；一旦有 XSS、浏览器扩展或同源脚本风险，长期凭证会被直接读取。建议优先使用后端已支持的 HttpOnly Cookie Session，只在内存中保存会话详情；若保留 xBasic，应改为显式“记住我”且默认 sessionStorage/内存态，并在 `/api/auth/me` 失败时清除本地凭证和 Authorization 头。
- 【中】修复 snippet 高亮的 `v-html` 失败回退。`maven-client/src/components/card/SnippetsCard.vue:154-160` 在 highlight.js 抛错时返回原始 snippet，`215` 使用 `v-html` 注入；snippet 来源包含 settings、路径和 maven-metadata.xml 内容。建议失败时 HTML escape，或改为纯文本渲染/`textContent` 后再高亮，避免任何未经转义的字符串进入 `v-html`。
- 【中】统一前端权限路径匹配逻辑。`maven-client/src/composables/useSession.ts:72-73` 使用 `path.startsWith(permission.path)`，没有路径段边界，`/com/example` 会匹配 `/com/exampleevil`；`maven-client/src/components/browser/FileList.vue:31` 依赖该结果决定是否展示删除入口。后端仍应最终鉴权，但前端会误展示危险操作。建议复用后端“相等或 `${permPath}/` 前缀”的规则，并特殊处理 `/`。
- 【低】上传路径缺少前端侧安全校验。`maven-client/src/components/browser/UploadArtifactModal.vue:24-27` 直接拼接目标文件名，`46-55` 直接上传；`maven-client/src/api/maven.ts:4/21-27` 只去掉前导斜杠。虽然后端会拒绝 `..`、反斜杠、重复斜杠和 `/api/*`，前端仍应提前校验并给出明确错误，减少误操作和异常请求。
- 【低】介绍图使用第三方明文 HTTP 资源。`maven-client/src/intro.config.ts:8` 当前为 `http://q1.qlogo.cn/...`，`maven-client/src/components/common/IntroCard.vue:12` 直接渲染到 `<img>`。HTTPS 部署时可能产生混合内容拦截，并向第三方泄露访问者请求信息。建议改为 HTTPS、自托管静态资源或 R2 资源，并为外部图片设置合适的 `referrerpolicy`。
验收：
- 登录、登出、切换账号、`/api/auth/me` 失败后，旧账号私有目录不会从缓存重新显示；新增用例覆盖“访问私有目录 -> 登出 -> 导航回旧路径”。
- localStorage 中不再出现 `cloud-maven-token-secret`；刷新后会话依赖 HttpOnly Cookie 或显式短期存储；认证失败会清空 Authorization 头。
- `SnippetsCard` 不再把未转义字符串传入 `v-html`；恶意 metadata/path/settings 文本只会作为文本显示。
- 前端 `can(path, action)` 与后端路径权限规则一致；边界用例 `/com/example` 不匹配 `/com/exampleevil`。
- 上传表单能在提交前拒绝不安全路径；介绍图不再依赖明文 HTTP 第三方 URL。
备注：
- 本次只审计前端，未修改 `maven-client/` 业务源码，未执行 npm/test 命令。
- 已验证的正向点：多数模板使用 Vue mustache 自动转义；除 snippet 高亮外未发现其他 `v-html`/`innerHTML`；外链文件预览已带 `rel="noreferrer"`；Admin/Settings 页面前端有 manager 状态判断，但仍必须以后端鉴权为准。

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

### 2026-05-30 - 测试 -> 前端

状态：已完成
来源：agents/Test.md | maven-client/src/composables/useRepository.ts
需求：
- `useRepository` composable 缺少 `canDelete` 计算属性暴露。`RepositoryDetails` 类型已新增 `canDelete: boolean`，mock 数据已包含该字段，但 composable 未像 `canWrite` 那样导出 `canDelete` computed，导致组件无法使用。
- 需在 `useRepository` 中添加 `const canDelete = computed(() => details.value?.canDelete === true)` 并导出。
当前进展：
- `useRepository.ts:16` 已添加 `canDelete` computed 并导出。
验收：
- `useRepository` 返回对象中有 `canDelete` computed
- 测试文件 `useRepository.test.ts` 中已有 mock 数据支持，添加对应测试用例即可验证
