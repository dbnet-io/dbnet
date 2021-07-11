import { Dialog } from "primereact/dialog";
import * as React from "react";
import { accessStore, useHS } from "../store/state";
import { MetaTablePanel } from "./MetaTablePanel";

const store = accessStore()

interface Props { }

export const PreviewPanel: React.FC<Props> = (props) => {
  const objectPanel = store.objectPanel
  const objectView = objectPanel.table
  ///////////////////////////  HOOKS  ///////////////////////////

  const show = useHS(objectPanel.show)
  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const header = <p style={{ marginTop: -20 }}>
    {/* <span
      style={{ fontFamily: 'monospace', fontSize: '16px', backgroundColor: 'white', color: 'blue' }}
      onDoubleClick={() => { copyToClipboard(objectView.name.get()) }}
    >
      <strong>{objectView.name.get()}</strong>
      <a href="#;" onClick={(e) => { copyToClipboard(objectView.name.get()) }}>
        <i className="pi pi-copy" style={{ 'fontSize': '0.9em' }}></i>
      </a>
    </span> */}
  </p>

  return (
    <Dialog
      id='preview-panel'
      header={header}
      visible={show.get()}
      modal={false}
      position="top-right"
      onHide={() => { show.set(false) }}
      style={{ width: '400px' }}
      closeOnEscape={false}
    >
      <MetaTablePanel />
    </Dialog>
  );
};
