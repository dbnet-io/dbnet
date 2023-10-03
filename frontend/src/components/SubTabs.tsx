import * as React from "react";
import { none, State } from "@hookstate/core";
import { useHS } from "../store/state";
import { TabView,TabPanel, TabPanelHeaderTemplateOptions } from 'primereact/tabview';
import { createTabResult, getResultState, getTabState } from "./TabNames";
import { ContextMenu } from "primereact/contextmenu";
import { jsonClone, toastError } from "../utilities/methods";
import { Tab } from "../state/tab";
import { MenuItem } from "primereact/menuitem";
import { Tooltip } from "primereact/tooltip";
import { InputText } from "primereact/inputtext";

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
  const nameEdit = useHS({ id: '', name: '' })

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
    let id = `result-tab-${resultTabId.replaceAll('.', '-')}`

    if (nameEdit.id.get() === resultTabId) { // for editing the tab
      let editTab = resultTab
      const onKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          let newName = jsonClone(nameEdit.name.get()) as string
          if (resultOptions().filter(t => t.id !== resultTabId).map(t => t.name).includes(newName)) {
            return toastError(`Result Tab exists with name: ${newName}`)
          }
          editTab.name.set(jsonClone(nameEdit.name.get()))
          nameEdit.set({ id: '', name: '' })
        }
      }
      return <>
        <InputText
          style={{ fontSize: '11px' }}
          value={nameEdit.name.get()}
          onChange={(e) => nameEdit.name.set(e.target.value)}
          onKeyUp={onKeyPress}
          autoFocus
        />
      </>
    }

    return <>
        <Tooltip
          target={`#${id}`}
          style={{fontSize: '10px', fontFamily: 'monospace', minWidth: '230px', maxWidth: '400px', maxHeight: '400px', overflowY: 'hidden'}}
          position='top'
        >
          <pre style={{whiteSpace: 'pre-wrap'}}>{resultTab.query.text.get()}</pre>
        </Tooltip>

        <span
          id={id}
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
        label: 'Rename',
        icon: 'pi pi-pause',
        command: () => {
          let resultTab = getResultState(contextResultId.get())
          nameEdit.set(jsonClone({ id: contextResultId.get(), name: resultTab.name.get() }))
        }
      },
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
                header={t.name}
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