import koffi from 'koffi';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function findNdiLibrary(): string {
  // Check NDI_RUNTIME_DIR_V6 or V5 env var first
  const runtimeDir =
    process.env['NDI_RUNTIME_DIR_V6'] ??
    process.env['NDI_RUNTIME_DIR_V5'] ??
    process.env['NDI_RUNTIME_DIR'];

  if (process.platform === 'linux') {
    const paths = [
      runtimeDir ? resolve(runtimeDir, 'lib', 'x86_64-linux-gnu', 'libndi.so') : null,
      runtimeDir ? resolve(runtimeDir, 'lib', 'libndi.so') : null,
      runtimeDir ? resolve(runtimeDir, 'libndi.so') : null,
      '/usr/lib/libndi.so',
      '/usr/lib/x86_64-linux-gnu/libndi.so',
      '/usr/local/lib/libndi.so',
    ].filter((p): p is string => p !== null);

    for (const p of paths) {
      if (existsSync(p)) return p;
    }
    throw new Error(
      'NDI runtime library not found. Install NDI Runtime 6.x and set NDI_RUNTIME_DIR_V6.',
    );
  }

  if (process.platform === 'win32') {
    const paths = [
      runtimeDir ? resolve(runtimeDir, 'Processing.NDI.Lib.x64.dll') : null,
      'C:\\Program Files\\NDI\\NDI 6 Runtime\\Processing.NDI.Lib.x64.dll',
    ].filter((p): p is string => p !== null);

    for (const p of paths) {
      if (existsSync(p)) return p;
    }
    throw new Error('NDI runtime library not found. Install NDI Runtime 6.x.');
  }

  if (process.platform === 'darwin') {
    const paths = [
      runtimeDir ? resolve(runtimeDir, 'libndi.dylib') : null,
      '/usr/local/lib/libndi.dylib',
      '/Library/NDI SDK for Apple/lib/macOS/libndi.dylib',
    ].filter((p): p is string => p !== null);

    for (const p of paths) {
      if (existsSync(p)) return p;
    }
    throw new Error('NDI runtime library not found. Install NDI Runtime 6.x.');
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

let ndiLib: koffi.IKoffiLib | null = null;

function getLib(): koffi.IKoffiLib {
  if (!ndiLib) {
    ndiLib = koffi.load(findNdiLibrary());
  }
  return ndiLib;
}

// --- Struct definitions ---

export const NDIlib_source_t = koffi.struct('NDIlib_source_t', {
  p_ndi_name: 'const char *',
  p_url_address: 'const char *',
});

export const NDIlib_routing_create_t = koffi.struct('NDIlib_routing_create_t', {
  p_ndi_name: 'const char *',
  p_groups: 'const char *',
});

export const NDIlib_find_create_t = koffi.struct('NDIlib_find_create_t', {
  show_local_sources: 'bool',
  p_groups: 'const char *',
  p_extra_ips: 'const char *',
});

// --- Opaque pointer types ---
export type NdiRoutingInstance = unknown;
export type NdiFindInstance = unknown;

// --- Function bindings (lazy-loaded) ---

type NdiBindings = {
  NDIlib_initialize: () => boolean;
  NDIlib_destroy: () => void;
  NDIlib_routing_create: (config: { p_ndi_name: string; p_groups: string }) => NdiRoutingInstance;
  NDIlib_routing_destroy: (instance: NdiRoutingInstance) => void;
  NDIlib_routing_change: (
    instance: NdiRoutingInstance,
    source: { p_ndi_name: string; p_url_address: string },
  ) => boolean;
  NDIlib_routing_clear: (instance: NdiRoutingInstance) => boolean;
  NDIlib_routing_get_no_connections: (instance: NdiRoutingInstance) => number;
  NDIlib_find_create_v2: (config: {
    show_local_sources: boolean;
    p_groups: string | null;
    p_extra_ips: string | null;
  } | null) => NdiFindInstance;
  NDIlib_find_destroy: (instance: NdiFindInstance) => void;
  NDIlib_find_wait_for_sources: (instance: NdiFindInstance, timeoutMs: number) => boolean;
  NDIlib_find_get_current_sources: (
    instance: NdiFindInstance,
    numSources: number[] | Uint32Array,
  ) => koffi.IKoffiCType[];
};

let bindings: NdiBindings | null = null;

export function loadBindings(): NdiBindings {
  if (bindings) return bindings;

  const lib = getLib();

  const NDIlib_initialize = lib.func('bool NDIlib_initialize(void)');
  const NDIlib_destroy = lib.func('void NDIlib_destroy(void)');

  const NDIlib_routing_create = lib.func(
    'void* NDIlib_routing_create(NDIlib_routing_create_t*)',
  );
  const NDIlib_routing_destroy = lib.func('void NDIlib_routing_destroy(void*)');
  const NDIlib_routing_change = lib.func(
    'bool NDIlib_routing_change(void*, NDIlib_source_t*)',
  );
  const NDIlib_routing_clear = lib.func('bool NDIlib_routing_clear(void*)');
  const NDIlib_routing_get_no_connections = lib.func(
    'int NDIlib_routing_get_no_connections(void*, int)',
  );

  const NDIlib_find_create_v2 = lib.func(
    'void* NDIlib_find_create_v2(NDIlib_find_create_t*)',
  );
  const NDIlib_find_destroy = lib.func('void NDIlib_find_destroy(void*)');
  const NDIlib_find_wait_for_sources = lib.func(
    'bool NDIlib_find_wait_for_sources(void*, uint32_t)',
  );
  const NDIlib_find_get_current_sources = lib.func(
    'NDIlib_source_t* NDIlib_find_get_current_sources(void*, uint32_t*)',
  );

  bindings = {
    NDIlib_initialize,
    NDIlib_destroy,
    NDIlib_routing_create,
    NDIlib_routing_destroy,
    NDIlib_routing_change,
    NDIlib_routing_clear,
    NDIlib_routing_get_no_connections: (instance) =>
      NDIlib_routing_get_no_connections(instance, 10000),
    NDIlib_find_create_v2,
    NDIlib_find_destroy,
    NDIlib_find_wait_for_sources,
    NDIlib_find_get_current_sources: (instance, numSources) =>
      NDIlib_find_get_current_sources(instance, numSources) as koffi.IKoffiCType[],
  };

  return bindings;
}

export function unloadBindings(): void {
  bindings = null;
  ndiLib = null;
}
