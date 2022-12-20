// https://github.com/microsoft/monaco-editor/blob/main/src/basic-languages/sql/sql.ts

import { monaco } from 'react-monaco-editor';
import { EditorMonaco, getCurrentBlock } from './monaco';

export const sqlConf: monaco.languages.LanguageConfiguration = {
  
	comments: {
		lineComment: '--',
		blockComment: ['/*', '*/']
	},
	brackets: [
		['{', '}'],
		['[', ']'],
		['(', ')']
	],
	autoClosingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
		{ open: '"', close: '"' },
		{ open: "'", close: "'" }
	],
	surroundingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
		{ open: '"', close: '"' },
		{ open: "'", close: "'" }
	]
};

export const sqlLanguage = {
	defaultToken: '',
	tokenPostfix: '.sql',
	ignoreCase: true,

	brackets: [
		{ open: '[', close: ']', token: 'delimiter.square' },
		{ open: '(', close: ')', token: 'delimiter.parenthesis' }
	],

	keywords: [
		// This list is generated using `keywords.js`
		'ABORT',
		'ABSOLUTE',
		'ACTION',
		'ADA',
		'ADD',
		'AFTER',
		'ALL',
		'ALLOCATE',
		'ALTER',
		'ALWAYS',
		'ANALYZE',
		'AND',
		'ANY',
		'ARE',
		'AS',
		'ASC',
		'ASSERTION',
		'AT',
		'ATTACH',
		'AUTHORIZATION',
		'AUTOINCREMENT',
		'AVG',
		'BACKUP',
		'BEFORE',
		'BEGIN',
		'BETWEEN',
		'BIT',
		'BIT_LENGTH',
		'BOTH',
		'BREAK',
		'BROWSE',
		'BULK',
		'BY',
		'CASCADE',
		'CASCADED',
		'CASE',
		'CAST',
		'CATALOG',
		'CHAR',
		'CHARACTER',
		'CHARACTER_LENGTH',
		'CHAR_LENGTH',
		'CHECK',
		'CHECKPOINT',
		'CLOSE',
		'CLUSTERED',
		'COALESCE',
		'COLLATE',
		'COLLATION',
		'COLUMN',
		'COMMIT',
		'COMPUTE',
		'CONFLICT',
		'CONNECT',
		'CONNECTION',
		'CONSTRAINT',
		'CONSTRAINTS',
		'CONTAINS',
		'CONTAINSTABLE',
		'CONTINUE',
		'CONVERT',
		'CORRESPONDING',
		'COUNT',
		'CREATE',
		'CROSS',
		'CURRENT',
		'CURRENT_DATE',
		'CURRENT_TIME',
		'CURRENT_TIMESTAMP',
		'CURRENT_USER',
		'CURSOR',
		'DATABASE',
		'DATE',
		'DAY',
		'DBCC',
		'DEALLOCATE',
		'DEC',
		'DECIMAL',
		'DECLARE',
		'DEFAULT',
		'DEFERRABLE',
		'DEFERRED',
		'DELETE',
		'DENY',
		'DESC',
		'DESCRIBE',
		'DESCRIPTOR',
		'DETACH',
		'DIAGNOSTICS',
		'DISCONNECT',
		'DISK',
		'DISTINCT',
		'DISTRIBUTED',
		'DO',
		'DOMAIN',
		'DOUBLE',
		'DROP',
		'DUMP',
		'EACH',
		'ELSE',
		'END',
		'END-EXEC',
		'ERRLVL',
		'ESCAPE',
		'EXCEPT',
		'EXCEPTION',
		'EXCLUDE',
		'EXCLUSIVE',
		'EXEC',
		'EXECUTE',
		'EXISTS',
		'EXIT',
		'EXPLAIN',
		'EXTERNAL',
		'EXTRACT',
		'FAIL',
		'FALSE',
		'FETCH',
		'FILE',
		'FILLFACTOR',
		'FILTER',
		'FIRST',
		'FLOAT',
		'FOLLOWING',
		'FOR',
		'FOREIGN',
		'FORTRAN',
		'FOUND',
		'FREETEXT',
		'FREETEXTTABLE',
		'FROM',
		'FULL',
		'FUNCTION',
		'GENERATED',
		'GET',
		'GLOB',
		'GLOBAL',
		'GO',
		'GOTO',
		'GRANT',
		'GROUP',
		'GROUPS',
		'HAVING',
		'HOLDLOCK',
		'HOUR',
		'IDENTITY',
		'IDENTITYCOL',
		'IDENTITY_INSERT',
		'IF',
		'IGNORE',
		'IMMEDIATE',
		'IN',
		'INCLUDE',
		'INDEX',
		'INDEXED',
		'INDICATOR',
		'INITIALLY',
		'INNER',
		'INPUT',
		'INSENSITIVE',
		'INSERT',
		'INSTEAD',
		'INT',
		'INTEGER',
		'INTERSECT',
		'INTERVAL',
		'INTO',
		'IS',
		'ISNULL',
		'ISOLATION',
		'JOIN',
		'KEY',
		'KILL',
		'LANGUAGE',
		'LAST',
		'LEADING',
		'LEFT',
		'LEVEL',
		'LIKE',
		'LIMIT',
		'LINENO',
		'LOAD',
		'LOCAL',
		'LOWER',
		'MATCH',
		'MATERIALIZED',
		'MAX',
		'MERGE',
		'MIN',
		'MINUTE',
		'MODULE',
		'MONTH',
		'NAMES',
		'NATIONAL',
		'NATURAL',
		'NCHAR',
		'NEXT',
		'NO',
		'NOCHECK',
		'NONCLUSTERED',
		'NONE',
		'NOT',
		'NOTHING',
		'NOTNULL',
		'NULL',
		'NULLIF',
		'NULLS',
		'NUMERIC',
		'OCTET_LENGTH',
		'OF',
		'OFF',
		'OFFSET',
		'OFFSETS',
		'ON',
		'ONLY',
		'OPEN',
		'OPENDATASOURCE',
		'OPENQUERY',
		'OPENROWSET',
		'OPENXML',
		'OPTION',
		'OR',
		'ORDER',
		'OTHERS',
		'OUTER',
		'OUTPUT',
		'OVER',
		'OVERLAPS',
		'PAD',
		'PARTIAL',
		'PARTITION',
		'PASCAL',
		'PERCENT',
		'PIVOT',
		'PLAN',
		'POSITION',
		'PRAGMA',
		'PRECEDING',
		'PRECISION',
		'PREPARE',
		'PRESERVE',
		'PRIMARY',
		'PRINT',
		'PRIOR',
		'PRIVILEGES',
		'PROC',
		'PROCEDURE',
		'PUBLIC',
		'QUERY',
		'RAISE',
		'RAISERROR',
		'RANGE',
		'READ',
		'READTEXT',
		'REAL',
		'RECONFIGURE',
		'RECURSIVE',
		'REFERENCES',
		'REGEXP',
		'REINDEX',
		'RELATIVE',
		'RELEASE',
		'RENAME',
		'REPLACE',
		'REPLICATION',
		'RESTORE',
		'RESTRICT',
		'RETURN',
		'RETURNING',
		'REVERT',
		'REVOKE',
		'RIGHT',
		'ROLLBACK',
		'ROW',
		'ROWCOUNT',
		'ROWGUIDCOL',
		'ROWS',
		'RULE',
		'SAVE',
		'SAVEPOINT',
		'SCHEMA',
		'SCROLL',
		'SECOND',
		'SECTION',
		'SECURITYAUDIT',
		'SELECT',
		'SEMANTICKEYPHRASETABLE',
		'SEMANTICSIMILARITYDETAILSTABLE',
		'SEMANTICSIMILARITYTABLE',
		'SESSION',
		'SESSION_USER',
		'SET',
		'SETUSER',
		'SHUTDOWN',
		'SIZE',
		'SMALLINT',
		'SOME',
		'SPACE',
		'SQL',
		'SQLCA',
		'SQLCODE',
		'SQLERROR',
		'SQLSTATE',
		'SQLWARNING',
		'STATISTICS',
		'SUBSTRING',
		'SUM',
		'SYSTEM_USER',
		'TABLE',
		'TABLESAMPLE',
		'TEMP',
		'TEMPORARY',
		'TEXTSIZE',
		'THEN',
		'TIES',
		'TIME',
		'TIMESTAMP',
		'TIMEZONE_HOUR',
		'TIMEZONE_MINUTE',
		'TO',
		'TOP',
		'TRAILING',
		'TRAN',
		'TRANSACTION',
		'TRANSLATE',
		'TRANSLATION',
		'TRIGGER',
		'TRIM',
		'TRUE',
		'TRUNCATE',
		'TRY_CONVERT',
		'TSEQUAL',
		'UNBOUNDED',
		'UNION',
		'UNIQUE',
		'UNKNOWN',
		'UNPIVOT',
		'UPDATE',
		'UPDATETEXT',
		'UPPER',
		'USAGE',
		'USE',
		'USER',
		'USING',
		'VACUUM',
		'VALUE',
		'VALUES',
		'VARCHAR',
		'VARYING',
		'VIEW',
		'VIRTUAL',
		'WAITFOR',
		'WHEN',
		'WHENEVER',
		'WHERE',
		'WHILE',
		'WINDOW',
		'WITH',
		'WITHIN GROUP',
		'WITHOUT',
		'WORK',
		'WRITE',
		'WRITETEXT',
		'YEAR',
		'ZONE'
	],
	operators: [
		// Logical
		'ALL',
		'AND',
		'ANY',
		'BETWEEN',
		'EXISTS',
		'IN',
		'LIKE',
		'NOT',
		'OR',
		'SOME',
		// Set
		'EXCEPT',
		'INTERSECT',
		'UNION',
		// Join
		'APPLY',
		'CROSS',
		'FULL',
		'INNER',
		'JOIN',
		'LEFT',
		'OUTER',
		'RIGHT',
		// Predicates
		'CONTAINS',
		'FREETEXT',
		'IS',
		'NULL',
		// Pivoting
		'PIVOT',
		'UNPIVOT',
		// Merging
		'MATCHED'
	],
	builtinFunctions: [
		// Aggregate
		'AVG',
		'CHECKSUM_AGG',
		'COUNT',
		'COUNT_BIG',
		'GROUPING',
		'GROUPING_ID',
		'MAX',
		'MIN',
		'SUM',
		'STDEV',
		'STDEVP',
		'VAR',
		'VARP',
		// Analytic
		'CUME_DIST',
		'FIRST_VALUE',
		'LAG',
		'LAST_VALUE',
		'LEAD',
		'PERCENTILE_CONT',
		'PERCENTILE_DISC',
		'PERCENT_RANK',
		// Collation
		'COLLATE',
		'COLLATIONPROPERTY',
		'TERTIARY_WEIGHTS',
		// Azure
		'FEDERATION_FILTERING_VALUE',
		// Conversion
		'CAST',
		'CONVERT',
		'PARSE',
		'TRY_CAST',
		'TRY_CONVERT',
		'TRY_PARSE',
		// Cryptographic
		'ASYMKEY_ID',
		'ASYMKEYPROPERTY',
		'CERTPROPERTY',
		'CERT_ID',
		'CRYPT_GEN_RANDOM',
		'DECRYPTBYASYMKEY',
		'DECRYPTBYCERT',
		'DECRYPTBYKEY',
		'DECRYPTBYKEYAUTOASYMKEY',
		'DECRYPTBYKEYAUTOCERT',
		'DECRYPTBYPASSPHRASE',
		'ENCRYPTBYASYMKEY',
		'ENCRYPTBYCERT',
		'ENCRYPTBYKEY',
		'ENCRYPTBYPASSPHRASE',
		'HASHBYTES',
		'IS_OBJECTSIGNED',
		'KEY_GUID',
		'KEY_ID',
		'KEY_NAME',
		'SIGNBYASYMKEY',
		'SIGNBYCERT',
		'SYMKEYPROPERTY',
		'VERIFYSIGNEDBYCERT',
		'VERIFYSIGNEDBYASYMKEY',
		// Cursor
		'CURSOR_STATUS',
		// Datatype
		'DATALENGTH',
		'IDENT_CURRENT',
		'IDENT_INCR',
		'IDENT_SEED',
		'IDENTITY',
		'SQL_VARIANT_PROPERTY',
		// Datetime
		'CURRENT_TIMESTAMP',
		'DATEADD',
		'DATEDIFF',
		'DATEFROMPARTS',
		'DATENAME',
		'DATEPART',
		'DATETIME2FROMPARTS',
		'DATETIMEFROMPARTS',
		'DATETIMEOFFSETFROMPARTS',
		'DAY',
		'EOMONTH',
		'GETDATE',
		'GETUTCDATE',
		'ISDATE',
		'MONTH',
		'SMALLDATETIMEFROMPARTS',
		'SWITCHOFFSET',
		'SYSDATETIME',
		'SYSDATETIMEOFFSET',
		'SYSUTCDATETIME',
		'TIMEFROMPARTS',
		'TODATETIMEOFFSET',
		'YEAR',
		// Logical
		'CHOOSE',
		'COALESCE',
		'IIF',
		'NULLIF',
		// Mathematical
		'ABS',
		'ACOS',
		'ASIN',
		'ATAN',
		'ATN2',
		'CEILING',
		'COS',
		'COT',
		'DEGREES',
		'EXP',
		'FLOOR',
		'LOG',
		'LOG10',
		'PI',
		'POWER',
		'RADIANS',
		'RAND',
		'ROUND',
		'SIGN',
		'SIN',
		'SQRT',
		'SQUARE',
		'TAN',
		// Metadata
		'APP_NAME',
		'APPLOCK_MODE',
		'APPLOCK_TEST',
		'ASSEMBLYPROPERTY',
		'COL_LENGTH',
		'COL_NAME',
		'COLUMNPROPERTY',
		'DATABASE_PRINCIPAL_ID',
		'DATABASEPROPERTYEX',
		'DB_ID',
		'DB_NAME',
		'FILE_ID',
		'FILE_IDEX',
		'FILE_NAME',
		'FILEGROUP_ID',
		'FILEGROUP_NAME',
		'FILEGROUPPROPERTY',
		'FILEPROPERTY',
		'FULLTEXTCATALOGPROPERTY',
		'FULLTEXTSERVICEPROPERTY',
		'INDEX_COL',
		'INDEXKEY_PROPERTY',
		'INDEXPROPERTY',
		'OBJECT_DEFINITION',
		'OBJECT_ID',
		'OBJECT_NAME',
		'OBJECT_SCHEMA_NAME',
		'OBJECTPROPERTY',
		'OBJECTPROPERTYEX',
		'ORIGINAL_DB_NAME',
		'PARSENAME',
		'SCHEMA_ID',
		'SCHEMA_NAME',
		'SCOPE_IDENTITY',
		'SERVERPROPERTY',
		'STATS_DATE',
		'TYPE_ID',
		'TYPE_NAME',
		'TYPEPROPERTY',
		// Ranking
		'DENSE_RANK',
		'NTILE',
		'RANK',
		'ROW_NUMBER',
		// Replication
		'PUBLISHINGSERVERNAME',
		// Rowset
		'OPENDATASOURCE',
		'OPENQUERY',
		'OPENROWSET',
		'OPENXML',
		// Security
		'CERTENCODED',
		'CERTPRIVATEKEY',
		'CURRENT_USER',
		'HAS_DBACCESS',
		'HAS_PERMS_BY_NAME',
		'IS_MEMBER',
		'IS_ROLEMEMBER',
		'IS_SRVROLEMEMBER',
		'LOGINPROPERTY',
		'ORIGINAL_LOGIN',
		'PERMISSIONS',
		'PWDENCRYPT',
		'PWDCOMPARE',
		'SESSION_USER',
		'SESSIONPROPERTY',
		'SUSER_ID',
		'SUSER_NAME',
		'SUSER_SID',
		'SUSER_SNAME',
		'SYSTEM_USER',
		'USER',
		'USER_ID',
		'USER_NAME',
		// String
		'ASCII',
		'CHAR',
		'CHARINDEX',
		'CONCAT',
		'DIFFERENCE',
		'FORMAT',
		'LEFT',
		'LEN',
		'LOWER',
		'LTRIM',
		'NCHAR',
		'PATINDEX',
		'QUOTENAME',
		'REPLACE',
		'REPLICATE',
		'REVERSE',
		'RIGHT',
		'RTRIM',
		'SOUNDEX',
		'SPACE',
		'STR',
		'STUFF',
		'SUBSTRING',
		'UNICODE',
		'UPPER',
		// System
		'BINARY_CHECKSUM',
		'CHECKSUM',
		'CONNECTIONPROPERTY',
		'CONTEXT_INFO',
		'CURRENT_REQUEST_ID',
		'ERROR_LINE',
		'ERROR_NUMBER',
		'ERROR_MESSAGE',
		'ERROR_PROCEDURE',
		'ERROR_SEVERITY',
		'ERROR_STATE',
		'FORMATMESSAGE',
		'GETANSINULL',
		'GET_FILESTREAM_TRANSACTION_CONTEXT',
		'HOST_ID',
		'HOST_NAME',
		'ISNULL',
		'ISNUMERIC',
		'MIN_ACTIVE_ROWVERSION',
		'NEWID',
		'NEWSEQUENTIALID',
		'ROWCOUNT_BIG',
		'XACT_STATE',
		// TextImage
		'TEXTPTR',
		'TEXTVALID',
		// Trigger
		'COLUMNS_UPDATED',
		'EVENTDATA',
		'TRIGGER_NESTLEVEL',
		'UPDATE',
		// ChangeTracking
		'CHANGETABLE',
		'CHANGE_TRACKING_CONTEXT',
		'CHANGE_TRACKING_CURRENT_VERSION',
		'CHANGE_TRACKING_IS_COLUMN_IN_MASK',
		'CHANGE_TRACKING_MIN_VALID_VERSION',
		// FullTextSearch
		'CONTAINSTABLE',
		'FREETEXTTABLE',
		// SemanticTextSearch
		'SEMANTICKEYPHRASETABLE',
		'SEMANTICSIMILARITYDETAILSTABLE',
		'SEMANTICSIMILARITYTABLE',
		// FileStream
		'FILETABLEROOTPATH',
		'GETFILENAMESPACEPATH',
		'GETPATHLOCATOR',
		'PATHNAME',
		// ServiceBroker
		'GET_TRANSMISSION_STATUS'
	],
	builtinVariables: [
		// Configuration
		'@@DATEFIRST',
		'@@DBTS',
		'@@LANGID',
		'@@LANGUAGE',
		'@@LOCK_TIMEOUT',
		'@@MAX_CONNECTIONS',
		'@@MAX_PRECISION',
		'@@NESTLEVEL',
		'@@OPTIONS',
		'@@REMSERVER',
		'@@SERVERNAME',
		'@@SERVICENAME',
		'@@SPID',
		'@@TEXTSIZE',
		'@@VERSION',
		// Cursor
		'@@CURSOR_ROWS',
		'@@FETCH_STATUS',
		// Datetime
		'@@DATEFIRST',
		// Metadata
		'@@PROCID',
		// System
		'@@ERROR',
		'@@IDENTITY',
		'@@ROWCOUNT',
		'@@TRANCOUNT',
		// Stats
		'@@CONNECTIONS',
		'@@CPU_BUSY',
		'@@IDLE',
		'@@IO_BUSY',
		'@@PACKET_ERRORS',
		'@@PACK_RECEIVED',
		'@@PACK_SENT',
		'@@TIMETICKS',
		'@@TOTAL_ERRORS',
		'@@TOTAL_READ',
		'@@TOTAL_WRITE'
	],
	pseudoColumns: ['$ACTION', '$IDENTITY', '$ROWGUID', '$PARTITION'],
	tokenizer: {
		root: [
			{ include: '@comments' },
			{ include: '@whitespace' },
			{ include: '@pseudoColumns' },
			{ include: '@numbers' },
			{ include: '@strings' },
			{ include: '@complexIdentifiers' },
			{ include: '@scopes' },
			[/[;,.]/, 'delimiter'],
			[/[()]/, '@brackets'],
			[
				/[\w@#$]+/,
				{
					cases: {
						'@operators': 'operator',
						'@builtinVariables': 'predefined',
						'@builtinFunctions': 'predefined',
						'@keywords': 'keyword',
						'@default': 'identifier'
					}
				}
			],
			[/[<>=!%&+\-*/|~^]/, 'operator']
		],
		whitespace: [[/\s+/, 'white']],
		comments: [
			[/--+.*/, 'comment'],
			[/\/\*/, { token: 'comment.quote', next: '@comment' }]
		],
		comment: [
			[/[^*/]+/, 'comment'],
			// Not supporting nested comments, as nested comments seem to not be standard?
			// i.e. http://stackoverflow.com/questions/728172/are-there-multiline-comment-delimiters-in-sql-that-are-vendor-agnostic
			// [/\/\*/, { token: 'comment.quote', next: '@push' }],    // nested comment not allowed :-(
			[/\*\//, { token: 'comment.quote', next: '@pop' }],
			[/./, 'comment']
		],
		pseudoColumns: [
			[
				/[$][A-Za-z_][\w@#$]*/,
				{
					cases: {
						'@pseudoColumns': 'predefined',
						'@default': 'identifier'
					}
				}
			]
		],
		numbers: [
			[/0[xX][0-9a-fA-F]*/, 'number'],
			[/[$][+-]*\d*(\.\d*)?/, 'number'],
			[/((\d+(\.\d*)?)|(\.\d+))([eE][-+]?\d+)?/, 'number']
		],
		strings: [
			[/N'/, { token: 'string', next: '@string' }],
			[/'/, { token: 'string', next: '@string' }]
		],
		string: [
			[/[^']+/, 'string'],
			[/''/, 'string'],
			[/'/, { token: 'string', next: '@pop' }]
		],
		complexIdentifiers: [
			[/\[/, { token: 'identifier.quote', next: '@bracketedIdentifier' }],
			[/"/, { token: 'identifier.quote', next: '@quotedIdentifier' }]
		],
		bracketedIdentifier: [
			[/[^\]]+/, 'identifier'],
			[/]]/, 'identifier'],
			[/]/, { token: 'identifier.quote', next: '@pop' }]
		],
		quotedIdentifier: [
			[/[^"]+/, 'identifier'],
			[/""/, 'identifier'],
			[/"/, { token: 'identifier.quote', next: '@pop' }]
		],
		scopes: [
			[/BEGIN\s+(DISTRIBUTED\s+)?TRAN(SACTION)?\b/i, 'keyword'],
			[/BEGIN\s+TRY\b/i, { token: 'keyword.try' }],
			[/END\s+TRY\b/i, { token: 'keyword.try' }],
			[/BEGIN\s+CATCH\b/i, { token: 'keyword.catch' }],
			[/END\s+CATCH\b/i, { token: 'keyword.catch' }],
			[/(BEGIN|CASE)\b/i, { token: 'keyword.block' }],
			[/END\b/i, { token: 'keyword.block' }],
			[/WHEN\b/i, { token: 'keyword.choice' }],
			[/THEN\b/i, { token: 'keyword.choice' }]
		]
	}
} as monaco.languages.IMonarchLanguage;


/**
Returns the identifier range. This needs to traverse ID quotes (such as ", `, [, ]) and periods. Later need to parse whole text block to determine if position is inside a single quote ('). Those cannot be considered as an identifider.
*/
export const getIdentifierRangeAtPosition = (model: monaco.editor.ITextModel, position: monaco.Position) => { 
  let word = model.getWordAtPosition(position)
  if (!word) return undefined
  
  let range = { start: word.startColumn, end: word.endColumn  }
  
  // TODO: add logic to detect whole valid identifier
  // let line = model.getLineContent(position.lineNumber)
  // let start = word.startColumn - 1
  // let end = word.endColumn - 1
  // let done = false
  // while (start > 0 && !done) { 
  //   if(line[start-1] === `"`) start = start - 1
  //   if(start > 0 && line[start-1] === `.`) start = start - 1
  //   console.log(line[start-1])
  //   for (let i = 0; i < line.length; i++) {
  //     const char = line[i];
      
  //   }
  // }
  return new monaco.Range(position.lineNumber, range.start, position.lineNumber, range.end)
}

/**
 * See https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-hover-provider-example
*/
export const sqlHoverProvider = (editor: EditorMonaco) => {
  return {
    provideHover: function (model: monaco.editor.ITextModel, position: monaco.Position) {
      // make call to server to get info
      // TODO: check if identifer matches column name from selectable tables or a column name/alias
      // If not, then return {}
      // if (identiferRange && keywords.indexOf(identifier.toUpperCase()) !== -1) {
      //   // is a reserved word.
      //   return {}
      // }

      // const position_id = `${position.lineNumber}-${position.column}`
      const block = getCurrentBlock(model, position)

      return editor.parseSQL(block.value, block.startPosition.lineNumber, block.startPosition.column).then(
        (parsed) => {
          if (!parsed?.tokenMapper) return {} as monaco.languages.Hover

          const token = parsed.getTokenFromPosition(position)
          const tokenRange = token.Range()

          return {
            range: tokenRange,
            contents: [
              { value: token.text },
              { value: JSON.stringify(position) },
              { value: JSON.stringify(token) },
              { value: JSON.stringify(tokenRange) },
            ]
          }
        }
      )
    }
  } as monaco.languages.HoverProvider;
}

export const sqlDefinitionProvider = (editor: EditorMonaco) => {
  return {
    provideDefinition: function (model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken): monaco.languages.ProviderResult<monaco.languages.Definition | monaco.languages.LocationLink[]> {
      const block = getCurrentBlock(model, position)
      return editor.parseSQL(block.value, block.startPosition.lineNumber, block.startPosition.column).then(
        async (parsed) => {
          if (!parsed?.tokenMapper && !position) return {} as monaco.languages.Definition

          // const token = parsed.getTokenFromPosition(position)
          // const tokenRange = token.Range()
          // toastInfo(token.referenceKey)
          let definition = await parsed.getDefinition(model, position)
          return {
            uri: definition.model.uri,
            range: definition.range,
          } as monaco.languages.Definition
        }
      )
    }
  } as monaco.languages.DefinitionProvider
}