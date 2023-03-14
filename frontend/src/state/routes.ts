export enum Routes {
  getStatus = "/.status",
  getConnections = "/.connections",
  getConnectionDatabases = "/:connection/.databases",
  getConnectionSchemas = "/:connection/.schemas",
  getConnectionTables = "/:connection/.tables",
  getConnectionColumns = "/:connection/.columns",
  postConnectionSQL = "/:connection/.sql/:id",
  postConnectionCancel = "/:connection/.cancel/:id",
  getSchemaTables = "/:connection/:schema/.tables",
  getSchemaColumns = "/:connection/:schema/.columns",
  getTableColumns = "/:connection/:schema/:table/.columns",
  getTableIndexes = "/:connection/:schema/:table/.indexes",
  getTableKeys = "/:connection/:schema/:table/.keys",
  postTableInsert = "/:connection/:schema/:table",
  postTableUpsert = "/:connection/:schema/:table",
  patchTableUpdate = "/:connection/:schema/:table",
  getTableSelect = "/:connection/:schema/:table",
  getHistory = '/get-history',
  loadSession = '/load-session',
  saveSession = '/save-session',
  fileOperation = '/file-operation',
  getSettings = '/get-settings',
}

interface routeParams {
  connection?: string
  database?: string
  schema?: string
  table?: string
  id?: string
  limit?: number
}

export const makeRoute = (route: Routes, params : routeParams = {}) => {
  let routeStr = route.toString() + '?'
  if(params.connection) routeStr = routeStr.replaceAll(':connection', params.connection)
  if(params.schema) routeStr = routeStr.replaceAll(':schema', params.schema)
  if(params.database) routeStr = routeStr + `&database=${params.database.toLowerCase()}`
  if(params.table) routeStr = routeStr.replaceAll(':table', params.table)
  if(params.id) routeStr = routeStr.replaceAll(':id', params.id)
  if(params.limit) routeStr = routeStr + `&limit=${params.limit}`
  return routeStr
}