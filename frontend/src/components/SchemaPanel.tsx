import * as React from "react";
import { Tree } from 'primereact/tree';
import { data_req_to_records, jsonClone, toastError, toastInfo } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { ObjectAny } from "../utilities/interfaces";
import { ListBox } from 'primereact/listbox';
import { Schema, store, Table, useHookState, useVariable } from "../store/state";
import { Message, MsgType, sendWsMsg } from "../store/websocket";
import { loadMetaTable } from "./MetaTablePanel";

interface Props {}

interface Ref {
  current: any
}


export const SchemaPanel: React.FC<Props> = (props) => {
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = React.useState({});
  const [selectedNodeKey, setSelectedNodeKey] = React.useState<string>('');
  const cm = React.useRef<ContextMenu>(null);
  const session = store().session
  const schemas = useHookState(session.conn.schemas)
  const selectedSchema = useVariable<Schema>({} as Schema)
  const schemaOptions = useHookState<Schema[]>([])
  const selectedTables = useVariable<Table[]>([])
  const tableOptions = useHookState<Table[]>([])
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
    let schemasMap = session.conn.schemas.get()
    let schemaName = selectedSchema.get().name
    if(schemaName in schemasMap) {
      let schema =  schemasMap[schemaName]
      if(schema.tables) {
        tableOptions.set(Object.values(schema.tables))
      } 
      GetTables(session.conn.name.get(), selectedSchema.get().name) // refresh anyways
    }
    session.selectedSchema.set(jsonClone<Schema>(selectedSchema.get()))
  },[selectedSchema.get()])
  
  React.useEffect(()=>{
    // init load
    if(session.selectedSchema.get()) {
      selectedSchema.set(jsonClone<Schema>(session.selectedSchema.get()))
    }
    // if(session.selectedSchemaTables) {
    //   selectedTables.set(jsonClone<Table[]>(session.selectedSchemaTables.get()))
    // }

    // load schemaOptions
    if(Object.keys(schemas.get()).length > 0) {
      schemaOptions.set(Object.values(schemas.get()))
    }
    GetSchemas(session.conn.name.get())
  },[])

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const GetSchemas = (connName: string) => {
    let data = {
      conn: connName,
      callback: (msg: Message) => {
        if(msg.error) { return toastError(msg.error) }
        let rows = data_req_to_records(msg.data)
        let schemas : { [key: string]: Schema; } = {}
        rows.map(r => schemas[r.schema_name] = {name: r.schema_name})
        session.conn.schemas.set(schemas)
        schemaOptions.set(Object.values(schemas))
      }
    }
    sendWsMsg(new Message(MsgType.GetSchemas, data))
  }


  const GetTables = (connName: string, schemaName: string) => {
    let data = {
      conn: connName,
      schema: schemaName,
      callback: (msg: Message) => {
        if(msg.error) { 
          toastError(msg.error)
          return 
        }
        let rows = data_req_to_records(msg.data)
        let tables : { [key: string]: Table; } = {}
        rows.map(r => tables[r.name] = {schema: schemaName, name: r.name})
        session.conn.schemas[schemaName].tables.set(tables)
        tableOptions.set(Object.values(tables))
      }
    }
    sendWsMsg(new Message(MsgType.GetTables, data))
  }

  ///////////////////////////  JSX  ///////////////////////////

  const tableItemTemplate = (table: Table) => {
    return (
      <div
        onDoubleClick={(e) => { 
          loadMetaTable(`${table.schema}.${table.name}`) 
          session.selectedMetaTab.set('Object')
        }}
      >
        {table.name}
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
      <h4 style={{textAlign:'center'}}>Schemas</h4>
      <ListBox
        filter
        value={selectedSchema.get()}
        options={ schemaOptions.get() }
        onChange={(e) => selectedSchema.set(e.value)}
        optionLabel="name"
        // itemTemplate={countryTemplate}
        style={{width: '100%', maxHeight: '200px'}}
        listStyle={{minHeight:'150px', maxHeight: '150px'}}
      />
      <h4 style={{textAlign:'center'}}>Tables</h4>
      <ListBox
        multiple
        filter
        value={selectedTables.get()}
        options={ tableOptions.get() }
        onChange={(e) => selectedTables.set(e.value)}
        metaKeySelection={true}
        optionLabel="name"
        itemTemplate={tableItemTemplate}
        style={{width: '100%', maxHeight: '200px'}}
        listStyle={{minHeight:'150px', maxHeight: '150px'}}
      />
    </div>
  );
};