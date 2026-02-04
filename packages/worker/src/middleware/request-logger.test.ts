import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { requestLogger } from './request-logger.js';
import type { Env } from '../bindings.js';

const mockEnv: Env = {
  DB: {} as D1Database,
  THUMBNAILS: {} as R2Bucket,
  MATRIX_STATE: {} as DurableObjectNamespace,
  API_KEY: 'test-key',
  ENVIRONMENT: 'test',
};

describe('requestLogger middleware', () => {
  it('logs method, path, status, and duration', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = new Hono<{ Bindings: Env }>();
    app.use('*', requestLogger);
    app.get('/test', (c) => c.json({ ok: true }));

    await app.fetch(new Request('http://localhost/test'), mockEnv);

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logMessage = consoleSpy.mock.calls[0][0] as string;
    expect(logMessage).toMatch(/^GET \/test 200 \d+ms$/);

    consoleSpy.mockRestore();
  });

  it('logs non-200 status codes', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = new Hono<{ Bindings: Env }>();
    app.use('*', requestLogger);
    app.get('/not-found', (c) => c.json({ error: 'not found' }, 404));

    await app.fetch(new Request('http://localhost/not-found'), mockEnv);

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logMessage = consoleSpy.mock.calls[0][0] as string;
    expect(logMessage).toMatch(/^GET \/not-found 404 \d+ms$/);

    consoleSpy.mockRestore();
  });
});
