import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../bindings.js';
import { health } from './health.js';

const mockEnv: Env = {
  DB: {} as D1Database,
  THUMBNAILS: {} as R2Bucket,
  MATRIX_STATE: {} as DurableObjectNamespace,
  API_KEY: 'test-key',
  ENVIRONMENT: 'test',
};

describe('health route', () => {
  it('returns status ok with environment', async () => {
    const app = new Hono<{ Bindings: Env }>();
    app.route('/api/health', health);

    const res = await app.fetch(new Request('http://localhost/api/health'), mockEnv);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; environment: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('test');
    expect(body.timestamp).toBeDefined();
  });
});
