# BPMN: Source Switching Process

## Process: Switch Output Source

```
[Start: User presses
 Stream Deck button]
        |
        v
  (Read action settings:
   sourceId, outputId)
        |
        v
  {Settings valid?} --no--> (Show alert on button) --> [End]
        |
       yes
        |
        v
  (POST /api/outputs/{outputId}/switch
   body: { sourceId })
        |
        v
  <Auth Middleware validates
   X-API-Key header>
        |
        v
  {Authorized?} --no--> (Return 401) --> (Show alert) --> [End]
        |
       yes
        |
        v
  {Valid outputId?} --no--> (Return 400:
   (A or B)                  Invalid output ID) --> [End]
        |
       yes
        |
        v
  {sourceId provided?} --no--> (Return 400:
        |                       Missing sourceId) --> [End]
       yes
        |
        v
  (SourceService.getById(sourceId)
   from D1 database)
        |
        v
  {Source exists?} --no--> (Return 404:
        |                   Source not found) --> [End]
       yes
        |
        v
  (OutputService.switchOutput()
   --> forward to Durable Object)
        |
        v
  <MatrixState Durable Object>
        |
        v
  (Read previous output state
   from DO storage)
        |
        v
  (Write new output state:
   sourceId, source, status=active)
        |
        v
  (Build OutputChangedMessage:
   type, outputId, previousSourceId,
   newSourceId, source, timestamp)
        |
        v
  (Broadcast WsMessage to all
   connected WebSocket clients)
        |
        v
  (Return SwitchResult JSON)
        |
        v
  (API returns success to client)
        |
        v
  (Stream Deck shows OK indicator)
        |
        v
  [End]
```

## Participants

| Lane | Component | File |
|------|-----------|------|
| User | Physical button press | -- |
| Stream Deck Plugin | `SelectSourceAction.onKeyDown()` | `packages/streamdeck-plugin/src/actions/select-source.ts` |
| API Client | `ApiClient.switchOutput()` | `packages/streamdeck-plugin/src/services/api-client.ts` |
| Worker Router | `outputs.post('/:id/switch')` | `packages/worker/src/routes/outputs.ts` |
| Source Service | `SourceService.getById()` | `packages/worker/src/services/source-service.ts` |
| Output Service | `OutputService.switchOutput()` | `packages/worker/src/services/output-service.ts` |
| Durable Object | `MatrixState.handleSwitch()` | `packages/worker/src/durable-objects/matrix-state.ts` |
| WebSocket Clients | All connected subscribers | Real-time state updates |

## Data Flow

```
Stream Deck --> POST /api/outputs/A/switch { sourceId: "abc-123" }
                  |
                  v
              D1: SELECT source WHERE id = "abc-123"
                  |
                  v
              DO: Store output state
                  |
                  v
              WS: Broadcast { type: "output_changed", outputId: "A", ... }
                  |
                  v
              All connected Stream Deck plugins update button state
```

## State Transitions

| From | Event | To |
|------|-------|----|
| idle | Switch to source | active |
| active | Switch to different source | active (new source) |
| active | Error during switch | error |
| error | Successful switch | active |
