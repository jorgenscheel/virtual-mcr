import type { Env } from '../bindings.js';

/**
 * Forwards output-related requests to the MatrixState Durable Object.
 * The DO is a singleton identified by a fixed name.
 */
export class OutputService {
  private stub: DurableObjectStub;

  constructor(env: Env) {
    const id = env.MATRIX_STATE.idFromName('global');
    this.stub = env.MATRIX_STATE.get(id);
  }

  async getOutputs(): Promise<Response> {
    return this.stub.fetch(new Request('http://do/outputs'));
  }

  async getOutput(outputId: string): Promise<Response> {
    return this.stub.fetch(new Request(`http://do/outputs/${outputId}`));
  }

  async switchOutput(
    outputId: string,
    body: { sourceId: string; source: unknown },
  ): Promise<Response> {
    return this.stub.fetch(
      new Request(`http://do/outputs/${outputId}/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  }

  async connectWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    return this.stub.fetch(new Request(`http://do/ws`, { headers: request.headers }));
  }
}
