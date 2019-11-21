var sockets = {

  onopen: function(self, event) {
    self.$store.app.socket_connected = true
    console.log(`onopen`)
    console.log(self)
    console.log(event)
  },

  onclose: function(self, event) {
    self.$store.app.socket_connected = false
    console.log(`onopen`)
    console.log(onclose)
  },

  onerror: function(self, event) {
    console.log(`onerror`)
    console.error(event)
  },

  onmessage: function(self, event) {
    console.log(`onmessage`)
    console.log(event)
    let payload = JSON.parse(event.data)
    console.log(payload)

    // look for registered handler
    let handler = self.$store.handlers[payload.req_id]
    if (handler) {
      handler(payload.data)
      delete self.$store.handlers[payload.req_id]
    }
  },

  reconnect: function(self, event) {
    self.$store.app.socket_connected = true
    console.log(`reconnect`)
    console.log(event)
  },
  reconnect_error: function(self, event) {
    self.$store.app.socket_connected = false
    console.log(`reconnect: ${event}`)
  },
};

export default sockets