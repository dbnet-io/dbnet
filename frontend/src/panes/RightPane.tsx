import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { getTabState, TabNames } from "../components/TabNames";
import { TabToolbar } from "../components/TabToolbar";
import { TabEditor } from "../components/TabEditor";
import { TabTable } from "../components/TabTable";
import { accessStore, useHS, useStoreQueryPanel } from "../store/state";
import { jsonClone } from "../utilities/methods";
import { SubTabs } from "../components/SubTabs";

interface Props {}

const queryPanel = accessStore().queryPanel

export const RightPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////

  const tabId = useStoreQueryPanel().selectedTabId
  ///////////////////////////  EFFECTS  ///////////////////////////

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const TabPanel = () => {
    const tab = useHS(getTabState(tabId.get()))
    const childTab = useHS(getTabState(tab.selectedChild.get()))
    const aceEditor = React.useRef(null);

    return (
      <Splitter id="work-pane" layout="vertical" onResizeEnd={(e) => tabId.set(jsonClone(tabId.get()))}>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"110px"}}>
          <div id="work-input" style={{padding: '8px'}}>
            <TabNames/>
            <TabEditor aceEditor={aceEditor} tab={tab}/>
          </div>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"100px"}}>
          <div id='result-panel' style={{paddingLeft: '8px', paddingTop: '3px'}}>
            
            <SubTabs tab={tab}/>
            <TabToolbar aceEditor={aceEditor} tab={childTab}/>
            <TabTable tab={childTab}/>
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