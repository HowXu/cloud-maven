# Cloud-Maven API Draft

本文档描述 `maven-client` 第一版前端需要的 Worker 后端接口。接口目标是支持 Maven 仓库浏览、文件下载/上传、基础登录、Admin 管理和 Settings 配置。

## 通用约定

- Base URL：与前端同源，或通过 `VITE_API_BASE_URL` 指向 Worker API。
- 鉴权 Header：优先兼容 Reposilite 风格。

```http
Authorization: xBasic base64(name:secret)
```

- 响应格式：业务接口默认返回 JSON。
- 错误格式：

```json
{
  "message": "Human readable error message",
  "code": "ERROR_CODE"
}
```

## Auth

### GET /api/auth/me

获取当前 token 身份。

权限：已登录。

Response:

```json
{
  "token": {
    "id": "token_01",
    "name": "admin",
    "description": "Default administrator",
    "createdAt": "2026-05-29T00:00:00.000Z"
  },
  "roles": ["manager"],
  "permissions": [
    {
      "path": "/",
      "actions": ["read", "write", "delete", "manage"]
    }
  ]
}
```

### POST /api/auth/logout

退出登录。若后端 token 无状态，可直接返回 `204 No Content`。

## Maven Repository

### GET /api/maven/details/:path*

获取 Maven 仓库路径下的目录详情。该接口是前端目录浏览的核心接口，应一次返回渲染列表所需数据，避免前端为每个对象再次请求 R2/KV。

权限：匿名读取开启时可匿名访问；否则需要 `read` 权限。

Response:

```json
{
  "path": "releases/com/example/app",
  "parentPath": "releases/com/example",
  "canRead": true,
  "canWrite": false,
  "entries": [
    {
      "name": "1.0.0",
      "path": "releases/com/example/app/1.0.0",
      "type": "DIRECTORY",
      "updatedAt": "2026-05-29T00:00:00.000Z",
      "permissions": {
        "read": true,
        "write": false,
        "delete": false
      }
    },
    {
      "name": "maven-metadata.xml",
      "path": "releases/com/example/app/maven-metadata.xml",
      "type": "FILE",
      "size": 512,
      "contentType": "application/xml",
      "updatedAt": "2026-05-29T00:00:00.000Z",
      "permissions": {
        "read": true,
        "write": false,
        "delete": false
      }
    }
  ]
}
```

### GET /:repository/:path*

读取 Maven 文件内容。用于 Maven 客户端拉取 artifact，也用于浏览器下载和前端读取 `maven-metadata.xml`。

权限：匿名读取开启时可匿名访问；否则需要 `read` 权限。

Response：原始文件流，并设置合适的 `Content-Type`、`ETag`、`Cache-Control`。

说明：

- `maven-metadata.xml` 必须通过该路径返回 XML 文本，建议 `Content-Type: application/xml; charset=utf-8`。
- 前端会先尝试读取当前路径的 `maven-metadata.xml`，再尝试父级 artifact 路径的 `maven-metadata.xml`，用于判断当前位置是 artifact 目录还是 version 目录。
- `404` 表示 metadata 或文件不存在，前端会使用路径启发式兜底生成依赖片段。

### PUT /:repository/:path*

上传 Maven 文件。

权限：需要 `write` 权限。

Request:

```http
Content-Type: application/octet-stream
X-Generate-Checksums: true
```

Body：原始文件内容。

Response:

```json
{
  "path": "releases/com/example/app/1.0.0/app-1.0.0.jar",
  "size": 123456,
  "checksums": {
    "sha1": "optional",
    "md5": "optional"
  }
}
```

### DELETE /:repository/:path*

删除 Maven 文件或目录。

权限：需要 `delete` 权限。

Response:

```json
{
  "deleted": true,
  "path": "releases/com/example/app/1.0.0/app-1.0.0.jar"
}
```

### POST /api/maven/generate/pom/:path*

可选接口。前端上传 jar 后，如需要后端生成 POM，可调用该接口。

权限：需要 `write` 权限。

Request:

```json
{
  "groupId": "com.example",
  "artifactId": "app",
  "version": "1.0.0"
}
```

## Admin

### GET /api/admin/stats

获取管理页统计数据。

权限：需要 `manager`。

Response:

```json
{
  "repositories": 2,
  "objects": 128,
  "storageBytes": 10485760,
  "requests24h": 4096,
  "errors24h": 3
}
```

### GET /api/admin/tokens

获取访问 token 列表。

权限：需要 `manager`。

Response:

```json
[
  {
    "id": "token_01",
    "name": "admin",
    "description": "Default administrator",
    "enabled": true,
    "createdAt": "2026-05-29T00:00:00.000Z",
    "permissions": [
      {
        "path": "/",
        "actions": ["read", "write", "delete", "manage"]
      }
    ]
  }
]
```

### POST /api/admin/tokens

创建访问 token。

权限：需要 `manager`。

Request:

```json
{
  "name": "publisher",
  "description": "CI publish token",
  "permissions": [
    {
      "path": "/releases",
      "actions": ["read", "write"]
    }
  ]
}
```

Response:

```json
{
  "id": "token_02",
  "name": "publisher",
  "secret": "generated-secret-value",
  "description": "CI publish token",
  "enabled": true,
  "createdAt": "2026-05-29T00:00:00.000Z",
  "permissions": [
    {
      "path": "/releases",
      "actions": ["read", "write"]
    }
  ]
}
```

### PUT /api/admin/tokens/:id

更新 token 名称、描述、启用状态或权限。

权限：需要 `manager`。

### DELETE /api/admin/tokens/:id

删除 token。

权限：需要 `manager`。

## Settings

### GET /api/admin/settings

获取系统设置。

权限：需要 `manager`。

Response:

```json
{
  "title": "Cloud-Maven",
  "baseUrl": "https://repo.example.com",
  "defaultRepository": "releases",
  "anonymousRead": true,
  "allowOverwrite": false,
  "generateChecksums": true,
  "maintainMetadata": true
}
```

### PUT /api/admin/settings

更新系统设置。

权限：需要 `manager`。

Request：同 `GET /api/admin/settings` 响应结构。

Response：保存后的设置。

## 前端依赖的状态码

- `200`：请求成功。
- `201`：创建成功。
- `204`：成功且无响应体。
- `400`：请求格式错误。
- `401`：未登录或 token 无效。
- `403`：权限不足。
- `404`：路径或资源不存在。
- `409`：文件已存在且不允许覆盖。
- `500`：Worker 内部错误。
