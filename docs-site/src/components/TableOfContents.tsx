'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Anchor, Typography } from 'antd'
import { useTheme } from '@/lib/ThemeContext'

const { Title } = Typography

interface TocItem {
  key: string
  href: string
  title: string
  level: number
  children?: TocItem[]
}

interface TableOfContentsProps {
  readonly className?: string
}

// 从页面中提取标题
function extractHeadings(): TocItem[] {
  const headings: TocItem[] = []
  const article = document.querySelector('article')
  if (!article) return headings

  const headingElements = article.querySelectorAll('h1, h2, h3, h4')
  
  headingElements.forEach((heading, index) => {
    const text = heading.textContent || ''
    const level = Number.parseInt(heading.tagName[1])
    
    // 生成 ID（如果没有的话）
    let id = heading.id
    if (!id) {
      id = `heading-${index}-${text.replaceAll(/\s+/g, '-').toLowerCase()}`
      heading.id = id
    }
    
    headings.push({
      key: id,
      href: `#${id}`,
      title: text,
      level,
    })
  })

  return headings
}

// 将扁平的标题列表转换为树形结构
function buildTocTree(headings: TocItem[]): TocItem[] {
  if (headings.length === 0) return []

  const result: TocItem[] = []
  const stack: { item: TocItem; level: number }[] = []

  headings.forEach((heading) => {
    const newItem: TocItem = { ...heading, children: [] }

    while (stack.length > 0 && stack.at(-1)!.level >= heading.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      result.push(newItem)
    } else {
      const parent = stack.at(-1)!.item
      parent.children ??= []
      parent.children.push(newItem)
    }

    stack.push({ item: newItem, level: heading.level })
  })

  return result
}

// 转换为 Anchor 组件需要的格式
function toAnchorItems(items: TocItem[]): any[] {
  return items.map((item) => ({
    key: item.key,
    href: item.href,
    title: item.title,
    children: item.children && item.children.length > 0 
      ? toAnchorItems(item.children) 
      : undefined,
  }))
}

export function TableOfContents({ className }: Readonly<TableOfContentsProps>) {
  const { theme } = useTheme()
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [visible, setVisible] = useState(false)
  const [container, setContainer] = useState<HTMLElement | Window | null>(null)

  const updateToc = useCallback(() => {
    // 延迟执行以确保 DOM 已经渲染完成
    setTimeout(() => {
      const headings = extractHeadings()
      const tree = buildTocTree(headings)
      setTocItems(tree)
      setVisible(headings.length > 0)
    }, 500)
  }, [])

  useEffect(() => {
    // 获取滚动容器
    const contentContainer = document.querySelector('.app-content') as HTMLElement
    if (contentContainer) {
      setContainer(contentContainer)
    }
  }, [])

  useEffect(() => {
    updateToc()

    // 监听 DOM 变化，当内容更新时重新提取标题
    const observer = new MutationObserver(() => {
      updateToc()
    })

    const article = document.querySelector('article')
    if (article) {
      observer.observe(article, {
        childList: true,
        subtree: true,
      })
    }

    return () => {
      observer.disconnect()
    }
  }, [updateToc])

  if (!visible || tocItems.length === 0) {
    return null
  }

  const anchorItems = toAnchorItems(tocItems)

  // 获取内容滚动容器
  const getContainer = () => {
    return container || document.querySelector('.app-content') as HTMLElement || globalThis
  }

  return (
    <div 
      className={`toc-container ${className || ''}`}
      style={{
        padding: '16px',
        background: theme === 'light' 
          ? 'rgba(255, 255, 255, 0.6)' 
          : 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderRadius: 'var(--radius-lg, 8px)',
        border: theme === 'light'
          ? '1px solid rgba(255, 255, 255, 0.8)'
          : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: theme === 'light'
          ? '0 4px 20px rgba(0, 0, 0, 0.05)'
          : '0 4px 20px rgba(0, 0, 0, 0.2)',
      }}
    >
      <Title 
        level={5} 
        style={{ 
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 600,
          color: theme === 'light' ? '#64748b' : '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        目录
      </Title>
      <Anchor
        affix={false}
        getContainer={getContainer}
        targetOffset={100}
        items={anchorItems}
        style={{
          background: 'transparent',
        }}
      />
    </div>
  )
}
