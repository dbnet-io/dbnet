import { ObjectAny, ObjectString } from "../utilities/interfaces";
import { createState, useState, State } from '@hookstate/core';
import { createRef } from "react";
import { Toast } from "primereact/toast";
import { createBrowserHistory } from "history";
import * as React from "react";
import { new_ts_id } from "../utilities/methods";
import { Message } from "./websocket";


export const masterToast = createRef<Toast>()

export const history = createBrowserHistory()

export class Tab {
  id: string
  name: string
  query: Query
  loading: boolean
  filter: string
  
  showSql: boolean
  pinned: boolean
  refreshInterval: number

  constructor(data: ObjectAny = {}) {
    this.id = data.id || new_ts_id('tab')
    this.name = data.name || ''
    this.query = new Query(data.query) || new Query()
    this.filter = data.filter || ''
    this.loading = data.loading || false
    
    this.showSql = data.showSql || true
    this.pinned = data.pinned || false
    this.refreshInterval = data.refreshInterval || 0
  }
}

export interface Column {
  id: number
  name: string
  type: string
  length: number | undefined
  scale: number | undefined
}

export interface Key {
  schema: string
  name: string
  columns: string[]
}

export interface Table {
  schema: string
  name: string
  columns?: { [key: string]: Column; }
  primaryKey?: Key
  indexes?: Key[]
}

export interface Schema {
  name: string
  tables?: { [key: string]: Table; }
}


export enum ConnType {
  FileLocal = "local",
  FileHDFS = "hdfs",
  FileS3 = "s3",
  FileAzure = "azure",
  FileGoogle = "gs",
  FileSftp = "sftp",
  FileHTTP = "http",

  DbPostgres = "postgres",
  DbRedshift = "redshift",
  DbMySQL = "mysql",
  DbOracle = "oracle",
  DbBigQuery = "bigquery",
  DbSnowflake = "snowflake",
  DbSQLite = "sqlite",
  DbSQLServer = "sqlserver",
  DbAzure = "azuresql",
  DbAzureDWH = "azuredwh",
}


export enum QueryType {
  SQL = 'sql',
  Meta = 'meta'
}

export enum QueryStatus {
  Completed = 'completed',
  Running = 'running',
  Cancelled = 'cancelled'
}

export class Query {
  id: string
  conn: string
  tab: string
  time: number // epoch milli
  duration: number // in seconds
  status: QueryStatus
  type: QueryType
  text: string
  headers: string[]
  rows: any[]

  constructor(data: ObjectAny = {}) {
    this.conn = data.conn
    this.tab = data.tab
    this.id = data.id || new_ts_id('query')
    this.time = data.tme || new Date().getTime()
    this.duration = data.duration || 0
    this.type = data.type || QueryType.SQL
    this.text = data.text || ''
    this.status = data.status
    this.headers = data.headers || ["name", "name"]
    this.rows = data.rows || []
  }
}

export class Session {
  conn: Connection
  tabs: Tab[]
  selectedTab: string
  selectedSchemas?: Schema[]
  selectedSchemaTables?: Table[]
  selectedMetaTable?: string
  selectedHistoryId?: Query
  editor: {
    height: string
    text: string
  }

  constructor(data: ObjectAny = {}) {
    this.conn = data.conn
    this.tabs = data.tabs || []
    if(this.tabs.length === 0 ){ this.tabs = [new Tab({name: 'Query 1'})] }
    else {this.tabs = this.tabs.map(t => new Tab(t))}
    this.selectedSchemas = data.selectedSchemas || []
    this.selectedSchemaTables = data.selectedSchemaTables || []
    this.selectedTab = data.selectedTab || this.tabs[0].name
    this.selectedMetaTable = data.selectedMetaTable
    this.selectedHistoryId = data.selectedHistoryId
    this.editor = data.editor || {text: ''}

  }

  getTabIndex = (name: string) => {
    return this.tabs.map(t => t.name).indexOf(name)
  }
  getTab = (name: string) => {
    let index = this.getTabIndex(name)
    if(index > -1) {
      return this.tabs[index]
    }
    return this.tabs[0]
  }
  currTab = () => this.getTab(this.selectedTab)
  currTabIndex = () => this.getTabIndex(this.selectedTab)
}

export class Connection {
  name: string
  type: ConnType
  data: ObjectString;
  schemas: { [key: string]: Schema; }
  history: Query[]
  lastSession?: Session

  constructor(data: ObjectAny = {}) {
    this.name = data.name
    this.type = data.type
    this.data = data.data
    this.schemas = data.schemas || {}
    this.history = data.history || []
    this.lastSession = data.lastSession
  }
}


class Store {
  app: {
    version: number
    tableScrollHeight: string
  }
  ws: {
    doRequest: Message
  }
  session : Session
  connections: { [key: string]: Connection; }
  constructor() {
    this.app = {
      version: 0.1,
      tableScrollHeight: "400px"
    }
    this.ws = {
      doRequest: {} as Message
    }
    this.session = new Session()
    this.connections = {}
  }
}

export const useHookState = useState;

export const globalState = createState<Store>(new Store());

const wrapState = (s: State<Store>) => (s)

export const accessGlobalState = () => wrapState(globalState)
export const useGlobalState = () => wrapState(useState(globalState))
export const store = () => accessGlobalState()
export const sessionCurrTab = () => {
  let index = store().session.get().currTabIndex()
  return store().session.tabs[index]
}


export interface Variable<S> {
  get: () => S;
  set: (val: S | ((prevState: S) => S)) => void;
  put: (doPut: ((prevState: S) => void)) => void;
}

export function useVariable<S>(initialState: S | (() => S)): Variable<S> {
  const [value, setValue] = React.useState<S>(initialState)
  let putValue = (doPut: ((prevState: S) => void)) => {
    setValue(
      S => {
        doPut(S)
        return S
      }
    )
  }

  return {
    get: () => value,
    set: setValue,
    put: putValue,
  }
}