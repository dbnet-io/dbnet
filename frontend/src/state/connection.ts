import TreeNode from "primereact/treenode"
import { ObjectAny, ObjectString } from "../utilities/interfaces"
import { LogError, toastError } from "../utilities/methods"
import { Database, Schema, Table } from "./schema"


export enum ConnType {
  FileLocal = "local",
  FileHDFS = "hdfs",
  FileS3 = "s3",
  FileAzure = "azure",
  FileGoogle = "gs",
  FileSftp = "sftp",
  FileHTTP = "http",

  DbPostgres = "postgres",
  DbRedshift = "redshift",
  DbMySQL = "mysql",
  DbOracle = "oracle",
  DbBigQuery = "bigquery",
  DbSnowflake = "snowflake",
  DbSQLite = "sqlite",
  DbSQLServer = "sqlserver",
  DbAzure = "azuresql",
  DbAzureDWH = "azuredwh",
  DbBigTable = "bigtable",
}


export class Connection {
  name: string
  type: ConnType
  database: string
  source: string
  databases: Record<string, Database>
  data: ObjectString;
  schemas: Schema[]
  recentOmniSearches: { [key: string]: number; }

  constructor(data: ObjectAny = {}) {
    this.name = data.name?.toLowerCase() || ''
    this.type = data.type
    this.data = data.data
    this.database = data.database || ''
    this.source = data.source || ''
    this.schemas = data.schemas || []
    this.databases = data.databases || {}
    for (let k of Object.keys(this.databases)) {
      this.databases[k] = new Database(this.databases[k])
    }
    this.recentOmniSearches = data.recentOmniSearches || {}
  }

  get dbt() { return this.source.includes('dbt')}

  get firstDatabase() {
      let database = ''
      if(Object.keys(this.databases).length > 0) {
        let first = Object.keys(this.databases)[0]
        database = this.databases[first]?.name 
      }
      return database
  }

  getAllSchemas = () => {
    let schemas: Schema[] = []
    try {
      for (let database of Object.values(this.databases)) {
        schemas = schemas.concat(database.schemas)
      }
    } catch (error) {
      LogError(error)
    }
    return schemas
  }

  getAllTables = () => {
    let tables: Table[] = []
    try {
      for (let database of Object.values(this.databases)) {
        for (let table of database.getAllTables()) {
          tables.push(table)
        }
      }
    } catch (error) {
      LogError(error)
    }
    return tables
  }

  payload = () => {
    return {
      name: this.name,
      type: this.type,
      dbt: this.dbt,
      database: this.database,
      databases: this.databases,
      recentOmniSearches: this.recentOmniSearches,
    }
  }

  databaseNodes = () => {
    let newNodes: TreeNode[] = []
    let database: Database = new Database()
    try {
      for (database of Object.values(this.databases)) {
        newNodes.push({
          key: database.name,
          label: database.name.toUpperCase(),
          leaf: false,
          data: {
            type: 'database',
            data: database,
          },
          children: this.schemaNodes(database),
        })
      }
    } catch (error) {
      console.log(error)
      console.log(database)
      toastError('Error loading databases', `${error}`)
    }
    return newNodes
  }

  schemaNodes = (database: Database) => {
    let newNodes: TreeNode[] = []
    let schema: Schema = new Schema()
    let internal_schemas = [
      'pg_catalog',
      'information_schema',
      '_timescaledb_internal',
      '_timescaledb_config',
      '_timescaledb_catalog',
      'timescaledb_experimental',
      'timescaledb_information',
    ]

    try {
      for (let i = 0; i < database.schemas.length; i++) {
        schema = database.schemas[i]
        if(internal_schemas.includes(schema.name.toLocaleLowerCase()))
          continue

        newNodes.push({
          key: `${database.name}.${schema.name}`,
          label: schema.name,
          data: {
            type: 'schema',
            database: database.name,
            data: schema,
          },
          leaf: false,
          children: this.tableNodes(database, schema),
        })
      }
    } catch (error) {
      console.log(error)
      console.log(schema)
      toastError('Error loading schemas', `${error}`)
    }
    return newNodes
  }

