import { createState, State } from "@hookstate/core"
import { apiGet, apiPost } from "../store/api"
import { MsgType } from "../store/websocket"
import { ObjectAny } from "../utilities/interfaces"
import { jsonClone, toastError } from "../utilities/methods"
import { Job } from "./job"
import { Query } from "./query"
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

  constructor(data: ObjectAny = {}) {
    this.workspace = createState(new WorkspaceState(data.workspace))
    this.projectPanel = createState(new ProjectPanelState(data.projectPanel))
    this.schemaPanel = createState(new SchemaPanelState(data.schemaPanel))
    this.metaPanel = createState(new MetaPanelState(data.metaPanel))
    this.objectPanel = createState(new ObjectPanelState(data.objectPanel))
    this.jobPanel = createState(new JobPanelState(data.queryPanel))
    this.queryPanel = createState(new QueryPanelState(data.queryPanel))
    this.historyPanel = createState(new HistoryPanelState(data.historyPanel))
    // this.ws = createState(new Ws())
  }

  save = async () => {
    // localStorage.setItem("_connection_name", this.workspace.selectedConnection.get());
    
    let payload = {
      name: this.workspace.name.get(),

      data: {
        workspace: jsonClone(this.workspace.get()),
        // projectPanel: jsonClone(this.projectPanel.get()),
        queryPanel: jsonClone(this.queryPanel.get().payload()),
        // schemaPanel: jsonClone(this.schemaPanel.get()),
        // objectPanel: jsonClone(this.objectPanel.get()),
        // historyPanel: jsonClone(this.historyPanel.get()),
      },
    }
    try {
      let resp = await apiPost(MsgType.SaveSession, payload)
      if (resp.error) throw new Error(resp.error)
    } catch (error) {
      toastError('Could not save session', error)
    }
  }

  load = async () => {
    let payload = {
      name: this.workspace.name.get(),
    }

    try {
      let resp = await apiGet(MsgType.LoadSession, payload)
      if (resp.error) throw new Error(resp.error)
      let data = resp.data
      // this.connections.set(data.connections?.map((c: any) =>new Connection(c)))
      this.workspace.set(new WorkspaceState(data.workspace))
      // this.schemaPanel.set(new SchemaPanelState(data.schemaPanel))
      // this.projectPanel.set(new ProjectPanelState(data.projectPanel))
      // this.objectPanel.set(new ObjectPanelState(data.objectPanel))
      this.queryPanel.set(new QueryPanelState(data.queryPanel))
      // this.historyPanel.set(new HistoryPanelState(data.historyPanel))
    } catch (error) {
      toastError('Could not load session', error)
    }
  }
}

class WorkspaceState {
  name: string
  selectedMetaTab: string
  selectedConnection: string
  rootDir: string

  constructor(data: ObjectAny = {}) {
    this.name = data.name || 'default'
    this.rootDir = data.rootDir
    this.selectedConnection = data.selectedConnection || ''
    this.selectedMetaTab = 'Schema' || data.selectedMetaTab
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
  tabs2: Record<string, Tab>
  selectedTabId: string
  availableCaches: string[] // query result caches available from backend

  constructor(data: ObjectAny = {}) {
    this.availableCaches = []
    this.tabs = data.tabs || []
    this.loadTabs()

    this.tabs2 = data.tabs2 || {}
    this.loadTabs2()

    this.selectedTabId = data.selectedTabId || this.tabs[0].id
  }

  loadTabs = () => {
    if (this.tabs.length === 0) {
      let t1 = new Tab({ name: 'Q1' })
      let c1 = new Tab({ name: 'C1', parent: t1.id })
      t1.selectedChild = c1.id
      this.tabs = [t1, c1]
    } else {
      this.tabs = this.tabs.map(t => new Tab(t))
      let child_tabs = []
      for (let i = 0; i < this.tabs.length; i++) {
        const tab = this.tabs[i];
        if (this.hasCache(tab.query)) this.availableCaches.push(tab.query.id)
        if (tab.parent) continue
        if (!tab.selectedChild || this.getTabIndexByID(tab.selectedChild) === -1) {
          let child = new Tab({ parent: tab.id })
          this.tabs[i].selectedChild = child.id
          child_tabs.push(child)
        }
      }
      this.tabs = this.tabs.concat(child_tabs)
    }
  }

  loadTabs2 = () => {
    if (Object.keys(this.tabs2).length === 0) {
      let t1 = new Tab({ name: 'Q1' })
      let c1 = new Tab({ name: 'C1', parent: t1.id })
      t1.selectedChild = c1.id
      this.tabs2[t1.name] = t1
    } else {
      for (let [k, t] of Object.entries(this.tabs2)) {
        this.tabs2[k] = new Tab(t)
      }
      for (let [k, tab] of Object.entries(this.tabs2)) {
        if (this.hasCache(tab.query)) this.availableCaches.push(tab.query.id)
        if (tab.parent) continue
        if (!tab.selectedChild || !(tab.selectedChild in this.tabs2)) {
          let child = new Tab({ parent: tab.id })
          this.tabs2[k].selectedChild = child.id
          this.tabs2[child.id] = child
        }
      }
    }
  }

  hasCache = (query: Query) => {
    return query.pulled && query.headers.length > 0 && query.rows.length === 0
  }

  getTabIndexByID = (id: string) => {
    return this.tabs.map(t => t.id).indexOf(id)
  }
  getTabIndexByName = (name: string) => {
    return this.tabs.map(t => t.name).indexOf(name)
  }

  getTab = (id: string) => {
    let index = this.getTabIndexByID(id)
    if (index > -1) {
      return this.tabs[index]
    }
    return this.tabs[0]
  }
  currTab = () => this.getTab(this.selectedTabId)
  currTabIndex = () => this.getTabIndexByID(this.selectedTabId)

  payload = () => {
    let tabs: Tab[] = []
    let parentTabs: ObjectAny = {}
    for (let tab of this.tabs) {
      if (tab.parent || tab.hidden) continue
      parentTabs[tab.id] = 0
    }

    for (let tab of this.tabs) {
      let tab_ = jsonClone<Tab>(tab.payload())
      tab_.query.rows = []
      // clean up rogue child tabs
      if (tab_.parent && !(tab_.parent in parentTabs)) continue
      if (tab_.hidden) continue
      tabs.push(tab_)
    }

    return {
      tabs: tabs,
      selectedTabId: this.selectedTabId,
    }
  }
}