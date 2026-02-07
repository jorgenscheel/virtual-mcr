export type SourceItem = {
  id: string;
  name: string;
};

export type ChannelItem = {
  id: string;
  label: string;
  color: string;
  currentSource: SourceItem | null;
  status: string;
};

export type BackendClient = {
  listSources(): Promise<SourceItem[]>;
  listChannels(): Promise<ChannelItem[]>;
  routeChannel(channelId: string, sourceId: string): Promise<boolean>;
  clearChannel(channelId: string): Promise<boolean>;
};
