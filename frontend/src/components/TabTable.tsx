import * as React from "react";
import './TabTable.css'
import {  accessStore, Query, QueryStatus, Tab, useVariable } from "../store/state";
import { none, State } from "@hookstate/core";
import { get_duration, jsonClone, toastError, toastInfo } from "../utilities/methods";
import { MsgType } from "../store/websocket";
import _ from "lodash";

import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.css';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressSpinner } from 'primereact/progressspinner';
import { apiGet } from "../store/api";
import { getTabState } from "./TabNames";
const PrettyTable = require('prettytable');

var durationInterval : NodeJS.Timeout 
const store = accessStore()

interface Props {
  tab: State<Tab>
  hotTable: React.MutableRefObject<any>
}

export const pullResult = async (tabState: State<Tab>) => {
  let tab = getTabState(tabState.id.get())

  let data1 = {
    id: tab.query.id.get(),
    limit: tab.limit.get(),
  }
  tab.loading.set(true);
  try {
    let resp = await apiGet(MsgType.GetCachedResult, data1)
    if(resp.error) throw new Error(resp.error)
    let query = new Query(resp.data)
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
  } catch (error) {
    toastError(error)
  }
  tab.loading.set(false)
}


export const fetchRows = async (tabState: State<Tab>) => {
  let tab = getTabState(tabState.id.get())
  if(tab.query.status.get() === QueryStatus.Completed) { return toastInfo('No more rows.') }

  let data1 = {
    id: tab.query.id.get(),
    conn: tab.query.conn.get(),
    database: tab.query.database.get(),
    text: tab.query.text.get(),
    pulled: tab.query.pulled.get(),
    time: (new Date()).getTime(),
    tab: tab.id.get(),
    limit: 5000,
    result_limit: tab.query.rows.length * 2,
    wait: true,
  }

  tab.loading.set(true);
  tab.query.time.set(new Date().getTime())
  try {
    let resp = await apiGet(MsgType.GetSQLRows, data1)
    if(resp.error) throw new Error(resp.error)
    let query = new Query(resp.data)
    let tab = getTabState(query.tab)
    tab.set(
      t => {
        t.query.id = query.id
        t.query.status = query.status
        t.query.pulled = true
        t.query.duration = Math.round(query.duration*100)/100
        t.query.rows = query.rows
        t.loading = false
        return t
      }
    )
  } catch (error) {
    toastError(error)
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
  const resultWidth = document.getElementById("result-panel")?.parentElement?.clientWidth
  const tableHeight = !resultHeight || resultHeight < 200 ? 200 : resultHeight-78
  const tab = props.tab
  const hot = React.createRef<any>()

  ///////////////////////////  HOOKS  ///////////////////////////
  React.useEffect(()=>{
    // pull cache result only once
    let availableCaches = store.queryPanel.availableCaches.get()
    let index = availableCaches.indexOf(tab.query.id.get())
    if(index > -1) {
      pullResult(tab)
      store.queryPanel.availableCaches[index].set(none)
    }
  },[])  // eslint-disable-line

  React.useEffect(()=>{
    // let p = jsonClone<number[]>(tab.lastTableSelection.get())
    // hot.current.hotInstance.selectCell(p[0], p[1], p[2], p[3])
    // let filter = tab.filter.get().trim()
    // if(filter === '') return
    // let filters = filter.split(',')
    // console.log(props.hotTable.current?.hotInstance)
  },[tab.filter.get()])  // eslint-disable-line
  
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const afterSelection = (r1: number, c1: number, r2: number, c2: number, preventScrolling: object, selectionLayerLevel: number) => {
    tab.rowView.rows.set(jsonClone(tab.query.get().getRowData(r1)))
    tab.lastTableSelection.set([r1, c1, r2, c2])
  }
  
  const filterRows = () => {
    if(!props.tab.query.rows.get() || props.tab.query.rows.length === 0) { return [] }
    let data = jsonClone<any[]>(props.tab.query.rows.get())
    let filters = props.tab.filter.get().toLowerCase().split(' ')
    let data2 : any[] = []
    for(let row of data) {
      let include = filters.map(v => false)
      for(let val of row) {
        for (let i = 0; i < filters.length; i++) {
          const filter = filters[i].toLowerCase().trim()
          if(`${val}`.toLowerCase().includes(filter)) {
            include[i] = true
            break
          }
        }
        if(include.every(v => v === true)) { break }
      }
      if(include.every(v => v === true)) { data2.push(row) }
    }
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
    ref={props.hotTable}
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
  }

  return (
    <div style={{fontSize:'11.5px'}}>
      {output}
    </div>
  );
}