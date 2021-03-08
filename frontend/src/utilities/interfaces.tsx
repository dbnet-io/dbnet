
export interface ObjectString { [key: string]: string; }; 
export interface ObjectAny { [key: string]: any; }; 
export interface RecordsData { headers: string[], rows: any[] }


export interface jsColumn {
  align?: string
  allowEmpty?: boolean
  name?: string
  options?: any[]
  source?: any[]
  title?: string
  type?: string
  width?: number
  wordWrap?: boolean
}

export interface jsText {
  about?: string
  addComments?: string
  areYouSureToDeleteTheSelectedColumns?: string
  areYouSureToDeleteTheSelectedRows?: string
  cellAlreadyMerged?: string
  clearComments?: string
  columnName?: string
  comments?: string
  copy?: string
  deleteSelectedColumns?: string
  deleteSelectedRows?: string
  editComments?: string
  entries?: string
  insertANewColumnAfter?: string
  insertANewColumnBefore?: string
  insertANewRowAfter?: string
  insertANewRowBefore?: string
  invalidMergeProperties?: string
  noCellsSelected?: string
  noRecordsFound?: string
  orderAscending?: string
  orderDescending?: string
  paste?: string
  renameThisColumn?: string
  saveAs?: string
  search?: string
  show?: string
  showingPage?: string
  thereIsAConflictWithAnotherMergedCell?: string
  thisActionWillClearYourSearchResultsAreYouSure?: string
  thisActionWillDestroyAnyExistingMergedCellsAreYouSure?: string
}

export interface jsOptions {
  about?: string
  allowComments?: boolean
  allowDeleteColumn?: boolean
  allowDeleteRow?: boolean
  allowDeletingAllRows?: boolean
  allowExport?: boolean
  allowInsertColumn?: boolean
  allowInsertRow?: boolean
  allowManualInsertColumn?: boolean
  allowManualInsertRow?: boolean
  allowRenameColumn?: boolean
  autoCasting?: boolean
  autoIncrement?: boolean
  classes?: any
  colAlignments?: string[]
  colHeaders?: string[]
  colWidths?: number[]
  columnDrag?: boolean
  columnResize?: boolean
  columnSorting?: boolean
  columns?: jsColumn[]
  contextMenu?: () => void
  copyCompatibility?: boolean
  csv?: any
  csvDelimiter?: ","
  csvFileName?: string
  csvHeaders?: boolean
  data?: any[]
  defaultColAlign?: string
  defaultColWidth?: number
  detachForUpdates?: boolean
  editable?: boolean
  filters?: boolean
  footers?: any
  freezeColumns?: any
  fullscreen?: boolean
  imageOptions?: any
  includeHeadersOnCopy?: boolean
  includeHeadersOnDownload?: boolean
  lazyLoading?: boolean
  loadingSpin?: boolean
  mergeCells?: ObjectAny
  meta?: any
  method?: string
  minDimensions?: any[]
  minSpareCols?: number
  minSpareRows?: number
  nestedHeaders?: any
  onafterchanges?: () => void
  onbeforechange?: () => void
  onbeforedeletecolumn?: () => void
  onbeforedeleterow?: () => void
  onbeforeinsertcolumn?: () => void
  onbeforeinsertrow?: () => void
  onbeforepaste?: () => void
  onbeforesave?: () => void
  onblur?: () => void
  onchange?: () => void
  onchangeheader?: () => void
  onchangemeta?: () => void
  onchangepage?: () => void
  onchangestyle?: () => void
  oncomments?: () => void
  oncopy?: () => void
  oncreateeditor?: () => void
  ondeletecolumn?: () => void
  ondeleterow?: () => void
  oneditionend?: () => void
  oneditionstart?: () => void
  onevent?: () => void
  onfocus?: () => void
  oninsertcolumn?: () => void
  oninsertrow?: () => void
  onload?: () => void
  onmerge?: () => void
  onmovecolumn?: () => void
  onmoverow?: () => void
  onpaste?: () => void
  onredo?: () => void
  onresizecolumn?: () => void
  onresizerow?: () => void
  onsave?: () => void
  onselection?: () => void
  onsort?: () => void
  onundo?: () => void
  pagination?: boolean
  paginationOptions?: any
  parseFormulas?: boolean
  parseTableAutoCellType?: boolean
  parseTableFirstRowAsHeader?: boolean
  persistance?: boolean
  requestVariables?: any
  root?: any
  rowDrag?: boolean
  rowResize?: boolean
  rows?: ObjectAny
  search?: boolean
  secureFormulas?: boolean
  selectionCopy?: boolean
  sorting?: any
  stripHTML?: boolean
  stripHTMLOnCopy?: boolean
  style?: any
  tableHeight?: string
  tableOverflow?: boolean
  tableWidth?: string
  text?: jsText
  textOverflow?: boolean
  toolbar?: any
  updateTable?: any
  url?: any
  wordWrap?: boolean
}

