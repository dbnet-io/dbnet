import { monaco } from 'react-monaco-editor';
import { ObjectAny } from "../utilities/interfaces"
import { blockAsRange, blockAsSelection, getCurrentBlock, getSelectedBlock, newTextBlock, TextBlock } from "./monaco/monaco";
import { State } from "@hookstate/core";
import { Tab } from "./tab";
import { Table } from './schema';

export class Editor {
  monacoRef: React.MutableRefObject<any>
  text: string
  selection: number[] // startRow, startCol, endRow, endCol
  highlight: number[] // startRow, startCol, endRow, endCol
  decorationSelection: number[] // startRow, startCol, endRow, endCol
  decorationIds: string[]
  history: ObjectAny
  focus: number // to trigger focus
  definitionTable: Table

  constructor(data: ObjectAny = {}) {
    this.monacoRef = undefined as any
    this.text = data.text || ''
    this.selection = data.selection || [1, 1, 1, 1]
    this.highlight = data.highlight || [1, 1, 1, 1]
    this.decorationSelection = []
    this.decorationIds = []
    this.history = data.history || {}
    this.focus = 0
    this.definitionTable = {} as Table
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
  
  selectionToBlock = (value: string = '') => {
    let block = newTextBlock({
      value: value,
      startRow: this.selection[0],
      startCol: this.selection[1],
      endRow: this.selection[2],
      endCol: this.selection[3],
    })
    return block
  }
}

export const selectionAsRange = (selection: number[]) => {
  return new monaco.Range(selection[0], selection[1], selection[2], selection[3])
}

export const saveEditorSelection = (tab: State<Tab>, instance?: monaco.editor.ICodeEditor) => {
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

export const setDecoration = (tab: State<Tab>, block?: TextBlock, instance?: monaco.editor.ICodeEditor) => {
  if(!instance) {
    let editor = window.dbnet.editorMap[tab.id.get()]
    if(!editor?.instance) return
    instance = editor.instance
  }

  if(block) {
    let value = block.value
    
    while(value.startsWith('\n')) {
      block.startPosition = new monaco.Position(block.startPosition.lineNumber + 1, 1)
      value = value.replace('\n', '') // only first match
    }

    let decorations = instance?.deltaDecorations(
      tab.editor.decorationIds.get(),
      [
        {
          range: blockAsRange(block),
          options: { isWholeLine: false, linesDecorationsClassName: 'query-submit-decoration' },
        },
      ],
    )
    if(decorations) {
      tab.editor.decorationIds.set(decorations)
      tab.editor.decorationSelection.set(blockAsSelection(block))
    }
  } else if(tab.editor.decorationSelection.length > 0) {
    let decorations = instance?.deltaDecorations(
      tab.editor.decorationIds.get(),
      [
        {
          range: selectionAsRange(tab.editor.decorationSelection.get()),
          options: { isWholeLine: true, linesDecorationsClassName: 'query-submit-decoration' },
        },
      ],
    )
    if(decorations) tab.editor.decorationIds.set(decorations)
  }
}