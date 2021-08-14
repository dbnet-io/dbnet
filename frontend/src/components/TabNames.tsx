import * as React from "react";
import { useHS } from "../store/state";
import { none } from "@hookstate/core";
import { jsonClone, toastError } from "../utilities/methods";
import { Tooltip } from "primereact/tooltip";
import { ContextMenu } from "primereact/contextmenu";
import { MenuItem, MenuItemOptions } from "primereact/components/menuitem/MenuItem";
import { TabMenu } from 'primereact/tabmenu';
import classNames from "classnames";
import { InputText } from "primereact/inputtext";
import { ConnectionChooser } from "./ConnectionChooser";
import { Tab } from "../state/tab";

const queryPanel = () => window.dbnet.state.queryPanel

export const createTab = (name: string = '', sql = '', connName: string, dbName: string) => {
  name = newTabName(name)
  if (!name.toLowerCase().endsWith('.sql')) {
    let name_arr = name.split('.')
    name = name_arr[name_arr.length - 1]
  }
  let index = queryPanel().get().getTabIndexByName(name)
  if (index > -1) {
    // tab already exists, append sql to bottom, or focus on existing
    let tab = queryPanel().tabs[index]
    tab.hidden.set(false) // if was hidden
    appendSqlToTab(tab.id.get(), sql)
    queryPanel().selectedTabId.set(tab.id.get());
    return tab
  }
  let newTab = new Tab({
    name,
    editor: { text: sql },
    connection: connName,
    database: dbName,
  });
  let childTab = createTabChild(newTab)
  newTab.selectedChild = childTab.id
  queryPanel().tabs.merge([newTab])
  queryPanel().selectedTabId.set(newTab.id);
  return queryPanel().tabs[queryPanel().tabs.length - 1]
}

export const appendSqlToTab = (tabID: string, sql: string) => {
  if (!sql) return
  let index = queryPanel().get().getTabIndexByID(tabID)

  let tab = queryPanel().tabs[index]

  let text = tab.editor.text.get()
  // let pos = text.indexOf(sql) // try to find existing sql block
  let pos = -1 // append always for now
  if (pos > -1) {
    let upperBlock = text.slice(0, pos)
    let lines = upperBlock.split('\n')
    tab.editor.selection.set([lines.length - 1, 0, lines.length - 1, 0])
  } else {
    tab.editor.text.set(t => t + '\n\n' + sql)

    // set to last line
    let lines = tab.editor.text.get().split('\n')
    tab.editor.selection.set([lines.length - 1, 0, lines.length - 1, 0])
    // window.dbnet.editor.focusSelection(true)
  }
  tab.editor.focus.set(v => v + 1)
}

export const createTabChild = (parent: Tab) => {
  let activeChildTab = getTabState(parent.selectedChild)
  let newTab = new Tab({
    parent: parent.id,
    resultLimit: activeChildTab.get()?.resultLimit || parent.resultLimit,
    connection: parent.connection,
    database: parent.database,
  });

  // add new child tab
  queryPanel().tabs.merge([newTab])
  getTabState(parent.id)?.selectedChild?.set(newTab.id)
  cleanupOtherChildTabs(newTab)
  return newTab
}

export const cleanupOtherChildTabs = (childTab: Tab) => {
  // delete existing non-pinned child tabs
  let tabs = queryPanel().tabs.get()
  for (let i = 0; i < tabs.length; i++) {
    if (tabs[i].parent === childTab.parent &&
      !tabs[i].loading && !tabs[i].pinned &&
      tabs[i].id !== childTab.id) {
      queryPanel().tabs[i].set(none)
      i--
    }
  }
}

export const getTabState = (tabID: string) => {
  let index = queryPanel().get().getTabIndexByID(tabID)
  return queryPanel().tabs[index]
}

export const getCurrentParentTabState = () => {
  let index = queryPanel().get().currTabIndex()
  let parent = queryPanel().tabs[index].parent.get()
  if (parent) index = queryPanel().get().getTabIndexByID(parent)
  return queryPanel().tabs[index]
}

