import * as React from "react";
import { SelectButton } from "primereact/selectbutton";
import { accessStore, useHS } from "../store/state";
import { HistoryPanel } from "../components/HistoryPanel";
import { SchemaPanel } from "../components/SchemaPanel";
import { MetaTablePanel } from "../components/MetaTablePanel";
import { useState } from "@hookstate/core";
import { ProjectPanel } from "../components/ProjectPanel";

const store = accessStore()

interface Props {}


export const LeftPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const tabOptions = useState<string[]>(['Files', 'Schema', 'Object', 'History'])
  const tabValue = useHS(store.workspace.selectedMetaTab)
  // const tabValue = useStore().selectedMetaTab

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////


  ///////////////////////////  JSX  ///////////////////////////

  return (
    <div className="p-grid p-fluid" style={{padding:'8px', border:'3px'}}>
      <div className="p-col-12 p-md-12" style={{maxHeight:'52px'}}>
        <SelectButton
          id="left-pane-select"
          value={tabValue.get()}
          options={tabOptions.get()}
          onChange={(e) => {
            if(!e.value) { return }
            tabValue.set(e.value)
          }}
          style={{width: '100%', fontSize: '12px'}}
        />
      </div>
      <div className="p-col-12 p-md-12" style={{paddingTop: '0px'}}>
          { 
            tabValue.get() === "Files" ?
            <ProjectPanel/> : null
          }
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
      </div>

    </div>
  );
};