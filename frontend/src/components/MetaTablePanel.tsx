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
import { copyToClipboard, data_req_to_records, jsonClone, LogError, split_schema_table, toastError } from "../utilities/methods";
import { ObjectAny, ObjectString } from "../utilities/interfaces";
import { createTab } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { apiGet } from "../store/api";
import YAML from 'yaml'
import { Dropdown } from "primereact/dropdown";
import { Tooltip } from "primereact/tooltip";

export const makeYAML = (data: ObjectAny) => {
  return '/*@\n' + YAML.stringify(data).trim() + '\n@*/'
}

interface Props {}

const store = accessStore()

export const loadMetaTable = async (tableName: string, database='', refresh=false, fromHistory=false) => {
  store.app.selectedMetaTab.set('Object')

  const objectPanel = store.objectPanel
  const history = objectPanel.history
  const historyI = objectPanel.historyI

  tableName = tableName.replaceAll('"', '')
  let {schema, table} = split_schema_table(tableName)
  try {
    let data1 = {
      conn: store.connection.name.get(),
      database: database || store.connection.database.get(),
      schema,
      table,
      procedure: refresh ? 'refresh' : null,
    }
    objectPanel.table.loading.set(true);
    let resp = await apiGet(MsgType.GetColumns, data1)
    if(resp.error) throw new Error(resp.error)
    objectPanel.table.set(
      o => {
        o.rows = data_req_to_records(resp.data).map((r, i) => Object.assign(r, {
          id: i+1,
          schema_name: r?.schema_name.toLowerCase(),
          table_name: r?.table_name.toLowerCase(),
          column_name: r?.column_name.toLowerCase(),
          data_type: r?.data_type.toLowerCase(),
        }))
        o.name = tableName
        o.database = jsonClone(data1.database)
        o.loading = false
        return new MetaTable(o)
      }
    )
    
    // set history stack
    if(!fromHistory) {
      let table = jsonClone<MetaTable>(objectPanel.table.get())
      if (historyI.get() < history.length-1) {
        let delObj : ObjectAny = {}
        for (let i = historyI.get()+1; i < history.length; i++) {
          delObj[i] = none
        }
        history.merge(delObj) // https://hookstate.js.org/docs/nested-state#partial-updates-and-deletions-1
      }
      history.merge([table])
      if(history.length > 15) history[0].set(none)
      historyI.set(history.length-1)
    }
  } catch (error) {
    toastError(error)
  }
  objectPanel.table.loading.set(false)
  // objectPanel.table.show.set(true)
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
    database: store.connection.database.get(),
    schema: objectView.schema(),
    table: objectView.table(),
    procedure: analysis,
    data: params,
  }

  try {
    let resp = await apiGet(MsgType.GetAnalysisSql, data1)
    if(resp.error) throw new Error(resp.error)
    let sql = resp.data.sql
    let tab = createTab(objectView.name, resp.data.sql)
    submitSQL(tab, sql)
  } catch (error) {
    toastError(error)
  }
}

class Form {
  name: string
  show: boolean
  data: ObjectAny
  
  constructor(name: string) {
    this.name = name
    this.show = false
    this.data = {}
  }


  submit = async (tabName: string, input: ObjectAny) => {
    let data = {
      analysis: this.name,
      data: input,
    }
    let sql = makeYAML(data) + ';'
    let tab = createTab(tabName, sql)
    submitSQL(tab, sql)
  }
}

const TableDropdown = (props: { value: State<string> }) => {
  const schemas = store.connection.schemas
  
  const getAllTables = () => {
    let all : ObjectString[] = []
    try {
      for (let schema of schemas.get()) {
        if (!schema.tables || !Array.isArray(schema.tables)) { continue }
        for (let table of schema.tables) {
          all.push({"name": `${table.schema}.${table.name}`})
        }
      }
    } catch (error) {
      LogError(error)
    }
    return all
  }

  return <Dropdown 
    value={props.value.get()}
    options={getAllTables()}
    onChange={(e) => { props.value.set(e.value.name) }}
    filter showClear filterMatchMode={"contains"}
    filterBy="name"
    optionLabel="name"
    placeholder="Select a Table"
    editable={true}
    style={{fontSize: '10px'}}
  />
}

const CountOverTime = (props: { form: State<Form> }) => {
  const objectPanel = store.objectPanel
  interface Input { // eslint-disable-line
    connection: string
    database: string
    table1: {
      name: string
      column: string
    }
    table2: {
      name: string
      column: string
    }
  }

  const submit = () => { // eslint-disable-line
    let data = {
      analysis: 'distro_field_date_wide',
      data: {
        schema: objectPanel.table.get().schema(),
        table: objectPanel.table.get().table(),
        // fields: selected.get().map(v => v.column_name),
        // date_field: date_field.get()
      },
    }
    let sql = makeYAML(data) + ';'
    let tab = createTab(objectPanel.table.name.get(), sql)
    submitSQL(tab, sql)
  }

  return <>
    <div className="p-grid p-fluid">
      <div className="p-col-12 p-md-12" >

      </div>
    </div>
  </>
}

