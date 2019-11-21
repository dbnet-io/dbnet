module.exports = {
  "devServer": {
    disableHostCheck: true,
    proxy: {
      '^/ws': {
        target: 'http://localhost:9999',
        ws: true,
        changeOrigin: true
      },
      '^/sockjs-node': {
        target: 'http://localhost:9999',
        ws: true,
        changeOrigin: false
      },
      '^/socket.io': {
        target: 'http://localhost:9999',
        ws: true,
        changeOrigin: false
      },
      '^/api': {
        target: 'http://localhost:9999',
        ws: true,
        changeOrigin: true
      },
    },
    // "proxy": "http://localhost:9999"
  },
  pluginOptions: {

    // https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/configuration.html
    electronBuilder: {
      mainProcessFile: 'src/background.golang.js',

      // https://www.electron.build/configuration/configuration
      builderOptions: {
        "extraResources": [
          {
            "from": "../release/backend",
            "to": ".",
            "filter": "**/*"
          }
        ],
      }
    },
  },
  "transpileDependencies": [
    "vuetify"
  ]
}