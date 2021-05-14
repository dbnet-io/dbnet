<script lang="ts">
  let text = 'select *\nfrom my table'
</script>

<div>

  <!-- history list start -->
  <div class="select is-multiple" style="width: 100%">
    <select multiple size="10" style="width: 100%; font-size: 12px;">
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
  <!-- history list end -->

  <br/>

  <textarea
    class="textarea is-primary"
    placeholder="Primary textarea"
    rows="10"
    readonly
  >{text}</textarea>

</div>

<style>
</style>