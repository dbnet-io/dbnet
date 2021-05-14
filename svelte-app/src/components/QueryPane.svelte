<script lang="ts">
// import { TabState } from "../state";

import Tab from "./Query/Tab.svelte";

export let activeTab = 1
export let tabs = [
  {name: 'Q1'},
  {name: 'Q2'},
  {name: 'Q3'},
]
</script>

<div>
  <div class="tabs is-boxed">
    <ul>
      <li>
        <a href="#">
          <!-- <span class="icon is-small"><i class="fas fa-image" aria-hidden="true"></i></span> -->
          <span>X</span>
        </a>
      </li>

      {#each tabs as tab, index}
        <li class={index === activeTab ? 'is-active' : ''}>
          <a href="#" on:click={() => activeTab = index}>
            <span>{tab.name}</span>
          </a>
        </li>
      {/each}

    </ul>
  </div>

  {#each tabs as tab, index}
    {#if activeTab === index} <Tab/> {/if}
  {/each}
</div>

<style>
</style>