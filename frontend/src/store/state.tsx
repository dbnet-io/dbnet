import { ObjectAny, ObjectString } from "../utilities/interfaces";
import { createState, useState, State, none } from '@hookstate/core';
import { createRef } from "react";
import { Toast } from "primereact/toast";
import { createBrowserHistory } from "history";
import * as React from "react";
import { jsonClone, new_ts_id, toastError } from "../utilities/methods";
import { MsgType } from "./websocket";
import { apiGet, apiPost } from "./api";
import TreeNode from "primereact/components/treenode/TreeNode";


export const masterToast = createRef<Toast>()

export const history = createBrowserHistory()

export class Editor {
  text: string
  selection: number[] // startRow, startCol, endRow, endCol
  undoManager: any

  constructor(data: ObjectAny = {}) {
    this.text = data.text || ''
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

export const getParentTabName = (tabId: string) => {
  let parent_name = ''
  try {
    parent_name = tabId.split('.')[0].split('-')[1]
  } catch (error) { }
  return parent_name
} 

export class Tab {
  id: string
  name: string
  editor: Editor
  query: Query
  loading: boolean
  filter: string
  limit: number
  parent: string | undefined
  selectedChild: string
  
  rowView: RowView
  showSql: boolean
  showText: boolean
  pinned: boolean
  refreshInterval: number
  lastTableSelection: number[] // r1,c1,r2,c22

  constructor(data: ObjectAny = {}) {
    this.name = data.name || ''
    this.editor = new Editor(data.editor || {})
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
    this.parent = data.parent
    this.selectedChild = data.selectedChild

    let parent_name = getParentTabName(this.parent || '')
    this.id = data.id || new_ts_id(`tab-${this.name || parent_name}.`)
    if(!this.name) this.name = this.id.slice(-7)
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
  columns?: Column[]
  primaryKey?: Key
  indexes?: Key[]
}

export class Schema {
  name: string
  tables: Table[]

  constructor(data: ObjectAny = {}) {
    this.name = data.name
    this.tables = data.tables || []
  }
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
  Submitted = 'submitted',
  Cancelled = 'cancelled',
  Errored = 'errorred',
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
    this.id = data.id || new_ts_id('query.')
    this.time = data.time || new Date().getTime()
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

  schema = () => {
    let name_arr = this.name.split('.')
    if(name_arr.length === 1) return undefined
    return name_arr[0]
  }

  table = () => {
    let name_arr = this.name.split('.')
    return name_arr[name_arr.length-1]
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
  schemas: Schema[]
  history: Query[]

  constructor(data: ObjectAny = {}) {
    this.name = data.name || 'PG_BIONIC_URL'
    this.name = data.name || 'POLLY_SNOWFLAKE'
    // this.name = data.name || 'LEADIQ_REDSHIFT'
    this.type = data.type
    this.data = data.data
    this.schemas = data.schemas || []
    this.history = data.history || []
  }

  payload = () => {
    return {
      name: this.name,
      type: this.type,
    }
  }

  schemaNodes = () => {
    let newNodes : TreeNode[] = []
    for (let i = 0; i < this.schemas.length; i++) {
      const schema = this.schemas[i]

      let children : TreeNode[] = []
      if(schema.tables) {
        for(let table of schema.tables) {
          children.push({
            key: `${schema.name}.${table.name}`,
            label: table.name,
            data: {
              type: 'table',
              data: table,
            },
            children: [],
          })
        }
      }

      newNodes.push({
        key: schema.name,
        label: schema.name,
        data: {
          type: 'schema',
          data: schema,
        },
        children: children,
      })
    }
    return newNodes
  }
}

export const setSchemas = (conn: State<Connection>, schemas: Schema[]) => {
  // let exSchemas = conn.schemas.get()
  for (let i = 0; i < conn.schemas.length; i++) {
    conn.schemas[i].set(none)
  }
  conn.schemas.set([])
  conn.schemas.merge(schemas)
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


export const useHS = useState;

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

class SchemaPanelState {
  selectedSchema: Schema
  selectedSchemaTables: Table[]
  expandedNodes: ObjectAny
  selectedNodes: ObjectAny
  loading: boolean

  constructor(data: ObjectAny = {}) {
    this.selectedSchema = data.selectedSchema || {}
    this.selectedSchemaTables = data.selectedSchemaTables || []
    this.loading = data.loading || false
    this.expandedNodes = data.expandedNodes || {}
    this.selectedNodes = data.selectedNodes || {}
  }
}

class ObjectPanelState {
  table: MetaTable
  history: string[]
  historyI: number
  constructor(data: ObjectAny = {}) {
    this.table = new MetaTable(data.table)
    this.history = data.history || []
    this.historyI = -1
  }
}

class HistoryPanelState {
  selectedQuery: Query
  constructor(data: ObjectAny = {}) {
    this.selectedQuery = new Query(data.selectedQuery)
  }
}

class QueryPanelState {
  tabs: Tab[]
  selectedTabId: string

  constructor(data: ObjectAny = {}) {
    this.tabs = data.tabs || []
    if(this.tabs.length === 0 ) {
      let t1 = new Tab({name: 'Q1'})
      let c1 = new Tab({name: 'C1', parent: t1.id})
      t1.selectedChild = c1.id
      this.tabs = [t1, c1]
    } else {
      this.tabs = this.tabs.map(t => new Tab(t))
      let child_tabs = []
      for (let i = 0; i < this.tabs.length; i++) {
        const tab = this.tabs[i];
        if(tab.parent) continue
        if(!tab.selectedChild || this.getTabIndexByID(tab.selectedChild)===-1) {
          let child = new Tab({parent: tab.id})
          this.tabs[i].selectedChild = child.id
          child_tabs.push(child)
        } 
      }
      this.tabs = this.tabs.concat(child_tabs)
    }

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
    let tabs : Tab[] = []
    let parentTabs : ObjectAny = {}
    for(let tab of this.tabs) { 
      if(tab.parent) continue
      parentTabs[tab.id] = 0 
    }

    for(let tab of this.tabs) {
      let tab_ = jsonClone<Tab>(tab)
      tab_.query.rows = []
      // clean up rogue child tabs
      if(tab_.parent && !(tab_.parent in parentTabs)) continue
      tabs.push(tab_)
    }

    return {
      tabs: tabs,
      selectedTabId: this.selectedTabId,
    }
  }
}

class GlobalStore {
  app: State<AppState>
  connection: State<Connection>
  queryPanel: State<QueryPanelState>
  schemaPanel: State<SchemaPanelState>
  objectPanel: State<ObjectPanelState>
  historyPanel: State<HistoryPanelState>
  ws: State<Ws>

  constructor(data: ObjectAny = {}) {
    this.app = createState(new AppState(data.app))
    this.connection = createState(new Connection(data.connection))
    this.schemaPanel = createState(new SchemaPanelState(data.schemaPanel))
    this.objectPanel = createState(new ObjectPanelState(data.objectPanel))
    this.queryPanel = createState(new QueryPanelState(data.queryPanel))
    this.historyPanel = createState(new HistoryPanelState(data.historyPanel))
    this.ws = createState(new Ws())
  }

  saveSession = async () => {
    let payload = {
      name: 'default',
      conn: this.connection.get().name,
      data: {
        connection: jsonClone(this.connection.get().payload()),
        queryPanel: jsonClone(this.queryPanel.get().payload()),
        schemaPanel: jsonClone(this.schemaPanel.get()),
        objectPanel: jsonClone(this.objectPanel.get()),
        historyPanel: jsonClone(this.historyPanel.get()),
      },
    }
    try {
      let resp = await apiPost(MsgType.SaveSession, payload)
      if(resp.error) throw new Error(resp.error)
    } catch (error) {
      toastError('Could not save session', error)
    }
  }

  loadSession = async (connName: string) => {
    let payload = {
      name: 'default',
      conn: connName,
    }
    try {
      let data = await apiGet(MsgType.LoadSession, payload)
      if(data.error) throw new Error(data.error)
      let connection = new Connection(data.connection)
      this.connection.name.set(connection.name)
      this.connection.type.set(connection.type)
      this.connection.data.set(connection.data)
      this.connection.schemas.set(connection.schemas)
      this.connection.history.set(connection.history)
      this.schemaPanel.set(new SchemaPanelState(data.schemaPanel))
      this.objectPanel.set(new ObjectPanelState(data.objectPanel))
      this.queryPanel.set(new QueryPanelState(data.queryPanel))
      this.historyPanel.set(new HistoryPanelState(data.historyPanel))
    } catch (error) {
      toastError('Could not load session', error)
    }
  }
}
export const globalStore = new GlobalStore()

export const useStore = () => {
  const app = useState(globalStore.app)
  const connection = useState(globalStore.connection)
  const schemaPanel = useState(globalStore.schemaPanel)
  const objectPanel = useState(globalStore.objectPanel)
  const queryPanel = useState(globalStore.queryPanel)
  const historyPanel = useState(globalStore.historyPanel)
  const ws = useState(globalStore.ws)

  return ({
    get app() { return app },
    get connection() { return connection },
    get schemaPanel() { return schemaPanel },
    get objectPanel() { return objectPanel },
    get queryPanel() { return queryPanel },
    get historyPanel() { return historyPanel },
    get ws() { return ws },
  }) 
}

export const useStoreApp = () => useState(globalStore.app)
export const useStoreConnection = () => useState(globalStore.connection)
export const useStoreSchemaPanel = () => useState(globalStore.schemaPanel)
export const useStoreObjectPanel = () => useState(globalStore.objectPanel)
export const useStoreQueryPanel = () => useState(globalStore.queryPanel)
export const useStoreHistoryPanel = () => useState(globalStore.historyPanel)
export const useStoreWs = () => useState(globalStore.ws)

export const accessStore = () => {
  const wrap = function <T>(s: State<T>) { return s }
  
  const app = wrap<AppState>(globalStore.app)
  const connection = wrap<Connection>(globalStore.connection)
  const schemaPanel = wrap<SchemaPanelState>(globalStore.schemaPanel)
  const objectPanel = wrap<ObjectPanelState>(globalStore.objectPanel)
  const queryPanel = wrap<QueryPanelState>(globalStore.queryPanel)
  const historyPanel = wrap<HistoryPanelState>(globalStore.historyPanel)
  const ws = wrap<Ws>(globalStore.ws)

  return ({
    get app() { return app },
    get connection() { return connection },
    get schemaPanel() { return schemaPanel },
    get objectPanel() { return objectPanel },
    get queryPanel() { return queryPanel },
    get historyPanel() { return historyPanel },
    get ws() { return ws },
  }) 
}