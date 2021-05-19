import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { AutoComplete } from 'primereact/autocomplete';
import { OverlayPanel } from 'primereact/overlaypanel';
import * as React from "react";
import { accessStore, MetaTable, useHS, useVariable } from "../store/state";
import _ from "lodash";
import { State, useState } from "@hookstate/core";
import { MsgType } from "../store/websocket";
import { copyToClipboard, data_req_to_records, jsonClone, split_schema_table, toastError, toastInfo } from "../utilities/methods";
import { ObjectAny } from "../utilities/interfaces";
import { createTab } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { apiGet } from "../store/api";

interface Props {}

export const loadMetaTable = async (tableName: string) => {
  let store = accessStore()
  let objectView = store.objectPanel.table
  let {schema, table} = split_schema_table(tableName)
  try {
    let data1 = {
      conn: store.connection.name.get(),
      schema,
      table,
    }
    objectView.loading.set(true);
    let data2 = await apiGet(MsgType.GetColumns, data1)
    objectView.set(
      o => {
        o.rows = data_req_to_records(data2).map((r, i) => Object.assign(r, {
          id: i+1,
          schema_name: r?.schema_name.toLowerCase(),
          table_name: r?.table_name.toLowerCase(),
          column_name: r?.column_name.toLowerCase(),
          data_type: r?.data_type.toLowerCase(),
        }))
        o.name = tableName
        o.loading = false
        return new MetaTable(o)
      }
    )
  } catch (error) {
    toastError(error)
  }
  objectView.loading.set(false)
}


