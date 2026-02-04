# CLAUDE.md -- Virtual MCR

## Project Overview

Virtual Master Control Room (VMCR) -- IP video source switching for remote production journalists. Monorepo with three packages managed via npm workspaces.

## Repository Structure

```
packages/
  shared/       @vmcr/shared    -- Shared types & constants (TypeScript library)
  worker/       @vmcr/worker    -- Cloudflare Workers API (Hono, D1, R2, Durable Objects)
  streamdeck-plugin/  @vmcr/streamdeck-plugin -- Stream Deck SDK 7.x plugin (Rollup)
Architecture/   ArchiMate viewpoint documents
Processes/      BPMN process models
```

## Build & Development

```bash
npm install              # Install all workspace dependencies
npm run build            # Build all packages (shared -> worker -> plugin)
npm run lint             # ESLint across all packages
npm run lint:fix         # ESLint with auto-fix
npm run format           # Prettier format
npm run format:check     # Prettier check
npm run test             # Run all tests (Vitest)
npm run test:coverage    # Run tests with coverage
```

### Package-specific commands

```bash
# Worker
npm run dev -w packages/worker       # wrangler dev
npm run deploy -w packages/worker    # wrangler deploy

# Stream Deck plugin
npm run build -w packages/streamdeck-plugin
npm run watch -w packages/streamdeck-plugin
```

## Coding Standards

### TypeScript

- **Always use `type` instead of `interface`**. ESLint enforces `@typescript-eslint/consistent-type-definitions: ["error", "type"]`.
- Use intersection types (`&`) instead of `extends` for type composition.
- Use `type` imports: `import type { Foo } from './bar.js'`.
- Strict mode enabled in all packages.
- Target: ES2022, Module: ES2022.

### Naming Conventions

- **Cloudflare resources**: `rep-vmcr-{env}-{resource}` (e.g., `rep-vmcr-dev-api`)
- **GitHub labels**: hyphen format (e.g., `priority-1`, `type-bug`)
- **Files**: kebab-case for all source files

### Code Style

- Prettier: single quotes, semicolons, trailing commas, 100 char width, 2-space indent
- No explicit return types required (ESLint rule off)
- Prefix unused parameters with `_`

## Architecture

- **API**: Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Object Storage**: Cloudflare R2 (thumbnails)
- **State Management**: Durable Objects (MatrixState singleton)
- **Real-time**: WebSocket via Durable Objects
- **Auth**: API key via `X-API-Key` header (or `apiKey` query param for WebSocket)

## Testing

- **Framework**: Vitest
- **Coverage target**: 80% minimum
- **Coverage tool**: @vitest/coverage-v8
- Run `npm run test` from root to execute all package tests.
