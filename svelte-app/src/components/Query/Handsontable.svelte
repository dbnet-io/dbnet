<svelte:head>
    <script src="https://cdn.jsdelivr.net/npm/handsontable@6.2.2/dist/handsontable.full.min.js" 
        on:load={scriptLoaded}></script>
    <link href="https://cdn.jsdelivr.net/npm/handsontable@6.2.2/dist/handsontable.full.min.css" rel="stylesheet" 
        on:load={styleLoaded}>
</svelte:head>

<script>
  // https://svelte.dev/repl/a72e2b46e44e4ea18e98a8b0d6643000?version=3.16.7
  import { onMount } from 'svelte';

  export let data;
  export let settings;
  export let height;

  let gridElement;
  let hot;

  let gridStatus = {
      isScriptLoaded: false,
      isStyleLoaded: false,
      isMounted: false,
      isInited: false
  }
  
  onMount(() => {
      gridStatus.isMounted = true;
      if (gridStatus.isScriptLoaded && gridStatus.isStyleLoaded) gridInit()
  })

  function scriptLoaded() {
      gridStatus.isScriptLoaded = true;
      if (gridStatus.isMounted && gridStatus.isStyleLoaded) gridInit()
  }

  function styleLoaded() {
      gridStatus.isStyleLoaded = true;
      if (gridStatus.isScriptLoaded && gridStatus.isMounted) gridInit()
  }

  function gridInit() {
      if (!gridStatus.isInited) {
          gridStatus.isInited = true;
          hot = new Handsontable(gridElement,{
            data: data,
            rowHeaders: true,
            colHeaders: true,
            columnSorting: true,
            preventOverflow: 'horizontal',
            renderAllRows: false,
            height: height,
          });
      } 
  }
</script>

<div bind:this={gridElement}></div>