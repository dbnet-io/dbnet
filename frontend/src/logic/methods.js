
var methods = {
  hello: function (self) {
    console.log('hello from mixin!')
    console.log(self)
    console.log(this)
  },

  send: function(self, name, data = {}, handler = undefined){
    let payload = {
      req_id: Date.now(),
      name: name,
      data: data,
    }
    // Register handler
    if (handler) self.$store.handlers[payload.req_id] = handler
    self.$socket.sendObj(payload)

    // Store handler?
    // let handler_str = handler.toString()
    // let handler = new Function('return ' + handler_str)()
  },
};

export default {
  // https://vuejs.org/v2/guide/plugins.html
  install: function (Vue, options) {
    Vue.prototype.$func2 = methods
    Vue.prototype.$VV = Vue
  }
}