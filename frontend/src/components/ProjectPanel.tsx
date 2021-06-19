import { State } from "@hookstate/core";
import _ from "lodash";
import { Button } from "primereact/button";
import TreeNode from "primereact/components/treenode/TreeNode";
import { ContextMenu } from "primereact/contextmenu";
import { Tooltip } from "primereact/tooltip";
import { Tree } from "primereact/tree";
import * as React from "react";
import { apiGet, apiPost } from "../store/api";
import { accessStore, FileItem, globalStore, useHS } from "../store/state";
import { MsgType } from "../store/websocket";
import { jsonClone, toastError } from "../utilities/methods";
import { createTab } from "./TabNames";
import yaml from 'yaml'
import { Dialog } from "primereact/dialog";
import { ListBox } from "primereact/listbox";

const store = accessStore()

interface Props {}

export const ProjectPanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const cm = React.useRef<ContextMenu>(null);
  const loading = useHS(false)
  const chooseProfile = useHS(false)
  const projectPanel = useHS(store.projectPanel)
  const rootPath = useHS(projectPanel.rootPath)
  const fileNodes = useHS(projectPanel.fileNodes)
  const dbtProject = useHS(projectPanel.dbtProject)
  const dbtProfile = useHS(projectPanel.dbtProfile)
  const dbtTarget = useHS(projectPanel.dbtTarget)

  ///////////////////////////  EFFECTS  ///////////////////////////
  React.useEffect(()=>{
    // rootPath.set('/__/tmp/PollyDbt')
    Init()
  }, []) // eslint-disable-line

  ///////////////////////////  FUNCTIONS  ///////////////////////////
  const fileOp = (operation: 'list' | 'read' | 'write' | 'delete', file: FileItem, overwrite=false) => {
    let data = {
      operation,
      overwrite,
      file,
    }
    return apiPost(MsgType.FileOperation, data)
  }

  const getHomeDir = async () => {
    let resp = await apiGet(MsgType.GetSettings)
    if (resp.error) throw new Error(resp.error)
    return resp.data.homeDir as string
  }


  const Init = async () => {
    if(rootPath.get() === '') {
      rootPath.set(await getHomeDir())
    }
    if(fileNodes.get().length > 0 && dbtProfile.get()) return
    refreshRoot()
  }

  const refreshRoot = async () => {
    fileNodes.set(await makeNodes(rootPath.get()))
    if(fileNodes.length === 0 && rootPath.get() !== '') {
      rootPath.set(await getHomeDir())
      fileNodes.set(await makeNodes(rootPath.get()))
    } 

    // look for dbt project & load it
    dbtProject.set(undefined)
    for(let node of fileNodes.get()) {
      let item = (node.data as FileItem)
      if(item.name === 'dbt_project.yml') loadDbtProject(item)
    }
  }

  const findNode = (nodes: State<TreeNode[]>, key: string) => {
    let node : State<TreeNode> = {} as State<TreeNode>
    for (let i = 0; i < nodes.length; i++) {
      node = nodes[i];
      if (node.children.length > 0) {
        node = findNode(node.children, key)
      }
      if(node.key.get() === key) return node
    }
    return node
  }

  const makeNodes = async (path: string, limit = 1, deepness = 0) => {
    let newNodes : TreeNode[] = []
    if(deepness > limit) return newNodes

    let items = await listFiles(path)
    for(let item of items) {
      let newNode = {
        key: item.path,
        label: item.name,
        data: item,
        icon: item.isDir ? 'pi pi-folder':'pi pi-file'
      } as TreeNode
      if(item.isDir) {
        newNode.children = await makeNodes(item.path, limit, deepness+1)
      }
      newNodes.push(newNode)
    }
    return _.sortBy(newNodes, (o) => !o.data.isDir)
  }
  

  const listFiles = async (path: string) => {
    const allowedExt = ['.sql', '.yml', '.yaml']
    let items : FileItem[] = []
    loading.set(true)
    try {
      let resp = await fileOp('list', {path})
      if (resp.error) throw new Error(resp.error)
      items = resp.data.items as FileItem[]
    } catch (error) {
      toastError(error)
    }
    loading.set(false)

    const filter = (i: FileItem) => {
      let matched = false
      for(let ext of allowedExt) {
        if(i.name === '.git') continue
        if(i.isDir || i.name?.toLowerCase().endsWith(ext)) {
          matched = true
        }
      }
      return matched
    }
    return items.filter(i => filter(i))
  }

  const dbtConns = () : string[] => store.connections.get().filter(c => c.dbt).map(c => c.name.toLowerCase())
  
  const loadDbtProject = async (file: FileItem) => {
    if(file.name?.toLowerCase() !== 'dbt_project.yml') return
    try {
      let resp = await fileOp('read', file)
      if(resp.error) throw new Error(resp.error)
      dbtProject.set(yaml.parse(resp.data.file.body))
      if(!dbtProfile.get()) dbtProfile.set(dbtProject.get()?.profile)
    } catch (error) {
      toastError(error)
    }
    if(!dbtConns().includes(dbtConn())) {
      chooseProfile.set(true)
    }
  }

  const dbtConn = () => {
    return `${dbtProfile.get()?.toLowerCase()}/${dbtTarget.get().toLowerCase()}`
  }

  ///////////////////////////  JSX  ///////////////////////////

  const ProfileChooser = () => {
    const profileTargetSelected = useHS('')
    const footer = () => {
      return <div style={{textAlign: 'center'}}>
          <Button label="OK" icon="pi pi-check" onClick={async () => {
            chooseProfile.set(false)
            let arr = profileTargetSelected.get().split('/')
            if(arr.length !== 2) return toastError('Invalid Profile/Target')
            dbtProfile.set(arr[0])
            dbtTarget.set(arr[1])
            await globalStore.saveSession()
            Init()
          }} 
          className="p-button-text" />
      </div>
    }
    return  (
      <Dialog
        header="Choose a Profile/Target" visible={chooseProfile.get()}
        footer={footer()} 
        onHide={() => chooseProfile.set(false)}
        style={{maxWidth: '21rem'}} 
      >
        <ListBox 
          value={profileTargetSelected.get()}
          options={store.connections.get().filter(c => c.dbt).map(c => c.name)}
          onChange={(e) => profileTargetSelected.set(e.value)} 
          listStyle={{fontFamily:'monospace'}}
          style={{width: '14rem'}} 
        />
      </Dialog>
    )
  }

  const FolderTree = () => {
    const expandedKeys = useHS(projectPanel.expandedNodes)
    const lastClick = useHS<{ts: number, key: any}>({ts:0, key:''});

    const nodeTemplate = (node: TreeNode) => {
      let label = <>{node.label}</>
      return <span>{label}</span>
    }

    const menu = [
      {
        label: 'Refresh',
        icon: 'pi pi-refresh',
        command: () => {}
      },
    ];

    return <>
      <ContextMenu 
        model={menu} ref={cm} 
        // onHide={() => setSelectedNodeKey('')}
        style={{fontSize:'11px'}}
      />
      <Tree
        id="project-tree"
        style={{ fontSize: '9px', padding: '0px'}}
        filter filterMode="lenient"
        filterPlaceholder="Search..."
        loading={loading.get()}
        value={fileNodes.get()}
        // value={connection.get().schemaNodes()}
        // selectionKeys={selectedKeys.get()}
        selectionMode="multiple"
        metaKeySelection={true}
        expandedKeys={expandedKeys.get()}
        onToggle={e => expandedKeys.set(e.value)}
        onSelect={async (e) => {
          let item = jsonClone<FileItem>(e.node.data)
          if(item.isDir) {
            let node = findNode(fileNodes, e.node.key as string)
            if(!node.key) return
            node.children.set(await makeNodes(item.path))
          } else {
            if (!item.name?.endsWith('.sql')) return
            let ts = (new Date()).getTime()
            if(lastClick.ts.get() === 0) {
              lastClick.set({ts:ts, key: e.node.key?.toString() })
            } else if (ts - lastClick.ts.get() < 500 && e.node.key === lastClick.key.get()) {
              // simulate double click
              lastClick.set({ts:0, key:''})
              loading.set(true)
              try {
                let resp = await fileOp('read', {path: item.path})
                if(resp.error) throw new Error(resp.error)
                let tab = createTab(item.name, resp.data.file.body as string)
                tab.file.set(item)
              } catch (error) {
                toastError(error)
              }
              loading.set(false)
            } else {
              lastClick.set({ts:ts, key: e.node.key })
            }
          }
        }}
        // onSelectionChange={e => selectedKeys.set(e.value)}
        // contextMenuSelectionKey={selectedNodeKey}
        // onContextMenuSelectionChange={event => {
        //   let contextKey = `${event.value}`
        //   let keys = Object.keys(selectedKeys.get())
        //   if(keys.length > 1 && keys.includes(contextKey)) return
        //   selectedKeys.set({[contextKey]: true})
        //   setSelectedNodeKey(contextKey)
        // }}
        // onContextMenu={event => cm.current?.show(event.originalEvent as any)}
        // onExpand={(e)=>{console.log(e)}}
        nodeTemplate={nodeTemplate}
        contentStyle={{
          height: `${window.innerHeight - 230}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
      />
    </>
  }

  return (
    <div className="p-grid p-fluid" style={{textAlign:'center'}}>
      <div className="p-col-12 p-md-12" style={{paddingTop: '7px', paddingBottom: '7px'}}>
        <b>{rootPath.get()}</b>
        <span style={{paddingLeft: '10px'}}>
          <a href="#;">
            <i 
              className="pi pi-folder-open"
              onClick={async () => {}}
            />
          </a>
        </span>
        <span style={{paddingLeft: '10px'}}>
        <a href="#;">
          <i 
            className="pi pi-refresh"
            onClick={() => refreshRoot()}
          />
        </a>
        </span>
      </div>

      <ProfileChooser/>
      {
        dbtProject.get()?
        <div className="p-col-12 p-md-12" style={{color: 'green', fontSize: '0.7rem', paddingBottom: '7px'}}>
          <b>dbt project —  
            <span style={{color: 'teal', paddingLeft:'3px'}}>
              { dbtConn() }
              <Tooltip target="#dbt-settings-profile" style={{fontSize: '0.6rem'}}/>
              <a id="dbt-settings-profile" href="#;" data-pr-tooltip="Change profile/target">
                <i 
                  style={{color: 'teal', fontSize: '0.9em', paddingLeft: '5px'}}
                  className="pi pi-cog"
                  onClick={async () => chooseProfile.set(true)}
                />
              </a>
            </span>
          </b>
        </div>
        :
        null
      }

      {
        rootPath.get() === '' ?
        <>
          <br/>
        </>
        :
        <div className="p-col-12 p-md-12">
          <FolderTree />
        </div>
      }
    </div>
  );
};