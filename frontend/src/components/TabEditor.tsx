import * as React from "react";
import { useHS } from "../store/state";
import { State } from "@hookstate/core";
import { Tab } from "../state/tab";
import MonacoEditor, { monaco } from 'react-monaco-editor';
// import * as monaco2 from 'monaco-editor';
import { EditorMonaco } from "../state/monaco/monaco";
import { format } from "sql-formatter";
import { saveEditorSelection, setDecoration } from "../state/editor";
import { loadMetaTable } from "./MetaTablePanel";
import { Table } from "../state/schema";

export const formatSql = (sql: string) => {
  return format(sql, {
    language: 'sql', // see https://www.npmjs.com/package/sql-formatter for list of supported dialects
    indent: '  ', // Defaults to two spaces
    linesBetweenQueries: 2, // Defaults to 1
  })
}


const defaultOptions : monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'sql',
  fontSize: 11,
  tabSize: 2,
  selectOnLineNumbers: false,
  minimap: {
		enabled: false
	},
}

export function TabEditor(props: { tab: State<Tab> }) {
  const tab = useHS(props.tab)
  const sql = useHS(tab.editor.text);
  const options = useHS<monaco.editor.IStandaloneEditorConstructionOptions>(defaultOptions)
  // const editorHeight = sql.get().split('\n').length*15
  const editorHeight = document.getElementById("work-input")?.parentElement?.clientHeight
  const editorRef = React.useRef<MonacoEditor>(null)

  React.useEffect(() => {
    initEditor(editorRef.current?.editor)
  }, [tab.id.get()]) // eslint-disable-line

  const initEditor = (instance?: monaco.editor.IStandaloneCodeEditor) => {
    if(!instance) return
    let model = instance.getModel()
    if (model) monaco.editor.setModelLanguage(model, 'sql')
    const editor = new EditorMonaco(tab.id.get(), instance)
    editor.initLanguage(monaco)
    window.dbnet.editorTabMap[instance.getId()] = tab.id.get()
    window.dbnet.editorMap[tab.id.get()] = editor
    tab.editor.monacoRef.set(editorRef)

    // set selection
    let selection = tab.editor.selection.get()
    instance.setSelection(new monaco.Range(
      selection[0], selection[1], selection[2], selection[3]
    ))
    instance.revealLineInCenter(selection[0])
    instance.focus()

    // set decorations
    setDecoration(tab, undefined, instance)
  }

  return (
    <div
      id={`editor-wrapper-${tab.id.get()}`}
      onClick={(e) => {
        saveEditorSelection(tab)

        // load meta table if ctrl + click on identifier
        if((e.metaKey || e.ctrlKey) && window.dbnet.editor.definitionTable.schema) {
          loadMetaTable(window.dbnet.editor.definitionTable)
          window.dbnet.editor.definitionTable = {} as Table // reset
        }
      }}
    >
      <MonacoEditor
        ref={editorRef}
        width="100%"
        height={(editorHeight || 500) - 40}
        language="sql"
        // theme="vs-dark"
        value={sql.get()}
        options={options.get()}
        onChange={(text: string) => { 
          sql.set(text) 
          let ed = window.dbnet.editorMap[tab.id.get()]
          saveEditorSelection(tab, ed.instance)
        }}
        // editorWillMount={(monaco) => { }}
        editorDidMount={(instance: monaco.editor.IStandaloneCodeEditor) => initEditor(instance)}
        // editorWillUnmount={(editor, monaco) => { }}
      />
    </div>
  )
}