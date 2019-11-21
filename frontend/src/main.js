import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import vuetify from './plugins/vuetify';
import axios from 'axios'
import VueAxios from 'vue-axios'
import VueStash from 'vue-stash';
import mixin from './logic/mixin';
import sockets from './logic/sockets';
import computed from './logic/computed';
import store from './logic/store';
import test_data from './logic/store.test';
import VueNativeSock from 'vue-native-websocket'
 
const deepmerge = require('deepmerge');

Vue.config.productionTip = false
Vue.use(VueStash)
Vue.use(VueAxios, axios)

// Vue.use(methods)

// https://www.npmjs.com/package/vue-native-websocket
Vue.use(VueNativeSock, `ws://${document.domain}:${location.port}/ws`, {
  format: 'json',
  reconnection: true, // (Boolean) whether to reconnect automatically (false)
  // reconnectionAttempts: 99, // (Number) number of reconnection attempts before giving up (Infinity),
  reconnectionDelay: 1000, // (Number) how long to initially wait before attempting a new (1000)
})

Vue.mixin(mixin)


window.vm = new Vue({
  // sockets,

  mounted() {
    let self = this

    // load state
    Object.keys(test_data).forEach(function(key) {
      this.$store[key] = deepmerge(this.$store[key], test_data[key]);
    }, this);

    // Sockets
    this.$options.sockets.onopen = (event) => sockets.onopen(self, event)
    this.$options.sockets.onclose = (event) => sockets.onclose(self, event)
    this.$options.sockets.onerror = (event) => sockets.onerror(self, event)
    this.$options.sockets.onmessage = (event) => sockets.onmessage(self, event)
  },
  router,
  data: {
    store
  },
  vuetify,
  render: h => h(App)
}).$mount('#app')
