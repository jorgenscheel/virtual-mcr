import type { NdiSource } from '@vmcr/shared';

const sources = new Map<string, NdiSource>();

export function updateSources(discovered: NdiSource[]): NdiSource[] {
  sources.clear();
  for (const source of discovered) {
    sources.set(source.name, source);
  }
  return getAllSources();
}

export function getAllSources(): NdiSource[] {
  return Array.from(sources.values());
}

export function getSource(name: string): NdiSource | undefined {
  return sources.get(name);
}
