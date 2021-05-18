import * as React from "react";
import { Tree } from 'primereact/tree';
import { data_req_to_records, jsonClone, toastError, toastInfo } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { ObjectAny } from "../utilities/interfaces";
import { ListBox } from 'primereact/listbox';
import { Schema, Table, useHS, useStoreApp, useStoreConnection, useStoreSchemaPanel, useVariable } from "../store/state";
import { MsgType } from "../store/websocket";
import { loadMetaTable } from "./MetaTablePanel";
import { State, useState } from "@hookstate/core";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { apiGet } from "../store/api";

interface Props {}

export const SchemaPanel: React.FC<Props> = (props) => {
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = React.useState({});
  const [selectedNodeKey, setSelectedNodeKey] = React.useState<string>('');
  const cm = React.useRef<ContextMenu>(null);
  const schemaPanel = useStoreSchemaPanel()
  const connection = useStoreConnection()
  const selectedMetaTab = useStoreApp().selectedMetaTab
  const schemas = useHS(connection.schemas)
  // const selectedSchema = useStore().selectedSchema
  const selectedSchema = useHS(schemaPanel.selectedSchema)
  // const selectedSchema = useSelectedSchema()
  const selectedSchemaTables = useHS(schemaPanel.selectedSchemaTables)
  const localSelectedSchema = useVariable<Schema>({} as Schema)
  const schemaOptions = useHS<Schema[]>([])
  const selectedTables = useVariable<Table[]>([])
  const tableOptions = useHS<Table[]>([])
  const loading = schemaPanel.loading
  const schemaFilter = useHS('')
  const tableFilter = useHS('')

  const menu = [
      {
          label: 'View Key',
          icon: 'pi pi-search',
          command: () => {
              toastInfo('Node Key', selectedNodeKey)
          }
      },
      {
          label: 'Toggle',
          icon: 'pi pi-cog',
          command: () => {
              let _expandedKeys : ObjectAny = {...expandedKeys};
              if (_expandedKeys[selectedNodeKey])
                  delete _expandedKeys[selectedNodeKey];
              else
                  _expandedKeys[selectedNodeKey] = true;

              setExpandedKeys(_expandedKeys);
          }
      }
  ];

  ///////////////////////////  HOOKS  ///////////////////////////

  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    setNodes([
      {"key":"0","label":"Documents","data":"Documents Folder","icon":"pi pi-fw pi-inbox","children": [{"key": "0-0","label": "Work","data": "Work Folder","icon": "pi pi-fw pi-cog","children": [{ "key": "0-0-0", "label": "Expenses.doc", "icon": "pi pi-fw pi-file", "data": "Expenses Document" }, { "key": "0-0-1", "label": "Resume.doc", "icon": "pi pi-fw pi-file", "data": "Resume Document" }]},{"key": "0-1","label": "Home","data": "Home Folder","icon": "pi pi-fw pi-home","children": [{ "key": "0-1-0", "label": "Invoices.txt", "icon": "pi pi-fw pi-file", "data": "Invoices for this month" }]}]},
      {"key":"1","label":"Events","data":"Events Folder","icon":"pi pi-fw pi-calendar","children": [{ "key": "1-0", "label": "Meeting", "icon": "pi pi-fw pi-calendar-plus", "data": "Meeting" },{ "key": "1-1", "label": "Product Launch", "icon": "pi pi-fw pi-calendar-plus", "data": "Product Launch" },{ "key": "1-2", "label": "Report Review", "icon": "pi pi-fw pi-calendar-plus", "data": "Report Review" }]},
      {"key":"2","label":"Movies","data":"Movies Folder","icon":"pi pi-fw pi-star","children": [{"key": "2-0","icon": "pi pi-fw pi-star","label": "Al Pacino","data": "Pacino Movies","children": [{ "key": "2-0-0", "label": "Scarface", "icon": "pi pi-fw pi-video", "data": "Scarface Movie" }, { "key": "2-0-1", "label": "Serpico", "icon": "pi pi-fw pi-video", "data": "Serpico Movie" }]},{"key": "2-1","label": "Robert De Niro","icon": "pi pi-fw pi-star","data": "De Niro Movies","children": [{ "key": "2-1-0", "label": "Goodfellas", "icon": "pi pi-fw pi-video", "data": "Goodfellas Movie" }, { "key": "2-1-1", "label": "Untouchables", "icon": "pi pi-fw pi-video", "data": "Untouchables Movie" }]}]}
  ])
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(()=>{
    let schemaName = localSelectedSchema.get().name
    let index = schemas.get().map(s => s.name).indexOf(schemaName)
    if(index > -1) {
      let schema = jsonClone<Schema>(schemas.get()[index])
      if(schema.tables && schema.tables.length > 0) {
        tableOptions.set(schema.tables)
      }
    }
  },[localSelectedSchema.get()])

  React.useEffect(()=>{
    // init load

    // load schemaOptions
    if(Object.keys(schemas.get()).length > 0) {
      schemaOptions.set(Object.values(schemas.get()))
      console.log(document.getElementById("schema-list"))
    }

    if(selectedSchema.get() && Object.keys(schemas.get()).length > 0) {
      console.log(jsonClone<Schema>(selectedSchema.get()))
      localSelectedSchema.set(jsonClone<Schema>(selectedSchema.get()))
      // FocusNode(document.getElementById("schema-list")?.children[0]?.children[0]?.children, `${selectedSchema.get()?.name}`)
    }

    let st = selectedSchemaTables.get()
    if(st && st.length > 0) {
      selectedTables.set(jsonClone<Table[]>(selectedSchemaTables.get()))
    }
  },[])
  
  React.useEffect(()=>{
    schemaOptions.set(Object.values(schemas.get()))
    
    // let schemaName = selectedSchema.get().name
    // let schema = schemas.get()[schemaName]
    // if(schema) {
    //   let tables = schema.tables
    //   if(tables) { tableOptions.set(Object.values(tables)) }
    // }
  },[schemas.get()])
  

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const GetSchemas = async (connName: string) => {
    loading.set(true)
    try {
      let data2 = await apiGet(MsgType.GetSchemas, { conn: connName })
      if(data2.error) throw new Error(data2.error)
      let rows = data_req_to_records(data2)
      let schemas_ : Schema[] = rows.map(r => { return {name: r.schema_name, tables: []}})
      for(let shema of schemas_) {
        let index = schemas.get().map(s => s.name).indexOf(shema.name)
        if (index > -1) {
          schemas_[index].tables = jsonClone(schemas.get()[index].tables || {})
        }
      }
      schemas.set(schemas_)
      connection.schemas.set(schemas_)
    } catch (error) {
      toastError(error)
    }
    loading.set(false)
  }


  const GetTables = async (connName: string, schemaName: string) => {
    loading.set(true)
    try {
      let data1 = {
        conn: connName,
        schema: schemaName,
      }
      let data2 = await apiGet(MsgType.GetTables, data1)
      if(data2.error) throw new Error(data2.error)
      let rows = data_req_to_records(data2)
      let tables : Table[] = rows.map(r => { return {schema: schemaName, name: r.name}})
      let index = schemas.get().map(s => s.name).indexOf(schemaName)
      if(index > -1) {
        schemas[index].set(
          s => {
            s.tables = tables
            return s
          }
        )
        tableOptions.set(tables)
      }
    } catch (error) {
      toastError(error)
    }
    loading.set(false)
  }

  const FocusNode = (nodes: HTMLCollection | undefined, text: string ) => {
    if(!nodes) return
    for(let node of nodes) {
      if(node.textContent === text) {
        return
      }
    }
  }

  ///////////////////////////  JSX  ///////////////////////////

  const tableItemTemplate = (table: Table) => {
    return (
      <div
        onClick={(e) => { 
          // loadMetaTable(`${table.schema}.${table.name}`) 
          // selectedMetaTab.set('Object')
          // preview.name.set(`${table.schema}.${table.name}`)
          // preview.show.set(true)
        }}
        onDoubleClick={(e) => { 
          console.log(`${table.schema}.${table.name}`)
          loadMetaTable(`${table.schema}.${table.name}`) 
          selectedMetaTab.set('Object')
        }}
      >
        {table.name}
      </div>
    )
  }

  const SchemaList = (props : { options: State<Schema[]> }) => {
    const options = useHS(props.options)
    return (
      <ListBox
        id="schema-list"
        value={localSelectedSchema.get()}
        options={ options.get() }
        onChange={(e) => {
          if(!e.value) { return }
          localSelectedSchema.set(e.value)
          selectedSchema.set(jsonClone<Schema>(e.value))
          // GetTables(connection.name.get(), e.value.name)
        }}
        optionLabel="name"
        // itemTemplate={countryTemplate}
        style={{width: '100%', maxHeight: '400px'}}
        listStyle={{minHeight:'150px', maxHeight: '150px', fontSize: '12px'}}
      />
    )
  }

  const TableList = (props : { options: State<Table[]> }) => {
    const options = useHS(props.options)
    return (
      <ListBox
        multiple
        id="schema-table-list"
        value={selectedTables.get()}
        options={ options.get() }
        onChange={(e) => {
          if(!e.value) { return }
          selectedTables.set(e.value)
          selectedSchemaTables.set(jsonClone<Table[]>(e.value))
        }}
        metaKeySelection={true}
        optionLabel="name"
        itemTemplate={tableItemTemplate}
        style={{width: '100%', maxHeight: '400px'}}
        listStyle={{minHeight:'150px', maxHeight: '150px', fontSize: '12px'}}
      />
    )
  }

  const FilterBox = (props: { filter: State<string>, loading: State<boolean>, onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined }) => {
    return (
      <div className="p-col-12" style={{paddingBottom:'10px'}}>
        <div className="p-inputgroup">
          <InputText
            id="schema-filter"
            placeholder="Filters..."
            value={props.filter.get()}
            onChange={(e:any) => { props.filter.set(e.target.value) }}
            onKeyDown={(e: any) =>{ if(e.key === 'Escape') { props.filter.set('') }}}
          />
          <Button icon={props.loading.get() ?"pi pi-spin pi-spinner": "pi pi-refresh"} className="p-button-warning" tooltip="refresh" onClick={props.onClick}/>
        </div>
      </div>
    )
  }

  return (
    <div id='history-panel'>
      <ContextMenu model={menu} ref={cm} onHide={() => setSelectedNodeKey('')}/>
      {/* <Tree
        value={nodes}
        expandedKeys={expandedKeys}
        onToggle={e => setExpandedKeys(e.value)}
        contextMenuSelectionKey={selectedNodeKey} 
        onContextMenuSelectionChange={event => setSelectedNodeKey(event.value)}
        onContextMenu={event => cm.current?.show(event.originalEvent as any)}
        contentStyle={{
          height: `${Math.floor(window.innerHeight/2)}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
      /> */}

      <h4 style={{textAlign:'center', margin: '9px'}}>Schemas</h4>
      <FilterBox filter={schemaFilter} loading={loading} onClick={() => GetSchemas(connection.name.get())}/>
      <SchemaList options={schemaOptions}/>

      <h4 style={{textAlign:'center', margin: '9px'}}>Tables</h4>
      <FilterBox filter={tableFilter} loading={loading} onClick={() => GetTables(connection.name.get(), localSelectedSchema.get().name)}/>
      <TableList options={tableOptions}/>

    </div>
  );
};