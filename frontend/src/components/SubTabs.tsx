import * as React from "react";
import { none, State } from "@hookstate/core";
import { useHS } from "../store/state";
import { TabView,TabPanel, TabPanelHeaderTemplateOptions } from 'primereact/tabview';
import { createTabResult, getResultState, getTabState } from "./TabNames";
import { ContextMenu } from "primereact/contextmenu";
import { jsonClone } from "../utilities/methods";
import { Tab } from "../state/tab";
import { MenuItem } from "primereact/menuitem";

const queryPanel = () => window.dbnet.state.queryPanel


// getChildTabs returns the child tabs of a tab
const getResultTabs = (tab: Tab) => {
  return queryPanel().results.get().filter(t => t.parent === tab.id)
}

export function SubTabs(props: { tab: State<Tab>; }) {
  const resultTab = useHS(getResultState(props.tab.selectedResult.get()))

  ///////////////////////////  HOOKS  ///////////////////////////
  const activeIndex = useHS(getResultTabs(props.tab?.get()).map(r => r.id).indexOf(resultTab.id?.get()))
  const cm = React.useRef<ContextMenu>(null);
  const contextResultId = useHS('')

  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    activeIndex.set(
      getResultTabs(props.tab?.get())
        .map(r => r.id)
        .indexOf(resultTab.id?.get())
    )
  }, [props.tab.selectedResult.get()]) // eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const resultOptions = () => getResultTabs(props.tab.get())

  ///////////////////////////  JSX  ///////////////////////////

  const headerTemplate = (options: TabPanelHeaderTemplateOptions) => {
    let resultTabId = resultOptions()[options.index].id
    let resultTab = getResultState(resultTabId)
    // let parentTab = getTabState(resultTab.parent.get() as string)
    // let index = queryPanel.get().getTabIndexByID(resultTabId)

    // we want the double click to pin / unpin
    return <>
      <span
        onDoubleClick={() => {
          resultTab.pinned.set(v => !v) 
          props.tab.selectedResult.set(resultTabId)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          contextResultId.set(jsonClone(resultTabId))
          cm.current?.show(e as any)
        }}
      >
        {options.element}
      </span>
    </>
  }
  


  const menu = () : MenuItem[] => {
    let resultTab = getResultState(jsonClone(contextResultId.get()))

    let items : MenuItem[] = [
      {
        label: resultTab.get()?.pinned ? 'Unpin' : 'Pin',
        icon: 'pi pi-chevron-circle-down',
        command: () => {
          resultTab.pinned.set(v => !v) 
          props.tab.selectedResult.set(resultTab.get().id)
        }
      },
      {
        label: 'Close',
        icon: 'pi pi-times',
        command: () => {
          let parentTab = getTabState(resultTab.get()?.parent as string)
          let selectResultID = resultTab.get().id
          resultTab.set(t => {
            t.pinned = false
            t.loading = false
            return t
          })

          if(resultOptions().length === 1) {
            selectResultID = createTabResult(parentTab.get()).id
          } else {
            let oldIndex = queryPanel().get().getResultIndexByID(selectResultID)
            let index = resultOptions().map(r => r.id).indexOf(selectResultID)
            let newIndex = index === 0 ? 1 : index - 1

            // select other tab
            selectResultID = resultOptions()[newIndex].id
            props.tab.selectedResult.set(selectResultID)

            // delete old child tab
            queryPanel().results[oldIndex].set(none)
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
    <div id='sub-tabs-container'>
      <ContextMenu model={menu()} ref={cm} onHide={() => {}} style={{fontSize:'11px'}}/>
      <TabView
        id="sub-tabs"
        className="tabview-custom"
        activeIndex={activeIndex.get()}
        onTabChange={(e) => {
          let resultTabId = resultOptions()[e.index].id
          props.tab.selectedResult.set(resultTabId)
          activeIndex.set(e.index)
        }}
        style={{fontSize: '14px'}}
      >
        {
          resultOptions().map(
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