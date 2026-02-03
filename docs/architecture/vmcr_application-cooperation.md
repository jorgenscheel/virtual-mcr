# Virtual MCR — Application Cooperation Viewpoint

> **ArchiMate viewpoint:** Application Cooperation
> **Scope:** Service interactions and API contracts
> **Last updated:** 2026-02-03

## Purpose

Shows how the application components interact through APIs, WebSocket, and internal service calls. Documents the key interaction flows and the full API endpoint catalog.

## Service Map

```mermaid
graph LR
    Plugin["Stream Deck Plugin<br/>@vmcr/streamdeck-plugin"]
    API["Worker API<br/>Hono on Cloudflare Workers"]
    DO["MatrixState<br/>Durable Object"]
    D1["D1 SQLite<br/>Source storage"]
    R2["R2 Bucket<br/>Thumbnails"]
    Intinor["Intinor Router<br/>(Phase 3)"]

    Plugin -->|REST / X-API-Key| API
    Plugin -->|WebSocket / apiKey query| DO
    API -->|SourceService| D1
    API -->|R2 get/put| R2
    API -->|DO stub.fetch| DO
    DO -.->|broadcast| Plugin
    API -.->|IntinorClient| Intinor
```

## Interaction Flows

### 1. Source Switch Flow

```mermaid
sequenceDiagram
    participant SD as Stream Deck
    participant API as Worker API
    participant SS as SourceService
    participant D1 as D1 Database
    participant DO as MatrixState DO

    SD->>API: POST /api/outputs/{A|B}/switch
    Note over SD,API: Header: X-API-Key
    API->>SS: getById(sourceId)
    SS->>D1: SELECT * FROM sources WHERE id = ?
    D1-->>SS: Source row
    SS-->>API: Source object
    API->>DO: POST /outputs/{A|B}/switch {sourceId, source}
    DO->>DO: Store output state
    DO-->>API: SwitchResult
    DO->>SD: WS broadcast: output_changed
    API-->>SD: 200 {success, data: SwitchResult}
```

### 2. WebSocket Connection Flow

```mermaid
sequenceDiagram
    participant SD as Stream Deck
    participant API as Worker API
    participant DO as MatrixState DO

    SD->>API: GET /ws?apiKey=xxx
    API->>API: Validate API key
    API->>DO: Forward WebSocket upgrade
    DO->>DO: acceptWebSocket(server)
    DO->>DO: Add to sessions set
    DO-->>SD: 101 Switching Protocols
    DO->>SD: state_sync {outputs: [A, B]}
    loop Every 30s
        DO->>SD: heartbeat {timestamp}
    end
    Note over SD,DO: On output change
    DO->>SD: output_changed {outputId, source}
```

### 3. Source CRUD Flow

```mermaid
sequenceDiagram
    participant Client as API Client
    participant API as Worker API
    participant SS as SourceService
    participant D1 as D1 Database
    participant DO as MatrixState DO

    Note over Client,D1: Create Source
    Client->>API: POST /api/sources {name, protocol, connection}
    API->>SS: create(data)
    SS->>D1: INSERT INTO sources
    D1-->>SS: Created row
    SS-->>API: Source
    API-->>Client: 201 {success, data: Source}

    Note over Client,D1: List Sources
    Client->>API: GET /api/sources
    API->>SS: list()
    SS->>D1: SELECT * FROM sources ORDER BY name
    D1-->>SS: Source[]
    SS-->>API: Source[]
    API-->>Client: 200 {success, data: {sources}}

    Note over Client,DO: Delete Source
    Client->>API: DELETE /api/sources/:id
    API->>SS: delete(id)
    SS->>D1: DELETE FROM sources WHERE id = ?
    D1-->>SS: OK
    API->>DO: Broadcast source_deleted
    DO->>DO: Notify WebSocket clients
    API-->>Client: 200 {success: true}
```

## API Endpoint Catalog

### Authentication

All endpoints except `/api/health` require the `X-API-Key` header. WebSocket connections accept `apiKey` as a query parameter.

### Endpoints

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|-------------|----------|
| `GET` | `/api/health` | Health check (no auth) | — | `{status, timestamp}` |
| `GET` | `/api/sources` | List all sources | — | `{sources: Source[]}` |
| `POST` | `/api/sources` | Create source | `CreateSourceRequest` | `Source` |
| `GET` | `/api/sources/:id` | Get source by ID | — | `Source` |
| `PUT` | `/api/sources/:id` | Update source | `UpdateSourceRequest` | `Source` |
| `DELETE` | `/api/sources/:id` | Delete source | — | `{success: true}` |
| `GET` | `/api/sources/:id/thumbnail` | Get thumbnail image | — | `image/png` binary |
| `PUT` | `/api/sources/:id/thumbnail` | Upload thumbnail | Binary image body | `{sourceId, contentType}` |
| `GET` | `/api/outputs` | Get all output statuses | — | `{outputs: OutputStatus[]}` |
| `GET` | `/api/outputs/:id` | Get single output status | — | `OutputStatus` |
| `POST` | `/api/outputs/:id/switch` | Switch output source | `SwitchRequest` | `SwitchResult` |
| `GET` | `/ws` | WebSocket upgrade | — | `101` + state_sync |

### WebSocket Message Types

| Type | Direction | Payload |
|------|-----------|---------|
| `state_sync` | Server → Client | `{outputs: OutputStatus[]}` |
| `output_changed` | Server → Client | `{outputId, previousSourceId, newSourceId, source}` |
| `source_updated` | Server → Client | `{source: Source}` |
| `source_deleted` | Server → Client | `{sourceId: string}` |
| `heartbeat` | Server → Client | `{timestamp}` |
