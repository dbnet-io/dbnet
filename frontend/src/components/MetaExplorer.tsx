import { Dialog } from "primereact/dialog";
import * as React from "react";
import { useHS, useVariable } from "../store/state";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import _ from "lodash";
import { data_req_to_records, filterAndMatched, jsonClone, parseFilterString, relative_duration, setFilter, toastInfo, toastSuccess } from "../utilities/methods";
import { SelectButton } from 'primereact/selectbutton';
import { Dropdown } from 'primereact/dropdown';
import { ObjectAny } from "../utilities/interfaces";
import { MetaViewType } from "../state/state";
import { Column as Column2 } from "../state/schema";
import { QueryRequest } from "../state/query";
import { none } from '@hookstate/core'
import { OverlayPanel } from 'primereact/overlaypanel';

interface Props { }

interface MetaSchemaRecord { 
  index: number;
  key: string;
  database: string;
  schema: string;
  tables_cnt: number;
  tables_analyzed: number;
  style: MetaStyle;
}

interface MetaTableRecord { 
  index: number;
  key: string;
  database: string;
  schema: string;
  table: string;
  last_analyzed: string;
  recs_cnt: number;
  cols_cnt: number;
  unique_cols: number;
  cols_analyzed: number;
  style: MetaStyle;
}

interface MetaColumnRecord { 
  index: number;
  key: string;
  database: string;
  schema: string;
  table: string;
  column: string;
  type: string;
  last_analyzed: string;
  recs_cnt: number;
  nulls_cnt: number;
  distincts_cnt: number;
  dups_cnt: number;
  style: MetaStyle;
}

interface MetaStyle { 
  background?: number;
}

type MetaRecord = MetaSchemaRecord | MetaTableRecord | MetaColumnRecord;

function instanceOfMetaSchemaRecord(object: any): object is MetaSchemaRecord {
  return !('table' in object);
}
function instanceOfMetaTableRecord(object: any): object is MetaTableRecord {
  return ('table' in object) && !('column' in object);
}
function instanceOfMetaColumnRecord(object: any): object is MetaColumnRecord {
  return ('table' in object) && ('column' in object);
}

const viewOptions : MetaViewType[] = ['Schemas', 'Tables', 'Columns'];

