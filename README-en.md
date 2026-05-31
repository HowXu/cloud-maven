# Cloud-Maven

<p align="center">
    <h1 align="center">Cloud-Maven</h1>
    <p align="center">Lightweight Maven repository powered by Cloudflare Workers, one-click deploy 🎉</p>
    <p align="center">
        <a href="./README.md">简体中文</a>
    </p>
</p>

## Overview

Deploy a fully-featured Maven repository with an admin UI using a single Cloudflare Worker. Compatible with Maven/Gradle clients for push and pull operations, inspired by Reposilite's frontend experience.

## Screenshots

| ![](screenshots/sc1.png) | ![](screenshots/sc2.png) |
|-------------------------|-------------------------|
| ![](screenshots/sc3.png) | ![](screenshots/sc4.png) |

## Features

- **One-click deploy** — Fork the repo and import via Cloudflare Dashboard, no server management
- **Admin UI** — Directory browser, Token management, System settings out of the box
- **Maven protocol compatible** — Works with `mvn deploy`, `mvn release`, and `settings.xml` authentication
- **R2 Object Storage** — Artifacts mapped directly to R2 Keys, no capacity limits
- **On-demand Checksums** — Auto-generate SHA1/MD5 for small files; clients should upload checksums for large files
- **Fine-grained permissions** — Token-level path access control with anonymous read support

## Tech Stack

- **Runtime**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- **Web Framework**: [Hono](https://hono.dev/)
- **Frontend**: Vue 3 + TypeScript + Vite + UnoCSS
- **Storage**: Cloudflare R2 + Workers KV
- **Security**: PBKDF2-SHA256 token hashing, HttpOnly Cookie Session, configurable CORS

## Project Structure

```
cloud-maven
├── maven-worker/          # Cloudflare Worker backend
│   ├── src/
│   │   ├── auth/          # Auth: xBasic / Bearer / Cookie Session
│   │   ├── tokens/        # Token CRUD, permission matching, bootstrap
│   │   ├── admin/         # Admin API: stats, token management, settings
│   │   ├── maven/         # Maven routes: GET/HEAD/PUT/DELETE
│   │   ├── config/        # KV repository policy and settings
│   │   ├── storage/       # R2 adapter layer
│   │   └── shared/        # Path validation, MIME, checksum, error responses
│   ├── test/              # Vitest unit tests + integration tests
│   ├── wrangler.toml      # Production deploy config
│   └── wrangler-dev.toml  # Local dev config
│
└── maven-client/          # Vue 3 frontend admin UI
    ├── src/
    │   ├── api/           # axios request wrappers
    │   ├── composables/   # useSession, useRepository, useMavenMetadata
    │   ├── pages/         # IndexPage, AdminPage, SettingsPage
    │   └── components/    # Header, FileBrowser, TokenEditor, DeleteModal
    └── dist/             # Frontend build output (deployed to Worker)
```

## Deployment Guide

### 1. Create Cloudflare Resources

Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) and create:

- **R2 bucket**: name it `cloud-maven`
- **Workers KV namespace**: name it `cloud-maven-kv`, copy its `id`

### 2. Fork and Import

1. Fork this repo to your GitHub account
2. Cloudflare Dashboard → **Workers & Pages** → **Create Worker** → **Import from Git**
3. Connect your fork, set directory to `maven-worker`, branch to `main`

### 3. Configure Bindings

Fill in the KV namespace `id` in `wrangler.toml` (or via Dashboard). **Never commit `ADMIN_BOOTSTRAP_TOKEN` to the config file** — it must be set as a Secret.

```toml
[env.production.kv_namespaces]
binding = "MAVEN_KV"
id = "here_is_your_id"

[env.production.r2_buckets]
binding = "MAVEN_BUCKET"
bucket_name = "here_is_your_bucket_name"
```

### 4. Set Admin Secret

After import, go to Worker → **Settings** → **Variables and Secrets**:

```
Name: ADMIN_BOOTSTRAP_TOKEN
Value: your strong password
```

Save and redeploy the Worker, then visit `/api/status/health` to trigger initialization.

### 5. Login to Admin UI

Visit the Worker root URL and log in with:

```
Username: admin
Password: the value of ADMIN_BOOTSTRAP_TOKEN
```

### 6. Customization

Some frontend settings are statically compiled in `maven-client/src/site.config.ts`:

```ts
export const siteConfig: SiteConfig = {
  title: "Site Title",
  faviconUrl: "Favicon URL",
  introImageUrl: "Intro Card Image URL",
  introTitle: "Intro Card Title",
  introLines: [
    "Array of strings, multiple lines supported"
  ],
  showGithubButton: false, // Show GitHub button
};
```

Settings that require computation (such as baseUrl, anonymous read policy) can be configured in the **Settings** page after logging in as admin.

> After first login, create a new admin token in the Admin page, then disable or rotate the bootstrap admin.

## Maven Repository URL

```xml
<repositories>
  <repository>
    <id>cloud-maven</id>
    <url>https://your-worker-domain/</url>
  </repository>
</repositories>
```

Recommended with a custom domain:

```xml
<repositories>
  <repository>
    <id>cloud-maven</id>
    <url>https://repo.example.com/</url>
  </repository>
</repositories>
```

## Local Development

```bash
cd maven-worker
wrangler dev --config wrangler-dev.toml
```

## Health Check

```
GET /api/status/health
```

Response: `{"status":"ok"}`

## Key KV Keys

| Key | Description |
|-----|-------------|
| `config:repository` | Repository visibility and overwrite policy |
| `config:settings` | Frontend Settings page configuration |
| `token:{id}` | Token main record |
| `token-name:{name}` | Token name → id index |
| `session:{id}` | Login session (24h TTL) |
| `stats:daily:{yyyyMMdd}:*` | Daily request/error counters |

## Implementation Notes

- Maven paths map directly to R2 Keys; no default `releases`/`snapshots` sub-repositories are created
- PUBLIC repositories allow anonymous read; write and delete require a Token
- Overwrite is disabled by default (`allowOverwrite: false`), administrators can enable it
- `X-Generate-Checksums: true` reads the full request body — suitable for small files; clients should upload checksums for large files
- `maintainMetadata` is persisted, but the server does not actively rewrite `maven-metadata.xml` by default

## FAQ

**Only Worker shows up after import, no frontend**

Make sure the import directory is `maven-worker` and that `wrangler.toml` contains an `[assets]` section.

**KV id invalid**

Confirm that `[env.production.kv_namespaces]` in `wrangler.toml` has the real KV namespace id filled in.

**Admin login fails**

Confirm the `ADMIN_BOOTSTRAP_TOKEN` Secret is set and the Worker has been redeployed.

**No files in R2**

Confirm upload requests go to the Worker domain. Artifacts are written to R2 by the Worker, not directly.

## Official References

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers Builds Configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/wrangler/commands/kv/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- Reference project [maillab/cloud-mail](https://github.com/maillab/cloud-mail)

## Contributing

We welcome all kinds of contributions!

- **Issue**: Bug reports, feature requests, discussions
- **Pull Request**: Fix bugs, implement features, improve documentation
- **Star**: The best way to support the project

### PR Guidelines

- Commit messages should be clear and descriptive (Chinese or English)
- New features should include test cases
- Keep code style consistent (ESLint + Prettier are configured)
- If you're unsure whether something is suitable as a PR, feel free to open an Issue first for discussion

## License

[MIT](LICENSE)