import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { AutoComplete } from 'primereact/autocomplete';
import * as React from "react";
import { MetaTable, store, useHookState, useVariable } from "../store/state";
import _ from "lodash";
import { State } from "@hookstate/core";
import { Message, MsgType, sendWsMsg } from "../store/websocket";
import { copyToClipboard, data_req_to_records, jsonClone, split_schema_table, toastError, toastInfo } from "../utilities/methods";
import { ObjectAny } from "../utilities/interfaces";
import { createTab } from "./TabNames";
import { submitSQL } from "./TabToolbar";

interface Props {
  objectView: State<MetaTable>
}

export const loadMetaTable = (tableName: string) => {
  let objectView = store().session.objectView
  let {schema, table} = split_schema_table(tableName)
  let data = {
    conn: store().session.conn.name.get(),
    schema,
    table,
    callback: (msg: Message) => {
      if(msg.error) { 
        toastError(msg.error)
        return objectView.loading.set(false)
      }
      objectView.set(
        o => {
          o.rows = data_req_to_records(msg.data).map((r, i) => Object.assign(r, {id: i+1}))
          o.name = tableName
          o.loading = false
          return o
        }
      )
    }
  }
  sendWsMsg(new Message(MsgType.GetColumns, data))
  objectView.loading.set(true);
}


const Search = (props : { search : State<string>}) => {
  const search = useHookState(props.search)
  const searchResults = useHookState<string[]>([])
  const tables = useHookState(['schema1.table2', 'schema2.table2', 'schema3.table2', 'housing.landwatch2'])

  const doSearch = (e: any) => {
    let query = e.query.trim() as string
    if (!query.length) {
      return []
    }

    let results : string[] = []
    for (let table of tables.get()) {
      if(table.toLowerCase().includes(query.toLowerCase())) {
        results.push(table)
      }
    }

    searchResults.set(results)
  }

  return (
    <span className="p-input-icon-left">
      <i className="pi pi-search" />
      {/* <InputText
        value={search.get()}
        onChange={(e) => {
          let newVal = (e.target as HTMLInputElement).value
          search.set(newVal)
        }}
        placeholder="Search table..."
        onKeyDown={(e) => { if(e.key === 'Escape') { search.set('') } }}
      /> */}
      <AutoComplete
        placeholder="Search table..."
        value={search.get()}
        suggestions={searchResults.get()}
        completeMethod={(e) => doSearch(e)}
        onChange={(e) => { search.set(e.value)}}
        onSelect={(e) => { loadMetaTable(e.value); search.set('')}}
        // onKeyUp={(e: any) => { if((e as React.KeyboardEvent).key === 'Escape') { search.set('') } }}
        autoFocus={true}
      />
    </span>
  )
}

export const MetaTablePanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const objectView = props.objectView
  const selected = useVariable<any[]>([])

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////

  // const setFilter = _.debounce(
  //   (filter: State<string>, newVal: string) => filter.set(newVal), 400
  // )

  const getSelectedColsOrAll = () => {
    let cols = selected.get().map(v => v.column_name)
    if(cols.length === 0) {
      cols = objectView.get().rows.map(v => v.column_name)
    }
    return cols
  }

  ///////////////////////////  JSX  ///////////////////////////

  return (
    <>
      <Search search={props.objectView.search}/>
      {/* <h3>{ objectView.name.get() }</h3>  */}
      <div className="p-inputgroup">
        <span
          className="p-inputgroup-addon"
          style={{fontFamily: 'monospace', fontSize: '16px', backgroundColor: 'white', color:'blue'}}
          onDoubleClick={() => { copyToClipboard(objectView.name.get()) }}
        >
          <strong>{objectView.name.get()}</strong>
        </span>
        <Button
          icon="pi pi-copy"
          tooltip="Copy fields names"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            let cols = getSelectedColsOrAll()
            copyToClipboard(cols.join('\n'))
          }}
        />
        <Button
          icon="pi pi-eye"
          tooltip="Select fields"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            let cols = getSelectedColsOrAll()
            let sql = `select\n  ${cols.join(',\n  ')}\nfrom ${objectView.name.get()}\n;`
            let tab = createTab(store().session, objectView.name.get(), sql)
            submitSQL(tab, sql)
          }}
        />
        <Button
          icon="pi pi-circle-off"
          tooltip="Count Rows"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm"
          onClick={(e) => {
            let colsCnt = selected.get().map(v => v.column_name)
                .map(c => `count(${c}) cnt_${c}`)
            let colsCntStr = colsCnt.length > 0 ? `,\n  ${colsCnt.join(',\n  ')}` : ''
            let sql = `select\n  count(*) cnt${colsCntStr}\nfrom ${objectView.name.get()}\n;`
            let tab = createTab(store().session, objectView.name.get(), sql)
            submitSQL(tab, sql)
          }}
        />
        <Button
          icon="pi pi-trash"
          tooltip="Drop Table"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-danger"
          onClick={(e) => {
            let sql = `drop table ${objectView.name.get()}\n;`
            let tab = createTab(store().session, objectView.name.get(), sql)
          }}
        />
      </div>
      <DataTable
        value={objectView.get().rows}
        loading={objectView.loading.get()}
        rowHover={true}
        scrollable={true}
        scrollHeight="500px"
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize:'12px'}}
        selection={selected.get()}
        onSelectionChange={e => selected.set(e.value)} 
        dataKey="column_name"
      >
        <Column selectionMode="multiple" headerStyle={{width: '3em'}}></Column>
        <Column field="id" header="#" headerStyle={{width: '3em', textAlign: 'center'}} bodyStyle={{textAlign:"center"}}/>
        <Column field="column_name" header="Name"/>
        <Column field="data_type" header="Type"/>
        {/* <Column field="length" header="Length"/> */}
      </DataTable>
    </>
  )
};