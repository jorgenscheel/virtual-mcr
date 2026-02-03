export type InputProtocol = 'srt' | 'rtmp' | 'bifrost' | 'ndi' | 'hls' | 'rtp';

export interface SrtConnection {
  mode: 'caller' | 'listener' | 'rendezvous';
  host: string;
  port: number;
  streamId?: string;
  passphrase?: string;
  latency?: number;
}

export interface RtmpConnection {
  url: string;
  streamKey?: string;
}

export interface NdiConnection {
  sourceName: string;
}

export interface GenericConnection {
  url: string;
  port?: number;
  additionalParams?: Record<string, string>;
}

export type ConnectionConfig = SrtConnection | RtmpConnection | NdiConnection | GenericConnection;

export interface Source {
  id: string;
  name: string;
  description?: string;
  protocol: InputProtocol;
  connection: ConnectionConfig;
  hasThumbnail: boolean;
  thumbnailUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSourceRequest {
  name: string;
  description?: string;
  protocol: InputProtocol;
  connection: ConnectionConfig;
}

export interface UpdateSourceRequest {
  name?: string;
  description?: string;
  protocol?: InputProtocol;
  connection?: ConnectionConfig;
}
