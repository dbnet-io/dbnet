import { State } from "@hookstate/core"
import _ from "lodash"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { ListBox } from "primereact/listbox"
import React from "react"
import { useHS } from "../store/state"
import { jsonClone, useIsMounted } from "../utilities/methods"

export const ConnectionChooser = (props: { show: State<boolean>, onSelect: (connName: string, dbName: string) => void}) => {
  const connSelected = useHS(window.dbnet.selectedConnection)
  const databases = useHS(window.dbnet.currentConnection.databases)
  const dbSelected = useHS('')
  const dbtConns = () : string[] => window.dbnet.connections.filter(c => c.dbt).map(c => c.name)
  const isMounted = useIsMounted()

  React.useEffect(()=>{
    if(connSelected.get()) {
      let conn = window.dbnet.getConnection(connSelected.get())

      if(Object.keys(conn.databases).length === 0) {
        window.dbnet.getDatabases(connSelected.get()).then(
          () => {
            if(!isMounted.current) return
            databases.set(jsonClone(window.dbnet.currentConnection.databases))
          }
        )
      }
    }
  },[connSelected.get()]) // eslint-disable-line

  const footer = () => {
    return <div style={{textAlign: 'center'}}>
        <Button label="OK" icon="pi pi-check" onClick={() => {
          props.onSelect(connSelected.get(), dbSelected.get())
        }} 
        className="p-button-text" />
    </div>
  }

  const itemTemplate = (option: any) => {
    return <>
      {option}
      {
        dbtConns().includes(option) ?
        <span style={{
          color:'green', fontSize:'0.6rem',
          paddingLeft: '10px', marginBottom: '5px',
        }}
        >
          <b>dbt</b>
        </span>
        :
        null
      }
    </>
  }

  return  (
    <Dialog
      header={connSelected.get() ? "Choose a Database" : "Choose a Connection"} visible={props.show.get()}
      footer={footer()} 
      style={{width: '20rem', height: connSelected.get() ? '20rem' : '20rem'}} 
      onHide={() => props.show.set(false)}
    >
      {
        connSelected.get() ?
        <ListBox 
          value={dbSelected.get()}
          options={ _.sortBy(Object.values(databases.get()).map(d => d.name) )} 
          onChange={(e) => dbSelected.set(e.value)} 
          listStyle={{fontFamily:'monospace', height: '10rem'}}
          itemTemplate={itemTemplate}
          style={{width: '15rem'}} 
        />
        :
        <ListBox 
          value={connSelected.get()}
          options={window.dbnet.connections.map(c => c.name)} 
          onChange={(e) => {
            window.dbnet.selectConnection(e.value)
            connSelected.set(e.value)
          }} 
          listStyle={{fontFamily:'monospace', height: '10rem'}}
          itemTemplate={itemTemplate}
          style={{width: '15rem'}}
        />
      }
    </Dialog>
  )
}