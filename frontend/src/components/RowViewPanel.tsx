import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import * as React from "react";
import { useHS, useStoreQueryPanel } from "../store/state";

interface Props {}

export const RowViewPanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const queryPanel = useStoreQueryPanel()
  const tabIndex = queryPanel.get().currTabIndex() || 0
  const tab = useHS(queryPanel.tabs[tabIndex])

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  let handleKeywordKeyPress = (e: React.KeyboardEvent) =>{
    if(e.key === 'Escape') { tab.rowView.filter.set('') }
  };
  
  ///////////////////////////  JSX  ///////////////////////////
  
  return (
    <Dialog 
      header={<p style={{margin:0, textAlign:'center'}}>Row View</p>}
      visible={tab.rowView.show.get()}
      modal={false}
      position="right"
      onHide={()=>{ tab.rowView.show.set(false) }}
      style={{width: '400px'}}
      closeOnEscape={false}
    >
    <div className="p-fluid">
      <div className="p-col-12">
        <InputText
          className="p-inputtext-sm"
          value={tab.rowView.filter.get()}
          onChange={(e) => tab.rowView.filter.set((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeywordKeyPress}
          placeholder="Filter..."
        />
      </div>
    </div>
      <DataTable
        value={tab.rowView.get().rows}
        loading={tab.loading.get()}
        rowHover={true}
        scrollable={true}
        scrollHeight="300px"
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize:'12px'}} 
        dataKey="column_name"
        globalFilter={tab.rowView.filter.get()}
      >
        <Column field="n" header="N" headerStyle={{width: '2em', textAlign: 'left'}}/>
        <Column field="name" header="Name" headerStyle={{maxWidth: '10em', textAlign: 'center'}}/>
        <Column field="value" header="Value" headerStyle={{maxWidth: '10em', textAlign: 'center'}}/>
      </DataTable>
    </Dialog>
  );
};