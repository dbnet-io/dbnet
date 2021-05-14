import type { ObjectAny } from "./utilities/interfaces"
import { new_ts_id } from "./utilities/methods"


export enum MsgType {
  Test = 'test',
  Error = 'error',
  SubmitSQL = 'submit-sql',
  CancelSQL = 'cancel-sql',
  GetConnections = 'get-connections',
  GetSchemata = 'get-schemata',
  GetSchemas = 'get-schemas',
  GetTables = 'get-tables',
  GetColumns = 'get-columns',
  GetAnalysisSql = 'get-analysis-sql',
  GetHistory = 'get-history',
  GetSQLRows = 'get-sql-rows',
  LoadSession = 'load-session',
  SaveSession = 'save-session',
}

export class Message {
  req_id: string
  type: MsgType
  data: ObjectAny
  error?: string
  orig_req_id?: string
  callback?: (data: Message) => void

  constructor(type: MsgType, data : ObjectAny = {}){
    this.req_id = new_ts_id(type+'.')
    this.type = type
    this.data = data
    if(data.callback) {
      this.callback = data.callback
    }
  }
}

class API {
  constructor() {}
  Post = async function(url: string, data: ObjectAny) {
    let resp = await fetch(url, {})
    return resp
  }
  Get = async function() {}
  Send = async (msg: Message) : Promise<Message> => {
    let url = msg.type
    let resp = await this.Post(url, msg.data)
    return {} as Message
  }
}

export const Api = new API()