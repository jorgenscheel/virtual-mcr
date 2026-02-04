import type {
  OutputId,
  OutputStatus,
  Source,
  SwitchResult,
  WsMessage,
  StateSyncMessage,
  OutputChangedMessage,
} from '@vmcr/shared';
import { OUTPUT_LABELS, WS_HEARTBEAT_INTERVAL_MS } from '@vmcr/shared';

type StoredOutputState = {
  currentSourceId: string | null;
  currentSource: Source | null;
  status: 'active' | 'idle' | 'error';
};

export class MatrixState implements DurableObject {
  private sessions: Set<WebSocket> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private state: DurableObjectState,
    private _env: unknown,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    if (url.pathname === '/outputs' && request.method === 'GET') {
      return this.handleGetOutputs();
    }

    if (url.pathname.match(/^\/outputs\/(A|B)$/) && request.method === 'GET') {
      const outputId = url.pathname.split('/')[2] as OutputId;
      return this.handleGetOutput(outputId);
    }

    if (url.pathname.match(/^\/outputs\/(A|B)\/switch$/) && request.method === 'POST') {
      const outputId = url.pathname.split('/')[2] as OutputId;
      const body = (await request.json()) as { sourceId: string; source: Source };
      return this.handleSwitch(outputId, body.sourceId, body.source);
    }

    return new Response('Not found', { status: 404 });
  }

  private async getOutputState(outputId: OutputId): Promise<StoredOutputState> {
    const stored = await this.state.storage.get<StoredOutputState>(`output:${outputId}`);
    return stored ?? { currentSourceId: null, currentSource: null, status: 'idle' };
  }

  private async setOutputState(outputId: OutputId, state: StoredOutputState): Promise<void> {
    await this.state.storage.put(`output:${outputId}`, state);
  }

  private async buildOutputStatus(outputId: OutputId): Promise<OutputStatus> {
    const state = await this.getOutputState(outputId);
    return {
      id: outputId,
      label: OUTPUT_LABELS[outputId],
      currentSource: state.currentSource,
      status: state.status,
    };
  }

  private async handleGetOutputs(): Promise<Response> {
    const outputs: OutputStatus[] = [
      await this.buildOutputStatus('A'),
      await this.buildOutputStatus('B'),
    ];
    return Response.json({ success: true, data: { outputs } });
  }

  private async handleGetOutput(outputId: OutputId): Promise<Response> {
    const output = await this.buildOutputStatus(outputId);
    return Response.json({ success: true, data: output });
  }

  private async handleSwitch(
    outputId: OutputId,
    sourceId: string,
    source: Source,
  ): Promise<Response> {
    const previousState = await this.getOutputState(outputId);
    const previousSourceId = previousState.currentSourceId;

    await this.setOutputState(outputId, {
      currentSourceId: sourceId,
      currentSource: source,
      status: 'active',
    });

    const switchedAt = new Date().toISOString();
    const result: SwitchResult = {
      success: true,
      outputId,
      previousSourceId,
      newSourceId: sourceId,
      switchedAt,
    };

    const message: OutputChangedMessage = {
      type: 'output_changed',
      outputId,
      previousSourceId,
      newSourceId: sourceId,
      source,
      timestamp: switchedAt,
    };
    this.broadcast(message);

    return Response.json({ success: true, data: result });
  }

  private handleWebSocket(request: Request): Response {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.state.acceptWebSocket(server);
    this.sessions.add(server);

    this.startHeartbeatIfNeeded();

    // Send current state on connect
    this.sendStateSync(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {
    // Clients don't send meaningful messages yet, but the handler is required
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    this.sessions.delete(ws);
    if (this.sessions.size === 0) {
      this.stopHeartbeat();
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    this.sessions.delete(ws);
    if (this.sessions.size === 0) {
      this.stopHeartbeat();
    }
  }

  private async sendStateSync(ws: WebSocket): Promise<void> {
    const outputs: OutputStatus[] = [
      await this.buildOutputStatus('A'),
      await this.buildOutputStatus('B'),
    ];
    const message: StateSyncMessage = {
      type: 'state_sync',
      outputs,
      timestamp: new Date().toISOString(),
    };
    try {
      ws.send(JSON.stringify(message));
    } catch {
      this.sessions.delete(ws);
    }
  }

  private broadcast(message: WsMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.sessions) {
      try {
        ws.send(data);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }

  private startHeartbeatIfNeeded(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      });
    }, WS_HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
