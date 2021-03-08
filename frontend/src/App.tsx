import React, { RefObject, useRef } from 'react';
import logo from './primereact-logo.png';
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
import { Query, store, useHookState } from './store/state';
import { jsonClone, toastError } from './utilities/methods';
import { JSpreadsheet, ObjectAny, RecordsData } from './utilities/interfaces';
import _ from "lodash";
import { TopMenuBar } from './components/TopMenuBar';

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
  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(()=> {
    // init load session

    // get all schema objects
    let data = {
      conn: store().session.conn.name.get(),
      callback: loadSchemata,
    }
    sendWsMsg(new Message(MsgType.GetSchemata, data))
  }, [])
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const refresh = () => store().session.selectedTabId.set(jsonClone(store().session.selectedTabId.get()))
  const debounceRefresh = _.debounce(() => refresh(), 400)

  const onMsgTypes = [MsgType.SubmitSQL, MsgType.GetSQLRows]
  const handleMsg = (msg: Message) => {}
  const loadSchemata = (msg: Message) => {
    if(msg.error) { return toastError(msg.error) }

  }

  ///////////////////////////  JSX  ///////////////////////////





  return (
    <div className="App">
      <Toast ref={toast}/>
      <Websocket
        onMessageType={[onMsgTypes, handleMsg]}
      />
      <TopMenuBar/>
      <Splitter style={{height: splitterHeight}} className="p-mb-5" stateKey={"splitter"} stateStorage={"local"}  onResizeEnd={(e) => debounceRefresh() }>
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

