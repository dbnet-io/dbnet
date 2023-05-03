import * as React from "react";
import { useHS } from "../store/state";
import { none } from "@hookstate/core";
import { jsonClone, toastError } from "../utilities/methods";
import { Tooltip } from "primereact/tooltip";
import { ContextMenu } from "primereact/contextmenu";
import { TabMenu } from 'primereact/tabmenu';
import classNames from "classnames";
import { InputText } from "primereact/inputtext";
import { ConnectionChooser } from "./ConnectionChooser";
import { Tab } from "../state/tab";
import { MenuItem, MenuItemOptions } from "primereact/menuitem";
import { withResizeDetector } from "react-resize-detector";
import { Result } from "../state/query";

const queryPanel = () => window.dbnet.state.queryPanel
const selectTab = (id: string) => window.dbnet.selectTab(id)

export const createTab = (name: string = '', sql = '', connName: string, dbName: string) => {
  if(!dbName) dbName = window.dbnet.getConnection(connName).database
  
  name = newTabName(name, dbName)
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
    selectTab(tab.id.get());
    return tab
  }
  let newTab = new Tab({
    name,
    editor: { text: sql },
    connection: connName,
    database: dbName,
  });
  let resultTab = createTabResult(newTab)
  newTab.selectedResult = resultTab.id
  queryPanel().tabs.merge([newTab])
  selectTab(newTab.id);
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
    tab.editor.set(e => {
      let ed = window.dbnet.editorMap[tab.id.get()]
      e.text = e.text + '\n\n' + sql
      let lines = e.text.split('\n') 
      let lineNumber = (ed?.instance.getModel()?.getLineCount() || lines.length) + 2 // add 2 new lines
      e.selection = [lineNumber, 1, lineNumber, 1] // set to last line
      setTimeout(() => {
        if(!ed?.instance) return console.log('no editor')
        ed.instance.revealLine(lineNumber, 0)
        ed.instance.setPosition({column: 1, lineNumber: lineNumber})
        ed.instance.focus()
      }, 20);
      // window.dbnet.editor.focusSelection(true)
      e.focus = e.focus + 1
      return e
    })
  }
  return tab.editor.get().selectionToBlock(sql)
}

export const createTabResult = (parent: Tab) => {
  let activeResultTab = getResultState(parent.selectedResult)
  let newResult = new Result({
    parent: parent.id,
    limit: activeResultTab.limit.get() || parent.resultLimit,
    connection: parent.connection,
    database: parent.database,
  });

  // add new child tab
  AddResultAndCleanup(newResult)
  getTabState(parent.id)?.selectedResult?.set(newResult.id)
  return newResult
}

export const AddResultAndCleanup = (result: Result, numResults = 3) => {
  // delete existing non-pinned child tabs
  const is_match = (r: Result) => 
          r && !r.loading && !r.pinned && r !== none &&
          r.parent === result.parent &&
          r.id !== result.id

  queryPanel().results.set(
    results => {
      results.push(result)
      
      if(results.filter(r => is_match(r)).length <= numResults) return results

      for (let i = 0; i < results.length; i++) {
        if (is_match(results[i])) {
          results[i] = none
          if(results.filter(r => is_match(r)).length <= numResults) break
        }
      }

      return results.filter(r => r !== none)
    }
  )
}

export const getTabState = (tabID: string) => {
  let index = queryPanel().get().getTabIndexByID(tabID)
  if(index === -1) return queryPanel().tabs[0]
  return queryPanel().tabs[index]
}

export const getResultState = (resultID: string) => {
  let index = queryPanel().get().getResultIndexByID(resultID)
  if(index === -1) return queryPanel().results[0]
  return queryPanel().results[index]
}

export const getCurrentParentTabState = () => {
  let index = queryPanel().get().currTabIndex()
  return queryPanel().tabs[index]
}

export const getOrCreateParentTabState = (connection: string, database: string) => {
  let currTab = getCurrentParentTabState()

  // don't change tab
  if(currTab.connection.get()?.toUpperCase() === connection.toUpperCase() ) return currTab

  // if(currTab.connection.get()?.toUpperCase() === connection.toUpperCase() && currTab.database.get()?.toUpperCase() === database?.toUpperCase()) return currTab

  let connTabs = window.dbnet.getCurrConnectionsTabs()
  let index = connTabs
              .map(t => `${t.connection}-${t.database}`.toUpperCase())
              .indexOf(`${connection}-${database}`.toUpperCase())
  if(index === -1) {
    let tab = createTab('', '', connection, database)
    selectTab(tab.id.get())
    return tab
  }
  selectTab(connTabs[index].id)
  return getTabState(connTabs[index].id)
}

