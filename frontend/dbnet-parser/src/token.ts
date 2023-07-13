
export interface ObjectAny { [key: string]: any; }; 

interface Position { 
  lineNumber: number;
  column: number;
}

interface Range {
  startLineNumber: number,
  startColumn: number,
  endLineNumber: number,
  endColumn: number
}

export class Token { 
  value: string;
  index: number;
  parenthesisLevel: number;
  isWord: boolean;
  isWhitespace: boolean;
  isOperator: boolean;
  isComment: boolean;
  isJinja: boolean;
  position: Position;
  range: Range
  referenceKey: string;
  
  constructor(data: ObjectAny = {}) {
    this.value = data.value || ''
    this.index = data.index || -1
    this.parenthesisLevel = data.parenthesisLevel || 0
    this.isWord = data.isWord || false
    this.isOperator = data.isOperator || false
    this.isWhitespace = data.isWhitespace || false
    this.isComment = data.isComment || false
    this.isJinja = data.isJinja || false
    this.position = data.position || {lineNumber: -1, column: -1}
    this.referenceKey = data.referenceKey
    this.range = {} as Range
  }

  add(s: CharState) {
    // whitespace
    if(isWhiteSpace(s.char)) {
      if(this.value === '') this.isWhitespace = true
    } else {
      this.isWhitespace = false
    }

    // operator
    if(isOperator(s.char)) {
      if(this.value === '') this.isOperator = true
    } else {
      this.isOperator = false
    }

    this.value += s.char
  }

  finalize(state: CharState) {
    this.index = state.tIndex
    this.parenthesisLevel = state.parenthesisLevel
    this.isComment = state.wasMode === "comment"
    this.isJinja = state.wasMode === "jinja"
    this.range = this.getRange() // worsens performance by 20% ?
    this.isWord = this.determineWord()
  }

  private determineWord = () : boolean => { 
    let chars = Array.from(this.value)
    return !this.isWhitespace
        && !this.isOperator
        && !chars.some(c => isParenthesis(c))
        && !chars.some(c => isComma(c))
  }

  private getRange = () : Range => { 
    const startLine = this.position.lineNumber
    const startColumn = this.position.column
    let endLine = startLine
    let endColumn = startColumn
    for (let i = 0; i < this.value.length; i++) {
      const char = this.value[i];
      if (char === '\n') { 
        endLine++
        endColumn = 1
        continue
      }
      endColumn++
    }
    return {
      startLineNumber: startLine,
      startColumn: startColumn,
      endLineNumber: endLine,
      endColumn: endColumn,
    }
  }
}

export const TokenPairRange = (startToken: Token, endToken: Token) : Range => { 
  const startLine = startToken.position.lineNumber
  const startColumn = startToken.position.column
  let endLine = endToken.position.lineNumber
  let endColumn = endToken.position.column
  for (let i = 0; i < endToken.value.length; i++) {
    const char = endToken.value[i];
    if (char === '\n') { 
      endLine++
      endColumn = 1
      continue
    }
    endColumn++
  }
  return {
    startLineNumber: startLine,
    startColumn: startColumn,
    endLineNumber: endLine,
    endColumn: endColumn,
  }
}

export class TokenBody { 
  tokens: Token[]

  constructor(data: ObjectAny = {}) {
    this.tokens = data.tokens || []
  }

  get text() {
    return this.tokens.map(t => t.value).join('')
  }

  previous(token: Token, hops = 1) {
    let i = token.index - hops
    if(i < 0) return new Token()
    return this.tokens[i]
  }

  next(token: Token, hops = 1) {
    let i = token.index + hops
    if(i >= this.tokens.length) return new Token()
    return this.tokens[i]
  }
}

export class CharState {
  char: string
  pChar: string
  ppChar: string
  nChar: string
  inJinja: boolean;
  inTickQ: boolean;
  inSingleQ: boolean;
  inDoubleQ: boolean;
  inBracketQ: boolean;
  escaping: boolean;
  inCommentLine: boolean;
  inCommentMulti: boolean;
  parenthesisLevel: number;
  wasMode?: 'jinja' | 'comment' | 'quote' | 'double-quote' | 'backtick' | 'bracket-quote'
  tIndex: number

  constructor(data: ObjectAny = {}) {
    this.char = data.char || ''
    this.pChar = data.pChar || ''
    this.ppChar = data.ppChar || ''
    this.nChar = data.nChar || ''
    this.inJinja = data.inJinja || false
    this.inTickQ = data.inTickQ || false
    this.inSingleQ = data.inSingleQ || false
    this.inDoubleQ = data.inDoubleQ || false
    this.inBracketQ = data.inBracketQ || false
    this.escaping = data.escaping || false
    this.inCommentLine = data.inCommentLine || false
    this.inCommentMulti = data.inCommentMulti || false
    this.parenthesisLevel = data.parenthesisLevel || 0
    this.tIndex = data.index || -1
  }

