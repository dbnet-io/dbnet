import * as React from "react";
import { accessStore, Tab, useHS } from "../store/state";
import { SelectButton } from "primereact/selectbutton";
import { none } from "@hookstate/core";
import { jsonClone } from "../utilities/methods";
import { Tooltip } from "primereact/tooltip";
import { ContextMenu } from "primereact/contextmenu";
import { MenuItem } from "primereact/components/menuitem/MenuItem";

const store = accessStore()
const queryPanel = store.queryPanel

export const createTab = (name: string = '', sql = '') => {
  if(!name.toLowerCase().endsWith('.sql')) {
    let name_arr = name.split('.')
    name = name_arr[name_arr.length-1]
  }
  let index = queryPanel.get().getTabIndexByName(name)
  if (index > -1) {
    // tab already exists, append sql to bottom, or focus on existing
    let tab = queryPanel.tabs[index]
    tab.hidden.set(false) // if was hidden
    if(sql) {
      let text = tab.editor.text.get()
      let pos = text.indexOf(sql) // try to find existing sql block
      if(pos > -1) {
        let upperBlock = text.slice(0, pos)
        let lines = upperBlock.split('\n')
        tab.editor.selection.set([lines.length-1, 0,lines.length-1,0])
      } else {
        tab.editor.text.set(t => t + '\n\n' + sql)

        // set to last line
        let lines = tab.editor.text.get().split('\n')
        tab.editor.selection.set([lines.length-1, 0,lines.length-1,0])
      }
    }
    queryPanel.selectedTabId.set(tab.id.get());
    return tab
  }

  let newTab = new Tab({ 
    name, 
    editor: {text: sql},
    connection: store.connection.name.get(),
    database: jsonClone(store.connection.database.get()),
  });
  let childTab = createTabChild(newTab)
  newTab.selectedChild = childTab.id
  queryPanel.tabs.merge([newTab])
  queryPanel.selectedTabId.set(newTab.id);
  return queryPanel.tabs[queryPanel.tabs.length-1]
}

export const createTabChild = (parent: Tab) => {
  let activeChildTab = getTabState(parent.selectedChild)
  let newTab = new Tab({ 
    parent: parent.id, 
    resultLimit: activeChildTab.get()?.resultLimit || parent.resultLimit,
    connection: parent.connection,
    database: parent.database,
  });

  // add new child tab
  queryPanel.tabs.merge([newTab])
  getTabState(parent.id)?.selectedChild?.set(newTab.id)
  cleanupOtherChildTabs(newTab)
  return newTab
}

export const cleanupOtherChildTabs = (childTab: Tab) => {
  // delete existing non-pinned child tabs
  let tabs = queryPanel.tabs.get()
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i].parent === childTab.parent && 
      !tabs[i].loading && !tabs[i].pinned && 
      tabs[i].id !== childTab.id) {
      queryPanel.tabs[i].set(none)
      i--
    }
  }
}

// export const getConnTab = (connName: string) => {
//   let tabs = queryPanel.get().tabs.filter(t => t.connection === connName)
//   if(tabs.length === 0) {
//     store.connection
//     return createTab(connName)
//   }
// }

export const getTabState = (tabID: string) => {
  let index = queryPanel.get().getTabIndexByID(tabID)
  return queryPanel.tabs[index]
}

interface Props {}

