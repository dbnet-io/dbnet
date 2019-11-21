<template>
  <v-container fluid >
    <!-- <textarea name="editor" style="width: 100%;heigth: 100%;box-sizing: border-box; -moz-box-sizing: border-box; -webkit-box-sizing: border-box;">
      select * from table
    </textarea> -->
    <div class="editor-container">
      <editor class="editor"
        v-model="content" @init="editorInit" ref='ace_editor'
        lang="sql" theme="chrome" heigth="100%" width="100%">
      </editor>
    </div>
  </v-container>
</template>

<script>
const editor = require('vue2-ace-editor')
export default {
  props: ['session_id'],

  components: {
    editor,
  },

  mounted() {
    let editor = this.$refs.ace_editor.editor
    let ace_options= {
      useSoftTabs: true,
      wrap: true,
      tabSize: 2,
    }
    this.$refs.ace_editor.editor.setOptions(ace_options)
    // this.$refs.ace_editor.editor.setTheme("ace/theme/monokai")
    this.$refs.ace_editor.editor.resize()
  },

  methods: {
    editorInit: function () {
      require('brace/ext/language_tools') //language extension prerequsite...
      require('brace/mode/html')                
      require('brace/mode/javascript')    //language
      require('brace/mode/sql')    //language
      require('brace/mode/less')
      require('brace/theme/chrome')
      require('brace/theme/monokai')
      require('brace/snippets/javascript') //snippet
    }
  },

  data: () => ({
    content: `
    select * 
    from table
    where col1 = 4
    order by col1`
    }),
};
</script>

<style>
.editor-container{
  height:50vh;
}

.editor {
  position: relative;
}
</style>