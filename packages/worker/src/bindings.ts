export interface Env {
  DB: D1Database;
  THUMBNAILS: R2Bucket;
  MATRIX_STATE: DurableObjectNamespace;
  API_KEY: string;
  ENVIRONMENT: string;
}
