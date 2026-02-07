export type RoutingChannelStatus = 'routed' | 'idle' | 'error';

export type NdiSource = {
  name: string;
  urlAddress: string;
  lastSeen: string;
};

export type RoutingChannel = {
  id: string;
  label: string;
  color: string;
  ndiName: string;
  group: string;
  currentSource: NdiSource | null;
  connectedReceivers: number;
  status: RoutingChannelStatus;
};

export type RouteRequest = {
  sourceName: string;
};

export type RouteResult = {
  success: boolean;
  channelId: string;
  previousSource: string | null;
  newSource: string;
  routedAt: string;
};

export type NdiChannelsSyncMessage = {
  type: 'channels_sync';
  timestamp: string;
  channels: RoutingChannel[];
};

export type NdiChannelRoutedMessage = {
  type: 'channel_routed';
  timestamp: string;
  channelId: string;
  previousSource: string | null;
  newSource: string;
  channel: RoutingChannel;
};

export type NdiChannelClearedMessage = {
  type: 'channel_cleared';
  timestamp: string;
  channelId: string;
  previousSource: string | null;
  channel: RoutingChannel;
};

export type NdiSourcesUpdatedMessage = {
  type: 'sources_updated';
  timestamp: string;
  sources: NdiSource[];
};

export type NdiHeartbeatMessage = {
  type: 'heartbeat';
  timestamp: string;
};

export type NdiReceiverCountUpdatedMessage = {
  type: 'receiver_count_updated';
  timestamp: string;
  channelId: string;
  connectedReceivers: number;
};

export type NdiWsMessage =
  | NdiChannelsSyncMessage
  | NdiChannelRoutedMessage
  | NdiChannelClearedMessage
  | NdiSourcesUpdatedMessage
  | NdiHeartbeatMessage
  | NdiReceiverCountUpdatedMessage;
