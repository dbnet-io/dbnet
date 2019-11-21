class Database {
  constructor(vm, data = {}) {
    this.vm = vm;
    this.name = name;
    this.schemas = {};
  }

  // Getter
  get area() {
    return this.calcArea();
  }

  // Method
  calcArea() {
    return this.height * this.width;
  }

  exec_query(sql, tab_id = null){
    let data1 = {sql: sql}
    this.vm.$send('execSQL', data1, (data2) => {
      console.log('SQL!!')
      console.log(data2)
      if(!data2.error) console.log(JSON.parse(data2.records))
    })
  }

  kill_query(query){}

  get_schemas(){}

  get_tables(schema){}

  get_views(schema){}

  get_columns(table_full_name){}

  get_ddl(table_full_name, tab_id) {}

  analyze_fields(
    analysis_name,
    table_name = null,
    fields = [],
    mandatory_fields = false,
    kwargs = {},
    tab_id = null
  ){}

  analyze_tables(analysis_name, tables = [], tab_id = null) {}

  analyze_join_match(t1, t2, t1_field, t2_field, t1_filter = '1=1', t2_filter = '1=1', tab_id = null) {}
  
  get_queries(filter = "", limit = null) {}

  export_to_csv() {}
}

class API {
  constructor(vm, data = {}) {
    this.vm = vm;
    this.$log = vm.$log
    this.$store = vm.$store
    this.$send = vm.$send
    this.databases = {}
    // this.curr_database = new Database(vm, {})
    console.log(this)
  }

  ws_test(){
    console.log(this)
    var d = new Date();
    this.$log('ws_test')

    let data1 = {msg: `hiiii ${d.toLocaleTimeString()}`}
    this.$send('hello', data1, (data2) => {
      this.$log('handler!!')
      this.$log(data2)
      this.$store.hello.msg = data2.msg
    })
  }

  submit_meta(){}
  submit_req(){}

  encode_function(func_name, args){
    return `@${func_name}=${JSON.stringify(args)}`
  }

  decode_function(code_string){
    if (code_string[0] != '@') return 
    let parsed = code_string.replace('@', '').replace('=', '`@`&`').split('`@`&`')
    let func_name = parsed[0]
    let args = JSON.parse(parsed[1])

    // check authorized function name
    let authorized = {
      'get_columns': this.curr_database.get_columns
    }

    if (!(func_name in authorized)) return {f: () => { console.error(`Function ${func_name} is not authorized`)}, a: {}}
    else return {f: authorized[func_name], a: args}
  }
}

export default {
  API,
  Database
}