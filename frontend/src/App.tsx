import React, { RefObject, useRef } from 'react';
import './App.css';
import { Splitter, SplitterPanel } from 'primereact/splitter';

import 'primereact/resources/primereact.min.css';
// import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/themes/saga-green/theme.css';
// import 'primereact/resources/themes/bootstrap4-dark-purple/theme.css';
// import 'primereact/resources/themes/bootstrap4-light-purple/theme.css';
import 'primeicons/primeicons.css';
import { LeftPane } from './panes/LeftPane';
import { RightPane } from './panes/RightPane';
import { Toast } from 'primereact/toast';
import { Message, MsgType, sendWsMsg, Websocket, WsQueue } from './store/websocket';
import { accessStore, Schema } from './store/state';
import { data_req_to_records, jsonClone, toastError } from './utilities/methods';
import { JSpreadsheet, ObjectAny, RecordsData } from './utilities/interfaces';
import _ from "lodash";
import { TopMenuBar } from './components/TopMenuBar';
import { useState } from "@hookstate/core";
import { PreviewPanel } from './components/PreviewPanel';
import { RowViewPanel } from './components/RowViewPanel';

interface Props {}
interface State {
    count: number;
}


// this is to extends the window global functions
declare global {
  interface Window {
    toast: RefObject<Toast>
    table: JSpreadsheet
    callbacks: ObjectAny
    queue: WsQueue
  }
}

export const App = () => {
  const toast = useRef<Toast>(null);
  window.toast = toast
  window.queue = { receive: [], send: [] }
  window.table = useRef<JSpreadsheet>(null).current as JSpreadsheet;
  window.callbacks = {}
  const splitterHeight = `${Math.floor(window.innerHeight - 60)}px`
  const store = accessStore()
  // const ws = useState(globalState.ws)
  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(()=> {
    // init load session

    // get all schema objects
    let data = {
      conn: store.connection.name.get(),
      callback: (msg: Message) => {
        if(msg.error) { return toastError(msg.error) }
        let rows = data_req_to_records(msg.data)
        let schemas : { [key: string]: Schema; } = {}
        for(let row of rows) {
          if(!(row.schema_name in schemas)) {
            schemas[row.schema_name] = {name: row.schema_name, tables: {}}
          } 
          schemas[row.schema_name].tables[row.table_name] = {
            schema: row.schema_name,
            name: row.table_name,
          }
          store.connection.schemas.set(schemas)
        }
      },
    }
    if(Object.keys(store.connection.schemas.get()).length === 0) {
      sendWsMsg(new Message(MsgType.GetSchemata, data))
    }
  }, [])
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const refresh = () => store.queryPanel.selectedTabId.set(jsonClone(store.queryPanel.selectedTabId.get()))
  const debounceRefresh = _.debounce(() => refresh(), 400)

  const onKeyPress = (e: React.KeyboardEvent) =>{
    // omni search
    if((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ' ') { 
      let el = document.getElementById('omni-search')
      if(el) {
        (el.children[0] as HTMLElement).focus()
      }
    }
  }

  ///////////////////////////  JSX  ///////////////////////////

  return (
    <div
      className="App"
      style={{backgroundColor: '#d3d3d3'}}
      // onKeyPress={onKeyPress}
      onKeyDown={onKeyPress}
    >
      <Toast ref={toast}/>
      <PreviewPanel/>
      <RowViewPanel/>
      <Websocket/>
      <div style={{paddingBottom: '7px'}}>
        <TopMenuBar/>
      </div>
      <Splitter style={{height: splitterHeight, marginLeft: '5px'}} className="p-mb-5" stateKey={"splitter"} stateStorage={"local"}  onResizeEnd={(e) => debounceRefresh()} gutterSize={10}>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
          <LeftPane/>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
          <RightPane/>
          {/* <Sessions/> */}
        </SplitterPanel>
      </Splitter>
    </div>
  );
}

