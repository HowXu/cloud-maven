# 测试 Agent 工作手册

> **状态**：初步开发已完成，测试覆盖已完善。

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
│   ├── useMavenMetadata.test.ts
│   ├── useTheme.test.ts
│   └── useClipboardToast.test.ts
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

## 工作流程

测试 Agent 在项目维护阶段运行测试：

1. **运行测试**: 执行 `npm run test` 收集结果
2. **分析失败**: 区分「测试代码问题」和「业务代码问题」
3. **测试代码问题**（mock 不全、配置错误等）：直接修复
4. **业务代码问题**（逻辑 bug、接口不符等）：
   - 在 Worker/Client 手册的「需求交接记录」章节写入交接记录指向对应角色

## 注意事项

- 不执行 npm 命令安装新依赖
- 测试代码只能修改 `*.test.ts`、`vitest.config.ts`
- 发现业务 bug 不直接修改业务源码，通过对方角色手册的交接记录章节交接
- 项目初步开发已完成，所有交接记录均已归档
