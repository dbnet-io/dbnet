import * as React from "react";
import { useHS } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { MsgType } from "../store/websocket";
import _ from "lodash";
import { copyToClipboard, get_duration, jsonClone, new_ts_id, setFilter, showNotification, toastError, toastInfo } from "../utilities/methods";
import { fetchRows } from "./TabTable";
import { Dropdown } from 'primereact/dropdown';
import { apiPost } from "../store/api";
import { createTabChild, getTabState } from "./TabNames";
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputTextarea } from 'primereact/inputtextarea';
import { cleanupDexieDb, getDexieDb } from "../state/dbnet";
import { Tab } from "../state/tab";
import { Query } from "../state/query";

export const cancelSQL = async (tab: State<Tab>) => {
  let data1 = {
    id: tab.query.id.get(),
    conn: tab.connection.get(),
    database: tab.database.get(),
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

  // create child tab
  // if (!childTab) childTab = createTabChild(tab.get())
  if (!childTab) {
    childTab = getTabState(tab.selectedChild.get()).get()
    if (childTab.pinned) {
      childTab = createTabChild(tab.get())
      tab.selectedChild.set(childTab.id)
    }
  }
  // store.queryPanel.selectedTabId.set(tab.id.get())
  // tab.selectedChild.set(childTab.id)

  // set limit to fetch, and save in cache
  const limit = childTab.resultLimit > 5000 ? 5000 : childTab.resultLimit < 500 && childTab.resultLimit > -1 ? 500 : childTab.resultLimit

  let data1 = {
    id: new_ts_id('query.'),
    conn: tab.connection.get(),
    database: tab.database.get(),
    text: sql.trim(),
    time: (new Date()).getTime(),
    tab: childTab.id,
    limit: limit,
    wait: true,
    proj_dir: window.dbnet.state.projectPanel.rootPath.get(),
  }

  if (data1.text.endsWith(';')) {
    data1.text = data1.text.slice(0, -1).trim()
  }

  let tab_ = getTabState(data1.tab)
  let parentTab = getTabState(`${tab_.parent.get()}`)

  // mark text
  // let before = window.dbnet.editor.getRange()
  // let i = 0
  // while (true) {
  //   let found = window.dbnet.editor.find(sql.trim())
  //   let after = window.dbnet.editor.getRange()
  //   if (after.containsRange(before)) break // if it's found, it will be selected
  //   if(after.end.row > before.start.row || (after.end.row == before.start.row && after.end.column >= before.start.column)) break // if past
  //   i++; if (i > 10) break // just in case
  //   if(!found) break
  // }

  // let points = window.dbnet.editor.getPoints()
  // if (points) parentTab.editor.highlight.set(points)

  tab_.set(
    t => {
      t.query.time = new Date().getTime()
      t.lastTableSelection = [0, 0, 0, 0]
      t.query.rows = []
      t.query.headers = []
      t.query.text = `${sql}`
      t.query.err = ''
      t.query.duration = 0
      t.query.id = data1.id
      t.loading = true
      t.filter = ''
      return t
    }
  )
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
        headers = { "DbNet-Continue": "true" }
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
      getDexieDb().table('queries').put(jsonClone(query))
    }
  } catch (error) {
    toastError(error)
    tab_.query?.err.set(`${error}`)
  }
  parentTab.loading.set(false)
  parentTab.editor.highlight.set([0, 0, 0, 0])
  window.dbnet.state.save()


  // to refresh
  const queryPanel = window.dbnet.state.queryPanel
  if (queryPanel.get().currTab().id === parentTab.id.get()) {
    window.dbnet.trigger('refreshTable')
  } else {
    // notify if out of focus
    if (tab_.query.err.get()) toastError(`Query "${parentTab.name.get()}" failed`)
    else toastInfo(`Query "${parentTab.name.get()}" completed`)
  }

  if (!document.hasFocus()) {
    showNotification(`Query "${parentTab.name.get()}" ${tab_.query.err.get() ? 'errored' : 'completed'}!`)
  }
}

export function TabToolbar(props: { tab: State<Tab> }) {
  const tab = props.tab;
  const filter = useHS(tab.filter);
  const resultLimit = useHS(tab.resultLimit);
  const cancelling = useHS(false);
  const localFilter = useHS(tab.filter.get() ? jsonClone<string>(tab.filter.get()) : '')
  const sqlOp = React.useRef<any>(null);

  React.useEffect(() => {
    localFilter.set(tab.filter.get() ? jsonClone<string>(tab.filter.get()) : '')
  }, [tab.id.get()]) // eslint-disable-line

  const overlaySubmit = (e: any) => { 
    let sql = tab.query.text.get()
    let parentTab = getTabState(tab.parent.get() || '')
    if (sql.trim() !== '') {
      submitSQL(parentTab, sql)
      sqlOp.current.hide(e)
    }
  }

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
                  let sql = window.dbnet.editor.instance.getSelectedText()
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
          <OverlayPanel ref={sqlOp} showCloseIcon id="sql-overlay-panel" style={{ width: '550px' }} className="overlaypanel-demo">
            <div
              onKeyDown={(e: React.KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') overlaySubmit(e)
              }}>
              <InputTextarea
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '11px' }}
                rows={20}
                value={tab.query.text.get()}
                onChange={(e) => tab.query.text.set(e.target.value)}
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
                <Button
                  icon="pi pi-play"
                  tooltip="Execute"
                  tooltipOptions={{ position: 'top' }}
                  className="p-button-rounded p-button-text p-button-info"
                  onClick={(e) => { overlaySubmit(e) }} />
              </span>
            </div>
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
            options={[100, 250, 500, 1000, 2500, 5000, -1]}
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

          <span className="p-inputgroup-addon">{Math.min(tab.query.rows.length, tab.resultLimit.get() > -1 ? 99999999999 : tab.resultLimit.get())} rows</span>
          <span className="p-inputgroup-addon">{get_duration(Math.floor(tab.query.duration.get() * 10) / 10).replace('s', 's').replace('m', 'm ')}</span>

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
