import * as React from "react";
import { Tab, useGlobalState } from "../store/state";
import { SelectButton } from "primereact/selectbutton";



export function TabNames() {

  const state = useGlobalState();
  const tabs = state.session.tabs;
  const tabOptions = tabs.get().map(t => t.name);
  const selectedTab = state.session.selectedTab;
  const selectedTabName = selectedTab.get();
  const optionTemplate = (option: string) => {
    let icon = '';
    if (option === 'del') { icon = 'pi pi-times'; }
    if (option === 'add') { icon = 'pi pi-plus'; }
    if (icon) { return <i className={icon}></i>; }
    else { return option; }
  };

  const actionTab = (name: string) => {
    let prefix = 'Query '
    if (!name) {
      return;
    } else if (name === 'del') {
      let i = -1;
      tabs.set(
        t => t.filter((v, j) => {
          if (v.name === selectedTabName) { i = j; }
          return v.name !== selectedTabName;
        })
      );
      if (i > 0) { selectedTab.set(tabs.get()[i - 1].name); }
      else if (tabs.length > 0) { selectedTab.set(tabs.get()[0].name); }
      else { tabs.set([new Tab({ name: prefix+'1' })]); }
    } else if (name === 'add') {
      // new tab
      let i = tabOptions.length + 1;
      let newName = `${prefix}${i}`;
      while (tabOptions.includes(newName)) {
        i++;
        newName = `${prefix}${i}`;
      }
      let newTab = new Tab({ name: newName });
      tabs.set(
        t => t.concat([newTab])
      );
      selectedTab.set(newTab.name);
    } else {
      let index = state.session.get().getTabIndex(name);
      selectedTab.set(tabs[index].get().name);
    }
    document.getElementById("table-filter")?.focus();
  };

  return (
    <SelectButton
      value={selectedTab.get()}
      options={['del', 'add'].concat(tabOptions)}
      onChange={(e: any) => actionTab(e.value)}
      style={{ width: '100%' }}
      // options={justifyOptions}
      itemTemplate={optionTemplate} />
  );
}
