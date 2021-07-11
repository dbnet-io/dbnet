import { ObjectAny } from "../utilities/interfaces"
import { LogError } from "../utilities/methods"


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


export class Table {
  connection: string
  database: string
  schema: string
  name: string
  isView: boolean
  columns: Column[]
  constructor(data: ObjectAny = {}) {
    this.connection = data.connection
    this.schema = data.schema
    this.name = data.name
    this.database = data.database
    this.isView = data.isView
    this.columns = data.columns || []
  }

  fullName = () => `${this.schema}.${this.name}`
  fullName2 = () => `${this.database}.${this.schema}.${this.name}`.toLowerCase()
  key = () => `${this.connection}.${this.database}.${this.schema}.${this.name}`.toLowerCase()
}


export interface Column {
  id: number
  name: string
  type: string
  length?: number
  scale?: number
  precision?: number
}