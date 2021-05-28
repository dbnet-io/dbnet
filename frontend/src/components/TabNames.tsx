import * as React from "react";
import { accessStore, Tab, useHS } from "../store/state";
import { SelectButton } from "primereact/selectbutton";
import { none } from "@hookstate/core";
import { jsonClone } from "../utilities/methods";

const queryPanel = accessStore().queryPanel

export const createTab = (name: string = '', sql = '') => {
  let name_arr = name.split('.')
  name = name_arr[name_arr.length-1]
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

  let newTab = new Tab({ name, editor: {text: sql} });
  let childTab = createTabChild(newTab)
  newTab.selectedChild = childTab.id
  queryPanel.tabs.merge([newTab])
  queryPanel.selectedTabId.set(newTab.id);
  return queryPanel.tabs[queryPanel.tabs.length-1]
}

export const createTabChild = (parent: Tab) => {
  let newTab = new Tab({ 
    parent: parent.id, 
    limit: parent.limit,
  });

  // add new child tab
  queryPanel.tabs.merge([newTab])
  getTabState(parent.id)?.selectedChild?.set(newTab.id)

  // delete existing non-pinned child tabs
  let tabs = queryPanel.tabs.get()
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i].parent === parent.id && !tabs[i].loading && !tabs[i].pinned && tabs[i].id !== newTab.id) {
      queryPanel.tabs[i].set(none)
      i--
    }
  }

  return newTab
}

export const getTabState = (tabID: string) => {
  let index = queryPanel.get().getTabIndexByID(tabID)
  return queryPanel.tabs[index]
}

interface Props {}

export const TabNames: React.FC<Props> = (props) => {

  ///////////////////////////  HOOKS  ///////////////////////////
  const tabs = useHS(queryPanel.tabs)
  const tabOptions = tabs.get().filter(t => !t.parent && !t.hidden).map(t => t.name);
  const selectedTabId = useHS(queryPanel.selectedTabId)

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
    if (icon) { return <i style={{fontSize: '15px'}} className={icon}></i>; }

    let index = queryPanel.get().tabs.map(t => t.name).indexOf(option)
    let tab = queryPanel.tabs[index]
    let childTab = getTabState(tab.id.get())
    const loading = tab.loading.get() || childTab.loading.get()
    return <>
      { loading ? <span style={{paddingRight: '5px', marginLeft: '-7px', fontSize: '12px'}}><i className="pi pi-spin pi-spinner"></i></span > : null}
      <span 
        style={{fontSize: '12px'}}
        onAuxClick={() => deleteTab(jsonClone(tab.id.get()))}
      >{option}</span >
    </> 
  };

  return (
    <SelectButton
      id="tab-names"
      value={getSelectedTabName()}
      options={['del', 'add'].concat(tabOptions)}
      onChange={(e: any) => actionTab(e.value)}
      style={{ width: '100%', position: 'fixed', zIndex: 99, overflowX: "scroll"}}
      // options={justifyOptions}
      itemTemplate={optionTemplate} />
  );
}
