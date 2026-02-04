import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../bindings.js';

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('../services/source-service.js', () => {
  return {
    SourceService: class {
      list = mockList;
      getById = mockGetById;
      create = mockCreate;
      update = mockUpdate;
      delete = mockDelete;
    },
  };
});

import { sources } from './sources.js';

const mockEnv: Env = {
  DB: {} as D1Database,
  THUMBNAILS: {} as R2Bucket,
  MATRIX_STATE: {} as DurableObjectNamespace,
  API_KEY: 'test-key',
  ENVIRONMENT: 'test',
};

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route('/api/sources', sources);
  return app;
}

function fetch(app: Hono<{ Bindings: Env }>, request: Request) {
  return app.fetch(request, mockEnv);
}

const sampleSource = {
  id: 'abc-123',
  name: 'Camera 1',
  description: 'Main camera',
  protocol: 'srt' as const,
  connection: { mode: 'caller' as const, host: '10.0.0.1', port: 9000 },
  hasThumbnail: false,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('sources routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/sources', () => {
    it('returns a list of sources', async () => {
      mockList.mockResolvedValue([sampleSource]);
      const app = createApp();
      const res = await fetch(app, new Request('http://localhost/api/sources'));

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { sources: unknown[] } };
      expect(body.success).toBe(true);
      expect(body.data.sources).toHaveLength(1);
    });
  });

  describe('GET /api/sources/:id', () => {
    it('returns a source by id', async () => {
      mockGetById.mockResolvedValue(sampleSource);
      const app = createApp();
      const res = await fetch(app, new Request('http://localhost/api/sources/abc-123'));

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { id: string } };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('abc-123');
    });

    it('returns 404 when source not found', async () => {
      mockGetById.mockResolvedValue(null);
      const app = createApp();
      const res = await fetch(app, new Request('http://localhost/api/sources/nonexistent'));

      expect(res.status).toBe(404);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toBe('Source not found');
    });
  });

  describe('POST /api/sources', () => {
    it('creates a new source', async () => {
      mockCreate.mockResolvedValue(sampleSource);
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Camera 1',
            protocol: 'srt',
            connection: { mode: 'caller', host: '10.0.0.1', port: 9000 },
          }),
        }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { success: boolean; data: { id: string } };
      expect(body.success).toBe(true);
    });

    it('returns 400 when required fields are missing', async () => {
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Camera 1' }),
        }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('Missing required fields');
    });
  });

  describe('PUT /api/sources/:id', () => {
    it('updates an existing source', async () => {
      const updatedSource = { ...sampleSource, name: 'Camera 1 Updated' };
      mockUpdate.mockResolvedValue(updatedSource);
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/sources/abc-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Camera 1 Updated' }),
        }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { name: string } };
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Camera 1 Updated');
    });

    it('returns 404 when source not found', async () => {
      mockUpdate.mockResolvedValue(null);
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/sources/nonexistent', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        }),
      );

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/sources/:id', () => {
    it('deletes a source', async () => {
      mockDelete.mockResolvedValue(true);
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/sources/abc-123', { method: 'DELETE' }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('returns 404 when source not found', async () => {
      mockDelete.mockResolvedValue(false);
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/sources/nonexistent', { method: 'DELETE' }),
      );

      expect(res.status).toBe(404);
    });
  });
});
