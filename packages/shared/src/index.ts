export type {
  InputProtocol,
  SrtConnection,
  RtmpConnection,
  NdiConnection,
  GenericConnection,
  ConnectionConfig,
  Source,
  CreateSourceRequest,
  UpdateSourceRequest,
} from './types/source.js';

export type {
  OutputId,
  OutputStatusValue,
  OutputStatus,
  SwitchRequest,
  SwitchResult,
} from './types/output.js';

export type {
  ApiResponse,
  SourceListResponse,
  WsMessageType,
  WsMessage,
  OutputChangedMessage,
  SourceUpdatedMessage,
  SourceDeletedMessage,
  HeartbeatMessage,
  StateSyncMessage,
} from './types/api.js';

export {
  INPUT_PROTOCOLS,
  OUTPUT_IDS,
  OUTPUT_LABELS,
  OUTPUT_COLORS,
  ACTIVE_COLOR,
  WS_HEARTBEAT_INTERVAL_MS,
  WS_RECONNECT_DELAY_MS,
  WS_MAX_RECONNECT_DELAY_MS,
  API_KEY_HEADER,
} from './constants.js';
