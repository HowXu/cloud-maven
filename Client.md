# Cloud-Maven Client 前端规划

## 目标定位

`maven-client` 是 Cloud-Maven 的前端管理与仓库浏览界面。它需要参考 Reposilite 的前端体验，保持相近的布局、暗色模式、Tab 导航、文件浏览、代码片段复制和轻量动画，同时针对本项目进行简化，只服务于纯 Maven 仓库与基础权限管理。

前端实现范围限定在 `maven-client` 目录。前端所需的后端接口统一整理到根目录 `API.md`，需要 Worker 配合的结构或接口事项同步记录到根目录 `STRUCT.md` 的“需求交接记录”，供后端 AGENT 实现时对齐。

## 技术栈

- 框架：Vue 3
- 语言：TypeScript
- 构建工具：Vite
- 路由：vue-router，优先使用 hash history，降低 Cloudflare Worker 静态托管和刷新路由的复杂度
- 状态管理：Vue composables，不额外引入 Pinia，保持项目轻量
- HTTP 客户端：axios
- 样式方案：WindiCSS 或 UnoCSS，优先复用 Reposilite 的工具类设计思路
- 弹窗：vue-final-modal
- Toast：mosha-vue-toastify
- 工具库：@vueuse/core
- 图表：vue3-apexcharts，仅在 Dashboard/Stats 需要时引入

## 本地执行约束

- `PROJECT.md` 已声明 npm 相关命令禁止执行。
- 前端开发过程中不主动运行 `npm install`、`npm run build`、`npm run dev` 等命令。
- 阶段验收以文件结构、静态代码检查和人工语法巡检为主。
- 如果后续确实需要安装依赖、启动开发服务或执行构建验证，会先明确告知并等待确认。

## 视觉与交互方向

整体风格参考 `reposilite/reposilite-frontend`：

- 顶部 Header 展示产品名、登录状态、主题切换入口
- 主区域使用 Tab 分区：Overview、Admin、Settings
- 支持浅色/深色主题，并将主题状态保存在 localStorage
- 仓库浏览页使用面包屑导航和文件列表
- 代码片段卡片支持 Maven、Gradle Kotlin、Gradle Groovy 等格式切换
- 常用操作使用柔和 hover、短距离 slide、fade 动画
- 管理功能保持克制的信息密度，不做营销型页面

## 页面规划

### Overview

仓库浏览与依赖使用页面。

功能：

- 展示 Maven 仓库目录结构
- 支持 repository、group、artifact、version、文件层级浏览
- 面包屑路径导航
- 文件下载
- 根据当前位置生成 Maven/Gradle 依赖片段
- 支持复制依赖片段
- 对公开仓库支持匿名浏览
- 对受限仓库根据权限展示可访问范围

### Admin

管理员页面。

功能：

- 登录和登出
- 当前 token 信息展示
- 基础权限展示
- 仓库整体状态概览
- R2 存储对象数量和占用展示
- Worker 请求统计展示
- 上传 artifact
- 删除 artifact
- token 列表管理
- 创建、禁用或删除 token
- 给 token 配置读写路径权限

第一版 Admin 可以优先实现登录状态、仓库统计、token 列表和基础权限展示，上传、删除、权限编辑作为第二阶段增强。

### Settings

系统配置页面。

功能：

- 仓库名称
- 基础 URL
- 默认仓库路径
- 是否允许匿名读取
- 是否允许上传覆盖
- 是否自动生成 checksum
- 是否自动维护 maven-metadata.xml
- 保存配置

## 前端目录规划

```text
maven-client/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  uno.config.ts 或 windi.config.ts
  src/
    main.ts
    App.vue
    router/
      index.ts
    api/
      client.ts
      auth.ts
      maven.ts
      admin.ts
      settings.ts
    composables/
      useSession.ts
      useTheme.ts
      useRepository.ts
      useMavenMetadata.ts
      useClipboardToast.ts
    pages/
      IndexPage.vue
      AdminPage.vue
      SettingsPage.vue
    components/
      header/
        DefaultHeader.vue
        LoginModal.vue
        ThemeToggle.vue
      browser/
        FileBrowserView.vue
        BreadcrumbNavigation.vue
        FileList.vue
        FileListEntry.vue
        UploadArtifactModal.vue
        DeleteEntryModal.vue
      card/
        SnippetsCard.vue
        RepositorySnippet.vue
        ArtifactSnippet.vue
      admin/
        AdminOverview.vue
        StorageStats.vue
        TokenList.vue
        TokenEditor.vue
        PermissionEditor.vue
      settings/
        SettingsForm.vue
      common/
        EmptyState.vue
        LoadingState.vue
        ErrorState.vue
      icons/
    styles/
      base.css
      transitions.css
```

