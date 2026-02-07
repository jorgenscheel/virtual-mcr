import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import TOML from '@iarna/toml';

type ChannelConfig = {
  id: string;
  label: string;
  color: string;
};

type AppConfig = {
  server: {
    host: string;
    port: number;
  };
  ndi: {
    group: string;
    name_prefix: string;
  };
  persistence: {
    file: string;
  };
  channels: ChannelConfig[];
};

export function loadConfig(configPath?: string): AppConfig {
  const path = configPath ?? resolve(process.cwd(), 'config', 'channels.toml');
  const content = readFileSync(path, 'utf-8');
  const raw = TOML.parse(content) as unknown as AppConfig;

  if (!raw.channels || raw.channels.length === 0) {
    throw new Error('No channels defined in config');
  }

  return {
    server: {
      host: raw.server?.host ?? '0.0.0.0',
      port: raw.server?.port ?? 9400,
    },
    ndi: {
      group: raw.ndi?.group ?? 'vmcr',
      name_prefix: raw.ndi?.name_prefix ?? 'VMCR',
    },
    persistence: {
      file: raw.persistence?.file ?? './state.json',
    },
    channels: raw.channels,
  };
}

export type { AppConfig, ChannelConfig };
