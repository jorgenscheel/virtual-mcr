# Virtual MCR

**Virtual Master Control Room** — Simplified IP video source switching for journalists and non-technical production staff.

## The Problem

Journalists receive IP video streams (SRT, RTMP, HLS, NDI...) and have no idea what to do with them. Setting up sources in production tools requires technical knowledge of protocols, ports, and configuration. A technician must always be available — or things stop.

**Core frustration:** *"I just want to see the picture and select it — not configure IP transport."*

## The Solution

A virtual video matrix with many inputs and 2 outputs:

- **Stream Deck** (PoE, network-based) as the control surface — press a button, picture switches
- **Intinor Direkt Router** as the processing engine — handles all protocols via REST API
- **Source library** with unlimited presets — journalist sees names and thumbnails, not IP addresses
- **NDI output** always visible in vMix and on dedicated monitors

```
Sources (unlimited)          Virtual MCR              Outputs (2)
─────────────────           ───────────              ───────────
┌──────────────┐                                    ┌───────────┐
│ SRT stream   │──┐                                 │ Output A  │
│ RTMP stream  │──┤   ┌──────────────────┐          │  → NDI    │
│ Bifrost feed │──┼──▶│ Intinor Router   ├─────────▶│  → vMix   │
│ NDI source   │──┤   │ (API-controlled) │          │  → Record │
│ HLS/URL      │──┘   └────────▲─────────┘          └───────────┘
└──────────────┘               │                    ┌───────────┐
                        ┌──────┴───────┐            │ Output B  │
                        │  Stream Deck  │           │  → NDI    │
                        │  + Backend    │──────────▶│  → vMix   │
                        └──────────────┘            │  → Record │
                                                    └───────────┘
```

### Key Architecture Decision

We do **not** use Intinor's built-in router to switch between pre-configured inputs (limited to 6). Instead, we **reprogram the IP input parameters** (protocol, IP, port, stream key) dynamically via API — turning 6 fixed input slots into windows to an unlimited source library.

## Architecture

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend API | Cloudflare Workers + Hono | Source CRUD, output switching, WebSocket |
| Database | Cloudflare D1 | Source presets |
| Thumbnails | Cloudflare R2 | Source preview images |
| Real-time state | Durable Objects | Output state + WebSocket broadcast |
| Control surface | Stream Deck plugin (SDK 7.x) | Physical button interface |
| Shared types | TypeScript | Type safety across packages |

## Project Structure

```
virtual-mcr/
├── packages/
│   ├── shared/                  # @vmcr/shared — TypeScript types & constants
│   ├── worker/                  # @vmcr/worker — Cloudflare Workers backend
│   └── streamdeck-plugin/       # @vmcr/streamdeck-plugin — Stream Deck plugin
├── package.json                 # npm workspaces root
├── tsconfig.base.json           # Shared TypeScript config
└── docs/
    └── project.md               # Full project documentation (Norwegian)
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (included as dev dependency)
- Elgato Stream Deck app (for plugin testing)

### Install

```bash
npm install
```

### Development

#### Shared types

```bash
cd packages/shared
npm run build          # Compile TypeScript
npm run dev            # Watch mode
```

#### Worker (backend)

```bash
cd packages/worker

# Local development with D1/R2/DO emulation
npx wrangler dev

# Apply database schema (local)
npx wrangler d1 migrations apply vmcr-sources --local

# Deploy to Cloudflare
npx wrangler deploy

# Set the API key secret
npx wrangler secret put API_KEY
```

#### Stream Deck Plugin

```bash
cd packages/streamdeck-plugin

npm run build          # Compile with Rollup
npm run watch          # Watch mode with hot-reload
```

The compiled plugin is output to `com.remoteproduction.vmcr.sdPlugin/bin/plugin.js`. Install by symlinking or copying the `.sdPlugin` directory to your Stream Deck plugins folder.

### API Endpoints

All endpoints (except health) require `X-API-Key` header.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (no auth) |
| `GET` | `/api/sources` | List all sources |
| `GET` | `/api/sources/:id` | Get single source |
| `POST` | `/api/sources` | Create source |
| `PUT` | `/api/sources/:id` | Update source |
| `DELETE` | `/api/sources/:id` | Delete source |
| `GET` | `/api/sources/:id/thumbnail` | Get thumbnail from R2 |
| `PUT` | `/api/sources/:id/thumbnail` | Upload thumbnail to R2 |
| `GET` | `/api/outputs` | Get output state (A & B) |
| `GET` | `/api/outputs/:id` | Get single output (A or B) |
| `POST` | `/api/outputs/:id/switch` | Switch output source |
| `GET` | `/ws` | WebSocket (state sync, output changes) |

### Testing

Worker endpoints can be tested with curl against `wrangler dev`:

```bash
# Health check
curl http://localhost:8787/api/health

# List sources
curl -H "X-API-Key: your-key" http://localhost:8787/api/sources

# Create a source
curl -X POST -H "X-API-Key: your-key" -H "Content-Type: application/json" \
  -d '{"name":"Camera 1","protocol":"srt","connection":{"mode":"caller","host":"10.0.0.1","port":9000}}' \
  http://localhost:8787/api/sources

# Switch output A
curl -X POST -H "X-API-Key: your-key" -H "Content-Type: application/json" \
  -d '{"sourceId":"<source-id>"}' \
  http://localhost:8787/api/outputs/A/switch
```

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **1. Stream Deck + Backend PoC** | Plugin scaffold, Workers backend, D1/R2/DO, WebSocket | ✅ Implemented |
| **2. Source Management** | Source library CRUD API, preview thumbnails, Intinor parameter mapping | ⏳ Planned |
| **3. Intinor Control** | API client for reprogramming IP/Video inputs on the fly | ⏳ Planned |

## Tech Stack

- **Hardware:** Intinor Direkt Router, Elgato Stream Deck (PoE)
- **Backend:** Cloudflare Workers, Hono, D1, R2, Durable Objects
- **Plugin:** Stream Deck SDK 7.x (Node.js)
- **Language:** TypeScript throughout
- **API:** Intinor REST API (HTTPS, Basic Auth, JSON)
- **Network:** Dedicated controller VLAN, NDI on VLAN 4010
- **Reference:** [Intinor API Tutorial](https://github.com/intinor/direkt_api_tutorial) (Python, MIT)

## Documentation

- [Project Document (Norwegian)](docs/project.md) — Full project documentation including API research, architecture decisions, and open questions

## License

TBD

---

*A [Remote Production AS](https://remoteproduction.no) project.*
