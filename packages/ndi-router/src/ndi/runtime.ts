import { loadBindings } from './bindings.js';

let initialized = false;

export function initializeNdi(): void {
  if (initialized) return;

  const ndi = loadBindings();
  const ok = ndi.NDIlib_initialize();
  if (!ok) {
    throw new Error('NDIlib_initialize() failed. Is NDI Runtime installed?');
  }
  initialized = true;
  console.log('[NDI] Runtime initialized');
}

export function destroyNdi(): void {
  if (!initialized) return;

  const ndi = loadBindings();
  ndi.NDIlib_destroy();
  initialized = false;
  console.log('[NDI] Runtime destroyed');
}

export function isNdiInitialized(): boolean {
  return initialized;
}
