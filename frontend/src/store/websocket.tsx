import { useState } from '@hookstate/core';
import React, { useCallback, useMemo, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { ObjectAny } from '../utilities/interfaces';
import { jsonClone, new_ts_id, toastError, toastInfo } from '../utilities/methods';
import { accessStore, useStoreWs } from './state';


export const sendWsMsg = (msg : Message) => {
  window.queue.send.push(msg)
  accessStore().ws.doRequest.set(v => v+1)
}

export const sendWsMsgWait = (msg : Message) : Promise<Message> => {
  return new Promise(function(resolve) {
    msg.callback = (data2: Message) => resolve(data2)
    window.queue.send.push(msg)
    accessStore().ws.doRequest.set(v => v+1)
  });
}

export interface WsQueue {
  receive: Message[]
  send: Message[]
}

export enum MsgType {
  Test = 'test',
  Error = 'error',
  SubmitSQL = 'submit-sql',
  CancelSQL = 'cancel-sql',
  GetConnections = 'get-connections',
  GetSchemata = 'get-schemata',
  GetSchemas = 'get-schemas',
  GetTables = 'get-tables',
  GetColumns = 'get-columns',
  GetAnalysisSql = 'get-analysis-sql',
  GetHistory = 'get-history',
  GetSQLRows = 'get-sql-rows',
  LoadSession = 'load-session',
  SaveSession = 'save-session',
}

export class Message {
  req_id: string
  type: MsgType
  data: ObjectAny
  error?: string
  orig_req_id?: string
  callback?: (data: Message) => void

  constructor(type: MsgType, data : ObjectAny = {}){
    this.req_id = new_ts_id(type+'.')
    this.type = type
    this.data = data
    if(data.callback) {
      this.callback = data.callback
    }
  }
}

interface Props {}

const socketOptions = {
  share: true,
  onOpen: (e: any) => {},
  // onMessage: (data: any) => {},
  shouldReconnect: (event: WebSocketEventMap['close']) => true,
  reconnectInterval: 3000,
  reconnectAttempts: 99,
}

// export const socketUrl = window.location.origin.replace("http", "ws") + '/ws/client'
const socketUrl = 'ws://localhost:5987/ws'

export const Websocket: React.FC<Props> = (props) => {
  const ws = useStoreWs()
  const doRequest = useState(ws.doRequest)

  const {
    sendMessage,
    lastJsonMessage,
    readyState,
  } = useWebSocket(socketUrl, socketOptions);


  const handleMsg = () => {
    let msg = lastJsonMessage as Message
    if(msg && msg.orig_req_id && (msg.orig_req_id in window.callbacks)) {
      window.callbacks[msg.orig_req_id](msg)
      delete window.callbacks[msg.orig_req_id]
    }
  };

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  const connected = readyState === ReadyState.OPEN

  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useMemo(handleMsg, [lastJsonMessage]);
  React.useEffect(() => {
    ws.connected.set(connected)
    if(connected) {
      accessStore().ws.doRequest.set(v => v+1)
    }
  }, [connected])

  React.useMemo(() => {
    let queue : Message[] = []

    const send = (req: Message) => { 
      if(!connected) { 
        console.log('queuing '+req.req_id)
        queue.push(req)
        return
      }

      if(req && req.type) { 
        if(req.callback) { 
          window.callbacks[req.req_id] = req.callback
        }
        sendMessage(JSON.stringify(req))
      }
    }

    while (window.queue.send.length > 0) {
      let msg = window.queue.send.shift()
      if(msg) send(msg)
    }

    for(let msg of queue) {
      window.queue.send.push(msg)
    }

  }, [doRequest.get()])

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return <></>;
};