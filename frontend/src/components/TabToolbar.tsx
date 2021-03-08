import * as React from "react";
import { Query, store, Tab, useHookState } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { Message, MsgType } from "../store/websocket";
import _ from "lodash";
import { jsonClone, toastError } from "../utilities/methods";
import { fetchRows } from "./TabTable";
import { Dropdown } from 'primereact/dropdown';


const setFilter = _.debounce(
  (filter: State<string>, newVal: string) => filter.set(newVal), 400
)

export const submitSQL = (tab: State<Tab>, sql?: string) => {
  if(!sql) {
    // get current block
    sql = tab.editor.text.get()
  }

  let tab_ = tab

  const session = store().session
  let data = {
    conn: store().session.conn.name.get(),
    text: sql,
    time: (new Date()).getTime(),
    tab: tab.id.get(),
    limit: tab.limit.get(),
    callback: (msg: Message) => {
      if(msg.error) { 
        toastError(msg.error)
        return tab_.loading.set(false)
      }
      
      let query = msg.data as Query
      let index = session.get().getTabIndexByID(query.tab)
      let tab = session.tabs[index]
      tab.set(
        t => {
          t.query = query
          t.query.duration = Math.round(query.duration*100)/100
          t.loading = false
          return t
        }
      )
      store().session.selectedTabId.set(jsonClone(store().session.selectedTabId.get())) // to refresh
    }
  }
  store().ws.doRequest.set(new Message(MsgType.SubmitSQL, data))
  tab.loading.set(true);
}

export function TabToolbar(props: { tab: State<Tab>; }) {
  const tab = props.tab;
  const filter = useHookState(tab.filter);
  const limit = useHookState(tab.limit);
  const localFilter = useHookState(tab.filter.get() ? jsonClone<string>(tab.filter.get()):'')

  return (
    <div id='query-toolbar' className="p-grid" style={{ paddingTop: '3px', paddingLeft: '4px', paddingRight: '4px' }}>
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

          <Button icon="pi pi-clock" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Refresh results @ interval" tooltipOptions={{ position: 'top' }} />

          <Button icon="pi pi-search-plus" tooltip="Row Viewer" className="p-button-sm p-button-outlined p-button-secondary" tooltipOptions={{ position: 'top' }} />
          <Button label="Text" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Show as text" tooltipOptions={{ position: 'top' }} />
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

          <Button label="Headers" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Copy Headers" tooltipOptions={{ position: 'top' }} />
          <Button icon="pi pi-copy" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Copy to clipboard" tooltipOptions={{ position: 'top' }} />
          <Button icon="pi pi-file-excel" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Export to CSV or Excel" tooltipOptions={{ position: 'top' }} />
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
