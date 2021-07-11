import { Ace, Range } from "ace-builds"
import { ObjectAny } from "../utilities/interfaces"
import { sum } from "lodash";

export class Editor {
  instance: Ace.Editor
  text: string
  selection: number[] // startRow, startCol, endRow, endCol
  highlight: number[] // startRow, startCol, endRow, endCol
  undoManager: any
  focus: number // to trigger focus

  constructor(instance: Ace.Editor=null as any, data: ObjectAny = {}) {
    this.instance = instance
    this.text = data.text || ''
    this.selection = data.selection || [0, 0, 0, 0]
    this.highlight = data.highlight || [0, 0, 0, 0]
    this.undoManager = data.undoManager || {}
    this.focus = 0
  }

  lines = () => {
    return this.text.split('\n')
  }

  setHighlights () {
    if (sum(this.highlight) > 0) {
      let rng = new Range(
        this.highlight[0], this.highlight[1], 
        this.highlight[2], this.highlight[3],
      )
      this.instance.session.addMarker(rng, "editor-highlight", 'text')
    } else {
      for (let marker of Object.values(this.instance.session.getMarkers())) {
        if (marker.clazz === "tab-names") {
          this.instance.session.removeMarker(marker.id)
        }
      }
    }
  }

  getBlockPoints = (block: string) => {
    block = block.trim()
    let points = undefined
    let pos = this.text.indexOf(block)
    if (pos === -1) return points

    let upperBlock = this.text.slice(0, pos)
    let upperBlockLines = upperBlock.split('\n')
    // let lastUpperBlockLine = upperBlockLines[upperBlockLines.length - 1]
    let blockLines = block.split('\n')
    let lastBlockLine = blockLines[blockLines.length - 1]
    points = [upperBlockLines.length - 1, 0, upperBlockLines.length + blockLines.length - 1, lastBlockLine.length - 1]
    return points
  }

  getBlock = () => {
    let block = ''
    let lines = this.lines()
    let lineI = this.selection[0]
    let line = lines[lineI]
    let pos = this.selection[1]

    let i = pos
    let l = lineI
    while (true) {
      if (i >= line.length) {
        if (l >= lines.length - 1) {
          break
        }
        l++
        i = 0
        block += '\n'
      }

      line = lines[l]
      const char = line[i]
      if (char === ';') { break }
      if (char) { block += char }
      i++
    }

    i = pos - 1
    l = lineI
    line = lines[l]
    while (true) {
      if (i < 0) {
        if (l <= 0) {
          break
        }
        l--
        line = lines[l]
        i = line.length - 1
        block = '\n' + block
      }

      const char = line[i]
      if (char === ';') { break }
      if (char) { block = char + block }
      i--
    }

    return block
  }

  getWord = () => {
    let word = ''
    let lines = this.lines()
    let line = lines[this.selection[0]]
    let pos = this.selection[1]

    for (let i = pos; i < line.length; i++) {
      const char = line[i];
      if (char === ' ' || char === '\t') { break }
      else { word += char }
    }

    for (let i = pos - 1; i >= 0; i--) {
      const char = line[i];
      if (char === ' ' || char === '\t') { break }
      else { word = char + word }
    }

    return word
  }
}