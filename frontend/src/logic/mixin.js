import functions from './functions';
import classes from './classes';

export default {

  computed: {
    $func() {
      return this.$$functions$$()
    },
    $api() {
      return this.$$api$$()
    }
  },
  
  methods: {
    $send(name, data = {}, handler = undefined){
      this.$func.send(name, data = data, handler = handler)
    },

    $log(text){
      console.log(text)
    },

    $$functions$$(){
      return functions(this)
    },

    $$api$$(){
      return new classes.API(this)
    },
  },

  data: () => ({
    api: null,
  })
}