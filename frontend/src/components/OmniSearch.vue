<template>
  <v-autocomplete
    id="omnibox"
    label="Search objects..."
    hide-details
    prepend-icon="mdi-magnify"
    single-line
    hide-no-data
    clearable
    v-model="select"
    item-text="name"
    item-value="name"
    :loading="loading"
    :items="items"
    :search-input.sync="search"
  >
    <template v-slot:item="data">
      <template v-if="typeof data.item !== 'object'">
        <v-list-item-content v-text="data.item"></v-list-item-content>
      </template>
      <template v-else>
        <v-list-item-content>
          <v-list-item-title v-html="data.item.name"></v-list-item-title>
          <v-list-item-subtitle v-html="data.item.group"></v-list-item-subtitle>
        </v-list-item-content>
      </template>
    </template>
  </v-autocomplete>
</template>

<script>
export default {

  mounted() {
  },

  data () {
    return {
      loading: false,
      items: [],
      search: null,
      select: null,
      people: [
        { header: 'housing' },
        { name: 'housing.lake_nona', group: 'housing'},
        { name: 'housing.orlando', group: 'housing'},
        { name: 'housing.sao_paulo', group: 'housing'},
        { name: 'housing.belo_horizonte', group: 'housing'},
        { divider: true },
        { header: 'bank' },
        { name: 'bank.amazon_transactions', group: 'bank'},
        { name: 'bank.mint_transactions', group: 'bank'},
        { name: 'bank.mint_categories', group: 'bank'},
      ],
    }
  },
  watch: {
    search (val) {
      val && val !== this.select && this.querySelections(val)
    },
  },
  methods: {
    querySelections (v) {
      this.loading = true
      console.log(v)
      console.log(this.people)
      // Simulated ajax query
      setTimeout(() => {
        this.items = this.people.filter(e => {
          return (e.name || '').toLowerCase().indexOf((v || '').toLowerCase()) > -1
        })
        this.loading = false
      }, 500)
    },
  },
};
</script>
