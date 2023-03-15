import { none } from "@hookstate/core";
import _ from "lodash";
import { ContextMenu } from "primereact/contextmenu";
import { Tree } from "primereact/tree";
import TreeNode from "primereact/treenode";
import * as React from "react";
import { useHS } from "../store/state";
import { ObjectAny } from "../utilities/interfaces";
import { confirmDialog } from "primereact/confirmdialog";
import { createTab, getTabState } from "./TabNames";
import { InputText } from "primereact/inputtext";
import { jsonClone, toastError, toastInfo } from "../utilities/methods";

interface Props {}

export const WorkPanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const cmWorksheet = React.useRef<ContextMenu>(null)
  const loading = useHS(false)
  const expandedKeys = useHS(window.dbnet.state.workPanel.expandedNodes)
  const selectedKeys = useHS(window.dbnet.state.workPanel.selectedNodes)
  const fileNodes = useHS<TreeNode[]>([])
  const selectedTabId = useHS(window.dbnet.state.queryPanel.selectedTabId)
  const nameEdit = useHS({ id: '', name: '' })

  const leftPanelratio = window.dbnet.state.settingState.leftPaneRatio.get()
  const childHeight1 = (document.getElementById("left-pane")?.scrollHeight as number) * leftPanelratio[0] / 100
  const height = childHeight1? childHeight1 - 110 : ((document.body.scrollHeight / 2) - 60)

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(()=>{
    refresh()

    expandedKeys.set(
      ek => {
        if(Object.keys(ek).length === 0) 
          ek = { 'root.worksheets': true }
        return ek
      }
    )

    selectedKeys.set(
      sk => {
        sk = {}
        sk[selectedTabId.get()] = true
        return sk
      }
    )
  }, [selectedTabId.get()]) // eslint-disable-line
  
  ///////////////////////////  FUNCTIONS  ///////////////////////////


  const makeNodes = () => {
    let newNodes : TreeNode[] = []
    let worksheets : TreeNode[] = []

    let tabs = window.dbnet.getCurrConnectionsTabs()
    for(let tab of tabs) {
      let newNode = {
        key: tab.id,
        label: tab.name,
        data: tab,
        icon: 'pi pi-file'
      } as TreeNode
      
      worksheets.push(newNode) 
    }

    let worksheetFolder = {
      key: 'root.worksheets',
      label: 'Worksheets',
      icon: 'pi pi-folder',
      children: _.sortBy(worksheets, (o) => o.label),
    } as TreeNode
    newNodes.push(worksheetFolder) 

    return newNodes
  }

  const refresh = () => fileNodes.set(makeNodes())


  const deleteTab = (id: string) => {
    if(!id) return

    let connTabs = window.dbnet.getCurrConnectionsTabs()
    let index = window.dbnet.state.queryPanel.tabs.get().map(t => t.id).indexOf(id)
    if(index === -1) return

    // if tab is currently selected, select another
    if(id === window.dbnet.state.queryPanel.selectedTabId.get()) {
      if(connTabs.length === 1) {
        // create a new one, and select
        createTab('', '', window.dbnet.selectedConnection, '')
      } else {
        let other_tab = connTabs.filter(t => t.id !== id)[0]
        window.dbnet.selectTab(other_tab.id)
      }
    }

    // set to none to delete
    window.dbnet.state.queryPanel.tabs[index].set(none)
  }

  ///////////////////////////  JSX  ///////////////////////////

  const nodeTemplate = (node: TreeNode) => {

     // for editing name
    if (nameEdit.id.get() === node.key) {
      let editTab = getTabState(node.key)
      const onKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          let newName = jsonClone(nameEdit.name.get()) as string
          if(window.dbnet.getCurrConnectionsTabs().map(t => t.name).includes(newName)) {
            return toastError(`Worksheet exists with name: ${newName}`)
          }
          editTab.name.set(jsonClone(nameEdit.name.get()))
          nameEdit.set({ id: '', name: '' })

          // refresh
          window.dbnet.selectTab(selectedTabId.get())
          refresh()
        }
      }
      return<InputText
          style={{ fontSize: '11px' }}
          value={nameEdit.name.get()}
          onChange={(e) => nameEdit.name.set(e.target.value)}
          onKeyUp={onKeyPress}
          autoFocus
        />
    }

    let label = <>{node.label}</>
    return <span>{label}</span>
  }

  const contextMenuWorksheet = [
    {
      label: 'New Worksheet',
      icon: 'pi pi-plus',
      command: () => {
        createTab('', '', window.dbnet.selectedConnection, '')
      }
    },
    {
      label: 'Rename',
      icon: 'pi pi-pause',
      command: () => {
        let tab_ids = Object.keys(selectedKeys.get())
        if(tab_ids.length > 1) return toastInfo("Can only rename one at a time")
        let tab = getTabState(tab_ids[0])
        nameEdit.set(jsonClone({ id: tab.id.get(), name: tab.name.get() }))
      }
    },
    {
      label: 'Delete',
      icon: 'pi pi-times',
      command: () => { 
        confirmDialog({
          message: 'Are you sure you want to delete?',
          header: 'Confirmation',
          icon: 'pi pi-exclamation-triangle',
          accept: async () => {
            for(let tab_id of Object.keys(selectedKeys.get())) {
              deleteTab(tab_id)
            }
          },
        })
      }
    },
    {
      separator: true
    },
    {
      label: 'New Folder',
      icon: 'pi pi-folder',
      command: () => {}
    },
  ];
  
  return <>
    <ContextMenu 
      model={contextMenuWorksheet} ref={cmWorksheet} 
      // onHide={() => setSelectedNodeKey('')}
      style={{fontSize:'11px'}}
    />
    <div id="work-panel" className="p-grid p-fluid">
      <div className="p-col-12 p-md-12" style={{paddingTop: '7px', paddingBottom: '7px'}}>

      <Tree
        id="project-tree"
        style={{ fontSize: '9px', padding: '0px'}}
        filter filterMode="lenient"
        filterPlaceholder="Search..."
        loading={loading.get()}
        value={fileNodes.get()}
        selectionKeys={selectedKeys.get()}
        selectionMode="multiple"
        metaKeySelection={true}
        expandedKeys={expandedKeys.get()}
        onToggle={e => expandedKeys.set(e.value)}
        onSelect={async (e) => {
          let tab_id = e.node.key as string
          if(!tab_id) return
          window.dbnet.selectTab(tab_id)
        }}
        onSelectionChange={e => {
          selectedKeys.set(e.value as ObjectAny)
        }}
        // contextMenuSelectionKey={selectedNodeKey}
        onContextMenuSelectionChange={event => {
          let contextKey = `${event.value}`
          let keys = Object.keys(selectedKeys.get())
          if (keys.length > 1 && keys.includes(contextKey)) return
          // selectedKeys.set({ [contextKey]: true })
        }}
        onContextMenu={event => cmWorksheet.current?.show(event.originalEvent as any)}
        // onExpand={(e)=>{console.log(e)}}
        nodeTemplate={nodeTemplate}
        contentStyle={{
          height: `${height}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
      />
      </div>
    </div>
  </>
};