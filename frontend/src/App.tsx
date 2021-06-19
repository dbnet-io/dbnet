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
import { MsgType, WsQueue } from './store/websocket';
import { accessStore, Connection, ConnectionRecord, globalStore, useHS } from './store/state';
import { jsonClone, Sleep, toastError, toastInfo } from './utilities/methods';
import { JSpreadsheet, ObjectAny } from './utilities/interfaces';
import { Dialog } from 'primereact/dialog';
import { ListBox } from 'primereact/listbox';
import _ from "lodash";
import { TopMenuBar } from './components/TopMenuBar';
import { PreviewPanel } from './components/PreviewPanel';
import { RowViewPanel } from './components/RowViewPanel';
import { GetDatabases, GetSchemata } from './components/SchemaPanel';
import { apiGet, Response } from './store/api';
import { Button } from 'primereact/button';
import { JobPanel } from './components/JobPanel';
import { DbNet } from './store/dbnet';

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
  const chooseConnection = useHS(false)
  ///////////////////////////  HOOKS  ///////////////////////////
  useWindowSize()

  const dbNet = React.useRef<DbNet>()
  
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    Init()
  }, [])// eslint-disable-line


  React.useEffect(() => {
    dbNet.current = new DbNet({
    }) 
    return () => {
      dbNet.current?.dispose()
      dbNet.current = undefined;
    }
  }, [])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const Init = async () => {

    // get all connections
      let resp : Response = {} as Response
      let tries = 0
      while(true)  {
        try {
          tries++
          resp = await apiGet(MsgType.GetConnections, {})
          break
        } catch (error) {
          resp.error = error
          if (tries >= 5) break
          await Sleep(1000)
        }
      }
      
    if (resp.error) return toastError(resp.error)
    let conns : Connection[] = _.sortBy(Object.values(resp.data.conns), (c: any) => c.name )
    store.connections.set(conns.map(c => new Connection(c)))
    if(conns.length === 0) {
      // need to create connections
      toastInfo('Did not find any connections.')
      return
    }

    // last connection
    let last_conn = localStorage.getItem("_connection_name")
    if(last_conn) {
      let found = store.connections.get().map(c => c.name.toLowerCase()).includes(last_conn.toLowerCase())
      if(found) {
        store.workspace.selectedConnection.set(last_conn)
      } else {
        // if none detected/found, prompt to choose
        chooseConnection.set(true)
        return
      }
    }

    // init load session
    await globalStore.loadSession(store.connection.name.get())

    await GetDatabases(store.connection.name.get())
    await GetSchemata(store.connection.name.get(), store.connection.database.get())
  }
  
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
  const ConnectionChooser = () => {
    const connSelected = useHS('')
    const dbtConns = () : string[] => store.connections.get().filter(c => c.dbt).map(c => c.name)
    const footer = () => {
      return <div style={{textAlign: 'center'}}>
          <Button label="OK" icon="pi pi-check" onClick={() => {
            localStorage.setItem("_connection_name", connSelected.get())
            chooseConnection.set(false)
            Init()
          }} 
          className="p-button-text" />
      </div>
    }

    const itemTemplate = (option: any) => {
      return <>
        {option}
        {
          dbtConns().includes(option) ?
          <span style={{
            color:'green', fontSize:'0.6rem',
            paddingLeft: '10px', marginBottom: '5px',
          }}
          >
            <b>dbt</b>
          </span>
          :
          null
        }
      </>
    }

    return  (
      <Dialog
        header="Choose a connection" visible={chooseConnection.get()}
        footer={footer()} 
        onHide={() => chooseConnection.set(false)}
      >
        <ListBox 
          value={connSelected.get()}
          options={store.connections?.get()?.map(c => c.name) || []} 
          onChange={(e) => connSelected.set(e.value)} 
          listStyle={{fontFamily:'monospace'}}
          itemTemplate={itemTemplate}
          style={{width: '15rem'}} 
        />
      </Dialog>
    )
  }

  return (
    <div
      className="App"
      style={{ backgroundColor: '#d3d3d3' }}
      // onKeyPress={onKeyPress}
      onKeyDown={onKeyPress}
    >
      <Toast ref={toast} />
      <JobPanel />
      <PreviewPanel />
      <RowViewPanel />
      <ConnectionChooser />
      <div style={{ paddingBottom: '7px' }}>
        <TopMenuBar />
      </div>
      <div>
      <Splitter style={{ height: splitterHeight, marginLeft: '5px' }} stateKey={"splitter"} stateStorage={"local"} onResizeEnd={(e) => debounceRefresh()} gutterSize={10}>
        <SplitterPanel className="p-d-flex">
          <LeftPane />
        </SplitterPanel>
        <SplitterPanel className="p-d-flex">
          <RightPane />
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