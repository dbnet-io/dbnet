import * as React from "react";
import AceEditor, { ICommand } from "react-ace";
import { Ace, Range } from "ace-builds";
import { useHS } from "../store/state";
import { State } from "@hookstate/core";
import { ContextMenu } from 'primereact/contextmenu';
import "ace-builds/src-noconflict/mode-pgsql";
import "ace-builds/src-noconflict/theme-textmate";
import { submitSQL } from "./TabToolbar";
import { loadMetaTable } from "./MetaTablePanel";
import { sum } from "lodash";
import { getTabState } from "./TabNames";
import { Button } from "primereact/button";
import { Table } from "../state/schema";
import { Tab } from "../state/tab";
import { format } from 'sql-formatter';
import { toastError } from "../utilities/methods";
import MonacoEditor, { monaco } from 'react-monaco-editor';
// import * as monaco2 from 'monaco-editor';
import { sqlConf, sqlLanguage } from "../state/monaco/sqlLanguage";

export const formatSql = (sql: string) => {
  return format(sql, {
    language: 'sql', // see https://www.npmjs.com/package/sql-formatter for list of supported dialects
    indent: '  ', // Defaults to two spaces
    linesBetweenQueries: 2, // Defaults to 1
  })
}

export function TabEditorOld(props: { tab: State<Tab> }) {
  const tab = useHS(props.tab)
  const cm = React.useRef(null);
  const sql = useHS(tab.editor.text);
  // const editorHeight = sql.get().split('\n').length*15
  const editorHeight = document.getElementById("work-input")?.parentElement?.clientHeight

  React.useEffect(() => {
    return () => {
      // saveSession()
    }
  }, []) // eslint-disable-line

  React.useEffect(() => {
    let editor = window.dbnet.editor.instance
    let points = tab.editor.highlight.get()

    for (let marker of Object.values(editor.session.getMarkers())) {
      editor.session.removeMarker(marker.id)
    }

    if (sum(points) > 0) {
      let rng = new Range(points[0], points[1], points[2], points[3])
      editor.session.addMarker(rng, "editor-highlight", 'text')
    }
  }, [tab.editor.highlight.get()]) // eslint-disable-line

  React.useEffect(() => {
    focusSelection(true)
    loadHistory()
  }, [tab.name.get(), tab.editor.focus.get()]) // eslint-disable-line

  
  const saveHistory = () => {
    // save session & history
    // https://stackoverflow.com/questions/28257566/ace-editor-save-send-session-on-server-via-post
    // does not work
    let editor = window.dbnet.editor.instance
    let um = editor.session.getUndoManager() as any
    let history = { undo: um.$undoStack, redo: um.$redoStack }
    console.log(history)
    tab.editor.history.set(history)
  }

  const loadHistory = () => {
    console.log('loadHistory')
    let editor = window.dbnet.editor.instance
    if (!editor?.session) return

    let um = editor.session.getUndoManager()
    um.reset()
    editor.session.setUndoManager(um)
  }

  const getDefinition = () => {
    let editor = window.dbnet.editor.instance
    let word = editor.getSelectedText()
    if (word === '') { word = tab.editor.get().getWord(true) }
    let wordArr = word.split('.')
    let [database, schema, name] = [tab.database.get(), '', '']
    if (wordArr.length === 2) {
      schema = wordArr[0]
      name = wordArr[1]
    } else if (wordArr.length === 3) {
      database = wordArr[0]
      schema = wordArr[1]
      name = wordArr[2]
    } else { 
      return toastError(`Invalid selection for definition: ${word}`)
    }
    let table = { name, schema, database, connection: tab.connection.get() } as Table
    if (word.trim() !== '') { loadMetaTable(table) }
  }
  
  const formatSelection = () => {
    let editor = window.dbnet.editor.instance
    let parentTab = getTabState(tab.id.get() || '')
    let oldSql = (editor.getSelectedText() || parentTab.editor.get().getBlock()).trim()
    if (oldSql === '') { return }
    
    editor.find(oldSql)
    let newSql = format(oldSql)
    editor.session.replace(editor.selection.getRange(), newSql)
    editor.focus()
    saveHistory()
  }

  const executeText = () => {
    let editor = window.dbnet.editor.instance
    let sql = editor.getSelectedText()
    let parentTab = getTabState(tab.id.get() || '')
    if (sql === '') { sql = parentTab.editor.get().getBlock() }
    if (sql.trim() !== '') { submitSQL(parentTab, sql) }
  }

  const focusSelection = (scroll = false) => {
    let editor = window.dbnet.editor.instance
    if (!editor) return
    let selection = tab.editor.selection.get()

    if (scroll) {
      editor.scrollToLine(selection[0], true, true, () => { })
    }

    editor.selection.setRange(new Range(
      selection[0], selection[1],
      selection[2], selection[3],
    ))
    editor.focus()
  }


  const commands: ICommand[] = [
    {
      name: 'duplicate',
      bindKey: { win: "Ctrl-D", mac: "Command-D" },
      exec: (editor: Ace.Editor, args?: any) => {
        editor.duplicateSelection()
      },
    },
  ]

  const onKeyPress = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '`') getDefinition()
    // execute
    else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') executeText()
  }


  const contextItems = [
    {
      label: 'Execute (Ctrl + Enter)',
      icon: 'pi pi-fw pi-play',
      command: () => executeText(),
    },
    {
      label: 'Definition (Ctrl + `)',
      icon: 'pi pi-fw pi-file',
      command: () => getDefinition(),
    },
    {
      label: 'Format',
      icon: 'pi pi-fw pi-palette',
      command: () => formatSelection(),
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

    <ContextMenu model={contextItems} ref={cm} style={{width: '250px'}}></ContextMenu>
    <AceEditor
      ref={window.dbnet.editor.instanceRef}
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
      onCursorChange={(e: any) => {
        tab.editor.selection.set(window.dbnet.editor.getPoints())
        // save undo TODO: debounce
        // saveHistory()
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


const defaultOptions : monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'sql',
  fontSize: 11,
  selectOnLineNumbers: false,
  minimap: {
		enabled: false
	},
}

export function TabEditor(props: { tab: State<Tab> }) {
  const tab = useHS(props.tab)
  const cm = React.useRef(null);
  const sql = useHS(tab.editor.text);
  const options = useHS<monaco.editor.IStandaloneEditorConstructionOptions>(defaultOptions)
  // const editorHeight = sql.get().split('\n').length*15
  const editorHeight = document.getElementById("work-input")?.parentElement?.clientHeight
  return (
    <div
      id={`editor-wrapper-${tab.id.get()}`}
    >
      <MonacoEditor
        width="100%"
        height={editorHeight}
        language="sql"
        // theme="vs-dark"
        value={sql.get()}
        options={options.get()}
        onChange={(text: string) => {
          sql.set(text)
        }}
        editorWillMount={(monaco) => { }}
        editorDidMount={(instance: monaco.editor.IStandaloneCodeEditor, monaco) => {
          let model = instance.getModel()
          if (model) {
            monaco.editor.setModelLanguage(model, 'sql')
          }
          // monaco.languages.setMonarchTokensProvider("sql", sqlLanguage);
          // monaco.languages.setLanguageConfiguration("sql", sqlConf);
          // let editor = new Editor(instance)
          // editor.initLanguage(monaco)
        }}
        editorWillUnmount={(editor, monaco) => {
        }}
      />
    </div>
  )
}