import { State } from '@hookstate/core';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { ObjectAny } from '../utilities/interfaces';
import { new_ts_id } from '../utilities/methods';

export enum MsgType {
  Test = 'test',
  SubmitSQL = 'submit-sql',
  CancelSQL = 'cancel-sql',
  GetConnections = 'get-connections',
  GetSchemas = 'get-schemas',
  GetTables = 'get-tables',
  GetColumns = 'get-columns',
  GetAnalysisSql = 'get-analysis-sql',
  GetHistory = 'get-history'
}

export class Message {
  req_id: string
  type: MsgType
  data: ObjectAny
  error?: string
  orig_req_id?: string

  constructor(type: MsgType, data : ObjectAny = {}){
    this.req_id = new_ts_id(type+'.')
    this.type = type
    this.data = data
  }
}

interface Props {
  onMessageType: [MsgType[], (msg: Message) => void]
  doRequest?:  State<Message>
}

const socketOptions = {
  share: true,
  onOpen: (e: any) => {},
  // onMessage: (data: any) => {},
  shouldReconnect: (event: WebSocketEventMap['close']) => true,
  reconnectInterval: 3000,
  reconnectAttempts: 99,
}

export const Websocket: React.FC<Props> = (props) => {
  const [socketUrl, setSocketUrl] = useState('wss://echo.websocket.org');
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
    if(msg && msg.type && props.onMessageType[0].includes(msg.type)) {
      props.onMessageType[1](msg)
    }
  };

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useMemo(handleMsg, [lastJsonMessage]);
  React.useEffect(() => {
    // const int = setInterval(
    //   () => {
    //     sendMessage(JSON.stringify({type: 'test', data: {text: 'hello'}}))
    //   }, 1000
    // )
    // return () => { clearInterval(int) }
  }, [])

  React.useMemo(() => {
    if(!props.doRequest) { return }
    let req = props.doRequest.get()
    if(req && req.type) { sendMessage(JSON.stringify(req)) }
  }, [props.doRequest?.get()])

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return <></>;
};