# Cloud-Maven 部署到 Cloudflare

这份教程按 `maillab/cloud-mail` 的方式写：只导入一次 Git 仓库，由一个 Cloudflare Worker 同时部署后端 API 和前端静态资源。

当前部署结构：

- Worker 代码：`maven-worker/src`
- 前端代码：`maven-client`
- 前端构建产物：部署时输出到 `maven-worker/dist`
- Cloudflare 静态资源绑定：`maven-worker/wrangler.toml` 的 `[assets]`
- R2：保存 Maven 制品和 metadata
- KV：保存配置、Token、Session 和轻量统计

部署完成后，同一个域名同时提供：

```text
https://你的-worker域名/                 前端管理界面
https://你的-worker域名/api/...          Admin/Auth/Maven API
https://你的-worker域名/com/example/...  Maven 文件读取/上传/删除
```

## 1. Fork 仓库

1. 在 GitHub 上 fork 本仓库到自己的账号或组织。
2. 确认 fork 后的默认分支是 `main`。
3. 不要把 token、密码、Cloudflare API key 写进仓库。

## 2. 创建 Cloudflare 存储资源

进入 Cloudflare Dashboard，先创建 Worker 需要的存储。

R2 bucket 建议命名为：

```text
cloud-maven
```

Workers KV namespace 可以命名为：

```text
cloud-maven-kv
```

创建后复制 KV namespace 的 `id`。

如果使用 Wrangler CLI，等价命令是：

```bash
npx wrangler r2 bucket create cloud-maven
npx wrangler kv namespace create MAVEN_KV
```

## 3. 修改 Worker 绑定配置

在 fork 仓库里编辑 `maven-worker/wrangler.toml`，把 KV 占位值替换成真实 id：

```toml
[[kv_namespaces]]
binding = "MAVEN_KV"
id = "<你的 KV namespace id>"
```

如果你的 R2 bucket 没有叫 `cloud-maven`，也同步修改：

```toml
[[r2_buckets]]
binding = "MAVEN_BUCKET"
bucket_name = "<你的 R2 bucket 名称>"
```

提交并推送到 fork 的 `main` 分支。

不要把 `ADMIN_BOOTSTRAP_TOKEN` 写进 `wrangler.toml`。它是 secret，后面在 Cloudflare Dashboard 里设置。

## 4. 一次导入 Worker

进入 Cloudflare Dashboard：

1. 打开 `Workers & Pages`。
2. 选择创建 Worker，并从 Git 仓库导入。
3. 连接你的 GitHub fork。
4. 项目目录选择：

```text
maven-worker
```

5. 生产分支选择：

```text
main
```

6. 保存并部署。

`maven-worker/wrangler.toml` 已经包含部署构建命令：

```toml
[build]
command = "npm --prefix ../maven-client install && npm --prefix ../maven-client run build -- --outDir ../maven-worker/dist && npm run build:worker"

[assets]
binding = "ASSETS"
directory = "./dist"
run_worker_first = true
```

也就是说，Cloudflare 导入 `maven-worker` 后会：

1. 安装并构建 `maven-client`
2. 把前端产物放进 `maven-worker/dist`
3. 类型检查 Worker
4. 用 `wrangler deploy` 一次发布 Worker 和前端静态资源

如果 Cloudflare 页面要求填写 Node 版本，可以设置：

```text
NODE_VERSION=20
```

部署成功后打开 Worker 根地址，应该能看到 Cloud-Maven 前端界面。健康检查地址是：

```text
https://你的-worker域名/api/status/health
```

正常返回：

```json
{"status":"ok"}
```

## 5. 设置首个管理员 Token

首次部署后，Worker 需要 `ADMIN_BOOTSTRAP_TOKEN` 创建第一个管理员账号。

在 Cloudflare Dashboard：

1. 打开刚部署的 Worker。
2. 进入 `Settings` -> `Variables and Secrets`。
3. 新增一个 Secret：

```text
Name: ADMIN_BOOTSTRAP_TOKEN
Value: 你自己生成的一段强密码
```

4. 保存并重新部署 Worker。
5. 访问一次 Worker，例如 `/api/status/health`，触发初始化。

如果 KV 中还没有任何 token，Worker 会自动创建：

