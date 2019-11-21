<template>
  <v-container>
  <QueryTab :session_id="session_id"/>
  </v-container>
</template>

<script>
  import QueryTab from './QueryTab';
export default {
  props: ['session_id'],

  components: {
    QueryTab
  },

  mounted() {
  },

  methods: {
  },

  data: () => ({}),
};
</script>
