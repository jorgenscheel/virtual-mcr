# Process Models

BPMN process models for the Virtual MCR system, organized by hierarchy level.

## Structure

```
Processes/
├── Level-1/     Strategic orchestration (high-level flows)
├── Level-2/     Tactical coordination (interaction between components)
└── Level-3/     Implementation (executable processes)
```

## Contents

### Level 1 -- Strategic Orchestration

- `api-request-flow.md` -- API request lifecycle (auth, routing, response)

### Level 2 -- Tactical Coordination

- `source-switching.md` -- Source switching workflow (validation, DO state, WebSocket broadcast)

### Level 3 -- Implementation

(No executable process models yet)
