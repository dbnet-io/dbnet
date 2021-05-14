<script lang="ts">
  import { onDestroy } from 'svelte'
  import { AceEditor } from "svelte-ace";
  import "brace/mode/pgsql";
  import "brace/theme/textmate";
  import { writable, get } from 'svelte/store';
  import type { ObjectAny } from "../../utilities/interfaces";

  export let text = writable('select * from housing.landwatch2');
  export let selection = writable([0,0,0,0]);
  const options = {
    // enableBasicAutocompletion: false,
    // enableLiveAutocompletion: false,
    // enableSnippets: false,
    showGutter: true,
    showLineNumbers: true,
    autoScrollEditorIntoView: true,
    wrap: false,
    wrapBehavioursEnabled: true,
    showPrintMargin: false,
    tabSize: 2,
  }

  export const getLines = () => get(text).split('\n')
  export const getBlock = () => {
    let block = ''
    let lines = getLines()
    let lineI = get(selection)[0]
    let line = lines[lineI]
    let pos = get(selection)[1]

    let i = pos
    let l = lineI
    while (true) {
      if(i >= line.length) {
        if(l >= lines.length-1) {
          break
        }
        l++
        i = 0
        block += '\n'
      }

      line = lines[l]
      const char = line[i]
      if(char === ';') { break }
      if(char) { block += char }
      i++
    }

    i = pos-1
    l = lineI
    line = lines[l]
    while (true) {
      if(i < 0) {
        if(l <= 0) {
          break
        }
        l--
        line = lines[l]
        i = line.length-1
        block = '\n' + block
      }

      const char = line[i]
      if(char === ';') { break }
      if(char)  { block = char + block }
      i--
    }

    return block
  }
  export const getWord = () => {
    let word = ''
    let lines = getLines()
    let line = lines[this.selection[0]]
    let pos = get(selection)[1]

    for (let i = pos; i < line.length; i++) {
      const char = line[i];
      if(char === ' ' || char === '\t') { break }
      else {  word += char }
    }

    for (let i = pos-1; i >= 0; i--) {
      const char = line[i];
      if(char === ' ' || char === '\t') { break }
      else {  word = char + word }
    }

    return word
  }

  onDestroy(() => {
    console.log('destroyed')
  })

</script>

<div>
  <AceEditor
    on:selectionChange={(obj) => console.log(obj.detail)}
    on:paste={(obj) => console.log(obj.detail)}
    on:input={(obj) => text.set(obj.detail) }
    on:focus={() => console.log('focus')}
    on:documentChange={(obj) => console.log(`document change : ${obj.detail}`)}
    on:cut={() => console.log('cut')}
    on:cursorChange={(e) => console.log(e)}
    on:copy={() => console.log('copy')}
    on:init={(e) => console.log(e.detail)}
    on:commandKey={(obj) => console.log(obj.detail)}
    on:changeMode={(obj) => console.log(`change mode : ${obj.detail}`)}
    width='100%'
    height='300px'
    lang="pgsql"
    theme="textmate"
    value={get(text)}
    options={options}
  />
</div>

<style>
</style>