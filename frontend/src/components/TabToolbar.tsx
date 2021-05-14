import * as React from "react";
import { accessStore, Query, Tab, useHS } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { Message, MsgType, sendWsMsg } from "../store/websocket";
import _ from "lodash";
import { copyToClipboard, jsonClone, toastError, toastInfo } from "../utilities/methods";
import { fetchRows } from "./TabTable";
import { Dropdown } from 'primereact/dropdown';


const setFilter = _.debounce(
  (filter: State<string>, newVal: string) => filter.set(newVal), 400
)

export const submitSQL = (tab: State<Tab>, sql?: string) => {
  if(!sql) sql = tab.editor.text.get() // get current block

  let tab_ = tab

  const connection = accessStore().connection
  const queryPanel = accessStore().queryPanel
  let data = {
    conn: connection.name.get(),
    text: sql,
    time: (new Date()).getTime(),
    tab: tab.id.get(),
    limit: tab.limit.get(),
    callback: (msg: Message) => {
      if(msg.error) { 
        toastError(msg.error)
        tab_.query.err.set(msg.error)
        return tab_.loading.set(false)
      }
      
      let query = new Query(msg.data)
      let index = queryPanel.get().getTabIndexByID(query.tab)
      let tab = queryPanel.tabs[index]
      tab.set(
        t => {
          t.query = query
          t.query.pulled = true
          t.query.duration = Math.round(query.duration*100)/100
          t.rowView.rows = query.getRowData(0)
          t.loading = false
          return t
        }
      )
      queryPanel.selectedTabId.set(jsonClone(queryPanel.selectedTabId.get())) // to refresh
    }
  }
  sendWsMsg(new Message(MsgType.SubmitSQL, data))
  tab.query.time.set(new Date().getTime())
  tab.lastTableSelection.set([0, 0, 0, 0])
  tab.query.rows.set([])
  tab.query.headers.set([])
  tab.query.err.set('')
  tab.query.duration.set(0)
  tab.loading.set(true);
}

export function TabToolbar(props: { tab: State<Tab>; }) {
  const tab = props.tab;
  const filter = useHS(tab.filter);
  const limit = useHS(tab.limit);
  const localFilter = useHS(tab.filter.get() ? jsonClone<string>(tab.filter.get()):'')

  return (
    <div id='query-toolbar' className="p-grid" style={{ paddingBottom: '3px' }}>
      <div className="p-col-12">
        <div className="work-buttons p-inputgroup" style={{ fontFamily: 'monospace' }}>
          <Button
            icon="pi pi-play"
            tooltip="Execute query"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-primary"
            onClick={(e) => {
              submitSQL(tab, tab.editor.text.get())
            }} />


          <Button
            icon="pi pi-refresh"
            tooltip="Refresh results"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-info"
            onClick={(e) => {
              submitSQL(tab, tab.query.text.get())
            }} />

            <Dropdown
              id='limit-input'
              value={ limit.get() }
              options={ [100, 250, 500, 1000, 2500, 5000] }
              onChange={(e) => limit.set(e.value) }
              placeholder="Limit..."
              maxLength={50}
            />

          <Button
            icon="pi pi-clock"
            className="p-button-sm p-button-outlined p-button-secondary"
            tooltip="Refresh results @ interval"
            tooltipOptions={{ position: 'top' }}
          />

          <Button
            icon="pi pi-search-plus"
            tooltip="Row Viewer"
            className={
              tab.rowView.show.get() ?
              "p-button-sm p-button-secondary"
              :
              "p-button-sm p-button-outlined p-button-secondary"
            }
            tooltipOptions={{ position: 'top' }}
            onClick={() => { tab.rowView.show.set(true) }}
          />

          <Button
            label="Text"
            className={
              tab.showText.get() ?
              "p-button-sm p-button-secondary"
              :
              "p-button-sm p-button-outlined p-button-secondary"
            }
            tooltip="Show as text"
            tooltipOptions={{ position: 'top' }}
            onClick={() => {tab.showText.set(v => !v)}}
          />

          <InputText
            id="table-filter"
            className="p-inputtext-sm"
            placeholder="Filter rows..."
            value={localFilter.get()}
            style={{ fontFamily: 'monospace' }}
            onKeyDown={(e) => { if(e.key === 'Escape') { localFilter.set(''); filter.set('') } }}
            onChange={(e) => {
              let newVal = (e.target as HTMLInputElement).value
              localFilter.set(newVal);
              setFilter(filter, newVal)
            }} />

          <Button
            label="Headers"
            className="p-button-sm p-button-outlined p-button-secondary"
            tooltip="Copy headers"
            tooltipOptions={{ position: 'top' }}
            onClick={()=>{copyToClipboard(tab.query.headers.get().join('\n'))}}
          />

          <Button
            icon="pi pi-copy"
            className="p-button-sm p-button-outlined p-button-secondary"
            tooltip="Copy data"
            tooltipOptions={{ position: 'top' }}
            onClick={()=>{
              let data = []
              const sep = '\t'

              data.push(tab.query.headers.get().join(sep))
              for (let row of tab.query.rows.get()) {
                let newRow = []
                for (let val of row){
                  let newVal = val+''
                  if(newVal.includes(sep) || newVal.includes('\n') || newVal.includes('"')) {
                    val = `"${newVal.replaceAll('"','""')}"`
                  }
                  newRow.push(val)
                }
                data.push(newRow.join(sep))
              }
              copyToClipboard(data.join('\n'))}
            }
          />

          <Button
            icon="pi pi-file-excel"
            className="p-button-sm p-button-outlined p-button-secondary"
            tooltip="Export to CSV or Excel"
            tooltipOptions={{ position: 'top' }}
          />

          <span className="p-inputgroup-addon">{tab.query.rows.length} rows</span>
          <span className="p-inputgroup-addon">{tab.query.duration.get()} sec</span>

          <Button
            icon="pi pi-angle-double-down"
            tooltip="Load more rows"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-help"
            onClick={(e) => {
              fetchRows(tab)
            }} />
        </div>
      </div>
    </div>);
}
