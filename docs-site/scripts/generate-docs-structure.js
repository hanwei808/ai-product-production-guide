/**
 * 构建时生成文档结构配置
 * 扫描项目根目录的 Markdown 文件，生成 JSON 结构供 Sidebar 使用
 */

const fs = require('fs')
const path = require('path')

// 文档根目录（相对于 docs-site 目录）
const DOCS_ROOT = path.join(__dirname, '..', '..')
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'lib', 'docs-structure.json')

// 需要跳过的目录
const SKIP_DIRS = ['docs-site', 'node_modules', '.git', '.github', '.vscode']

// 获取文件标题（从 Markdown 内容中提取 # 标题或使用文件名）
function extractTitle(content, fileName) {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) {
    return match[1]
  }
  // 从文件名生成标题
  return fileName.replace(/\.md$/, '').replace(/-/g, ' ')
}

// 为目录生成友好的显示名称
function getFolderLabel(folderName) {
  // 可以在这里添加更多的映射规则
  const labelMap = {
    '技术选型': '技术选型',
    '开发计划': '开发计划',
    '服务设计': '服务设计',
  }
  return labelMap[folderName] || folderName
}

// 为文件生成友好的显示名称
function getFileLabel(title, fileName) {
  // 特殊文件名映射
  const labelMap = {
    'dify-spring-ai-alibaba-guide': 'Dify & Spring AI Alibaba 指南',
    'docker-kubernetes-guide': 'Docker & Kubernetes 指南',
    'langfuse-promptfoo-guide': 'LangFuse & Promptfoo 指南',
    'nextjs-ant-design-x-guide': 'Next.js & Ant Design X 指南',
    'ollama-vllm-guide': 'Ollama & vLLM 指南',
    'postgresql-milvus-guide': 'PostgreSQL & Milvus 指南',
    'spring-ai-langchain-guide': 'Spring AI & LangChain 指南',
    'unstructured-etl-guide': 'Unstructured ETL 指南',
    'vscode-copilot-cursor-guide': 'VS Code Copilot & Cursor 指南',
    'backend-development-plan': '后端开发计划',
    '01-data-service-design': '01 数据服务设计',
    '02-inference-service-design': '02 推理服务设计',
    '03-ai-core-service-design': '03 AI 核心服务设计',
    '04-rag-service-design': '04 RAG 服务设计',
    '05-etl-service-design': '05 ETL 服务设计',
    '06-dify-service-design': '06 Dify 服务设计',
    '07-observability-service-design': '07 可观测性服务设计',
  }
  
  const slug = fileName.replace(/\.md$/, '')
  return labelMap[slug] || title
}

// 递归获取目录下的所有 Markdown 文件
function getMarkdownFiles(dir, basePath = '') {
  const items = []
  
  if (!fs.existsSync(dir)) {
    return items
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/')
    
    if (entry.isDirectory()) {
      // 跳过特定目录和隐藏目录
      if (SKIP_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
        continue
      }
      
      const children = getMarkdownFiles(fullPath, relativePath)
      if (children.length > 0) {
        items.push({
          key: relativePath,
          label: getFolderLabel(entry.name),
          children,
        })
      }
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const title = extractTitle(content, entry.name)
      const slug = entry.name.replace(/\.md$/, '')
      const key = relativePath.replace(/\.md$/, '').replace(/\\/g, '/')
      
      items.push({
        key,
        label: getFileLabel(title, entry.name),
      })
    }
  }
  
  // 按名称排序（数字开头的按数字排序）
  items.sort((a, b) => {
    const aKey = a.key.split('/').pop() || ''
    const bKey = b.key.split('/').pop() || ''
    const aNum = parseInt(aKey.match(/^(\d+)/)?.[1] || '999')
    const bNum = parseInt(bKey.match(/^(\d+)/)?.[1] || '999')
    if (aNum !== bNum) return aNum - bNum
    return aKey.localeCompare(bKey)
  })
  
  return items
}

// 主函数
function main() {
  console.log('📚 正在扫描文档目录...')
  console.log(`   根目录: ${DOCS_ROOT}`)
  
  const structure = {
    categories: getMarkdownFiles(DOCS_ROOT),
    generatedAt: new Date().toISOString(),
  }
  
  // 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // 写入 JSON 文件
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(structure, null, 2), 'utf-8')
  
  console.log(`✅ 文档结构已生成: ${OUTPUT_FILE}`)
  console.log(`   共发现 ${countItems(structure.categories)} 个文档`)
}

// 统计文档数量
function countItems(items) {
  let count = 0
  for (const item of items) {
    if (item.children) {
      count += countItems(item.children)
    } else {
      count++
    }
  }
  return count
}

main()
