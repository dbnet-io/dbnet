import * as React from "react";
import { store, Tab } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { Message, MsgType } from "../store/websocket";



export function TabToolbar(props: { tab: State<Tab>; }) {
  const tab = props.tab;

  const submitSQL = () => {
    let data = {
      query: tab.query.text.get()
    }
    store().ws.doRequest.set(new Message(MsgType.Test, data))
  }

  return (
    <div id='query-toolbar' className="p-grid" style={{ paddingTop: '3px', paddingLeft: '4px', paddingRight: '4px' }}>
      <div className="p-col-12">
        <div className="work-buttons p-inputgroup" style={{ fontFamily: 'monospace' }}>
          <Button
            icon="pi pi-play"
            tooltip="Execute query"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-primary"
            onClick={(e) => {
              tab.loading.set(true);
              submitSQL()
              setTimeout(
                () => tab.loading.set(false),
                1000);
            }} />

          <Button
            icon="pi pi-refresh"
            tooltip="Refresh results"
            tooltipOptions={{ position: 'top' }}
            className="p-button-sm p-button-info"
            onClick={(e) => {
              tab.loading.set(true);
              tab.query.headers.set(h => h.concat("name"));
              setTimeout(
                () => tab.loading.set(false),
                1000);
            }} />

          <Button icon="pi pi-clock" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Refresh results @ interval" tooltipOptions={{ position: 'top' }} />

          <Button icon="pi pi-search-plus" tooltip="Row Viewer" className="p-button-sm p-button-outlined p-button-secondary" tooltipOptions={{ position: 'top' }} />
          <Button label="Text" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Show as text" tooltipOptions={{ position: 'top' }} />
          <InputText
            id="table-filter"
            className="p-inputtext-sm"
            placeholder="Filter rows..."
            value={tab.filter.get()}
            style={{ fontFamily: 'monospace' }}
            onChange={(e) => { tab.filter.set((e.target as HTMLInputElement).value); }} />

          <Button label="Headers" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Copy Headers" tooltipOptions={{ position: 'top' }} />
          <Button icon="pi pi-copy" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Copy to clipboard" tooltipOptions={{ position: 'top' }} />
          <Button icon="pi pi-file-excel" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Export to CSV or Excel" tooltipOptions={{ position: 'top' }} />
          <span className="p-inputgroup-addon">{tab.query.rows.length} rows</span>
          <span className="p-inputgroup-addon">{tab.query.duration.get()} sec</span>
        </div>
      </div>
    </div>);
}
