import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { OverlayPanel } from 'primereact/overlaypanel';
import * as React from "react";
import {
  accessStore, globalStore, useHS, useVariable
} from "../store/state";
import { State, useState, none } from "@hookstate/core";
import { MsgType } from "../store/websocket";
import { copyToClipboard, data_req_to_records, jsonClone, toastError } from "../utilities/methods";
import { ObjectAny } from "../utilities/interfaces";
import { appendSqlToTab, getOrCreateParentTabState } from "./TabNames";
import { submitSQL } from "./TabToolbar";
import { apiGet } from "../store/api";
import YAML from 'yaml'
import { Dropdown } from "primereact/dropdown";
import { Tooltip } from "primereact/tooltip";
import { Table } from "../state/schema";

export const makeYAML = (data: ObjectAny) => {
  return '/*@\n' + YAML.stringify(data).trim() + '\n@*/'
}

interface Props { }

const store = accessStore()

export const loadMetaTable = async (table: Table, refresh = false, fromHistory = false) => {
  // store.workspace.selectedMetaTab.set('Object')

  const objectPanel = store.objectPanel
  const history = objectPanel.history
  const historyI = objectPanel.historyI

  objectPanel.show.set(true)
  try {
    let data1 = {
      conn: table.connection,
      database: table.database,
      schema: table.schema,
      table: table.name,
      procedure: refresh ? 'refresh' : null,
    }
    objectPanel.loading.set(true);
    let resp = await apiGet(MsgType.GetColumns, data1)
    if (resp.error) throw new Error(resp.error)
    objectPanel.table.set(
      o => {
        o.columns = data_req_to_records(resp.data).map((r, i) => Object.assign(r, {
          id: i + 1,
          name: r?.column_name.toLowerCase(),
          type: r?.data_type.toLowerCase(),
        }))
        o.name = table.name
        o.schema = table.schema
        o.database = jsonClone(data1.database)
        o.connection = jsonClone(data1.conn)
        return o
      }
    )
    objectPanel.loading.set(false)

    // set history stack
    if (!fromHistory) {
      let table = jsonClone<Table>(new Table(objectPanel.table.get()))
      if (historyI.get() < history.length - 1) {
        let delObj: ObjectAny = {}
        for (let i = historyI.get() + 1; i < history.length; i++) {
          delObj[i] = none
        }
        history.merge(delObj) // https://hookstate.js.org/docs/nested-state#partial-updates-and-deletions-1
      }
      if (history[historyI.get()].get()?.name !== table.name) {
        history.merge([table])
        if (history.length > 15) history[0].set(none)
        historyI.set(history.length - 1)
      }
    }
  } catch (error) {
    toastError(error)
  }
  objectPanel.loading.set(false)
  // objectPanel.table.show.set(true)
  globalStore.saveSession()
}

