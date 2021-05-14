<script lang="ts">
  export let props
</script>

<div>
  <!-- schema filter start -->
  <div class="field is-grouped is-small">
    <p class="control is-expanded is-small">
      <input class="input is-small" type="text" placeholder="Find a schema">
    </p>
    <p class="control is-small">
      <a on:click={() => console.log('hello')} class="button is-info is-small">
        Search
      </a>
    </p>
  </div>
  <!-- schema filter end -->

  <!-- schema list start -->
  <div class="select is-multiple" style="width: 100%">
    <select multiple size="5" style="width: 100%; font-size: 14px;">
      <option value="Argentina">Argentina</option>
      <option value="Bolivia">Bolivia</option>
      <option value="Brazil">Brazil</option>
      <option value="Chile">Chile</option>
      <option value="Colombia">Colombia</option>
      <option value="Ecuador">Ecuador</option>
      <option value="Guyana">Guyana</option>
      <option value="Paraguay">Paraguay</option>
      <option value="Peru">Peru</option>
      <option value="Suriname">Suriname</option>
      <option value="Uruguay">Uruguay</option>
      <option value="Venezuela">Venezuela</option>
    </select>
  </div>
  <!-- schema list end -->
  <br/>
  <br/>

  <!-- object filter start -->
  <div class="field has-addons  is-small">
    <div class="control is-expanded is-small">
      <input class="input is-small" type="text" placeholder="Find a table / view">
    </div>
    <div class="control  is-small">
      <a class="button is-info is-small">
        Search
      </a>
    </div>
  </div>
  <!-- object filter end -->

  <!-- object list start -->
  <div class="select is-multiple" style="width: 100%">
    <select multiple size="10" style="width: 100%; font-size: 14px;">
      <option value="Argentina">Argentina</option>
      <option value="Bolivia">Bolivia</option>
      <option value="Brazil">Brazil</option>
      <option value="Chile">Chile</option>
      <option value="Colombia">Colombia</option>
      <option value="Ecuador">Ecuador</option>
      <option value="Guyana">Guyana</option>
      <option value="Paraguay">Paraguay</option>
      <option value="Peru">Peru</option>
      <option value="Suriname">Suriname</option>
      <option value="Uruguay">Uruguay</option>
      <option value="Venezuela">Venezuela</option>
    </select>
  </div>
  <!-- object list end -->

</div>

<style>
</style>