const Search = (props : { search : State<string>}) => {
  const search = useHS(props.search)
  const searchResults = useHS<string[]>([])
  const tables = useHS(['schema1.table2', 'schema2.table2', 'schema3.table2', 'housing.landwatch2'])

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

export const submitAnalysisSQL = async (analysis: string, params: ObjectAny, objectView: MetaTable) => {
  const connection = accessStore().connection
  let data1 = {
    conn: connection.name.get(),
    schema: objectView.schema(),
    table: objectView.table(),
    procedure: analysis,
    data: params,
  }

  let data2 = await apiGet(MsgType.GetAnalysisSql, data1)
  let sql = data2.sql
  let tab = createTab(objectView.name, data2.sql)
  submitSQL(tab, sql)
}

export const MetaTablePanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const objectView = useState(accessStore().objectPanel.table)
  const selected = useVariable<any[]>([])
  const filter = useVariable('');
  const op = React.useRef(null);

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

  const hideOverlay = () => (op.current as any).hide()

  ///////////////////////////  JSX  ///////////////////////////

  return (
    <>
      {/* <Search search={props.objectView.search}/> */}
      {/* <h3>{ objectView.name.get() }</h3>  */}
      <p>
        <span
          style={{fontFamily: 'monospace', fontSize: '13px', backgroundColor: 'white', color:'blue'}}
          onDoubleClick={() => { copyToClipboard(objectView.name.get()) }}
        >
          <strong>{objectView.name.get()}</strong>
          <a onClick={(e) => {copyToClipboard(objectView.name.get())}}>
            <i className="pi pi-copy" style={{'fontSize': '0.9em'}}></i>
          </a>
        </span>
      </p>

      <div className="p-inputgroup work-buttons" >
        <Button
          icon="pi pi-refresh"
          tooltip="Refresh"
          tooltipOptions={{ position: 'right' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            loadMetaTable(objectView.name.get())
          }} 
        />

        <Button
          icon="pi pi-copy"
          tooltip="Copy fields names"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            let cols = getSelectedColsOrAll()
            copyToClipboard(cols.join('\n'))
          }}
        />
        <Button
          icon="pi pi-eye"
          tooltip="Select fields"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-help"
          onClick={(e) => {
            let cols = getSelectedColsOrAll()
            let sql = `select\n  ${cols.join(',\n  ')}\nfrom ${objectView.name.get()}\nlimit 5000;`
            let tab = createTab(objectView.name.get(), sql)
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
            let sql = `select\n  count(1) cnt${colsCntStr}\nfrom ${objectView.name.get()}\n;`
            let tab = createTab(objectView.name.get(), sql)
            submitSQL(tab, sql)
          }}
        />

        <InputText
          id="object-column-filter"
          value={filter.get()}
          onChange={(e) => filter.set((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if(e.key === 'Escape') { filter.set('') } }}
          placeholder="Filter columns..."
        />
        

        <Button
          icon="pi pi-ellipsis-v"
          tooltip="Power Up"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-warning"
          onClick={(e) => (op.current as any).toggle(e) }
        />
      </div>

      <div>
      </div>

      <DataTable
        value={objectView.get().rows}
        loading={objectView.loading.get()}
        rowHover={true}
        scrollable={true}
        scrollHeight="500px"
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize:'10px'}}
        selection={selected.get()}
        onSelectionChange={e => selected.set(e.value)} 
        dataKey="column_name"
        globalFilter={filter.get()}
      >
        <Column selectionMode="multiple" headerStyle={{width: '3em'}}></Column>
        <Column field="id" header="#" headerStyle={{width: '3em', textAlign: 'center'}} bodyStyle={{textAlign:"center"}}/>
        <Column field="column_name" header="Name"/>
        <Column field="data_type" header="Type"/>
        {/* <Column field="length" header="Length"/> */}
      </DataTable>

      <OverlayPanel ref={op} showCloseIcon id="overlay_panel" style={{width: '150px'}}>

        <Button
          icon="pi pi-chart-bar"
          tooltip="Column Stats"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-help"
          onClick={(e) => {
            let data = {
              name: 'field_stat',
              data: {
                schema: objectView.get().schema(),
                table: objectView.name.get(),
                fields: selected.get().map(v => v.column_name),
              },
            }
            let sql = `/* @${JSON.stringify(data)} */ ;`
            let tab = createTab(objectView.name.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
          }}
        />

        <Button
          icon="pi pi-sort-amount-down"
          tooltip="Column Distro"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-secondary"
          onClick={(e) => {
            let cols = selected.get().map(v => v.column_name)
            if(cols.length === 0 ) return toastError('need to select columns')
            let colsDistStr = cols.length > 0 ? `${cols.join(',\n  ')}` : ''
            let sql = `select\n  ${colsDistStr},\n  count(1) cnt\nfrom ${objectView.name.get()}\ngroup by ${colsDistStr}\norder by count(1) desc\n;`
            let tab = createTab(objectView.name.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
          }}
        />

        <Button
          icon="pi pi-sort-amount-up"
          tooltip="Date Distro"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-info"
          onClick={(e) => {
            if(selected.get().length !== 1) {
              return toastError('select only one field')
            }
            let data = {
              name: 'distro_field_date',
              data: {
                schema: objectView.get().schema(),
                table: objectView.get().table(),
                field: selected.get().map(v => v.column_name)[0],
              },
            }
            let sql = `/* @${JSON.stringify(data)} */ ;`
            let tab = createTab(objectView.name.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
          }}
        />


        <Button
          icon="pi pi-chart-bar"
          tooltip="Column Stats (Deep)"
          tooltipOptions={{ position: 'left' }}
          className="p-button-sm p-button-rounded p-button-warning"
          onClick={(e) => {
            let data = {
              name: 'field_stat_deep',
              data: {
                schema: objectView.get().schema(),
                table: objectView.name.get(),
                fields: selected.get().map(v => v.column_name),
              },
            }
            let sql = `/* @${JSON.stringify(data)} */ ;`
            let tab = createTab(objectView.name.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
          }}
        />

        <Button icon="pi pi-bell" className="p-button-rounded p-button-warning" />
        <Button
          icon="pi pi-trash"
          className="p-button-rounded p-button-danger"
          tooltip="Copy Drop Table"
          tooltipOptions={{ position: 'right' }}
          onClick={(e) => {
            let sql = `drop table ${objectView.name.get()}\n;`
            copyToClipboard(sql)
            hideOverlay()
          }}
        />
      </OverlayPanel>
    </>
  )
};