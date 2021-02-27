import * as React from "react";
import { Tree } from 'primereact/tree';
import { toastInfo } from "../utilities/methods";
import { ContextMenu } from 'primereact/contextmenu';
import { ObjectAny } from "../utilities/interfaces";
import './SchemaTree.css'

interface Props {}

interface Ref {
  current: any
}

export const SchemaTree: React.FC<Props> = (props) => {
  const [nodes, setNodes] = React.useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = React.useState({});
  const [selectedNodeKey, setSelectedNodeKey] = React.useState<string>('');
  const toast = React.useRef(null);
  const cm = React.useRef<ContextMenu>(null);
  const menu = [
      {
          label: 'View Key',
          icon: 'pi pi-search',
          command: () => {
              toastInfo('Node Key', selectedNodeKey)
          }
      },
      {
          label: 'Toggle',
          icon: 'pi pi-cog',
          command: () => {
              let _expandedKeys : ObjectAny = {...expandedKeys};
              if (_expandedKeys[selectedNodeKey])
                  delete _expandedKeys[selectedNodeKey];
              else
                  _expandedKeys[selectedNodeKey] = true;

              setExpandedKeys(_expandedKeys);
          }
      }
  ];

  ///////////////////////////  HOOKS  ///////////////////////////
  ///////////////////////////  EFFECTS  ///////////////////////////

  React.useEffect(() => {
    setNodes([
      {"key":"0","label":"Documents","data":"Documents Folder","icon":"pi pi-fw pi-inbox","children": [{"key": "0-0","label": "Work","data": "Work Folder","icon": "pi pi-fw pi-cog","children": [{ "key": "0-0-0", "label": "Expenses.doc", "icon": "pi pi-fw pi-file", "data": "Expenses Document" }, { "key": "0-0-1", "label": "Resume.doc", "icon": "pi pi-fw pi-file", "data": "Resume Document" }]},{"key": "0-1","label": "Home","data": "Home Folder","icon": "pi pi-fw pi-home","children": [{ "key": "0-1-0", "label": "Invoices.txt", "icon": "pi pi-fw pi-file", "data": "Invoices for this month" }]}]},
      {"key":"1","label":"Events","data":"Events Folder","icon":"pi pi-fw pi-calendar","children": [{ "key": "1-0", "label": "Meeting", "icon": "pi pi-fw pi-calendar-plus", "data": "Meeting" },{ "key": "1-1", "label": "Product Launch", "icon": "pi pi-fw pi-calendar-plus", "data": "Product Launch" },{ "key": "1-2", "label": "Report Review", "icon": "pi pi-fw pi-calendar-plus", "data": "Report Review" }]},
      {"key":"2","label":"Movies","data":"Movies Folder","icon":"pi pi-fw pi-star","children": [{"key": "2-0","icon": "pi pi-fw pi-star","label": "Al Pacino","data": "Pacino Movies","children": [{ "key": "2-0-0", "label": "Scarface", "icon": "pi pi-fw pi-video", "data": "Scarface Movie" }, { "key": "2-0-1", "label": "Serpico", "icon": "pi pi-fw pi-video", "data": "Serpico Movie" }]},{"key": "2-1","label": "Robert De Niro","icon": "pi pi-fw pi-star","data": "De Niro Movies","children": [{ "key": "2-1-0", "label": "Goodfellas", "icon": "pi pi-fw pi-video", "data": "Goodfellas Movie" }, { "key": "2-1-1", "label": "Untouchables", "icon": "pi pi-fw pi-video", "data": "Untouchables Movie" }]}]}
  ])
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return (
    <div>
      <ContextMenu model={menu} ref={cm} onHide={() => setSelectedNodeKey('')}/>
      <Tree
        value={nodes}
        expandedKeys={expandedKeys}
        onToggle={e => setExpandedKeys(e.value)}
        contextMenuSelectionKey={selectedNodeKey} 
        onContextMenuSelectionChange={event => setSelectedNodeKey(event.value)}
        onContextMenu={event => cm.current?.show(event.originalEvent as any)}
        contentStyle={{
          height: `${Math.floor(window.innerHeight/2)}px`,
          fontSize: '0.8rem',
          padding: 0,
        }}
      />
    </div>
  );
};