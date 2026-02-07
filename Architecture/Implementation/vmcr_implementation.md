# Virtual MCR — Implementation & Deployment Viewpoint

> **ArchiMate viewpoint:** Implementation & Deployment
> **Scope:** Build pipeline, deployment, environments, and secrets
> **Last updated:** 2026-02-03

## Purpose

Documents the build pipeline, deployment targets, environment strategy, and secrets management for the Virtual MCR system.

## Deployment Pipeline

```mermaid
graph LR
    subgraph Source["Source Control"]
        GH["GitHub<br/>jorgenscheel/virtual-mcr"]
    end

    subgraph Build["Build Pipeline"]
        B1["npm run build<br/>@vmcr/shared"]
        B2["npm run build<br/>@vmcr/worker"]
        B3["npm run build<br/>@vmcr/streamdeck-plugin"]
    end

    subgraph Deploy["Deployment Targets"]
        D1["Cloudflare Workers<br/>Wrangler deploy"]
        D2["Stream Deck<br/>Plugin distribution"]
        D3["D1 Migrations<br/>Wrangler d1 execute"]
    end

    GH --> B1
    B1 --> B2
    B1 --> B3
    B2 --> D1
    B2 --> D3
    B3 --> D2
```

## Build Order

Packages must be built in dependency order because `@vmcr/shared` exports TypeScript declarations consumed by the other packages.

```
1. @vmcr/shared       → tsc → dist/ (declarations + ESM)
2. @vmcr/worker       → wrangler → V8 bundle (consumes shared)
3. @vmcr/streamdeck-plugin → rollup → bin/plugin.js (consumes shared)
```

### Build Commands

```bash
# Full build (dependency order)
npm run build --workspace=packages/shared
npm run build --workspace=packages/worker
npm run build --workspace=packages/streamdeck-plugin

# Or from root (builds all workspaces)
npm run build
```

## Environment Strategy

| Environment | Suffix | Purpose | Deployment |
|-------------|--------|---------|------------|
| Development | `dev` | Local development with `wrangler dev` | Automatic on `npm run dev` |
| Production | `prd` | Live system serving Stream Deck clients | Manual via `wrangler deploy` |

### Resource Naming per Environment

Following the EA naming convention `rep-vmcr-{env}-{component}`:

```mermaid
graph LR
    subgraph Dev["Development"]
        DD1["rep-vmcr-dev-api<br/>Worker"]
        DD2["rep-vmcr-dev-sources<br/>D1"]
        DD3["rep-vmcr-dev-thumbnails<br/>R2"]
        DD4["rep-vmcr-dev-matrix<br/>DO"]
    end

    subgraph Prd["Production"]
        PD1["rep-vmcr-prd-api<br/>Worker"]
        PD2["rep-vmcr-prd-sources<br/>D1"]
        PD3["rep-vmcr-prd-thumbnails<br/>R2"]
        PD4["rep-vmcr-prd-matrix<br/>DO"]
    end
```

## Secrets Management

| Secret | Scope | How to Set |
|--------|-------|------------|
| `API_KEY` | Worker | `wrangler secret put API_KEY` |
| `INTINOR_API_KEY` | Worker (Phase 3) | `wrangler secret put INTINOR_API_KEY` |
| `INTINOR_HOST` | Worker (Phase 3) | `wrangler secret put INTINOR_HOST` |

Secrets are **never** committed to the repository. The `.gitignore` excludes `.dev.vars` (local development secrets) and `.env*` files.

### Local Development Secrets

Create `packages/worker/.dev.vars` (gitignored):

```ini
API_KEY=your-development-api-key
```

## D1 Database Migrations

Migrations are stored in `packages/worker/migrations/` and applied in order.

| Migration | File | Description |
|-----------|------|-------------|
| 0001 | `0001_create_sources.sql` | Creates the `sources` table with id, name, protocol, connection, thumbnails |

### Applying Migrations

```bash
# Local development
wrangler d1 execute vmcr-sources --local --file=migrations/0001_create_sources.sql

# Production (after D1 database is created)
wrangler d1 execute vmcr-sources --file=migrations/0001_create_sources.sql
```

## Stream Deck Plugin Distribution

The Stream Deck plugin is distributed as a `.streamDeckPlugin` archive:

```
com.remoteproduction.vmcr.sdPlugin/
├── bin/plugin.js          ← Rollup bundle output
├── manifest.json          ← Plugin metadata and action definitions
├── imgs/                  ← Action icons (1x and 2x)
│   ├── plugin-icon.png
│   ├── category-icon.png
│   ├── select-source.png
│   ├── select-source@2x.png
│   ├── output-status.png
│   └── output-status@2x.png
└── ui/                    ← Property Inspector HTML
    ├── select-source-pi.html
    └── output-status-pi.html
```

### Installation

1. Build the plugin: `npm run build --workspace=packages/streamdeck-plugin`
2. Package the `.sdPlugin` directory
3. Install via Stream Deck application or CLI

## Wrangler Configuration

The `wrangler.toml` defines all Cloudflare bindings:

| Binding | Type | Name |
|---------|------|------|
| `DB` | D1 Database | `vmcr-sources` |
| `THUMBNAILS` | R2 Bucket | `vmcr-thumbnails` |
| `MATRIX_STATE` | Durable Object | `MatrixState` class |
| `ENVIRONMENT` | Variable | `development` (default) |