## 状态与数据设计

### Session

`useSession` 负责：

- 保存 token name/secret 或后端返回的访问凭证
- 初始化登录状态
- 获取当前用户信息
- 判断是否管理员
- 判断指定路径是否有读写权限
- 退出登录

### Repository

`useRepository` 负责：

- 当前路径解析
- 目录列表加载
- 目录缓存
- 文件下载 URL 生成
- 上传和删除后的局部刷新

### Maven Metadata

`useMavenMetadata` 负责：

- 解析 `maven-metadata.xml`
- 判断当前位置是否是 artifact
- 生成依赖片段所需的 groupId、artifactId、version

## 后端 API 需求草案

这些接口后续需要写入根目录 `API.md`，供后端实现。

### Auth

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Maven

- `GET /api/maven/details/:path*`
- `GET /:repository/:path*`
- `PUT /:repository/:path*`
- `DELETE /:repository/:path*`
- `POST /api/maven/generate/pom/:path*`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/tokens`
- `POST /api/admin/tokens`
- `PUT /api/admin/tokens/:id`
- `DELETE /api/admin/tokens/:id`
- `GET /api/admin/permissions`
- `PUT /api/admin/permissions/:tokenId`

### Settings

- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## 性能策略

- 路径列表接口一次返回前端渲染所需字段，减少额外请求
- 前端对目录列表做内存缓存，返回上级目录时避免重复请求
- 只有进入 Admin/Dashboard 时才加载图表相关代码
- 上传、删除成功后只刷新当前目录
- 静态资源构建后启用 hash 文件名，方便 Cloudflare 缓存
- 大文件下载直接走 Maven 文件 URL，不由前端额外转换
- 避免前端轮询，统计信息按需刷新或手动刷新

## 分阶段实施

### 第一阶段：可运行骨架

- 初始化 Vue 3 + TypeScript + Vite 项目
- 配置路由、主题、基础布局
- 实现 Header、Tabs、LoginModal
- 实现 Overview 基础目录浏览
- 编写第一版 `API.md`

### 第二阶段：Maven 浏览体验

- 完成面包屑导航
- 完成文件下载
- 实现 Maven metadata 解析
- 实现依赖片段卡片和复制能力
- 补充空目录、加载中、错误状态

### 第三阶段：Admin 管理

- 实现管理员鉴权
- 实现统计概览
- 实现 token 列表
- 实现路径权限展示
- 实现上传和删除 artifact

### 第四阶段：Settings 与打磨

- 实现设置表单
- 完成暗色模式细节
- 完成移动端适配
- 补充构建校验
- 使用浏览器进行视觉检查

## 阶段交付记录

### 第一阶段

- 已建立 Vue 3 + TypeScript + Vite 前端骨架。
- 已完成基础路由、主题、登录弹窗、Overview/Admin/Settings 页面骨架。
- 已建立第一版 `API.md`。

### 第二阶段

- 完善 Maven 浏览页加载、错误、空目录状态。
- 下载按钮改为前端受控下载流程，支持下载中状态和 Toast 反馈。
- 依赖片段卡片改为优先读取 `maven-metadata.xml`，再使用路径启发式兜底。
- Maven 坐标推断区分 artifact 目录和 version 目录，避免长 groupId 路径误判。
- `API.md` 和 `STRUCT.md` 已补充前端读取 `maven-metadata.xml` 的 Worker 配合要求。

## 风险与待确认项

- 后端鉴权方案需要确认：沿用 Reposilite 的 `xBasic` token 风格，还是使用 Bearer token。
- Maven 目录详情接口需要明确返回格式，前端依赖该接口判断文件/目录、大小、更新时间和权限。
- 是否允许匿名读取会影响 Overview 首屏加载逻辑。
- 上传 artifact 是否要求前端上传单文件，还是支持一次上传 jar、pom、sources、javadoc 和 checksum 文件组。
- `maven-metadata.xml` 是后端生成还是前端辅助触发生成，需要后端方案确认。
