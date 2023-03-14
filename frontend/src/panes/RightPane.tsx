import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { getResultState, getTabState, TabNames } from "../components/TabNames";
import { TabToolbar } from "../components/TabToolbar";
import { TabEditor } from "../components/TabEditor";
import { TabTable } from "../components/TabTable";
import { useHS } from "../store/state";
import { jsonClone } from "../utilities/methods";
import { SubTabs } from "../components/SubTabs";

interface Props {}

export const RightPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////

  const tabId = useHS(window.dbnet.state.queryPanel.selectedTabId)
  ///////////////////////////  EFFECTS  ///////////////////////////

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const TabPanel = () => {
    const tab = useHS(getTabState(tabId?.get()))
    const resultTab = useHS(getResultState(tab.selectedResult?.get()))

    return (
      <Splitter id="work-pane" layout="vertical" onResizeEnd={(e) => tabId.set(jsonClone(tabId?.get()))}>
        <SplitterPanel className="p-d-flex" style={{overflowY: "scroll", height: "200px", minHeight:"110px"}}>
          <div id="work-input" style={{padding: '8px', width: '100%'}}>
            <TabNames/>
            <TabEditor tab={tab}/>
          </div>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex" style={{overflowY: "scroll", height: "200px", minHeight:"100px"}}>
          <div id='result-panel' style={{paddingLeft: '8px', paddingTop: '3px', width: '100%'}}>
            
            <SubTabs tab={tab}/>
            <TabToolbar result={resultTab}/>
            <TabTable result={resultTab}/>
            
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