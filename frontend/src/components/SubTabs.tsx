import * as React from "react";
import { none, State } from "@hookstate/core";
import { useHS } from "../store/state";
import { TabView,TabPanel, TabPanelHeaderTemplateOptions } from 'primereact/tabview';
import { createTabChild, getTabState } from "./TabNames";
import { ContextMenu } from "primereact/contextmenu";
import { jsonClone } from "../utilities/methods";
import { MenuItem } from "primereact/components/menuitem/MenuItem";
import { Tab } from "../state/tab";

const queryPanel = () => window.dbnet.state.queryPanel


// getChildTabs returns the child tabs of a tab
const getChildTabs = (tab: Tab) => {
  return queryPanel().tabs.get().filter(t => t.parent === tab.id && !t.hidden)
}

export function SubTabs(props: { tab: State<Tab>; }) {
  const childTab = useHS(getTabState(props.tab.selectedChild.get()))

  ///////////////////////////  HOOKS  ///////////////////////////
  const activeIndex = useHS(getChildTabs(props.tab?.get()).map(t => t.id).indexOf(childTab.id?.get()))
  const cm = React.useRef<ContextMenu>(null);
  const contextTabId = useHS('')

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const tabOptions = () => getChildTabs(props.tab.get())

  ///////////////////////////  JSX  ///////////////////////////

  const headerTemplate = (options: TabPanelHeaderTemplateOptions) => {
    let childTabId = tabOptions()[options.index].id
    let childTab = getTabState(childTabId)
    // let parentTab = getTabState(childTab.parent.get() as string)
    // let index = queryPanel.get().getTabIndexByID(childTabId)

    // we want the double click to pin / unpin
    return <>
      <span
        onDoubleClick={() => {
          childTab.pinned.set(v => !v) 
          props.tab.selectedChild.set(childTabId)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          contextTabId.set(jsonClone(childTabId))
          cm.current?.show(e as any)
        }}
      >
        {options.element}
      </span>
    </>
  }
  


  const menu = () : MenuItem[] => {
    let childTab = getTabState(jsonClone(contextTabId.get()))

    let items : MenuItem[] = [
      {
        label: childTab.get()?.pinned ? 'Unpin' : 'Pin',
        icon: 'pi pi-chevron-circle-down',
        command: () => {
          childTab.pinned.set(v => !v) 
          props.tab.selectedChild.set(childTab.get().id)
        }
      },
      {
        label: 'Close',
        icon: 'pi pi-times',
        command: () => {
          let parentTab = getTabState(childTab.get()?.parent as string)
          let selectTabID = childTab.get().id
          childTab.set(t => {
            t.pinned = false
            t.loading = false
            return t
          })

          if(tabOptions().length === 1) {
            selectTabID = createTabChild(parentTab.get()).id
            props.tab.selectedChild.set(selectTabID)
          } else {
            let oldIndex = queryPanel().get().getTabIndexByID(selectTabID)
            let index = tabOptions().map(t => t.id).indexOf(selectTabID)
            let newIndex = index === 0 ? 1 : index - 1

            // select other tab
            selectTabID = tabOptions()[newIndex].id
            props.tab.selectedChild.set(selectTabID)

            // delete old child tab
            queryPanel().tabs[oldIndex].set(none)
          }
        }
      },
      {
        separator: true
      },
    ]
    return items
  }

  return (
    <div>
      <ContextMenu model={menu()} ref={cm} onHide={() => {}} style={{fontSize:'11px'}}/>
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