import { ObjectAny } from "../utilities/interfaces"
import { jsonClone, new_ts_id } from "../utilities/methods"
import { Editor } from "./editor"
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
  loading: boolean
  resultLimit: number
  selectedResult: string
  hidden: boolean
  file: FileItem | undefined
  connection: string | undefined
  database: string | undefined

  rowView: RowView
  showText: boolean

  constructor(data: ObjectAny = {}) {
    this.name = data.name || ''
    this.editor = new Editor(data.editor || {})
    this.resultLimit = data.resultLimit || 100
    this.loading = data.loading || false
    this.hidden = data.hidden || false

    this.rowView = data.rowView || { show: false, rows: [], filter: '' }
    this.showText = data.showText || false
    this.selectedResult = data.selectedChild
    this.file = data.file
    this.connection = data.connection
    this.database = data.database

    this.id = data.id || new_ts_id(`tab-${this.name}.`)
    if (!this.name) this.name = this.id.slice(-7)
  }

  payload = () => {
    return jsonClone<Tab>({
      id: this.id,
      name: this.name,
      editor: {
        text: this.editor.text,
        selection: this.editor.selection,
        history: this.editor.history,
      },
      loading: this.loading,
      resultLimit: this.resultLimit,
      selectedChild: this.selectedResult,
      hidden: this.hidden,
      file: this.file,
      connection: this.connection,
      database: this.database,
      showText: this.showText,
    })
  }
}