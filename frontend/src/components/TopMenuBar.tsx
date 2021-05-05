import * as React from "react";
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { MenuItem } from "primereact/components/menuitem/MenuItem";
import { accessStore, globalStore, useHS, useStoreWs, useVariable } from "../store/state";
import { Tooltip } from 'primereact/tooltip';
import { AutoComplete } from 'primereact/autocomplete';
import { loadMetaTable } from "./MetaTablePanel";
import { useState } from "@hookstate/core";

interface Props {}

const items : MenuItem[] = [
  {
     label:'File',
     icon:'pi pi-fw pi-file',
     items:[
        {
           label:'New',
           icon:'pi pi-fw pi-plus',
           items:[
              {
                 label:'Bookmark',
                 icon:'pi pi-fw pi-bookmark'
              },
              {
                 label:'Video',
                 icon:'pi pi-fw pi-video'
              },

           ]
        },
        {
           label:'Delete',
           icon:'pi pi-fw pi-trash'
        },
        {
           separator:true
        },
        {
           label:'Export',
           icon:'pi pi-fw pi-external-link'
        }
     ]
  },
  {
     label:'Edit',
     icon:'pi pi-fw pi-pencil',
     items:[
        {
           label:'Left',
           icon:'pi pi-fw pi-align-left'
        },
        {
           label:'Right',
           icon:'pi pi-fw pi-align-right'
        },
        {
           label:'Center',
           icon:'pi pi-fw pi-align-center'
        },
        {
           label:'Justify',
           icon:'pi pi-fw pi-align-justify'
        },

     ]
  },
  {
     label:'Users',
     icon:'pi pi-fw pi-user',
     items:[
        {
           label:'New',
           icon:'pi pi-fw pi-user-plus',

        },
        {
           label:'Delete',
           icon:'pi pi-fw pi-user-minus',

        },
        {
           label:'Search',
           icon:'pi pi-fw pi-users',
           items:[
              {
                 label:'Filter',
                 icon:'pi pi-fw pi-filter',
                 items:[
                    {
                       label:'Print',
                       icon:'pi pi-fw pi-print'
                    }
                 ]
              },
              {
                 icon:'pi pi-fw pi-bars',
                 label:'List'
              }
           ]
        }
     ]
  },
  {
     label:'Events',
     icon:'pi pi-fw pi-calendar',
     items:[
        {
           label:'Edit',
           icon:'pi pi-fw pi-pencil',
           items:[
              {
                 label:'Save',
                 icon:'pi pi-fw pi-calendar-plus'
              },
              {
                 label:'Delete',
                 icon:'pi pi-fw pi-calendar-minus'
              },

           ]
        },
        {
           label:'Archieve',
           icon:'pi pi-fw pi-calendar-times',
           items:[
              {
                 label:'Remove',
                 icon:'pi pi-fw pi-calendar-minus'
              }
           ]
        }
     ]
  },
  {
     label:'Quit',
     icon:'pi pi-fw pi-power-off',
     command: () => { console.log('hello')},
  }
];


export const TopMenuBar: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////

  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const start = () => <img
    alt="logo"
    src={'assets/logo-brand.png'}
    height="30"
    className="p-mr-2"
    style={{paddingLeft:"20px"}}
  ></img>

  const connected = useStoreWs().connected

  const OmniBox = () => {
    const allTables = useVariable<string[]>([])
    const searchResults = useVariable<string[]>([])
    const omniSearch = useVariable('')

    const schemas = accessStore().connection.schemas
    const selectedMetaTab = accessStore().app.selectedMetaTab

    const omniKeyPress = (e: any) =>{
      // omni search
      if(e.key === 'Escape') { 
        omniSearch.set('')
      }
    }
    const omniItemTemplate = (item: any) => {
      return (
        <div className="country-item">
          <div>{item}</div>
        </div>
      );
    }

    const getAllTables = () => {
      let all : string[] = []
      for(let key of Object.keys(schemas.get())) {
        let tables = schemas.get()[key].tables
        if (!tables) { continue }
        for(let name of Object.keys(tables)) {
          let table = tables[name]
          all.push(`${table.schema}.${table.name}`.toLowerCase())
        }
      }
      return all
    }
  
    React.useEffect(() => {
      let all = getAllTables()
      allTables.set(all)
    }, [])

    const searchTable = (e: any) => {
      let query = e.query.trim() as string
      if (!query.length) {
        return []
      }
  
      let results : string[] = []
      for (let table of getAllTables()) {
        if(table.toLowerCase().includes(query.toLowerCase())) {
          results.push(table)
        }
      }
  
      searchResults.set(results)
    }

    return <AutoComplete
      id='omni-search'
      placeholder="Search..."
      value={omniSearch.get()}
      suggestions={searchResults.get()}
      completeMethod={searchTable}
      field="name"
      onKeyUp={omniKeyPress}
      onChange={(e:any) => { omniSearch.set(e.target.value) }}
      onSelect={(e:any) => {
        loadMetaTable(e.value) 
        selectedMetaTab.set('Object')
        omniSearch.set('')
        setTimeout(
          () => document.getElementById('object-column-filter')?.focus(),
          400
        )
      }}
      tooltip="Shift+Ctrl+Space"
      tooltipOptions={{position:'bottom'}}
      itemTemplate={omniItemTemplate}
    />
    // return <InputText
    //   id='omni-search'
    //   value={omniSearch.get()}
    //   className="p-inputtext-sm p-md-2"
    //   placeholder="Search"
    //   type="text"
    //   onKeyDown={omniKeyPress}
    //   onChange={(e:any) => { omniSearch.set(e.target.value) }}
    // /> 
  }

  const end = () => <div style={{paddingRight:"0px"}} className="p-inputgroup">
      <OmniBox/>
      <Tooltip target="#ws-status" position="left" />

      <Button
        icon="pi pi-desktop"
        tooltip="Load session"
        tooltipOptions={{ position: 'bottom' }}
        className="p-button-sm p-button-outlined p-button-secondary"
        onClick={(e) => { globalStore.loadSession(accessStore().connection.name.get())}}
      />

      <Button
        icon="pi pi-save"
        tooltip="Save session"
        tooltipOptions={{ position: 'bottom' }}
        className="p-button-sm p-button-outlined p-button-secondary"
        onClick={(e) => { globalStore.saveSession()}}
      />

      <span className="p-inputgroup-addon">
      {
        connected.get() ?
        <i id="ws-status" style={{color: 'rgb(131 255 51)', fontSize: '23px'}} className='pi pi-circle-on p-ml-2' data-pr-tooltip='Connected'></i>
        :
        <i id="ws-status" style={{color: 'red', fontSize: '23px' }} className='pi pi-circle-on p-ml-2' data-pr-tooltip='Disconnected'></i>
      }
      </span>
    </div>

  return (
    <Menubar
      style={{fontSize: '0.8rem', padding: '0'}}
      model={items}
      start={start}
      end={end}
    />
  );
};