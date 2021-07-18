import { createState, State } from "@hookstate/core"
import { apiGet, apiPost } from "../store/api"
import { MsgType } from "../store/websocket"
import { ObjectAny } from "../utilities/interfaces"
import { jsonClone, toastError } from "../utilities/methods"


export class DbNetState {

  workspace: State<WorkspaceState>
  // queryPanel: State<QueryPanelState>
  // jobPanel: State<JobPanelState>
  // projectPanel: State<ProjectPanelState>
  // schemaPanel: State<SchemaPanelState>
  // objectPanel: State<ObjectPanelState>
  // historyPanel: State<HistoryPanelState>

  constructor(data: ObjectAny = {}) {
    this.workspace = createState(new WorkspaceState(data.workspace))
    // this.projectPanel = createState(new ProjectPanelState(data.projectPanel))
    // this.schemaPanel = createState(new SchemaPanelState(data.schemaPanel))
    // this.objectPanel = createState(new ObjectPanelState(data.objectPanel))
    // this.jobPanel = createState(new JobPanelState(data.queryPanel))
    // this.queryPanel = createState(new QueryPanelState(data.queryPanel))
    // this.historyPanel = createState(new HistoryPanelState(data.historyPanel))
    // this.ws = createState(new Ws())
  }

  save = async () => {
    // localStorage.setItem("_connection_name", this.workspace.selectedConnection.get());

    let payload = {
      name: this.workspace.name.get(),
      conn: this.workspace.selectedConnection.get(),

      data: {
        workspace: jsonClone(this.workspace.get()),
        // projectPanel: jsonClone(this.projectPanel.get()),
        // queryPanel: jsonClone(this.queryPanel.get().payload()),
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

  load = async (connName: string) => {
    if (connName === '') return
    let payload = {
      name: 'default',
      conn: connName,
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
      // this.queryPanel.set(new QueryPanelState(data.queryPanel))
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