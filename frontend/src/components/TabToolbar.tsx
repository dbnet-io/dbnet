import * as React from "react";
import { useHS } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { copyToClipboard, get_duration, jsonClone, setFilter, toastError, toastInfo } from "../utilities/methods";
import { fetchRows } from "./TabTable";
import { Dropdown } from 'primereact/dropdown';
import { apiPost } from "../store/api";
import { getResultState, getTabState } from "./TabNames";
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tab } from "../state/tab";
import { QueryRequest, Result } from "../state/query";
import { getCurrentBlock, getSelectedBlock, TextBlock } from "../state/monaco/monaco";
import { setDecoration } from "../state/editor";
import { Routes, makeRoute } from "../state/routes";
import { InputNumber } from 'primereact/inputnumber';

export const cancelSQL = async (tab: State<Result>) => {
  let data1 = {
    id: tab.query.id.get(),
    connection: tab.connection.get(),
  }

  try {
    let resp = await apiPost(makeRoute(Routes.postConnectionCancel, data1))
    if (resp.error) throw new Error(resp.error)
  } catch (error) {
    toastError(error)
  }
}

export const refreshResult = async (result: State<Result>) => {
  let resultTab = getResultState(result.id.get())
  let parentTab = getTabState(result.parent.get() || '')
  submitSQL(parentTab, resultTab.query.text.get(), resultTab.get())
}


export const submitSQL = async (tab: State<Tab>, sql?: string, resultTab?: Result, block?: TextBlock) => {

  // mark text
  setDecoration(tab, block)

  await window.dbnet.submitQuery({
    connection: tab.connection.get() || '',
    database: tab.database.get() || '',
    text: sql?.trim() || tab.editor.text.get(),
    tab_id: tab.id.get(),
    result_id: resultTab?.id,
  })
}

export function TabToolbar(props: { result: State<Result> }) {
  const result = props.result;
  const tab = getTabState(result.parent.get())
  const filter = useHS(result.filter);
  const resultLimit = useHS(result.limit);
  const cancelling = useHS(false);
  const localFilter = useHS(result.filter.get() ? jsonClone<string>(result.filter.get()) : '')
  const sqlOp = React.useRef<any>(null);
  const exportOp = React.useRef<any>(null);
  const exportLimit = useHS(100000);

  React.useEffect(() => {
    localFilter.set(result.filter.get() ? jsonClone<string>(result.filter.get()) : '')
  }, [result.id.get()]) // eslint-disable-line

  const overlaySubmit = (e: any) => { 
    let sql = result.query.text.get()
    let parentTab = getTabState(result.parent.get() || '')
    if (sql.trim() !== '') {
      submitSQL(parentTab, sql)
      sqlOp.current.hide(e)
    }
  }

  const SqlOverlayPanel = <OverlayPanel 
      ref={sqlOp}
      showCloseIcon
      id="sql-overlay-panel"
      style={{ width: '550px' }}
      className="overlaypanel-demo"
      >
    <div
      onKeyDown={(e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') overlaySubmit(e)
      }}>
      <InputTextarea
        style={{ width: '100%', fontFamily: 'monospace', fontSize: '11px' }}
        rows={20}
        value={result.query.text.get()}
        onChange={(e) => result.query.text.set(e.target.value)}
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
          onClick={() => copyToClipboard(result.query.text.get())}
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

  const ExportOverlayPanel = <OverlayPanel 
      ref={exportOp}
      showCloseIcon
      id="export-overlay-panel"
      // style={{ width: '150px' }}
    >
    <div
      onKeyDown={(e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') overlaySubmit(e)
        if (e.key === 'Escape') exportOp.current.hide(e)
      }}>
        <p><strong>File Rows Limit:</strong></p>
        <InputNumber
          id='export-limit-input'
          value={exportLimit.get()}
          onValueChange={(e) => {
            // validate
            let val = e.value || 0
            if(val < 1) {
              return toastError(`Invalid input`)
            }
            exportLimit.set(val)
          }}
        />

        <Button
          label="OK"
          className="ml-2"
          onClick={async (e) => {
            let text = result.query.text.get().trim()
            let limit = exportLimit.get()

             // replace limit at end
            text = text.replace(/limit +\d+$/ig, `limit ${limit}`)

             // replace rownum at end (Oracle)
            text = text.replace(/rownum +<= +\d+/ig, `rownum <= ${limit}`)

             // replace top after select (SQL Server)
            text = text.replace(/select +top +\d+/ig, `select top ${limit}`)

            let req : QueryRequest = {
              connection: result.connection.get() || '',
              database: result.database.get() || '',
              tab_id: tab.id.get(),
              result_id: result.id.get(),
              text: text,
              export: 'csv',
              limit: limit,
            }
            
            window.dbnet.submitQuery(req)
          }}
        />
    </div>
  </OverlayPanel>

  return (
    <div id='query-toolbar' className="p-grid">
      <div className="p-col-12">
        <div className="work-buttons p-inputgroup" style={{ fontFamily: 'monospace' }}>
          {
            result.loading.get() ?
              <Button
                icon="pi pi-times"
                tooltip="Kill query"
                tooltipOptions={{ position: 'top' }}
                className="p-button-sm p-button-danger"
                loading={cancelling.get()}
                onClick={async (e) => {
                  cancelling.set(true)
                  await cancelSQL(result)
                  cancelling.set(false)
                }} />
              :
              <Button
                icon="pi pi-play"
                tooltip="Execute query"
                tooltipOptions={{ position: 'top' }}
                className="p-button-sm p-button-primary"
                onClick={(e) => {
                  let parentTab = getTabState(result.parent.get() || '')
                  let ed = window.dbnet.editorMap[parentTab.id.get()]
                  if(!ed?.instance) return console.log('no editor')
                  let block = getSelectedBlock(ed.instance) || getCurrentBlock(ed.instance.getModel(), ed.instance.getPosition())
                  if(!block.value) return toastInfo('Submitted a blank query')
                  let sql = block.value
                  if (sql === '') { sql = parentTab.editor.get().getBlock() }
                  if (sql.trim() !== '') { submitSQL(parentTab, sql, undefined, block) }
                }} />
          }


          <Button
            icon="pi pi-refresh"
            tooltip="Refresh results"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-info"
            onClick={(e) => refreshResult(result)}
          />

          {SqlOverlayPanel}
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
              let startCol = result.lastTableSelection.get()[1]
              let endCol = result.lastTableSelection.get()[3]
              copyToClipboard(result.query.headers.get().map(h => h.name).filter((h, i) => i >= startCol && i <= endCol).join('\n'))
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

              data.push(result.query.headers.get().join(sep))
              for (let row of result.query.rows.get()) {
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

          {ExportOverlayPanel}
          <Button
            icon="pi pi-file-excel"
            className="p-button-sm p-button-outlined p-button-secondary"
            tooltip="Export to CSV or Excel"
            tooltipOptions={{ position: 'top' }}
            onClick={(e) => exportOp.current.toggle(e)}
          />

          <span className="p-inputgroup-addon">{Math.min(result.query.rows.length, tab.resultLimit.get() > -1 ? 99999999999 : tab.resultLimit.get())} rows</span>
          <span className="p-inputgroup-addon">{get_duration(Math.floor(result.query.duration.get() * 10) / 10).replace('s', 's').replace('m', 'm ')}</span>

          <Button
            icon="pi pi-angle-double-down"
            tooltip="Load more rows"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-help"
            onClick={(e) => {
              fetchRows(result)
            }} />
        </div>
      </div>
    </div>);
}
