import * as React from "react";
import './TabTable.css'
import { useVariable } from "../store/state";
import { State } from "@hookstate/core";
import { get_duration, jsonClone, LogError, toastError, toastInfo } from "../utilities/methods";

import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { getTabState } from "./TabNames";
import { refreshResult } from "./TabToolbar";
import { getDexieDb } from "../state/dbnet";
import { Tab } from "../state/tab";
import { Query, QueryStatus } from "../state/query";
import DataEditor, { DataEditorProps, DataEditorRef, GridCellKind, GridColumn, GridMouseEventArgs, Item } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Tooltip } from "primereact/tooltip";

const PrettyTable = require('prettytable');

var durationInterval : NodeJS.Timeout 

interface Props {
  tab: State<Tab>
}

export const pullResult = async (tabState: State<Tab>) => {
  let tab = getTabState(tabState.id.get())

  tab.loading.set(true);
  try {
    // put in IndexedDb
    const db = getDexieDb()
    let cachedQ = await db.table('queries')
        .where('id')
        .equals(tab.query.id.get())
        .first()
    
    if(cachedQ) {
      let query = new Query(cachedQ)
      let tab = getTabState(query.tab)
      tab.set(
        t => {
          t.query = query
          t.query.pulled = true
          t.query.duration = Math.round(query.duration*100)/100
          t.loading = false
          return t
        }
      )
    }
  } catch (error) {
    toastError(error)
  }
  tab.loading.set(false)
}


export const fetchRows = async (tabState: State<Tab>) => {
  let tab = getTabState(tabState.id.get())
  if(tab.query.status.get() === QueryStatus.Completed) { return toastInfo('No more rows.') }

  tab.loading.set(true);
  if(tab.resultLimit.get() >= 5000) {
    tab.resultLimit.set(5000)
    toastInfo("Can only fetch a max of 5000 rows for preview. Export to CSV / Excel to view more rows.")
  } else if(tab.query.rows.length <= tab.resultLimit.get()) { 
    // submit with higher limit
    tab.resultLimit.set(v => v * 2)
    refreshResult(tab)
    return
  } else {
    tab.resultLimit.set(v => v * 2)
  }
  tab.loading.set(false)
}

