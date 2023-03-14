import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import * as React from "react";
import { useHS } from "../store/state";
import { getResultState, getTabState } from "./TabNames";

interface Props {}

export const RowViewPanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const queryPanel = window.dbnet.state.queryPanel
  const resultTab = useHS(getResultState(queryPanel.get().currResult()?.id))
  const parentTab = getTabState(resultTab?.get()?.parent || '')

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  let handleKeywordKeyPress = (e: React.KeyboardEvent) =>{
    if(e.key === 'Escape') { parentTab.rowView.filter.set('') }
  };
  
  ///////////////////////////  JSX  ///////////////////////////
  if(!parentTab?.rowView?.show?.get()) return <></>
  
  return (
    <Dialog 
      header={<p style={{margin:0, textAlign:'center'}}>{parentTab?.get()?.name}</p>}
      visible={parentTab.rowView.show.get()}
      modal={false}
      position="right"
      onHide={()=>{ parentTab.rowView.show.set(false) }}
      style={{width: `${(window.innerWidth)/7*2}px`, minWidth: '400px'}}
      closeOnEscape={false}
    >
    <div className="p-fluid">
      <div className="p-col-12">
        <InputText
          className="p-inputtext-sm"
          value={parentTab.rowView.filter.get()}
          onChange={(e) => parentTab.rowView.filter.set((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeywordKeyPress}
          placeholder="Filter..."
        />
      </div>
    </div>
      <DataTable
        value={parentTab.rowView.get().rows}
        loading={resultTab.loading.get()}
        rowHover={true}
        scrollable={true}
        scrollHeight={`${(window.innerHeight)/3*2}px`}
        resizableColumns={true}
        className="p-datatable-sm p-datatable-gridlines"
        style={{fontSize:'11px'}} 
        dataKey="column_name"
        globalFilter={parentTab.rowView.filter.get()}
      >
        <Column
          field="n" header="N"
          headerStyle={{ maxWidth: '2.5em', textAlign: 'left' }}
          bodyStyle={{ maxWidth: '2.5em', textAlign: 'left' }}
        />

        <Column
          field="name" header="Name"
          headerStyle={{  maxWidth: `${(window.innerWidth)*1/12}px`, textAlign: 'center' }}
          bodyStyle={{  maxWidth: `${(window.innerWidth)*1/12}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />
        
        <Column
          field="value" header="Value"
          headerStyle={{  maxWidth: `${(window.innerWidth)*2/12}px`, textAlign: 'center' }}
          bodyStyle={{ maxWidth: `${(window.innerWidth)*2/12}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word'  }}
        />
      </DataTable>
    </Dialog>
  );
};