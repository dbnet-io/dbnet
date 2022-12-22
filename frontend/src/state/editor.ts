import { monaco } from 'react-monaco-editor';
import { ObjectAny } from "../utilities/interfaces"
import { getCurrentBlock, getSelectedBlock, newTextBlock } from "./monaco/monaco";
import { State } from "@hookstate/core";
import { Tab } from "./tab";

export class Editor {
  monacoRef: React.MutableRefObject<any>
  text: string
  selection: number[] // startRow, startCol, endRow, endCol
  highlight: number[] // startRow, startCol, endRow, endCol
  history: ObjectAny
  focus: number // to trigger focus

  constructor(data: ObjectAny = {}) {
    this.monacoRef = undefined as any
    this.text = data.text || ''
    this.selection = data.selection || [0, 0, 0, 0]
    this.highlight = data.highlight || [0, 0, 0, 0]
    this.history = data.history || {}
    this.focus = 0
  }

  get monaco() {
    return this.monacoRef.current?.editor as monaco.editor.IStandaloneCodeEditor
  }

  // setHighlights () {
  //   if (sum(this.highlight) > 0) {
  //     let rng = new Range(
  //       this.highlight[0], this.highlight[1], 
  //       this.highlight[2], this.highlight[3],
  //     )
  //     this.instance.session.addMarker(rng, "editor-highlight", 'text')
  //   } else {
  //     for (let marker of Object.values(this.instance.session.getMarkers())) {
  //       if (marker.clazz === "tab-names") {
  //         this.instance.session.removeMarker(marker.id)
  //       }
  //     }
  //   }
  // }

  getBlock = () => {
    let block = newTextBlock()
    let ed = this.monaco
    if(!ed) return block.value
    block = getSelectedBlock(ed) || getCurrentBlock(ed.getModel(), ed.getPosition())
    return block.value
  }
}

export const SaveEditorSelection = (tab: State<Tab>, instance?: monaco.editor.ICodeEditor) => {
    if(!instance) {
      let editor = window.dbnet.editorMap[tab.id.get()]
      if(!editor?.instance) return
      instance = editor.instance
    }
    let selection = instance.getSelection()
    if(!selection) return
    tab.editor.selection.set([
      selection.startLineNumber, 
      selection.startColumn, 
      selection.endLineNumber, 
      selection.endColumn, 
    ])
}