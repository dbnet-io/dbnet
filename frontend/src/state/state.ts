import { createState, none, State } from "@hookstate/core"
import { apiGet, apiPost } from "../store/api"
import { ObjectAny, ObjectString } from "../utilities/interfaces"
import { jsonClone, toastError } from "../utilities/methods"
import { Connection } from "./connection"
import { Job } from "./job"
import { Query, Result } from "./query"
import { Routes } from "./routes"
import { Column, Schema, Table } from "./schema"
import { Tab } from "./tab"
import { ProjectPanelState } from "./workspace"


export class DbNetState {

  workspace: State<WorkspaceState>
  queryPanel: State<QueryPanelState>
  jobPanel: State<JobPanelState>
  projectPanel: State<ProjectPanelState>
  schemaPanel: State<SchemaPanelState>
  metaPanel: State<MetaPanelState>
  objectPanel: State<ObjectPanelState>
  historyPanel: State<HistoryPanelState>
  settingState: State<SettingState>
  transient: State<ObjectAny>
  broadcast: BroadcastChannel

  constructor(data: ObjectAny = {}) {
    this.workspace = createState(new WorkspaceState(data.workspace))
    this.projectPanel = createState(new ProjectPanelState(data.projectPanel))
    this.schemaPanel = createState(new SchemaPanelState(data.schemaPanel))
    this.metaPanel = createState(new MetaPanelState(data.metaPanel))
    this.objectPanel = createState(new ObjectPanelState(data.objectPanel))
    this.jobPanel = createState(new JobPanelState(data.queryPanel))
    this.queryPanel = createState(new QueryPanelState(data.queryPanel))
    this.historyPanel = createState(new HistoryPanelState(data.historyPanel))
    this.settingState = createState(new SettingState(data.settingState))
    this.transient = createState({} as ObjectAny)
    this.broadcast = new BroadcastChannel('dbnet')

    this.broadcast.onmessage = (e: MessageEvent) => {
      if((e.data.type as string) === 'localTabResults')
        this.handleLocalTabResults(e.data)
    }
  }

  handleLocalTabResults(data: ObjectAny) {
    if((data.connection as string).toLowerCase() === window.dbnet.selectedConnection.toLowerCase())
      return // do not overwrite self

    let tabs = (data.payload.tabs as Tab[]).map(t => new Tab(t))
    let results = (data.payload.results as Result[]).map(r => new Result(r))

    for(let tab of tabs) {
      let index = this.queryPanel.get().getTabIndexByID(tab.id)
      if(index === -1) this.queryPanel.tabs.merge([tab])
      else this.queryPanel.tabs[index].set(tab)
    }

    for(let result of results) {
      let index = this.queryPanel.get().getResultIndexByID(result.id)
      if(index === -1) this.queryPanel.results.merge([result])
      else this.queryPanel.results[index].set(result)
    }

  }

  save = async () => {
    // localStorage.setItem("_connection_name", this.workspace.selectedConnection.get());
    
    let payload = {
      name: this.workspace.name.get(),

      data: {
        workspace: jsonClone(this.workspace.get()),
        // projectPanel: jsonClone(this.projectPanel.get()),
        queryPanel: jsonClone(this.queryPanel.get().payload()),
        schemaPanel: jsonClone(this.schemaPanel.get()),
        settingState: jsonClone(this.settingState.get()),
        objectPanel: jsonClone(this.objectPanel.get()),
        // historyPanel: jsonClone(this.historyPanel.get()),
      },
    }
    try {
      let resp = await apiPost(Routes.saveSession, payload)
      if (resp.error) throw new Error(resp.error)
    } catch (error) {
      toastError('Could not save session', error)
    }

    // broadcast localTabResults
    let localTabResults = this.queryPanel.get().payload(
      window.dbnet.selectedConnection
    )
    this.broadcast.postMessage({
      connection: window.dbnet.selectedConnection,
      type: 'localTabResults',
      payload: localTabResults,
    })
  }

  load = async () => {
    let payload = {
      name: this.workspace.name.get(),
    }

    try {
      let resp = await apiGet(Routes.loadSession, payload)
      if (resp.error) throw new Error(resp.error)
      let data = resp.data
      // this.connections.set(data.connections?.map((c: any) =>new Connection(c)))
      this.workspace.set(new WorkspaceState(data.workspace))
      this.schemaPanel.set(new SchemaPanelState(data.schemaPanel))
      this.settingState.set(new SettingState(data.settingState))
      // this.projectPanel.set(new ProjectPanelState(data.projectPanel))
      this.objectPanel.set(new ObjectPanelState(data.objectPanel))
      this.queryPanel.set(new QueryPanelState(data.queryPanel))
      // this.historyPanel.set(new HistoryPanelState(data.historyPanel))
    } catch (error) {
      toastError('Could not load session', error)
    } finally {
      window.dbnet.trigger('onStateLoaded')
    }
  }
}

class WorkspaceState {
  name: string
  selectedMetaTab: string
  selectedConnectionName: string
  selectedConnection: Connection
  selectedConnectionTab: ObjectString
  connections: Connection[]
  rootDir: string

  constructor(data: ObjectAny = {}) {
    this.name = data.name || 'default'
    this.rootDir = data.rootDir
    this.selectedConnectionName = data.selectedConnectionName || ''
    this.selectedConnection = data.selectedConnection || new Connection()
    this.connections = data.connections || []
    this.selectedMetaTab = 'Schema' || data.selectedMetaTab
    this.selectedConnectionTab = data.selectedConnectionTab || {}
  }
  
}

