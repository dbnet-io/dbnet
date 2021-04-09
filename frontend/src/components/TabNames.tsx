import * as React from "react";
import { Session, store, Tab, useHookState } from "../store/state";
import { SelectButton } from "primereact/selectbutton";
import { State } from "@hookstate/core";
import { Inplace, InplaceDisplay, InplaceContent } from 'primereact/inplace';
import { InputText } from "primereact/inputtext";

export const createTab = (session: State<Session>, name: string = '', sql = '') => {
  let index = session.get().getTabIndexByName(name)
  if (index > -1) {
    // tab already exists, append sql to bottom, or focus on existing
    let tab = session.tabs[index]
    if(sql) {
      tab.editor.text.set(t => t + '\n\n' + sql)

      // set to last line
      let lines = tab.editor.text.get().split('\n')
      tab.editor.selection.set([lines.length-1, 0,lines.length-1,0])
    }
    session.selectedTabId.set(tab.id.get());
    return tab
  }

  let newTab = new Tab({ name, editor: {text: sql} });
  session.tabs.set(
    t => t.concat([newTab])
  );
  session.selectedTabId.set(newTab.id);
  return session.tabs[session.tabs.length-1]
}
interface Props {
  session: State<Session>
}

export const TabNames: React.FC<Props> = (props) => {

  const tabs = useHookState(props.session.tabs)
  const tabOptions = tabs.get().map(t => t.name);
  const selectedTabId = useHookState(props.session.selectedTabId)
  const optionTemplate = (option: string) => {
    let icon = '';
    if (option === 'del') { icon = 'pi pi-times'; }
    if (option === 'add') { icon = 'pi pi-plus'; }
    if (icon) { return <i className={icon}></i>; }
    return option
    return (
      <>
        <Inplace closable>
          <InplaceDisplay>
              {option}
          </InplaceDisplay>
          <InplaceContent>
              <InputText value={option} onChange={(e:any) => console.log(e.target.value)} autoFocus width={10} />
          </InplaceContent>
        </Inplace>
      </>
    )
  };


  const getSelectedTabName = () => {
    let index = store().session.get().tabs.map(t => t.id).indexOf(selectedTabId.get());
    return tabs[index].get().name
  }

  const actionTab = (name: string) => {
    let prefix = 'Query '
    if (!name) {
      return;
    } else if (name === 'del') {
      let i = -1;
      tabs.set(
        t => t.filter((v, j) => {
          if (v.id === selectedTabId.get()) { i = j; }
          return v.id !== selectedTabId.get();
        })
      );
      if (i > 0) { selectedTabId.set(tabs.get()[i - 1].id); }
      else if (tabs.length > 0) { selectedTabId.set(tabs.get()[0].id); }
      else { tabs.set([new Tab({ name: prefix+'1' })]); }
    } else if (name === 'add') {
      // new tab
      let i = tabOptions.length + 1;
      let newName = `${prefix}${i}`;
      while (tabOptions.includes(newName)) {
        i++;
        newName = `${prefix}${i}`;
      }
      createTab(store().session, newName)
    } else {
      let index = store().session.get().tabs.map(t => t.name).indexOf(name);
      selectedTabId.set(tabs[index].get().id);
    }
    document.getElementById("table-filter")?.focus();
  };

  return (
    <SelectButton
      value={getSelectedTabName()}
      options={['del', 'add'].concat(tabOptions)}
      onChange={(e: any) => actionTab(e.value)}
      style={{ width: '100%', position: 'fixed', zIndex: 999}}
      // options={justifyOptions}
      itemTemplate={optionTemplate} />
  );
}
