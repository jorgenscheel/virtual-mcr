import type { OutputId, OutputStatus, SwitchResult } from './output.js';
import type { Source } from './source.js';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SourceListResponse {
  sources: Source[];
}

export type WsMessageType =
  | 'output_changed'
  | 'source_updated'
  | 'source_deleted'
  | 'heartbeat'
  | 'state_sync';

export interface WsMessageBase {
  type: WsMessageType;
  timestamp: string;
}

export interface OutputChangedMessage extends WsMessageBase {
  type: 'output_changed';
  outputId: OutputId;
  previousSourceId: string | null;
  newSourceId: string;
  source: Source | null;
}

export interface SourceUpdatedMessage extends WsMessageBase {
  type: 'source_updated';
  source: Source;
}

export interface SourceDeletedMessage extends WsMessageBase {
  type: 'source_deleted';
  sourceId: string;
}

export interface HeartbeatMessage extends WsMessageBase {
  type: 'heartbeat';
}

export interface StateSyncMessage extends WsMessageBase {
  type: 'state_sync';
  outputs: OutputStatus[];
}

export type WsMessage =
  | OutputChangedMessage
  | SourceUpdatedMessage
  | SourceDeletedMessage
  | HeartbeatMessage
  | StateSyncMessage;
