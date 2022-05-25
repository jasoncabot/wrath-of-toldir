const { merge } = require('webpack-merge')
const common = require('./webpack.common')

const dev = {
  mode: 'development',
  stats: 'errors-warnings',
  devtool: 'eval-cheap-module-source-map',
  devServer: {
    open: false
  }
}

module.exports = merge(common, dev)
