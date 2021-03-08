import { State, useHookstate } from '@hookstate/core';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { ObjectAny } from '../utilities/interfaces';
import { jsonClone, new_ts_id, toastError, toastInfo } from '../utilities/methods';
import { globalState, store } from './state';

export const sendWsMsg = (msg : Message) => {
  store().ws.doRequest.set(msg)
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

interface Props {
  onMessageType: [MsgType[], (msg: Message) => void]
}

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
  const doRequest = useHookstate(globalState.ws.doRequest)
  const messageHistory = useRef([]);

  const {
    sendMessage,
    lastJsonMessage,
    readyState,
  } = useWebSocket(socketUrl, socketOptions);

  messageHistory.current = useMemo(
    () => messageHistory.current.concat(lastJsonMessage)
  ,[lastJsonMessage]);

  const handleMsg = () => {
    let msg = lastJsonMessage as Message
    if(msg && msg.orig_req_id && (msg.orig_req_id in window.callbacks)) {
      window.callbacks[msg.orig_req_id](msg)
      delete window.callbacks[msg.orig_req_id]
    }
    if(msg && msg.type && props.onMessageType[0].includes(msg.type)) {
      props.onMessageType[1](msg)
    }
    store().ws.queue.received.set(r => r.concat([msg]))
    // console.log(store().ws.queue.received.length)
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
    if(connected) {
      while(window.queue.send.length > 0) {
        let msg = window.queue.send.shift()
        if(msg) { sendWsMsg(msg) }
      }
    }
  }, [connected])

  React.useMemo(() => {
    if(!doRequest || Object.keys(doRequest).length === 0) { return }
    let req = doRequest.get()

    if(!connected) { 
      console.log('queuing '+req.req_id)
      window.queue.send.push(jsonClone<Message>(req))
      return
    }

    if(req && req.type) { 
      if(req.callback) { 
        window.callbacks[req.req_id] = req.callback
      }
      sendMessage(JSON.stringify(req))
      doRequest.set({} as Message)
    }
  }, [doRequest.get()])

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return <></>;
};