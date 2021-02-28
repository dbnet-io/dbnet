import * as React from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-pgsql";
import { Tab, useGlobalState, useHookState } from "../store/state";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { State } from "@hookstate/core";
import { QueryTable } from "./QueryTable";
import { SelectButton } from "primereact/selectbutton";

interface Props {}

export const QueryPanel: React.FC<Props> = (props) => {
  
  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////

  const TabToolbar = (props: {tab: State<Tab>}) => {
    const tab = props.tab
    return (
      <div id='query-toolbar' className="p-grid" style={{paddingTop: '6px'}}>
        <div className="p-col-12">
          <div  className="work-buttons p-inputgroup" style={{fontFamily:'monospace'}}>
                <span className="p-inputgroup-addon">
                    <i className="pi pi-clock" ></i>
                </span>
                <span className="p-inputgroup-addon">
                    <i className="pi pi-star"></i>
                </span>
                <Button icon="pi pi-bookmark" className="p-button-sm p-button-secondary" />

                <Button
                  label='SQL' className="p-button-sm p-button-info"
                  onClick={(e) => { tab.showSql.set(!tab.showSql.get()) }}
                />

                <Button
                  icon="pi pi-refresh" tooltip="refresh" className="p-button-sm p-button-info"
                  onClick={(e) => { 
                    tab.loading.set(true)
                    tab.query.headers.set(h => h.concat("name"))
                    setTimeout(
                      () => tab.loading.set(false),
                      1000)
                  }}
                />

                <Button icon="pi pi-clock" className="p-button-sm p-button-outlined p-button-secondary" tooltip="Interval"/>
                <Button icon="pi pi-search-plus" tooltip="Row Viewer" className="p-button-sm p-button-outlined p-button-secondary" />
                <span className="p-inputgroup-addon" >{tab.query.rows.length} rows</span>
                <span className="p-inputgroup-addon">{tab.query.duration.get()} sec</span>
                <InputText
                  id="table-filter" 
                  className="p-inputtext-sm" placeholder="Filter..."
                  value={ tab.filter.get() }
                  onChange={(e) => { tab.filter.set((e.target as HTMLInputElement).value) }}
                />
            </div>
        </div>
      </div>)
  }

  const Editor = (props: {tab: State<Tab>}) => {
    const tab = props.tab
    return <div style={{paddingTop: '6px', display: tab.showSql.get()? '': 'none'}}>
      <AceEditor
        width="100%"
        height="300px"
        mode="pgsql"
        name="sql-editor"
        onChange={(v) => tab.query.text.set(v)}
        // fontSize={14}
        showPrintMargin={true}
        showGutter={true}
        // highlightActiveLine={true}
        value={ tab.query.text.get() }
        setOptions={{
          enableBasicAutocompletion: false,
          enableLiveAutocompletion: false,
          enableSnippets: false,
          showLineNumbers: true,
          autoScrollEditorIntoView: true,
          wrap: false,
          wrapBehavioursEnabled: true,
          showPrintMargin: false,
          tabSize: 2,
        }}
      />
    </div>
  }

  const TabElem = () => {
    const state = useGlobalState() 
    const tabName = state.session.selectedTab.get()
    const tabIndex = state.session.get().getTabIndex(tabName)
    const tab = state.session.tabs[tabIndex]

    return (
      <>
      <TabToolbar tab={tab}/>

      <Editor tab={tab}/>

      <QueryTable loading={tab.loading} headers={tab.query.headers} rows={tab.query.rows}/>

      </>
    )
  }
  
  const Tabs = () => {

    const state = useGlobalState()
    const tabs = state.session.tabs
    const tabOptions = tabs.get().map(t => t.name)
    const selectedTab = state.session.selectedTab
    const selectedTabName = selectedTab.get()
    const optionTemplate = (option: string) => {
        let icon = ''
        if (option === 'del') { icon = 'pi pi-times'}
        if (option === 'add') { icon = 'pi pi-plus'}
        if(icon) { return <i className={icon}></i> }
        else { return option }
    }

    const actionTab = (name: string) => {
      if(!name) {
        return
      } else if(name === 'del') {
        let i = -1
        tabs.set(
          t => t.filter((v, j) => { 
            if(v.name === selectedTabName) { i = j }
            return v.name !== selectedTabName
          })
        )
        if(i > 0) { selectedTab.set(tabs.get()[i-1].name) }
        else if(tabs.length > 0) { selectedTab.set(tabs.get()[0].name) }
        else { tabs.set([new Tab({name: 'Q1'})]) }
      } else if(name=== 'add') {
        // new tab
        let i = tabOptions.length+1
        let newName = `Q${i}`
        while(tabOptions.includes(newName)) {
          i++
          newName = `Q${i}`
        }
        let newTab = new Tab({name: newName})
        tabs.set(
          t => t.concat([newTab])
        )
        selectedTab.set(newTab.name)
      } else { 
        let index = state.session.get().getTabIndex(name)
        selectedTab.set(tabs[index].get().name)
      }
      document.getElementById("table-filter")?.focus()
    }
    
    return (
      <SelectButton
        value={ selectedTab.get() }
        options={ ['del', 'add'].concat(tabOptions) }
        onChange={(e: any) => actionTab(e.value) }
        style={{width: '100%'}}
        // options={justifyOptions}
        itemTemplate={optionTemplate}
      />
    )
  }

  return (
    <div id="work-input">
      <Tabs/>
      <TabElem/>
    </div>
  );
};