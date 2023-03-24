import { State } from "@hookstate/core";
import Dexie from "dexie";
import _ from "lodash";
import { createTabResult, getOrCreateParentTabState, getResultState, getTabState } from "../components/TabNames";
import { apiGet, apiPost, Response } from "../store/api";
import { Variable } from "../store/state";
import { ObjectAny } from "../utilities/interfaces";
import { jsonClone, new_ts_id, showNotification, Sleep, toastError, toastInfo } from "../utilities/methods";
import { Connection } from "./connection";
import { Editor } from "./editor";
import { EditorMap, EditorTabMap } from "./monaco/monaco";
import { Query, QueryRequest, Result } from "./query";
import { makeRoute, Routes } from "./routes";
import { Database, Schema, Table } from "./schema";
import { DbNetState } from "./state";
import { Tab } from "./tab";
import { Workspace } from "./workspace";

export type DbNetOptions = {
  connectionName?: string;
  // uri: string;
  // editor: editor.IStandaloneCodeEditor;
  onConnected?: () => unknown;
  onDisconnected?: () => unknown;
  onDesynchronized?: () => unknown;
  onChangeLanguage?: (language: string) => unknown;
  // onChangeUsers?: (users: Record<number, UserInfo>) => unknown;
  reconnectInterval?: number;
};

export type TriggerType = 'refreshSchemaPanel' | 'refreshJobPanel' | 'refreshTable' | 'onSelectConnection' | 'onStateLoaded'

// export type TriggerMapRecord = Record<TriggerType, Record<string, Variable<number>>>
export type TriggerMapRecord = Record<TriggerType, Record<string, () => void>>

export class DbNet {
  private ws?: WebSocket;
  db: Dexie
  workspace: Workspace
  selectedConnection: string
  editor: Editor
  triggerMap: TriggerMapRecord
  state: DbNetState
  editorMap: EditorMap
  editorTabMap: EditorTabMap

  constructor(options: DbNetOptions) {
    this.db = getDexieDb()
    this.workspace = new Workspace()
    this.editor = new Editor()
    this.selectedConnection = options.connectionName?.replace('#', '').replace('/', '') || ''
    this.triggerMap = {} as TriggerMapRecord
    this.state = new DbNetState()
    this.editorMap = {}
    this.editorTabMap = {}
  }

  async init() {
    this.state.transient.showLoadSpinner.set(true)

    await this.state.load()
    await this.loadWorkspace() // load last workspace or use default
    await this.loadConnections() // get all connections or create TODO:
    await this.loadHistoryQueries()
    await this.loadHistoryJobs()

    this.state.transient.showLoadSpinner.set(false)
  }

  selectConnection(name: string) {
    if(!name || name === 'null') return
    name = name.toLowerCase()
    if (!name || !this.connections.map(c => c.name.toLowerCase()).includes(name.toLowerCase())) {
      return toastError(`Connection ${name} not found`)
    }
    document.title = `${name.toUpperCase()}`
    if(this.selectedConnection === name) return

    this.selectedConnection = name
    this.state.workspace.selectedConnectionName.set(name)
    this.state.workspace.selectedConnection.set(this.getConnection(name))
    window.history.replaceState(null, name, '/#/' + name);
    localStorage.setItem("_connection_name", name)
    this.trigger('onSelectConnection')
  }

  selectTab(id: string) {
    if(!id) {
      let tab = getOrCreateParentTabState(this.selectedConnection, this.currentConnection.firstDatabase)
      id = tab.id.get()
    } else {
      let tab = getTabState(id)
      tab.hidden.set(false)
    }

    this.state.queryPanel.selectedTabId.set(id)
    this.state.workspace.selectedConnectionTab.set(
      m => {
        if(!m) m = {}
        m[this.selectedConnection.toLowerCase()] = id
        return m
      }
    )
  }

