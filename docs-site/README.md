# AI 产品生产指南 - 文档站点

基于 Next.js + @ant-design/x-markdown 构建的静态文档站点，可部署到阿里云 OSS。

## 技术栈

- **Next.js 15.x** - React 全栈框架，支持静态导出
- **Ant Design 6.x** - UI 组件库
- **@ant-design/x-markdown** - 流式 Markdown 渲染引擎
- **TypeScript** - 类型安全

## 快速开始

### 安装依赖

```bash
cd docs-site
npm install
```

### 本地开发

```bash
npm run dev
```

访问 http://localhost:3000

### 构建静态资源

```bash
npm run build
```

构建产物将输出到 `out/` 目录。

## 部署到阿里云 OSS

### 1. 构建静态资源

```bash
npm run build
```

### 2. 上传到 OSS

使用 ossutil 或阿里云控制台上传 `out/` 目录下的所有文件：

```bash
# 使用 ossutil
ossutil cp -r out/ oss://your-bucket-name/ --update
```

### 3. 配置静态网站托管

在阿里云 OSS 控制台中：

1. 进入 Bucket 管理
2. 选择 **基础设置** > **静态页面**
3. 设置：
   - 默认首页：`index.html`
   - 默认 404 页：`404.html`

### 4. 绑定自定义域名（可选）

在 OSS 控制台绑定域名，并配置 CDN 加速。

## 项目结构

```
docs-site/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 全局布局
│   │   ├── page.tsx            # 首页（README.md）
│   │   ├── not-found.tsx       # 404 页面
│   │   ├── globals.css         # 全局样式
│   │   └── [...slug]/
│   │       └── page.tsx        # 动态路由页面
│   ├── components/
│   │   ├── Header.tsx          # 顶部导航
│   │   ├── Sidebar.tsx         # 侧边栏菜单
│   │   └── MarkdownRenderer.tsx # Markdown 渲染组件
│   └── lib/
│       └── docs.ts             # 文档处理工具函数
├── next.config.js              # Next.js 配置
├── tsconfig.json               # TypeScript 配置
└── package.json
```

## 特性

- ✅ **流式渲染** - 使用 @ant-design/x-markdown 实现打字机效果
- ✅ **静态导出** - 纯静态 HTML/CSS/JS，无需服务器
- ✅ **Mermaid 支持** - 内置流程图渲染
- ✅ **代码高亮** - 自动语法高亮
- ✅ **响应式设计** - 适配不同屏幕尺寸
- ✅ **SEO 友好** - SSG 预渲染所有页面

## 添加新文档

1. 在项目根目录下的 `技术选型/` 或 `开发计划/` 文件夹中添加 `.md` 文件
2. 重新启动开发服务器或构建：`npm run dev` 或 `npm run build`

> 💡 **自动扫描**：文档结构会在每次启动/构建时自动从根目录扫描生成，无需手动配置菜单。

## 文档结构自动生成

本项目使用构建时脚本自动扫描根目录下的 Markdown 文件，生成侧边栏菜单结构。

### 工作原理

1. **构建脚本** `scripts/generate-docs-structure.js` 在每次 `npm run dev` 或 `npm run build` 前自动执行
2. 脚本扫描根目录下所有 `.md` 文件（排除 `README.md`、`docs-site/`、`node_modules/` 等）
3. 生成 `src/lib/docs-structure.json` 配置文件
4. `Sidebar.tsx` 组件从 JSON 文件导入菜单结构

### 相关命令

```bash
# 手动生成文档结构
npm run generate-docs

# 开发模式（自动生成文档结构后启动）
npm run dev

# 构建（自动生成文档结构后构建）
npm run build
```

### 自定义文档标题

文档标题按以下优先级确定：

1. 脚本中 `labelMap` 定义的映射名称
2. Markdown 文件中的一级标题（`# 标题`）
3. 文件名（去除 `.md` 后缀，`-` 替换为空格）

如需自定义标题，可编辑 `scripts/generate-docs-structure.js` 中的 `labelMap`。
