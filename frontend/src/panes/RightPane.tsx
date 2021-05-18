import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { TabNames } from "../components/TabNames";
import { TabToolbar } from "../components/TabToolbar";
import { TabEditor } from "../components/TabEditor";
import { fetchRows, TabTable } from "../components/TabTable";
import { accessStore, useStoreQueryPanel } from "../store/state";
import { jsonClone } from "../utilities/methods";

interface Props {}

const queryPanel = accessStore().queryPanel

export const RightPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////

  const tabId = useStoreQueryPanel().selectedTabId
  ///////////////////////////  EFFECTS  ///////////////////////////

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const TabPanel = () => {
    const tabIndex = queryPanel.tabs.get().map(t => t.id).indexOf(tabId.get()) || 0
    const tabs = useStoreQueryPanel().tabs
    const tab = tabs[tabIndex]

    // React.useEffect(() => {
    //   if(tab.query.status.get() && !tab.query.pulled.get()) fetchRows(tab)
    // }, [tabId.get()])

    return (
      <Splitter id="work-pane" layout="vertical" onResizeEnd={(e) => tabId.set(jsonClone(tabId.get()))}>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"110px"}}>
          <div id="work-input" style={{padding: '8px'}}>
            <TabNames/>
            <TabEditor tab={tab}/>
          </div>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"100px"}}>
          <div id='result-panel' style={{paddingLeft: '8px', paddingTop: '3px'}}>
            
            <TabToolbar tab={tab}/>
            <TabTable tab={tab}/>
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