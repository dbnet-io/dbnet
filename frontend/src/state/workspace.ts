import { ObjectAny } from "../utilities/interfaces"
import { jsonClone } from "../utilities/methods"
import { getDexieDb } from "./dbnet"

export class Workspace {
  name: string
  connections: string[]
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