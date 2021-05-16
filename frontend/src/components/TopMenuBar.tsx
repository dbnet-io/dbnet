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
import { toastError, toastInfo } from "../utilities/methods";
import { apiGet } from "../store/api";
import { MsgType } from "../store/websocket";


const store = accessStore()

interface Props { }

const itemsDefault: MenuItem[] = [
  // {
  //   label: 'File',
  //   icon: 'pi pi-fw pi-file',
  //   items: [
  //     {
  //       label: 'New',
  //       icon: 'pi pi-fw pi-plus',
  //       items: [
  //         {
  //           label: 'Bookmark',
  //           icon: 'pi pi-fw pi-bookmark'
  //         },
  //         {
  //           label: 'Video',
  //           icon: 'pi pi-fw pi-video'
  //         },

  //       ]
  //     },
  //     {
  //       label: 'Delete',
  //       icon: 'pi pi-fw pi-trash'
  //     },
  //     {
  //       separator: true
  //     },
  //     {
  //       label: 'Export',
  //       icon: 'pi pi-fw pi-external-link'
  //     }
  //   ]
  // },
  {
    label: 'Connections',
    icon: 'pi pi-fw pi-sitemap',
    items: []
  },
];


export const TopMenuBar: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const items = useHS(itemsDefault)

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => {

    // get all connections
    apiGet(MsgType.GetConnections, {}).then(
      data => {
        store.app.connections.set(data.conns)
        items[0].set({
          label: 'Connections',
          icon: 'pi pi-fw pi-sitemap',
          items: data.conns.map((c: string) => {
            return {
              label: c,
              command: () => { 
                toastInfo(c)
              },
            }
          }),
        })
      }
    ).catch(
      error => toastError(error)
    )
  }, [])
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const start = () => <img
    alt="logo"
    src={'assets/logo-brand.png'}
    height="30"
    className="p-mr-2"
    style={{ paddingLeft: "20px" }}
  ></img>

  const connected = useStoreWs().connected

  const OmniBox = () => {
    const allTables = useVariable<string[]>([])
    const searchResults = useVariable<string[]>([])
    const omniSearch = useVariable('')

    const schemas = accessStore().connection.schemas
    const selectedMetaTab = accessStore().app.selectedMetaTab

    const omniKeyPress = (e: any) => {
      // omni search
      if (e.key === 'Escape') {
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
      let all: string[] = []
      for (let key of Object.keys(schemas.get())) {
        let tables = schemas.get()[key].tables
        if (!tables) { continue }
        for (let name of Object.keys(tables)) {
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

      let results: string[] = []
      for (let table of getAllTables()) {
        if (table.toLowerCase().includes(query.toLowerCase())) {
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
      onChange={(e: any) => { omniSearch.set(e.target.value) }}
      onSelect={(e: any) => {
        loadMetaTable(e.value)
        selectedMetaTab.set('Object')
        omniSearch.set('')
        setTimeout(
          () => document.getElementById('object-column-filter')?.focus(),
          400
        )
      }}
      tooltip="Shift+Ctrl+Space"
      tooltipOptions={{ position: 'bottom' }}
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

  const end = () => <div style={{ paddingRight: "0px" }} className="p-inputgroup">
    <h3 style={{paddingRight: '8px'}}>{store.connection.name.get()}</h3>

    <OmniBox />
    <Tooltip target="#ws-status" position="left" />

    <Button
      icon="pi pi-desktop"
      tooltip="Load session"
      tooltipOptions={{ position: 'bottom' }}
      className="p-button-sm p-button-outlined p-button-secondary"
      onClick={(e) => { globalStore.loadSession(accessStore().connection.name.get()) }}
    />

    <Button
      icon="pi pi-save"
      tooltip="Save session"
      tooltipOptions={{ position: 'bottom' }}
      className="p-button-sm p-button-outlined p-button-secondary"
      onClick={(e) => { globalStore.saveSession() }}
    />

    <span className="p-inputgroup-addon">
      {
        connected.get() ?
          <i id="ws-status" style={{ color: 'rgb(131 255 51)', fontSize: '23px' }} className='pi pi-circle-on p-ml-2' data-pr-tooltip='Connected'></i>
          :
          <i id="ws-status" style={{ color: 'red', fontSize: '23px' }} className='pi pi-circle-on p-ml-2' data-pr-tooltip='Disconnected'></i>
      }
    </span>
  </div>

  return (
    <Menubar
      style={{ fontSize: '0.8rem', padding: '0' }}
      model={items.get()}
      start={start}
      end={end}
    />
  );
};