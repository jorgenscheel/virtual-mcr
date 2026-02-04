import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { apiKeyAuth } from './auth.js';
import type { Env } from '../bindings.js';

function createApp(apiKey: string | undefined) {
  const app = new Hono<{ Bindings: Env }>();
  app.use('*', apiKeyAuth);
  app.get('/test', (c) => c.json({ success: true }));

  return {
    fetch: (request: Request) =>
      app.fetch(request, {
        API_KEY: apiKey,
        DB: {} as D1Database,
        THUMBNAILS: {} as R2Bucket,
        MATRIX_STATE: {} as DurableObjectNamespace,
        ENVIRONMENT: 'test',
      } as Env),
  };
}

describe('apiKeyAuth middleware', () => {
  it('allows requests with valid API key', async () => {
    const app = createApp('test-key-123');
    const res = await app.fetch(
      new Request('http://localhost/test', {
        headers: { 'X-API-Key': 'test-key-123' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
  });

  it('rejects requests with no API key header', async () => {
    const app = createApp('test-key-123');
    const res = await app.fetch(new Request('http://localhost/test'));

    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('rejects requests with wrong API key', async () => {
    const app = createApp('test-key-123');
    const res = await app.fetch(
      new Request('http://localhost/test', {
        headers: { 'X-API-Key': 'wrong-key' },
      }),
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 500 when API_KEY secret is not configured', async () => {
    const app = createApp(undefined as unknown as string);
    const res = await app.fetch(
      new Request('http://localhost/test', {
        headers: { 'X-API-Key': 'any-key' },
      }),
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('Server misconfigured');
  });
});
