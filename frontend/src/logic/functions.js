import classes from "./classes";

var functions = function(self) {
  return {

    api: new classes.API(self),

    log(text){
      console.log(text)
    },

    hello() {
      this.log('hello from mixin!')
      this.log(self)
      this.log(this)
    },

    send(name, data = {}, handler = undefined){
      let payload = {
        req_id: `${Date.now()}.${Math.random().toString(36).substring(2, 5)}`,
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


    get_ddl(table_full_name, tab_id) {
      // returns table / view DDL
    },

    get_config(){},
    get_databases(){
      let data = {}
      Object.keys(data).forEach(function(key) {
        let db_data = databases[key];
        self.$store.databases[key] = new classes.Database(self, db_data)
      }, this);
    },
  }
};

export default functions