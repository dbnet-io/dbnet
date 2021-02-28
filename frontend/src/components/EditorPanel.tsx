import * as React from "react";
import { useHookState } from "../store/state";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-pgsql";

interface Props {}

export const EditorPanel: React.FC<Props> = (props) => {
  ///////////////////////////  HOOKS  ///////////////////////////
  const sql = useHookState('')
  ///////////////////////////  EFFECTS  ///////////////////////////
  ///////////////////////////  FUNCTIONS  ///////////////////////////
  ///////////////////////////  JSX  ///////////////////////////
  return (
    <AceEditor
      width="100%"
      height="400px"
      placeholder="Placeholder Text"
      mode="pgsql"
      name={'sql-editor'}
      onChange={(v) => sql.set(v)}
      // fontSize={14}
      showPrintMargin={true}
      showGutter={true}
      // highlightActiveLine={true}
      value={ sql.get() }
      setOptions={{
        enableBasicAutocompletion: false,
        enableLiveAutocompletion: false,
        enableSnippets: false,
        showLineNumbers: true,
        wrap: false,
        showPrintMargin: false,
        tabSize: 2,
      }}
    />
  )
};