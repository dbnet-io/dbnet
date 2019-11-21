
const api_routes = {

}

export default {
  app: {
    socket_connected: false,
    name: '',
  },

  hello: {
    msg: '',

    get get_msg() {
      return this.msg
    },

    set set_msg(x) {
      this.msg = x + ' ' + this.msg;
    }
  },
  databases:{},
  handlers: {},
  test:{
    jetable:{
      get columns() { 
        return [
          { type: 'numeric', title: 'Year', width: '100px', decimal: ',' },
          { type: 'text', title: 'Car' },
          { type: 'dropdown', title: 'Make', source: [ 'Alfa Romeo', 'Audi', 'Bmw' ] },
          { type: 'calendar', title: 'Available' },
          { type: 'image', title: 'Photo' },
          { type: 'checkbox', title: 'Stock', width: '80px' },
          { type: 'numeric', title: 'Price', width: '100px', mask: '$ #.##,00', decimal: ',' },
          { type: 'color', width: '100px', render: 'square' },
          { type: 'text', title: 'Car' },
          { type: 'dropdown', title: 'Make', source: [ 'Alfa Romeo', 'Audi', 'Bmw' ] },
          { type: 'calendar', title: 'Available' },
          { type: 'image', title: 'Photo' },
          { type: 'checkbox', title: 'Stock', width: '80px' },
          { type: 'numeric', title: 'Price', width: '100px', mask: '$ #.##,00', decimal: ',' },
          { type: 'color', width: '100px', render: 'square' },
        ]
      },
      get data() {
        let rows = [
          [Math.ceil(Math.random() * 100) + 1950, 'Jazz', 'Honda', '2019-02-12', '', true, '$ 2.000,00', '#777700','Jazz', 'Honda', '2019-02-12', '', true, '$ 2.000,00', '#777700'],
          [Math.ceil(Math.random() * 100) + 1950, 'Civic', 'Honda', '2018-07-11', '', true, '$ 4.000,01', '#007777','Civic', 'Honda', '2018-07-11', '', true, '$ 4.000,01', '#007777'],
        ]
        let data = []
        for (let i = 0; i < 500; i++) {
          for (let j = 0; j < rows.length; j++) {
            data.push(rows[j])
          }
        }
        return data
      }
    },
  },
  active: {
    session: 1
  },
  sessions: {
    1:{
      active_tab: 0,
      jetable: null,
    },
    2:{
      active_tab: 0,
      jetable: null,
    },
    3:{
      active_tab: 0,
      jetable: null,
    },
  }
}
