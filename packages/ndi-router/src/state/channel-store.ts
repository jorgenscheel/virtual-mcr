import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type PersistedState = {
  version: number;
  savedAt: string;
  assignments: Record<string, string | null>;
};

export class ChannelStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  load(): Record<string, string | null> {
    if (!existsSync(this.filePath)) {
      return {};
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const state = JSON.parse(content) as PersistedState;
      console.log(
        `[ChannelStore] Loaded assignments from ${this.filePath} (saved ${state.savedAt})`,
      );
      return state.assignments;
    } catch (err) {
      console.error(`[ChannelStore] Failed to load ${this.filePath}:`, err);
      return {};
    }
  }

  save(assignments: Record<string, string | null>): void {
    const state: PersistedState = {
      version: 1,
      savedAt: new Date().toISOString(),
      assignments,
    };

    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[ChannelStore] Failed to save ${this.filePath}:`, err);
    }
  }
}
