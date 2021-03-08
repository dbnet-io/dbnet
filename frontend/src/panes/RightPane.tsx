import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { TabNames } from "../components/TabNames";
import { TabToolbar } from "../components/TabToolbar";
import { TabEditor } from "../components/TabEditor";
import { TabTable } from "../components/TabTable";
import { useHookstate } from "@hookstate/core";
import {  globalState, store } from "../store/state";
import { jsonClone } from "../utilities/methods";

interface Props {}

export const RightPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////

  const tabId = useHookstate(globalState.session.selectedTabId)
  ///////////////////////////  EFFECTS  ///////////////////////////

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const TabPanel = () => {
    const tabIndex = store().session.tabs.get().map(t => t.id).indexOf(tabId.get()) || 0
    const tabs = useHookstate(globalState.session.tabs)
    const tab = tabs[tabIndex]

    return (
      <Splitter id="work-pane" layout="vertical" onResizeEnd={(e) => tabId.set(jsonClone(tabId.get()))}>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"110px"}}>
          <div id="work-input">
            <TabNames/>
            <TabEditor tab={tab}/>
          </div>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"100px"}}>
          <div id='result-panel'>
            
            <TabToolbar tab={tab}/>
            <TabTable 
              tab={tab}
            />
          </div>
        </SplitterPanel>
      </Splitter>
    )
  }

  return (
    <>
      <TabPanel/>
    </>
  );
};