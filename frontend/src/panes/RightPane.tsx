import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { getTabState, TabNames } from "../components/TabNames";
import { TabToolbar } from "../components/TabToolbar";
import { TabEditor } from "../components/TabEditor";
import { TabTable } from "../components/TabTable";
import { useHS, accessStore } from "../store/state";
import { jsonClone } from "../utilities/methods";
import { SubTabs } from "../components/SubTabs";
import { DbNet } from "../state/dbnet";

interface Props {
  dbnet: DbNet
}

export const RightPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////

  // const queryPanel = useHS(accessStore().queryPanel)
  const queryPanel = accessStore().queryPanel
  const tabId = queryPanel.selectedTabId
  ///////////////////////////  EFFECTS  ///////////////////////////

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const TabPanel = () => {
    const tab = useHS(getTabState(tabId?.get()))
    const childTab = useHS(getTabState(tab.selectedChild?.get()))
    const aceEditor = React.useRef(null);
    const hotTable = React.useRef(null);

    return (
      <Splitter id="work-pane" layout="vertical" onResizeEnd={(e) => tabId.set(jsonClone(tabId?.get()))}>
        <SplitterPanel className="p-d-flex" style={{overflowY: "scroll", height: "200px", minHeight:"110px"}}>
          <div id="work-input" style={{padding: '8px', width: '100%'}}>
            <TabNames dbnet={props.dbnet}/>
            <TabEditor aceEditor={aceEditor} tab={tab}/>
          </div>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex" style={{overflowY: "scroll", height: "200px", minHeight:"100px"}}>
          <div id='result-panel' style={{paddingLeft: '8px', paddingTop: '3px', width: '100%'}}>
            
            <SubTabs tab={tab}/>
            <TabToolbar aceEditor={aceEditor} hotTable={hotTable} tab={childTab}/>
            <TabTable tab={childTab} hotTable={hotTable} dbnet={props.dbnet}/>
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