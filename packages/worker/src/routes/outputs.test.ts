import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../bindings.js';

const mockGetOutputs = vi.fn();
const mockGetOutput = vi.fn();
const mockSwitchOutput = vi.fn();

vi.mock('../services/output-service.js', () => {
  return {
    OutputService: class {
      getOutputs = mockGetOutputs;
      getOutput = mockGetOutput;
      switchOutput = mockSwitchOutput;
    },
  };
});

const mockGetById = vi.fn();

vi.mock('../services/source-service.js', () => {
  return {
    SourceService: class {
      getById = mockGetById;
    },
  };
});

import { outputs } from './outputs.js';

const mockEnv: Env = {
  DB: {} as D1Database,
  THUMBNAILS: {} as R2Bucket,
  MATRIX_STATE: {} as DurableObjectNamespace,
  API_KEY: 'test-key',
  ENVIRONMENT: 'test',
};

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route('/api/outputs', outputs);
  return app;
}

function fetch(app: Hono<{ Bindings: Env }>, request: Request) {
  return app.fetch(request, mockEnv);
}

const sampleSource = {
  id: 'src-1',
  name: 'Camera 1',
  protocol: 'srt' as const,
  connection: { mode: 'caller' as const, host: '10.0.0.1', port: 9000 },
  hasThumbnail: false,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('outputs routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/outputs', () => {
    it('returns all outputs', async () => {
      const doResponse = { success: true, data: { outputs: [] } };
      mockGetOutputs.mockResolvedValue(Response.json(doResponse));
      const app = createApp();
      const res = await fetch(app, new Request('http://localhost/api/outputs'));

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: { outputs: unknown[] } };
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/outputs/:id', () => {
    it('returns output A', async () => {
      const doResponse = { success: true, data: { id: 'A', label: 'Output A' } };
      mockGetOutput.mockResolvedValue(Response.json(doResponse));
      const app = createApp();
      const res = await fetch(app, new Request('http://localhost/api/outputs/A'));

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('returns 400 for invalid output ID', async () => {
      const app = createApp();
      const res = await fetch(app, new Request('http://localhost/api/outputs/C'));

      expect(res.status).toBe(400);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid output ID');
    });
  });

  describe('POST /api/outputs/:id/switch', () => {
    it('switches output source', async () => {
      mockGetById.mockResolvedValue(sampleSource);
      const doResponse = { success: true, data: { outputId: 'A', newSourceId: 'src-1' } };
      mockSwitchOutput.mockResolvedValue(Response.json(doResponse));

      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/outputs/A/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 'src-1' }),
        }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('returns 400 for invalid output ID', async () => {
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/outputs/C/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 'src-1' }),
        }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.error).toContain('Invalid output ID');
    });

    it('returns 400 when sourceId is missing', async () => {
      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/outputs/A/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.error).toContain('Missing required field');
    });

    it('returns 404 when source not found', async () => {
      mockGetById.mockResolvedValue(null);

      const app = createApp();
      const res = await fetch(
        app,
        new Request('http://localhost/api/outputs/A/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 'nonexistent' }),
        }),
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.error).toBe('Source not found');
    });
  });
});
