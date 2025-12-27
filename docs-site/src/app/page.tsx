import { getReadme } from '@/lib/docs'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

export default function HomePage() {
  const readme = getReadme()
  
  if (!readme) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>欢迎使用 AI 产品生产指南</h1>
        <p>请从左侧菜单选择一个文档开始阅读。</p>
      </div>
    )
  }
  
  return (
    <article>
      <MarkdownRenderer content={readme.content} streaming={true} streamingSpeed={80} />
    </article>
  )
}