const CompareColumns = (props: { form: State<Form> }) => {
  const objectPanel = store.objectPanel
  const selectedColumns = store.objectPanel.table.selectedColumns  
  interface Input {
    t1: string
    t1_field: string
    t1_filter: string
    t2: string
    t2_field: string
    t2_filter: string
    conds: string
  }

  const input = useHS<Input>({
    t1: objectPanel.table.name.get(),
    t1_field: selectedColumns.get().map(c => c.column_name).join(','),
    t1_filter: '1=1',
    t2: '',
    t2_field: '',
    t2_filter: '1=1',
    conds: ''
  } as Input)

  React.useEffect(() => {
    let error = ''
    if(!input.t1_field.get().trim()) error = 'Please select columns to compare'
    if(error) {
      props.form.show.set(false)
      return toastError(error)
    }
  }, []) // eslint-disable-line

  return <>
    <div className="p-grid p-fluid">
      <div className="p-col-12 p-md-12" >
        <TableDropdown value={input.t2}/>
      </div>
      <div className="p-col-12 p-md-12" >
        <InputText
          value={input.t2_field.get()}
          className="p-inputtext-sm"
          placeholder="col1, col2"
          type="text"
          onChange={(e:any) => { input.t2_field.set(e.target.value) }}
        /> 
      </div>
      <div className="p-col-12 p-md-12" >
        <Button
          label="Submit"
          onClick={(e) => { 
            // validate
            if(!input.t2.get()?.trim()) return toastError('Need to select a second table')
            if(!input.t2_field.get()?.trim()) return toastError('Need to input columns')
            if(input.t1_field.get()?.split(',').length !== input.t2_field.get().split(',').length)
              return toastError('Need to input columns')
            let cond_arr = []
            for (let i = 0; i < input.t1_field.get().split(',').length; i++) {
              const t1_field = input.t1_field.get().split(',')[i];
              const t2_field = input.t2_field.get().split(',')[i];
              cond_arr.push(`t1.${t1_field} = t2.${t2_field}`)
            }
            input.conds.set(cond_arr.join(' and '))
            props.form.get().submit(objectPanel.table.name.get(), input.get()) 
            props.form.show.set(false)
          }}
        />
      </div>
    </div>
  </>
}

