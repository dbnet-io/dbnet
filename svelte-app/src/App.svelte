<script lang="ts">
  import 'bulma/css/bulma.css'
  import MetaPane from './components/MetaPane.svelte';
  import QueryPane from './components/QueryPane.svelte';
</script>

<main>
	<div class="columns">
    <div class="column is-one-fifth" id="meta-pane">
      <MetaPane/>
    </div>
    <div class="column" id="query-pane">
      <QueryPane/>
    </div>
  </div>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>