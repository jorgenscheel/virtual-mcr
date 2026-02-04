import type { OutputId, OutputStatus } from './output.js';
import type { Source } from './source.js';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type SourceListResponse = {
  sources: Source[];
};

export type WsMessageType =
  | 'output_changed'
  | 'source_updated'
  | 'source_deleted'
  | 'heartbeat'
  | 'state_sync';

export type WsMessageBase = {
  type: WsMessageType;
  timestamp: string;
};

export type OutputChangedMessage = WsMessageBase & {
  type: 'output_changed';
  outputId: OutputId;
  previousSourceId: string | null;
  newSourceId: string;
  source: Source | null;
};

export type SourceUpdatedMessage = WsMessageBase & {
  type: 'source_updated';
  source: Source;
};

export type SourceDeletedMessage = WsMessageBase & {
  type: 'source_deleted';
  sourceId: string;
};

export type HeartbeatMessage = WsMessageBase & {
  type: 'heartbeat';
};

export type StateSyncMessage = WsMessageBase & {
  type: 'state_sync';
  outputs: OutputStatus[];
};

export type WsMessage =
  | OutputChangedMessage
  | SourceUpdatedMessage
  | SourceDeletedMessage
  | HeartbeatMessage
  | StateSyncMessage;
