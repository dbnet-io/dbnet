import Dexie from "dexie";
import _ from "lodash";
import { apiGet, apiPost, Response } from "../store/api";
import { Variable } from "../store/state";
import { MsgType } from "../store/websocket";
import { ObjectAny } from "../utilities/interfaces";
import { data_req_to_records, jsonClone, new_ts_id, Sleep, toastError } from "../utilities/methods";
import { Connection } from "./connection";
import { Editor } from "./editor";
import { EditorMap, EditorTabMap } from "./monaco/monaco";
import { Query, QueryRequest } from "./query";
import { Database, Schema, Table } from "./schema";
import { DbNetState } from "./state";
import { ResultTable } from "./table";
import { Workspace } from "./workspace";

export type DbNetOptions = {
  resultTableRef: React.MutableRefObject<any>;
  aceEditorRef: React.MutableRefObject<any>;

  // uri: string;
  // editor: editor.IStandaloneCodeEditor;
  onConnected?: () => unknown;
  onDisconnected?: () => unknown;
  onDesynchronized?: () => unknown;
  onChangeLanguage?: (language: string) => unknown;
  // onChangeUsers?: (users: Record<number, UserInfo>) => unknown;
  reconnectInterval?: number;
};

export type TriggerType = 'refreshSchemaPanel' | 'refreshJobPanel' | 'refreshTable' | 'onSelectConnection'

// export type TriggerMapRecord = Record<TriggerType, Record<string, Variable<number>>>
export type TriggerMapRecord = Record<TriggerType, Record<string, () => void>>

export class DbNet {
  private ws?: WebSocket;
  db: Dexie
  workspace: Workspace
  selectedConnection: string
  connections: Connection[]
  editor: Editor
  resultTable: ResultTable
  triggerMap: TriggerMapRecord
  state: DbNetState
  editorMap: EditorMap
  editorTabMap: EditorTabMap

  // app: AppState
  // queryPanel: QueryPanelState
  // jobPanel: JobPanelState
  // projectPanel: ProjectPanelState
  // schemaPanel: SchemaPanelState
  // objectPanel: ObjectPanelState
  // historyPanel: HistoryPanelState

  constructor(options: DbNetOptions) {
    this.db = getDexieDb()
    this.workspace = new Workspace()
    this.editor = new Editor(options.aceEditorRef)
    this.resultTable = new ResultTable(options.resultTableRef)
    this.connections = []
    this.selectedConnection = ''
    this.triggerMap = {} as TriggerMapRecord
    this.state = new DbNetState()
    this.editorMap = {}
    this.editorTabMap = {}
  }

  async init() {
    await this.state.load()
    await this.loadWorkspace() // load last workspace or use default
    await this.loadConnections() // get all connections or create TODO:
    await this.loadHistoryQueries()
    await this.loadHistoryJobs()

  }

  selectConnection(name: string) {
    if (!name || !this.connections.map(c => c.name).includes(name)) {
      return toastError(`Connection ${name} not found`)
    }
    this.selectedConnection = name
    localStorage.setItem("_connection_name", name)
    this.trigger('onSelectConnection')
  }

  trigger(type: TriggerType) {
    if (type in this.triggerMap) {
      for (let k of Object.keys(this.triggerMap[type])) {
        this.triggerMap[type][k]()
      }
    }
  }

  subscribe(type: TriggerType, varVal: Variable<number>) {
    const id = new_ts_id()
    if (!(type in this.triggerMap)) this.triggerMap[type] = {}
    this.triggerMap[type][id] = () => varVal.set(v => v + 1)
    return id
  }

  subscribeFunc(type: TriggerType, func: () => void) {
    const id = new_ts_id()
    if (!(type in this.triggerMap)) this.triggerMap[type] = {}
    this.triggerMap[type][id] = func
    return id
  }

  unsubscribe(id: string) {
    for (let t of Object.keys(this.triggerMap)) {
      delete this.triggerMap[t as TriggerType][id]
    }
  }

  // load history for queries
  // check front store and get newest from backend
  async loadHistoryQueries() {
  }

  async getQuery(id: string) {
    return new DexieQuery(
      await this.db.table('queries').where('id').equals(id).first()
    )
  }

  // load history for jobs
  // check front store and get newest from backend
  async loadHistoryJobs() { }

  async getJob(id: string) {
    return new Job(
      await this.db.table('jobs').where('id').equals(id).first()
    )
  }

  /** dispose objects, intervals, etc as needed **/
  async dispose() {
    await this.workspace.save()
  }

  async loadConnections() {
    let resp: Response = {} as Response
    let tries = 0
    while (true) {
      try {
        tries++
        resp = await apiGet(MsgType.GetConnections, {})
        break
      } catch (error: any) {
        resp.error = error
        if (tries >= 5) break
        await Sleep(1000)
      }
    }

    if (resp.error) return toastError(resp.error)
    let conns: Connection[] = _.sortBy(Object.values(resp.data.conns), (c: any) => c.name)
    this.connections = conns.map(c => new Connection(c))
    this.workspace.connections = this.connections.map(c => c.name)
     // set current conn
    if(!this.selectedConnection) this.selectConnection(`${localStorage.getItem("_connection_name")}`)
  }

  async loadWorkspace() {
    this.workspace = new Workspace()

    let name = localStorage.getItem("_workspace_name")
    if (name) {
      this.workspace = new Workspace(
        await this.db.table('workspace').where('name').equals(name).first()
      )
    }
  }

