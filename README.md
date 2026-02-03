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

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **1. Stream Deck Discovery** | SDK 7.1 research, backend requirements, PoE/VLAN setup | 🔜 Next |
| **2. Source Management** | Source library CRUD API, preview thumbnails, Intinor parameter mapping | ⏳ Planned |
| **3. Intinor Control** | API client for reprogramming IP/Video inputs on the fly | ⏳ Planned |

## Tech Stack

- **Hardware:** Intinor Direkt Router, Elgato Stream Deck (PoE)
- **API:** Intinor REST API (HTTPS, Basic Auth, JSON)
- **Network:** Dedicated controller VLAN, NDI on VLAN 4010
- **Reference:** [Intinor API Tutorial](https://github.com/intinor/direkt_api_tutorial) (Python, MIT)

## Documentation

- [Project Document (Norwegian)](docs/project.md) — Full project documentation including API research, architecture decisions, and open questions

## License

TBD

---

*A [Remote Production AS](https://remoteproduction.no) project.*
