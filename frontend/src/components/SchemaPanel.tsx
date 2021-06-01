import * as React from "react";
import { Tree } from 'primereact/tree';
import { copyToClipboard, data_req_to_records, jsonClone, toastError } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { accessStore, globalStore, Schema, setSchemas, Table, useHS, useStoreConnection, useStoreSchemaPanel } from "../store/state";
import { MsgType } from "../store/websocket";
import { loadMetaTable, makeYAML } from "./MetaTablePanel";
import { apiGet } from "../store/api";
import { Tooltip } from "primereact/tooltip";
import TreeNode from "primereact/components/treenode/TreeNode";
import { createTab } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { Menu } from 'primereact/menu';
import { Button } from "primereact/button";
import { MenuItem } from "primereact/components/menuitem/MenuItem";

interface Props { }

const store = accessStore()

export const GetSchemata = async (connName: string, dbName: string, refresh=false) => {


  globalStore.schemaPanel.loading.set(true)
  let data = {
    conn: connName,
    database: dbName,
    procedure: refresh ? 'refresh' : null
  }

  try {
    let resp = await apiGet(MsgType.GetSchemata, data)
    if (resp.error) throw new Error(resp.error)
    globalStore.schemaPanel.loading.set(false)
    let rows = data_req_to_records(resp.data)
    let schemas: { [key: string]: Schema; } = {}
    for (let row of rows) {
      row.schema_name = row.schema_name.toLowerCase()
      if (!(row.schema_name in schemas)) {
        schemas[row.schema_name] = { name: row.schema_name, tables: [] }
      }
      schemas[row.schema_name].tables.push({
        schema: row.schema_name,
        name: row.table_name.toLowerCase(),
        isView: row.is_view,
      })
    }
    setSchemas(store.connection, Object.values(schemas))
  } catch (error) {
    toastError(error)
  }
  globalStore.schemaPanel.loading.set(false)
}

export const GetDatabases = async (connName: string) => {
  try {
    let resp = await apiGet(MsgType.GetDatabases, { conn: connName })
    if (resp.error) throw new Error(resp.error)
    let rows = data_req_to_records(resp.data)
    if(rows.length > 0) {
      store.connection.databases.set(rows.map(r => (r.name as string).toUpperCase()))
      if(store.connection.database.get() === '') store.connection.database.set(rows[0].name)
    } else {
      toastError('No Databases found!')
    }
  } catch (error) {
    toastError(error)
  }
}

