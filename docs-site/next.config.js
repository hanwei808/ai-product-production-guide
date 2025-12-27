/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 静态导出，适合部署到 OSS
  images: {
    unoptimized: true  // OSS 不支持 Next.js 图片优化 API
  },
  trailingSlash: true,  // 生成 /page/index.html 格式，兼容静态托管
  
  // Turbopack 配置（Next.js 16 默认使用 Turbopack）
  turbopack: {
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js'
      }
    }
  },
  
  // 配置 webpack 支持读取 .md 文件（用于生产构建）
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source'
    })
    return config
  }
}

module.exports = nextConfig
