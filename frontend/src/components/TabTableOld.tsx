import * as React from "react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import './TabTable.css'
import { Tab, accessStore } from "../store/state";
import { State } from "@hookstate/core";
import "../../node_modules/jspreadsheet-ce/dist/jexcel.css";
import { jsonClone, toastError, toastInfo } from "../utilities/methods";
import { jsOptions, JSpreadsheet, ObjectAny } from "../utilities/interfaces";
import { useState } from "@hookstate/core";
import _ from "lodash";
const jspreadsheet = require("jspreadsheet-ce");

interface Props {
  tab: State<Tab>
}

export const TabTableOld: React.FC<Props> = React.memo((props) => {
  const resultHeight = document.getElementById("result-panel")?.parentElement?.clientHeight
  const resultWidth = document.getElementById("result-panel")?.parentElement?.clientWidth

  ///////////////////////////  HOOKS  ///////////////////////////
  const jRef = React.useRef<any>(null);
  const options = React.useRef<jsOptions>({
    about: '',
    data: [[]],
    columns: [],
    minDimensions: [1, 1],
    rows:{},
    rowResize: true,
    wordWrap: false,
    contextMenu: function() { return false },
    allowExport: true,
    includeHeadersOnDownload: true,
    columnSorting: true,
    editable: false,
    tableOverflow: true,
    tableHeight: !resultHeight || resultHeight < 400 ? `400px` : `${resultHeight-38}px`,
    tableWidth: props.tab.query.rows.length == 0 || !resultWidth || resultWidth < 400 ? `400px` : `${resultWidth-6}px`,
    // tableWidth: '100%',
  })

  const queryPanel = accessStore().queryPanel
  const tabs = queryPanel.tabs
  const selectedTab = useState(queryPanel.selectedTabId)
 
  ///////////////////////////  EFFECTS  ///////////////////////////
  // React.useEffect(() => {
  //   let element : Element | null = null
  //   let scrollFunc = () => {
  //     if(!element) return
  //     if (element.scrollHeight - element.scrollTop === element.clientHeight) {
  //       // element is at the end of its scroll, load more content
  //       debounceFetchRows(props.tab)
  //     }
  //   }

  //   setTimeout(() => {
  //     var elements = document.getElementsByClassName('jexcel_content')
  //     if(elements.length === 0) return
  //     element = elements[0]
  //     element.addEventListener('scroll', scrollFunc)
  //   }, 2000)

  //   return () => element?.removeEventListener('scroll', scrollFunc)

  // }, [])

  React.useEffect(() => {
    console.log('TabTable')
  }, [])

  React.useEffect(() => {
    
    // let data = jsonClone<any[]>(props.tab.query.rows.get())
    let data = filterRows()
    let columns = props.tab.query.headers.get().map(h => {
      return { title: h, type: 'text', width:180, wordWrap:false }
    })
    let rows : ObjectAny = {}
    if(props.tab.query.rows.get().length > 0) { 
      data.map((r, i) => {rows[i+1] = {height:'23px'}})
    }
    
    options.current.data = data
    options.current.columns = columns
    options.current.rows = rows
    options.current.loadingSpin = props.tab.loading.get()
    
    if (jRef.current.jspreadsheet) { jRef.current.jspreadsheet.destroy() }
    jspreadsheet(jRef.current, options.current)
    window.table = jRef.current.jspreadsheet
    
    // if (!jRef.current.jspreadsheet) {
      //   jspreadsheet(jRef.current, options.current);
      //   window.table = jRef.current.jspreadsheet
      //   console.log(window.table)
    // } else if (columns.length == 0 && window.table) {
    //   window.table.destroy()
    //   window.table = jspreadsheet(jRef.current, options.current);
    // } else if (window.table) {
      //   window.table.setData(data)
      //   columns.map((c, i) => window.table.setColumnData(i, c))
    //   console.log(columns)
    //   console.log(window.table.options)
    // }
    
    toastInfo(`${data.length} x ${columns.length}`)
  }, [props.tab.loading.get(), tabs.get(), selectedTab.get()]);


  ///////////////////////////  FUNCTIONS  ///////////////////////////

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
  return (
    <div>        
      {/* <DataTable
        emptyMessage="No records returned."
        value={props.tab.query.rows.get()}
        rowHover={true}
        scrollable={true}
        scrollHeight={store().app.tableScrollHeight.get()}
        loading={props.tab.loading.get()}
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize: '12px', padding: '4px', fontFamily: 'monospace'}}
      >
        {
          props.tab.query.headers.get().map(
            h => {
              return (
                <Column field={h} header={h} sortable/>
              )
            }
          )
        }
      </DataTable> */}
      <div id="tab-table" ref={jRef} style={{
        fontFamily:'monospace',
        // overflow: 'scroll',
        // width: '999px',
      }}/>
    </div>
  );
})