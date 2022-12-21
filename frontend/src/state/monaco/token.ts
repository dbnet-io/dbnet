import { ObjectAny } from "../../utilities/interfaces";
import { monaco } from 'react-monaco-editor';

interface Position { 
  lineNumber: number;
  column: number;
}

interface Token { 
  value: string;
  index: number;
  parenthesisLevel: number;
  isIdentifier: boolean;
  isComment: boolean;
  position: Position;
  referenceKey: string;
  Range: () => monaco.Range;
}



export const TokenPairRange = (startToken: Token, endToken: Token) => { 
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
  return new monaco.Range(startLine, startColumn, endLine, endColumn)
}