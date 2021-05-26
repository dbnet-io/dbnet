import * as React from "react";
import { accessStore, globalStore, Query, Tab, useHS } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { MsgType } from "../store/websocket";
import _ from "lodash";
import { copyToClipboard, jsonClone, new_ts_id, showNotification, toastError, toastInfo } from "../utilities/methods";
import { fetchRows } from "./TabTable";
import { Dropdown } from 'primereact/dropdown';
import { apiPost } from "../store/api";
import { createTabChild, getTabState } from "./TabNames";
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputTextarea } from 'primereact/inputtextarea';
import { Ace, Range } from "ace-builds";

const setFilter = _.debounce(
  (filter: State<string>, newVal: string) => filter.set(newVal), 400
)

export const cancelSQL = async (tab: State<Tab>) => {
  const connection = accessStore().connection

  let data1 = {
    id: tab.query.id.get(),
    conn: connection.name.get(),
    tab: tab.id.get(),
    wait: true,
  }

  try {
    let data2 = await apiPost(MsgType.CancelSQL, data1)
    if(data2.error) throw new Error(data2.error)
  } catch (error) {
    console.log(error)
    toastError(error)
  }
}


export const submitSQL = async (tab: State<Tab>, sql?: string, childTab?: Tab) => {
  if(!sql) sql = tab.editor.text.get() // get current block

  const connection = accessStore().connection
  const queryPanel = accessStore().queryPanel

  // create child tab
  if(!childTab) childTab = createTabChild(tab.get())
  tab.selectedChild.set(childTab.id)


  let data1 = {
    id: new_ts_id('query.'),
    conn: connection.name.get(),
    text: sql.trim(),
    time: (new Date()).getTime(),
    tab: childTab.id,
    limit: childTab.limit,
    wait: true,
  }

  if(data1.text.endsWith(';')) {
    data1.text = data1.text.slice(0, -1).trim()
  }

  let tab_ = getTabState(data1.tab)
  let parentTab = getTabState(`${tab_.parent.get()}`)

  // mark text
  let points = parentTab.editor.get().getBlockPoints(sql)
  if(points) parentTab.editor.highlight.set(points)

  tab_.query.time.set(new Date().getTime())
  tab_.lastTableSelection.set([0, 0, 0, 0])
  tab_.query.rows.set([])
  tab_.query.headers.set([])
  tab_.query.text.set(sql)
  tab_.query.err.set('')
  tab_.query.duration.set(0)
  tab_.query.id.set(data1.id)
  tab_.loading.set(true)
  tab_.filter.set('')
  parentTab.loading.set(true)

  try {
    let data2 = await apiPost(MsgType.SubmitSQL, data1)
    if(data2.error) throw new Error(data2.error)
    let query = new Query(data2)
    tab_.set(
      t => {
        t.query = query
        t.query.pulled = true
        t.query.duration = Math.round(query.duration*100)/100
        t.rowView.rows = query.getRowData(0)
        t.loading = false
        return t
      }
    )
  } catch (error) {
    console.log(error)
    toastError(error)
    tab_.query?.err.set(`${error}`)
  }
  tab_.loading.set(false)
  parentTab.loading.set(false)
  parentTab.editor.highlight.set([0,0,0,0])
  globalStore.saveSession()

  
  // to refresh
  if (queryPanel.get().currTab().id === parentTab.id.get()) {
    queryPanel.selectedTabId.set(jsonClone(queryPanel.selectedTabId.get()))
  } else {
    // notify if out of focus
    if(tab_.query.err.get()) toastError(`Query "${parentTab.name.get()}" failed`)
    else toastInfo(`Query "${parentTab.name.get()}" completed`)
  }
  
  if (!document.hasFocus()) {
    showNotification(`Query "${parentTab.name.get()}" ${tab_.query.err.get() ? 'errored' : 'completed'}!`)
  }
}

export function TabToolbar(props: { tab: State<Tab>, aceEditor: React.MutableRefObject<any> }) {
  const tab = props.tab;
  const filter = useHS(tab.filter);
  const limit = useHS(tab.limit);
  const localFilter = useHS(tab.filter.get() ? jsonClone<string>(tab.filter.get()):'')
  const sqlOp = React.useRef<any>(null);

  return (
    <div id='query-toolbar' className="p-grid" style={{ paddingBottom: '3px' }}>
      <div className="p-col-12">
        <div className="work-buttons p-inputgroup" style={{ fontFamily: 'monospace' }}>
          {
            tab.loading.get() ?
            <Button
              icon="pi pi-times"
              tooltip="Kill query"
              tooltipOptions={{ position: 'top' }}
              className="p-button-sm p-button-danger"
              onClick={(e) => {
                cancelSQL(tab)
              }} />
            :
            <Button
              icon="pi pi-play"
              tooltip="Execute query"
              tooltipOptions={{ position: 'top' }}
              className="p-button-sm p-button-primary"
              onClick={(e) => {
                let sql = (props.aceEditor.current.editor as Ace.Editor).getSelectedText()
                let parentTab = getTabState(tab.parent.get() || '')
                if(sql === '') { sql = parentTab.editor.get().getBlock() }
                if(sql.trim() !== '') { submitSQL(parentTab, sql) }
              }} />
          }


          <Button
            icon="pi pi-refresh"
            tooltip="Refresh results"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-info"
            onClick={(e) => {
              let childTab = getTabState(tab.id.get())
              let parentTab = getTabState(tab.parent.get() || '')
              submitSQL(parentTab, childTab.query.text.get(), childTab.get())
            }}
          />
          <OverlayPanel ref={sqlOp} showCloseIcon id="sql-overlay-panel" style={{width: '450px'}} className="overlaypanel-demo">
              <InputTextarea
                style={{width: '100%', fontFamily:'monospace', fontSize: '11px'}}
                rows={20}
                value={tab.query.text.get()}
              />
              <span
                style={{
                  position: 'absolute',
                  marginLeft: '-50px',
                }}
              >
                <Button
                  icon="pi pi-copy"
                  className="p-button-rounded p-button-text p-button-info"
                  onClick={() => copyToClipboard(tab.query.text.get())}
                />
              </span>
          </OverlayPanel>

          <Button
            label="SQL"
            className="p-button-sm p-button-warning"
            tooltip="Show Tab SQL"
            tooltipOptions={{ position: 'top' }}
            onClick={(e) => sqlOp.current.toggle(e)}
          />

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
            onClick={() => { tab.rowView.show.set(v => !v) }}
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
