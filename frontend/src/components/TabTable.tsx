import * as React from "react";
import './TabTable.css'
import { useVariable } from "../store/state";
import { State } from "@hookstate/core";
import { get_duration, jsonClone, LogError, toastError, toastInfo } from "../utilities/methods";

import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { getResultState, getTabState } from "./TabNames";
import { refreshResult } from "./TabToolbar";
import { getDexieDb } from "../state/dbnet";
import { Query, QueryStatus, Result } from "../state/query";
import DataEditor, { DataEditorProps, DataEditorRef, GridCellKind, GridColumn, GridMouseEventArgs, HeaderClickedEventArgs, Item } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { Tooltip } from "primereact/tooltip";
import { withResizeDetector } from 'react-resize-detector';

const PrettyTable = require('prettytable');

var durationInterval : NodeJS.Timeout 

interface Props {
  result: State<Result>
  width?: number;
  height?: number;
}

export const pullResult = async (resultState: State<Result>) => {
  let tab = getTabState(resultState.parent.get())

  tab.loading.set(true);
  try {
    // put in IndexedDb
    const db = getDexieDb()
    let cachedQ = await db.table('queries')
        .where('id')
        .equals(resultState.query.id.get())
        .first()
    
    if(cachedQ) {
      let query = new Query(cachedQ)
      let result = getResultState(query.result)
      result.set(
        r => {
          r.query = query
          r.query.pulled = true
          r.query.duration = Math.round(query.duration*100)/100
          r.loading = false
          return r
        }
      )
    }
  } catch (error) {
    toastError(error)
  }
  tab.loading.set(false)
}


export const fetchRows = async (result: State<Result>) => {
  let tab = getTabState(result.parent.get())
  if(result.query.status.get() === QueryStatus.Completed) { return toastInfo('No more rows.') }

  result.loading.set(true);
  if(tab.resultLimit.get() >= 5000) {
    tab.resultLimit.set(5000)
    toastInfo("Can only fetch a max of 5000 rows for preview. Export to CSV / Excel to view more rows.")
  } else if(result.query.rows.length <= tab.resultLimit.get()) { 
    // submit with higher limit
    tab.resultLimit.set(v => v * 2)
    refreshResult(result)
    return
  } else {
    tab.resultLimit.set(v => v * 2)
  }
  result.loading.set(false)
}