  tableNodes = (database: Database, schema: Schema) => {
    let newNodes: TreeNode[] = []

    try {
      // let children: TreeNode[] = []
      if (schema?.tables !== undefined) {
        if (!Array.isArray(schema.tables)) schema.tables = []
        for (let table of schema.tables) {
          newNodes.push({
            key: `${database.name}.${schema.name}.${table.name}`,
            label: `${table.name}`,
            data: {
              type: 'table',
              schema: schema.name,
              database: database.name,
              data: table,
            },
            leaf: true,
          })
        }
      }
    } catch (error) {
      console.log(error)
      console.log(schema)
      toastError('Error loading tables', `${error}`)
    }
    return newNodes

  }

  lookupDatabase(key: string) {
    for (let database of Object.values(this.databases)) {
      if (
        database.name.toLowerCase() === key.toLowerCase()
      ) return new Database(database)
    }
  }

  lookupSchema(key: string) {
    let [tableDb, tableSchema] = key.toLowerCase().split('.')
    for (let database of Object.values(this.databases)) {
      for (let schema of database.schemas) {
        if (
          database.name.toLowerCase() === tableDb &&
          schema.name.toLowerCase() === tableSchema
        ) return new Schema(schema)
      }
    }
  }


  lookupSchemaIndex(key: string) {
    let [tableDb, tableSchema] = key.toLowerCase().split('.')
    for (let i = 0; i < this.databases[tableDb]?.schemas.length; i++) {
      const schema = this.databases[tableDb].schemas[i];
      if (schema.name.toLowerCase() === tableSchema) return i
    }
    return -1
  }

  lookupTable(key: string) {
    let [tableDb, tableSchema, tableName] = key.toLowerCase().split('.')
    for (let database of Object.values(this.databases)) {
      for (let schema of database.schemas) {
        for (let table of schema.tables) {
          if (
            database.name.toLowerCase() === tableDb &&
            schema.name.toLowerCase() === tableSchema &&
            table.name.toLowerCase() === tableName
          ) return new Table(table)
        }
      }
    }
  }

  lookupTableIndex(key: string) {
    let [tableDb, tableSchema, tableName] = key.toLowerCase().split('.')
    for (let database of Object.values(this.databases)) {
      for (let schema of database.schemas) {
        for (let i = 0; i < schema.tables.length; i++) {
          const table = schema.tables[i];
          if (
            schema.name.toLowerCase() === tableDb &&
            schema.name.toLowerCase() === tableSchema &&
            table.name.toLowerCase() === tableName
          ) return i
        }
      }
    }
    return -1
  }
  get quote_char() {
    let q = '"'
    if(this.type === ConnType.DbBigQuery) q = '`'
    if(this.type === ConnType.DbMySQL) q = '`'
    if(this.type === ConnType.DbBigTable) q = ''
    return q
  }

  parseTableName = (text: string) : Table => {
    let table = new Table({
      connection: this.name,
      name: '',
      schema: '',
      database: this.database,
      sql: '',
      dialect: this.type
    })

    let quote = this.quote_char

    let defCaseUpper = this.type === ConnType.DbOracle || this.type === ConnType.DbSnowflake

    let inQuote = false
    let words : string[] = []
    let word = ""

    let addWord = () => {
      if(word === ""){
        return
      }
      words.push(word)
      word = ""
    }

    for (let c of text) {
      switch (c) {
      case quote:
        if(inQuote) {
          addWord()
        }
        inQuote = !inQuote
        continue
      case ".": // eslint-disable-line
        if(!inQuote){
          addWord()
          continue
        }
      case " ": // eslint-disable-line
      case "\n": // eslint-disable-line
      case "\t": // eslint-disable-line
      case "\r": // eslint-disable-line
      case "(": // eslint-disable-line
      case ")": // eslint-disable-line
      case "-": // eslint-disable-line
      case "'":
        if(!inQuote) {
          table.sql = text.trim()
          return table
        }
        break;
      }

      if(inQuote) {
        word = word + c
      } else {
        word = word + (defCaseUpper ? c.toUpperCase() : c)
      }
    }

    if(inQuote) {
      throw new Error("unterminated qualifier quote")
    } else if(word !== "") {
      addWord()
    }

    if(words.length === 0) {
      throw  new Error("invalid table name")
    } else if(words.length === 1) {
      table.name = words[0]
    } else if(words.length === 2) {
      table.schema = words[0]
      table.name = words[1]
    } else if(words.length === 3) {
      table.database = words[0]
      table.schema = words[1]
      table.name = words[2]
    } else {
      table.sql = text.trim()
    }

    return table
  }
}