export const getOrCreateParentTabState = (connection: string, database: string) => {
  let currTab = getCurrentParentTabState()
  if(currTab.connection.get()?.toUpperCase() === connection.toUpperCase() && currTab.database.get()?.toUpperCase() === database.toUpperCase()) return currTab

  let index = queryPanel().tabs.get()
              .map(t => `${t.connection}-${t.database}`.toUpperCase())
              .indexOf(`${connection}-${database}`.toUpperCase())
  if(index === -1) {
    let tab = createTab('', '', connection, database)
    queryPanel().selectedTabId.set(tab.id.get())
    return tab
  }
  let parent = queryPanel().tabs[index].parent.get()
  if (parent) index = queryPanel().get().getTabIndexByID(parent)
  queryPanel().selectedTabId.set(queryPanel().tabs[index].id.get())
  return queryPanel().tabs[index]
}

export const newTabName = (name: string) => {
  let prefix = 'Q'
  // add new tab
  let tabNames = queryPanel().tabs.get()
                .filter(t => !t.parent).map(t => t.name)
  let i = tabNames.length + 1;
  let newName = name !== ''? name : `${prefix}${i}`
  while (tabNames.includes(newName)) {
    i++;
    newName = name !== ''? `${name}${i}` : `${prefix}${i}`;
  }
  return newName
}

interface Props {}

