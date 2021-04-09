import * as React from "react";
import './TabTable.css'
import { Session, Query, QueryStatus, store, Tab } from "../store/state";
import { State } from "@hookstate/core";
import { jsonClone, toastError, toastInfo } from "../utilities/methods";
import { Message, MsgType } from "../store/websocket";
import { useState } from "@hookstate/core";
import _ from "lodash";

import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.css';

interface Props {
  session: State<Session>
  tab: State<Tab>
}

export const fetchRows = (tab: State<Tab>) => {
  if(tab.query.status.get() === QueryStatus.Completed) { return toastInfo('No more rows.') }

  let tab_ = tab
  const session = store().session
  let data = {
    id: tab.query.id.get(),
    conn: tab.query.conn.get(),
    text: tab.query.text.get(),
    time: (new Date()).getTime(),
    tab: tab.id.get(),
    limit: tab.limit.get(),
    callback: (msg: Message) => {
      if(msg.error) { 
        toastError(msg.error)
        return tab_.loading.set(false)
      }
      let query = msg.data as Query
      let index = session.get().getTabIndexByID(query.tab)
      let tab = session.tabs[index]
      tab.set(
        t => {
          t.query.status = query.status
          t.query.rows = t.query.rows.concat(query.rows)
          t.loading = false
          return t
        }
      )
    }
  }

  store().ws.doRequest.set(new Message(MsgType.GetSQLRows, data))
  tab.loading.set(true);
}

const debounceFetchRows = _.debounce((tab: State<Tab>) => fetchRows(tab), 400)

const data = [
  // ["", "Ford", "Volvo", "Toyota", "Honda"],
  ["2016", 10, 11, 12, 13],
  ["2017", 20, 11, 14, 13],
  ["2018", 30, 15, 12, 13]
];

const settings = {
  // colHeaders: ["Year", "Ford", "Volvo", "Toyota", "Honda"],
  // columns: columnDefs,
  rowHeaders: true,
  // stretchH: 'all',
  // width: 806,
  // autoWrapRow: false,
  preventOverflow: 'horizontal',
  wordWrap: false,
  // height: 441,
  // maxRows: 50,,
  columnSorting: true,
  sortIndicator: true,
  renderAllRows: false,
  autoColumnSize: {
    samplingRatio: 23
  },
  search: true,
  contextMenu: false,
  // fixedColumnsLeft: 2,
  manualColumnResize: true,
  modifyColWidth: function (width: number, col: number) {
    if (width > 250) {
      return 250
    }
  },
  viewportColumnRenderingOffset: 20,
  viewportRowRenderingOffset: 20,
}

export const TabTable: React.FC<Props> = (props) => {
  const resultHeight = document.getElementById("result-panel")?.parentElement?.clientHeight
  const tableHeight = !resultHeight || resultHeight < 400 ? 400 : resultHeight-38

  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return (
    <div style={{fontSize:'11.5px'}}>    
      <HotTable
        data={props.tab.query.rows.get()}
        colHeaders={props.tab.query.headers.get()}
        rowHeaders={true}
        // width={600}
        height={tableHeight}
        stretchH="all"
        settings={settings}
      />
    </div>
  );
}