```text
用户名: admin
密码: ADMIN_BOOTSTRAP_TOKEN 的值
权限: read/write/delete/manage on /
```

之后打开 Worker 根地址，用 `admin` 和该 secret 登录前端后台。

建议首次登录后立刻在 Admin 页面创建一个新的管理员 token，然后删除、禁用或轮换 bootstrap 管理员，避免长期依赖初始化密码。

## 6. 初始化系统设置

进入前端 `Settings` 页面，建议先确认：

- `baseUrl`：填写当前 Worker 的公开地址，例如 `https://cloud-maven-worker.<你的子域>.workers.dev`，或自定义域名 `https://repo.example.com`。
- `anonymousRead`：如果希望公开仓库可匿名下载，保持开启。
- `allowOverwrite`：生产环境建议关闭，避免 release 制品被覆盖。
- `generateChecksums`：小文件前端上传可以开启；大文件发布建议由 Maven/Gradle 客户端自己上传 checksum。
- `maintainMetadata`：当前项目保存该配置，但 Worker 默认不主动重写 `maven-metadata.xml`，主要依赖 Maven 客户端上传的 metadata。

因为前端和 Worker 同域部署，通常不需要设置 `VITE_API_BASE_URL`。

## 7. 绑定自定义域名，可选

推荐直接把自定义域名绑定到这个 Worker：

```text
repo.example.com -> Cloud-Maven Worker
```

绑定后，在前端 Settings 页面把 `baseUrl` 改成：

```text
https://repo.example.com
```

这样前端生成的 Maven/Gradle 依赖片段会指向正式仓库域名。

## 8. Maven 仓库地址

Cloud-Maven 当前不强制创建 `releases` 或 `snapshots` 子仓库，Worker 会把请求路径直接映射到 R2 key。最简单的仓库 URL 就是 Worker 根地址：

```xml
<repositories>
  <repository>
    <id>cloud-maven</id>
    <url>https://repo.example.com/</url>
  </repository>
</repositories>
```

如果你想人为区分路径，也可以把仓库 URL 设成：

```text
https://repo.example.com/releases
https://repo.example.com/snapshots
```

这样对象会分别存到 R2 的 `releases/...` 或 `snapshots/...` 前缀下。

当前代码的管理后台和 API 优先使用 Reposilite 风格的鉴权头：

```http
Authorization: xBasic base64(name:secret)
```

如果要让标准 Maven/Gradle 发布任务直接用 `settings.xml` 的 username/password 发布，需要先确认 Worker 已兼容普通 HTTP Basic Auth；否则发布时可能遇到 `401`。公开读取不受影响。

## 9. 常见问题

### 导入后只看到 Worker，没有前端

检查 Cloudflare 导入时的项目目录是否是：

```text
maven-worker
```

并确认 `maven-worker/wrangler.toml` 里存在：

```toml
[assets]
binding = "ASSETS"
directory = "./dist"
```

### Worker 部署失败，提示 KV id 无效

检查 `maven-worker/wrangler.toml`：

```toml
id = "<你的 KV namespace id>"
```

不要保留 `replace-with-kv-namespace-id`。

### 登录 admin 失败

检查 Worker 是否已经设置并重新部署 `ADMIN_BOOTSTRAP_TOKEN`。如果第一次部署时没有设置 secret，设置后需要重新部署 Worker，并再次访问 Worker 触发初始化。

### R2 里没有文件

确认上传或发布请求打到了 Worker 域名。单项目部署后，前端和 Maven 仓库在同一个域名下，但真正的 Maven 文件仍然由 Worker 写入 R2。

## 官方参考

- Cloudflare Workers Static Assets：<https://developers.cloudflare.com/workers/static-assets/>
- Cloudflare Workers Builds 配置：<https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>
- Cloudflare R2 创建 bucket：<https://developers.cloudflare.com/r2/buckets/create-buckets/>
- Cloudflare Workers KV namespace：<https://developers.cloudflare.com/workers/wrangler/commands/kv/>
- Cloudflare Workers Secrets：<https://developers.cloudflare.com/workers/configuration/secrets/>
- 参考项目 `maillab/cloud-mail`：<https://github.com/maillab/cloud-mail>
