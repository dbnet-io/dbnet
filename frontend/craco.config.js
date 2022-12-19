const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');


module.exports = {
  // ...
  webpack: {
    alias: { /* ... */ },
    plugins: {
      add: [
        new MonacoWebpackPlugin({
          // available options are documented at https://github.com/microsoft/monaco-editor/blob/main/webpack-plugin/README.md#options
          languages: ['sql']
        })
      ],
      remove: [ /* ... */ ],
    },
    configure: { /* ... */},
    configure: (webpackConfig, { env, paths }) => {
      /* ... */
      return webpackConfig;
    },
  },
};