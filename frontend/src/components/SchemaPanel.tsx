import * as React from "react";
import { Tree } from 'primereact/tree';
import { data_req_to_records, jsonClone, toastError, toastInfo } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { ObjectAny } from "../utilities/interfaces";
import { ListBox } from 'primereact/listbox';
import { accessStore, globalStore, Schema, setSchemas, Table, useHS, useStoreApp, useStoreConnection, useStoreSchemaPanel, useVariable } from "../store/state";
import { MsgType } from "../store/websocket";
import { loadMetaTable } from "./MetaTablePanel";
import { State } from "@hookstate/core";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { apiGet } from "../store/api";
import { Tooltip } from "primereact/tooltip";
import TreeNode from "primereact/components/treenode/TreeNode";
import { createTab } from "./TabNames";
import { submitSQL } from "./TabToolbar";

interface Props { }

const store = accessStore()

export const GetSchemata = async () => {


  globalStore.schemaPanel.loading.set(true)
  try {
    let data = await apiGet(MsgType.GetSchemata, { conn: store.connection.name.get() })
    if (data.error) throw new Error(data.error)
    globalStore.schemaPanel.loading.set(false)
    let rows = data_req_to_records(data)
    let schemas: { [key: string]: Schema; } = {}
    for (let row of rows) {
      row.schema_name = row.schema_name.toLowerCase()
      if (!(row.schema_name in schemas)) {
        schemas[row.schema_name] = { name: row.schema_name, tables: [] }
      }
      schemas[row.schema_name].tables.push({
        schema: row.schema_name,
        name: row.table_name.toLowerCase(),
      })
    }
    setSchemas(store.connection, Object.values(schemas))
  } catch (error) {
    toastError(error)
  }
  globalStore.schemaPanel.loading.set(false)
}

export const SchemaPanel: React.FC<Props> = (props) => {
  const cm = React.useRef<ContextMenu>(null);
  const schemaPanel = useStoreSchemaPanel()
  const connection = useStoreConnection()
  const schemas = useHS(connection.schemas)
  const loading = schemaPanel.loading


  ///////////////////////////  HOOKS  ///////////////////////////

  ///////////////////////////  EFFECTS  ///////////////////////////


  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const GetSchemas = async (connName: string) => {
    loading.set(true)
    try {
      let data2 = await apiGet(MsgType.GetSchemas, { conn: connName })
      if (data2.error) throw new Error(data2.error)
      let rows = data_req_to_records(data2)
      let schemas_: Schema[] = rows.map(r => { return { name: r.schema_name.toLowerCase(), tables: [] } })
      for (let shema of schemas_) {
        let index = schemas.get().map(s => s.name.toLowerCase()).indexOf(shema.name.toLowerCase())
        if (index > -1) {
          schemas_[index].tables = jsonClone(schemas.get()[index].tables || [])
        }
      }
      setSchemas(connection, schemas_)
    } catch (error) {
      toastError(error)
    }
    loading.set(false)
  }


  const GetTables = async (connName: string, schemaName: string) => {
    loading.set(true)
    schemaName = schemaName.toLowerCase()
    try {
      let data1 = {
        conn: connName,
        schema: schemaName,
      }
      let data2 = await apiGet(MsgType.GetTables, data1)
      if (data2.error) throw new Error(data2.error)
      let rows = data_req_to_records(data2)
      let tables: Table[] = rows.map(r => { return { schema: schemaName, name: r.name.toLowerCase() } })
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
      let tooltip = ''
      if(node.data.type === 'table') {
        label = <> {node.label} </>
        let table = node.data.data
        schema_name = table.schema
        tooltip = `${table.schema}.${table.name}`
      } else {
        label = <b>{node.label}</b>
        let schema = node.data.data
        tooltip = `${schema.name}`
        let schema_name = schema.name
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
            <span>Table: {node.data.data.name}</span>
            </>
            :
            null
          }
        </Tooltip>
          {label}
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

          GetTables(connection.name.get(), arr[0])
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
        label: 'Analyze Table',
        icon: 'pi pi-chart-bar',
        command: () => {
          let keys = Object.keys(selectedKeys.get())
          if(keys.length !== 1) return toastError("Must choose only one object")
          let schema_table = keys[0]
          if(schema_table.split('.').length !== 2) {return}

          let data = {
            name: 'field_stat',
            data: {
              schema: schema_table.split('.')[0],
              table: schema_table.split('.')[1],
              fields: [],
            },
          }
          let sql = `/* @${JSON.stringify(data)} */ ;`
          let tab = createTab(schema_table, sql)
          submitSQL(tab, sql)
        }
      },
      {
        label: 'Toggle',
        icon: 'pi pi-cog',
        command: () => {
          let _expandedKeys: ObjectAny = { ...expandedKeys };
          if (_expandedKeys[selectedNodeKey])
            delete _expandedKeys[selectedNodeKey];
          else
            _expandedKeys[selectedNodeKey] = true;

            expandedKeys.set(_expandedKeys);
        }
      }
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
            let ts = (new Date).getTime()
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
        onSelectionChange={e => {
          selectedKeys.set(e.value)
        }}
        contextMenuSelectionKey={selectedNodeKey}
        onContextMenuSelectionChange={event => setSelectedNodeKey(event.value)}
        onContextMenu={event => cm.current?.show(event.originalEvent as any)}
        nodeTemplate={nodeTemplate}
        contentStyle={{
          height: `${window.innerHeight - 200}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
      />
    </>
  }

  const FilterBox = (props: { filter: State<string>, loading: State<boolean>, onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined }) => {
    return (
      <div className="p-col-12" style={{ paddingBottom: '10px' }}>
        <div className="p-inputgroup">
          <InputText
            id="schema-filter"
            placeholder="Filters..."
            value={props.filter.get()}
            onChange={(e: any) => { props.filter.set(e.target.value) }}
            onKeyDown={(e: any) => { if (e.key === 'Escape') { props.filter.set('') } }}
          />
          <Button icon={props.loading.get() ? "pi pi-spin pi-spinner" : "pi pi-refresh"} className="p-button-warning" onClick={props.onClick} />
        </div>
      </div>
    )
  }

  return (
    <div id='history-panel'>

      <h4 style={{ textAlign: 'center', margin: '9px' }}>
        Schemas 
        <a href="#;">
          <i 
            style={{color: 'orange', fontSize: '0.9em', paddingLeft: '5px'}}
            className="pi pi-refresh"
            onClick={() => GetSchemas(connection.name.get())}
          />
        </a>
      </h4>
      {/* <FilterBox filter={schemaFilter} loading={loading} onClick={() => GetSchemas(connection.name.get())} /> */}
      <SchemaTree />
    </div>
  );
};