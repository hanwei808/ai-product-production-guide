import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// 文档根目录（相对于 docs-site 目录）
const DOCS_ROOT = path.join(process.cwd(), '..')

// 文档目录结构配置
export interface DocItem {
  title: string
  slug: string
  path: string
  children?: DocItem[]
}

export interface DocCategory {
  title: string
  slug: string
  items: DocItem[]
}

// 获取文件标题（从 Markdown 内容中提取 # 标题或使用文件名）
function extractTitle(content: string, fileName: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) {
    return match[1]
  }
  // 从文件名生成标题
  return fileName.replace(/\.md$/, '').replace(/-/g, ' ')
}

// 递归获取目录下的所有 Markdown 文件
function getMarkdownFiles(dir: string, basePath: string = ''): DocItem[] {
  const items: DocItem[] = []
  
  if (!fs.existsSync(dir)) {
    return items
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.join(basePath, entry.name)
    
    if (entry.isDirectory()) {
      // 跳过 docs-site 目录本身和隐藏目录
      if (entry.name === 'docs-site' || entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue
      }
      
      const children = getMarkdownFiles(fullPath, relativePath)
      if (children.length > 0) {
        items.push({
          title: entry.name,
          slug: entry.name,
          path: relativePath,
          children,
        })
      }
    } else if (entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const title = extractTitle(content, entry.name)
      const slug = entry.name.replace(/\.md$/, '')
      
      items.push({
        title,
        slug,
        path: relativePath.replace(/\.md$/, ''),
      })
    }
  }
  
  // 按名称排序（数字开头的按数字排序）
  items.sort((a, b) => {
    const aNum = parseInt(a.slug.match(/^(\d+)/)?.[1] || '999')
    const bNum = parseInt(b.slug.match(/^(\d+)/)?.[1] || '999')
    if (aNum !== bNum) return aNum - bNum
    return a.slug.localeCompare(b.slug)
  })
  
  return items
}

// 获取文档目录结构
export function getDocsStructure(): DocItem[] {
  return getMarkdownFiles(DOCS_ROOT)
}

// 获取所有文档路径（用于静态生成）
export function getAllDocSlugs(): string[][] {
  const slugs: string[][] = []
  
  function collectSlugs(items: DocItem[], parentPath: string[] = []) {
    for (const item of items) {
      if (item.children) {
        collectSlugs(item.children, [...parentPath, item.slug])
      } else {
        slugs.push([...parentPath, item.slug])
      }
    }
  }
  
  collectSlugs(getDocsStructure())
  
  // 同时返回原始路径和 URL 编码版本
  const allSlugs: string[][] = []
  for (const slug of slugs) {
    allSlugs.push(slug)
    // 检查是否包含需要编码的字符
    const encodedSlug = slug.map(s => encodeURIComponent(s))
    const hasEncodedPart = encodedSlug.some((s, i) => s !== slug[i])
    if (hasEncodedPart) {
      allSlugs.push(encodedSlug)
    }
  }
  
  return allSlugs
}

// 根据 slug 获取文档内容
export function getDocBySlug(slugPath: string[]): { content: string; title: string } | null {
  // 解码 URL 编码的路径
  const decodedSlugPath = slugPath.map(s => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })
  
  // 构建文件路径
  const filePath = path.join(DOCS_ROOT, ...decodedSlugPath) + '.md'
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { content, data } = matter(fileContent)
  const title = data.title || extractTitle(content, decodedSlugPath[decodedSlugPath.length - 1])
  
  return {
    content,
    title,
  }
}

// 获取 README 内容
export function getReadme(): { content: string; title: string } | null {
  const filePath = path.join(DOCS_ROOT, 'README.md')
  
  if (!fs.existsSync(filePath)) {
    return null
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { content, data } = matter(fileContent)
  const title = data.title || extractTitle(content, 'README.md')
  
  return {
    content,
    title,
  }
}
