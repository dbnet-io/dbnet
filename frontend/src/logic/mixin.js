export default {
  computed: {},
  methods: {
    $send(name, data = {}, handler = undefined){
      this.$func.send(this, name, data = data, handler = handler)
    }
  }
}