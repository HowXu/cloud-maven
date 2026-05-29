# Cloud-Maven 测试失败记录

记录时间：2026-05-29

本次按要求跳过 `PROJECT.md`，读取了 `STRUCT.md`、`Worker.md`、`Client.md` 和现有单元测试后启动测试。以下记录本次实际运行情况和失败原因。

## 根目录测试编排

运行命令：

```powershell
yarn test
```

运行结果：

```text
yarn run v1.22.22
$ node scripts/workspace.mjs task test
spawn EINVAL
error Command failed with exit code 1.
```

错误原因：

- 根目录 `scripts/workspace.mjs` 使用 Node `spawn("npm.cmd", ["run", script])` 启动子项目脚本。
- 当前 Windows/Node 环境下，Node 直接 `spawn("npm.cmd")` 会抛出 `spawn EINVAL`。
- 因此根目录编排没有真正进入前端或后端 Vitest 测试。
- 直接在子项目目录执行 `npm run test` 可以启动测试，说明失败点在根目录任务编排的子进程启动方式，而不是测试入口本身。

影响：

- `yarn test` 当前不能作为根目录统一测试入口使用。
- 前后端测试需要临时分别进入 `maven-client`、`maven-worker` 单独运行。

建议修正：

- 在 `scripts/workspace.mjs` 的 Windows 分支中通过 `cmd.exe /d /s /c npm.cmd ...` 启动 npm，或改用兼容 Windows shim 的子进程启动方式。

## 前端测试

运行目录：

```text
maven-client
```

运行命令：

```powershell
npm run test
```

运行结果：

```text
Test Files  1 failed | 9 passed (10)
Tests       4 failed | 37 passed (41)
```

失败文件：

```text
maven-client/src/composables/useSession.test.ts
```

失败用例：

```text
returns logged-in state when session details are present
returns not logged in when session details are null
checks permission path prefix for read/write/delete actions
manager role always returns true for any path action
```

错误信息：

```text
Error: [vitest] No "setAuthorization" export is defined on the "@/api/client" mock.
```

错误原因：

- `maven-client/src/composables/useSession.ts` 从 `@/api/client` 导入并调用了 `setAuthorization`。
- `maven-client/src/composables/useSession.test.ts` 中 mock 了 `@/api/client`，但 mock 只提供了 `apiClient`，没有提供 `setAuthorization`。
- Vitest 在加载 `useSession.ts` 时解析不到 mock 导出的 `setAuthorization`，导致该测试文件中的 4 个用例全部失败。

影响：

- 前端 API、metadata、repository、弹窗等其他测试已通过。
- 当前前端失败集中在测试 mock 不完整，不是业务断言失败。

建议修正：

- 在 `useSession.test.ts` 的 `vi.mock("@/api/client", ...)` 中补充 `setAuthorization: vi.fn()`。
- 修正后重新运行 `maven-client` 测试确认。

## 后端测试

运行目录：

```text
maven-worker
```

### 后端完整测试入口

运行命令：

```powershell
npm run test
```

运行结果：

```text
Test Files  no tests
Tests       no tests
Errors      9 errors
```

核心错误：

```text
Error: Runner @cloudflare/vitest-pool-workers is not supported.
```

错误原因：

- 当前实际安装的 `vitest` 版本是 `4.1.7`。
- 当前实际安装的 `@cloudflare/vitest-pool-workers` 版本是 `0.8.71`。
- `@cloudflare/vitest-pool-workers@0.8.71` 的 peer dependency 要求 `vitest` 为 `2.0.x - 3.2.x`。
- 因此 Cloudflare Workers 测试池无法在 Vitest 4 下运行，后端完整测试入口没有进入实际用例执行。

影响：

- `maven-worker` 的集成测试暂时无法通过默认 `vitest run` 启动。
- 受影响测试包括 `test/integration/maven-routes.test.ts` 和 `test/integration/auth-admin-routes.test.ts`，以及默认使用 Workers pool 的其他测试文件调度。

建议修正：

- 将 `vitest` 降级到 Cloudflare pool 支持范围内，例如 `3.2.x`。
- 或升级 `@cloudflare/vitest-pool-workers` 到支持 Vitest 4 的版本；如果当前生态暂无支持，优先降级 Vitest。

### 后端非集成单元测试

为绕过 Cloudflare Workers pool 兼容问题，额外运行了非 integration 单测：

```powershell
npx vitest run test\auth test\config test\maven test\shared test\tokens --pool=forks
```

运行结果：

```text
Test Files  1 failed | 6 passed (7)
Tests       1 failed | 28 passed (29)
```

失败文件：

```text
maven-worker/test/tokens/permissions.test.ts
```

失败用例：

```text
matches permissions by the longest path prefix
```

失败断言：

```text
expected hasPermission(permissions, "/com/other/demo/app.jar", "read") to be true
received false
```

错误原因：

- 测试期望根路径权限 `{ path: "/", actions: ["read"] }` 能覆盖所有子路径读取。
- `maven-worker/src/tokens/index.ts` 中 `hasPermission` 会把权限路径 `/` 归一化成空字符串。
- 之后用 `permPath.length > bestPath.length` 判断最长匹配时，根路径长度为 `0`，与初始 `bestPath = ""` 长度相同，导致根路径权限没有被记录为匹配结果。
- 所以 `/` 的 read 权限没有正确放行 `/com/other/demo/app.jar`。

影响：

- 后端权限模型中的根路径权限可能无法作为全局默认权限生效。
- 这会影响只配置 `/` read 的 token 对任意 Maven 路径的读取判断。

建议修正：

- 调整 `hasPermission` 根路径匹配逻辑，确保 `/` 权限可以作为全局前缀匹配。
- 可将根权限保留为 `/` 而不是裁剪为空字符串，或在最长匹配判断中明确处理根路径。

### 后端强制 forks 全量测试补充

额外运行：

```powershell
npx vitest run --pool=forks
```

运行结果：

```text
Test Files  3 failed | 6 passed (9)
Tests       1 failed | 28 passed (29)
```

额外失败原因：

- integration 测试导入 `cloudflare:test` 后，需要 Workers pool 提供的 `cloudflare:test-internal`。
- 在 `--pool=forks` 下没有该内部模块，因此 `test/integration/*.test.ts` 无法运行。
- 这说明 integration 测试不能简单用 forks pool 替代，仍需要修复 Cloudflare Workers pool 与 Vitest 的版本兼容问题。

