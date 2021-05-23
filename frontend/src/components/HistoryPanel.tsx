import * as React from "react";
import { ListBox } from 'primereact/listbox';
import { accessStore, getParentTabName, Query, QueryStatus, useHS, useVariable } from "../store/state";
import { apiGet } from "../store/api";
import { MsgType } from "../store/websocket";
import { copyToClipboard, new_ts_id, relative_duration, toastError } from "../utilities/methods";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { Button } from "primereact/button";
import _ from "lodash";
import { Tooltip } from "primereact/tooltip";
import { InputTextarea } from 'primereact/inputtextarea';
import { submitSQL } from "./TabToolbar";
import { createTab, getTabState } from "./TabNames";

interface Props {}

export const HistoryPanel: React.FC<Props> = (props) => {
  const store = accessStore()
  ///////////////////////////  HOOKS  ///////////////////////////
  const selectedQuery = useVariable<Query>(new Query())
  const options = useVariable<Query[]>([])
  const loading = useHS(false)
  const filter = useHS('')

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => {
    if(filter.get() === '') getLatest()
    else  debounceSearch(filter.get())
  }, [filter.get()])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const getLatest = async () => {
    let data1 = {
      id: new_ts_id('hist.'),
      conn: store.connection.name.get(),
      procedure: "get_latest",
    }
    try {
      let data2 = await apiGet(MsgType.GetHistory, data1)
      if(data2.error) throw new Error(data2.error)
      options.set(data2.history.map((v:any) => new Query(v)))
    } catch (error) {
      toastError(error, "Could not get latest history entries")
    }
  }

  const doSearch = async (filter: string) => {
    let data1 = {
      id: new_ts_id('hist.'),
      conn: store.connection.name.get(),
      procedure: "search",
      name: filter,
    }
    try {
      let data2 = await apiGet(MsgType.GetHistory, data1)
      if(data2.error) throw new Error(data2.error)
      options.set(data2.history.map((v:any) => new Query(v)))
    } catch (error) {
      toastError(error, "Could not get latest history entries")
    }
  }

  const debounceSearch = _.debounce((filter: string) => doSearch(filter), 400)

  ///////////////////////////  JSX  ///////////////////////////

  const FilterBox = (props: { filter: State<string>, loading: State<boolean>, onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined }) => {
    return (
      <div className="p-col-12" style={{paddingBottom:'10px'}}>
        <div className="p-inputgroup">
          <InputText
            id="history-filter"
            placeholder="Filters..."
            value={props.filter.get()}
            onChange={(e:any) => { props.filter.set(e.target.value) }}
            onKeyDown={(e: any) =>{ if(e.key === 'Escape') { props.filter.set('') }}}
          />
          <Button icon={props.loading.get() ?"pi pi-spin pi-spinner": "pi pi-refresh"} className="p-button-warning" tooltip="refresh" onClick={props.onClick}/>
        </div>
      </div>
    )
  }
  
  const ItemTemplate = (query: Query) => {
    const shorten = (text: string, n: number) => {
      if(text.length > n) {
        text = text.slice(0, n)
      }
      return text
    }
    const formatTime = (time: number) => {
      let utc_dt = new Date(time)
      utc_dt.setMinutes(utc_dt.getMinutes() - utc_dt.getTimezoneOffset())
      return utc_dt.toISOString().slice(0, 16)
    }

    let id = `history-item-${query.id.replaceAll('.', '-')}`

    return (
      <>
        <Tooltip target={`#${id}`} style={{fontSize: '12px', minWidth: '250px'}}>
          <span><b>Time:</b> {formatTime(query.time)}</span><br/>
          <span><b>Status:</b> {query.status}</span><br/>
          <span><b>Duration:</b> {query.duration}</span><br/>
          {
            query.err ? 
            <>
              <span><b>Error:</b> {query.err}</span><br/>
            </>
            :
            null
          }
          <span style={{fontFamily:'monospace', fontSize:'10px'}}>
            <pre><code>{shorten(query.text, 200)}</code></pre>
          </span>
        </Tooltip>
        <div
          id={id}
          onClick={(e) => {}}
          onDoubleClick={(e) => {}}
        >
          {/* {formatTime(query.time)} | {shorten(query.text, 50)} */}
          {formatTime(query.time)} <b>{relative_duration(new Date(query.time))}</b>
          <span 
            style={{
              paddingLeft:'10px',
              color: query.status === QueryStatus.Errored || query.status === QueryStatus.Cancelled ? 'red' : query.status === QueryStatus.Fetched ? 'blue' : query.status === QueryStatus.Submitted? 'pink' : 'green',
            }}
          ><i>{query.status}</i></span>
        </div>
      </>
    )
  }

  return (
    <div>
      <FilterBox filter={filter} loading={loading} onClick={() => doSearch(filter.get())}/>
      <ListBox
        id="history-list"
        value={selectedQuery.get()}
        options={ options.get() }
        onChange={(e) => {
          if(!e.value) { return }
          selectedQuery.set(e.value)
        }}
        metaKeySelection={true}
        optionLabel="name"
        itemTemplate={ItemTemplate}
        style={{width: '100%'}}
        listStyle={{
          minHeight:'150px', 
          maxHeight: `${window.innerHeight - 400}px`,
          fontSize: '12px',
        }}
      />
      <div>
        <InputTextarea
          style={{
            fontSize:'11px', fontFamily:'monospace',
            maxHeight: `${window.innerHeight - 510}px`,
          }}
          value={selectedQuery.get().text} 
          autoResize 
        />
        <span
          style={{
            position: 'absolute',
            marginLeft: '-70px',
          }}
        >
          <Button
            icon="pi pi-copy"
            className="p-button-rounded p-button-text p-button-info"
            tooltip="Copy to Clipboard"
            tooltipOptions={{position: 'top'}}
            onClick={() => copyToClipboard(selectedQuery.get().text)}
          />
        </span>
        <span
          style={{
            position: 'absolute',
            marginLeft: '-40px',
          }}
        >
          <Button
            icon="pi pi-play"
            className="p-button-rounded p-button-text p-button-success"
            tooltip="Execute SQL"
            tooltipOptions={{position: 'top'}}
            onClick={() => {
              let sql = selectedQuery.get().text
              let tabName = getParentTabName(selectedQuery.get().tab)
              let tab = getTabState(tabName)
              if(!tab || !tab.get()) tab = createTab(tabName, sql)
              submitSQL(tab, sql)
            }}
          />
        </span>
      </div>
    </div>
  );
};