export interface JSpreadsheet {
  closeEditor: (cell: any, save: any) => void
  closeFilter: (columnId: any) => void
  colgroup: any[]
  copy: (highlighted: any, delimiter: string, returnData: any) => void
  copyData: (o: any, d: any) => void
  createRow: (j: any, data: any) => void
  createTable: () => void
  createToolbar: (toolbar: any) => void
  cursor: any
  data: any
  deleteColumn: (columnNumber: number, numOfColumns: number) => void
  deleteRow: (rowNumber: number, numOfRows: number) => void
  destroy: () => void
  destroyMerged: (keepOptions: any) => void
  down: (shiftKey: any, ctrlKey: any) => void
  download: (includeHeaders: boolean) => void
  dragging: boolean
  filter: string
  filters: []
  first: (shiftKey: any, ctrlKey: any) => void
  fullscreen: (activate: boolean) => void
  getCell: (cell: string) => any
  getColumnData: (columnNumber: number) => any
  getComments: (cell: string, withAuthor: boolean) => any
  getConfig: () => any
  getData: (highlighted: any, dataOnly: boolean) => any
  getDropDownValue: (column: number, key: any) => any
  getFreezeWidth: () => any
  getHeader: (column: number) => any
  getHeaders: (asArray: boolean) => any
  getHeight: (row: number) => any
  getHighlighted: () => any
  getJson: (highlighted: boolean) => any
  getJsonRow: (rowNumber: number) => any
  getLabel: (cell: string) => any
  getMerge: (cellName: string) => any
  getMeta: (cell: string, key: any) => any
  getRowData: (rowNumber: number) => any
  getSelectedColumns: () => any
  getSelectedRows: (asIds: boolean) => any
  getStyle: (cell: string, key: any) => any
  getValue: (cell: string, processedValue: boolean) => any
  getWidth: (column: number) => any
  hash: (str: string) => any
  hashString: string
  headers: any[]
  hideColumn: (colNumber: number) => void
  hideIndex: () => void
  hideRow: (rowNumber: number) => void
  highlighted: []
  history: []
  init: () => void
  insertRow: (mixed: any, rowNumber: number, insertBefore: any) => void
  jspreadsheet: any
  options: jsOptions
  orderBy: (column: number, order: any) => void
  page: (pageNumber: number) => void
  pageNumber: any
  parseCSV: (str: string, delimiter: string) => void
  parseNumber: (value: any, columnNumber: number) => void
  // parseValue: (i, j, value) => void
  // paste: (x, y, data) => void
  prepareJson: (data: any) => void
  prepareTable: () => void
  records: []
  redo: () => void
  refresh: () => void
  refreshSelection: () => void
  removeCopySelection: () => void
  removeCopyingSelection: () => void
  // removeMerge: (cellName, data, keepOptions) => void
  resetFilters: () => void
  resetSearch: () => void
  // resetSelection: (blur) => void
  // resetStyle: (o, ignoreHistoryAndEvents) => void
  resizing: any
  results: any
  // right: (shiftKey, ctrlKey) => void
  // row: (cell) => void
  rows: any[]
  save: (url: string, data: any) => void
  // scrollControls: (e) => void
  // search: (query) => void
  // searchInput: input.jexcel_search
  selectAll: () => void
  selectedCell: any
  selectedContainer: any
  selection: []
  setCheckRadioValue: () => void
  setColumnData: (colNumber: number, data: any) => void
  setComments: (cellId: string, comments: string, author: string) => void
  setData: (data: any) => void
  setFooter: (data: any) => void
  setHeader: (column: number, newValue: string) => void
  setHeight: (row: number, height: number, oldHeight: number) => void
  setHistory: (changes: any) => void
  // setMerge: (cellName, colspan, rowspan, ignoreHistoryAndEvents) => void
  // setMeta: (o, k, v) => void
  // setReadOnly: (cell, state) => void
  setRowData: (rowNumber: number, data: any) => void
  // setStyle: (o, k, v, force, ignoreHistoryAndEvents) => void
  // setValue: (cell, value, force) => void
  // setValueFromCoords: (x, y, value, force) => void
  setWidth: (column: number, width: number, oldWidth: number) => void
  showColumn: (colNumber: number) => void
  showIndex: () => void
  showRow: (rowNumber: number) => void
  style: any[]
  // table: table.jexcel.jexcel_overflow
  // tbody: tbody.draggable.resizable
  // textarea: textarea#jexcel_textarea.jexcel_textarea
  // thead: thead.resizable
  undo: () => void
  // up: (shiftKey, ctrlKey) => void
  // updateCell: (x, y, value, force) => void
  // updateCopySelection: (x3, y3) => void
  // updateCornerPosition: () => void
  // updateFormula: (formula, referencesToUpdate) => void
  // updateFormulaChain: (x, y, records) => void
  // updateFormulas: (referencesToUpdate) => void
  // updateFreezePosition: () => void
  // updateMeta: (affectedCells) => void
  // updateNestedHeader: (x, y, title) => void
  // updateOrder: (rows) => void
  // updateOrderArrow: (column, order) => void
  // updatePagination: () => void
  updateResult: () => void
  // updateScroll: (direction) => void
  // updateSelection: (el1, el2, origin) => void
  // updateSelectionFromCoords: (x1, y1, x2, y2, origin) => void
  updateTable: () => void
  updateTableReferences: () => void
  // wheelControls: (e) => void
  // whichPage: (cell) => void
}