const TableDropdown = (props: { value: State<string> }) => {
  const getAllTables = () => {
    return window.dbnet.currentConnection.getAllTables().map(
      (t) => {
        return {
          name: `${t.database}.${t.schema}.${t.name}`
        }
      }
    )
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
    style={{ fontSize: '10px' }}
  />
}
export const MetaTablePanel: React.FC<Props> = (props) => {

  class Form {
    name: string
    show: boolean
    validateFunc: (data: ObjectAny) => string
    data: ObjectAny

    constructor(name: string, validateFunc: (data: ObjectAny) => string = () => '') {
      this.name = name
      this.show = false
      this.validateFunc = validateFunc
      this.data = {}
    }

    validate = () => {
      return this.validateFunc(this.data)
    }

    // createJSX = () : JSX.Element => {
    //   const objectPanel = store.objectPanel
    //   const selectedColumns = store.objectPanel.table.selectedColumns  
    //   interface Input {
    //     schema: string
    //     table: string
    //     fields: string[]
    //     group_expr: string
    //   }

    //   const input = useHS<Input>({
    //     schema: objectPanel.table.schema.get(),
    //     table: objectPanel.table.name.get(),
    //     fields: selectedColumns.get().map(v => v.name),
    //     group_expr: '',
    //   } as Input)

    //   const submit = () => {
    //     // validate
    //     let error = this.validate()
    //     if(error) return toastError(error)
    //     this.submit(objectPanel.table.name.get(), input.get()) 
    //   }

    //   return <>
    //     <div className="p-grid p-fluid">
    //       <div className="p-col-12 p-md-12" >
    //         <InputText
    //           value={input.group_expr.get()}
    //           className="p-inputtext-sm"
    //           placeholder="concat(col1, col2)"
    //           type="text"
    //           onChange={(e:any) => { input.group_expr.set(e.target.value) }}
    //           onKeyUp={(e) => onEnterSubmit(e, submit)}
    //         /> 
    //       </div>
    //       <div className="p-col-12 p-md-12" >
    //         <Button
    //           label="Submit"
    //           onClick={(e) => submit()}
    //         />
    //       </div>
    //     </div>
    //   </>
    // }


    submit = async (tabName: string, input: ObjectAny, sql = '') => {
      if (!sql) {
        let data = {
          analysis: this.name,
          data: input,
        }
        sql = makeYAML(data) + ';'
      }
      let tab = getOrCreateParentTabState(table.get().connection, table.get().database)
      appendSqlToTab(tab.id.get(), sql)
      submitSQL(tab, sql)
      hideForms()
      hideOverlay()
    }
  }

  const height = window.innerHeight - 570 > 500 ? 500 : window.innerHeight - 570
  ///////////////////////////  HOOKS  ///////////////////////////
  const objectPanel = useState(store.objectPanel)
  const table = useState<Table>(new Table())
  const selectedColumns = useVariable<any[]>([])
  // const selectedColumns = useHS(store.objectPanel.selectedColumns)
  const filter = useHS(store.objectPanel.search);
  const op = React.useRef(null);
  const history = objectPanel.history
  const historyI = objectPanel.historyI
  const forms = useHS({
    countOverTime: new Form('distro_field_date_wide'),
    compareColumns: new Form('table_join_match'),
    statsByGroup: new Form('field_stat_group'),
  })

  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    // reset the selected columns
    selectedColumns.set([])
    filter.set('')
    table.set(new Table(jsonClone(objectPanel.table.get())))
  }, [objectPanel.table.name.get(), objectPanel.loading.get()])// eslint-disable-line

  // React.useEffect(() => {
  //   // reset the selected columns
  //   store.objectPanel.table.selectedColumns.set(jsonClone(selectedColumns.get()))
  // }, [selectedColumns.get()])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const hideForms = () => {
    for (let key of forms.keys) { forms[key].show.set(false) }
  }

  const getSelectedColsOrAll = () => {
    if (!Array.isArray(selectedColumns.get())) selectedColumns.set([])
    let cols = selectedColumns.get()?.map(v => v.name) || []
    if (cols.length === 0) {
      cols = objectPanel.table.columns.get()?.map(v => v.name) || []
    }
    return cols
  }

  const hideOverlay = () => (op.current as any).hide()

  const onEnterSubmit = (e: any, submit: () => void) => {
    if (e.key === 'Enter') submit()
  }

  ///////////////////////////  JSX  ///////////////////////////

  const CountOverTime = (props: { form: State<Form> }) => {
    const objectPanel = store.objectPanel
    interface Input {
      schema: string
      table: string
      cnt_fields_sql?: string
      date_field: string
      where_clause: string
    }

    const input = useHS<Input>({
      schema: objectPanel.table.schema.get(),
      table: objectPanel.table.name.get(),
      date_field: '',
      where_clause: 'where 1=1',
    } as Input)

    const submit = () => {
      // validate
      if (!input.date_field.get()?.trim()) return toastError('Need to input date field')
      input.set(i => {
        i.cnt_fields_sql = selectedColumns.get().map(v => v.name)
          .map(f => `count(${f}) as ${f}`).join(', ')
        return i
      })
      props.form.get().submit(objectPanel.table.name.get(), input.get())
    }

    return <>
      <div className="p-grid p-fluid">
        <div className="p-col-12 p-md-12" >
          <InputText
            value={input.date_field.get()}
            className="p-inputtext-sm"
            placeholder="my_date_col"
            type="text"
            onChange={(e: any) => { input.date_field.set(e.target.value) }}
            onKeyUp={(e) => onEnterSubmit(e, submit)}
          />
        </div>
        <div className="p-col-12 p-md-12" >
          <Button
            label="Submit"
            onClick={(e) => submit()}
          />
        </div>
      </div>
    </>
  }


  const StatsByGroup = (props: { form: State<Form> }) => {
    const objectPanel = store.objectPanel
    interface Input {
      schema: string
      table: string
      fields: string[]
      group_expr: string
    }

    const input = useHS<Input>({
      schema: objectPanel.table.schema.get(),
      table: objectPanel.table.name.get(),
      fields: selectedColumns.get().map(v => v.name),
      group_expr: '',
    } as Input)

    const submit = () => {
      // validate
      if (!input.group_expr.get()?.trim()) return toastError('Need to input group by expression')
      props.form.get().submit(objectPanel.table.name.get(), input.get())
      hideForms()
      hideOverlay()
    }

    return <>
      <div className="p-grid p-fluid">
        <div className="p-col-12 p-md-12" >
          <InputText
            value={input.group_expr.get()}
            className="p-inputtext-sm"
            placeholder="concat(col1, col2)"
            type="text"
            onChange={(e: any) => { input.group_expr.set(e.target.value) }}
            onKeyUp={(e) => onEnterSubmit(e, submit)}
          />
        </div>
        <div className="p-col-12 p-md-12" >
          <Button
            label="Submit"
            onClick={(e) => submit()}
          />
        </div>
      </div>
    </>
  }

  const CompareColumns = (props: { form: State<Form> }) => {
    const objectPanel = store.objectPanel
    interface Input {
      t1: string
      t1_field: string
      t1_filter: string
      t2: string
      t2_field: string
      t2_filter: string
      conds: string
    }

    const t1 = objectPanel.table.get()

    const input = useHS<Input>({
      t1: `${t1.database}.${t1.schema}.${t1.name}`,
      t1_field: selectedColumns.get().map(c => c.name).join(','),
      t1_filter: '1=1',
      t2: '',
      t2_field: '',
      t2_filter: '1=1',
      conds: ''
    } as Input)

    React.useEffect(() => {
      let error = ''
      if (!input.t1_field.get().trim()) error = 'Please select columns to compare'
      if (error) {
        props.form.show.set(false)
        return toastError(error)
      }
    }, []) // eslint-disable-line

    const submit = () => {
      // validate
      if (!input.t2.get()?.trim()) return toastError('Need to select a second table')
      if (!input.t2_field.get()?.trim()) return toastError('Need to input columns')
      if (input.t1_field.get()?.split(',').length !== input.t2_field.get().split(',').length)
        return toastError('Need to input columns')
      let cond_arr = []
      for (let i = 0; i < input.t1_field.get().split(',').length; i++) {
        const t1_field = input.t1_field.get().split(',')[i];
        const t2_field = input.t2_field.get().split(',')[i];
        cond_arr.push(`t1.${t1_field} = t2.${t2_field}`)
      }
      input.conds.set(cond_arr.join(' and '))
      props.form.get().submit(objectPanel.table.name.get(), input.get())
      hideForms()
      hideOverlay()
    }

    return <>
      <div className="p-grid p-fluid">
        <div className="p-col-12 p-md-12" >
          <TableDropdown value={input.t2} />
        </div>
        <div className="p-col-12 p-md-12" >
          <InputText
            value={input.t2_field.get()}
            className="p-inputtext-sm"
            placeholder="col1, col2"
            type="text"
            onChange={(e: any) => { input.t2_field.set(e.target.value) }}
            onKeyUp={(e) => onEnterSubmit(e, submit)}
          />
        </div>
        <div className="p-col-12 p-md-12" >
          <Button
            label="Submit"
            onClick={(e) => submit()}
          />
        </div>
      </div>
    </>
  }


  return (
    <div id='object-panel' className="p-grid p-fluid" style={{ textAlign: 'center' }}>
      <div className="p-col-12 p-md-12" style={{ fontSize: '13px', fontFamily: 'monospace', paddingBottom: '10px' }}>
        <span
          style={{ fontSize: '12px', backgroundColor: 'white', overflowX: 'hidden' }}
        // onDoubleClick={() => { copyToClipboard(objectPanel.table.name.get()) }}
        >
          <strong
            title={objectPanel.table.name.get()}
            style={{ fontSize: '15px' }}
          >Schema:
          </strong>
          <span
            title={objectPanel.table.name.get()}
            style={{ fontSize: '15px', paddingLeft: '5px' }}
          >
            {objectPanel.table.schema.get()?.toUpperCase()}
          </span>

          <br />

          <strong
            title={objectPanel.table.name.get()}
            style={{ fontSize: '15px' }}
          >
            Table:
          </strong>
          <span
            title={objectPanel.table.name.get()}
            style={{ fontSize: '15px', paddingLeft: '5px' }}
          >
            {objectPanel.table.name.get()?.toUpperCase()}
          </span>

          {/* <br /> */}

          <a // eslint-disable-line
            href="#"
            title="Copy name to clipboard"
            onClick={() => { copyToClipboard(table.get().fullName()) }}
          >
            <i className="pi pi-copy" style={{ 'fontSize': '0.9em', paddingLeft: '5px' }}></i>
          </a>
          <a  // eslint-disable-line
            href="#"
            title="Search history of this object"
            onClick={() => {
              store.historyPanel.filter.set(objectPanel.table.name.get())
              window.dbnet.state.workspace.selectedMetaTab.set('History')
            }}
          >
            <span style={{ 'fontSize': '1.2em', paddingLeft: '5px' }}>H</span>
          </a>
        </span>
      </div>

      <div className="p-col-12 p-md-12 p-inputgroup work-buttons" style={{ overflowX: 'hidden' }}>
        <Tooltip
          target={`#history-panel-back`}
          style={{
            fontSize: '11px',
            minWidth: '220px',
            fontFamily: 'monospace',
          }}
        >
          {
            history.get()?.filter((h, i) => i < historyI.get() && i > historyI.get() - 5).reverse().map(h => {
              return <>
                <span>{new Table(h).fullName().toUpperCase()}</span>
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
            loadMetaTable(table, false, true)
          }}
        />


        <Tooltip
          target={`#history-panel-forward`}
          style={{
            fontSize: '11px',
            minWidth: '220px',
            fontFamily: 'monospace',
          }}
        >
          {
            history.get().filter((h, i) => i > historyI.get()).slice(0, 5).map(h => {
              return <>
                <span>{new Table(h).fullName().toUpperCase()}</span>
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
            loadMetaTable(table, false, true)
          }}
        />
        <Button
          icon="pi pi-refresh"
          tooltip="Refresh"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            loadMetaTable(table.get(), true)
          }}
        />


        <InputText
          id="object-column-filter"
          value={filter.get()}
          onChange={(e) => filter.set((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { filter.set('') } }}
          placeholder="Filter columns..."
        />

        <Button
          icon="pi pi-ellipsis-v"
          tooltip="Power Up"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-warning"
          onClick={(e) => (op.current as any).toggle(e)}
        />
      </div>

      <div id="analysis-buttons" className="p-col-12 p-md-12  p-inputgroup work-buttons" style={{ paddingTop: '3px', paddingBottom: '3px' }}>
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
            let sql = `select ${cols.join(', ')} from ${table.get().fullName()} limit 5000;`
            let tab = getOrCreateParentTabState(table.get().connection, table.get().database)
            appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql)
          }}
        />
        <Button
          icon="pi pi-circle-off"
          tooltip="Count Rows"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-secondary"
          onClick={(e) => {
            let colsCnt = (selectedColumns.get()?.map(v => v.name) || [])
              .map(c => `count(${c}) cnt_${c}`)
            let colsCntStr = colsCnt.length > 0 ? `, ${colsCnt.join(',  ')}` : ''
            let sql = `select count(1) cnt${colsCntStr} from ${table.get().fullName()};`
            let tab = getOrCreateParentTabState(table.get().connection, table.get().database)
            appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql)
          }}
        />

        <Button
          icon="pi pi-sort-amount-down"
          tooltip="Column Distro"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-info"
          onClick={(e) => {
            let cols = selectedColumns.get()?.map(v => v.name) || []
            if (cols.length === 0) return toastError('need to select columns')
            let colsDistStr = cols.length > 0 ? `${cols.join(',\n  ')}` : ''
            let sql = `select\n  ${colsDistStr},\n  count(1) cnt\nfrom ${table.get().fullName()}\ngroup by ${colsDistStr}\norder by count(1) desc;`
            let tab = getOrCreateParentTabState(table.get().connection, table.get().database)
            appendSqlToTab(tab.id.get(), sql)
            submitSQL(tab, sql)
            hideOverlay()
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
                schema: objectPanel.table.schema.get(),
                table: objectPanel.table.name.get(),
                fields: selectedColumns.get()?.map(v => v.name) || [],
              },
            }
            let sql = makeYAML(data) + ';'
            let tab = getOrCreateParentTabState(table.get().connection, table.get().database)
            appendSqlToTab(tab.id.get(), sql)
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
                schema: objectPanel.table.schema.get(),
                table: objectPanel.table.name.get(),
                fields: selectedColumns.get()?.map(v => v.name) || [],
              },
            }
            let sql = makeYAML(data) + ';'
            let tab = getOrCreateParentTabState(table.get().connection, table.get().database)
            appendSqlToTab(tab.id.get(), sql)
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
            if (selectedColumns.get().length !== 1) {
              return toastError('select only one field')
            }
            let data = {
              analysis: 'distro_field_date',
              data: {
                schema: objectPanel.table.schema.get(),
                table: objectPanel.table.name.get(),
                field: selectedColumns.get().map(v => v.name)[0],
              },
            }
            let sql = makeYAML(data) + ';'
            let tab = getOrCreateParentTabState(table.get().connection, table.get().database)
            appendSqlToTab(tab.id.get(), sql)
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
        style={{ height: `${height}px` }}
      // onMouseEnter={() => toastInfo('hello')}  
      >

        <DataTable
          value={jsonClone<Table>(table.get()).columns?.filter(r => r !== undefined) || []}
          loading={objectPanel.loading.get()}
          rowHover={true}
          scrollable={true}
          scrollHeight={`${height - 20}px`}
          resizableColumns={true}
          className="p-datatable-sm p-datatable-gridlines"
          style={{ fontSize: '10px' }}
          selectionMode="checkbox"
          selection={selectedColumns.get()}
          onSelectionChange={e => {
            if(Array.isArray(e.value) && e.value.length === 0) selectedColumns.set([])
            else selectedColumns.set(e.value)
          }}
          dataKey="name"
          globalFilter={filter.get()}
        // onFilter={(e: DataTableFilterParams) => {console.log(e.filters)}}
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3em' }} bodyStyle={{ width: '3em', fontSize: '0.5em' }}></Column>
          <Column field="id" header="#" headerStyle={{ width: '3em', textAlign: 'center' }} bodyStyle={{ width: '3em', textAlign: "center" }} />
          <Column field="name" header="Name" />
          <Column field="data_type" header="Type" />
          {/* <Column field="length" header="Length"/> */}
        </DataTable>
      </div>

      <OverlayPanel
        id="overlay_panel"
        ref={op}
        showCloseIcon
        style={{ maxWidth: '350px' }}
        onHide={() => { hideForms() }}>

        <Button
          icon="pi pi-chart-bar"
          tooltip="Counts over time"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-help"
          onClick={(e) => { hideForms(); forms.countOverTime.show.set(true) }}
        />

        <Button
          icon="pi pi-chart-bar"
          tooltip="Stats by group"
          tooltipOptions={{ position: 'top' }}
          className="p-button-sm p-button-rounded p-button-success"
          onClick={(e) => { hideForms(); forms.statsByGroup.show.set(true) }}
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
        {forms.statsByGroup.show.get() ? <StatsByGroup form={forms.statsByGroup} /> : null}

      </OverlayPanel>
    </div>
  )
};
