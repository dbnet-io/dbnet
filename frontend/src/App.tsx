import React, { RefObject, useRef, useLayoutEffect, useState } from 'react';
import './App.css';
import { Splitter, SplitterPanel } from 'primereact/splitter';

import 'primereact/resources/primereact.min.css';
import 'primeflex/primeflex.min.css';
// import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/themes/saga-green/theme.css';
// import 'primereact/resources/themes/bootstrap4-dark-purple/theme.css';
// import 'primereact/resources/themes/bootstrap4-light-purple/theme.css';
import 'primeicons/primeicons.css';
import { LeftPane } from './panes/LeftPane';
import { RightPane } from './panes/RightPane';
import { Toast } from 'primereact/toast';
import { WsQueue } from './store/websocket';
import { useHS } from './store/state';
import { jsonClone, toastError, toastInfo } from './utilities/methods';
import { JSpreadsheet, ObjectAny } from './utilities/interfaces';
import _ from "lodash";
import { TopMenuBar } from './components/TopMenuBar';
import { PreviewPanel } from './components/PreviewPanel';
import { RowViewPanel } from './components/RowViewPanel';
import { JobPanel } from './components/JobPanel';
import { DbNet } from './state/dbnet';
import { ConnectionChooser } from './components/ConnectionChooser';
import { getTabState } from './components/TabNames';
import { MetaExplorer } from './components/MetaExplorer';

// this is to extends the window global functions
declare global {
  interface Window {
    toast: RefObject<Toast>
    dbnet: DbNet
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
  const chooseConnection = useHS(false)

  ///////////////////////////  HOOKS  ///////////////////////////
  useWindowSize()

  const aceEditorRef = React.useRef(null);
  const resultTableRef = React.useRef(null);
  const state = React.useRef<DbNet>(new DbNet({
    aceEditorRef, resultTableRef,
  }))
  window.dbnet = state.current
  var dbnet = state.current
  
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    // Init()
  }, [])// eslint-disable-line


  React.useEffect(() => {
    Init()
    return () => {
      dbnet.dispose()
      state.current = new DbNet({aceEditorRef, resultTableRef});
    }
  }, [])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const Init = async () => {
    await dbnet.init()

    if(dbnet.connections.length === 0) {
      // need to create connections
      toastInfo('Did not find any connections.')
      return
    }

    // choose conn if needed
    if(!dbnet.selectedConnection) return chooseConnection.set(true)

    // init load session
    // await globalStore.loadSession(dbnet.selectedConnection)

    await dbnet.getDatabases(dbnet.selectedConnection)
    await dbnet.getAllSchemata(dbnet.selectedConnection)

    // set init tab to current connection/database
    const queryPanel = window.dbnet.state.queryPanel
    let tabs = queryPanel.tabs.get().filter(t => !t.parent && !t.hidden)
    if (tabs.length === 1 && !tabs[0].connection) {
      let tab = getTabState(tabs[0].id)
      let conn = dbnet.getConnection(dbnet.selectedConnection)
      tab.set(t => {
        t.connection = conn.name
        t.database = conn.database
        return t
      })
    }
    dbnet.trigger('refreshSchemaPanel')
  }
  
  const refresh = () => window.dbnet.state.queryPanel.selectedTabId.set(jsonClone(window.dbnet.state.queryPanel.selectedTabId.get()))
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
      <JobPanel/>
      <PreviewPanel />
      <MetaExplorer/>
      <RowViewPanel />
      <ConnectionChooser
        show={chooseConnection}
        selectDb={false}
        onSelect={(connSelected: string) => {
          if(!connSelected) return toastError('Please select a connection')
          chooseConnection.set(false)
          dbnet.selectConnection(connSelected)
          Init()
        }}
      />
      <div style={{ paddingBottom: '7px' }}>
        <TopMenuBar/>
      </div>
      <div>
      <Splitter
        style={{ height: splitterHeight, marginLeft: '5px' }}
        stateKey={"splitter"}
        stateStorage={"local"}
        onResizeEnd={(e) => debounceRefresh()} 
        gutterSize={10}
      >
        <SplitterPanel className="p-d-flex" style={{maxWidth:'500px'}}>
          <LeftPane/>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex">
          <RightPane/>
          {/* <Sessions/> */}
        </SplitterPanel>
      </Splitter>
      </div>
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
