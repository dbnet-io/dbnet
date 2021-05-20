import * as React from "react";
import { ListBox } from 'primereact/listbox';
import { accessStore, Query, useHS, useVariable } from "../store/state";
import { apiGet } from "../store/api";
import { MsgType } from "../store/websocket";
import { new_ts_id, toastError } from "../utilities/methods";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { Button } from "primereact/button";
import _ from "lodash";
import { Tooltip } from "primereact/tooltip";
import { InputTextarea } from 'primereact/inputtextarea';

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
  }, [filter.get()])

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
            id="schema-filter"
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
    return (
      <>
        <div
          className="history-item"
          onClick={(e) => {}}
          onDoubleClick={(e) => {}}
          data-pr-tooltip={shorten(query.text, 100)}
        >
          {formatTime(query.time)} | {shorten(query.text, 50)}
        </div>
      </>
    )
  }

  return (
    <div>
      <Tooltip target=".history-item" position="right" style={{fontSize: '11px'}}/>
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
        listStyle={{minHeight:'150px', maxHeight: '300px', fontSize: '12px'}}
      />
      <InputTextarea
        rows={10}
        style={{maxHeight: '250px', fontSize:'11px', fontFamily:'monospace'}}
        value={selectedQuery.get().text} 
        autoResize 
      />
    </div>
  );
};