<script lang="ts">
  import 'bulma/css/bulma.css'
	export let name: string;
</script>

<main>
	<h1>Hello {name}!!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
  <div class="buttons">
    <button class="button is-primary">Primary</button>
    <button class="button is-link">Link</button>
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