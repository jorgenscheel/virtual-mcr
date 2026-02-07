import type { NdiSource, RoutingChannelStatus } from '@vmcr/shared';
import { loadBindings } from './bindings.js';
import type { NdiRoutingInstance } from './bindings.js';

type RoutingChannelState = {
  id: string;
  label: string;
  color: string;
  ndiName: string;
  group: string;
  instance: NdiRoutingInstance;
  currentSource: NdiSource | null;
  connectedReceivers: number;
  status: RoutingChannelStatus;
};

const channels = new Map<string, RoutingChannelState>();

export function createChannel(
  id: string,
  ndiName: string,
  group: string,
  label: string,
  color: string,
): void {
  if (channels.has(id)) {
    throw new Error(`Channel "${id}" already exists`);
  }

  const ndi = loadBindings();
  const instance = ndi.NDIlib_routing_create({
    p_ndi_name: ndiName,
    p_groups: group,
  });

  if (!instance) {
    throw new Error(`NDIlib_routing_create() failed for "${ndiName}"`);
  }

  channels.set(id, {
    id,
    label,
    color,
    ndiName,
    group,
    instance,
    currentSource: null,
    connectedReceivers: 0,
    status: 'idle',
  });

  console.log(`[NDI Router] Created channel "${ndiName}" (${id})`);
}

export function routeChannel(id: string, source: NdiSource): boolean {
  const channel = channels.get(id);
  if (!channel) {
    console.error(`[NDI Router] Channel "${id}" not found`);
    return false;
  }

  const ndi = loadBindings();
  const ok = ndi.NDIlib_routing_change(channel.instance, {
    p_ndi_name: source.name,
    p_url_address: source.urlAddress,
  });

  if (ok) {
    channel.currentSource = source;
    channel.status = 'routed';
    console.log(`[NDI Router] Channel "${id}" -> "${source.name}"`);
  } else {
    channel.status = 'error';
    console.error(`[NDI Router] Failed to route "${id}" -> "${source.name}"`);
  }

  return ok;
}

export function clearChannel(id: string): boolean {
  const channel = channels.get(id);
  if (!channel) {
    console.error(`[NDI Router] Channel "${id}" not found`);
    return false;
  }

  const ndi = loadBindings();
  const ok = ndi.NDIlib_routing_clear(channel.instance);

  if (ok) {
    channel.currentSource = null;
    channel.status = 'idle';
    console.log(`[NDI Router] Channel "${id}" cleared`);
  } else {
    console.error(`[NDI Router] Failed to clear "${id}"`);
  }

  return ok;
}

export function getChannel(id: string): RoutingChannelState | undefined {
  return channels.get(id);
}

export function getAllChannels(): RoutingChannelState[] {
  return Array.from(channels.values());
}

export function updateReceiverCount(id: string): number {
  const channel = channels.get(id);
  if (!channel) return 0;

  const ndi = loadBindings();
  const count = ndi.NDIlib_routing_get_no_connections(channel.instance);
  channel.connectedReceivers = count;
  return count;
}

export function destroyAllChannels(): void {
  const ndi = loadBindings();
  for (const channel of channels.values()) {
    ndi.NDIlib_routing_destroy(channel.instance);
    console.log(`[NDI Router] Destroyed channel "${channel.ndiName}" (${channel.id})`);
  }
  channels.clear();
}
