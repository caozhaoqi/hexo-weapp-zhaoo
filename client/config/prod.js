module.exports = {
  env: {
    NODE_ENV: '"production"'
  },
  defineConstants: {
  },
  mini: {
    optimize: {
      // 开启主包/分包压缩
      mainPackage: true,
      subPackages: true,
    },
    webpackChain(chain) {
      // 生产环境开启压缩与 tree-shaking
      // 注意：Taro 3.6 中 terser 由内部 runner 默认接入，不能通过 chain.plugin('terser').tap()
      // 自定义（会创建空插件入口导致 toConfig 阶段崩溃）。drop_console 等参数请走
      // mini.optimize / 内置 terser 配置，而非手动 tap webpack-chain 插件。
      chain.optimization.minimize(true);
      chain.optimization.usedExports(true);
    },
  },
  h5: {
    /**
     * 如果h5端编译后体积过大，可以使用webpack-bundle-analyzer插件对打包体积进行分析。
     * 参考代码如下：
     * webpackChain (chain) {
     *   chain.plugin('analyzer')
     *     .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, [])
     * }
     */
  }
}
