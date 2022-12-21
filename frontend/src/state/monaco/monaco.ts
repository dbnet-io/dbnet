import { Token, TokenPairRange, TokenizeLine } from 'dbnet-parser';
import { monaco } from 'react-monaco-editor';
import { ObjectAny, ObjectNumber } from '../../utilities/interfaces';
// import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import { toastInfo } from '../../utilities/methods';
import { Table } from '../schema';
import { sqlConf, sqlLanguage } from './sqlLanguage';
import { createState } from '@hookstate/core';
import { getTabState } from '../../components/TabNames';
import { submitSQL } from '../../components/TabToolbar';
import { loadMetaTable } from '../../components/MetaTablePanel';
const crypto = require('crypto')


const globalInitiated = createState(false)

export type EditorMap = Record<string, EditorMonaco>
export type EditorTabMap = Record<string, string>

// seems that the initLanguage block only needs to be initiated globally once
export interface TextBlock { 
  value: string
  tabId?: string;
  startPosition: monaco.Position,
  endPosition: monaco.Position,
}

export const newTextBlock = () => {
  return {
    value: '',
    startPosition: new monaco.Position(-1, -1),
    endPosition: new monaco.Position(-1, -1),
  } as TextBlock
}


/** Represents the Monaco Editor object */
export class EditorMonaco { 
  id: string
  instance: monaco.editor.IStandaloneCodeEditor
  parserCache: {[key: string]: ParsedSql}
  tabId: string
  
  constructor(tabId: string, instance: monaco.editor.IStandaloneCodeEditor) { 
    this.tabId = tabId
    this.instance = instance
    this.id = instance.getId()
    this.parserCache = {}
  }

  cacheGet(text: string) {
    let md5: string = crypto.createHash('md5').update(text).digest('hex')
    return this.parserCache[md5]
  }

  cacheSet(text: string, data: ParsedSql) { 
    let md5: string = crypto.createHash('md5').update(text).digest('hex')
    delete this.parserCache[md5] // if exists, to put it in last place
    this.parserCache[md5] = data
    let keys = Object.keys(this.parserCache)
    if (keys.length > 10) { 
      delete this.parserCache[keys[0]]
    }
  }

  initLanguage(m: typeof monaco) {
    this.addKeyboardActions()
    if (!globalInitiated.get()) {
      m.languages.setMonarchTokensProvider("sql", sqlLanguage);
      m.languages.setLanguageConfiguration("sql", sqlConf);
      // m.languages.registerHoverProvider('sql', sqlHoverProvider(this));
      // m.languages.registerDefinitionProvider('sql', sqlDefinitionProvider(this));
      globalInitiated.set(true)
    }
  }

  addKeyboardActions() { 
    const actions : monaco.editor.IActionDescriptor[] = [
      {
        id: 'execute-sql',
        label: 'Execute SQL',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.Enter,
        ],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1,
        run: function (ed: monaco.editor.ICodeEditor) {
          let block = getSelectedBlock(ed) || getCurrentBlock(ed.getModel(), ed.getPosition())
          if(!block.value) return toastInfo('Submitted a blank query')
          
          let sql = block.value
          let tabId = window.dbnet.editorTabMap[ed.getId()]
          let parentTab = getTabState(tabId)
          if (!parentTab.id?.get()) return console.log(`did not find tab ${tabId}`)
          if (sql === '') { sql = parentTab.editor.get().getBlock() }
          if (sql.trim() !== '') { submitSQL(parentTab, sql) }
        }
      },
      {
        id: 'definition',
        label: 'Object Definition',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote,
          monaco.KeyMod.WinCtrl | monaco.KeyCode.Backquote,
        ],
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 2,
        run: function (ed: monaco.editor.ICodeEditor) {
          let token = getCurrentObject(ed.getModel(), ed.getPosition())
          let tabId = window.dbnet.editorTabMap[ed.getId()]
          let tab = getTabState(tabId)
          let conn = window.dbnet.getConnection(tab.connection.get() || '')
          let table = conn.parseTableName(token.value)
          loadMetaTable(table)
        }
      },
      {
        id: 'format',
        label: 'Format SQL',
        contextMenuGroupId: '1_modification',
        contextMenuOrder: 1,
        run: function (ed: monaco.editor.ICodeEditor) {
          console.log(ed)
        }
      },
    ]

    for (let action of actions) { 
      let a = this.instance.getAction(action.id)
      if(!a) this.instance.addAction(action)
    }
  }

  /** Accepts SQL text, and returns a token mapper */
  async parseSQL(text: string, startLine = 1, startColumn = 1) {
    if (!this.id) return new ParsedSql({})

    let parsed = this.cacheGet(text)
    // let response : Response = {} as Response
    // if (!parsed) {
    //   const parsePayload : ProjectRequest = { projectId: schematic.project.id, text, startLine, startColumn }
    //   response = await api.httpPost(Route.ProjectParse, parsePayload)
    //   if (response.error) { 
    //     console.log("Error parsing SQL: ", response.error)
    //     return parsed // TODO: silently fail, need to notify error
    //   }
    //   parsed = new ParsedSql(response.data)
    //   this.cacheSet(text, parsed)
    // }
    
    return parsed
  }
}

