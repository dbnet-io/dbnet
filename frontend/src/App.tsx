import React, { RefObject, useRef, useLayoutEffect, useState } from 'react';
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
import { WsQueue } from './store/websocket';
import { accessStore, globalStore } from './store/state';
import { jsonClone } from './utilities/methods';
import { JSpreadsheet, ObjectAny } from './utilities/interfaces';
import _ from "lodash";
import { TopMenuBar } from './components/TopMenuBar';
import { PreviewPanel } from './components/PreviewPanel';
import { RowViewPanel } from './components/RowViewPanel';
import { GetDatabases, GetSchemata } from './components/SchemaPanel';

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
  useWindowSize()
  
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    // last connection
    let last_conn = localStorage.getItem("_connection_name")
    if(last_conn) store.connection.name.set(last_conn)

    // init load session
    globalStore.loadSession(store.connection.name.get()).then(async () => {
      await GetDatabases(store.connection.name.get())
      await GetSchemata(store.connection.name.get(), store.connection.database.get())
    })
  }, [])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const refresh = () => store.queryPanel.selectedTabId.set(jsonClone(store.queryPanel.selectedTabId.get()))
  const [debounceRefresh] = React.useState(() => _.debounce(() => refresh(), 400));

  const onKeyPress = (e: React.KeyboardEvent) => {
    // omni search
    // if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ' ') {
    if (e.shiftKey && e.key === ' ') {
      let el = document.getElementById('omni-search')
      if (el) {
        (el.children[0] as HTMLElement).focus()
      }
    }
  }

  ///////////////////////////  JSX  ///////////////////////////

  return (
    <div
      className="App"
      style={{ backgroundColor: '#d3d3d3' }}
      // onKeyPress={onKeyPress}
      onKeyDown={onKeyPress}
    >
      <Toast ref={toast} />
      <PreviewPanel />
      <RowViewPanel />
      <div style={{ paddingBottom: '7px' }}>
        <TopMenuBar />
      </div>
      <Splitter style={{ height: splitterHeight, marginLeft: '5px' }} className="p-mb-5" stateKey={"splitter"} stateStorage={"local"} onResizeEnd={(e) => debounceRefresh()} gutterSize={10}>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
          <LeftPane />
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
          <RightPane />
          {/* <Sessions/> */}
        </SplitterPanel>
      </Splitter>
    </div>
  );
}

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}