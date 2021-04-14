import { Dialog } from "primereact/dialog";
import * as React from "react";
import { useStoreObjectPanel } from "../store/state";
import { copyToClipboard } from "../utilities/methods";
import { MetaTablePanel } from "./MetaTablePanel";

interface Props {}

export const PreviewPanel: React.FC<Props> = (props) => {
  const objectView = useStoreObjectPanel().table
  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  
  const header = <p style={{margin:0}}>
    <span
      style={{fontFamily: 'monospace', fontSize: '16px', backgroundColor: 'white', color:'blue'}}
      onDoubleClick={() => { copyToClipboard(objectView.name.get()) }}
    >
      <strong>{objectView.name.get()}</strong>
      <a onClick={(e) => {copyToClipboard(objectView.name.get())}}>
        <i className="pi pi-copy" style={{'fontSize': '0.9em'}}></i>
      </a>
    </span>
  </p>

  return (
    <Dialog 
      header={header}
      visible={objectView.show.get()}
      modal={false}
      position="right"
      onHide={()=>{ objectView.show.set(false) }}
      style={{width: '400px'}}
      closeOnEscape={false}
    >
      <MetaTablePanel/>
    </Dialog>
  );
};
      