# BPMN: API Request Flow

## Process: API Request Lifecycle

```
[Start] --> (Receive HTTP Request)
              |
              v
        <CORS Middleware>
              |
              v
        {Is /api/health?} --yes--> (Return health status) --> [End]
              |
              no
              v
        {Is /ws?} --yes--> (Check apiKey query param or header)
              |                      |
              no               {Valid key?}
              |               /           \
              v             yes            no
        <API Key Auth      |               |
         Middleware>       v               v
              |      (Proxy to DO   (Return 401
              |       WebSocket)     Unauthorized)
              |            |               |
              v            v               v
        {Valid          [End]           [End]
         X-API-Key?}
        /          \
      yes           no
       |             |
       v             v
  <Route Handler>  (Return 401
       |            Unauthorized)
       |                |
       v                v
  {Match route?}     [End]
  /          \
yes           no
 |             |
 v             v
(Execute     (Return 404
 handler)     Not Found)
 |               |
 v               v
{Success?}    [End]
/       \
yes      no
|         |
v         v
(Return  (Return
 JSON     Error
 Response) JSON)
|         |
v         v
[End]   [End]
```

## Participants

| Lane | Component | Responsibility |
|------|-----------|---------------|
| Client | Stream Deck Plugin / External | Sends HTTP/WS requests |
| Hono Router | `packages/worker/src/index.ts` | Routes requests to handlers |
| Auth Middleware | `packages/worker/src/middleware/auth.ts` | Validates X-API-Key header |
| Route Handlers | `packages/worker/src/routes/*.ts` | Business logic per endpoint |
| Services | `packages/worker/src/services/*.ts` | Data access and DO proxying |
| Durable Objects | `packages/worker/src/durable-objects/matrix-state.ts` | State management and WebSocket |

## Request Logging

All API requests are logged via Hono request logging middleware (`packages/worker/src/middleware/request-logger.ts`), capturing:
- Method, path, status code
- Response time (ms)
- Request ID (if provided)

## Error Handling

| Error Type | HTTP Status | Response |
|-----------|-------------|----------|
| Missing auth | 401 | `{ success: false, error: "Unauthorized" }` |
| Not found | 404 | `{ success: false, error: "Not found" }` |
| Validation | 400 | `{ success: false, error: "<details>" }` |
| Server error | 500 | `{ success: false, error: "Internal server error" }` |
