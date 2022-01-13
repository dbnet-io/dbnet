import * as React from "react";
import './TabTable.css'
import { useVariable } from "../store/state";
import { State } from "@hookstate/core";
import { get_duration, jsonClone, LogError, toastError, toastInfo } from "../utilities/methods";
import _ from "lodash";

import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.css';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { getTabState } from "./TabNames";
import { refreshResult } from "./TabToolbar";
import { getDexieDb } from "../state/dbnet";
import { Tab } from "../state/tab";
import { Query, QueryStatus } from "../state/query";
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

const debounceFetchRows = _.debounce((tab: State<Tab>) => fetchRows(tab), 400)  // eslint-disable-line

const settings = {
  // colHeaders: ["Year", "Ford", "Volvo", "Toyota", "Honda"],
  // columns: columnDefs,
  rowHeaders: true,
  // stretchH: 'all',
  // width: 806,
  // autoWrapRow: false,
  preventOverflow: 'horizontal',
  wordWrap: false,
  // height: 441,
  // maxRows: 50,,
  columnSorting: true,
  sortIndicator: true,
  renderAllRows: false,
  autoColumnSize: {
    samplingRatio: 23
  },
  search: true,
  contextMenu: false,
  // fixedColumnsLeft: 2,
  manualColumnResize: true,
  modifyColWidth: function (width: number, col: number) {
    if (width > 250) {
      return 250
    }
  },
  viewportColumnRenderingOffset: 20,
  viewportRowRenderingOffset: 20,
}

export const TabTable: React.FC<Props> = (props) => {
  const resultHeight = document.getElementById("result-panel")?.parentElement?.clientHeight
  const resultWidth = (document.getElementById("result-panel")?.parentElement?.clientWidth || 500) - 10
  const tableHeight = !resultHeight || resultHeight < 200 ? 200 : resultHeight-78
  const tab = props.tab
  const trigger = useVariable(0)

  ///////////////////////////  HOOKS  ///////////////////////////
  const filteredRows = React.useRef<any[]>([])

  React.useEffect(()=>{
    // pull cache result
    if(!props.tab.query.rows.get() || props.tab.query.rows.length === 0) { pullResult(tab) }
  }, [])  // eslint-disable-line
  

  React.useEffect(() => {
    let id1 = window.dbnet.subscribe('refreshTable', trigger)
    // let id1 = window.dbnet.subscribeFunc('refreshTable', refreshTable )
    return () => {
      window.dbnet.unsubscribe(id1)
    }
  }, [])

  React.useEffect(()=>{
    // let p = jsonClone<number[]>(tab.lastTableSelection.get())
    // hot.current.hotInstance.selectCell(p[0], p[1], p[2], p[3])
    // let filter = tab.filter.get().trim()
    // if(filter === '') return
    // let filters = filter.split(',')
    // console.log(props.hotTable.current?.hotInstance)
  }, [tab.filter.get()])  // eslint-disable-line
  
  const refreshTable = () => {
    const ht = window.dbnet.resultTable.instance
    let data = jsonClone<any[]>(props.tab.query.rows.get())
    ht.loadData(data)
    // console.log(data)
    console.log(ht)
  }
  
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const afterSelection = (r1: number, c1: number, r2: number, c2: number, preventScrolling: object, selectionLayerLevel: number) => {
    let rows = filteredRows.current
    let row = rows[r1]
    let data: { n: number, name: string, value: any }[] = []
    for (let i = 0; i < props.tab.query.headers.get().length; i++) {
      data.push({ n: i + 1, name: props.tab.query.headers.get()[i], value: `${row[i]}` })
    }
    tab.rowView.rows.set(data)
    tab.lastTableSelection.set([r1, c1, r2, c2])
  }
  
  const filterRows = () => {
    // return []
    if(!props.tab.query.rows.get() || props.tab.query.rows.length === 0) { 
      filteredRows.current = []
      return []
    }
    let data = jsonClone<any[]>(props.tab.query.rows.get())
    let filters = props.tab.filter.get().toLowerCase().split(' ')
    let data2: any[] = []
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

  ///////////////////////////  JSX  ///////////////////////////

  const Progress = () => {
    const duration = useVariable('')

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

    return <div style={{height: tableHeight, width: resultWidth, textAlign:'center'}}>
      <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="8" fill="#EEEEEE" animationDuration=".5s"/>
      <p>{duration.get()}</p>
    </div>
  }

  const rows = filterRows()
  let output = <HotTable
    id="tab-table"
    ref={window.dbnet.resultTable.instanceRef}
    data={rows}
    colHeaders={props.tab.query.headers.get()}
    rowHeaders={true}
    // width={600}
    height={tableHeight}
    // stretchH="all"
    settings={settings}
    afterSelection={afterSelection}
  />

  if (props?.tab?.loading?.get()) {
    // set progress spinner if still running
    output = <Progress/>
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
  } else if(props?.tab?.query.err.get()) {
    // set error if found
    let err = props.tab.query.err.get() + "\n\nFor SQL:\n" + props.tab.query.text.get()
    output = <InputTextarea
      value={err}
      style={{height: tableHeight, width: resultWidth, color:'red', fontSize:'16px'}}
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
  }

  return (
    <div style={{fontSize:'11.5px'}}>
      {output}
    </div>
  );
}