export const TabTable: React.FC<Props> = (props) => {
  const resultHeight = document.getElementById("result-panel")?.parentElement?.clientHeight
  const resultWidth = (document.getElementById("result-panel")?.parentElement?.clientWidth || 500) - 15
  const tableHeight = !resultHeight || resultHeight < 200 ? 200 : resultHeight-85
  const ref = React.useRef<DataEditorRef | null>(null);
  const tab = props.tab
  // const [showSearch, setShowSearch] = React.useState(false);
  const showSearch = false
  
  const filteredRows = React.useRef<any[]>([])
  const filterRows = () => {
    // return []
    if(!props.tab.query.rows.get() || props.tab.query.rows.length === 0) { 
      filteredRows.current = []
      return []
    }
    let data = jsonClone<any[][]>(props.tab.query.rows.get())
    let filters = props.tab.filter.get().toLowerCase().split(' ')
    let data2: any[][] = []
    let limit = tab.resultLimit.get() > -1 ? tab.resultLimit.get() : 9999999999999
    for (let ri = 0; ri < data.length && ri < limit; ri++) {
      const row = data[ri];
      let include = filters.map(v => false)
      for(let val of row) {
        for (let i = 0; i < filters.length; i++) {
          const filter = filters[i].toLowerCase().trim()
          if(`${val}`.toLowerCase().includes(filter)) {
            include[i] = true
          }
        }
        if(include.every(v => v === true)) { break }
      }
      if(include.every(v => v === true)) { data2.push(row.map((v: any) => v === null ? '[NULL]' : `${v}`)) }
    }
    filteredRows.current = data2
    return data2
  }

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  // const afterSelection = (r1: number, c1: number, r2: number, c2: number, preventScrolling: object, selectionLayerLevel: number) => {
  const afterCellSelection = (cell: Item) => {
    let rows = filteredRows.current
    let row = rows[cell[1]]
    let data: { n: number, name: string, value: any }[] = []
    for (let i = 0; i < props.tab.query.headers.get().length; i++) {
      data.push({ n: i + 1, name: props.tab.query.headers.get()[i], value: `${row[i]}` })
    }
    tab.rowView.rows.set(data)
    tab.lastTableSelection.set([cell[1], cell[0], cell[1], cell[0]])
  }

  const onHover = (e: GridMouseEventArgs) => {
    if(e.kind === 'out-of-bounds') return
  }

  // const glideCols = React.useMemo<GridColumn[]>(
  //   () => props.tab.query.headers.get()?.map(h => { return { title: h, id: h }}) || []
  // , [props.tab.query.headers] );
  const glideCols : GridColumn[] = props.tab.query.headers?.get()?.map(h => { 
    return {
      title: h,
      id: h,
      // icon: GridColumnIcon.HeaderDate,
      // icon: GridColumnIcon.HeaderString,
      themeOverride: {
        fontFamily: 'sans-serif'
      }
    }}
  ) || []
  const rows = filterRows()
  const glideGetData = React.useCallback<DataEditorProps["getCellContent"]>(
    cell => {
      const [col, row] = cell;
      const dataRow = rows[row];
      const val = dataRow ? dataRow[col] : ''
      // let val = '22'
      return {
          kind: GridCellKind.Text,
          allowOverlay: true,
          readonly: true,
          style: val === '[NULL]' ? 'faded' : 'normal',
          data: val,
          displayData: `${val}`,
          themeOverride: {
            fontFamily: 'monospace'
          }
      }
  }, [props.tab.query.rows.get()]); // eslint-disable-line

  let output = <></>

  if (props?.tab?.loading?.get()) {
    // set progress spinner if still running
    output = <Progress tab={tab} resultWidth={resultWidth} tableHeight={tableHeight}/>
  } else if(props?.tab?.query.err.get()) {
    // set error if found
    let err = props.tab.query.err.get() + "\n\nFor SQL:\n" + props.tab.query.text.get()
    output = <InputTextarea
      value={err}
      style={{height: tableHeight, width: resultWidth, color:'red', fontSize:'16px'}}
      readOnly
    />
  } else if(props?.tab?.showText.get()) {
    // show rows as text
    let pt = new PrettyTable()
    pt.fieldNames(props.tab.query.headers.get())
    for(let row of rows) {
      pt.addRow(row.join('$|$').split('$|$'))
    }
    output = <InputTextarea
      value={pt.toString()}
      style={{height: tableHeight, width: resultWidth, fontSize:'13px', fontFamily:'monospace'}}
      readOnly
    />
  } else if(props?.tab?.query.text.get().includes('ddl_view') || props?.tab?.query.text.get().includes('ddl_table')) {
    let ddl = ''
    try {
      ddl = props.tab.query.get().rows.map(r => r[0]).join('\n') 
    } catch (error) {
      LogError(error)
    }
    output = <InputTextarea
      value={ddl}
      style={{
        height: tableHeight, width: resultWidth, 
        color:'blue', fontSize:'12px',
        fontFamily: 'monospace',
      }}
      readOnly
    />
  } else if(props?.tab?.query.affected.get() !== -1) {
    let text = `Total Rows Affected: ${props.tab.query.affected.get()}`
    output = <InputTextarea
      value={text}
      style={{
        height: tableHeight, width: resultWidth, 
        color:'blue', fontSize:'12px',
        fontFamily: 'monospace',
      }}
      readOnly
    />
  } else if(rows.length === 0 && props.tab.query.headers?.length > 0) {
    let text = `No Rows Returned.`
    output = <InputTextarea
      value={text}
      style={{
        height: tableHeight, width: resultWidth, 
        color:'blue', fontSize:'12px',
        fontFamily: 'monospace',
      }}
      readOnly
    />
  } else {
    output = <>
      <DataEditor
        ref={ref}
        getCellContent={glideGetData}
        columns={glideCols}
        rows={rows.length}
        height={tableHeight}
        width={resultWidth}
        onItemHovered={onHover}
        headerHeight={25}
        rowHeight={25}
        minColumnWidth={100}
        showSearch={showSearch}
        // showMinimap={true}
        // onGridSelectionChange={afterSelection}
        // smoothScrollX={true}
        // showSearch={true}
        smoothScrollY={true}
        getCellsForSelection={true}
        rowMarkers="clickable-number"
        onCellClicked={afterCellSelection}
        theme={{
          editorFontSize: '11.5px',
          baseFontStyle: 'font-size: 11.5px; font-family: monospace',
        }}
      />
    </>
  }

  return (
    <div style={{fontSize:'9.5px', overflowX: "hidden"}}>
      <Tooltip></Tooltip>
      {output}
    </div>
  );
}



const Progress: React.FC<{tab: State<Tab>, tableHeight: number, resultWidth: number}> = (props) => {
  const duration = useVariable('')
  const tab = props.tab

  React.useEffect(()=>{
    return () => {
      clearInterval(durationInterval)
    }
  }, []) // eslint-disable-line

  React.useEffect(()=>{
    if(tab.loading.get()) {
      durationInterval = setInterval(() => {
        duration.set(get_duration(Math.round((new Date().getTime() - tab.query.time.get()) / 1000)))
      }, 100)
    } else {
      duration.set('loading...')
      clearInterval(durationInterval)
    }
  }, [tab.loading.get()]) // eslint-disable-line

  return <div style={{height: props.tableHeight, width: props.resultWidth, textAlign:'center'}}>
    <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="8" fill="#EEEEEE" animationDuration=".5s"/>
    <p>{duration.get()}</p>
  </div>
}