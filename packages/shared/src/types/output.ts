import type { Source } from './source.js';

export type OutputId = 'A' | 'B';

export type OutputStatusValue = 'active' | 'idle' | 'error';

export type OutputStatus = {
  id: OutputId;
  label: string;
  currentSource: Source | null;
  status: OutputStatusValue;
};

export type SwitchRequest = {
  sourceId: string;
};

export type SwitchResult = {
  success: boolean;
  outputId: OutputId;
  previousSourceId: string | null;
  newSourceId: string;
  switchedAt: string;
};
