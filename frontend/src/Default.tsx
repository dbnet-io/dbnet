import _ from "lodash";
import { ProgressSpinner } from "primereact/progressspinner";
import { Splitter, SplitterPanel } from "primereact/splitter";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { ConnectionChooser } from "./components/ConnectionChooser";
import { JobPanel } from "./components/JobPanel";
import { getTabState } from "./components/TabNames";
import { TopMenuBar } from "./components/TopMenuBar";
import { LeftPane } from "./panes/LeftPane";
import { RightPane } from "./panes/RightPane";
import { useHS } from "./store/state";
import { jsonClone, toastError, toastInfo } from "./utilities/methods";

interface Props {}

export const Default: React.FC<Props> = (props) => {
  const dbnet = window.dbnet
  
  ///////////////////////////  HOOKS  ///////////////////////////
  const chooseConnection = useHS(false)
  const transient = useHS(window.dbnet.state.transient)
  const splitterHeight = `${Math.floor(window.innerHeight - 60)}px`
  let location = useLocation();

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(() => {
    // Init()
  }, [])// eslint-disable-line


  React.useEffect(() => {
    Init()
    return () => {
      dbnet.dispose()
    }
  }, [])// eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////

  const Init = async () => {
    await dbnet.init()

    if(location && !dbnet.selectedConnection) {
      dbnet.selectConnection(location.hash.replace('#', '').replace('/', ''))
    }

    if(dbnet.connections.length === 0) {
      // need to create connections
      toastInfo('Did not find any connections.')
      return
    }

    // choose conn if needed
    if(!dbnet.selectedConnection) return chooseConnection.set(true)

    // set title
    document.title = `${dbnet.selectedConnection.toUpperCase()}`

    // init load session
    // await globalStore.loadSession(dbnet.selectedConnection)

    // set init tab to current connection/database
    let tabs = window.dbnet.getCurrConnectionsTabs().filter(t => !t.hidden)
    if (tabs.length === 1 && !tabs[0].connection) {
      let tab = getTabState(tabs[0].id)
      let conn = dbnet.getConnection(dbnet.selectedConnection)
      tab.set(t => {
        t.connection = conn.name
        t.database = conn.database
        return t
      })
    }

    let lastTabID = window.dbnet.state.workspace.selectedConnectionTab.get()[dbnet.selectedConnection.toLowerCase()]
    window.dbnet.selectTab(lastTabID)

    await dbnet.getDatabases(dbnet.selectedConnection)
    dbnet.getAllSchemata(dbnet.selectedConnection)
    // dbnet.trigger('refreshSchemaPanel')
  }


  const onKeyPress = (e: React.KeyboardEvent) => {
    // omni search
    // if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === ' ') {
    if (e.shiftKey && e.key === ' ') {
      let el = document.getElementById('omni-search')
      if (el) {
        (el.children[0] as HTMLElement).focus()
      }
    }
  }

  const refresh = () => window.dbnet.selectTab(jsonClone(window.dbnet.state.queryPanel.selectedTabId.get()))
  const [debounceRefresh] = React.useState(() => _.debounce(() => refresh(), 400));


  ///////////////////////////  JSX  ///////////////////////////

  return (
    <div
      className="App"
      style={{ backgroundColor: '#d3d3d3' }}
      // onKeyPress={onKeyPress}
      onKeyDown={onKeyPress}
    >
      <JobPanel/>
      {/* <PreviewPanel /> */}
      {/* <MetaExplorer/> */}
     {
      chooseConnection.get() ?
        <ConnectionChooser
          show={chooseConnection}
          selectDb={false}
          onSelect={(connSelected: string) => {
            if(!connSelected) return toastError('Please select a connection')
            chooseConnection.set(false)
            dbnet.selectConnection(connSelected)
            Init()
          }}
        />
        :
        null
      }

      <div style={{ paddingBottom: '7px' }}>
        <TopMenuBar/>
      </div>
      <div style={{ backgroundColor: '#d3d3d3' }}>
      {
       transient.get().showLoadSpinner ?
          <div style={{position: 'absolute', top: `50%`, left: '50%'}}>
            <div style={{position: 'absolute', top: `50%`, left: '50%'}}>
              <ProgressSpinner style={{width: '60px', height: '60px'}} strokeWidth="8" fill="#EEEEEE" animationDuration=".5s"/>
            </div>
          </div>
          :
          null
      }

      <Splitter
        style={{
          height: splitterHeight,
          marginLeft: '5px',
          display: transient.get().showLoadSpinner ? 'none': null,
        }}
        stateKey={"splitter"}
        stateStorage={"local"}
        onResizeEnd={(e) => debounceRefresh()} 
        gutterSize={10}
      >
        <SplitterPanel className="p-d-flex" style={{maxWidth:'450px'}}>
          <LeftPane/>
        </SplitterPanel>
        <SplitterPanel className="p-d-flex">
          <RightPane/>
          {/* <Sessions/> */}
        </SplitterPanel>
      </Splitter>
      </div>
    </div>
  );
};