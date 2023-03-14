import { ObjectAny } from "../utilities/interfaces"
import { jsonClone, new_ts_id } from "../utilities/methods"

export enum QueryStatus {
  Fetched = 'fetched',
  Completed = 'completed',
  Submitted = 'submitted',
  Cancelled = 'cancelled',
  Errored = 'errorred',
}

export interface QueryRequest { 
  connection: string;
  database: string;
  text: string;
  tab_id?: string;
  result_id?: string;
  headless?: boolean; // don't create result
  limit?: number;
  export?: 'csv' | 'json' | 'jsonlines';
}

export interface Header {
  name: string;
  type: string;
  dbType: string;
}

export class Query {
  id: string
  connection: string
  database: string
  result: string
  time: number // epoch milli
  duration: number // in seconds
  status: QueryStatus
  text: string
  err: string
  headers: Header[]
  rows: any[][]
  limit: number
  affected: number
  pulled: boolean // whether the rows are pulled (when reloading a session)

  constructor(data: ObjectAny = {}) {
    this.id = data.id || new_ts_id('query.')
    this.connection = data.connection
    this.database = data.database
    this.result = data.result || data.tab // legacy .tab
    this.time = data.time || new Date().getTime()
    this.duration = data.duration || 0
    this.text = data.text || ''
    this.err = data.err || ''
    this.status = data.status || ''
    this.headers = data.headers || []
    this.rows = data.rows || []
    this.pulled = data.pulled || false
    this.limit = data.limit || 500
    this.affected = data.affected || -1
  }

  getRowData = (n: number) => {
    if (this.rows.length === 0) { return [] }
    let row = this.rows[n]
    let data: { n: number, name: string, value: any }[] = []
    for (let i = 0; i < this.headers.length; i++) {
      data.push({ n: i + 1, name: this.headers[i].name, value: `${row[i]}` })
    }
    return data
  }

}

export class Result {
  id: string
  name: string
  query: Query
  loading: boolean
  filter: string
  limit: number
  parent: string
  pinned: boolean
  refreshInterval: number
  lastTableSelection: number[] // r1,c1,r2,c22

  connection: string | undefined
  database: string | undefined
  
  constructor(data: ObjectAny = {}) {
    this.id = data.id || new_ts_id('result.')
    this.name = data.name || ''
    this.query = new Query(data.query) || new Query()
    this.loading = data.loading || false
    this.filter = data.filter || ''
    this.limit = data.limit || 500
    this.parent = data.parent
    this.pinned = data.pinned || false
    this.refreshInterval = data.refreshInterval || 0
    this.lastTableSelection = data.lastTableSelection || [0, 0, 0, 0]
    this.connection = data.connection
    this.database = data.database

    let parent_name = this.getParentTabName()
    this.id = data.id || new_ts_id(`result-${this.name || parent_name}.`)
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
      loading: this.loading,
      filter: this.filter,
      limit: this.limit,
      query: this.query,
      parent: this.parent,
      connection: this.connection,
      database: this.database,
      pinned: this.pinned,
    })
  }
}