export const MetaTablePanel: React.FC<Props> = (props) => {

  
  ///////////////////////////  HOOKS  ///////////////////////////
  const objectPanel = useState(store.objectPanel)
  const selectedColumns = useVariable<any[]>([])
  const filter = useVariable('');
  const op = React.useRef(null);
  const history = objectPanel.history
  const historyI = objectPanel.historyI
  const forms = useHS({
    countOverTime: new Form('count_over_time'),
    compareColumns: new Form('table_join_match'),
  })
  
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    // reset the selected columns
    selectedColumns.set([])
  }, [objectPanel.table.name.get()])// eslint-disable-line

  React.useEffect(() => {
    // reset the selected columns
    store.objectPanel.table.selectedColumns.set(jsonClone(selectedColumns.get()))
  }, [selectedColumns.get()])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const hideForms = () => {
    for(let key of forms.keys) { forms[key].show.set(false) }
  }

  const getSelectedColsOrAll = () => {
    let cols = selectedColumns.get().map(v => v.column_name)
    if(cols.length === 0) {
      cols = objectPanel.table.get().rows.map(v => v.column_name)
    }
    return cols
  }

  const hideOverlay = () => (op.current as any).hide()

  ///////////////////////////  JSX  ///////////////////////////

  return (
    <div id='object-panel' className="p-grid p-fluid" style={{textAlign:'center'}}>
      <div className="p-col-12 p-md-12">
        <span
          style={{fontFamily: 'monospace', fontSize: '13px', backgroundColor: 'white', color:'blue'}}
          onDoubleClick={() => { copyToClipboard(objectPanel.table.name.get()) }}
        >
          <strong>{objectPanel.table.name.get()}</strong>
          <a href="#;" onClick={() => {copyToClipboard(objectPanel.table.name.get())}}>
            <i className="pi pi-copy" style={{'fontSize': '0.9em', paddingLeft:'5px'}}></i>
          </a>
          <a 
            href="#;"
            onClick={() => { 
              store.historyPanel.filter.set(objectPanel.table.name.get())
              store.app.selectedMetaTab.set('History')
            }}
          >
            <span style={{'fontSize': '1.2em', paddingLeft:'5px'}}>H</span>
          </a>
        </span>
      </div>

      <div className="p-col-12 p-md-12 p-inputgroup work-buttons" style={{overflowX:'hidden'}}>
        <Tooltip
          target={`#history-panel-back`} 
          style={{
            fontSize: '11px',
            minWidth: '250px',
            fontFamily:'monospace',
          }}
        >
          {
            history.get()?.filter((h, i) => i < historyI.get() && i > historyI.get() - 5 ).reverse().map(h => {
              return <>
              <span>{h.name}</span>
              <br />
              </>
            })
          }
        </Tooltip>
        <Button
          id='history-panel-back'
          icon="pi pi-caret-left"
          disabled={!(history.length > 1 && historyI.get() > 0)}
          tooltipOptions={{ position: 'right' }}
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            historyI.set(i => i - 1)
            let table = history[historyI.get()].get()
            loadMetaTable(table.name, table.database, false, true)
          }} 
        />


        <Tooltip
          target={`#history-panel-forward`} 
          style={{
            fontSize: '11px',
            minWidth: '250px',
            fontFamily:'monospace',
          }}
        >
          {
            history.get().filter((h, i) => i > historyI.get() ).slice(0, 5).map(h => {
              return <>
              <span>{h.name}</span>
              <br />
              </>
            })
          }
        </Tooltip>
        <Button
          id='history-panel-forward'
          icon="pi pi-caret-right"
          disabled={!(history.length > 1 && historyI.get() < history.length - 1)}
          tooltipOptions={{ position: 'right' }}
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            historyI.set(i => i + 1)
            let table = history[historyI.get()].get()
            loadMetaTable(table.name, table.database, false, true)
          }} 
        />
        <Button
          icon="pi pi-refresh"
          tooltip="Refresh"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            loadMetaTable(objectPanel.table.name.get(), objectPanel.table.database.get(), true)
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

      <div id="analysis-buttons" className="p-col-12 p-md-12  p-inputgroup work-buttons" style={{paddingTop:'3px', paddingBottom:'3px'}}>
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
            let cols = selectedColumns.get().length === 0 ? ['*'] : getSelectedColsOrAll()
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
            let colsCnt = selectedColumns.get().map(v => v.column_name)
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
                table: objectPanel.table.get().table(),
                fields: selectedColumns.get().map(v => v.column_name),
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
                table: objectPanel.table.get().table(),
                fields: selectedColumns.get().map(v => v.column_name),
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
            let cols = selectedColumns.get().map(v => v.column_name)
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
            if(selectedColumns.get().length !== 1) {
              return toastError('select only one field')
            }
            let data = {
              analysis: 'distro_field_date',
              data: {
                schema: objectPanel.table.get().schema(),
                table: objectPanel.table.get().table(),
                field: selectedColumns.get().map(v => v.column_name)[0],
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

      <div
        className="p-col-12 p-md-12"
        style={{height: `${window.innerHeight - 240}px`}}
        // onMouseEnter={() => toastInfo('hello')}  
      >

        <DataTable
          value={objectPanel.table.get().rows.filter(r => r !== undefined)}
          loading={objectPanel.table.loading.get()}
          rowHover={true}
          scrollable={true}
          scrollHeight={`${window.innerHeight - 280}px`}
          resizableColumns={true}
          className="p-datatable-sm p-datatable-gridlines"
          style={{fontSize:'10px'}}
          selection={selectedColumns.get()}
          onSelectionChange={e => selectedColumns.set(e.value)} 
          dataKey="column_name"
          globalFilter={filter.get()}
        >
          <Column selectionMode="multiple" headerStyle={{width: '3em'}} bodyStyle={{width: '3em'}}></Column>
          <Column field="id" header="#" headerStyle={{width: '3em', textAlign: 'center'}} bodyStyle={{width: '3em', textAlign:"center"}}/>
          <Column field="column_name" header="Name"/>
          <Column field="data_type" header="Type"/>
          {/* <Column field="length" header="Length"/> */}
        </DataTable>
      </div>

      <OverlayPanel
        id="overlay_panel"
        ref={op}
        showCloseIcon
        style={{maxWidth: '350px'}}
        onHide={() => {  hideForms() }}>

        <Button
          icon="pi pi-chart-bar"
          tooltip="Counts over time"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-help"
          onClick={(e) => { hideForms(); forms.countOverTime.show.set(true) }}
        />

        <Button
          icon="pi pi-check-circle"
          tooltip="Compare Columns"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-help"
          onClick={(e) => { hideForms(); forms.compareColumns.show.set(true) }}
        />

        {forms.countOverTime.show.get() ? <CountOverTime form={forms.countOverTime} /> : null}
        {forms.compareColumns.show.get() ? <CompareColumns form={forms.compareColumns} /> : null}

      </OverlayPanel>
    </div>
  )
};