const getBlocks = (model: monaco.editor.ITextModel | null) => { 
  let blocks: TextBlock[] = []
  if (!model) return blocks
  
  let inJinja = false
  let inTickQ = false
  let inSingleQ = false
  let inDoubleQ = false
  let inBracketQ = false
  let escaping = false
  let inCommentLine = false 
  let inCommentMulti = false 
  let parenthesisLevel = 0 
  let lineNumber = 1 
  let colNumber = 1 

  const inQuote = () => inSingleQ || inDoubleQ || inTickQ || inBracketQ
  const inComment = () => inCommentLine || inCommentMulti
  const inMode = () => inQuote() || inComment() || inJinja
  const currentPosition = () => new monaco.Position(lineNumber, colNumber)

  const text = model.getValue()
  let block = newTextBlock()

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let nChar = i < text.length - 1 ? text[i+1] : ''
    let pChar = i > 0 ? text[i - 1] : ''
    
    if (block.startPosition.lineNumber === -1) { 
      block.startPosition = currentPosition()
    }

    // jinja
    if (!inMode() && char === '{' && nChar === '{') {
      inJinja = true
    } else if (inJinja && pChar === '}' && char === '}') {
      inJinja = false
    }

    // comments
    if (!inMode() && char === '-' && nChar === '-') {
      inCommentLine = true
    } else if (inCommentLine && char === '\n') {
      inCommentLine = false
    } else if (!inMode() && char === '/' && nChar === '*') { 
      inCommentMulti = true
    } else if (inCommentMulti && pChar === '*' && char === '/') {
      inCommentMulti = false
    }

    // quotes
    if (!inMode() && char === "'") {
      inSingleQ = true
    } else if (inSingleQ && char === "'" && !escaping) {
      inSingleQ = false
    } else if (inSingleQ && char === '\\' && !escaping) {
      escaping = true
    } else if (inSingleQ && escaping){
      escaping = false
    }

    // double quotes
    if (!inMode() && char === '"') {
      inDoubleQ = true
    } else if (inDoubleQ && char === '"') {
      inDoubleQ = false
    }

    // back tick quotes
    if (!inMode() && char === '`') {
      inTickQ = true
    } else if (inTickQ && char === '`') {
      inTickQ = false
    }

    // bracket quotes
    if (!inMode() && char === '[') {
      inBracketQ = true
    } else if (inBracketQ && char === ']') {
      inBracketQ = false
    }

    // parenthesis
    if (!inMode() && char === '(') {
      parenthesisLevel++
    } else if (!inMode() && char === ')') {
      parenthesisLevel-- // eslint-disable-line
    }

    // append
    block.value += char

    if (char === '\n') {
      lineNumber++
      colNumber = 1
    }

    // end of query or end of value, append to blocks
    if (!inMode() && char === ';') {
      block.endPosition = currentPosition()
      blocks.push(block)
      block = newTextBlock()
    } else if (i === text.length - 1) { 
      block.endPosition = currentPosition()
      blocks.push(block)
    }

    if (char !== '\n') colNumber++
  }
  return blocks
}

export const getCurrentBlock = (model: monaco.editor.ITextModel | null, position: monaco.Position | null = null) => { 
  if(!position) return newTextBlock()

  let blocks = getBlocks(model)
  for (let block of blocks) { 
    let withinLines = position.lineNumber > block.startPosition.lineNumber &&
      position.lineNumber < block.endPosition.lineNumber
    let withinColumns = (
      position.lineNumber === block.startPosition.lineNumber && position.column >= block.startPosition.column
    ) || (
      position.lineNumber === block.endPosition.lineNumber && position.column <= block.endPosition.column+1
    )
    if (withinLines || withinColumns) { 
      return block
    }
  }
  return newTextBlock()
}

