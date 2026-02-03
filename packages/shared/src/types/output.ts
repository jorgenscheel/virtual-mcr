import type { Source } from './source.js';

export type OutputId = 'A' | 'B';

export type OutputStatusValue = 'active' | 'idle' | 'error';

export interface OutputStatus {
  id: OutputId;
  label: string;
  currentSource: Source | null;
  status: OutputStatusValue;
}

export interface SwitchRequest {
  sourceId: string;
}

export interface SwitchResult {
  success: boolean;
  outputId: OutputId;
  previousSourceId: string | null;
  newSourceId: string;
  switchedAt: string;
}
