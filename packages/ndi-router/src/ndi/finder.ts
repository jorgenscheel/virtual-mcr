import type { NdiSource } from '@vmcr/shared';
import { loadBindings } from './bindings.js';
import type { NdiFindInstance } from './bindings.js';
import koffi from 'koffi';

let findInstance: NdiFindInstance | null = null;

export function createFinder(): void {
  if (findInstance) return;

  const ndi = loadBindings();
  // Pass NULL to use system NDI config (ndi-config.v1.json) for groups/discovery
  findInstance = ndi.NDIlib_find_create_v2(null);

  if (!findInstance) {
    throw new Error('NDIlib_find_create_v2() returned null');
  }

  console.log('[NDI Finder] Created');
}

export function destroyFinder(): void {
  if (!findInstance) return;

  const ndi = loadBindings();
  ndi.NDIlib_find_destroy(findInstance);
  findInstance = null;
  console.log('[NDI Finder] Destroyed');
}

export function discoverSources(): NdiSource[] {
  if (!findInstance) return [];

  const ndi = loadBindings();

  // Non-blocking check for new sources
  ndi.NDIlib_find_wait_for_sources(findInstance, 0);

  const numSourcesArr = new Uint32Array(1);
  const sourcesPtr = ndi.NDIlib_find_get_current_sources(findInstance, numSourcesArr);
  const numSources = numSourcesArr[0]!;

  if (numSources === 0 || !sourcesPtr) return [];

  const now = new Date().toISOString();
  const decoded = koffi.decode(sourcesPtr, 'NDIlib_source_t', numSources) as {
    p_ndi_name: string;
    p_url_address: string;
  }[];

  return decoded.map((source) => ({
    name: source.p_ndi_name,
    urlAddress: source.p_url_address,
    lastSeen: now,
  }));
}