  getCurrConnectionsTabs() {
    return this.state
              .queryPanel
              .tabs
              .get()
              .filter(t => t.connection?.toLowerCase() === this.selectedConnection.toLowerCase())
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

  get connections() {
    return this.workspace.connections
  }

  async loadConnections() {
    let resp: Response = {} as Response
    let tries = 0
    while (true) {
      try {
        tries++
        resp = await apiGet(Routes.getConnections, {})
        break
      } catch (error: any) {
        resp.error = error
        if (tries >= 5) break
        await Sleep(1000)
      }
    }

    if (resp.error) return toastError(resp.error)
    let records = await resp.records()
    
    let connections = _.sortBy(records, (c: any) => c.name).map(c => new Connection(c))
    this.workspace.connections = connections
    this.state.workspace.connections.set(connections)
    
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
      let i = this.getConnectionIndex(connName)
      if(!connName || i === -1) return
      let connection = this.connections[i]
      let route = makeRoute(Routes.getConnectionDatabases, { connection: connName })
      let resp = await apiGet(route)
      if (resp.error) throw new Error(resp.error)
      let records = await resp.records()
      if (records.length > 0) {
        let databases = jsonClone<Record<string, Database>>(connection.databases)
        records.forEach((r) => {
          let name = (r.name as string)
          if (!(name.toLowerCase() in databases)) {
            databases[name.toLowerCase()] = new Database({ name: name.toUpperCase() })
          }
        })

        this.connections[i].databases = databases
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
      connection: connName,
      database: database,
      procedure: refresh ? 'refresh' : null
    }

    try {
      let resp = await apiGet(makeRoute(Routes.getConnectionColumns, data), { database })
      if (resp.error) return resp.error as string
      let records = await resp.records()

      let schemas: { [key: string]: Schema; } = {}
      let tables: { [key: string]: Table; } = {}
      for (let row of records) {
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
            isView: row.table_type === 'view',
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
      let i = this.getConnectionIndex(connName)
      let conn = this.connections[i]
      if (!Object.keys(conn.databases).includes(database)) {
        this.connections[i].databases[database] = new Database({ name: database.toUpperCase(), schemas: schemas })
        return
      }

      this.connections[i].databases[database].schemas = Object.values(schemas)
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
    let index = this.getConnectionIndex(connName)
    if (index > -1) {
      let conn = this.connections[index]
      if(!conn.database) this.connections[index].database = conn.firstDatabase
      return this.connections[index]
    } else if (connName !== '') {
      console.log(`did not find connection ${connName}`)
    }
    return new Connection()
  }

  getConnectionIndex(connName: string) {
    connName = connName.toLowerCase()
    return this.connections.map(c => c.name.toLowerCase()).indexOf(connName)
  }

  async submitQuery(req: QueryRequest) { 
    let tab: State<Tab> | undefined
    let result: State<Result> | undefined

    if(req.tab_id) tab = getTabState(req.tab_id)
    if(req.result_id) result = getResultState(req.result_id)

    if(result)
      // set limit to fetch, and save in cache
      req.limit = result.limit.get() > 5000 ? 5000 : result.limit.get() < 500 && result.limit.get() > -1 ? 500 : req.limit

    if (req.text.trim().endsWith(';'))
      req.text = req.text.trim().slice(0, -1).trim()
    if (!req.text)
      return toastError('Blank Query Submitted')

    let query = new Query({
      id: new_ts_id('query.'),
      connection: req.connection,
      database: req.database,
      text: req.text.trim(),
      time: (new Date()).getTime(),
      tab_id: req.tab_id,
      limit: req.limit || 500,
    })

    if (!req.headless && req.tab_id && !req.result_id) {
      // always create new result
      let tab = getTabState(req.tab_id)
      let resultTab = createTabResult(tab.get())
      tab.selectedResult.set(resultTab.id)
      req.result_id = resultTab.id
      result = getResultState(resultTab.id)
    } else if (!req.headless && req.result_id) {
      // reset result
      getResultState(req.result_id).set(
        r => {
          r.query.time = new Date().getTime()
          r.lastTableSelection = [0, 0, 0, 0]
          r.query.rows = []
          r.query.headers = []
          r.query.text = query.text
          r.query.err = ''
          r.query.duration = 0
          r.filter = ''
          return r
        }
      )
    }

    // cleanup
    cleanupDexieDb()
    
    try {
      let done = false

      let headers : ObjectAny = {"Accept": 'application/json'}

      if(req.export === 'csv') headers["Accept"] = 'text/csv'
      if(req.export === 'jsonlines') headers["Accept"] = 'application/jsonlines'
      
      tab?.loading.set(true)
      result?.loading.set(true)

      while (!done) {
        let resp = await apiPost(makeRoute(Routes.postConnectionSQL, query), query.text, headers)
        if (resp.error) throw new Error(resp.error)
        if (resp.response.status === 202) {
          let payload = await resp.json()
          if(payload?.text) query.text = payload.text
          result?.query?.text.set(query.text)
          headers["X-Request-Continue"] = "true"
          continue
        }

        query.duration = ((new Date()).getTime() - query.time) / 1000
        query.err = resp.data?.err
        query.headers = await resp.headers()
        if(req.export) {
          query.headers = [{name: 'message', type: 'string', dbType: 'string'}]
          query.rows = [['File Generated.']]
          resp.download(`${req.connection}-${req.database}`.toLowerCase(), req.export)
        } else {
          query.rows = await resp.rows()
        }

        done = true
      }

      tab?.set(
        t => {
          t.rowView.rows = query.getRowData(0)
          if(result) t.selectedResult = result.id.get()
          t.editor.highlight = [0, 0, 0, 0]
          t.loading = false
          return t
        }
      )

      result?.set(
        r => {
          r.query = query
          if(tab) r.parent = tab.id.get()
          r.loading = false
          return r
        }
      )

      // cache results
      getDexieDb().table('queries').put(jsonClone(query))
    } catch (error) {
      tab?.loading.set(false)
      result?.loading.set(false)
      toastError(error)
      query.err = `${error}`
    }

    window.dbnet.state.save()

    // to refresh
    const queryPanel = window.dbnet.state.queryPanel.get()
    if (queryPanel.currTab().id === tab?.id.get()) {
      window.dbnet.trigger('refreshTable')
    } else {
      // notify if out of focus
      if (result?.query.err.get()) toastError(`Query "${tab?.name.get()}" failed`)
      else toastInfo(`Query "${tab?.name.get()}" completed`)
    }

    if (!document.hasFocus()) {
      showNotification(`Query "${tab?.connection.get()}" ${result?.query.err.get() ? 'errored' : 'completed'}!`)
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