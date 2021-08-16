import { ObjectAny } from "../utilities/interfaces"
import { jsonClone, new_ts_id } from "../utilities/methods"
import { Editor } from "./editor"
import { Query } from "./query"
import { FileItem } from "./workspace"

interface RowView {
  show: boolean
  filter: string
  rows: { n: number, name: string, value: any }[]
}

export class Tab {
  id: string
  name: string
  editor: Editor
  query: Query
  loading: boolean
  filter: string
  limit: number
  resultLimit: number
  parent: string | undefined
  selectedChild: string
  hidden: boolean
  file: FileItem | undefined
  connection: string | undefined
  database: string | undefined

  rowView: RowView
  showSql: boolean
  showText: boolean
  pinned: boolean
  refreshInterval: number
  lastTableSelection: number[] // r1,c1,r2,c22

  constructor(data: ObjectAny = {}) {
    this.name = data.name || ''
    this.editor = new Editor(window.dbnet?.editor.instanceRef, data.editor || {})
    this.query = new Query(data.query) || new Query()
    this.filter = data.filter || ''
    this.resultLimit = data.resultLimit || 100
    this.limit = data.limit || this.resultLimit
    this.loading = data.loading || false
    this.hidden = data.hidden || false

    this.rowView = data.rowView || { show: false, rows: [], filter: '' }
    this.showSql = data.showSql || true
    this.showText = data.showText || false
    this.pinned = data.pinned || false
    this.refreshInterval = data.refreshInterval || 0
    this.lastTableSelection = data.lastTableSelection || [0, 0, 0, 0]
    this.parent = data.parent
    this.selectedChild = data.selectedChild
    this.file = data.file
    this.connection = data.connection
    this.database = data.database

    let parent_name = this.getParentTabName()
    this.id = data.id || new_ts_id(`tab-${this.name || parent_name}.`)
    if (!this.name) this.name = this.id.slice(-7)
  }

  getParentTabName = () => {
    let parent_name = ''
    try {
      parent_name = (this.parent || '').split('.')[0].split('-')[1]
    } catch (error) { }
    return parent_name
  }

  payload = () => {
    return jsonClone({
      id: this.id,
      name: this.name,
      editor: {
        text: this.editor.text,
        selection: this.editor.selection,
        history: this.editor.history,
      },
      query: this.query,
      loading: this.loading,
      filter: this.filter,
      limit: this.limit,
      resultLimit: this.resultLimit,
      parent: this.parent,
      selectedChild: this.selectedChild,
      hidden: this.hidden,
      file: this.file,
      connection: this.connection,
      database: this.database,
      showSql: this.showSql,
      showText: this.showText,
      pinned: this.pinned,
    })
  }
}