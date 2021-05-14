<script lang="ts">
  export let props

  const resultHeight = document.getElementById("result-panel")?.parentElement?.clientHeight
  const resultWidth = document.getElementById("result-panel")?.parentElement?.clientWidth
  const tableHeight = !resultHeight || resultHeight < 200 ? 200 : resultHeight-38

  import Handsontable from './Handsontable.svelte'
  let data = [
		['','Tesla','Volvo','Toyota','Ford'],
		['2019','Tesla','Volvo','Toyota','Ford'],
		['2020','Tesla','Volvo','Toyota','Ford'],
		['2021','Tesla','Volvo','Toyota','Ford']
	]
  for (let index = 0; index < 10000; index++) {
    data.push(['2019','Tesla','Volvo','Toyota','Ford'])
  }

const settings = {
  // colHeaders: ["Year", "Ford", "Volvo", "Toyota", "Honda"],
  // columns: columnDefs,
  rowHeaders: true,
  // stretchH: 'all',
  // width: 806,
  // autoWrapRow: false,
  preventOverflow: 'horizontal',
  wordWrap: false,
  // height: 441,
  // maxRows: 50,,
  columnSorting: true,
  sortIndicator: true,
  renderAllRows: false,
  autoColumnSize: {
    samplingRatio: 23
  },
  search: true,
  contextMenu: false,
  // fixedColumnsLeft: 2,
  manualColumnResize: true,
  modifyColWidth: function (width: number, col: number) {
    if (width > 250) {
      return 250
    }
  },
  viewportColumnRenderingOffset: 20,
  viewportRowRenderingOffset: 20,
}
</script>

<div style="font-size:11.5px">
  <Handsontable {data} {settings} height={tableHeight}/>
</div>

<style>
</style>