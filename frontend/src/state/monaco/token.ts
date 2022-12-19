import { ObjectAny } from "../../utilities/interfaces";
import { monaco } from 'react-monaco-editor';

interface Position { 
  line: number;
  column: number;
}

export class Token { 
  text: string;
  index: number;
  parenthesisLevel: number;
  isIdentifier: boolean;
  isComment: boolean;
  position: Position;
  referenceKey: string;
  
  constructor(data: ObjectAny = {}) {
    this.text = data.text
    this.index = data.index
    this.parenthesisLevel = data.parenthesisLevel
    this.isIdentifier = data.isIdentifier
    this.isComment = data.isComment
    this.position = data.position
    this.referenceKey = data.referenceKey
  }

  Range = () => { 
    const startLine = this.position.line
    const startColumn = this.position.column
    let endLine = startLine
    let endColumn = startColumn
    for (let i = 0; i < this.text.length; i++) {
      const char = this.text[i];
      if (char === '\n') { 
        endLine++
        endColumn = 1
        continue
      }
      endColumn++
    }
    return new monaco.Range(startLine, startColumn, endLine, endColumn)
  }
}

export const TokenPairRange = (startToken: Token, endToken: Token) => { 
  const startLine = startToken.position.line
  const startColumn = startToken.position.column
  let endLine = endToken.position.line
  let endColumn = endToken.position.column
  for (let i = 0; i < endToken.text.length; i++) {
    const char = endToken.text[i];
    if (char === '\n') { 
      endLine++
      endColumn = 1
      continue
    }
    endColumn++
  }
  return new monaco.Range(startLine, startColumn, endLine, endColumn)
}