<template>
  <!-- <v-data-table
    :headers="headers"
    :items="desserts"
    :items-per-page="5"
    class="elevation-1"
  ></v-data-table> -->
  <div class="data-table">
    <div ref="jetable" ></div>
  </div>
</template>

<script>
  import jexcel from 'jexcel'
  import 'jexcel/dist/jexcel.css'

  export default {
    props: ['session_id'],

    mounted() {
    },


  methods: {
    load_hotable(){
      
    },
    load_je_table(){
      var options = {
        data: this.$store.test.jetable.data,
        tableOverflow: true,
        allowToolbar: true,
        editable: false,
        lazyLoading: true,
        tableHeight: '50vh',
        tableWidth: '100%',
        defaultColWidth: 90,
        columns: this.$store.test.jetable.columns
      }
      this.$store.sessions[this.session_id].jetable = jexcel(this.$el, options)
      Object.assign(this, { jetable: this.$store.sessions[this.session_id].jetable })
    }
  },

    data () {
      return {
      }
    },
  }
</script>

<style>
.data-table {
  height: 100%;
  box-sizing: border-box;
  padding-top: 0px;
  width: 100%;
  overflow: hidden;
  font-size: 0.7rem;
  position: relative;
  z-index: 0
}
</style>