<script lang="ts">
  import type { TabState } from "../../state";

  import Editor from "./Editor.svelte";
  import Table from "./Table.svelte";
  import Toolbar from "./Toolbar.svelte";
  export let tab : TabState 
  
</script>

<div>
  <div>
    <Editor/>
  </div>

  <div id="result-panel">
    <Toolbar/>
    <Table/>
  </div>
</div>

<style>
</style>