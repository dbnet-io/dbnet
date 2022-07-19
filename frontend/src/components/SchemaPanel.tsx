import * as React from "react";
import { Tree } from 'primereact/tree';
import { copyToClipboard, jsonClone, toastError, zeroPad } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { useHS, useVariable } from "../store/state";
import { loadMetaTable, makeYAML } from "./MetaTablePanel";
import { Tooltip } from "primereact/tooltip";
import { appendSqlToTab, createTabChild, getCurrentParentTabState, getOrCreateParentTabState, getTabState } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { Menu } from 'primereact/menu';
import { Button } from "primereact/button";
import { MenuItem } from "primereact/menuitem";
import { Connection } from "../state/connection";
import { Database, Schema, Table } from "../state/schema";
import _ from "lodash";
import { Query } from "../state/query";
import TreeNode from "primereact/treenode";

interface Props {}

export const SchemaPanel: React.FC<Props> = (props) => {
  const cm = React.useRef<ContextMenu>(null);
  const tree = React.useRef<Tree>(null);
  const schemaPanel = useHS(window.dbnet.state.schemaPanel)
  const connection = useHS<Connection>(new Connection())
  const loading = schemaPanel.loading
  const trigger = useVariable(0)
  const onSelectConnection = useVariable(0)
  const filter = useVariable("")


  ///////////////////////////  HOOKS  ///////////////////////////

  const databasesMenu = React.useRef<any>(null);

  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    let id1 = window.dbnet.subscribe('refreshSchemaPanel', trigger)
    let id2 = window.dbnet.subscribe('onSelectConnection', onSelectConnection)
    return () => {
      window.dbnet.unsubscribe(id1)
      window.dbnet.unsubscribe(id2)
    }
  }, []) // eslint-disable-line

  React.useEffect(() => {
    setTimeout(() => {
      if (window.dbnet.selectedConnection === connection.name.get()) return
      loadConnection(window.dbnet.selectedConnection)
    }, 100);
  }, [onSelectConnection.get()]) // eslint-disable-line

  React.useEffect(() => {
    if (window.dbnet.connections.length === 0) return
    let connName = localStorage.getItem("_schema_panel_connection")
    if (!connName) {
      connName = window.dbnet.connections[0].name
    } else if (!window.dbnet.connections.map(c => c.name).includes(connName)) {
      connName = window.dbnet.connections[0].name
    }
    // let conn = getConnectionState(connName)
    connection.set(new Connection(jsonClone(window.dbnet.getConnection(connName))))
    return () => localStorage.setItem("_schema_panel_connection", connection.name.get())
  }, [trigger.get()]) // eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const loadConnection = async (name: string, refresh = false) => {
    connection.set(new Connection(window.dbnet.getConnection(name)))
    loading.set(true)
    setTimeout(async () => {
      await window.dbnet.getDatabases(name)
      await window.dbnet.getAllSchemata(name, refresh)
      connection.set(new Connection(window.dbnet.getConnection(name)))
      // await window.dbnet.state.save()
      loading.set(false)
    }, 10);
  }

  const getConnectionItems = () => {

    return Object.values(window.dbnet.connections).map((c): MenuItem => {
      let connName = c.name.toUpperCase()
      return {
        label: connName,
        // icon: 'pi pi-times',
        command: async () => window.dbnet.selectConnection(connName)
      }
    })
  }

  const nodeKeyToDatabase = (key: string) => {
    let conn = window.dbnet.getConnection(window.dbnet.selectedConnection)
    return conn.lookupDatabase(key) || new Database()
  }

  const nodeKeyToSchema = (key: string) => {
    let conn = window.dbnet.getConnection(window.dbnet.selectedConnection)
    return conn.lookupSchema(key) || new Schema()
  }

  const nodeKeyToTable = (key: string) => {
    let conn = window.dbnet.getConnection(window.dbnet.selectedConnection)
    return conn.lookupTable(key) || new Table()
  }

  const selectAll = (table: Table) => {
    let sql = `${table.selectAll()} limit 500;`
    let tab = getOrCreateParentTabState(table.connection, table.database)
    appendSqlToTab(tab.id.get(), sql)
    submitSQL(tab, sql)
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

      let id = `schema-node-${node?.key?.toString().replaceAll(new RegExp('[^-#_a-zA-Z0-9]', "gm"), '-')}`
      let namePx = node.data.data.name.length*9
      let width =  node.data.type === 'table' && namePx > 250 ?  `${namePx}px` : `${250}px`
      return (
        <span id={id} data-pr-position="right" data-pr-my="left+37">
          <Tooltip target={`#${id}`} style={{ fontSize: '11px', minWidth: width, fontFamily: 'monospace' }}>
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
                  <br />
                  <span><strong>Columns:</strong> {node.data.data.columns.length}</span>
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
          command: async () => {
            let keys = Object.keys(selectedKeys.get())
            if (keys.length !== 1) return toastError("Must choose only one object")
            let arr = keys[0].split('.')
            loading.set(true)
            if (arr.length === 1) {
              // is database
              await window.dbnet.getSchemata(connection.name.get(), arr[0], true)
            }
            loading.set(false)
          }
        },
        {
          label: 'SELECT *',
          icon: 'pi pi-play',
          command: () => {
            let keys = Object.keys(selectedKeys.get())
            if (keys.length !== 1) return toastError("Must choose only one object")
            let table = nodeKeyToTable(keys[0])
            selectAll(table)
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
            
            let table = nodeKeyToTable(keys[0])
            if (keys.length > 1) {
              let sql = countTables
                .map(t => `select '${t.fullName()}' as table_name, count(1) cnt from ${t.fullName2()}`)
                .join(' UNION ALL\n') + ';'
              let tab = getOrCreateParentTabState(table.connection, table.database)
              appendSqlToTab(tab.id.get(), sql)
            } else {
              let sql = `select '${table.fullName()}' as table_name, count(1) cnt from ${table.fullName2()};`
              let tab = getOrCreateParentTabState(table.connection, table.database)
              appendSqlToTab(tab.id.get(), sql)
              submitSQL(tab, sql)
            }
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
              let dbChildren = databaseNode.children || [];
              for (let schemaNode of dbChildren) {
                let schemaChildren = schemaNode.children || [];
                for (let tableNode of schemaChildren) {
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
          let table = new Table(e.node.data.data)
          let ts = (new Date()).getTime()
          if (e.node.data.type === 'table') {
            if (lastClick.ts.get() === 0) {
              lastClick.set({ ts: ts, key: e.node.key?.toString() })
            } else if (ts - lastClick.ts.get() < 320 && e.node.key === lastClick.key.get()) {
              // simulate double click
              loadMetaTable(table)
              selectAll(table)
              lastClick.set({ ts: 0, key: '' })
              return
            } else {
              lastClick.set({ ts: ts, key: e.node.key })
            }
            
            // single click
            setTimeout(() => {
              let keys = Object.keys(selectedKeys.get())
              if (keys.length > 1) return // don't load if selecting multi
              if(lastClick.ts.get() > 300) loadMetaTable(table)
              lastClick.set({ ts: 0, key: '' })
            }, 320);
          }
        }}
        onSelectionChange={e => selectedKeys.set(e.value as any)}
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
          height: `${window.innerHeight - 200}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
        // onFilterValueChange={(e: any) => { console.log(e) }}
      />
    </>
  }

  const Bar = () => { 
    return <div>
      <h4 style={{ textAlign: 'center', margin: '-0px' }}>
        {connection.name.get().toUpperCase()}
        {/* refresh */}
        <a href="#;" title="Refresh All">
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
  }

  return (
    <div id='schema-panel' className="p-grid p-fluid" style={{ textAlign: 'center' }}>
      {/* <FilterBox filter={schemaFilter} loading={loading} onClick={() => GetSchemas(connection.name.get())} /> */}
      <div className="p-col-12 p-md-12">
        <Bar />
      </div>
      <div className="p-col-12 p-md-12">
        <SchemaTree />
      </div>
    </div>
  );
};