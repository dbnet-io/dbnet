import { State } from "@hookstate/core";
import * as React from "react";
import { accessStore, Tab, useHS } from "../store/state";
import { TabView,TabPanel, TabPanelHeaderTemplateOptions } from 'primereact/tabview';
import { toastInfo } from "../utilities/methods";
import { getTabState } from "./TabNames";

const queryPanel = accessStore().queryPanel 


// getChildTabs returns the child tabs of a tab
const getChildTabs = (tab: Tab) => {
  return queryPanel.tabs.get().filter(t => t.parent === tab.id)
}

export function SubTabs(props: { tab: State<Tab>; }) {
  const childTab = getTabState(props.tab.selectedChild.get())

  ///////////////////////////  HOOKS  ///////////////////////////
  const activeIndex = useHS(getChildTabs(props.tab.get()).map(t => t.id).indexOf(childTab.id.get()))

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const tabOptions = () => getChildTabs(props.tab.get())

  ///////////////////////////  JSX  ///////////////////////////

  const headerTemplate = (options: TabPanelHeaderTemplateOptions) => {
    let childTabId = tabOptions()[options.index].id
    let childTab = getTabState(childTabId)

    // we want the double click to pin / unpin
    return <>
      <span
        onDoubleClick={() => {
          childTab.pinned.set(v => !v) 
          props.tab.selectedChild.set(childTabId)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          childTab.pinned.set(v => !v) 
          props.tab.selectedChild.set(childTabId)
        }}
      >
        {options.element}
      </span>
    </>
  }
  
  return (
    <div>
      <TabView
        id="sub-tabs"
        className="tabview-custom"
        activeIndex={activeIndex.get()}
        onTabChange={(e) => {
          let childTabId = tabOptions()[e.index].id
          props.tab.selectedChild.set(childTabId)
          activeIndex.set(e.index)
        }}
        style={{fontSize: '14px'}}
      >
        {
          tabOptions().map(
            t => {
              return <TabPanel 
                key={t.id}
                header={t.id.slice(-7)}
                leftIcon={t.loading? "pi pi-spin pi-spinner" : t.pinned ? "pi pi-chevron-circle-down" : ''}
                headerTemplate={headerTemplate}
              />
            }
          )
        }
      </TabView>
    </div>
  );
};