export const getCurrentObject = (model: monaco.editor.ITextModel | null, position: monaco.Position | null = null) => { 
  if(!position || !model) return new Token()

  console.log(position)

  let line = model.getLineContent(position.lineNumber)
  let column = position.column

  let oToken = new Token()
  let body = TokenizeLine(line, position.lineNumber)
  for (let i = 0; i < body.tokens.length; i++) {
    const token = body.tokens[i];
    let range = token.range
    if(column >= range.startColumn && column <= range.endColumn) oToken = token
    if(!oToken.isWord) {
      if(body.previous(oToken).isWord) oToken = body.previous(oToken)
      if(body.next(oToken).isWord) oToken = body.next(oToken)
    }
  }

  return oToken
}

export const getSelectionRange = (instance: monaco.editor.ICodeEditor) => {
  const start = instance.getSelection()?.getStartPosition()
  const end = instance.getSelection()?.getEndPosition()
  if (start && end) {
    let range = new monaco.Range(start?.lineNumber, start?.column, end?.lineNumber, end?.column)
    return range
  }
  return
}

const getSelectedBlock = (instance: monaco.editor.ICodeEditor) : TextBlock | undefined => { 
  const start = instance.getSelection()?.getStartPosition()
  const end = instance.getSelection()?.getEndPosition()
  if (start && end && start.toString() !== end.toString()) {
    let range = new monaco.Range(start?.lineNumber, start?.column, end?.lineNumber, end?.column)
    let value = instance.getModel()?.getValueInRange(range) || ''
    return {
      value,
      startPosition: start,
      endPosition: end,
    }
  }
  return undefined
}

export interface TokenMapper { 
  indexMap: { [key: number]: Token; } // index to token
  keyIndexRangeMap: { [key: string]: number[]; } // reference key to token index range
  lineColumnMap: ObjectNumber // line-column to token index
}

export class ParsedSql { 
  tokenMapper: TokenMapper
  sourceTables: { [key: string]: Table; }
  constructor(data: ObjectAny = {}) { 
    this.tokenMapper = data.tokenMapper
    
    this.sourceTables = data.sourceTables || {}
    if (this.sourceTables) { 
      for (let key of Object.keys(this.sourceTables)) { 
        this.sourceTables[key] = new Table(this.sourceTables[key])
      }
    }
  }

  getTokenFromPosition(position: monaco.Position) { 
    const positionId = `${position.lineNumber}-${position.column}`
    const index = this.tokenMapper?.lineColumnMap[positionId]
    return this.getTokenFromIndex(index)
  }

  getTokenFromIndex(index: number) { 
    const token = new Token(this.tokenMapper?.indexMap[index])
    return token
  }

  getKeyRange(key: string) { 
    if (key in this.tokenMapper.keyIndexRangeMap) { 
      let indexRange = this.tokenMapper.keyIndexRangeMap[key]
      let startToken = this.getTokenFromIndex(indexRange[0])
      let endToken = this.getTokenFromIndex(indexRange[1])
      return TokenPairRange(startToken, endToken)
    } 
    return
  }
  
  async getDefinition(model: monaco.editor.ITextModel, position: monaco.Position) { 
    const token = this.getTokenFromPosition(position)
    if (!token.referenceKey) return { model, range: token.range }
    
    if (token.referenceKey in this.tokenMapper.keyIndexRangeMap) { 
      let indexRange = this.tokenMapper.keyIndexRangeMap[token.referenceKey]
      let startToken = this.getTokenFromIndex(indexRange[0])
      let endToken = this.getTokenFromIndex(indexRange[1])
      return { model, range: TokenPairRange(startToken, endToken) }
    } 

    if (token.referenceKey.startsWith('token-')) { 
      let indexRange = token.referenceKey.replace('token-', '').split('-').map(v => parseInt(v))
      let startToken = this.getTokenFromIndex(indexRange[0])
      let endToken = this.getTokenFromIndex(indexRange[1])
      return { model, range: TokenPairRange(startToken, endToken) }
    }

    // TODO: if token.referenceKey points to external model
    // let filePath = '' // match token.referenceKey to file
    // let tab = await schematic.workspace.openTab(filePath) // tab is now open, editor model is updated
    // model = schematic.editor.instance.getModel() || model
    // let newParsed = await schematic.project.parseSQL(tab.file.body)
    // let newRange = this.getKeyRange(token.referenceKey)
    // if (newRange) return { model, range: newRange }

    return { model, range: token.range }
  }
}