# Cloud-Maven 项目目标

依靠 Cloudflare 的 KV 存储、R2 存储以及 Worker(Serverless) 构建一个可一键部署的 Cloud-Maven 系统。

# 项目结构

根目录下包含了worker和client两端，因此总体项目结构由根目录的配置文件负责，负责单一端的AGENT将本端的需求写入根目录的STRUCT.md文件，由特定的AGENT实现

# 共同分析内容

需要细致地分析Maven的存储结构和实现，以及如何使用kv存储 r2存储以及worker实现Maven仓库

# 本机环境

已经安装node.js，不需要进行maven测试

npm相关命令已被禁止，如有需求请告知

## 前端要求

前端设计参考reposilite这个项目，保持风格和动画一致

技术栈使用Vue和typescript，可直接使用reposilite已有的css设计和某些页面规划

前端设计的目录是maven-client，前端设计者仅有该文件夹的读写权限

请将前端需要的后端API写入到根目录的API.md文件中

前端需要设计admin管理页面

## 后端要求

后端可以参考reposilite这个项目，但是可以相对简化，只需要纯粹的Maven就可以了，不需要Plugin等

前端需要的api都写在根目录的API.md中，按照其中的标准和需求完成

使用typescript进行开发，注意Cloudflare的worker是Serverless的

同样需要简单的权限管理，可参考reposilite这个项目

## 共同要求

高性能，减少Cloudflare的计费资源消耗

## 当前进度（2026-05-29）

- 项目已统一命名为 Cloud-Maven，根目录采用 `maven-client` 与 `maven-worker` 两端工作区结构。
- 根目录已具备 `PROJECT.md`、`STRUCT.md`、`API.md`、`Client.md`、`Worker.md`、`workspace.config.json` 和 `scripts/workspace.mjs`，用于跨端交接、接口契约和任务编排。
- 前端已完成 Vue 3 + TypeScript + Vite 骨架、Hash 路由、主题切换、登录弹窗、仓库浏览、面包屑、文件下载、依赖片段生成、Admin 基础视图、token 基础管理、artifact 上传/单文件删除和 Settings 表单。
- 前端第三、第四阶段仍有增强项待做：token 编辑与权限编辑器、目录级删除体验、移动端细节、视觉联调和构建校验。
- Worker 端已完成基础工程、Hono 入口、Cloudflare R2/KV 绑定配置、通用响应/错误/路径/MIME/Checksum 工具、Token 与 Session 鉴权、Admin 基础接口、Settings 接口、Maven 文件读写删、目录详情、版本摘要、目录级删除、POM 生成接口和部署初始化说明的首版实现。
- 后端仍需继续打磨统计成本控制、metadata 维护策略和生产级边界处理。
- 当前后端交接只要求 Worker 开发，不要求执行 npm 安装、构建、测试、开发服务或部署验证。
