import * as React from "react";
import { SelectButton } from "primereact/selectbutton";
import { useStoreApp } from "../store/state";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { HistoryPanel } from "../components/HistoryPanel";
import { SchemaPanel } from "../components/SchemaPanel";
import { MetaTablePanel } from "../components/MetaTablePanel";
import { State, useState } from "@hookstate/core";


interface Props {}


export const LeftPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const tabOptions = useState<string[]>(['Schema', 'Object', 'History'])
  const tabValue = useStoreApp().selectedMetaTab
  // const tabValue = useStore().selectedMetaTab

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////


  ///////////////////////////  JSX  ///////////////////////////

  return (
    <div className="p-grid p-fluid" style={{padding:'8px', border:'3px'}}>
      <div className="p-col-12 p-md-4">
        <SelectButton
          value={tabValue.get()}
          options={tabOptions.get()}
          onChange={(e) => {
            if(!e.value) { return }
            tabValue.set(e.value)
          }}
          style={{width: '100%'}}
        />
      </div>
      <Splitter id="control-pane" layout="vertical" gutterSize={1}>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">

          { 
            tabValue.get() === "Schema" ?
            <SchemaPanel/> : null
          }

          { 
            tabValue.get() === "Object" ?
            <MetaTablePanel/> : null
          }

          { 
            tabValue.get() === 'History' ?
            <HistoryPanel/> : null
          }
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
          {/* <div> Panel 2</div> */}
        </SplitterPanel>
      </Splitter>

    </div>
  );
};