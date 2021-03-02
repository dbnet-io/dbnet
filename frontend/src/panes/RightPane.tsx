import * as React from "react";
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { TabNames } from "../components/TabNames";
import { TabToolbar } from "../components/TabToolbar";
import { TabEditor } from "../components/TabEditor";
import { TabTable } from "../components/TabTable";
import { useHookstate } from "@hookstate/core";
import {  useGlobalState } from "../store/state";

interface Props {}

export const RightPane: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const TabPanel = () => {
    const state = useGlobalState()
    const tabName = state.session.selectedTab.get()
    const tabIndex = state.session.get().getTabIndex(tabName)
    const tab = state.session.tabs[tabIndex]

    return (
      <Splitter id="work-pane" layout="vertical">
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "hidden", height: "200px", minHeight:"110px"}}>
          <div id="work-input">
            <TabNames/>
            <TabEditor tab={tab}/>
          </div>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex p-ai-center p-jc-center" style={{overflowY: "scroll", height: "200px", minHeight:"100px"}}>
          <div>
            
          <TabToolbar tab={tab}/>
          <TabTable loading={tab.loading} headers={tab.query.headers} rows={tab.query.rows}/>
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