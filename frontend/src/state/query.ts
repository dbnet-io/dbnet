import { ObjectAny } from "../utilities/interfaces"
import { new_ts_id } from "../utilities/methods"

export enum QueryType {
  SQL = 'sql',
  Meta = 'meta'
}

export enum QueryStatus {
  Fetched = 'fetched',
  Completed = 'completed',
  Submitted = 'submitted',
  Cancelled = 'cancelled',
  Errored = 'errorred',
}

export interface QueryRequest { 
  conn: string;
  database: string;
  text: string;
  tab?: string;
  limit?: number;
}

export class Query {
  id: string
  conn: string
  database: string
  tab: string
  time: number // epoch milli
  duration: number // in seconds
  status: QueryStatus
  type: QueryType
  text: string
  err: string
  headers: string[]
  rows: any[]
  affected: number
  pulled: boolean // whether the rows are pulled (when reloading a session)

  constructor(data: ObjectAny = {}) {
    this.conn = data.conn
    this.database = data.database
    this.tab = data.tab
    this.id = data.id || new_ts_id('query.')
    this.time = data.time || new Date().getTime()
    this.duration = data.duration || 0
    this.type = data.type || QueryType.SQL
    this.text = data.text || ''
    this.err = data.err || ''
    this.status = data.status || ''
    this.headers = data.headers || []
    this.rows = data.rows || []
    this.pulled = data.pulled || false
    this.affected = data.affected || -1
  }

  getRowData = (n: number) => {
    if (this.rows.length === 0) { return [] }
    let row = this.rows[n]
    let data: { n: number, name: string, value: any }[] = []
    for (let i = 0; i < this.headers.length; i++) {
      data.push({ n: i + 1, name: this.headers[i], value: `${row[i]}` })
    }
    return data
  }

}