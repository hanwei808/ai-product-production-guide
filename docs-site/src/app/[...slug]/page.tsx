import { getAllDocSlugs, getDocBySlug } from '@/lib/docs'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { notFound } from 'next/navigation'
import { Breadcrumb } from 'antd'
import Link from 'next/link'
import { HomeOutlined } from '@ant-design/icons'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

// 禁止动态参数，只允许 generateStaticParams 中定义的路径
export const dynamicParams = false

// 静态生成所有文档页面
export async function generateStaticParams() {
  const slugs = getAllDocSlugs()
  return slugs.map((slug) => ({
    slug,
  }))
}

// 生成页面元数据
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  
  if (!doc) {
    return {
      title: '页面未找到',
    }
  }
  
  return {
    title: `${doc.title} | AI 产品生产指南`,
  }
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  
  if (!doc) {
    notFound()
  }
  
  // 构建面包屑
  const breadcrumbItems = [
    {
      title: (
        <Link href="/">
          <HomeOutlined /> 首页
        </Link>
      ),
    },
    ...slug.map((s, index) => {
      const path = '/' + slug.slice(0, index + 1).join('/')
      const isLast = index === slug.length - 1
      const title = s.replace(/-/g, ' ').replace(/^\d+-/, '')
      
      return {
        title: isLast ? (
          <span>{doc.title}</span>
        ) : (
          <Link href={path}>{title}</Link>
        ),
      }
    }),
  ]
  
  return (
    <article>
      <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 24 }} />
      <MarkdownRenderer content={doc.content} streaming={true} streamingSpeed={50} />
    </article>
  )
}
