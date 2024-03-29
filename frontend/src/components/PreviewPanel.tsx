import { Dialog } from "primereact/dialog";
import * as React from "react";
import { useHS } from "../store/state";
import { MetaTablePanel } from "./MetaTablePanel";

interface Props { }

export const PreviewPanel: React.FC<Props> = (props) => {
  const objectPanel = window.dbnet.state.objectPanel
  
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
      <a href={window.location.hash} onClick={(e) => { copyToClipboard(objectView.name.get()) }}>
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
      position="bottom-left"
      onHide={() => { show.set(false) }}
      style={{ width: '350px' }}
      closeOnEscape={false}
    >
      <MetaTablePanel />
    </Dialog>
  );
};
