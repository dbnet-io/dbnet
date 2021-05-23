import * as React from "react";
import { accessStore, Tab, useHS } from "../store/state";
import { SelectButton } from "primereact/selectbutton";
import { none } from "@hookstate/core";

const queryPanel = accessStore().queryPanel

export const createTab = (name: string = '', sql = '') => {
  let name_arr = name.split('.')
  name = name_arr[name_arr.length-1]
  let index = queryPanel.get().getTabIndexByName(name)
  if (index > -1) {
    // tab already exists, append sql to bottom, or focus on existing
    let tab = queryPanel.tabs[index]
    if(sql) {
      tab.editor.text.set(t => t + '\n\n' + sql)

      // set to last line
      let lines = tab.editor.text.get().split('\n')
      tab.editor.selection.set([lines.length-1, 0,lines.length-1,0])
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
    if (tabs[i].parent === parent.id && !tabs[i].pinned && tabs[i].id !== newTab.id) {
      queryPanel.tabs[i].set(none)
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

  const tabs = useHS(queryPanel.tabs)
  const tabOptions = tabs.get().filter(t => !t.parent).map(t => t.name);
  const selectedTabId = useHS(queryPanel.selectedTabId)
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
      <span style={{fontSize: '12px'}}>{option}</span >
    </> 
  };


  const getSelectedTabName = () => {
    let index = queryPanel.get().tabs.map(t => t.id).indexOf(selectedTabId.get());
    return tabs[index].get().name
  }

  const actionTab = (name: string) => {
    let prefix = 'Q'
    if (!name) {
      return;
    } else if (name === 'del') {
      // delete selected tab
      let i = -1;
      console.log(tabs.get().filter(v => !v.parent))
      let parentTabs = tabs.get().filter(v => !v.parent)
      for (let j = 0; j < parentTabs.length; j++) {
        const tab = parentTabs[j];
        if (tab.id === selectedTabId.get()) { i = j; }
      }

      tabs.set(
        t => t.filter(v => v.id !== selectedTabId.get())
      )
      if (i > 0) { 
        selectedTabId.set(parentTabs[i - 1].id)
      } else if (tabs.length > 0) { 
        selectedTabId.set(parentTabs[0].id)
      }
      else { tabs.set([new Tab({ name: prefix+'1' })]); }
    } else if (name === 'add') {
      // add new tab
      let i = tabOptions.length + 1;
      let newName = `${prefix}${i}`;
      while (tabOptions.includes(newName)) {
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
