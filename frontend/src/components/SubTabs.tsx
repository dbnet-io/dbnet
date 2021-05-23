import { State } from "@hookstate/core";
import * as React from "react";
import { Tab } from "../store/state";
import { TabView,TabPanel, TabPanelHeaderTemplateOptions } from 'primereact/tabview';
import { toastInfo } from "../utilities/methods";
 

export function SubTabs(props: { tab: State<Tab>; }) {
  ///////////////////////////  HOOKS  ///////////////////////////
  const [activeIndex, setActiveIndex] = React.useState(0);

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const headerTemplate = (options: TabPanelHeaderTemplateOptions) => {
    // we want the double click to pin / unpin
    return <>
      <span onDoubleClick={() => toastInfo('hello')}>
        {options.element}
      </span>
    </>
  }
  
  return (
    <div>
      <TabView id="sub-tabs" className="tabview-custom" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)} style={{fontSize: '14px'}}>
        <TabPanel header="Query 1" headerTemplate={headerTemplate}/>
        <TabPanel header="Query 2"/>
        <TabPanel header="Query 3"/>
      </TabView>
    </div>
  );
};