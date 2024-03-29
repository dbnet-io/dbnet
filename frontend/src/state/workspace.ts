import TreeNode from "primereact/treenode"
import { ObjectAny } from "../utilities/interfaces"
import { jsonClone } from "../utilities/methods"
import { Connection } from "./connection"
import { getDexieDb } from "./dbnet"

export class Workspace {
  name: string
  connections: Connection[]
  tabs: string[]
  
  constructor(data: ObjectAny = {}) {
    this.name = data.name || 'default'
    this.connections = data.connections || []
    this.tabs = data.tabs || []
  }
  
  async save() {
    localStorage.setItem("_workspace_name", this.name)
    const db = getDexieDb()
    await db.table('workspace').put(jsonClone(this))
  }
}

export class ProjectPanelState {
  rootPath: string
  selectedItem: FileItem
  fileNodes: TreeNode[]
  expandedNodes: ObjectAny
  selectedNodes: ObjectAny
  loading: boolean
  dbtProject?: DbtProject
  dbtProfile?: string
  dbtTarget: string

  constructor(data: ObjectAny = {}) {
    this.rootPath = data.rootPath || ''
    this.selectedItem = data.selectedItem || {}
    this.fileNodes = data.fileNodes || []
    this.loading = data.loading || false
    this.expandedNodes = data.expandedNodes || {}
    this.selectedNodes = data.selectedNodes || {}
    this.dbtProject = data.dbtProject
    this.dbtProfile = data.dbtProfile
    this.dbtTarget = data.dbtTarget || 'dev'
  }

}

export class WorkPanelState {
  fileNodes: TreeNode[]
  expandedNodes: ObjectAny
  selectedNodes: ObjectAny

  constructor(data: ObjectAny = {}) {
    this.fileNodes = data.fileNodes || []
    this.expandedNodes = data.expandedNodes || {}
    this.selectedNodes = data.selectedNodes || {}
  }

}


interface DbtProject {
  'name': string
  'version': string
  'config-version': number
  'profile': string
  'source-paths': string[]
  'analysis-paths': string[]
  'test-paths': string[]
  'data-paths': string[]
  'macro-paths': string[]
  'snapshot-paths': string[]
  'target-path': string
  'clean-targets': string[]
  'vars': ObjectAny
  'models': ObjectAny
}


export interface FileItem {
  name?: string
  path: string
  isDir?: boolean
  modTs?: number
  body?: string
}