class JobPanelState {
  job: Job
  show: boolean
  step: string
  dialogMode: 'new' | 'old' | undefined
  constructor(data: ObjectAny = {}) {
    this.job = new Job(data.job)
    this.show = false
    this.dialogMode = undefined
    this.step = ''
  }
}

class HistoryPanelState {
  selectedQuery: Query
  filter: string
  constructor(data: ObjectAny = {}) {
    this.selectedQuery = new Query(data.selectedQuery)
    this.filter = data.filter || ''
  }
}

class SettingState {
  leftPaneRatio: number[]
  constructor(data: ObjectAny = {}) {
    this.leftPaneRatio = data.leftPaneRatio || [50,50]
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

export type MetaViewType = 'Schemas' | 'Tables' | 'Columns';
class MetaPanelState {
  selectedConnection: string
  selectedView: MetaViewType
  filter: string
  show: boolean
  loading: boolean

  constructor(data: ObjectAny = {}) {
    this.selectedConnection = data.selectedConnection || ''
    this.selectedView = data.selectedView || 'Schemas'
    this.filter = data.filter || ''
    this.show = data.show || false
    this.loading = data.loading || false
  }
}

class ObjectPanelState {
  table: Table
  history: Table[]
  historyI: number
  selectedColumns: Column[]
  search: string
  loading: boolean
  show: boolean

  constructor(data: ObjectAny = {}) {
    this.table = data.table || {}
    this.history = data.history || []
    this.search = data.search || ''
    this.selectedColumns = data.selectedColumns || []
    this.loading = data.loading || false
    this.show = data.show || false
    this.historyI = data.historyI || -1
    if (!Array.isArray(this.history)) this.history = []
  }
}


class QueryPanelState {
  tabs: Tab[]
  results: Result[]
  selectedTabId: string
  selectedResultId: string
  availableCaches: string[] // query result caches available from backend

  constructor(data: ObjectAny = {}) {
    this.availableCaches = []
    this.tabs = data.tabs || []
    this.results = data.results || []
    this.loadTabsAndResults()

    this.selectedTabId = data.selectedTabId || this.tabs[0].id
    this.selectedResultId = data.selectedResultId || this.results[0].id
  }

  loadTabsAndResults = () => {
    if (this.tabs.length === 0) {
      let t1 = new Tab({ name: 'Q1' })
      let r1 = new Result({ name: 'R1', parent: t1.id })
      t1.selectedResult = r1.id
      this.tabs = [t1]
      this.results = [r1]
      this.selectedTabId = t1.id
      this.selectedResultId = r1.id
    } else {
      this.tabs = this.tabs
                    .filter(t => !(t as any).parent) // legacy
                    .map(t => new Tab(t))
    }

    if (this.results.length === 0) {
      for (let i = 0; i < this.tabs.length; i++) {
        const tab = this.tabs[i];
        let r1 = new Result({ name: 'R1', parent: tab.id })
        this.tabs[i].selectedResult = r1.id
        this.results.push(r1)
        this.selectedResultId = r1.id
      }
    } else {
      this.results = this.results
                      .map(r => new Result(r))
                      .filter(r => this.getTabIndexByID(r.parent) !== -1)

      for (let result of this.results)
        if (this.hasCache(result.query))
          this.availableCaches.push(result.query.id)
    }
  }

  hasCache = (query: Query) => {
    return query.pulled && query.headers.length > 0 && query.rows.length === 0
  }

  getTabIndexByID = (id: string) => {
    return this.tabs.map(t => t.id).indexOf(id)
  }

  getResultIndexByID = (id: string, def = 0) => {
    let index = this.results.map(r => r.id).indexOf(id)
    return index === -1 ? def : index
  }

  getTabIndexByName = (name: string, def = -1) => {
    let index = this.tabs.map(t => t.name).indexOf(name)
    return index === -1 ? def : index
  }

  getTab = (id: string) => {
    let index = this.getTabIndexByID(id)
    if (index > -1 && this.tabs[index] && this.tabs[index] !== none) {
      return this.tabs[index]
    }
    return this.tabs[0]
  }
  getResult = (id: string) => {
    let index = this.getResultIndexByID(id)
    if (index > -1 && this.results[index] && this.results[index] !== none) {
      return this.results[index]
    }
    return this.results[0]
  }
  
  currTab = () => this.getTab(this.selectedTabId)
  currTabIndex = () => this.getTabIndexByID(this.selectedTabId)
  currResult = () => this.getResult(this.selectedResultId)
  currResultIndex = () => this.getResultIndexByID(this.selectedResultId)

  payload = (connection?: string) => {
    let tabs: Tab[] = []
    let results: Result[] = []
    let parentTabs: ObjectAny = {}
    for (let tab of this.tabs) {
      if (tab.hidden) continue
      if (connection && tab.connection?.toLowerCase() !== connection.toLowerCase()) continue 
      parentTabs[tab.id] = 0
      tabs.push(jsonClone<Tab>(tab.payload()))
    }

    for (let result of this.results) {
      if(!result || result === none ) continue
      let result_ = jsonClone<Result>(result.payload())
      result_.query.rows = []
      // clean up rogue child tabs
      if (result_.parent && !(result_.parent in parentTabs)) continue
      results.push(result_)
    }

    return {
      tabs: tabs,
      results: results,
      selectedTabId: this.selectedTabId,
      selectedResultId: this.selectedResultId,
    }
  }
}