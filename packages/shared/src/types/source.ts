export type InputProtocol = 'srt' | 'rtmp' | 'bifrost' | 'ndi' | 'hls' | 'rtp';

export type SrtConnection = {
  mode: 'caller' | 'listener' | 'rendezvous';
  host: string;
  port: number;
  streamId?: string;
  passphrase?: string;
  latency?: number;
};

export type RtmpConnection = {
  url: string;
  streamKey?: string;
};

export type NdiConnection = {
  sourceName: string;
};

export type GenericConnection = {
  url: string;
  port?: number;
  additionalParams?: Record<string, string>;
};

export type ConnectionConfig = SrtConnection | RtmpConnection | NdiConnection | GenericConnection;

export type Source = {
  id: string;
  name: string;
  description?: string;
  protocol: InputProtocol;
  connection: ConnectionConfig;
  hasThumbnail: boolean;
  thumbnailUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSourceRequest = {
  name: string;
  description?: string;
  protocol: InputProtocol;
  connection: ConnectionConfig;
};

export type UpdateSourceRequest = {
  name?: string;
  description?: string;
  protocol?: InputProtocol;
  connection?: ConnectionConfig;
};
