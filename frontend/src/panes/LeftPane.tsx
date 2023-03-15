import * as React from "react";
import { SelectButton } from "primereact/selectbutton";
import { useHS } from "../store/state";
import { HistoryPanel } from "../components/HistoryPanel";
import { SchemaPanel } from "../components/SchemaPanel";
import { useState } from "@hookstate/core";
import { Splitter, SplitterPanel } from "primereact/splitter";
import { MetaTablePanel } from "../components/MetaTablePanel";
import { WorkPanel } from "../components/WorkPanel";

interface Props {}


export const LeftPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const tabOptions = useState<string[]>(['Work', 'Schema', 'History'])
  const tabValue = useHS(window.dbnet.state.workspace.selectedMetaTab)
  // const tabValue = useStore().selectedMetaTab

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////


  ///////////////////////////  JSX  ///////////////////////////

  return (
    <Splitter
      id="left-pane"
      layout="vertical"
      stateKey='left-splitter'
      stateStorage='local'
      onResizeEnd={(e) => { 
        window.dbnet.state.settingState.leftPaneRatio.set(e.sizes)
        tabValue.set(tabValue.get())
      }}
    >
      <SplitterPanel className="p-d-flex" style={{overflowY: "scroll", overflowX: 'hidden', minHeight:"110px"}}>
        <div className="p-grid p-fluid" style={{padding:'5px', border:'3px'}}>
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
          <div className="p-col-12 p-md-12" style={{paddingTop: '0px', paddingBottom: '0px'}}>
              { 
                tabValue.get() === "Work" ?
                <WorkPanel/> : null
              }
              { 
                tabValue.get() === "Schema" ?
                <SchemaPanel/>: null
              }

              {/* { 
                tabValue.get() === "Object" ?
                <MetaTablePanel/> : null
              } */}

              { 
                tabValue.get() === 'History' ?
                <HistoryPanel/> : null
              }
          </div>

        </div>
      </SplitterPanel>
      <SplitterPanel className="p-d-flex" style={{overflowY: "scroll", overflowX: 'hidden', minHeight:"110px", maxHeight:"610px"}} >
        <MetaTablePanel/>
      </SplitterPanel>
    </Splitter>
    
  );
};