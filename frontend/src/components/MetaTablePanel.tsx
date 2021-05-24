import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { AutoComplete } from 'primereact/autocomplete';
import { OverlayPanel } from 'primereact/overlaypanel';
import * as React from "react";
import { accessStore, globalStore, MetaTable, useHS, useVariable } from "../store/state";
import { State, useState, none } from "@hookstate/core";
import { MsgType } from "../store/websocket";
import { copyToClipboard, data_req_to_records, split_schema_table, toastError } from "../utilities/methods";
import { ObjectAny } from "../utilities/interfaces";
import { createTab } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { apiGet } from "../store/api";
import YAML from 'yaml'

export const makeYAML = (data: ObjectAny) => {
  return '/*@\n' + YAML.stringify(data).trim() + '\n@*/'
}

interface Props {}

const store = accessStore()

export const loadMetaTable = async (tableName: string, refresh=false, fromHistory=false) => {
  store.app.selectedMetaTab.set('Object')

  const objectPanel = store.objectPanel
  const history = objectPanel.history
  const historyI = objectPanel.historyI

  tableName = tableName.replaceAll('"', '')
  let {schema, table} = split_schema_table(tableName)
  try {
    let data1 = {
      conn: store.connection.name.get(),
      schema,
      table,
      procedure: refresh ? 'refresh' : null,
    }
    objectPanel.table.loading.set(true);
    let data2 = await apiGet(MsgType.GetColumns, data1)
    if(data2.error) throw new Error(data2.error)
    objectPanel.table.set(
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
    
    // set history stack
    if(!fromHistory) {
      if (historyI.get() < history.length-1) {
        let delObj : ObjectAny = {}
        for (let i = historyI.get()+1; i < history.length; i++) {
          delObj[i] = none
        }
        history.merge(delObj) // https://hookstate.js.org/docs/nested-state#partial-updates-and-deletions-1
      }
      history.merge([tableName])
      if(history.length > 30) history[0].set(none)
      historyI.set(history.length-1)
    }
  } catch (error) {
    toastError(error)
  }
  objectPanel.table.loading.set(false)
  globalStore.saveSession()
}


const Search = (props : { search : State<string>}) => {// eslint-disable-line
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

  try {
    let data2 = await apiGet(MsgType.GetAnalysisSql, data1)
    if(data2.error) throw new Error(data2.error)
    let sql = data2.sql
    let tab = createTab(objectView.name, data2.sql)
    submitSQL(tab, sql)
  } catch (error) {
    toastError(error)
  }
}

export const MetaTablePanel: React.FC<Props> = (props) => {

  
  ///////////////////////////  HOOKS  ///////////////////////////
  const objectPanel = useState(accessStore().objectPanel)
  const selected = useVariable<any[]>([])
  const filter = useVariable('');
  const op = React.useRef(null);
  const history = objectPanel.history
  const historyI = objectPanel.historyI
  const showForms = useHS({
    CountOverTime: false
  })

  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    // reset the selected columns
    selected.set([])
  }, [objectPanel.table.name.get()])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////


  const getSelectedColsOrAll = () => {
    let cols = selected.get().map(v => v.column_name)
    if(cols.length === 0) {
      cols = objectPanel.table.get().rows.map(v => v.column_name)
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
          onDoubleClick={() => { copyToClipboard(objectPanel.table.name.get()) }}
        >
          <strong>{objectPanel.table.name.get()}</strong>
          <a href="#;" onClick={() => {copyToClipboard(objectPanel.table.name.get())}}>
            <i className="pi pi-copy" style={{'fontSize': '0.9em'}}></i>
          </a>
        </span>
      </p>

      <div className="p-inputgroup work-buttons" >
        <Button
          icon="pi pi-caret-left"
          disabled={!(history.length > 1 && historyI.get() > 0)}
          tooltipOptions={{ position: 'right' }}
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            historyI.set(i => i - 1)
            loadMetaTable(history[historyI.get()].get(), false, true)
          }} 
        />
        <Button
          icon="pi pi-caret-right"
          disabled={!(history.length > 1 && historyI.get() < history.length - 1)}
          tooltipOptions={{ position: 'right' }}
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            historyI.set(i => i + 1)
            loadMetaTable(history[historyI.get()].get(), false, true)
          }} 
        />
        <Button
          icon="pi pi-refresh"
          tooltip="Refresh"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            loadMetaTable(objectPanel.table.name.get(), true)
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

      <div id="analysis-buttons" className="p-inputgroup work-buttons" style={{paddingTop:'3px', paddingBottom:'3px'}}>
        <Button
          icon="pi pi-copy"
          tooltip="Copy fields names"
          tooltipOptions={{ position: 'right' }}
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
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            let cols = getSelectedColsOrAll()
            let sql = `select\n  ${cols.join(',\n  ')}\nfrom ${objectPanel.table.name.get()}\nlimit 5000;`
            let tab = createTab(objectPanel.table.name.get(), sql)
            submitSQL(tab, sql)
          }}
        />
        <Button
          icon="pi pi-circle-off"
          tooltip="Count Rows"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            let colsCnt = selected.get().map(v => v.column_name)
                .map(c => `count(${c}) cnt_${c}`)
            let colsCntStr = colsCnt.length > 0 ? `,\n  ${colsCnt.join(',\n  ')}` : ''
            let sql = `select\n  count(1) cnt${colsCntStr}\nfrom ${objectPanel.table.name.get()}\n;`
            let tab = createTab(objectPanel.table.name.get(), sql)
            submitSQL(tab, sql)
          }}
        />

        <Button
          icon="pi pi-chart-bar"
          tooltip="Column Stats"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-warning"
          onClick={(e) => {
            let data = {
              analysis: 'field_stat',
              data: {
                schema: objectPanel.table.get().schema(),
                table: objectPanel.table.name.get(),
                fields: selected.get().map(v => v.column_name),
              },
            }
            let sql = makeYAML(data) + ';'
            let tab = createTab(objectPanel.table.name.get(), sql)
            submitSQL(tab, sql)
          }}
        />

        <Button
          icon="pi pi-chart-bar"
          tooltip="Column Stats (Deep)"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-warning"
          onClick={(e) => {
            let data = {
              analysis: 'field_stat_deep',
              data: {
                schema: objectPanel.table.get().schema(),
                table: objectPanel.table.name.get(),
                fields: selected.get().map(v => v.column_name),
              },
            }
            let sql = makeYAML(data) + ';'
            let tab = createTab(objectPanel.table.name.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
          }}
        />

        <Button
          icon="pi pi-sort-amount-down"
          tooltip="Column Distro"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            let cols = selected.get().map(v => v.column_name)
            if(cols.length === 0 ) return toastError('need to select columns')
            let colsDistStr = cols.length > 0 ? `${cols.join(',\n  ')}` : ''
            let sql = `select\n  ${colsDistStr},\n  count(1) cnt\nfrom ${objectPanel.table.name.get()}\ngroup by ${colsDistStr}\norder by count(1) desc\n;`
            let tab = createTab(objectPanel.table.name.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
          }}
        />

        <Button
          icon="pi pi-chart-line"
          tooltip="Date Distro"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            if(selected.get().length !== 1) {
              return toastError('select only one field')
            }
            let data = {
              analysis: 'distro_field_date',
              data: {
                schema: objectPanel.table.get().schema(),
                table: objectPanel.table.get().table(),
                field: selected.get().map(v => v.column_name)[0],
              },
            }
            let sql = makeYAML(data) + ';'
            let tab = createTab(objectPanel.table.name.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
          }}
        />



        <Button icon="pi pi-bell" className="p-button-warning" />
        <Button
          icon="pi pi-trash"
          className="p-button-danger"
          tooltip="Copy Drop Table SQL"
          tooltipOptions={{ position: 'top' }}
          onClick={(e) => {
            let sql = `drop table ${objectPanel.table.name.get()}\n;`
            copyToClipboard(sql)
            hideOverlay()
          }}
        />
      </div>

      <div>
      </div>

      <DataTable
        value={objectPanel.table.get().rows}
        loading={objectPanel.table.loading.get()}
        rowHover={true}
        scrollable={true}
        scrollHeight={`${window.innerHeight - 270}px`}
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

      <OverlayPanel ref={op} showCloseIcon id="overlay_panel" style={{width: '150px'}} onHide={() => { showForms.CountOverTime.set(false)}}>

        <Button
          icon="pi pi-chart-bar"
          tooltip="Counts over time"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-help"
          onClick={(e) => {showForms.CountOverTime.set(true)}}
        />
        
        {showForms.CountOverTime.get() ? <FormCountOverTime/> : null}
        

      </OverlayPanel>
    </>
  )
};

const FormCountOverTime = () => {

  const objectPanel = accessStore().objectPanel

  const submit = () => { // eslint-disable-line
    let data = {
      analysis: 'distro_field_date_wide',
      data: {
        schema: objectPanel.table.get().schema(),
        table: objectPanel.table.name.get(),
        // fields: selected.get().map(v => v.column_name),
        // date_field: date_field.get()
      },
    }
    let sql = makeYAML(data) + ';'
    let tab = createTab(objectPanel.table.name.get(), sql)
    submitSQL(tab, sql)
  }

  return (
    <p>Seelect date field</p>
  )
}