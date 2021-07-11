import { State } from "@hookstate/core"
import _ from "lodash"
import { Button } from "primereact/button"
import { Dialog } from "primereact/dialog"
import { ListBox } from "primereact/listbox"
import React from "react"
import { DbNet } from "../state/dbnet"
import { useHS } from "../store/state"

export const ConnectionChooser = (props: { show: State<boolean>, dbnet: DbNet, selectDb: boolean, onSelect: (connName: string, dbName: string) => void}) => {
  const connSelected = useHS('')
  const dbSelected = useHS('')
  const dbtConns = () : string[] => props.dbnet.connections.filter(c => c.dbt).map(c => c.name)

  React.useEffect(()=>{
    if(props.selectDb && connSelected.get()) {
      let conn = props.dbnet.getConnection(connSelected.get())

      if(Object.keys(conn.databases).length === 0) {
        props.dbnet.getDatabases(connSelected.get()).then(
          _ => {
            if(Object.keys(conn.databases).length > 0) connSelected.set(connSelected.get())
          }
        )
      }
    }
  },[connSelected.get()])

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
      header="Choose a connection" visible={props.show.get()}
      footer={footer()} 
      onHide={() => props.show.set(false)}
    >
      <ListBox 
        value={connSelected.get()}
        options={props.dbnet.connections.map(c => c.name)} 
        onChange={(e) => connSelected.set(e.value)} 
        listStyle={{fontFamily:'monospace'}}
        itemTemplate={itemTemplate}
        style={{width: '15rem'}}
      />
      {
        props.selectDb && connSelected.get() ?
        <ListBox 
          value={dbSelected.get()}
          options={ _.sortBy(
                      Object.values(
                        props.dbnet
                        .getConnection(connSelected.get())
                        .databases
                      ).map(d => d.name)
                    )} 
          onChange={(e) => dbSelected.set(e.value)} 
          listStyle={{fontFamily:'monospace'}}
          itemTemplate={itemTemplate}
          style={{width: '15rem'}} 
        />
        :
        null
      }
    </Dialog>
  )
}