import * as React from "react";
import AceEditor, { ICommand } from "react-ace";
import { Ace, Range } from "ace-builds";
import { Tab, useHookState } from "../store/state";
import { State } from "@hookstate/core";
import { ContextMenu } from 'primereact/contextmenu';
import "ace-builds/src-noconflict/mode-pgsql";
import "ace-builds/src-noconflict/theme-textmate";
import { toastInfo } from "../utilities/methods";
import { submitSQL } from "./TabToolbar";
import { loadMetaTable } from "./MetaTablePanel";

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
  const sql = useHookState(tab.editor.text);
  // const editorHeight = sql.get().split('\n').length*15
  const editorHeight = document.getElementById("work-input")?.parentElement?.clientHeight
  
  const commands : ICommand[] = [
    {
      name: 'execute',
      bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
      exec: (editor: Ace.Editor, args?: any) => {
        let sql = editor.getSelectedText()
        if(sql === '') { sql = tab.editor.get().getBlock() }
        if(sql.trim() !== '') { submitSQL(props.tab, sql) }
      },
    },
    {
      name: 'object',
      bindKey: { win: "Shift-Space", mac: "Shift-Space" },
      exec: (editor: Ace.Editor, args?: any) => {
        let word = editor.getSelectedText()
        if(word === '') { word = tab.editor.get().getWord() }
        if(word.trim() !== '') { loadMetaTable(word) }
      },
    },
    {
      name: 'duplicate',
      bindKey: { win: "Ctrl-D", mac: "Command-D" },
      exec: (editor: Ace.Editor, args?: any) => {
        editor.duplicateSelection()
      },
    },
  ]
  return <div
    style={{ paddingTop: '40px', display: tab.showSql.get() ? '' : 'none'}}
    onContextMenu={(e: any) => (cm as any).current.show(e)}
  >

    <ContextMenu model={contextItems} ref={cm}></ContextMenu>
    <AceEditor
      width="100%"
      // height={ !editorHeight || editorHeight < 400 ? '400px' : `${editorHeight}px` }
      height={ editorHeight ? `${editorHeight-40}px` : '200px' }
      // height={ '200px' }
      mode="pgsql"
      name="sql-editor"
      onChange={(v) => sql.set(v)}
      // fontSize={14}
      showPrintMargin={true}
      showGutter={true}
      theme="textmate"
      // highlightActiveLine={true}
      value={sql.get()}
      commands={commands}
      onLoad={(editor: Ace.Editor) => {
        let selection = tab.editor.selection.get()
        editor.selection.setRange(new Range(
          selection[0], selection[1],
          selection[2], selection[3],
        ))
        editor.scrollToLine(selection[0], true, false, () => {})
        editor.focus()
      }}
      // onSelectionChange={(e) => {
      //   tab.editor.selection.set([
      //     e.cursor.row, e.cursor.column,
      //     e.anchor.row, e.anchor.column,
      //   ])
      // }}
      onCursorChange={(e) => {
        tab.editor.selection.set([
          e.cursor.row, e.cursor.column,
          e.cursor.row, e.cursor.column,
        ])
      }}
      setOptions={{
        // enableBasicAutocompletion: false,
        // enableLiveAutocompletion: false,
        // enableSnippets: false,
        showLineNumbers: true,
        autoScrollEditorIntoView: true,
        wrap: false,
        wrapBehavioursEnabled: true,
        showPrintMargin: false,
        tabSize: 2,
      }} />
  </div>;
}
