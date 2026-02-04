import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SourceService } from './source-service.js';

function createMockDb() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(),
    first: vi.fn(),
    run: vi.fn(),
  };

  const db = {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _stmt: mockStatement,
  } as unknown as D1Database & { _stmt: typeof mockStatement };

  return db;
}

const sampleRow = {
  id: 'abc-123',
  name: 'Camera 1',
  description: 'Main camera',
  protocol: 'srt',
  connection: JSON.stringify({ mode: 'caller', host: '10.0.0.1', port: 9000 }),
  has_thumbnail: 0,
  thumbnail_updated_at: null,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
};

describe('SourceService', () => {
  let db: ReturnType<typeof createMockDb>;
  let service: SourceService;

  beforeEach(() => {
    db = createMockDb();
    service = new SourceService(db);
  });

  describe('list', () => {
    it('returns all sources ordered by name', async () => {
      db._stmt.all.mockResolvedValue({ results: [sampleRow] });

      const sources = await service.list();

      expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM sources ORDER BY name ASC');
      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe('abc-123');
      expect(sources[0].name).toBe('Camera 1');
      expect(sources[0].protocol).toBe('srt');
      expect(sources[0].connection).toEqual({ mode: 'caller', host: '10.0.0.1', port: 9000 });
      expect(sources[0].hasThumbnail).toBe(false);
    });

    it('returns empty array when no sources', async () => {
      db._stmt.all.mockResolvedValue({ results: [] });

      const sources = await service.list();

      expect(sources).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns source when found', async () => {
      db._stmt.first.mockResolvedValue(sampleRow);

      const source = await service.getById('abc-123');

      expect(db._stmt.bind).toHaveBeenCalledWith('abc-123');
      expect(source).not.toBeNull();
      expect(source!.id).toBe('abc-123');
      expect(source!.name).toBe('Camera 1');
    });

    it('returns null when not found', async () => {
      db._stmt.first.mockResolvedValue(null);

      const source = await service.getById('nonexistent');

      expect(source).toBeNull();
    });
  });

  describe('create', () => {
    it('inserts a new source and returns it', async () => {
      db._stmt.run.mockResolvedValue({ meta: { changes: 1 } });
      db._stmt.first.mockResolvedValue(sampleRow);

      const source = await service.create('abc-123', {
        name: 'Camera 1',
        description: 'Main camera',
        protocol: 'srt',
        connection: { mode: 'caller', host: '10.0.0.1', port: 9000 },
      });

      expect(source.id).toBe('abc-123');
      expect(source.name).toBe('Camera 1');
    });

    it('throws if source cannot be retrieved after insert', async () => {
      db._stmt.run.mockResolvedValue({ meta: { changes: 1 } });
      db._stmt.first.mockResolvedValue(null);

      await expect(
        service.create('abc-123', {
          name: 'Camera 1',
          protocol: 'srt',
          connection: { mode: 'caller', host: '10.0.0.1', port: 9000 },
        }),
      ).rejects.toThrow('Failed to create source');
    });
  });

  describe('update', () => {
    it('updates an existing source', async () => {
      const updatedRow = { ...sampleRow, name: 'Camera 1 Updated' };
      // First call: getById to check existence; second call: getById after update
      db._stmt.first
        .mockResolvedValueOnce(sampleRow)
        .mockResolvedValueOnce(updatedRow);
      db._stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      const source = await service.update('abc-123', { name: 'Camera 1 Updated' });

      expect(source).not.toBeNull();
      expect(source!.name).toBe('Camera 1 Updated');
    });

    it('returns null when source does not exist', async () => {
      db._stmt.first.mockResolvedValue(null);

      const source = await service.update('nonexistent', { name: 'Updated' });

      expect(source).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns true when source is deleted', async () => {
      db._stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      const result = await service.delete('abc-123');

      expect(result).toBe(true);
    });

    it('returns false when source does not exist', async () => {
      db._stmt.run.mockResolvedValue({ meta: { changes: 0 } });

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('setThumbnailFlag', () => {
    it('sets thumbnail flag to true', async () => {
      db._stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      await service.setThumbnailFlag('abc-123', true);

      expect(db._stmt.bind).toHaveBeenCalledWith(1, expect.any(String), expect.any(String), 'abc-123');
    });

    it('sets thumbnail flag to false', async () => {
      db._stmt.run.mockResolvedValue({ meta: { changes: 1 } });

      await service.setThumbnailFlag('abc-123', false);

      expect(db._stmt.bind).toHaveBeenCalledWith(0, null, expect.any(String), 'abc-123');
    });
  });
});
