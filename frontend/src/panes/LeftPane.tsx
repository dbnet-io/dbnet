import * as React from "react";
import { SelectButton } from "primereact/selectbutton";
import { globalState, store, useHookState } from "../store/state";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { HistoryPanel } from "../components/HistoryPanel";
import { SchemaPanel } from "../components/SchemaPanel";
import { MetaTablePanel } from "../components/MetaTablePanel";

interface Props {}

export const LeftPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const tabOptions = useHookState<string[]>(['Schema', 'Object', 'History'])
  const tabValue = useHookState(store().session.selectedMetaTab)
  const objectView = useHookState(globalState.session.objectView)

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////


  ///////////////////////////  JSX  ///////////////////////////

  return (
    <div className="p-grid p-fluid">
      <div className="p-col-12 p-md-4">
        <SelectButton
          value={tabValue.get()}
          options={tabOptions.get()}
          onChange={(e) => {
            tabValue.set(e.value)
          }}
          style={{width: '100%'}}
        />
      </div>
      <Splitter id="control-pane" layout="vertical" gutterSize={1}>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">

          { 
            tabValue.get() === "Object" ?
            <MetaTablePanel objectView={objectView}/> : null
          }

          { 
            tabValue.get() === "Schema" ?
            <SchemaPanel/> : null
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