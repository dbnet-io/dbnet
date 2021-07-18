import { ObjectAny, ObjectString } from "../utilities/interfaces"


export interface SourceOptions {
  trim_space?: boolean,
  empty_as_null?: boolean,
  header?: boolean,
  compression?: 'auto' | 'gzip',
  null_if?: string,
  datetime_format?: string,
  skip_blank_lines?: boolean,
  delimiter?: string,
  max_decimals?: number,
}

export const DefaultSourceOptionsFile: SourceOptions = {
  trim_space: false,
  empty_as_null: true,
  header: true,
  compression: 'auto',
  datetime_format: 'auto',
  delimiter: ',',
  skip_blank_lines: true,
}

export enum JobMode {
  TruncateMode = "truncate",
  DropMode = "drop",
  AppendMode = "append",
  UpsertMode = "upsert",
  SnapshotMode = "snapshot",
}

export interface TargetOptions {
  header?: boolean,
  compression?: 'auto' | 'gzip',
  concurrency?: number,
  datetime_format?: string,
  delimiter?: string,
  file_max_rows?: number,
  max_decimals?: number,
  table_ddl?: string,
  table_tmp?: string,
  pre_sql?: string,
  post_sql?: string,
  use_bulk?: boolean,
}

export const DefaultTargetOptionsFile: TargetOptions = {
  header: true,
  compression: 'gzip',
  concurrency: 4,
  datetime_format: 'auto',
  delimiter: ',',
  file_max_rows: 0,
}

export interface JobConfig {
  source: {
    conn: string;
    stream?: string;
    limit?: number;
    data?: ObjectString;
    options: SourceOptions;
  };

  target: {
    conn: string;
    mode: JobMode;
    object?: string;
    data?: ObjectString;
    dbt?: string;
    primary_key?: string[];
    update_key?: string;
    options: TargetOptions;
  };
}

export enum JobStatus {
  Created = "created",
  Queued = "queued",
  Started = "started",
  Running = "running",
  Success = "success",
  Terminated = "terminated",
  Interrupted = "interrupted",
  TimedOut = "timed-out",
  Error = "error",
  Skipped = "skipped",
  Stalled = "stalled",
}

export interface JobResult {
  id: string
  type: JobType
  status: JobStatus
  error: string
  progress: string
  progress_hist: string[]
  start_time: number
  duration: number
  bytes: number
  config: JobConfig
}

export interface JobRequestConn {
  type: string
  name: string
  database: string
}

export interface JobRequest {
  id: string
  source: JobRequestConn
  target: JobRequestConn
  config: JobConfig
}

export enum JobType {
  APIToDb = "api-db",
  APIToFile = "api-file",
  ConnTest = "conn-test",
  DbToDb = "db-db",
  FileToDB = "file-db",
  DbToFile = "db-file",
  FileToFile = "file-file",
  DbSQL = "db-sql",
  DbDbt = "db-dbt",
}


export class Job {
  id: string
  type: JobType
  request: JobRequest
  time: number
  duration: number
  status: string
  err: string
  result: ObjectAny

  constructor(data: ObjectAny = {}) {
    this.id = data.id
    this.type = data.type
    this.request = data.request || { id: '', source: '', target: '', config: {} }
    this.time = data.time
    this.duration = data.duration
    this.status = data.status
    this.err = data.err
    this.result = data.result
  }
}