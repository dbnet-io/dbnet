import * as React from "react";
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { MenuItem } from "primereact/components/menuitem/MenuItem";
import { accessStore, globalStore, useHS, useVariable } from "../store/state";
import { Tooltip } from 'primereact/tooltip';
import { AutoComplete } from 'primereact/autocomplete';
import { loadMetaTable } from "./MetaTablePanel";
import { toastError } from "../utilities/methods";
import { apiGet } from "../store/api";
import { MsgType } from "../store/websocket";
import { ObjectString } from "../utilities/interfaces";
import { GetDatabases, GetSchemata } from "./SchemaPanel";
import { none } from "@hookstate/core";


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
  const connName = useHS(globalStore.connection.name)
  const recentSearches = store.app.recentOmniSearches

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => {

    // get all connections
    apiGet(MsgType.GetConnections, {}).then(
      resp => {
        if(resp.error) return toastError(resp.error)
        store.app.connections.set(resp.data.conns)
        items[0].set({
          label: 'Connections',
          icon: 'pi pi-fw pi-sitemap',
          items: resp.data.conns.map((c: string) => {
            return {
              label: c,
              command: () => { 
                globalStore.loadSession(c).then(async () => {
                  await GetDatabases(store.connection.name.get())
                  await GetSchemata(store.connection.name.get(), store.connection.database.get())
                })
                localStorage.setItem("_connection_name", c)
              },
            }
          }),
        })
      }
    ).catch(
      error => toastError(error)
    )
  }, []) // eslint-disable-line
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const start = () => <img
    alt="logo"
    src={'assets/logo-brand.png'}
    height="30"
    className="p-mr-2"
    style={{ paddingLeft: "20px" }}
  ></img>

  const OmniBox = () => {
    const allTables = useVariable<string[]>([])
    const searchResults = useVariable<string[]>([])
    const omniSearch = useVariable('')
    const removedRecent = useHS('') // little hack to prevent item clicking

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
          <div>
            {item}
            {
              item in recentSearches.get() ?
              <span
                style={{
                  position: 'absolute',
                  bottom: '-3px',
                }}
              >
                <Button
                  icon="pi pi-times"
                  style={{zIndex: 99}}
                  className="p-button-rounded p-button-text p-button-danger p-button-sm"
                  onClick={(e) => {
                    removedRecent.set(item)
                    setTimeout(() => {
                      recentSearches[item].set(none)
                      removedRecent.set('')
                    }, 1000);
                  }}
                />
              </span>
              : null
            } 
          </div>
        </div>
      );
    }

    const getAllTables = () => {
      let all : ObjectString = {}
      try {
        for (let schema of schemas.get()) {
          if (!schema.tables || !Array.isArray(schema.tables)) { continue }
          for (let table of schema.tables) {
            all[`${table.schema}.${table.name}`.toLowerCase()] = ''
          }
        }
      } catch (error) {
        console.log(error)
      }
      return Object.keys(all)
    }

    React.useEffect(() => {
      let all = getAllTables()
      allTables.set(all)
    }, []) // eslint-disable-line

    const searchTable = (e: any) => {
      let query = e.query.trim() as string
      if (!query.length) {
        return []
      }

      let recents = recentSearches.get()

      let results: string[] = []
      for(let key of Object.keys(recents)) {
        if(key.toString().includes(query.toLowerCase())){
          results.push(key.toString())
        }
      }

      for (let table of getAllTables()) {
        if (table.toLowerCase().includes(query.toLowerCase())) {
          if(table.toLowerCase() in recents) continue
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
        if(e.value === removedRecent.get()) return omniSearch.set('')
        loadMetaTable(e.value)
        selectedMetaTab.set('Object')
        omniSearch.set('')
        setTimeout(
          () => document.getElementById('object-column-filter')?.focus(),
          400
        )

        // save in recent searches
        setTimeout(() => {
          recentSearches[e.value.toLowerCase()].set(v => (v||0)+1)
          if(recentSearches.keys.length > 100) {
            let key = recentSearches.keys[recentSearches.keys.length-1]
            recentSearches[key].set(none)
          }
        }, 1000);
      }}
      tooltip="Shift+Space"
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
    <h3 style={{paddingRight: '8px'}}>{connName.get()}</h3>

    <OmniBox />
    <Tooltip target="#ws-status" position="left" />

    <Button
      icon="pi pi-desktop"
      tooltip="Load session"
      tooltipOptions={{ position: 'bottom' }}
      className="p-button-sm p-button-outlined p-button-secondary"
      onClick={(e) => { globalStore.loadSession(connName.get()) }}
    />

    <Button
      icon="pi pi-save"
      tooltip="Save session"
      tooltipOptions={{ position: 'bottom' }}
      className="p-button-sm p-button-outlined p-button-secondary"
      onClick={(e) => { globalStore.saveSession() }}
    />

    {/* <span className="p-inputgroup-addon">
      {
        connected.get() ?
          <i id="ws-status" style={{ color: 'rgb(131 255 51)', fontSize: '23px' }} className='pi pi-circle-on p-ml-2' data-pr-tooltip='Connected'></i>
          :
          <i id="ws-status" style={{ color: 'red', fontSize: '23px' }} className='pi pi-circle-on p-ml-2' data-pr-tooltip='Disconnected'></i>
      }
    </span> */}
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
