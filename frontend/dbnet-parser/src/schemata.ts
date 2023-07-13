


export interface Table {
  name: string;
  schema: string;
  database: string;
  sql: string;
  dialect: string;
}

const quote_char = (dialect = '') => {
  let q = '"'
  if(dialect === 'bigquery') q = '`'
  if(dialect === 'mysql') q = '`'
  if(dialect === 'bigtable') q = ''
  return q
}

export const ParseTableName = (text: string, dialect = '') : Table => {
  let table = {
    name: '',
    schema: '',
    database: '',
    sql: '',
    dialect: dialect
  }

  let quote = quote_char(dialect)

  let defCaseUpper = dialect === 'oracle' || dialect === 'snowflake'

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