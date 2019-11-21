<template>
  <v-container fluid @click="$store.active.session = session_id">
    <v-card class="card-container">
      <div class="tab-close">
        <v-icon>mdi-close-circle</v-icon>
      </div>
      <v-tabs
        v-model="$store.sessions[session_id].active_tab"
        background-color="blue lighten-2"
        dark
      >
        <v-tab
          v-for="n in length"
          :key="n"
        >
         {{ `TAB#${n}` }}
        </v-tab>
      </v-tabs>

      <!-- <v-card-text class="text-center">
        <v-btn text @click="length--">Remove Tab</v-btn>
        <v-divider class="mx-4" vertical></v-divider>
        <v-btn text @click="length++">Add Tab</v-btn>
      </v-card-text> -->
      
      <v-row>
        <v-col cols="3" class="padding-zero">
          <Editor :session_id="session_id"/>
        </v-col>
        <v-col cols="9" class="padding-zero">
          <QueryMain :session_id="session_id"/>
        </v-col>
      </v-row>
    </v-card>
  </v-container>
</template>

<script>
  import Editor from './Editor';
  import QueryMain from './QueryMain';
  export default {
    props: ['session_id'],

    computed: {
      session(){
        return this.$store.sessions[this.session_id]
      }
    },

    components: {
      Editor,
      QueryMain,
    },

    data: () => ({
      length: 25,
      tab: null,
    }),

    watch: {
      length (val) {
        this.tab = val - 1
      },
    },
  }
</script>

<style>
.tab-close
{
     float: left;
     box-sizing: border-box;
     background-color:#64B5F6 ;
     width: 48px;
     height: 48px;
     font: 13px/50px 'Source Code Pro', monospace;
     text-transform: uppercase;
     text-align: center;
}

.card-container {
  max-height: 80vh
}

</style>