export const SchemaPanel: React.FC<Props> = (props) => {
  const cm = React.useRef<ContextMenu>(null);
  const schemaPanel = useStoreSchemaPanel()
  const connection = useStoreConnection()
  const schemas = useHS(connection.schemas)
  const loading = schemaPanel.loading


  ///////////////////////////  HOOKS  ///////////////////////////

  const databasesMenu = React.useRef<any>(null);
  const databases = useHS(connection.databases)

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const getDatabaseItems = () => {
    const loadDatabase = async (name: string) => {
      store.connection.database.set(name)
      await GetSchemata(connection.name.get(), connection.database.get())
      await globalStore.saveSession()
    }

    return databases.get().map((name) : MenuItem => { 
      name = name.toUpperCase()
      return { 
        label: name,
        // icon: 'pi pi-times',
        command: async () => loadDatabase(name),
      }
    })
  }

  const GetSchemas = async (connName: string, dbName: string) => {
    loading.set(true)
    try {
      let resp = await apiGet(MsgType.GetSchemas, { conn: connName, database: dbName })
      if (resp.error) throw new Error(resp.error)
      let rows = data_req_to_records(resp.data)
      let schemas_: Schema[] = rows.map(r => { return { name: r.schema_name.toLowerCase(), tables: [] } })
      for (let i = 0; i < schemas_.length; i++) {
        let index = schemas.get().map(s => s.name.toLowerCase()).indexOf(schemas_[i].name.toLowerCase())
        if (index > -1) {
          schemas_[i].tables = jsonClone(schemas.get()[index].tables || [])
        } else {
          schemas_[i].tables = []
        }
      }
      setSchemas(connection, schemas_)
    } catch (error) {
      toastError(error)
    }
    loading.set(false)
  }

  const nodeKeyToTable = (key: string) : Table =>  {
    return {
      schema: key.split('.')[0],
      name: key.split('.')[1],
      isView: false,
    } as Table
  }

  const GetTables = async (connName: string, dbName: string, schemaName: string) => {
    loading.set(true)
    schemaName = schemaName.toLowerCase()
    try {
      let data1 = {
        conn: connName,
        database: dbName,
        schema: schemaName,
      }
      let resp = await apiGet(MsgType.GetTables, data1)
      if (resp.error) throw new Error(resp.error)
      let rows = data_req_to_records(resp.data)
      let tables: Table[] = rows.map(r => { return { schema: schemaName, name: r.name.toLowerCase(), isView: r.is_view } })
      let index = schemas.get().map(s => s.name.toLowerCase()).indexOf(schemaName)
      if (index > -1) {
        schemas[index].set(
          s => {
            s.tables = tables
            return s
          }
        )
      }
    } catch (error) {
      toastError(error)
    }
    loading.set(false)
  }


  ///////////////////////////  JSX  ///////////////////////////

  const SchemaTree = () => {
    const expandedKeys = useHS(store.schemaPanel.expandedNodes)
    const selectedKeys = useHS(store.schemaPanel.selectedNodes);
    const [selectedNodeKey, setSelectedNodeKey] = React.useState<any>('');
    const lastClick = useHS<{ts: number, key: any}>({ts:0, key:''});
    const nodeTemplate = (node: TreeNode) => {
      let label = <></>
      let schema_name = ''
      let isView = false
      if(node.data.type === 'table') {
        label = <> {node.label} </>
        let table = node.data.data
        schema_name = table.schema
        isView = node.data.data.isView
      } else {
        label = <b>{node.label}</b>
        let schema = node.data.data
        schema_name = schema.name
      }

      let id = `schema-node-${node?.key?.toString().replace('.', '-')}`
      return (
        <span id={id} data-pr-position="right"  data-pr-my="left+22">
          <Tooltip target={`#${id}`} style={{fontSize: '11px', minWidth: '250px'}}>
            <span>Schema: {schema_name}</span>
            <br/>
            { 
              node.data.type === 'table'?
              <>
                {
                  isView ?
                  <span>View: {node.data.data.name}</span> :
                  <span>Table: {node.data.data.name}</span>
                }
              </>
              :
              null
            }
          </Tooltip>
          <span style={isView ? {color: 'brown'} : {}}>
            {label}
          </span>
        </span>
      )
    }


    const menu = [
      {
        label: 'Refresh',
        icon: 'pi pi-refresh',
        command: () => {
          let keys = Object.keys(selectedKeys.get())
          if(keys.length !== 1) return toastError("Must choose only one object")
          let arr = keys[0].split('.')

          GetTables(connection.name.get(), connection.database.get(), arr[0])
        }
      },
      {
        label: 'SELECT *',
        icon: 'pi pi-play',
        command: () => {
          let keys = Object.keys(selectedKeys.get())
          if(keys.length !== 1) return toastError("Must choose only one object")

          let sql = `select *\nfrom ${keys[0]}\nlimit 5000;`
          let tab = createTab(keys[0], sql)
          submitSQL(tab, sql)
        }
      },
      {
        label: 'View DDL',
        icon: 'pi pi-book',
        command: () => {
          let keys = Object.keys(selectedKeys.get())
          if(keys.length !== 1) return toastError("Must choose only one object")
          if(keys[0].split('.').length !== 2) {return}
          let schemaTable = nodeKeyToTable(keys[0])

          let schemaNodes = connection.get().schemaNodes()

          for(let schemaNode of schemaNodes) {
            for(let tableNode of schemaNode.children) {
              if(tableNode.key === keys[0]) {
                schemaTable = tableNode.data.data as Table
              }
            }
          }

          let data = {
            metadata: schemaTable.isView ? 'ddl_view': 'ddl_table',
            data: {
              schema: schemaTable.schema,
              table: schemaTable.name,
            },
          }
          let sql = makeYAML(data) + ';'
          let tab = createTab(schemaTable.name, sql)
          submitSQL(tab, sql)
        }
      },
      {
        label: 'Analyze Table',
        icon: 'pi pi-chart-bar',
        command: () => {
          let keys = Object.keys(selectedKeys.get())
          if(keys.length !== 1) return toastError("Must choose only one object")
          if(keys[0].split('.').length !== 2) {return}
          let schemaTable = nodeKeyToTable(keys[0])

          let data = {
            analysis: 'field_stat',
            data: {
              schema: schemaTable.schema,
              table: schemaTable.name,
              fields: [],
            },
          }
          let sql = makeYAML(data) + ';'
          let tab = createTab(schemaTable.name, sql)
          submitSQL(tab, sql)
        }
      },
      {
        label: 'Copy DROP Command',
        icon: 'pi pi-times',
        command: () => {
          let keys = Object.keys(selectedKeys.get())
          let schemas : string[] = []
          let tables : Table[] = []
          for(let key of keys) {
            if(key.split('.').length === 1) { schemas.push(key) }
            if(key.split('.').length === 2) { tables.push(nodeKeyToTable(key)) }
          }
          
          let sql = schemas.map(s => `DROP SCHEMA ${s}`).join(';\n')+';'
          if(tables.length > 0) sql = tables.map(t => `DROP TABLE ${t.schema}.${t.name}`).join(';\n')+';'
          copyToClipboard(sql)
        }
      },
      {
         separator:true
      },
      {
        label: 'Refresh All',
        icon: 'pi pi-refresh',
        style: {color: 'orange'},
        command: () => {
          GetSchemata(connection.name.get(), connection.database.get(), true)
        }
      },
      // {
      //   label: 'Toggle',
      //   icon: 'pi pi-cog',
      //   command: () => {
      //     let _expandedKeys: ObjectAny = { ...expandedKeys };
      //     if (_expandedKeys[selectedNodeKey])
      //       delete _expandedKeys[selectedNodeKey];
      //     else
      //       _expandedKeys[selectedNodeKey] = true;

      //       expandedKeys.set(_expandedKeys);
      //   }
      // },
    ];

    return <>
      <ContextMenu model={menu} ref={cm} onHide={() => setSelectedNodeKey('')} style={{fontSize:'11px'}}/>
      <Tree
        id="schema-tree"
        style={{ fontSize: '9px', padding: '0px'}}
        filter filterMode="lenient"
        filterPlaceholder="Filter..."
        loading={loading.get()}
        // value={schemaNodes}
        value={connection.get().schemaNodes()}
        selectionKeys={selectedKeys.get()}
        selectionMode="multiple"
        metaKeySelection={true}
        expandedKeys={expandedKeys.get()}
        onToggle={e => expandedKeys.set(e.value)}
        onSelect={e => {
          if(e.node.data.type === 'table') {
            let ts = (new Date()).getTime()
            if(lastClick.ts.get() === 0) {
              lastClick.set({ts:ts, key: e.node.key?.toString() })
            } else if (ts - lastClick.ts.get() < 500 && e.node.key === lastClick.key.get()) {
              // simulate double click
              let table = e.node.data.data
              loadMetaTable(`${table.schema}.${table.name}`)
              lastClick.set({ts:0, key:''})
            } else {
              lastClick.set({ts:ts, key: e.node.key })
            }
          }
        }}
        onSelectionChange={e => selectedKeys.set(e.value)}
        contextMenuSelectionKey={selectedNodeKey}
        onContextMenuSelectionChange={event => {
          let contextKey = `${event.value}`
          let keys = Object.keys(selectedKeys.get())
          if(keys.length > 1 && keys.includes(contextKey)) return
          selectedKeys.set({[contextKey]: true})
          setSelectedNodeKey(contextKey)
        }}
        onContextMenu={event => cm.current?.show(event.originalEvent as any)}
        nodeTemplate={nodeTemplate}
        contentStyle={{
          height: `${window.innerHeight - 230}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
      />
    </>
  }

  return (
    <div id='history-panel' className="p-grid p-fluid" style={{textAlign:'center'}}>
      <div className="p-col-12 p-md-12">
        <h4 style={{ textAlign: 'center', margin: '-5px' }}>
          {connection.database.get().toUpperCase()}
          <a href="#;">
            <i 
              style={{color: 'orange', fontSize: '0.9em', paddingLeft: '5px'}}
              className="pi pi-refresh"
              onClick={async () => {
                await GetDatabases(connection.name.get())
                await GetSchemas(connection.name.get(), connection.database.get())
              }}
            />
          </a>
          <span 
            id="schema-databases"
            style={{
              position: 'absolute',
              marginLeft: '20px',
              fontSize: '0.5rem',
            }}
          >
            <Menu model={getDatabaseItems()} popup ref={databasesMenu} id="popup_menu" style={{fontSize: '0.7rem'}} />
            <Button 
              icon="pi pi-bars" 
              className="p-button-sm p-button-secondary"
              aria-controls="popup_menu"
              onClick={(event) => databasesMenu.current.toggle(event)}
              tooltip="Databases"
              aria-haspopup
            />
            
          </span>
        </h4>
      </div>
      {/* <FilterBox filter={schemaFilter} loading={loading} onClick={() => GetSchemas(connection.name.get())} /> */}
      <div className="p-col-12 p-md-12">
        <SchemaTree />
      </div>
    </div>
  );
};