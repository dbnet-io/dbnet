import { makeYAML } from "../components/MetaTablePanel"
import { formatSql } from "../components/TabEditor"
import { ObjectAny } from "../utilities/interfaces"
import { data_req_to_records, LogError, toastError } from "../utilities/methods"
import { ConnType } from "./connection"
import { QueryRequest } from "./query"


export class Database {
  name: string
  schemas: Schema[]

  constructor(data: ObjectAny = {}) {
    this.name = data.name
    this.schemas = data.schemas || []
    this.schemas = this.schemas.map(s => new Schema(s))
  }

  getAllTables = () => {
    let tables: Table[] = []
    try {
      for (let schema of this.schemas) {
        for (let table of schema.tables) {
          tables.push(table)
        }
      }
    } catch (error) {
      LogError(error)
    }
    return tables
  }

}

export class Schema {
  name: string
  database: string
  tables: Table[]

  constructor(data: ObjectAny = {}) {
    this.name = data.name
    this.database = data.database
    this.tables = data.tables || []
  }
}

const quote_char = (dialect = '') => {
  let q = '"'
  if(dialect === 'bigquery') q = '`'
  if(dialect === 'mysql') q = '`'
  if(dialect === 'bigtable') q = ''
  return q
}

export class Table {
  connection: string
  database: string
  schema: string
  name: string
  sql: string;
  isView: boolean
  dialect: ConnType;
  columns: Column[]
  constructor(data: ObjectAny = {}) {
    this.connection = data.connection
    this.schema = data.schema
    this.name = data.name
    this.database = data.database
    this.isView = data.isView
    this.sql = data.sql
    this.dialect = data.dialect
    this.columns = data.columns || []
  }

  fdqn_arr = () => { 
    let arr = [this.database, this.schema, this.name]
    if([ConnType.DbSQLite, ConnType.DbClickhouse, ConnType.DbDuckDb].includes(this.dialect)) arr = [this.schema, this.name]
    return arr
  }

  fdqn = () => { 
    let q = quote_char(this.dialect)
    return this.fdqn_arr().map(v => q + v + q).join('.')
  }

  fullName = () => this.fdqn_arr().join('.')

  key = () => `${this.connection}.${this.database}.${this.schema}.${this.name}`.toLowerCase()

  selectAll = () => `select * from ${this.fdqn()}`
  countRows = (columns: Column[] = []) => { 
    let colsCnt = (columns.map(v => v.name) || []).map(c => `count(${c}) cnt_${c}, min(${c}) min_${c}, max(${c}) max_${c}`)
    let colsCntStr = colsCnt.length > 0 ? `, ${colsCnt.join(',  ')}` : ''
    let sql = `select count(*) cnt${colsCntStr} from ${this.fdqn()};`
    sql = colsCnt.length > 2 ? formatSql(sql) : sql
    return sql
  }

  columnDistro = (columns: Column[] = []) => {
    let cols = columns.map(v => v.name) || []
    if (cols.length === 0) {
      toastError('need to select columns')
      return ''
    }
    let colsDistStr = cols.length > 0 ? `${cols.join(',\n  ')}` : ''
    let sql = `select\n  ${colsDistStr},\n  count(*) cnt\nfrom ${this.fdqn()}\ngroup by ${colsDistStr}\norder by count(*) desc limit 500;`
    sql = cols.length > 2 ? formatSql(sql) : sql
    return sql
  }

  columnStats = (columns: Column[] = []) => {
    let data = {
      analysis: 'field_stat',
      data: {
        schema: this.schema,
        table: this.name,
        fields: columns.map(v => v.name) || [],
      },
    }
    let sql = makeYAML(data) + ';'
    return sql
  }

  columnStatsDeep = (columns: Column[] = []) => {
    let data = {
      analysis: 'field_stat_deep',
      data: {
        schema: this.schema,
        table: this.name,
        fields: columns.map(v => v.name) || [],
      },
    }
    let sql = makeYAML(data) + ';'
    return sql
  }

  columnDateDistro = (columns: Column[] = []) => {
    if (columns.length !== 1) {
      toastError('select only one field')
      return ''
    }
    
    let data = {
      analysis: 'distro_field_date',
      data: {
        schema: this.schema,
        table: this.name,
        field: columns[0].name,
      },
    }
    let sql = makeYAML(data) + ';'
    return sql
  }

  lookupColumnIndex = (name: string) => { 
    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      if(col.name.toLowerCase() === name.toLowerCase()) return i
    }
    return -1
  }

  updateColumnStats = async (columns: Column[] = []) => {
    let sql = this.columnStats(columns) || ''
    let req : QueryRequest = {
      connection: this.connection,
      database: this.database,
      text: sql,
      headless: true,
    }
    let query = await window.dbnet.submitQuery(req)
    let records = data_req_to_records(query, true)
    for (let record of records) {
      let col_i = this.lookupColumnIndex(record.field)
      this.columns[col_i].num_rows = record.tot_cnt
      this.columns[col_i].num_values = record.f_cnt
      this.columns[col_i].num_distinct = record.f_dstct_cnt
      this.columns[col_i].num_nulls = record.f_null_cnt
      this.columns[col_i].min_len = record.f_min_len
      this.columns[col_i].max_len = record.f_max_len
      this.columns[col_i].last_analyzed = new Date().toString()
    }
  }
}


export interface Column {
  id: number
  name: string
  type: string
  length?: number
  scale?: number
  precision?: number
  num_rows?: number
  num_values?: number
  num_distinct?: number
  num_nulls?: number
  min_len?: number
  max_len?: number
  last_analyzed?: string
}