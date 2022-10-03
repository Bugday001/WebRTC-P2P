
module.exports = {
    publicPath: './',
    devServer: {
      proxy: {
        // 和上面自定义的 baseURL 保持一致
        '/api': {
          target: 'https://www.request-domain.com',
          pathRewrite: { '^/api': '' },
        }
      }
    },

  }