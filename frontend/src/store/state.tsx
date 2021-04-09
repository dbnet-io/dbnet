import { ObjectAny, ObjectString } from "../utilities/interfaces";
import { createState, useState, State } from '@hookstate/core';
import { createRef } from "react";
import { Toast } from "primereact/toast";
import { createBrowserHistory } from "history";
import * as React from "react";
import { new_ts_id } from "../utilities/methods";
import { Message } from "./websocket";
import { Range } from "ace-builds";


export const masterToast = createRef<Toast>()

export const history = createBrowserHistory()

export class Editor {
  text: string
  selection: number[] // startRow, startCol, endRow, endCol
  constructor(data: ObjectAny = {}) {
    this.text = data.text || 'select * from housing.landwatch2'
    this.selection = data.selection || [0,0,0,0]
  }

  lines = () => {
    return this.text.split('\n')
  }

  getBlock = () => {
    let block = ''
    let lines = this.lines()
    let lineI = this.selection[0]
    let line = lines[lineI]
    let pos = this.selection[1]

    let i = pos
    let l = lineI
    while (true) {
      if(i >= line.length) {
        if(l >= lines.length-1) {
          break
        }
        l++
        i = 0
        block += '\n'
      }

      line = lines[l]
      const char = line[i]
      if(char === ';') { break }
      if(char) { block += char }
      i++
    }

    i = pos-1
    l = lineI
    line = lines[l]
    while (true) {
      if(i < 0) {
        if(l <= 0) {
          break
        }
        l--
        line = lines[l]
        i = line.length-1
        block = '\n' + block
      }

      const char = line[i]
      if(char === ';') { break }
      if(char)  { block = char + block }
      i--
    }

    return block
  }

  getWord = () => {
    let word = ''
    let lines = this.lines()
    let line = lines[this.selection[0]]
    let pos = this.selection[1]

    for (let i = pos; i < line.length; i++) {
      const char = line[i];
      if(char === ' ' || char === '\t') { break }
      else {  word += char }
    }

    for (let i = pos-1; i >= 0; i--) {
      const char = line[i];
      if(char === ' ' || char === '\t') { break }
      else {  word = char + word }
    }

    return word
  }
}

export class Tab {
  id: string
  name: string
  editor: Editor
  query: Query
  loading: boolean
  filter: string
  limit: number
  
  showSql: boolean
  pinned: boolean
  refreshInterval: number

  constructor(data: ObjectAny = {}) {
    this.id = data.id || new_ts_id('tab')
    this.name = data.name || ''
    this.editor = new Editor(data.editor || {})
    this.query = new Query(data.query) || new Query()
    this.filter = data.filter || ''
    this.limit = data.filter || 100
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
  Fetched = 'fetched',
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
    this.headers = data.headers || []
    this.rows = data.rows || []
  }
}

export interface MetaTableRow {
  column_name: string
  column_type: string
  length?: number
  precision?: number
  scale?: number
}

export class MetaTable {
  name: string
  rows: MetaTableRow[]
  selected: any
  search: string
  loading: boolean
  constructor(data: ObjectAny = {}) {
    this.name = data.name
    this.search = data.search || ''
    this.rows = data.rows || []
    this.selected = data.selected || null
    this.loading = data.loading || false
  }
}

export class SchemaView {}
export class HistoryView {}

export class Session {
  conn: Connection
  tabs: Tab[]
  selectedMetaTab: string
  selectedTabId: string
  selectedSchema?: Schema
  selectedSchemaTables?: Table[]
  selectedMetaTable?: string
  selectedHistoryId?: Query
  objectView: MetaTable
  schemaView: SchemaView
  historyView: HistoryView

  constructor(data: ObjectAny = {}) {
    this.conn = new Connection(data.conn)
    this.tabs = data.tabs || []
    if(this.tabs.length === 0 ){ this.tabs = [new Tab({name: 'Query 1'})] }
    else {this.tabs = this.tabs.map(t => new Tab(t))}
    this.selectedSchema = data.selectedSchema
    this.selectedSchemaTables = data.selectedSchemaTables || []
    this.selectedTabId = data.selectedTab || this.tabs[0].id
    this.selectedMetaTab = data.selectedMetaTab || 'Schema'
    this.selectedMetaTable = data.selectedMetaTable
    this.selectedHistoryId = data.selectedHistoryId
    this.objectView = new MetaTable()
    this.schemaView = new SchemaView()
    this.historyView = new HistoryView()

  }

  getTabIndexByID = (id: string) => {
    return this.tabs.map(t => t.id).indexOf(id)
  }
  getTabIndexByName = (name: string) => {
    return this.tabs.map(t => t.name).indexOf(name)
  }

  getTab = (id: string) => {
    let index = this.getTabIndexByID(id)
    if(index > -1) {
      return this.tabs[index]
    }
    return this.tabs[0]
  }
  currTab = () => this.getTab(this.selectedTabId)
  currTabIndex = () => this.getTabIndexByID(this.selectedTabId)
}

export class Connection {
  name: string
  type: ConnType
  data: ObjectString;
  schemas: { [key: string]: Schema; }
  history: Query[]
  lastSession?: Session

  constructor(data: ObjectAny = {}) {
    this.name = data.name || 'PG_BIONIC_URL' || 'PRIMARY_DATABASE_URL'
    this.type = data.type
    this.data = data.data
    this.schemas = data.schemas || {}
    this.history = data.history || []
    this.lastSession = data.lastSession
  }
}

export interface Ws {
  doRequest: Message
  queue: {
    received: any[],
  }
}


class Store {
  app: {
    version: number
    tableHeight: number
    tableWidth: number
  }
  ws: Ws
  session : Session
  connections: { [key: string]: Connection; }
  constructor() {
    this.app = {
      version: 0.1,
      tableHeight: 1100,
      tableWidth: 1100,
    }
    this.ws = {
      doRequest: {} as Message,
      queue: {
        received: [],
      }
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