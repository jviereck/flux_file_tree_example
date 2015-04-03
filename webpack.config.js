
var webpack = require('webpack');

module.exports = {
  entry: [
    'webpack-dev-server/client?http://localhost:9995',
    'webpack/hot/only-dev-server',
    './scripts/index'
  ],
  output: {
    path: __dirname + '/dist/',
    filename: 'bundle.js',
    publicPath: "http://localhost:9995/dist/"
  },
  devtool: "#inline-source-map",
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ],
  resolve: {
    extensions: ['', '.js']
  },
  module: {
    preLoaders: [
      { test: /flow_check\.js$/, loaders: ['flow-check-loader'] },
    ],
    loaders: [
      { test: /\.js$/, loaders: [/*'react-hot',*/ 'babel-loader'], exclude: /node_modules/ },
    ]
  }
};