export const TabNames: React.FC<Props> = (props) => {

  ///////////////////////////  HOOKS  ///////////////////////////
  const cm = React.useRef<ContextMenu>(null);
  const tabs = useHS(queryPanel.tabs)
  const tabOptions = tabs.get().filter(t => !t.parent && !t.hidden).map(t => t.name);
  const selectedTabId = useHS(queryPanel.selectedTabId)
  const contextTabId = useHS('')

  ///////////////////////////  EFFECTS  ///////////////////////////


  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const getSelectedTabName = () => {
    let index = queryPanel.get().tabs.map(t => t.id).indexOf(selectedTabId.get());
    return tabs[index].get().name
  }

  const deleteTab = (tabID: string) => {
    let tabI = -1;
    for (let j = 0; j < tabs.get().length; j++) {
      if (tabs[j].id.get() === tabID) { tabI = j; }
    }
    
    let parentTabI = -1;
    let parentTabs = tabs.get().filter(v => !v.parent && !v.hidden)
    for (let j = 0; j < parentTabs.length; j++) {
      if (parentTabs[j].id === tabID) { parentTabI = j; }
    }

    if(selectedTabId.get() === tabID) {
      if (parentTabI > 0) { 
        selectedTabId.set(parentTabs[parentTabI - 1].id)
      } else if (parentTabs.length > 0) { 
        selectedTabId.set(parentTabs[0].id)
      } else { 
        actionTab('add')
      }
    }
    tabs[tabI].hidden.set(true)
  }

  const actionTab = (name: string) => {
    let prefix = 'Q'
    if (!name) {
      return;
    } else if (name === 'del') {
      // delete selected tab
      deleteTab(jsonClone(selectedTabId.get()))
    } else if (name === 'add') {
      // add new tab
      let tabNames = tabs.get().filter(t => !t.parent).map(t => t.name)
      let i = tabNames.length + 1;
      let newName = `${prefix}${i}`;
      while (tabNames.includes(newName)) {
        i++;
        newName = `${prefix}${i}`;
      }
      createTab(newName)
    } else {
      let index = queryPanel.get().tabs.map(t => t.name).indexOf(name)
      let tab = tabs[index].get()
      if(!tab.selectedChild) createTabChild(tab)
      selectedTabId.set(tab.id);
    }
    document.getElementById("table-filter")?.focus();
  };

  ///////////////////////////  JSX  ///////////////////////////
  
  const optionTemplate = (option: string) => {
    let icon = '';
    if (option === 'del') { icon = 'pi pi-times'; }
    if (option === 'add') { icon = 'pi pi-plus'; }
    if (icon) { 
      let style = {
        paddingTop: '7px',
        paddingBottom: '6px',
        paddingLeft: '16px',
        paddingRight: '16px',
      }
      return <span style={style}><i style={{fontSize: '13px'}} className={icon}></i></span> 
    }

    let index = queryPanel.get().tabs.map(t => t.name).indexOf(option)
    let tab = queryPanel.tabs[index]
    let childTab = getTabState(tab.id.get())
    const loading = tab.loading.get() || childTab.loading.get()
    let id = `tab-${tab.name.get()}`

    return <>
      <Tooltip
        target={`#${id}`}
        style={{
          fontSize: '11px',
          minWidth: '250px',
          fontFamily:'monospace',
        }}
      >
        <span>Connection: {tab.connection.get() || store.connection.name.get()}</span>
        <br/>
        <span>Database:   {tab.database.get() || store.connection.database.get()}</span>
      </Tooltip>
      { loading ? <span style={{paddingRight: '5px', marginLeft: '-7px', fontSize: '12px'}}><i className="pi pi-spin pi-spinner"></i></span > : null}
      <span
        id={id}
        data-pr-position="top"
        style={{fontSize: '12px'}}
        onAuxClick={() => deleteTab(jsonClone(tab.id.get()))}
        onContextMenu={event => {
          contextTabId.set(jsonClone(tab.id.get()))
          cm.current?.show(event as any)
        }}
      >{option}</span >
    </> 
  }


  const menu = () : MenuItem[] => {
    let contextTab = getTabState(jsonClone(contextTabId.get()))
    let databaseItems : MenuItem[] = store.connection.databases.get().map(db => {
      return {
        label: db,
        icon: db === contextTab.get()?.database ? 'pi pi-angle-double-right': '',
        command: () => {
          contextTab.database.set(db)
          selectedTabId.set(jsonClone(selectedTabId.get())) // to refresh
        },
      } as MenuItem
    })

    let items : MenuItem[] = [
      {
        label: 'Close',
        icon: 'pi pi-times',
        command: () => deleteTab(jsonClone(contextTab.id.get()))
      },
      {
        separator: true
      },
    ]
    return items.concat(databaseItems)
  }


  return <>
    <ContextMenu model={menu()} ref={cm} onHide={() => {}} style={{fontSize:'11px'}}/>
    <SelectButton
      id="tab-names"
      value={getSelectedTabName()}
      options={['del', 'add'].concat(tabOptions)}
      onChange={(e: any) => actionTab(e.value)}
      style={{ width: '100%', position: 'fixed', zIndex: 99, overflowX: "scroll"}}
      // options={justifyOptions}
      itemTemplate={optionTemplate} />
    
  </>
}