  setJinja() {
    let was = false
    if (!this.inMode && this.char === '{' && this.nChar === '{') {
      this.inJinja = true
    } else if (this.inJinja && this.ppChar === '}' && this.pChar === '}') {
      this.inJinja = false
      was = true
    }
    if(was) this.wasMode = "jinja"
    return was
  }

  setComment() {
    let was = false
    if (!this.inMode && this.char === '-' && this.nChar === '-') {
      this.inCommentLine = true
    } else if (this.inCommentLine && this.char === '\n') {
      this.inCommentLine = false
      was = true
    } else if (!this.inMode && this.char === '/' && this.nChar === '*') { 
      this.inCommentMulti = true
    } else if (this.inCommentMulti && this.ppChar === '*' && this.pChar === '/') {
      this.inCommentMulti = false
      was = true
    }
    if(was) this.wasMode = "comment"
    return was
  }

  setQuotes() {
    let was = false
    if (!this.inMode && this.char === "'") {
      this.inSingleQ = true
    } else if (this.inSingleQ && this.char === "'" && !this.escaping) {
      this.inSingleQ = false
      was = true
    } else if (this.inSingleQ && this.char === '\\' && !this.escaping) {
      this.escaping = true
    } else if (this.inSingleQ && this.escaping){
      this.escaping = false
    }
    if(was) this.wasMode = "quote"
    return was
  }

  setDoubleQuotes() {
    let was = false
    if (!this.inMode && this.char === '"') {
      this.inDoubleQ = true
    } else if (this.inDoubleQ && this.char === '"') {
      this.inDoubleQ = false
      was = true
    }
    if(was) this.wasMode = "double-quote"
    return was
  }

  setBackTickQuotes() {
    let was = false
    if (!this.inMode && this.char === '`') {
      this.inTickQ = true
    } else if (this.inTickQ && this.char === '`') {
      this.inTickQ = false
      was = true
    }
    if(was) this.wasMode = "backtick"
    return was
  }

  setBracketQuotes() {
    let was = false
    if (!this.inMode && this.char === '[') {
      this.inBracketQ = true
    } else if (this.inBracketQ && this.char === ']') {
      this.inBracketQ = false
      was = true
    }
    if(was) this.wasMode = "bracket-quote"
    return was
  }

  setParenthesis() {
    let delta = 0
    if (!this.inMode && this.char === '(') {
      this.parenthesisLevel++
      delta = 1
    } else if (!this.inMode && this.char === ')') {
      this.parenthesisLevel--
      delta = -1
    }
    return delta
  }

  get inQuote() {
    return this.inSingleQ || this.inDoubleQ || this.inTickQ || this.inBracketQ
  }
  get inComment() { return this.inCommentLine || this.inCommentMulti }
  get inMode() { return this.inQuote || this.inComment || this.inJinja }
  get isWhiteSpace() { return isWhiteSpace(this.char) }
  get isParenthesis() { return isParenthesis(this.char) }
  get isOperator() { return isOperator(this.char) }
  get isComma() { return isComma(this.char) }
  get isSemicolon() { return isSemicolon(this.char) }
}

export const isWhiteSpace = (c: string) => [' ', '\n', '\t', '\r'].includes(c)
export const isParenthesis = (c: string) => ['(', ')'].includes(c)
export const isComma = (c: string) => [','].includes(c)
export const isSemicolon = (c: string) => [';'].includes(c)
export const isOperator = (c: string) => ['=','-','+','>','<','~','*','%','!','/'].includes(c)

