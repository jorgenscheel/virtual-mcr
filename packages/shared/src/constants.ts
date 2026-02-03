import type { InputProtocol, OutputId } from './index.js';

export const INPUT_PROTOCOLS: InputProtocol[] = ['srt', 'rtmp', 'bifrost', 'ndi', 'hls', 'rtp'];

export const OUTPUT_IDS: OutputId[] = ['A', 'B'];

export const OUTPUT_LABELS: Record<OutputId, string> = {
  A: 'Output A',
  B: 'Output B',
};

export const OUTPUT_COLORS: Record<OutputId, string> = {
  A: '#2196F3',
  B: '#FF9800',
};

export const ACTIVE_COLOR = '#4CAF50';

export const WS_HEARTBEAT_INTERVAL_MS = 30_000;
export const WS_RECONNECT_DELAY_MS = 3_000;
export const WS_MAX_RECONNECT_DELAY_MS = 30_000;

export const API_KEY_HEADER = 'X-API-Key';
