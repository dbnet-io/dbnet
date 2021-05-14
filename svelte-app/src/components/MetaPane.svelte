<script lang="ts">
  import HistoryTab from "./Meta/HistoryTab.svelte";
  import ObjectTab from "./Meta/ObjectTab.svelte";
  import SchemaTab from "./Meta/SchemaTab.svelte";
  export let activeTab = 'Schema'
  let tabs = ['Schema', 'Object', 'History']
</script>

<div>
  <div class="tabs is-toggle" style="width: 100%">
    <ul>
      {#each tabs as tab, index}
        <li class={tab === activeTab ? 'is-active' : ''}>
          <a href="#" on:click={() => activeTab = tab}>
            <span>{tab}</span>
          </a>
        </li>
      {/each}
    </ul>
  </div>
  <div>
    {#if activeTab === 'Schema'} <SchemaTab/> {/if}
    {#if activeTab === 'Object'} <ObjectTab/> {/if}
    {#if activeTab === 'History'} <HistoryTab/> {/if}
  </div>
</div>

<style>
</style>