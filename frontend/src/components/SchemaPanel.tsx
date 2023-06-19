import * as React from "react";
import { Tree, TreeEventNodeParams } from 'primereact/tree';
import { copyToClipboard, jsonClone, toastError, useIsMounted, zeroPad } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { useHS, useVariable } from "../store/state";
import { loadMetaTable, makeYAML } from "./MetaTablePanel";
import { Tooltip } from "primereact/tooltip";
import { appendSqlToTab, createTabResult, getCurrentParentTabState, getOrCreateParentTabState, getResultState } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { Connection } from "../state/connection";
import { Database, Schema, Table } from "../state/schema";
import _ from "lodash";
import { Header, Query } from "../state/query";
import TreeNode from "primereact/treenode";
import { withResizeDetector } from 'react-resize-detector';
import { State } from "@hookstate/core";

interface Props {
  width?: number;
  height?: number;
  targetRef: React.RefAttributes<HTMLElement>;
}

export const SchemaPanelComponent: React.FC<Props> = (props) => {
  const connection = useHS<Connection>(new Connection())
  const loading =  useHS(window.dbnet.state.schemaPanel.loading)
  const trigger = useVariable(0)
  const onSelectConnection = useVariable(0)


  ///////////////////////////  HOOKS  ///////////////////////////

   // eslint-disable-next-line
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
    let connName = window.dbnet.selectedConnection?.toLowerCase()
    if (!connName) {
      connName = localStorage.getItem("_connection_name")?.toLowerCase() || window.dbnet.connections[0].name
    } else if (!window.dbnet.connections.map(c => c.name.toLowerCase()).includes(connName)) {
      connName = window.dbnet.connections[0].name
    }
    // let conn = getConnectionState(connName)
    connection.set(new Connection(jsonClone(window.dbnet.getConnection(connName))))
  }, [trigger.get()]) // eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const loadConnection = async (name: string, refresh = false) => {
    if(!name) return
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

  ///////////////////////////  JSX  ///////////////////////////

  const Bar = () => { 
    return <div>
      <h4 style={{ textAlign: 'center', margin: '-0px' }}>
        {connection.name.get().toUpperCase()}
        {/* refresh */}
        <a href={window.location.hash} title="Refresh All">
          <i
            style={{ color: 'orange', fontSize: '0.9em', paddingLeft: '5px' }}
            className="pi pi-refresh"
            onClick={async () => {
              await loadConnection(connection.name.get(), true)
            }}
          />
        </a>
      </h4>
    </div>
  }

  return (
    <div id='schema-panel' className="p-grid p-fluid" style={{ textAlign: 'center' }}>
      {/* <FilterBox filter={schemaFilter} loading={loading} onClick={() => GetSchemas(connection.name.get())} /> */}
      <div className="p-col-12 p-md-12">
        <Bar />
      </div>
      <div className="p-col-12 p-md-12" style={{width:'100%'}}>
        <SchemaTree connection={connection} loading={loading} />
      </div>
    </div>
  );
};

export const SchemaPanel = withResizeDetector(SchemaPanelComponent);

const SchemaTree = (props: {connection: State<Connection>, loading: State<boolean>}) => {
  const connection = props.connection
  const cm = React.useRef<ContextMenu>(null);
  const tree = React.useRef<Tree>(null);
  const filter = useVariable("")
  const loading = useHS(props.loading)
  const leftPanelratio = window.dbnet.state.settingState.leftPaneRatio.get()
  // const childWidth = document.getElementById("left-pane")?.scrollWidth || 370
  const childHeight1 = (document.getElementById("left-pane")?.scrollHeight as number) * leftPanelratio[0] / 100
  const childWidth = document.getElementById("left-pane")?.scrollWidth
  const height = childHeight1? childHeight1 - 139 : ((document.body.scrollHeight / 2) - 60)
  const expandedKeys = useHS(window.dbnet.state.schemaPanel.expandedNodes)
  const selectedKeys = useHS(window.dbnet.state.schemaPanel.selectedNodes);
  const [selectedNodeKey, setSelectedNodeKey] = React.useState<any>('');
  const lastClick = useHS<{ ts: number, key: any }>({ ts: 0, key: '' });
  const isMounted = useIsMounted()

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
    let block = appendSqlToTab(tab.id.get(), sql)
    submitSQL(tab, sql, undefined, block)
  }

  const nodeTemplate = (node: TreeNode) => {
    let label = <></>
    let database_name = ''
    let schema_name = ''
    let isView = false
    let maxChars = parseInt(`${childWidth ? childWidth / 12 : 25}`)
    node.label = (node.label?.length || 0) < maxChars ? node.label : (node.label?.slice(0,maxChars) || '') + '...'
    if (node.data.type === 'table') {
      label = <span><i className="pi pi-table" style={{fontSize: '12px', paddingLeft: '5px', paddingRight: '5px'}}/> {node.label} </span>
      let table = node.data.data
      database_name = table.database
      schema_name = table.schema
      isView = node.data.data.isView
    } else if (node.data.type === 'schema') {
      label = <b><i className="pi pi-folder" style={{fontSize: '12px', paddingRight: '9px'}}/>{node.label}</b>
      let schema = node.data.data
      database_name = schema.database
      schema_name = schema.name
    } else {
      label = <b><i className="pi pi-database" style={{fontSize: '12px', paddingRight: '5px'}}/> {node.label}</b>
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
        <span style={{color: isView ? 'brown' : '', overflowX: "hidden" }}>
          {label}
        </span>
      </span>
    )
  }

  const onSelect = (e: TreeEventNodeParams) => {
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
          if(!isMounted.current) return
          if(lastClick.ts.get() > 300) loadMetaTable(table)
          lastClick.set({ ts: 0, key: '' })
        }, 320);
      }
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
              .map(t => `select '${t.fdqn()}' as table_name, count(*) cnt from ${t.fdqn()}`)
              .join(' UNION ALL\n') + ';'
            let tab = getOrCreateParentTabState(table.connection, table.database)
            let block = appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql, undefined, block)
          } else {
            let sql = `select '${table.fdqn()}' as table_name, count(*) cnt from ${table.fdqn()};`
            let tab = getOrCreateParentTabState(table.connection, table.database)
            let block = appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql, undefined, block)
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
          let block = appendSqlToTab(tab.id.get(), sql)
          submitSQL(tab, sql, undefined, block)
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
          let block = appendSqlToTab(tab.id.get(), sql)
          submitSQL(tab, sql, undefined, block)
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

          let headers : Header[] = ['database_name', 'schema_name', 'table_name', 'column_id', 'column_name', 'column_type'].map(v => { return {name: v, type: '', dbType: ''} })
          let rows: any[] = []
          for (let table of tables) {
            for (let column of table.columns) {
              rows.push([table.database, table.schema, table.name, column.id, column.name, column.type])
            }
          }
          rows = _.sortBy(rows, (r) => { return [r[0], r[1], r[2], zeroPad(r[3], 3)] })
          
          let resultTab = createTabResult(getCurrentParentTabState().get())
          let query = new Query({
            connection: resultTab.connection,
            database: resultTab.database,
            headers, rows, pulled: true
          })
          getResultState(resultTab.id).query.set(query)
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
      onSelect={e => onSelect(e)}
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
        height: `${height}px`,
        // height: `100%`,
        // overflowY: "scroll",
        fontSize: '0.8rem',
        padding: 0,
      }}
      // onFilterValueChange={(e: any) => { console.log(e) }}
    />
  </>
}