import * as React from "react";
import AceEditor from "react-ace";
import { Tab, useHookState } from "../store/state";
import { State } from "@hookstate/core";
import { ContextMenu } from 'primereact/contextmenu';

const contextItems = [
  {
     label:'File',
     icon:'pi pi-fw pi-file',
     items:[
        {
           label:'New',
           icon:'pi pi-fw pi-plus',
           items:[
              {
                 label:'Bookmark',
                 icon:'pi pi-fw pi-bookmark'
              },
              {
                 label:'Video',
                 icon:'pi pi-fw pi-video'
              },

           ]
        },
        {
           label:'Delete',
           icon:'pi pi-fw pi-trash'
        },
        {
           separator:true
        },
        {
           label:'Export',
           icon:'pi pi-fw pi-external-link'
        }
     ]
  },
  {
     label:'Edit',
     icon:'pi pi-fw pi-pencil',
     items:[
        {
           label:'Left',
           icon:'pi pi-fw pi-align-left'
        },
        {
           label:'Right',
           icon:'pi pi-fw pi-align-right'
        },
        {
           label:'Center',
           icon:'pi pi-fw pi-align-center'
        },
        {
           label:'Justify',
           icon:'pi pi-fw pi-align-justify'
        },

     ]
  },
  {
     label:'Users',
     icon:'pi pi-fw pi-user',
     items:[
        {
           label:'New',
           icon:'pi pi-fw pi-user-plus',

        },
        {
           label:'Delete',
           icon:'pi pi-fw pi-user-minus',

        },
        {
           label:'Search',
           icon:'pi pi-fw pi-users',
           items:[
              {
                 label:'Filter',
                 icon:'pi pi-fw pi-filter',
                 items:[
                    {
                       label:'Print',
                       icon:'pi pi-fw pi-print'
                    }
                 ]
              },
              {
                 icon:'pi pi-fw pi-bars',
                 label:'List'
              }
           ]
        }
     ]
  },
  {
     label:'Events',
     icon:'pi pi-fw pi-calendar',
     items:[
        {
           label:'Edit',
           icon:'pi pi-fw pi-pencil',
           items:[
              {
                 label:'Save',
                 icon:'pi pi-fw pi-calendar-plus'
              },
              {
                 label:'Delete',
                 icon:'pi pi-fw pi-calendar-minus'
              },

           ]
        },
        {
           label:'Archieve',
           icon:'pi pi-fw pi-calendar-times',
           items:[
              {
                 label:'Remove',
                 icon:'pi pi-fw pi-calendar-minus'
              }
           ]
        }
     ]
  },
  {
     separator:true
  },
  {
     label:'Quit',
     icon:'pi pi-fw pi-power-off'
  }
];

export function TabEditor(props: { tab: State<Tab>; }) {
  const tab = props.tab;
  const cm = React.useRef(null);
  const sql = useHookState(tab.query.text);
  return <div
    style={{ paddingTop: '6px', display: tab.showSql.get() ? '' : 'none' }}
    onContextMenu={(e: any) => (cm as any).current.show(e)}
  >

    <ContextMenu model={contextItems} ref={cm}></ContextMenu>
    <AceEditor
      width="100%"
      height="300px"
      mode="pgsql"
      name="sql-editor"
      onChange={(v) => sql.set(v)}
      // fontSize={14}
      showPrintMargin={true}
      showGutter={true}
      // highlightActiveLine={true}
      value={sql.get()}
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
      }} />
  </div>;
}
