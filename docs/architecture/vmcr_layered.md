# Virtual MCR — Layered Viewpoint

> **ArchiMate viewpoint:** Layered
> **Scope:** Full system — business through physical
> **Last updated:** 2026-02-03

## Purpose

Shows the Virtual MCR system structure across four ArchiMate layers: Business, Application, Technology, and Physical. This viewpoint answers _"what does the system consist of and how do the layers depend on each other?"_

## System Layers

```mermaid
graph TD
    subgraph Business["Business Layer"]
        B1["Journalist: Select source for output"]
        B2["Staff: Manage source library"]
        B3["Director: Monitor output status"]
    end

    subgraph Application["Application Layer"]
        A1["Stream Deck Plugin<br/>(Select Source + Output Status)"]
        A2["Worker API<br/>(Hono REST + WebSocket)"]
        A3["MatrixState Durable Object<br/>(Real-time output state)"]
        A4["@vmcr/shared<br/>(TypeScript types + constants)"]
    end

    subgraph Technology["Technology Layer"]
        T1["Cloudflare Workers<br/>(V8 isolate runtime)"]
        T2["D1 SQLite<br/>(Source persistence)"]
        T3["R2 Object Storage<br/>(Thumbnails)"]
        T4["Durable Objects<br/>(Stateful WebSocket)"]
        T5["WebSocket Protocol<br/>(Real-time sync)"]
        T6["Intinor REST API<br/>(Router control)"]
    end

    subgraph Physical["Physical Layer"]
        P1["Elgato Stream Deck<br/>(PoE hardware controller)"]
        P2["Intinor Direkt Router<br/>(Video switching)"]
        P3["NDI Network<br/>(VLAN 4010)"]
        P4["vMix Workstations<br/>(Production output)"]
    end

    B1 --> A1
    B2 --> A2
    B3 --> A1

    A1 -->|HTTP/WS| A2
    A1 --> A4
    A2 --> A3
    A2 --> A4

    A2 --> T1
    A3 --> T4
    A2 --> T2
    A2 --> T3
    A2 --> T5
    A2 -.->|Phase 3| T6

    T1 --> P1
    T6 -.-> P2
    P2 --> P3
    P3 --> P4
```

## Layer Descriptions

### Business Layer

| Actor | Process | Phase |
|-------|---------|-------|
| Journalist | Selects a video source to assign to an output using Stream Deck buttons | 1 |
| Staff | Manages the source library — creates, updates, and deletes sources via API | 1 |
| Director | Monitors which sources are active on each output via Stream Deck display | 1 |

### Application Layer

| Component | Responsibility | Package |
|-----------|---------------|---------|
| Stream Deck Plugin | Hardware button actions, WebSocket state display, SVG rendering | `@vmcr/streamdeck-plugin` |
| Worker API | REST endpoints for sources/outputs, auth middleware, thumbnail storage | `@vmcr/worker` |
| MatrixState DO | Singleton Durable Object holding output→source assignments, broadcasting changes | `@vmcr/worker` |
| Shared Types | TypeScript interfaces and constants shared across all packages | `@vmcr/shared` |

### Technology Layer

| Service | Purpose | Binding |
|---------|---------|---------|
| Cloudflare Workers | Serverless compute (V8 isolates) | — |
| D1 SQLite | Source metadata persistence | `DB` |
| R2 Object Storage | Thumbnail image blobs | `THUMBNAILS` |
| Durable Objects | Stateful singleton for matrix state + WebSocket | `MATRIX_STATE` |
| WebSocket | Real-time output change notifications | via DO |
| Intinor REST API | Video router parameter control (Phase 3) | External |

### Physical Layer

| Equipment | Network | Role |
|-----------|---------|------|
| Elgato Stream Deck (PoE) | Control VLAN 1513 | User input hardware |
| Intinor Direkt Router | Control VLAN 1513 + NDI VLAN 4010 | Video source switching |
| NDI network | VLAN 4010 | Low-latency video transport |
| vMix workstations | NDI VLAN 4010 | Production rendering |
