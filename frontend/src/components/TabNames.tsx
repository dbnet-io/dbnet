import * as React from "react";
import { accessStore, Tab, useHS } from "../store/state";
import { SelectButton } from "primereact/selectbutton";
import { Inplace, InplaceDisplay, InplaceContent } from 'primereact/inplace';
import { InputText } from "primereact/inputtext";

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
  queryPanel.tabs.set(
    t => t.concat([newTab])
  );
  queryPanel.selectedTabId.set(newTab.id);
  return queryPanel.tabs[queryPanel.tabs.length-1]
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

    let index = queryPanel.get().tabs.map(t => t.name).indexOf(option);
    const loading = queryPanel.tabs[index].loading.get()
    return <>
      { loading ? <span style={{paddingRight: '5px', marginLeft: '-7px', fontSize: '12px'}}><i className="pi pi-spin pi-spinner"></i></span > : null}
      <span style={{fontSize: '12px'}}>{option}</span >
    </> 
    return (  // eslint-disable-line
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
    let index = queryPanel.get().tabs.map(t => t.id).indexOf(selectedTabId.get());
    return tabs[index].get().name
  }

  const actionTab = (name: string) => {
    let prefix = 'Q'
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
      createTab(newName)
    } else {
      let index = queryPanel.get().tabs.map(t => t.name).indexOf(name);
      selectedTabId.set(tabs[index].get().id);
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