export const newTabName = (name: string, dbName?: string) => {
  let prefix = new Date().toISOString().split('T')[0]
  if(dbName) prefix = dbName

  // add new tab
  let tabNames = window.dbnet.getCurrConnectionsTabs().map(t => t.name)
  let newName = name ? name : prefix

  let i = 0;
  while (tabNames.includes(newName)) {
    i++;
    newName = name ? `${name}_${i}` : `${prefix}_${i}`;
  }

  return newName
}

const getTabIndex = () => {
  let lastTabID = window.dbnet.state.workspace.selectedConnectionTab.get()[window.dbnet.selectedConnection.toLowerCase()]
  let index = window.dbnet.getCurrConnectionsTabs()
                .filter(t => !t.hidden)
                .map(t => t.id)
                .indexOf(lastTabID);
  if(index === -1) index = 0
  return index + 2
}

interface Props {
  width?: number;
  height?: number;
}

const TabNamesComponent: React.FC<Props> = (props) => {

  ///////////////////////////  HOOKS  ///////////////////////////
  const cm = React.useRef<ContextMenu>(null);
  const selectedTabId = useHS(queryPanel().selectedTabId)
  const contextTabId = useHS('')
  const nameEdit = useHS({ id: '', name: '' })
  const newTab = useHS({show: false, name: ''})
  const activeIndex = useHS(getTabIndex())

  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    activeIndex.set(getTabIndex())
  }, [selectedTabId.get()]) // eslint-disable-line


  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const hideTab = (tabID: string) => {
    let tabI = -1;
    let connTabs = window.dbnet.getCurrConnectionsTabs()
    for (let j = 0; j < connTabs.length; j++) {
      if (connTabs[j].id === tabID) { tabI = j; }
    }

    let parentTabI = -1;
    let parentTabs = connTabs.filter(v => !v.hidden)
    for (let j = 0; j < parentTabs.length; j++) {
      if (parentTabs[j].id === tabID) { parentTabI = j; }
    }

    if (selectedTabId.get() === tabID) {
      if (parentTabI > 0) {
        window.dbnet.selectTab(parentTabs[parentTabI - 1].id)
      } else if (parentTabs.length > 0) {
        window.dbnet.selectTab(parentTabs[0].id)
      } else {
        actionTab('add')
      }
    }
    getTabState(connTabs[tabI].id).hidden.set(true)
    window.dbnet.selectTab(selectedTabId.get()) // refresh
  }

  const actionTab = (name: string) => {
    if (!name) {
      return;
    } else if (name === 'del') {
      // delete selected tab
      hideTab(jsonClone(selectedTabId.get()))
    } else if (name === 'add') {
      // add new tab
      newTab.show.set(true)
    } else {
      let connTabs = window.dbnet.getCurrConnectionsTabs()
      let index = connTabs.map(t => t.name).indexOf(name)
      let tab = connTabs[index]
      if (!tab.selectedResult) createTabResult(tab)
      window.dbnet.selectTab(tab.id);
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
            window.dbnet.selectTab(jsonClone(selectedTabId.get())) // to refresh
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
        command: () => hideTab(jsonClone(contextTab.id.get()))
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
    
    let connTabs = window.dbnet.getCurrConnectionsTabs()
    let tabItems = connTabs
        .filter(t => !t.hidden)
        .map(tab => {

        let id = `tab-${tab.name.replaceAll('.', '-')}`
        return {
          id: id,
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
              

              {/* eslint-disable-next-line */}
              <a
                id={id}
                data-pr-position="top"
                href={window.location.hash}
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

    // items = items.concat(_.sortBy(tabItems, (o) => o.name))
    items = items.concat(tabItems)

    return items
  }

  const setTabIndex = (item: MenuItem) => {
    actionTab(item.name as string)
  }


  return <>
    <ContextMenu
      model={menu()}
      ref={cm}
      onHide={() => { }}
      style={{ fontSize: '11px' }}
    />
    <TabMenu
      id="tab-names-menu"
      model={tabItems()}
      activeIndex={activeIndex.get()}
      onTabChange={(e) => setTabIndex(e.value)}
      style={{ display: 'table', width: props.width || '100%', overflowX: "scroll"}}
      // style={{ position: 'fixed', zIndex: 99, overflowX: "scroll"}}
    />

    <ConnectionChooser
      show={newTab.show}
      onSelect={(connSelected: string, dbSelected: string) => {
        if(!connSelected) return toastError('Please select a connection')
        if(!dbSelected) return toastError('Please select a database')
        createTab('', '', connSelected, dbSelected)
        newTab.show.set(false)
      }}
    />
  </>
}

export const TabNames = withResizeDetector(TabNamesComponent);