export const MetaExplorer: React.FC<Props> = (props) => {
  const metaPanel = window.dbnet.state.metaPanel
  const height = 600
  
  ///////////////////////////  HOOKS  ///////////////////////////

  const show = useHS(metaPanel.show)
  const localFilter = useHS(metaPanel.filter.get() ? jsonClone<string>(metaPanel.filter.get()) : '')
  const metaRecords = useHS<MetaRecord[]>([])
  const sampleRecords = useHS<ObjectAny[]>([])
  const sampleColumnName = useHS('')
  const viewSelection = useHS(metaPanel.selectedView)
  const onSelectConnection = useVariable(0)
  const onRefreshSchemaPanel = useVariable(0)
  const loadingState = useHS<ObjectAny>({})
  const sampleOp = React.useRef<OverlayPanel>(null);

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => { applyFilter() }, [metaPanel.filter.get()]) // eslint-disable-line

  React.useEffect(() => {
    let id1 = window.dbnet.subscribe('onSelectConnection', onSelectConnection)
    let id2 = window.dbnet.subscribe('refreshSchemaPanel', onRefreshSchemaPanel)
    return () => { window.dbnet.unsubscribe(id1); window.dbnet.unsubscribe(id2) }
  }, [])

  React.useEffect(() => { refreshData() }, [onSelectConnection.get(), onRefreshSchemaPanel.get()])

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const applyFilter = () => { 
    let filter = metaPanel.filter.get()
    refreshData(filter)
  }

  const refreshData = (filter='') => { 
    let conn = window.dbnet.getConnection(window.dbnet.selectedConnection)
    let data: MetaRecord[] = [];
    
    // comma is OR, space is AND
    let filterOrs : string[][]= []
    if (filter !== '') {
      for (let filterOr of filter.split(',')) { 
        let filterAnds = filterOr.split(' ')
        filterOrs.push(filterAnds)
      }
    }

    const filterMatch = (obj: MetaRecord): boolean => {
      // remove style to not query -> https://stackoverflow.com/a/53443378
      let row = Object.values((({ style, ...o }) => o)(obj))
      return filterAndMatched(row, parseFilterString(filter))
    }

    if (viewSelection.get() == 'Schemas') {
      for (let schema of conn.getAllSchemas()) {
        let rec: MetaSchemaRecord = {
          index: data.length,
          key: '',
          database: schema.database,
          schema: schema.name,
          tables_cnt: schema.tables.length,
          tables_analyzed: schema.tables.filter((t) => { 
            return t.columns.filter((c) => c.last_analyzed).length === t.columns.length
          }).length,
          style: {},
        }
        rec.key = metaRecKey(rec)
        if (!filterMatch(rec)) continue
        data.push(rec)
      }
    }
    
    if (viewSelection.get() == 'Tables') { 
      let prev_schema = '';
      let background = 0;

      for (let table of conn.getAllTables()) { 
        let last_analyzed_at = table.columns.length > 0 ?
          table.columns.filter((c) => c.last_analyzed).sort()[0]?.last_analyzed || ''
          : '';
        

        let rec: MetaTableRecord = {
          index: data.length,
          key: '',
          database: table.database,
          schema: table.schema,
          table: table.name,
          last_analyzed: last_analyzed_at ? relative_duration(new Date(last_analyzed_at), true, true) : '',
          recs_cnt: Math.max.apply( Math, table.columns.map((c) => c.num_rows || 0)),
          cols_cnt: table.columns.length,
          unique_cols: table.columns.filter((c) => (c.num_rows || 0) > 0 && c.num_distinct == c.num_rows).length,
          cols_analyzed: table.columns.filter((c) => c.last_analyzed).length,
          style: {background},
        }
        rec.key = metaRecKey(rec)
        if (!filterMatch(rec)) continue

        // update for style
        if (prev_schema != table.schema) {
          background = background == 1 ? 0 : 1
          rec.style.background = background
        }
        prev_schema = rec.schema

        data.push(rec)
      }
    }

    if (viewSelection.get() == 'Columns') { 
      let prev_table = '';
      let background = 0;

      for (let table of conn.getAllTables()) { 
        for (let col of table.columns) { 
          let rec: MetaColumnRecord = {
            index: data.length,
            key: '',
            database: table.database,
            schema: table.schema,
            table: table.name,
            column: col.name,
            type: col.type,
            last_analyzed: col.last_analyzed ? relative_duration(new Date(col.last_analyzed), true, true) : '',
            recs_cnt: col.num_values || 0,
            nulls_cnt: col.num_nulls || 0,
            distincts_cnt: col.num_distinct || 0,
            dups_cnt: (col.num_values || 0) - (col.num_distinct || 0),
            style: {background},
          }
          rec.key = metaRecKey(rec)
          if (!filterMatch(rec)) continue

          // update for style
          if (prev_table != table.name) {
            background = background == 1 ? 0 : 1
            rec.style.background = background
          }
          prev_table = rec.table

          data.push(rec)
        }
      }
    }

    metaRecords.set(data)
  }

  const getWidth = (values: number[]) => { 
    let index = viewOptions.indexOf(viewSelection.get())
    return `${values[index]}em`
  }
  
  const tableKey = (rec : MetaTableRecord | MetaColumnRecord) => { 
    return `${rec.database}.${rec.schema}.${rec.table}`.toLowerCase()
  }

  const metaRecKey = (rec: MetaRecord) => { 
    let key = `${rec.database}.${rec.schema}`.toLowerCase()
    if (instanceOfMetaTableRecord(rec)) { 
      key = `${rec.database}.${rec.schema}.${rec.table}`.toLowerCase()
    } else if (instanceOfMetaColumnRecord(rec)) {
      key = `${rec.database}.${rec.schema}.${rec.table}.${rec.column}`.toLowerCase()
    }
    return key
  }

  const computeColumnRows = async (tableRec: MetaTableRecord) => { 
    let table = window.dbnet.currentConnection.lookupTable(tableKey(tableRec))
    let sql = table?.countRows() || ''
    let req : QueryRequest = {
      conn: window.dbnet.currentConnection.name,
      database: window.dbnet.currentConnection.database,
      text: sql,
    }
    loadingState[tableRec.key].set(true)
    let query = await window.dbnet.submitQuery(req)
    let records = data_req_to_records(query)
    loadingState[tableRec.key].set(none)
    refreshData(metaPanel.filter.get())
  }

  const computeColumnStats = async (rec: MetaTableRecord | MetaColumnRecord) => { 
    let table = window.dbnet.currentConnection.lookupTable(tableKey(rec))
    let columns : Column2[] = table?.columns || []
    if (instanceOfMetaColumnRecord(rec)) {
      columns = columns.filter((c) => c.name.toLowerCase() === rec.column)
    }

    loadingState[rec.key].set(true)
    await table?.updateColumnStats(columns)
    loadingState[rec.key].set(none)
    refreshData(metaPanel.filter.get())
    if (instanceOfMetaColumnRecord(rec)) toastInfo(`Stats Computed for ${rec.column}`)
    else toastInfo(`Stats Computed for ${rec.table}`)
  }

  const updateFilter = (val: string, debounce=true) => { 
    localFilter.set(val)
    if (debounce) setFilter(metaPanel.filter, val)
    else metaPanel.filter.set(val)
  }

  const getSample = async (e: any, rec: MetaColumnRecord) => { 
    let tableFullName = `${rec.database}.${rec.schema}.${rec.table}`
    let sql = `select ${rec.column} from ${tableFullName} 
                where ${rec.column} is not null limit 100`
    if (rec.recs_cnt > 0 && rec.distincts_cnt < 100) {
      sql = `select ${rec.column}, count(1) cnt
              from ${tableFullName}
              group by ${rec.column}
              order by count(1) desc`
    } else if (rec.recs_cnt > 0 && rec.recs_cnt > 100000 && rec.distincts_cnt > 50) {
      sql = `select distinct ${rec.column} from ${tableFullName} 
                where ${rec.column} is not null limit 50`
    }
    let req : QueryRequest = {
      conn: window.dbnet.currentConnection.name,
      database: rec.database,
      text: sql,
    }
    loadingState[rec.key].set(true)
    let query = await window.dbnet.submitQuery(req)
    let records = data_req_to_records(query, true, true)
    sampleRecords.set(records)
    sampleColumnName.set(rec.column.toLowerCase())
    loadingState[rec.key].set(none)
    sampleOp.current?.toggle(e)
  }



  ///////////////////////////  JSX  ///////////////////////////

  const SearchBox = <div className="p-grid p-fluid">
      <div className="p-col-12 p-md-12">
        <div className="p-inputgroup">
          <InputText
            placeholder="Search for schemas, tables, columns (space for AND, comma for OR)"
            value={localFilter.get()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                updateFilter('')
              }
            }}
            onChange={(e) => {
              let newVal = (e.target as HTMLInputElement).value
              updateFilter(newVal)
            }}
          />
            <Button icon="pi pi-search" className="p-button-warning"/>
            <Button icon="pi pi-history" className="p-button-secondary" tooltip="History" tooltipOptions={{position: "top"}}/>
        </div>
      </div>
    </div>
  
  const SamplePanel = <OverlayPanel
    ref={sampleOp}
    showCloseIcon
    dismissable
    id="sample-panel"
    style={{ width: "450px" }}
    // className="overlaypanel-demo"
  >
    <DataTable
      value={sampleRecords.get() ?? []}
      // selectionMode="single"
      // paginator
      rows={100}
      className="p-datatable-sm p-datatable-gridlines"
      style={{ fontSize: '11px' }}
      rowHover={true}
      scrollable={true}
      scrollHeight={`300px`}
      responsiveLayout="scroll"
    >
      <Column field={sampleColumnName.get()} header={sampleColumnName.get()} headerStyle={{ maxWidth: '30.7em' }}  bodyStyle={{ maxWidth: '30.7em' }} sortable />
      <Column field="cnt" header="Cnt" headerStyle={{ maxWidth: '5.7em' }}  bodyStyle={{ maxWidth: '5.7em' }} />
    </DataTable>
  </OverlayPanel>

  const columnBodyTemplate = (data: MetaColumnRecord) => {
    const is_unique = data.recs_cnt > 0 && data.distincts_cnt == data.recs_cnt
    return (
      <React.Fragment>
        <span className={ is_unique ? 'column-unique' : ''}>
          {data.column}
        </span>
      </React.Fragment>
    )
  }

  const actionBodyTemplate = (data: MetaRecord) => {
    return (
      <React.Fragment>
        <span className="action-buttons">
          {/* {
            instanceOfMetaTableRecord(data) ?
            <Button
              icon="pi pi-circle-off"
              tooltip="Count Rows"
              tooltipOptions={{ position: 'top' }}
              className="p-button-secondary p-mr-1 p-button-sm"
              loading={ loadingState[data.key].get() || false}
              onClick={() => { 
                if (instanceOfMetaTableRecord(data)) computeColumnRows(data)
              }}
            />
            :
            null
          } */}

          <Button
            icon="pi pi-eye"
            tooltip={
              instanceOfMetaSchemaRecord(data) ? "View Tables" : 
              instanceOfMetaTableRecord(data) ? "View Columns" : "View Sample"
            }
            tooltipOptions={{ position: 'top' }}
            className="p-button-info p-button-sm p-mr-1"
            loading={ loadingState[data.key].get() || false}
            onClick={(e) => {
              if (instanceOfMetaSchemaRecord(data)) {
                viewSelection.set('Tables')
                updateFilter(`"${data.database}" "${data.schema}"`, false)
              } else if (instanceOfMetaTableRecord(data)) {
                viewSelection.set('Columns')
                updateFilter(`"${data.database}" "${data.schema}" "${data.table}"`, false)
              } else { 
                getSample(e, data)
              }
            }}
          />
          <Button
            icon="pi pi-chart-bar"
            tooltip={
              instanceOfMetaSchemaRecord(data) ? "Analyze Tables in Schema" : 
              instanceOfMetaTableRecord(data) ? "Analyze Table" : "Analyze Column"
            }
            tooltipOptions={{ position: 'top' }}
            className="p-button-warning p-button-sm"
            loading={ loadingState[data.key].get() || false}
            onClick={() => {
              if (!instanceOfMetaSchemaRecord(data)) computeColumnStats(data)
            }}
          />
          </span>
        </React.Fragment>
    );
  }

  const rowClass = (data: MetaRecord) => {
      return {
          'even-background': data.style.background === 0
      }
  }
  
  const Table = <DataTable
      value={metaRecords.get()}
      loading={metaPanel.loading.get()}
      rowHover={true}
      scrollable={true}
      scrollHeight={`${height - 20}px`}
      virtualScrollerOptions={{ itemSize: 50 }}
      resizableColumns={true}
      className="p-datatable-sm p-datatable-gridlines"
      style={{ fontSize: '11px' }}
      // filters={filters.get()}
      emptyMessage="Nothing found."
      responsiveLayout="scroll"
      rowClassName={rowClass}
    >
      <Column
        selectionMode="multiple"
        headerStyle={{ maxWidth: '3.7em' }}
        bodyStyle={{ maxWidth: '3.7em' }}
      />

      <Column
        field="database"
        header="Database"
        headerStyle={{ minWidth: '10em', maxWidth: getWidth([25, 15, 11]) }}
        bodyStyle={{ minWidth: '10em', maxWidth: getWidth([25, 15, 11]) }}
      />

      <Column
        field="schema"
        header="Schema"
        headerStyle={{ maxWidth: getWidth([25, 15, 11]) }}
        bodyStyle={{ maxWidth: getWidth([25, 15, 11]) }}
      />

      {
        viewSelection.get() == 'Schemas' ?
        [
          { field: "tables_cnt", header: "Tables Cnt" },
          { field: "tables_analyzed", header: "Tables Analyzed" },
        ].map(col => <Column field={col.field} header={col.header} /> )
        : null
      }

      {
        viewSelection.get() == 'Tables' ?
        [
          { field: "table", header: "Table", maxWidth: 45 },
          { field: "last_analyzed", header: "Last Ana.", maxWidth: 6 },
          { field: "recs_cnt", header: "Records Cnt", maxWidth: 6 },
          { field: "cols_cnt", header: "Columns Cnt", maxWidth: 6 },
          { field: "unique_cols", header: "Uniq. Cols", maxWidth: 6 },
          ].map(col => <Column
            field={col.field}
            header={col.header}
            headerStyle={{ maxWidth: `${col.maxWidth}em` }}
            bodyStyle={{ maxWidth: `${col.maxWidth}em` }}
          />)
        : null
      }

      {
        viewSelection.get() == 'Columns' ?
          [
            { field: "table", header: "Table", maxWidth: 45 },
            { field: "column", header: "Column", maxWidth: 25, body: columnBodyTemplate },
            { field: "type", header: "Type", maxWidth: 10 },
            { field: "last_analyzed", header: "Last Analyzed", maxWidth: 6 },
            { field: "recs_cnt", header: "Cnt", maxWidth: 6 },
            { field: "nulls_cnt", header: "Nulls", maxWidth: 6 },
            { field: "distincts_cnt", header: "Distincts", maxWidth: 6 },
            { field: "dups_cnt", header: "Dups", maxWidth: 6 },
          ].map(col => <Column
            field={col.field}
            header={col.header}
            headerStyle={{ maxWidth: `${col.maxWidth}em` }}
            bodyStyle={{ maxWidth: `${col.maxWidth}em` }}
            body={ col.body }
          />)
          : null
      }

      <Column
        header="Actions"
        headerStyle={{ maxWidth: `7em` }}
        bodyStyle={{ maxWidth: `7em` }}
        body={actionBodyTemplate}
      />
    </DataTable>

  const dialogHeader = <div className="p-grid p-justify-center" style={{ padding: '8px' }}>
    <div className="p-col-12 p-md-5">
      <h2 style={{ margin: '0px' }}>
        Meta Explorer

        <a href="#;" title="Refresh All" style={{ paddingLeft: '9px'}}>
          <i
            style={{ color: 'orange', fontSize: '0.8em' }}
            className={ metaPanel.loading.get() ? "pi pi-spin pi-spinner":"pi pi-refresh"}
            title="Refresh"
            onClick={async () => {
              metaPanel.loading.set(true)
              await window.dbnet.getAllSchemata(window.dbnet.selectedConnection)
              refreshData(metaPanel.filter.get())
              metaPanel.loading.set(false)
            }}
          />
        </a>
      </h2>
    </div>
    <div className="p-col-12 p-md-5">
      <SelectButton
        value={viewSelection.get()}
        options={viewOptions}
        onChange={(e) => { viewSelection.set(e.value); refreshData(metaPanel.filter.get()) }}
      />
    </div>
    <div className="p-col-12 p-md-2">
      <Dropdown
        value={window.dbnet.currentConnection.name}
        options={window.dbnet.connections.map((c) => c.name)}
        onChange={(e) => window.dbnet.selectConnection(e.target.value)}
        // optionLabel="name"
        placeholder="Select a Connection"
      />
    </div>
  </div>

  return (
    <Dialog
      id='meta-explorer'
      header={dialogHeader}
      visible={show.get()}
      modal={false}
      // position="left"
      onHide={() => { show.set(false) }}
      style={{ width: '1300px' }}
      closeOnEscape={false}
    >
      {SearchBox}      
      {Table}
      {SamplePanel}
    </Dialog>
  );
};
