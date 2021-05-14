import type { ObjectAny, ObjectString } from "./utilities/interfaces";
import { jsonClone, new_ts_id, toastError, toastSuccess } from "./utilities/methods";
import { writable, Writable, get } from 'svelte/store';
import { Api, Message, MsgType } from "./api";

export class EditorState {
  text: string
  selection: number[] // startRow, startCol, endRow, endCol
  undoManager: any

  constructor(data: ObjectAny = {}) {
    this.text = data.text || 'select * from housing.landwatch2'
    this.selection = data.selection || [0,0,0,0]
    this.undoManager = data.undoManager || {}
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

export interface RowView {
  show: boolean
  filter: string
  rows: {n:number, name: string, value: any}[]
}

export class TabState {
  id: string
  name: string
  editor: EditorState
  query: Query
  loading: boolean
  filter: string
  limit: number
  
  rowView: RowView
  showSql: boolean
  showText: boolean
  pinned: boolean
  refreshInterval: number
  lastTableSelection: number[] // r1,c1,r2,c22

  constructor(data: ObjectAny = {}) {
    this.id = data.id || new_ts_id('tab')
    this.name = data.name || ''
    this.editor = new EditorState(data.editor || {})
    this.query = new Query(data.query) || new Query()
    this.filter = data.filter || ''
    this.limit = data.filter || 100
    this.loading = data.loading || false
    
    this.rowView = data.rowView || {show: false, rows:[], filter: ''}
    this.showSql = data.showSql || true
    this.showText = data.showText || false
    this.pinned = data.pinned || false
    this.refreshInterval = data.refreshInterval || 0
    this.lastTableSelection = data.lastTableSelection || [0,0,0,0]
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
  tables: { [key: string]: Table; }
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
  err: string
  headers: string[]
  rows: any[]
  pulled: boolean // whether the rows are pulled (when reloading a session)

  constructor(data: ObjectAny = {}) {
    this.conn = data.conn
    this.tab = data.tab
    this.id = data.id || new_ts_id('query')
    this.time = data.tme || new Date().getTime()
    this.duration = data.duration || 0
    this.type = data.type || QueryType.SQL
    this.text = data.text || ''
    this.err = data.err || ''
    this.status = data.status || ''
    this.headers = data.headers || []
    this.rows = data.rows || []
    this.pulled = false
  }

  getRowData = (n: number) => {
    if (this.rows.length === 0) { return []}
    let row = this.rows[n]
    let data : {n: number, name: string, value: any}[] = []
    for (let i = 0; i < this.headers.length; i++) {
      data.push({n: i+1, name: this.headers[i], value: row[i]})
    }
    return data
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
  show: boolean
  
  constructor(data: ObjectAny = {}) {
    this.name = data.name
    this.search = data.search || ''
    this.rows = data.rows || []
    this.selected = data.selected || null
    this.loading = data.loading || false
    this.show = data.show || false
  }
}

// export class Session {
//   conn: Connection
//   tabs: Tab[]
//   selectedMetaTab: string
//   selectedTabId: string
//   selectedSchema: Schema
//   selectedSchemaTables?: Table[]
//   selectedMetaTable?: string
//   selectedHistoryId?: Query
//   objectView: MetaTable
//   schemaView: SchemaView
//   historyView: HistoryView

//   constructor(data: ObjectAny = {}) {
//     this.conn = new Connection(data.conn)
//     this.tabs = data.tabs || []
//     if(this.tabs.length === 0 ){ this.tabs = [new Tab({name: 'Q1'})] }
//     else {this.tabs = this.tabs.map(t => new Tab(t))}
//     this.selectedSchema = data.selectedSchema
//     this.selectedSchemaTables = data.selectedSchemaTables || []
//     this.selectedTabId = data.selectedTab || this.tabs[0].id
//     this.selectedMetaTab = data.selectedMetaTab || 'Schema'
//     this.selectedMetaTable = data.selectedMetaTable
//     this.selectedHistoryId = data.selectedHistoryId
//     this.objectView = new MetaTable()
//     this.schemaView = new SchemaView()
//     this.historyView = new HistoryView()

//   }

//   getTabIndexByID = (id: string) => {
//     return this.tabs.map(t => t.id).indexOf(id)
//   }
//   getTabIndexByName = (name: string) => {
//     return this.tabs.map(t => t.name).indexOf(name)
//   }

//   getTab = (id: string) => {
//     let index = this.getTabIndexByID(id)
//     if(index > -1) {
//       return this.tabs[index]
//     }
//     return this.tabs[0]
//   }
//   currTab = () => this.getTab(this.selectedTabId)
//   currTabIndex = () => this.getTabIndexByID(this.selectedTabId)
// }

export class Connection {
  name: string
  type: ConnType
  data: ObjectString;
  schemas: { [key: string]: Schema; }
  history: Query[]

  constructor(data: ObjectAny = {}) {
    this.name = data.name || 'PG_BIONIC_URL' || 'PRIMARY_DATABASE_URL'
    this.name = data.name || 'POLLY_SNOWFLAKE'
    // this.name = data.name || 'LEADIQ_REDSHIFT'
    this.type = data.type
    this.data = data.data
    this.schemas = data.schemas || {}
    this.history = data.history || []
  }

  payload = () => {
    return {
      name: this.name,
      type: this.type,
    }
  }
}

export class Ws {
  doRequest: number
  connected: boolean
  queue: {
    received: any[],
  }
  constructor() {
    this.doRequest = 0
    this.connected = false
    this.queue = {
      received: [],
    }
  }
}

export class AppState {
  version: number
  tableHeight: number
  tableWidth: number
  connections: string[]
  selectedMetaTab: string
  constructor(data: ObjectAny = {}) {
    this.version = 0.1
    this.tableHeight = 1100
    this.tableWidth = 1100
    this.connections = data.connections || []
    this.selectedMetaTab = data.selectedMetaTab || 'Schema'
  }
}

// class Store {
//   app: AppState
//   ws: Ws
//   session : Session
//   connections: { [key: string]: Connection; }
//   constructor() {
//     this.app = {
//       version: 0.1,
//       tableHeight: 1100,
//       tableWidth: 1100,
//       connections: [],
//       selectedMetaTab: 'Schema',
//     }
//     this.ws = {
//       doRequest: 0,
//       connected: false,
//       queue: {
//         received: [],
//       }
//     }
//     this.session = new Session()
//     this.connections = {}
//   }
// }


// export const globalState = createState<Store>(new Store());

// const wrapState = (s: State<Store>) => (s)

// export const accessGlobalState = () => wrapState(globalState)
// export const useGlobalState = () => wrapState(useState(globalState))
// export const store = () => accessGlobalState()
// export const useSession = () => useState(globalState.session)


class SchemaPanelState {
  selectedSchema: Schema
  selectedSchemaTables: Table[]

  constructor(data: ObjectAny = {}) {
    this.selectedSchema = data.selectedSchema || {}
    this.selectedSchemaTables = data.selectedSchemaTables || []
  }
}

class ObjectPanelState {
  table: MetaTable
  history: string[]
  constructor(data: ObjectAny = {}) {
    this.table = new MetaTable(data.table)
    this.history = data.history || []
  }
}

class HistoryPanelState {
  selectedQuery: Query
  constructor(data: ObjectAny = {}) {
    this.selectedQuery = new Query(data.selectedQuery)
  }
}

class QueryPanelState {
  tabs: TabState[]
  selectedTabId: string
  constructor(data: ObjectAny = {}) {
    this.tabs = data.tabs || []
    if(this.tabs.length === 0 ) this.tabs = [new TabState({name: 'Q1'})]
    else this.tabs = this.tabs.map(t => new TabState(t))

    this.selectedTabId = data.selectedTabId || this.tabs[0].id
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

  payload = () => {
    let tabs : TabState[] = []
    for(let tab of this.tabs) {
      let tab_ = jsonClone<TabState>(tab)
      tab_.query.rows = []
      tabs.push(tab_)
    }
    return {
      tabs: tabs,
      selectedTabId: this.selectedTabId,
    }
  }
}

class GlobalStore {
  app: Writable<AppState>
  connection: Writable<Connection>
  queryPanel: Writable<QueryPanelState>
  schemaPanel: Writable<SchemaPanelState>
  objectPanel: Writable<ObjectPanelState>
  historyPanel: Writable<HistoryPanelState>
  ws: Writable<Ws>

  constructor(data: ObjectAny = {}) {
    this.app = writable(new AppState(data.app))
    this.connection = writable(new Connection(data.connection))
    this.schemaPanel = writable(new SchemaPanelState(data.schemaPanel))
    this.objectPanel = writable(new ObjectPanelState(data.objectPanel))
    this.queryPanel = writable(new QueryPanelState(data.queryPanel))
    this.historyPanel = writable(new HistoryPanelState(data.historyPanel))
    this.ws = writable(new Ws())
  }

  saveSession = async () => {
    let payload = {
      name: 'default',
      conn: get(this.connection).name,
      data: {
        connection: jsonClone(get(this.connection).payload()),
        queryPanel: jsonClone(get(this.queryPanel).payload()),
        schemaPanel: jsonClone(get(this.schemaPanel)),
        objectPanel: jsonClone(get(this.objectPanel)),
        historyPanel: jsonClone(get(this.historyPanel)),
      },
    }
    let resp = await Api.Send(new Message(MsgType.SaveSession, payload))
    if(resp.error) return toastError('Could not save session', resp.error)
  }

  loadSession = async (connName: string) => {
    let payload = {
      name: 'default',
      conn: connName,
    }
    let resp = await Api.Send(new Message(MsgType.LoadSession, payload))
    if(resp.error) return toastError('Could not load session', resp.error)
  
    this.connection.set(Object.assign(get(this.connection), resp.data.connection))
    this.schemaPanel.set(new SchemaPanelState(resp.data.schemaPanel))
    this.objectPanel.set(new ObjectPanelState(resp.data.objectPanel))
    this.queryPanel.set(new QueryPanelState(resp.data.queryPanel))
    this.historyPanel.set(new HistoryPanelState(resp.data.historyPanel))
  }
  
}
export const store = new GlobalStore()