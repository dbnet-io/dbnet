import * as React from "react";
import { SelectButton } from "primereact/selectbutton";
import { useHookState } from "../store/state";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { HistoryView } from "../components/HistoryView";
import { SchemaTree } from "../components/SchemaTree";

interface Props {}

export const ControlPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const tabOptions = useHookState<string[]>(['Schema', 'History'])
  const tabValue = useHookState(tabOptions.get()[0])

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////


  ///////////////////////////  JSX  ///////////////////////////
  return (
    <div>
      <SelectButton
        value={tabValue.get()}
        options={tabOptions.get()}
        onChange={(e) => {
          tabValue.set(e.value)
        }}
        style={{width: '100%'}}
      />
      <Splitter style={{height: '450px'}} layout="vertical">
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">

          { 
            tabValue.get() === "Schema" ?
            <SchemaTree/> : null
          }

          { 
            tabValue.get() === 'History' ?
            <HistoryView/> : null
          }
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center">
            Panel 2
        </SplitterPanel>
      </Splitter>

    </div>
  );
};