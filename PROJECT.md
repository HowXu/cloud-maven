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
