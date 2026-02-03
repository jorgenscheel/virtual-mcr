import type { Source, CreateSourceRequest, UpdateSourceRequest } from '@vmcr/shared';

function rowToSource(row: Record<string, unknown>): Source {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    protocol: row.protocol as Source['protocol'],
    connection: JSON.parse(row.connection as string),
    hasThumbnail: (row.has_thumbnail as number) === 1,
    thumbnailUpdatedAt: (row.thumbnail_updated_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class SourceService {
  constructor(private db: D1Database) {}

  async list(): Promise<Source[]> {
    const result = await this.db
      .prepare('SELECT * FROM sources ORDER BY name ASC')
      .all();
    return result.results.map(rowToSource);
  }

  async getById(id: string): Promise<Source | null> {
    const row = await this.db
      .prepare('SELECT * FROM sources WHERE id = ?')
      .bind(id)
      .first();
    return row ? rowToSource(row) : null;
  }

  async create(id: string, data: CreateSourceRequest): Promise<Source> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO sources (id, name, description, protocol, connection, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        data.name,
        data.description || null,
        data.protocol,
        JSON.stringify(data.connection),
        now,
        now,
      )
      .run();

    const source = await this.getById(id);
    if (!source) throw new Error('Failed to create source');
    return source;
  }

  async update(id: string, data: UpdateSourceRequest): Promise<Source | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE sources
         SET name = ?, description = ?, protocol = ?, connection = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        data.name ?? existing.name,
        data.description !== undefined ? data.description : (existing.description ?? null),
        data.protocol ?? existing.protocol,
        data.connection ? JSON.stringify(data.connection) : JSON.stringify(existing.connection),
        now,
        id,
      )
      .run();

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM sources WHERE id = ?')
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }

  async setThumbnailFlag(id: string, hasThumbnail: boolean): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE sources SET has_thumbnail = ?, thumbnail_updated_at = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(hasThumbnail ? 1 : 0, hasThumbnail ? now : null, now, id)
      .run();
  }
}
