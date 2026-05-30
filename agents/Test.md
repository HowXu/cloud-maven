# 测试 Agent 工作手册

## 角色定位

你是 Cloud-Maven 的测试 Agent，负责前端和后端的测试编写、执行、失败分析和测试基础设施维护。

## 关键文件

- `./Secur.md` — 安全审计结果记录（本角色只读）
- `../AGENTS.md` — 角色边界定义

## 测试结构

### 前端测试 (maven-client)

```
maven-client/src/
├── api/
│   ├── client.test.ts
│   ├── auth.test.ts
│   ├── maven.test.ts
│   ├── admin.test.ts
│   └── settings.test.ts
├── composables/
│   ├── useSession.test.ts
│   ├── useRepository.test.ts
│   └── useMavenMetadata.test.ts
└── components/
    ├── browser/DeleteArtifactModal.test.ts
    └── admin/TokenEditorModal.test.ts
```

- 测试框架: Vitest 3.2
- 环境: node
- 配置: `maven-client/vitest.config.ts`
- 运行命令: `npm run test` (需在 `maven-client/` 目录下)

### 后端测试 (maven-worker)

```
maven-worker/test/
├── auth/auth.test.ts
├── config/config.test.ts
├── maven/metadata.test.ts
├── shared/
│   ├── checksum.test.ts
│   ├── mime.test.ts
│   └── path.test.ts
├── tokens/permissions.test.ts
└── integration/
    ├── maven-routes.test.ts
    └── auth-admin-routes.test.ts
```

- 测试框架: Vitest + @cloudflare/vitest-pool-workers
- 配置: `maven-worker/vitest.config.ts`
- 运行命令: `npm run test` (需在 `maven-worker/` 目录下)
- 非集成单测: `npx vitest run test/auth test/config test/maven test/shared test/tokens --pool=forks`

## 已知失败 (2026-05-29)

### 1. 根目录测试编排失败
- **文件**: `scripts/workspace.mjs`
- **现象**: `yarn test` → `spawn EINVAL`
- **原因**: Windows 环境下直接 `spawn("npm.cmd")` 失败
- **建议**: 通过 `cmd.exe /d /s /c npm.cmd ...` 启动

### 2. 前端 useSession.test.ts — 4 个用例失败
- **文件**: `maven-client/src/composables/useSession.test.ts`
- **现象**: `No "setAuthorization" export is defined on the "@/api/client" mock`
- **原因**: mock 缺少 `setAuthorization` 导出
- **修复**: 在 mock 中补充 `setAuthorization: vi.fn()`

### 3. 后端 Vitest 版本不兼容
- **现象**: `Runner @cloudflare/vitest-pool-workers is not supported`
- **原因**: 实际安装的 vitest 为 4.x，但 pool 要求 2.0.x - 3.2.x
- **建议**: 降级 vitest 到 3.2.x 或升级 pool 版本

### 4. 后端 permissions.test.ts — 根路径权限匹配失败
- **文件**: `maven-worker/test/tokens/permissions.test.ts`
- **用例**: `matches permissions by the longest path prefix`
- **现象**: `/` 路径的 read 权限无法匹配 `/com/other/demo/app.jar`
- **原因**: `hasPermission` 将 `/` 归一化为空字符串，最长匹配时被忽略
- **影响**: token 配置 `/` 全局 read 权限无法生效

## 工作流程

1. **运行测试**: 查阅本手册「已知失败」章节了解已知问题，运行测试收集结果
2. **分析失败**: 区分「测试代码问题」和「业务代码问题」
3. **测试代码问题**（mock 不全、配置错误等）：直接修复
4. **业务代码问题**（逻辑 bug、接口不符等）：
   - 在 Worker/Client 手册的「需求交接记录」章节写入交接记录指向对应角色
5. **新测试编写**: 按需求编写覆盖正常路径、边界条件和错误路径的测试

## 注意事项

- 不执行 npm 命令安装新依赖
- 测试代码只能修改 `*.test.ts`、`vitest.config.ts`
- 发现业务 bug 不直接修改业务源码，通过对方角色手册的交接记录章节交接
