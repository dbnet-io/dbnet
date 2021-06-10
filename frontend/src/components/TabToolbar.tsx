import * as React from "react";
import { accessStore, cleanupDexieDb, getDexieDb, globalStore, Query, Tab, useHS } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { MsgType } from "../store/websocket";
import _ from "lodash";
import { copyToClipboard, get_duration, jsonClone, new_ts_id, showNotification, toastError, toastInfo } from "../utilities/methods";
import { fetchRows } from "./TabTable";
import { Dropdown } from 'primereact/dropdown';
import { apiPost } from "../store/api";
import { createTabChild, getTabState } from "./TabNames";
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputTextarea } from 'primereact/inputtextarea';
import { Ace } from "ace-builds";

const store = accessStore()

const setFilter = _.debounce(
  (filter: State<string>, newVal: string) => filter.set(newVal), 400
)

export const cancelSQL = async (tab: State<Tab>) => {
  const connection = accessStore().connection

  let data1 = {
    id: tab.query.id.get(),
    conn: connection.name.get(),
    database: connection.database.get(),
    tab: tab.id.get(),
    wait: true,
  }

  try {
    let resp = await apiPost(MsgType.CancelSQL, data1)
    if (resp.error) throw new Error(resp.error)
  } catch (error) {
    toastError(error)
  }
}

export const refreshResult = async (tab: State<Tab>) => {
  let childTab = getTabState(tab.id.get())
  let parentTab = getTabState(tab.parent.get() || '')
  submitSQL(parentTab, childTab.query.text.get(), childTab.get())
}


export const submitSQL = async (tab: State<Tab>, sql?: string, childTab?: Tab) => {
  if (!sql) sql = tab.editor.text.get() // get current block
  
  const connection = tab.connection.get() || store.connection.name.get()
  const database = tab.database.get() || store.connection.database.get()
  const queryPanel = store.queryPanel
  
  // create child tab
  if (!childTab) childTab = createTabChild(tab.get())
  tab.selectedChild.set(childTab.id)
  
  // set limit to fetch, and save in cache
  const limit = childTab.resultLimit > 5000 ? 5000 : childTab.resultLimit < 500 ? 500 : childTab.resultLimit

  let data1 = {
    id: new_ts_id('query.'),
    conn: connection,
    database: database,
    text: sql.trim(),
    time: (new Date()).getTime(),
    tab: childTab.id,
    limit: limit,
    wait: true,
  }

  if (data1.text.endsWith(';')) {
    data1.text = data1.text.slice(0, -1).trim()
  }

  let tab_ = getTabState(data1.tab)
  let parentTab = getTabState(`${tab_.parent.get()}`)

  // mark text
  let points = parentTab.editor.get().getBlockPoints(sql)
  if (points) parentTab.editor.highlight.set(points)

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
  
  // cleanup
  cleanupDexieDb()
  
  try {
    let done = false
    let headers = {}
    while (!done) {
      let resp = await apiPost(MsgType.SubmitSQL, data1, headers)
      if (resp.error) throw new Error(resp.error)
      if (resp.status === 202) {
        headers = {"DbNet-Continue": "true"}
        continue
      }
      done = true
      let query = new Query(resp.data)
      query.pulled = true
      query.duration = Math.round(query.duration * 100) / 100

      tab_.set(
        t => {
          t.query = query
          t.rowView.rows = query.getRowData(0)
          t.loading = false
          return t
        }
      )

      // cache results
      getDexieDb().table('query').put(jsonClone(query))
    }
  } catch (error) {
    toastError(error)
    tab_.query?.err.set(`${error}`)
  }
  tab_.loading.set(false)
  parentTab.loading.set(false)
  parentTab.editor.highlight.set([0, 0, 0, 0])
  globalStore.saveSession()


  // to refresh
  if (queryPanel.get().currTab().id === parentTab.id.get()) {
    queryPanel.selectedTabId.set(jsonClone(queryPanel.selectedTabId.get()))
  } else {
    // notify if out of focus
    if (tab_.query.err.get()) toastError(`Query "${parentTab.name.get()}" failed`)
    else toastInfo(`Query "${parentTab.name.get()}" completed`)
  }

  if (!document.hasFocus()) {
    showNotification(`Query "${parentTab.name.get()}" ${tab_.query.err.get() ? 'errored' : 'completed'}!`)
  }
}

