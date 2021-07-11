import * as React from "react";
import { Tree } from 'primereact/tree';
import { copyToClipboard, data_req_to_records, jsonClone, toastError, toastSuccess, zeroPad } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { accessStore, getDatabaseState, globalStore, lookupSchema, Query, Schema, setSchemas, Table, useHS, useVariable } from "../store/state";
import { MsgType } from "../store/websocket";
import { loadMetaTable, makeYAML } from "./MetaTablePanel";
import { apiGet } from "../store/api";
import { Tooltip } from "primereact/tooltip";
import TreeNode from "primereact/components/treenode/TreeNode";
import { appendSqlToTab, createTabChild, getCurrentParentTabState, getOrCreateParentTabState, getTabState } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { Menu } from 'primereact/menu';
import { Button } from "primereact/button";
import { MenuItem } from "primereact/components/menuitem/MenuItem";
import { DbNet } from "../state/dbnet";
import { Connection } from "../state/connection";
import { Database } from "../state/schema";
import _ from "lodash";

interface Props {
  dbnet: DbNet
}

const store = accessStore()

export const SchemaPanel: React.FC<Props> = (props) => {
  const cm = React.useRef<ContextMenu>(null);
  const tree = React.useRef<Tree>(null);
  const schemaPanel = useHS(store.schemaPanel)
  const connection = useHS<Connection>(new Connection())
  const loading = schemaPanel.loading
  const trigger = useVariable(0)
  const onSelectConnection = useVariable(0)
  const filter = useVariable("")


  ///////////////////////////  HOOKS  ///////////////////////////

  const databasesMenu = React.useRef<any>(null);

  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    let id1 = props.dbnet.subscribe('refreshSchemaPanel', trigger)
    let id2 = props.dbnet.subscribe('onSelectConnection', onSelectConnection)
    return () => {
      props.dbnet.unsubscribe(id1)
      props.dbnet.unsubscribe(id2)
    }
  }, [])

  React.useEffect(() => {
    setTimeout(() => {
      if (props.dbnet.currentConnection == connection.name.get()) return
      loadConnection(props.dbnet.currentConnection)
    }, 100);
  }, [onSelectConnection.get()])

  React.useEffect(() => {
    if (props.dbnet.connections.length === 0) return
    let connName = localStorage.getItem("_schema_panel_connection")
    if (!connName) {
      connName = props.dbnet.connections[0].name
    } else if (!props.dbnet.connections.map(c => c.name).includes(connName)) {
      connName = props.dbnet.connections[0].name
    }
    // let conn = getConnectionState(connName)
    connection.set(new Connection(jsonClone(props.dbnet.getConnection(connName))))
    return () => localStorage.setItem("_schema_panel_connection", connection.name.get())
  }, [trigger.get()])

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const loadConnection = async (name: string, refresh = false) => {
    connection.set(new Connection(props.dbnet.getConnection(name)))
    loading.set(true)
    setTimeout(async () => {
      await props.dbnet.getDatabases(name)
      await props.dbnet.getAllSchemata(name, refresh)
      connection.set(new Connection(props.dbnet.getConnection(name)))
      // await globalStore.saveSession()
      loading.set(false)
    }, 10);
  }

  const getConnectionItems = () => {

    return Object.values(props.dbnet.connections).map((c): MenuItem => {
      let connName = c.name.toUpperCase()
      return {
        label: connName,
        // icon: 'pi pi-times',
        command: async () => props.dbnet.selectConnection(connName)
      }
    })
  }

  const nodeKeyToDatabase = (key: string) => {
    let conn = props.dbnet.getConnection(props.dbnet.currentConnection)
    return conn.lookupDatabase(key) || new Database()
  }

  const nodeKeyToSchema = (key: string) => {
    let conn = props.dbnet.getConnection(props.dbnet.currentConnection)
    return conn.lookupSchema(key) || new Schema()
  }

  const nodeKeyToTable = (key: string) => {
    let conn = props.dbnet.getConnection(props.dbnet.currentConnection)
    return conn.lookupTable(key) || new Table()
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
      let tables: Table[] = rows.map(r => {
        return new Table({
          connection: connName,
          database: dbName,
          schema: schemaName,
          name: r.name.toLowerCase(),
          isView: r.is_view,
        })
      })

      let database = getDatabaseState(connName, dbName)
      let index = database.schemas.get().map(s => s.name.toLowerCase()).indexOf(schemaName)
      if (index > -1) {
        database.schemas[index].set(
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
    const expandedKeys = useHS(schemaPanel.expandedNodes)
    const selectedKeys = useHS(schemaPanel.selectedNodes);
    const [selectedNodeKey, setSelectedNodeKey] = React.useState<any>('');
    const lastClick = useHS<{ ts: number, key: any }>({ ts: 0, key: '' });
    const nodeTemplate = (node: TreeNode) => {
      let label = <></>
      let database_name = ''
      let schema_name = ''
      let isView = false
      if (node.data.type === 'table') {
        label = <> {node.label} </>
        let table = node.data.data
        database_name = table.database
        schema_name = table.schema
        isView = node.data.data.isView
      } else if (node.data.type === 'schema') {
        label = <b>{node.label}</b>
        let schema = node.data.data
        database_name = `${schema.database}`.toUpperCase()
        schema_name = schema.name
      } else {
        label = <b>{node.label}</b>
        database_name = `${node.label}`
      }

      let id = `schema-node-${node?.key?.toString().replaceAll('.', '-')}`
      return (
        <span id={id} data-pr-position="right" data-pr-my="left+22">
          <Tooltip target={`#${id}`} style={{ fontSize: '11px', minWidth: '250px', fontFamily: 'monospace' }}>
            <span><strong>Database:</strong> {database_name}</span>
            {
              node.data.type === 'schema' ?
                <>
                  <br />
                  <span>Schema: {schema_name}</span>
                </>
                :
                null
            }
            {
              node.data.type === 'table' ?
                <>
                  <br />
                  <span><strong>Schema:</strong> {schema_name}</span>
                  <br />
                  {
                    isView ?
                      <span><strong>View:</strong> {node.data.data.name}</span> :
                      <span><strong>Table:</strong> {node.data.data.name}</span>
                  }
                </>
                :
                null
            }
          </Tooltip>
          <span style={isView ? { color: 'brown' } : {}}>
            {label}
          </span>
        </span>
      )
    }


    const menu = () => {
      return [
        {
          label: 'Copy Name(s)',
          icon: 'pi pi-copy',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            copyToClipboard(keys.join('\n'))
          }
        },
        {
          label: 'Refresh',
          icon: 'pi pi-refresh',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            if (keys.length !== 1) return toastError("Must choose only one object")
            let arr = keys[0].split('.')
            if (arr.length === 1) {
              // is database
              props.dbnet.getSchemata(connection.name.get(), arr[0], true)
            }
            if (arr.length === 2) {
              // is schema
              GetTables(connection.name.get(), arr[0], arr[1])
            }
          }
        },
        {
          label: 'SELECT *',
          icon: 'pi pi-play',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            if (keys.length !== 1) return toastError("Must choose only one object")

            let sql = `select * from ${keys[0]} limit 5000;`
            // let tab = createTab(keys[0], sql)
            let table = nodeKeyToTable(keys[0])
            let tab = getOrCreateParentTabState(table.connection, table.database)
            appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql)
          }
        },
        {
          label: 'Get COUNT(*)',
          icon: 'pi pi-play',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            let schemas: Schema[] = []
            let tables: Table[] = []
            for (let key of keys) {
              if (key.split('.').length === 1) { schemas = schemas.concat(nodeKeyToDatabase(key).schemas) }
              if (key.split('.').length === 2) { schemas.push(nodeKeyToSchema(key)) }
              if (key.split('.').length === 3) { tables.push(nodeKeyToTable(key)) }
            }

            let countTables: Table[] = []
            for (let schema of schemas) {
              countTables = countTables.concat(schema.tables)
            }
            countTables = countTables.concat(tables)

            let sql = countTables
              .map(t => `select '${t.fullName()}' as table_name, count(1) cnt from ${t.fullName2()}`)
              .join(' UNION ALL\n') + ';'
            copyToClipboard(sql)
          }
        },
        {
          label: 'View DDL',
          icon: 'pi pi-book',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            if (keys.length !== 1) return toastError("Must choose only one object")
            if (keys[0].split('.').length !== 3) { return }
            let schemaTable = nodeKeyToTable(keys[0])

            let databaseNodes = connection.get().databaseNodes()

            for (let databaseNode of databaseNodes) {
              for (let schemaNode of databaseNode.children) {
                for (let tableNode of schemaNode.children) {
                  if (tableNode.key === keys[0]) {
                    schemaTable = tableNode.data.data as Table
                  }
                }
              }
            }

            let data = {
              metadata: schemaTable.isView ? 'ddl_view' : 'ddl_table',
              data: {
                schema: schemaTable.schema,
                table: schemaTable.name,
              },
            }
            let sql = makeYAML(data) + ';'
            let table = nodeKeyToTable(keys[0])
            let tab = getOrCreateParentTabState(table.connection, table.database)
            appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql)
          }
        },
        {
          label: 'Analyze Table',
          icon: 'pi pi-chart-bar',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            if (keys.length !== 1) return toastError("Must choose only one object")
            if (keys[0].split('.').length !== 3) { return }
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
            // let tab = createTab(schemaTable.name, sql)
            let table = nodeKeyToTable(keys[0])
            let tab = getOrCreateParentTabState(table.connection, table.database)
            appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql)
          }
        },
        {
          label: 'Copy DROP Command',
          icon: 'pi pi-times',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            let schemas: Schema[] = []
            let tables: Table[] = []
            for (let key of keys) {
              if (key.split('.').length === 2) { schemas.push(nodeKeyToSchema(key)) }
              if (key.split('.').length === 3) { tables.push(nodeKeyToTable(key)) }
            }

            let sql = schemas.map(s => `DROP SCHEMA ${s.name}`).join(';\n') + ';'
            if (tables.length > 0) sql = tables.map(t => `DROP TABLE ${t.schema}.${t.name}`).join(';\n') + ';'
            copyToClipboard(sql)
          }
        },
        {
          separator: true
        },
        {
          label: 'Get Columns',
          icon: 'pi-table',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            let schemas: Schema[] = []
            let tables: Table[] = []
            for (let key of keys) {
              console.log(key)
              if (key.split('.').length === 1) { schemas = schemas.concat(nodeKeyToDatabase(key).schemas) }
              if (key.split('.').length === 2) { schemas.push(nodeKeyToSchema(key)) }
              if (key.split('.').length === 3) { tables.push(nodeKeyToTable(key)) }
            }

            for (let schema of schemas) {
              tables = tables.concat(schema.tables)
            }

            let headers = ['database_name', 'schema_name', 'table_name', 'column_id', 'column_name', 'column_type']
            let rows: any[] = []
            for (let table of tables) {
              for (let column of table.columns) {
                rows.push([table.database, table.schema, table.name, column.id, column.name, column.type])
              }
            }
            rows = _.sortBy(rows, (r) => { return [r[0], r[1], r[2], zeroPad(r[3], 3)] })
            
            let childTab = createTabChild(getCurrentParentTabState().get())
            let query = new Query({
              connection: childTab.connection,
              database: childTab.database,
              headers, rows, pulled: true
            })
            getTabState(childTab.id).query.set(query)
          }
        },
        {
          label: 'Refresh All',
          icon: 'pi pi-refresh',
          style: { color: 'orange' },
          command: () => {
            loadConnection(connection.get().name)
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
      ]
    }

    return <>
      <ContextMenu model={menu()} ref={cm} onHide={() => setSelectedNodeKey('')} style={{ fontSize: '11px' }} />
      <Tree
        id="schema-tree"
        ref={tree}
        style={{ fontSize: '9px', padding: '0px' }}
        filter filterMode="lenient"
        filterPlaceholder="Filter..."
        filterValue={filter.get()}
        loading={loading.get()}
        value={connection.get().databaseNodes()}
        selectionKeys={selectedKeys.get()}
        selectionMode="multiple"
        metaKeySelection={true}
        expandedKeys={expandedKeys.get()}
        onToggle={e => expandedKeys.set(e.value)}
        onSelect={e => {
          let table = e.node.data.data as Table
          if (e.node.data.type === 'table') {
            let ts = (new Date()).getTime()
            if (lastClick.ts.get() === 0) {
              lastClick.set({ ts: ts, key: e.node.key?.toString() })
            } else if (ts - lastClick.ts.get() < 500 && e.node.key === lastClick.key.get()) {
              // simulate double click
              // loadMetaTable(table)
              // tree.current?.filter(e.node.key)
              // filter.set(`${e.node.key}`)
              lastClick.set({ ts: 0, key: '' })
              return
            } else {
              lastClick.set({ ts: ts, key: e.node.key })
            }
            // single click
            loadMetaTable(table)
          }
        }}
        onSelectionChange={e => selectedKeys.set(e.value)}
        contextMenuSelectionKey={selectedNodeKey}
        onContextMenuSelectionChange={event => {
          let contextKey = `${event.value}`
          let keys = Object.keys(selectedKeys.get())
          if (keys.length > 1 && keys.includes(contextKey)) return
          selectedKeys.set({ [contextKey]: true })
          setSelectedNodeKey(contextKey)
        }}
        onContextMenu={event => cm.current?.show(event.originalEvent as any)}
        nodeTemplate={nodeTemplate}
        contentStyle={{
          height: `${window.innerHeight - 230}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
        // onFilterValueChange={(e: any) => { console.log(e) }}
      />
    </>
  }

  return (
    <div id='schema-panel' className="p-grid p-fluid" style={{ textAlign: 'center' }}>
      <div className="p-col-12 p-md-12">
        <h4 style={{ textAlign: 'center', margin: '-5px' }}>
          {connection.name.get().toUpperCase()}
          <a href="#;">
            <i
              style={{ color: 'orange', fontSize: '0.9em', paddingLeft: '5px' }}
              className="pi pi-refresh"
              onClick={async () => {
                await loadConnection(connection.name.get(), true)
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
            <Menu model={getConnectionItems()} popup ref={databasesMenu} id="popup_menu" style={{ fontSize: '0.7rem' }} />
            <Button
              icon="pi pi-bars"
              className="p-button-sm p-button-secondary"
              aria-controls="popup_menu"
              onClick={(event) => databasesMenu.current.toggle(event)}
              tooltip="Connections"
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