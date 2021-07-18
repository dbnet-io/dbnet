import * as React from "react";
import { Menubar } from 'primereact/menubar';
import { Button } from 'primereact/button';
import { MenuItem } from "primereact/components/menuitem/MenuItem";
import { accessStore, globalStore, useHS, useVariable } from "../store/state";
import { Tooltip } from 'primereact/tooltip';
import { AutoComplete } from 'primereact/autocomplete';
import { loadMetaTable } from "./MetaTablePanel";
import { none } from "@hookstate/core";
import { TauriGetCwd } from "../utilities/tauri";
import { Connection } from "../state/connection";
import { Table } from "../state/schema";


const store = accessStore()

interface Props {}


export const TopMenuBar: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const tableKeys = React.useRef<Record<string, Table>>({})
  const onSelectConnection = useVariable(0)

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => {
    let id2 = window.dbnet.subscribe('onSelectConnection', onSelectConnection)
    return () => {
      window.dbnet.unsubscribe(id2)
    }
  }, [])

  React.useEffect(() => { }, [onSelectConnection.get()])

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const makeItems = () => {
    const loadConn = (conn: Connection) => {
      globalStore.loadSession(conn.name).then(async () => {
        await window.dbnet.getDatabases(conn.name)
        await window.dbnet.getSchemata(conn.name, conn.database)
      })
      window.dbnet.selectConnection(conn.name)
    }

    let connItems: MenuItem[] = window.dbnet.connections.map((c): MenuItem => {
      return {
        label: c.name,
        command: () => { loadConn(c) },
        template: (item, options) => {
          return <a // eslint-disable-line
            role="menuitem"
            className="p-menuitem-link"
            aria-haspopup="false"
            onClick={() => loadConn(c)}
          >
            <span className="p-menuitem-text" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.label}</span>
            {
              c.dbt ?
                <span style={{ paddingLeft: '7px', color: 'green' }}>
                  <b>dbt</b>
                </span>
                :
                null
            }
          </a>
        },
      }
    })

    let items: MenuItem[] = [
      {
        label: 'Connections',
        icon: 'pi pi-fw pi-sitemap',
        items: connItems,
      },
      {
        label: 'Extract / Load',
        icon: 'pi pi-fw pi-cloud-upload',
        command: () => {
          store.jobPanel.show.set(true)
        },
      },
    ]
    return items
  }
  ///////////////////////////  JSX  ///////////////////////////

  const start = () => <div className="p-inputgroup">
    <img
      alt="logo"
      src={'assets/logo-brand.png'}
      height="30"
      className="p-mr-2"
      style={{ paddingLeft: "20px" }}
    />
    <OmniBox />
  </div>

  const OmniBox = () => {
    const searchResults = useVariable<Table[]>([])
    const omniSearch = useVariable('')
    const removedRecent = useHS('') // little hack to prevent item clicking

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
            {/* {
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
            }  */}
          </div>
        </div>
      );
    }

    const searchTable = (e: any) => {
      const connection = window.dbnet.currentConnection
      let queryStr = e.query.trim() as string
      if (!queryStr.length) {
        return []
      }

      let queries = queryStr.split(' ')
      let results: Table[] = []
      for (let key of Object.keys(connection.recentOmniSearches)) {
        let found: boolean[] = queries.map(v => false)
        for (let i = 0; i < queries.length; i++) {
          const query = queries[i];
          found[i] = key.toString().includes(query.toLowerCase())
        }
        if (found.every(v => v)) {
          let table = connection.lookupTable(key.toString())
          if (table) results.push(new Table(table))
        }
      }

      for (let table of connection.getAllTables()) {
        let found: boolean[] = queries.map(_ => false)
        let fullName = `${table.schema}.${table.name}`
        for (let i = 0; i < queries.length; i++) {
          const query = queries[i];
          found[i] = fullName.toLowerCase().includes(query.toLowerCase()) && !(fullName.toLowerCase() in connection.recentOmniSearches)
        }
        if (found.every(v => v)) {
          results.push(new Table(table))
        }
      }
      searchResults.set(results)
      tableKeys.current = {}
      for (let table of results) {
        tableKeys.current[table.key()] = table
      }
    }

    return <AutoComplete
      id='omni-search'
      placeholder="Search..."
      value={omniSearch.get()}
      suggestions={searchResults.get().map(t => t.key())}
      completeMethod={searchTable}
      field="name"
      onKeyUp={omniKeyPress}
      onChange={(e: any) => { omniSearch.set(e.target.value) }}
      onSelect={(e: any) => {
        let table = tableKeys.current[e.value]
        if (table.fullName() === removedRecent.get()) return omniSearch.set('')
        loadMetaTable(table)
        omniSearch.set('')
        setTimeout(
          () => document.getElementById('object-column-filter')?.focus(),
          400
        )

        // save in recent searches
        setTimeout(() => {
          let keys = Object.keys(window.dbnet.currentConnection.recentOmniSearches)
          if (keys.length > 100) {
            let key = keys[keys.length - 1]
            delete window.dbnet.currentConnection.recentOmniSearches[key]
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
    <h3 style={{ paddingRight: '8px', fontFamily: 'monospace' }}>{window.dbnet.currentConnection.name}</h3>

    {/* <OmniBox /> */}
    <Tooltip target="#ws-status" position="left" />

    <Button
      icon="pi pi-info"
      tooltip="Test"
      tooltipOptions={{ position: 'bottom' }}
      className="p-button-sm p-button-outlined p-button-secondary"
      onClick={(e) => { TauriGetCwd() }}
    />

    <Button
      icon="pi pi-desktop"
      tooltip="Load session"
      tooltipOptions={{ position: 'bottom' }}
      className="p-button-sm p-button-outlined p-button-secondary"
      onClick={(e) => { globalStore.loadSession(window.dbnet.currentConnection.name) }}
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
      id="top-menu-bar"
      style={{ fontSize: '0.8rem', padding: '0', zIndex: 77 }}
      model={makeItems()}
      start={start}
      end={end}
    />
  );
};