export function TabToolbar(props: { tab: State<Tab>, aceEditor: React.MutableRefObject<any>, hotTable: React.MutableRefObject<any>}) {
  const tab = props.tab;
  const filter = useHS(tab.filter);
  const resultLimit = useHS(tab.resultLimit);
  const cancelling = useHS(false);
  const localFilter = useHS(tab.filter.get() ? jsonClone<string>(tab.filter.get()) : '')
  const sqlOp = React.useRef<any>(null);

  React.useEffect(()=>{
    localFilter.set(tab.filter.get() ? jsonClone<string>(tab.filter.get()) : '')
  }, [tab.id.get()]) // eslint-disable-line

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
                loading={cancelling.get()}
                onClick={async (e) => {
                  cancelling.set(true)
                  await cancelSQL(tab)
                  cancelling.set(false)
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
                  if (sql === '') { sql = parentTab.editor.get().getBlock() }
                  if (sql.trim() !== '') { submitSQL(parentTab, sql) }
                }} />
          }


          <Button
            icon="pi pi-refresh"
            tooltip="Refresh results"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-info"
            onClick={(e) => refreshResult(tab)}
          />
          <OverlayPanel ref={sqlOp} showCloseIcon id="sql-overlay-panel" style={{ width: '450px' }} className="overlaypanel-demo">
            <InputTextarea
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '11px' }}
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
            value={resultLimit.get()}
            options={[100, 250, 500, 1000, 2500, 5000]}
            onChange={(e) => resultLimit.set(e.value)}
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
            onClick={() => { tab.showText.set(v => !v) }}
          />

          <InputText
            id="table-filter"
            className="p-inputtext-sm"
            placeholder="Filter rows..."
            value={localFilter.get()}
            style={{ fontFamily: 'monospace' }}
            onKeyDown={(e) => { if (e.key === 'Escape') { localFilter.set(''); filter.set('') } }}
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
            onClick={() => { 
              // console.log(props.hotTable.current?.hotInstance)
              // console.log(props.hotTable.current?.hotInstance.countRows())
              let startCol = tab.lastTableSelection.get()[1]
              let endCol = tab.lastTableSelection.get()[3]
              copyToClipboard(tab.query.headers.get().filter((h, i) => i >= startCol && i <= endCol).join('\n')) 
            }}
          />

          <Button
            icon="pi pi-copy"
            className="p-button-sm p-button-outlined p-button-secondary"
            tooltip="Copy data"
            tooltipOptions={{ position: 'top' }}
            onClick={() => {
              let data = []
              const sep = '\t'

              data.push(tab.query.headers.get().join(sep))
              for (let row of tab.query.rows.get()) {
                let newRow = []
                for (let val of row) {
                  let newVal = val + ''
                  if (newVal.includes(sep) || newVal.includes('\n') || newVal.includes('"')) {
                    val = `"${newVal.replaceAll('"', '""')}"`
                  }
                  newRow.push(val)
                }
                data.push(newRow.join(sep))
              }
              copyToClipboard(data.join('\n'))
            }
            }
          />

          <Button
            icon="pi pi-file-excel"
            className="p-button-sm p-button-outlined p-button-secondary"
            tooltip="Export to CSV or Excel"
            tooltipOptions={{ position: 'top' }}
          />

          <span className="p-inputgroup-addon">{ Math.min(tab.query.rows.length, tab.resultLimit.get()) } rows</span>
          <span className="p-inputgroup-addon">{ get_duration(Math.floor(tab.query.duration.get()*10)/10).replace('s', 's').replace('m', 'm ')}</span>

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