const TabTableComponent: React.FC<Props> = (props) => {
  // const resultHeight = props.height ? props.height : document.getElementById("result-panel")?.parentElement?.clientHeight
  const resultHeight = document.getElementById("result-panel")?.parentElement?.clientHeight
  const resultWidth = props.width ? props.width - 15 : 500
  const tableHeight = !resultHeight || resultHeight < 200 ? 200 : resultHeight-85
  const ref = React.useRef<DataEditorRef | null>(null);
  const result = props.result
  const tab = getTabState(props.result.parent.get())
  // const [showSearch, setShowSearch] = React.useState(false);
  const showSearch = false
  
  const filteredRows = React.useRef<any[]>([])
  const filterRows = () => {
    // return []
    if(!props.result.query.rows.get() || props.result.query.rows.length === 0) { 
      filteredRows.current = []
      return []
    }
    let data = jsonClone<any[][]>(props.result.query.rows.get())
    let filters = props.result.filter.get().toLowerCase().split(' ')
    let data2: any[][] = []
    let limit = result.limit.get() > -1 ? result.limit.get() : 9999999999999
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
    for (let i = 0; i < props.result.query.headers.get().length; i++) {
      data.push({ n: i + 1, name: props.result.query.headers.get()[i].name, value: `${row[i]}` })
    }
    tab.rowView.rows.set(data)
    result.lastTableSelection.set([cell[1], cell[0], cell[1], cell[0]])
  }

  const onHover = (e: GridMouseEventArgs) => {

    // clean up others
    document.querySelectorAll('.header-tooltip-cell').forEach(e => e.remove())

    if(e.kind === 'out-of-bounds') return

    if(e.kind === 'cell') return

    console.log(e)

    let x = e.bounds.x
    let y = e.bounds.y

    let colIndex = e.location[0]
    let header = props.result.query.headers?.get()[colIndex]
    if(!header || !header.dbType) return

    let width = header.dbType.length * 7
    width = width < e.bounds.width ? e.bounds.width : width

    var span = document.createElement('span')
    span.innerText = header.dbType
    span.className = 'header-tooltip-cell'
    span.style.fontSize = '13px';
    span.style.textAlign = 'center';
    span.style.alignContent = 'center';
    span.style.justifyContent = 'center';
    span.style.backgroundColor = '#d3d3d3';
    span.style.borderRadius = '5px';
    span.style.height = 15 + 'px';
    span.style.width = width + 'px';
    span.style.position = "absolute";
    span.style.left = x + 'px';
    span.style.top = y - 19 + 'px';
    span.setAttribute('data-pr-tooltip', header.name)
    span.setAttribute('data-pr-position', 'top')
    document.getElementById('result-panel')?.appendChild(span)
    console.log(span)
  }

  // const glideCols = React.useMemo<GridColumn[]>(
  //   () => props.tab.query.headers.get()?.map(h => { return { title: h, id: h }}) || []
  // , [props.tab.query.headers] );
  const glideCols : GridColumn[] = props.result.query.headers?.get()?.map(h => { 
    let name = h?.name || ''
    let width = name.length * 9.5
    return {
      title: name,
      id: name,
      width: width < 100 ? 100 : width,
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
  }, [props.result.query.rows.get()]); // eslint-disable-line

  let output = <></>

  if (props?.result?.loading?.get()) {
    // set progress spinner if still running
    output = <Progress result={result} resultWidth={resultWidth} tableHeight={tableHeight}/>
  } else if(props?.result?.query.err.get()) {
    // set error if found
    let err = props.result.query.err.get() + "\n\nFor SQL:\n" + props.result.query.text.get()
    output = <InputTextarea
      value={err}
      style={{height: tableHeight, width: resultWidth, color:'red', fontSize:'16px'}}
      readOnly
    />
  } else if(tab?.showText.get()) {
    // show rows as text
    let pt = new PrettyTable()
    pt.fieldNames(props.result.query.headers.get())
    for(let row of rows) {
      pt.addRow(row.join('$|$').split('$|$'))
    }
    output = <InputTextarea
      value={pt.toString()}
      style={{height: tableHeight, width: resultWidth, fontSize:'13px', fontFamily:'monospace'}}
      readOnly
    />
  } else if(props?.result?.query.text.get().includes('ddl_view') || props?.result?.query.text.get().includes('ddl_table')) {
    let ddl = ''
    try {
      ddl = props.result.query.get().rows.map(r => r[0]).join('\n') 
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
  } else if(props?.result?.query.affected.get() !== -1) {
    let text = `Total Rows Affected: ${props.result.query.affected.get()}`
    output = <InputTextarea
      value={text}
      style={{
        height: tableHeight, width: resultWidth, 
        color:'blue', fontSize:'12px',
        fontFamily: 'monospace',
      }}
      readOnly
    />
  } else if(rows.length === 0 && props.result.query.headers?.length === 0) {
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
      <Tooltip target='.header-tooltip'/>
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
        onHeaderClicked={(colIndex: number, event: HeaderClickedEventArgs) => {
        }}
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

export const TabTable = withResizeDetector(TabTableComponent);
// export const TabTable = TabTableComponent;


const Progress: React.FC<{result: State<Result>, tableHeight: number, resultWidth: number}> = (props) => {
  const duration = useVariable('')
  const result = props.result

  React.useEffect(()=>{
    return () => {
      clearInterval(durationInterval)
    }
  }, []) // eslint-disable-line

  React.useEffect(()=>{
    if(result.loading.get()) {
      durationInterval = setInterval(() => {
        duration.set(get_duration(Math.round((new Date().getTime() - result.query.time.get()) / 1000)))
      }, 100)
    } else {
      duration.set('loading...')
      clearInterval(durationInterval)
    }
  }, [result.loading.get()]) // eslint-disable-line

  return <div style={{height: props.tableHeight, width: props.resultWidth, textAlign:'center'}}>
    <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="8" fill="#EEEEEE" animationDuration=".5s"/>
    <p>{duration.get()}</p>
  </div>
}