  async getDatabases(connName: string) {
    try {
      let connection = this.currentConnection

      let resp = await apiGet(MsgType.GetDatabases, { conn: connName })
      if (resp.error) throw new Error(resp.error)
      let rows = data_req_to_records(resp.data)
      if (rows.length > 0) {
        let databases = jsonClone<Record<string, Database>>(connection.databases)
        rows.forEach((r) => {
          let name = (r.name as string)
          if (!(name.toLowerCase() in databases)) {
            databases[name.toLowerCase()] = new Database({ name: name.toUpperCase() })
          }
        })
        connection.databases = databases
        this.getConnection(connName).databases = databases
        if (connection.database === '') {
          connection.database = rows[0].name.toUpperCase()
        }
        this.trigger('refreshSchemaPanel')
      } else {
        toastError('No Databases found!')
      }
    } catch (error) {
      toastError(error)
    }
  }

  async getAllSchemata(connName: string, refresh = false) {
    let conn = this.getConnection(connName)
    let promises: Promise<string | undefined>[] = []

    if (Object.keys(conn.databases).length === 0) {
      await this.getDatabases(conn.name)
    }

    for (let dbName of Object.keys(conn.databases)) {
      promises.push(this.getSchemata(conn.name, dbName, refresh))
    }
    let results : (string | undefined)[] = []
    for (let promise of promises) results.push(await promise)
    let errors = results.map(r => (r? 1: 0) as number).reduce((a, b) => a+b, 0)
    let successes = results.length - errors
    if(successes === 0 && errors > 0) {
      // only raise error if all schemas can't connect
      // this is to prevent the error poppups when some schemas are blocked
      for(let error of results) if(error) toastError(error)
    }
  }

  async getSchemata(connName: string, database: string, refresh = false) {

    let data = {
      conn: connName,
      database: database,
      procedure: refresh ? 'refresh' : null
    }

    try {
      let resp = await apiGet(MsgType.GetSchemata, data)
      if (resp.error) return resp.error as string
      let rows = data_req_to_records(resp.data)

      let schemas: { [key: string]: Schema; } = {}
      let tables: { [key: string]: Table; } = {}
      for (let row of rows) {
        row.schema_name = row.schema_name.toLowerCase()
        if (!(row.schema_name in schemas)) {
          schemas[row.schema_name] = new Schema({ name: row.schema_name, database: database, tables: [] })
        }
        let tableKey = `${row.schema_name}.${row.table_name}`
        if (!(tableKey in tables)) {
          tables[tableKey] = new Table({
            connection: connName,
            database: database.toUpperCase(),
            schema: row.schema_name,
            name: row.table_name,
            isView: row.table_is_view,
            columns: [],
          })
        }

        let column = {
          id: row.column_id,
          name: row.column_name,
          type: row.column_type,
          num_rows: row.num_rows,
          num_values: row.num_values,
          num_distinct: row.num_distinct,
          num_nulls: row.num_nulls,
          min_len: row.min_len,
          max_len: row.max_len,
          last_analyzed: row.last_analyzed !== '0001-01-01T00:00:00Z' ? row.last_analyzed : null
        }
        tables[tableKey].columns.push(column)
      }
      for (let key of Object.keys(tables)) {
        schemas[tables[key].schema].tables.push(tables[key])
      }

      database = database.toLowerCase()
      let conn = this.getConnection(connName)
      if (!Object.keys(conn.databases).includes(database)) {
        conn.databases[database] = new Database({ name: database.toUpperCase(), schemas: schemas })
        return
      }

      conn.databases[database].schemas = Object.values(schemas)
      this.trigger('refreshSchemaPanel')
    } catch (error) {
      return error as string
    }
    return
  }

  get currentConnection() {
    return this.getConnection(this.selectedConnection)
  }

  getConnection(connName: string) {
    connName = connName.toLowerCase()
    let index = this.connections.map(c => c.name.toLowerCase()).indexOf(connName)
    if (index > -1) {
      return this.connections[index]
    } else if (connName !== '') {
      console.log(`did not find connection ${connName}`)
    }
    return new Connection()
  }

  async submitQuery(req: QueryRequest) { 
    let data1 = {
      id: new_ts_id('query.'),
      conn: req.conn,
      database: req.database,
      text: req.text.trim(),
      time: (new Date()).getTime(),
      tab: req.tab,
      limit: req.limit,
      wait: true,
      proj_dir: window.dbnet.state.projectPanel.rootPath.get(),
    }
    
    let query = new Query(data1)

    try {
      let done = false
      let headers = {}
      while (!done) {
        let resp = await apiPost(MsgType.SubmitSQL, data1, headers)
        query = new Query(resp.data)
        if (resp.error) throw new Error(resp.error)
        if (query.err) throw new Error(query.err)
        if (resp.status === 202) {
          headers = { "DbNet-Continue": "true" }
          continue
        }
        done = true
      }
    } catch (error) {
      toastError(error)
      query.err = `${error}`
    }

    return query
  }
}


class DexieQuery {
  // eslint-disable-next-line
  constructor(data: ObjectAny = {}) {
  }

  async save() {
    const db = getDexieDb()
    await db.table('queries').put(jsonClone(this))
  }
}

class Job {
  // eslint-disable-next-line
  constructor(data: ObjectAny = {}) {
  }

  async save() {
    const db = getDexieDb()
    await db.table('jobs').put(jsonClone(this))
  }
}


export const getDexieDb = () => {
  const db = new Dexie('dbNetDexie')
  db.version(2).stores({
    workspace: '&name',  // state of workspace metadata
    queries: '&id,conn,time', // history of queries
    schemata: '[connection+database+schema+table]', // state of schema panel for all connections, overwritten by backend
    tabs: '&id', // open tabs, points to a real file
    jobs: '&id,time', // history of queries
  })
  return db
}

export const cleanupDexieDb = async () => {
  let marker = (new Date()).getTime() - 7 * 24 * 60 * 60 * 1000
  const db = getDexieDb()
  await db.table('queries').where('time').below(marker).delete();
}