export const Tokenize = (text: string, startLine=1, startColumn=1) => {
  let body = new TokenBody()

  let state = new CharState()
  let pState = new CharState()

  let lineNumber = startLine
  let columnNumber = startColumn
  let token = new Token({position: {lineNumber: lineNumber, column: columnNumber}})

  const addToken = () => {
    token.finalize(state)
    if(token.value) body.tokens.push(token)
    token = new Token({
      position: {lineNumber: lineNumber, column: columnNumber},
      parenthesisLevel: token.parenthesisLevel,
    })
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let nChar = i < text.length - 1 ? text[i+1] : ''
    let pChar = i > 0 ? text[i - 1] : ''

    if(char === '\n') {
      lineNumber++
      columnNumber = 1
    } else {
      columnNumber++
    }

    
    pState.tIndex = state.tIndex
    pState.char = state.char
    pState.pChar = state.pChar
    pState.nChar = state.nChar
    pState.inJinja = state.inJinja
    pState.inTickQ = state.inTickQ
    pState.inSingleQ = state.inSingleQ
    pState.inDoubleQ = state.inDoubleQ
    pState.inBracketQ = state.inBracketQ
    pState.escaping = state.escaping
    pState.inCommentLine = state.inCommentLine
    pState.inCommentMulti = state.inCommentMulti
    pState.parenthesisLevel = state.parenthesisLevel

    state.tIndex = body.tokens.length
    state.char = char
    state.ppChar = state.pChar
    state.pChar = pChar
    state.nChar = nChar
    state.parenthesisLevel = pState.parenthesisLevel
    state.wasMode = undefined

    state.setJinja() // jinja
    state.setComment() // comments
    state.setQuotes() // quotes
    state.setDoubleQuotes() // double quotes
    state.setBackTickQuotes() // back tick quotes
    state.setBracketQuotes() // bracket quotes
    state.setParenthesis() // parenthesis

    ////////////////////////////////////////////

    if(state.inComment !== pState.inComment) {
      addToken()
    } else if(state.inJinja !== pState.inJinja) {
      addToken()
    }
    
    ////////////////////////////////////////////

    // append
    token.add(state)

    ////////////////////////////////////////////

    if(!state.inMode && isWhiteSpace(char) !== isWhiteSpace(nChar) ) {
      addToken()
    } else if(!state.inMode && isParenthesis(char) !== isParenthesis(nChar) ) {
      addToken()
    } else if(!state.inMode && isComma(char) !== isComma(nChar) ) {
      addToken()
    } else if(!state.inMode && isSemicolon(char) !== isSemicolon(nChar) ) {
      addToken()
    } else if(!state.inMode && isOperator(char) !== isOperator(nChar) 
          && !(char === '.' && nChar === '*') && !(char === '/' && pChar === '*') ) {
      addToken()
    }

    ////////////////////////////////////////////
    // end of query or end of value, append to blocks else
    if (i === text.length - 1) { 
      addToken()
      break
    }

  }

  return body
}

// TokenizeLine is for one line. no jinja, no comment, no parenthesis.
// useful for tokenizing the object name
export const TokenizeLine = (text: string, startLine=1) => {
  let body = new TokenBody()

  let state = new CharState()
  let pState = new CharState()

  let lineNumber = startLine
  let columnNumber = 1
  let token = new Token({position: {lineNumber: lineNumber, column: columnNumber}})

  const addToken = () => {
    token.finalize(state)
    if(token.value) body.tokens.push(token)
    token = new Token({
      position: {lineNumber: lineNumber, column: columnNumber},
    })
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let nChar = i < text.length - 1 ? text[i+1] : ''
    let pChar = i > 0 ? text[i - 1] : ''

    if(char === '\n') {
      lineNumber++
      columnNumber = 1
    } else {
      columnNumber++
    }

    
    pState.tIndex = state.tIndex
    pState.char = state.char
    pState.pChar = state.pChar
    pState.nChar = state.nChar
    pState.inJinja = state.inJinja
    pState.inTickQ = state.inTickQ
    pState.inSingleQ = state.inSingleQ
    pState.inDoubleQ = state.inDoubleQ
    pState.inBracketQ = state.inBracketQ
    pState.escaping = state.escaping
    pState.inCommentLine = state.inCommentLine
    pState.inCommentMulti = state.inCommentMulti
    pState.parenthesisLevel = state.parenthesisLevel

    state.tIndex = body.tokens.length
    state.char = char
    state.pChar = pChar
    state.nChar = nChar
    state.parenthesisLevel = pState.parenthesisLevel
    state.wasMode = undefined

    // state.setJinja() // jinja
    // state.setComment() // comments
    // state.setQuotes() // quotes
    state.setDoubleQuotes() // double quotes
    state.setBackTickQuotes() // back tick quotes
    state.setBracketQuotes() // bracket quotes
    // state.setParenthesis() // parenthesis

    ////////////////////////////////////////////

    if(state.inComment !== pState.inComment) {
      addToken()
    }
    
    ////////////////////////////////////////////

    // append
    token.add(state)

    ////////////////////////////////////////////

    if(!state.inMode && isWhiteSpace(char) !== isWhiteSpace(nChar) ) {
      addToken()
    } else if(!state.inMode && isParenthesis(char) !== isParenthesis(nChar) ) {
      addToken()
    } else if(!state.inMode && isComma(char) !== isComma(nChar) ) {
      addToken()
    } else if(!state.inMode && isSemicolon(char) !== isSemicolon(nChar) ) {
      addToken()
    } else if(!state.inMode && isOperator(char) !== isOperator(nChar) && !(char === '.' && nChar === '*') ) {
      addToken()
    }

    ////////////////////////////////////////////
    // end of query or end of value, append to blocks
    if (i === text.length - 1) { 
      addToken()
      break
    }

  }

  return body
}