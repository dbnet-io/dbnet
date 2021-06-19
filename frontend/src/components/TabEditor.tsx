import * as React from "react";
import AceEditor, { ICommand } from "react-ace";
import { Ace, Range } from "ace-builds";
import { Tab, Table, useHS } from "../store/state";
import { State } from "@hookstate/core";
import { ContextMenu } from 'primereact/contextmenu';
import "ace-builds/src-noconflict/mode-pgsql";
import "ace-builds/src-noconflict/theme-textmate";
import { submitSQL } from "./TabToolbar";
import { loadMetaTable } from "./MetaTablePanel";
import { sum } from "lodash";
import { getTabState } from "./TabNames";
import { Button } from "primereact/button";


export function TabEditor(props: { tab: State<Tab>, aceEditor: React.MutableRefObject<any> }) {
  const tab = useHS(props.tab)
  const cm = React.useRef(null);
  const sql = useHS(tab.editor.text);
  // const editorHeight = sql.get().split('\n').length*15
  const editorHeight = document.getElementById("work-input")?.parentElement?.clientHeight

  React.useEffect(() => {
    return () => {
      // save session & history
      // https://stackoverflow.com/questions/28257566/ace-editor-save-send-session-on-server-via-post
    }
  }, []) // eslint-disable-line

  React.useEffect(() => {
    let editor = props.aceEditor.current.editor as Ace.Editor
    let points = tab.editor.highlight.get()
    if (sum(points) > 0) {
      let rng = new Range(points[0], points[1], points[2], points[3])
      editor.session.addMarker(rng, "editor-highlight", 'text')
    } else {
      for (let marker of Object.values(editor.session.getMarkers())) {
        if (marker.clazz === "tab-names") editor.session.removeMarker(marker.id)
      }
    }
  }, [tab.editor.highlight.get()]) // eslint-disable-line

  React.useEffect(() => {
    focusSelection(true)
  }, [tab.name.get(), tab.editor.focus.get()])

  const getDefinition = () => {
    let editor = props.aceEditor.current.editor as Ace.Editor
    let word = editor.getSelectedText()
    if (word === '') { word = tab.editor.get().getWord() }
    let [name, schema] = word.split('.')
    let table = { name, schema, database: tab.database.get(), connection: tab.connection.get() } as Table
    if (word.trim() !== '') { loadMetaTable(table) }
  }

  const executeText = () => {
    let editor = props.aceEditor.current.editor as Ace.Editor
    let sql = editor.getSelectedText()
    let parentTab = getTabState(tab.id.get() || '')
    if (sql === '') { sql = parentTab.editor.get().getBlock() }
    if (sql.trim() !== '') { submitSQL(parentTab, sql) }
  }

  const focusSelection = (scroll = false) => {
    let editor = props.aceEditor.current?.editor as Ace.Editor
    if (!editor) return
    let selection = tab.editor.selection.get()

    editor.selection.setRange(new Range(
      selection[0], selection[1],
      selection[2], selection[3],
    ))
    if (scroll) {
      editor.scrollToLine(selection[0], true, true, () => { })
      editor.gotoLine(selection[0], selection[1], true)
    }
    editor.focus()
  }


  const commands: ICommand[] = [
    {
      name: 'object',
      bindKey: { win: "F4", mac: "F4" },
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

  const onKeyPress = (e: React.KeyboardEvent) => {
    // execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') executeText()
  }


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
    style={{
      paddingTop: `5px`,
      display: tab.showSql.get() ? '' : 'none',
      width: '100%',
    }}
    onContextMenu={(e: any) => (cm as any).current.show(e)}
    onKeyDown={onKeyPress}
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
        focusSelection(true)
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

    <span
      hidden
      style={{
        position: 'absolute',
        marginLeft: '50px',
        marginTop: '-150px',
        zIndex: 999,
      }}
    >
      <Button
        icon="pi pi-play"
        className="p-button-rounded p-button-text p-button-success"
        tooltip="Execute SQL"
        tooltipOptions={{ position: 'top' }}
      />
    </span>
  </div>;
}
