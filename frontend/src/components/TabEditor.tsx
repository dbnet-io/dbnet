import * as React from "react";
import AceEditor, { ICommand } from "react-ace";
import { Ace, Range, UndoManager } from "ace-builds";
import { Tab, useHS } from "../store/state";
import { State } from "@hookstate/core";
import { ContextMenu } from 'primereact/contextmenu';
import "ace-builds/src-noconflict/mode-pgsql";
import "ace-builds/src-noconflict/theme-textmate";
import { toastInfo } from "../utilities/methods";
import { submitSQL } from "./TabToolbar";
import { loadMetaTable } from "./MetaTablePanel";
import ace from "react-ace";


export function TabEditor(props: { tab: State<Tab>, aceEditor: React.MutableRefObject<any> }) {
  const tab = useHS(props.tab)
  const cm = React.useRef(null);
  const sql = useHS(tab.editor.text);
  // const editorHeight = sql.get().split('\n').length*15
  const editorHeight = document.getElementById("work-input")?.parentElement?.clientHeight
  const tabNamesHeight = useHS(40)

  React.useEffect(() => {
    tabNamesHeight.set(document.getElementById("tab-names")?.offsetHeight || 40)
    return () => {
      // save session & history
      // https://stackoverflow.com/questions/28257566/ace-editor-save-send-session-on-server-via-post
    }
  }, [])

  const getDefinition = () => {
    let word = props.aceEditor.current.editor.getSelectedText()
    if (word === '') { word = tab.editor.get().getWord() }
    if (word.trim() !== '') { loadMetaTable(word) }
  }

  const executeText = () => {
    let sql = props.aceEditor.current.editor.getSelectedText()
    if (sql === '') { sql = tab.editor.get().getBlock() }
    if (sql.trim() !== '') { submitSQL(props.tab, sql) }
  }


  const commands: ICommand[] = [
    {
      name: 'execute',
      bindKey: { win: "Ctrl-Enter", mac: "Command-Enter" },
      exec: (editor: Ace.Editor, args?: any) => executeText(),
    },
    {
      name: 'object',
      bindKey: { win: "Shift-Space", mac: "Shift-Space" },
      exec: (editor: Ace.Editor, args?: any) => getDefinition(),
    },
    {
      name: 'duplicate',
      bindKey: { win: "Ctrl-D", mac: "Command-D" },
      exec: (editor: Ace.Editor, args?: any) => {
        editor.duplicateSelection()
      },
    },
  ]


  const contextItems = [
    {
      label: 'Execute',
      icon: 'pi pi-fw pi-play',
      command: () => executeText(),
    },
    {
      label: 'Definition',
      icon: 'pi pi-fw pi-file',
      command: () => getDefinition(),
    },
    // {
    //   separator: true
    // },
    // {
    //   label: 'Quit',
    //   icon: 'pi pi-fw pi-power-off'
    // }
  ]


  return <div
    style={{ paddingTop: `${tabNamesHeight.get()}px`, display: tab.showSql.get() ? '' : 'none' }}
    onContextMenu={(e: any) => (cm as any).current.show(e)}
  >

    <ContextMenu model={contextItems} ref={cm}></ContextMenu>
    <AceEditor
      ref={props.aceEditor}
      width="100%"
      // height={ !editorHeight || editorHeight < 400 ? '400px' : `${editorHeight}px` }
      height={editorHeight ? `${editorHeight - 56}px` : '1000px'}
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
        // toastInfo('editor onLoad')
        let selection = tab.editor.selection.get()
        // let undoManager = editor.session.getUndoManager() as any
        // undoManager.$undoStack = tab.editor.undoManager.get()
        // editor.session.setUndoManager(undoManager)

        editor.selection.setRange(new Range(
          selection[0], selection[1],
          selection[2], selection[3],
        ))
        editor.scrollToLine(selection[0], true, false, () => { })
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
        fontSize: "11px"
      }} />
  </div>;
}