export const TabNames: React.FC<Props> = (props) => {

  ///////////////////////////  HOOKS  ///////////////////////////
  const cm = React.useRef<ContextMenu>(null);
  const tabs = useHS(queryPanel().tabs)
  const selectedTabId = useHS(queryPanel().selectedTabId)
  const contextTabId = useHS('')
  const nameEdit = useHS({ id: '', name: '' })
  const newTab = useHS({show: false, name: ''})

  ///////////////////////////  EFFECTS  ///////////////////////////


  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const getSelectedTabName = () => {
    let index = queryPanel().get().tabs.map(t => t.id).indexOf(selectedTabId.get());
    return tabs[index].get().name
  }

  const deleteTab = (tabID: string) => {
    let tabI = -1;
    for (let j = 0; j < tabs.get().length; j++) {
      if (tabs[j].id.get() === tabID) { tabI = j; }
    }

    let parentTabI = -1;
    let parentTabs = tabs.get().filter(v => !v.parent && !v.hidden)
    for (let j = 0; j < parentTabs.length; j++) {
      if (parentTabs[j].id === tabID) { parentTabI = j; }
    }

    if (selectedTabId.get() === tabID) {
      if (parentTabI > 0) {
        selectedTabId.set(parentTabs[parentTabI - 1].id)
      } else if (parentTabs.length > 0) {
        selectedTabId.set(parentTabs[0].id)
      } else {
        actionTab('add')
      }
    }
    tabs[tabI].hidden.set(true)
  }

  const actionTab = (name: string) => {
    if (!name) {
      return;
    } else if (name === 'del') {
      // delete selected tab
      deleteTab(jsonClone(selectedTabId.get()))
    } else if (name === 'add') {
      // add new tab
      let newName = newTabName('')
      newTab.name.set(newName)
      newTab.show.set(true)
    } else {
      let index = queryPanel().get().tabs.map(t => t.name).indexOf(name)
      let tab = tabs[index].get()
      if (!tab.selectedChild) createTabChild(tab)
      selectedTabId.set(tab.id);
      window.dbnet.selectConnection(tab.connection || '')
    }
    document.getElementById("table-filter")?.focus();
  };

  ///////////////////////////  JSX  ///////////////////////////

  const menu = (): MenuItem[] => {
    let contextTab = getTabState(jsonClone(contextTabId.get()))
    let connName = contextTab?.get()?.connection
    let databaseItems: MenuItem[] = []
    if(connName) { 
      let connection = window.dbnet.currentConnection
      databaseItems = Object.values(connection.databases).map(db => {
        return {
          label: db.name,
          icon: db.name === contextTab.get()?.database ? 'pi pi-angle-double-right' : '',
          command: () => {
            contextTab.database.set(db.name)
            selectedTabId.set(jsonClone(selectedTabId.get())) // to refresh
          },
        } as MenuItem
      })
    }

    let items: MenuItem[] = [
      {
        label: 'Rename',
        icon: 'pi pi-pause',
        command: () => {
          nameEdit.set(jsonClone({ id: contextTab.id.get(), name: contextTab.name.get() }))
        }
      },
      {
        label: 'Close',
        icon: 'pi pi-times',
        command: () => deleteTab(jsonClone(contextTab.id.get()))
      },
      {
        separator: true
      },
    ]
    return items.concat(databaseItems)
  }

  const tabItems = (): MenuItem[] => {
    let items: MenuItem[] = [
      {
        // label: 'del',
        icon: 'pi pi-times',
        name: 'del',
      },
      {
        // label: 'add',
        icon: 'pi pi-plus',
        name: 'add',
      },
    ]
    // let items : MenuItem[] = []

    items =  items.concat(
      tabs.get().filter(t => !t.parent && !t.hidden).map(tab => {

        let id = `tab-${tab.name.replaceAll('.', '-')}`
        return {
          label: tab.name,
          name: tab.name,
          icon: tab.loading ? "pi pi-spin pi-spinner" : '',
          data: tab,
          template: ((item: MenuItem, options: MenuItemOptions) => {

            if (nameEdit.id.get() === tab.id) { // for editing the tab
              let editTab = getTabState(tab.id)
              const onKeyPress = (e: React.KeyboardEvent) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                  let newName = jsonClone(nameEdit.name.get()) as string
                  if (queryPanel().tabs.get().filter(t => t.id !== tab.id && !t.hidden).map(t => t.name).includes(newName)) {
                    return toastError(`Tab exists with name: ${newName}`)
                  }
                  editTab.name.set(jsonClone(nameEdit.name.get()))
                  nameEdit.set({ id: '', name: '' })
                }
              }
              return <>
                <InputText
                  style={{ fontSize: '11px' }}
                  value={nameEdit.name.get()}
                  onChange={(e) => nameEdit.name.set(e.target.value)}
                  onKeyUp={onKeyPress}
                  autoFocus
                />
              </>
            }

            return <>

              <Tooltip
                target={`#${id}`}
                style={{
                  fontSize: '11px',
                  minWidth: '250px',
                  fontFamily: 'monospace',
                }}
              >
                <span>Connection: {tab.connection}</span>
                <br />
                <span>Database:   {tab.database}</span>
              </Tooltip>

              <a
                id={id}
                data-pr-position="top"
                href="#"
                className={options.className}
                target={item.target}
                onClick={options.onClick}
                onContextMenu={event => {
                  contextTabId.set(jsonClone(tab.id))
                  cm.current?.show(event as any)
                }}
              >
                {
                  options.iconClassName !== 'p-menuitem-icon' ?
                    <>
                      <span style={{ paddingLeft: '-8px' }} />
                      <span className={classNames(options.iconClassName)} />
                      <span style={{ paddingRight: '8px' }} />
                    </>
                    :
                    null
                }
                <span
                  className={options.labelClassName}
                >
                  {item.label}
                </span>
              </a>
            </>
          })
        } as MenuItem
      })
    )

    return items
  }

  const getTabIndex = () => {
    let index = tabs.get().filter(t => !t.parent && !t.hidden).map(t => t.id).indexOf(selectedTabId.get());
    return index + 2
  }

  const setTabIndex = (item: MenuItem) => {
    actionTab(item.name as string)
  }


  return <>
    <ContextMenu model={menu()} ref={cm} onHide={() => { }} style={{ fontSize: '11px' }} />
    <TabMenu
      id="tab-names-menu"
      model={tabItems()}
      activeIndex={getTabIndex()}
      onTabChange={(e) => setTabIndex(e.value)}
    // style={{ width: '100%', position: 'fixed', zIndex: 99, overflowX: "scroll"}}
    />

    <ConnectionChooser
      show={newTab.show}
      selectDb={true}
      onSelect={(connSelected: string, dbSelected: string) => {
        if(!connSelected) return toastError('Please select a connection')
        if(!dbSelected) return toastError('Please select a database')
        createTab(newTab.name.get(), '', connSelected, dbSelected)
        newTab.show.set(false)
      }}
    />
  </>
}
