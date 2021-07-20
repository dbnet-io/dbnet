import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import * as React from "react";
import { useHS } from "../store/state";
import { getTabState } from "./TabNames";

interface Props {}

export const RowViewPanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const queryPanel = window.dbnet.state.queryPanel
  const tabIndex = queryPanel.get().currTabIndex() || 0
  const childTab = useHS(getTabState(queryPanel.tabs[tabIndex].selectedChild.get()))
  const parentTab = getTabState(childTab.parent.get() || '')

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  let handleKeywordKeyPress = (e: React.KeyboardEvent) =>{
    if(e.key === 'Escape') { childTab.rowView.filter.set('') }
  };
  
  ///////////////////////////  JSX  ///////////////////////////
  
  return (
    <Dialog 
      header={<p style={{margin:0, textAlign:'center'}}>{parentTab?.get()?.name}</p>}
      visible={childTab.rowView.show.get()}
      modal={false}
      position="right"
      onHide={()=>{ childTab.rowView.show.set(false) }}
      style={{width: `${(window.innerWidth)/7*2}px`, minWidth: '400px'}}
      closeOnEscape={false}
    >
    <div className="p-fluid">
      <div className="p-col-12">
        <InputText
          className="p-inputtext-sm"
          value={childTab.rowView.filter.get()}
          onChange={(e) => childTab.rowView.filter.set((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeywordKeyPress}
          placeholder="Filter..."
        />
      </div>
    </div>
      <DataTable
        value={childTab.rowView.get().rows}
        loading={childTab.loading.get()}
        rowHover={true}
        scrollable={true}
        scrollHeight={`${(window.innerHeight)/3*2}px`}
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize:'12px'}} 
        dataKey="column_name"
        globalFilter={childTab.rowView.filter.get()}
      >
        <Column field="n" header="N" headerStyle={{width: '2em', textAlign: 'left'}}/>
        <Column field="name" header="Name" headerStyle={{maxWidth: '10em', textAlign: 'center'}}/>
        <Column field="value" header="Value" headerStyle={{maxWidth: '10em', textAlign: 'center'}}/>
      </DataTable>
    </Dialog>
  );
};